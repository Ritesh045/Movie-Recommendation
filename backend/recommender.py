"""
backend/recommender.py
Hybrid Recommendation Engine Module.

Combines Content-Based Filtering (TF-IDF Vectorization + Cosine Similarity)
and User-Based Collaborative Filtering (User-Item Rating Matrix Pivoting & User Cosine Similarity)
plus Item-Based SVD Latent Matrix Factorization into a unified hybrid recommender.
Includes dynamic score weighting, cold-start fallback handling, and recommendation explainability.
"""

import os
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from backend.utils import load_pickle

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")


class MovieRecommender:
    """
    Hybrid Recommendation Engine encapsulation class.
    Handles model loading, content-based ranking, user-based collaborative filtering,
    SVD item-item scoring, hybrid ensemble blending, and cold-start fallback management.
    """

    def __init__(self):
        self.movies_df = None
        self.movies_records = []
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        self.svd_item_features = None
        self.user_item_matrix = None
        self.user_sim_df = None
        self._filled_user_item_matrix = None
        self._user_ratings_dict = {}
        self._content_scores_cache = {}
        self._collab_scores_cache = {}
        self._recommend_cache = {}
        self._personalized_cache = {}
        self.title_to_idx = {}
        self.movie_id_to_idx = {}
        self.is_loaded = False
        self.load_models()

    def load_models(self):
        """Loads processed data and precomputed ML models from models/ directory."""
        movies_path = os.path.join(PROCESSED_DIR, "movies_processed.csv")
        tfidf_path = os.path.join(MODELS_DIR, "tfidf_model.pkl")
        svd_path = os.path.join(MODELS_DIR, "svd_model.pkl")
        collab_path = os.path.join(MODELS_DIR, "user_collaborative.pkl")

        if not os.path.exists(tfidf_path) or not os.path.exists(movies_path):
            print("[INFO] Model artifacts or processed dataset not found. Triggering auto-training pipeline...")
            try:
                from train import train_pipeline
                train_pipeline()
            except Exception as err:
                print(f"[WARN] Unable to auto-train models automatically: {err}")

        if not os.path.exists(movies_path):
            print("[WARN] Processed dataset not found after training attempt.")
            return False

        self.movies_df = pd.read_csv(movies_path)
        self.movies_df['genres_list'] = self.movies_df['genres'].apply(
            lambda g: [] if pd.isna(g) or g == '(no genres listed)' else g.split('|')
        )
        self.movies_records = self.movies_df.to_dict('records')

        self.title_to_idx = {}
        for idx, (clean_t, orig_t) in enumerate(zip(self.movies_df['clean_title'], self.movies_df['title'])):
            c_key = str(clean_t).lower().strip()
            o_key = str(orig_t).lower().strip()
            if c_key not in self.title_to_idx:
                self.title_to_idx[c_key] = idx
            if o_key not in self.title_to_idx:
                self.title_to_idx[o_key] = idx

        self.movie_id_to_idx = {int(mid): idx for idx, mid in enumerate(self.movies_df['movieId'])}

        if os.path.exists(tfidf_path):
            tfidf_data = load_pickle(tfidf_path)
            if isinstance(tfidf_data, dict):
                self.tfidf_vectorizer = tfidf_data.get('vectorizer')
                self.tfidf_matrix = tfidf_data.get('tfidf_matrix')
            else:
                self.tfidf_vectorizer = tfidf_data

        if os.path.exists(svd_path):
            svd_data = load_pickle(svd_path)
            self.svd_item_features = svd_data.get('item_features')

        if os.path.exists(collab_path):
            collab_data = load_pickle(collab_path)
            self.user_item_matrix = collab_data.get('user_item_matrix')
            self.user_sim_df = collab_data.get('user_sim_df')
            if self.user_item_matrix is not None:
                self._filled_user_item_matrix = self.user_item_matrix.fillna(0).astype(np.float32)
                self._user_ratings_dict = {
                    int(uid): {int(mid): float(r) for mid, r in series.dropna().items()}
                    for uid, series in self.user_item_matrix.iterrows()
                }

        self.is_loaded = True
        print("[SUCCESS] MovieRecommender loaded models successfully.")
        return True

    def find_movie_index(self, query_title: str) -> int:
        """Finds DataFrame index for a movie title query using exact or fuzzy match."""
        if not query_title:
            return -1
        
        q = str(query_title).lower().strip()
        
        if q in self.title_to_idx:
            return self.title_to_idx[q]
        
        for title_key, idx in self.title_to_idx.items():
            if q in title_key or title_key in q:
                return idx
                
        return -1

    def get_content_scores(self, movie_idx: int) -> np.ndarray:
        """Retrieves Content-Based similarity scores (TF-IDF Cosine Similarity) for a target movie dynamically with in-memory caching."""
        if movie_idx in self._content_scores_cache:
            return self._content_scores_cache[movie_idx]

        if self.tfidf_matrix is not None and movie_idx < self.tfidf_matrix.shape[0]:
            target_vec = self.tfidf_matrix[movie_idx]
            sim_scores = cosine_similarity(target_vec, self.tfidf_matrix)[0]
            self._content_scores_cache[movie_idx] = sim_scores
            return sim_scores
        return np.zeros(len(self.movies_df))

    def get_collaborative_scores(self, movie_idx: int) -> np.ndarray:
        """Computes Item-Based Collaborative similarity scores using SVD Item Latent Embeddings with in-memory caching."""
        if movie_idx in self._collab_scores_cache:
            return self._collab_scores_cache[movie_idx]

        if self.svd_item_features is not None and movie_idx < len(self.svd_item_features):
            target_vec = self.svd_item_features[movie_idx].reshape(1, -1)
            sim_vector = cosine_similarity(target_vec, self.svd_item_features)[0]
            sim_vector = (sim_vector + 1.0) / 2.0
            self._collab_scores_cache[movie_idx] = sim_vector
            return sim_vector
        return np.zeros(len(self.movies_df))

    def get_user_collaborative_recommendations(
        self,
        user_id: int,
        top_n: int = 10,
        top_k_users: int = 30,
        min_rating_threshold: float = 3.5
    ) -> Dict[str, Any]:
        """
        User-Based Collaborative Filtering:
        1. Finds top K most similar users to user_id (excluding self).
        2. Filters candidate movies rated >= min_rating_threshold by similar users that user_id has NOT rated.
        3. Computes similarity-weighted predicted ratings.
        4. Handles cold-start users (0 ratings history) with graceful fallback flag.
        """
        if self.user_sim_df is None or self.user_item_matrix is None:
            return {"recommendations": self.get_top_rated_movies(top_n=top_n), "is_cold_start": True, "reason": "Collaborative matrix not loaded."}

        if user_id not in self.user_sim_df.index:
            return {
                "recommendations": self.get_top_rated_movies(top_n=top_n),
                "is_cold_start": True,
                "reason": "New user with no rating history yet. Rate a few movies to unlock personalized user-based picks!"
            }

        similar_users = self.user_sim_df[user_id].drop(user_id).sort_values(ascending=False).head(top_k_users)

        user_rated_series = self.user_item_matrix.loc[user_id].dropna()
        if user_rated_series.empty:
            return {
                "recommendations": self.get_top_rated_movies(top_n=top_n),
                "is_cold_start": True,
                "reason": "New user with no rating history yet. Rate a few movies to unlock personalized user-based picks!"
            }
        
        user_rated_movies = set(user_rated_series.index)

        scores = {}
        sim_sums = {}

        for other_user, sim_score in similar_users.items():
            if sim_score <= 0.05:
                continue
            other_ratings = self.user_item_matrix.loc[other_user].dropna()
            for movie_id, rating in other_ratings.items():
                if movie_id in user_rated_movies:
                    continue
                if rating >= min_rating_threshold:
                    scores.setdefault(movie_id, 0.0)
                    sim_sums.setdefault(movie_id, 0.0)
                    scores[movie_id] += sim_score * rating
                    sim_sums[movie_id] += sim_score

        if not scores:
            return {
                "recommendations": self.get_top_rated_movies(top_n=top_n),
                "is_cold_start": False,
                "reason": "No candidate movies met threshold."
            }

        final_scores = {m_id: scores[m_id] / sim_sums[m_id] for m_id in scores if sim_sums[m_id] > 0}
        ranked = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]

        results = []
        movie_id_map = {int(row['movieId']): row for row in self.movies_df.to_dict('records')}

        for m_id, predicted_score in ranked:
            if m_id in movie_id_map:
                row = movie_id_map[m_id]
                results.append({
                    "movieId": int(row['movieId']),
                    "tmdbId": int(row.get('tmdbId', 0)),
                    "clean_title": row['clean_title'],
                    "title": row['title'],
                    "year_display": row.get('year_display', ''),
                    "genres": row['genres_list'],
                    "avg_rating": float(row['avg_rating']),
                    "vote_count": int(row['vote_count']),
                    "predicted_rating": round(float(predicted_score), 2),
                    "collab_score": round(float(predicted_score / 5.0), 4),
                    "explanation": {
                        "shared_genres": row['genres_list'][:2],
                        "shared_keywords": ["User Preference Match"],
                        "reason": f"Highly rated ({predicted_score:.1f}★) by users with similar rating profiles"
                    }
                })

        return {
            "recommendations": results,
            "is_cold_start": False,
            "reason": f"Calculated from top {len(similar_users)} similar user rating profiles"
        }

    def explain_recommendation(self, target_idx: int, rec_idx: int) -> Dict[str, Any]:
        """Generates an explicit explanation breakdown of why rec_idx was recommended for target_idx using fast record dictionary lookups."""
        target_row = self.movies_records[target_idx] if self.movies_records else self.movies_df.iloc[target_idx]
        rec_row = self.movies_records[rec_idx] if self.movies_records else self.movies_df.iloc[rec_idx]

        target_genres = set(target_row['genres_list'])
        rec_genres = set(rec_row['genres_list'])
        shared_genres = list(target_genres.intersection(rec_genres))

        t_tokens = set(str(target_row.get('corpus', '')).lower().split())
        r_tokens = set(str(rec_row.get('corpus', '')).lower().split())
        
        stop_words = {'the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'on', 'at', 'by', 'from'}
        ignore_tokens = stop_words.union({g.lower() for g in target_genres})
        shared_keywords = list(t_tokens.intersection(r_tokens) - ignore_tokens)[:5]

        return {
            "shared_genres": shared_genres if shared_genres else ["General Cinema"],
            "shared_keywords": [k.capitalize() for k in shared_keywords if len(k) > 2],
            "reason": f"Matches {len(shared_genres)} genre(s) and key plot themes from '{target_row['clean_title']}'"
        }

    def recommend(
        self,
        query_title: str,
        mode: str = "hybrid",
        content_weight: float = 0.6,
        genre_filter: str = "All",
        min_rating: float = 0.0,
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """Main recommendation method by movie title with ultra-fast caching and vector lookup."""
        if not self.is_loaded:
            self.load_models()

        movie_idx = self.find_movie_index(query_title)
        if movie_idx == -1:
            print(f"[WARN] Movie '{query_title}' not found in database.")
            return []

        # Check in-memory recommendation cache for instant sub-millisecond response
        cache_key = (movie_idx, mode.lower(), round(float(content_weight), 2), genre_filter, float(min_rating), int(top_n))
        if cache_key in self._recommend_cache:
            return self._recommend_cache[cache_key]

        content_scores = self.get_content_scores(movie_idx)
        collab_scores = self.get_collaborative_scores(movie_idx)

        if mode.lower() == "content":
            final_scores = content_scores
        elif mode.lower() == "collaborative":
            final_scores = collab_scores
        else:  # hybrid
            c_w = float(content_weight)
            cb_w = 1.0 - c_w
            final_scores = (c_w * content_scores) + (cb_w * collab_scores)

        ranked_indices = np.argsort(final_scores)[::-1]
        recommendations = []

        records = self.movies_records if self.movies_records else self.movies_df.to_dict('records')

        for idx in ranked_indices:
            if idx == movie_idx:
                continue

            row = records[idx]
            
            if genre_filter and genre_filter != "All":
                if genre_filter not in row['genres_list']:
                    continue

            if row['avg_rating'] < min_rating:
                continue

            score = float(final_scores[idx])
            explanation = self.explain_recommendation(movie_idx, idx)

            rec_item = {
                "movieId": int(row['movieId']),
                "tmdbId": int(row.get('tmdbId', 0)),
                "clean_title": row['clean_title'],
                "title": row['title'],
                "year_display": row.get('year_display', ''),
                "genres": row['genres_list'],
                "avg_rating": float(row['avg_rating']),
                "vote_count": int(row['vote_count']),
                "similarity_score": score,
                "content_score": float(content_scores[idx]),
                "collab_score": float(collab_scores[idx]),
                "explanation": explanation
            }
            
            recommendations.append(rec_item)
            if len(recommendations) >= top_n:
                break

        self._recommend_cache[cache_key] = recommendations
        return recommendations

    def get_top_rated_movies(self, top_n: int = 8, min_votes: int = 50) -> List[Dict[str, Any]]:
        """Returns top rated movies with at least min_votes for home view trending section."""
        if not self.is_loaded:
            self.load_models()

        filtered = self.movies_df[self.movies_df['vote_count'] >= min_votes]
        top_df = filtered.sort_values(by=['avg_rating', 'vote_count'], ascending=[False, False]).head(top_n)

        results = []
        for row in top_df.to_dict('records'):
            results.append({
                "movieId": int(row['movieId']),
                "tmdbId": int(row.get('tmdbId', 0)),
                "clean_title": row['clean_title'],
                "title": row['title'],
                "year_display": row.get('year_display', ''),
                "genres": row['genres_list'],
                "avg_rating": float(row['avg_rating']),
                "vote_count": int(row['vote_count']),
                "similarity_score": 1.0
            })
        return results

    def get_user_personalized_hybrid_recommendations(
        self,
        user_id: int,
        liked_ids: List[int] = None,
        saved_ids: List[int] = None,
        disliked_ids: List[int] = None,
        rated_dict: Dict[int, float] = None,
        mode: str = "hybrid",
        content_weight: float = 0.6,
        top_n: int = 12
    ) -> Dict[str, Any]:
        """
        Dynamically computes personalized Hybrid recommendations driven by user's
        Like, Dislike, Save/Wishlist, and Rating interactions with high-performance caching.
        """
        if not self.is_loaded:
            self.load_models()

        liked_ids = [int(x) for x in (liked_ids or [])]
        saved_ids = [int(x) for x in (saved_ids or [])]
        disliked_ids = [int(x) for x in (disliked_ids or [])]
        rated_dict = {int(k): float(v) for k, v in (rated_dict or {}).items()}

        all_interacted = set(liked_ids) | set(saved_ids) | set(rated_dict.keys()) | set(disliked_ids)

        if not all_interacted:
            return {
                "recommendations": self.get_top_rated_movies(top_n=top_n),
                "is_cold_start": True,
                "reason": "Cold start: No interactions yet. Like, Dislike, Save to Wishlist, or Rate movies to unlock your personalized AI recommendations!"
            }

        p_cache_key = (
            int(user_id),
            tuple(sorted(liked_ids)),
            tuple(sorted(saved_ids)),
            tuple(sorted(disliked_ids)),
            tuple(sorted(rated_dict.items())),
            mode.lower(),
            round(float(content_weight), 2),
            int(top_n)
        )
        if p_cache_key in self._personalized_cache:
            return self._personalized_cache[p_cache_key]

        n_movies = len(self.movies_df)
        content_scores = np.zeros(n_movies, dtype=np.float32)
        collab_scores = np.zeros(n_movies, dtype=np.float32)

        # 1. Content-Based User Taste Profiling with Rocchio Relevance Feedback
        if self.tfidf_matrix is not None:
            profile_indices = []
            profile_weights = []

            for mid in all_interacted:
                idx = self.movie_id_to_idx.get(mid)
                if idx is None or idx >= self.tfidf_matrix.shape[0]:
                    continue

                if mid in disliked_ids:
                    profile_indices.append(idx)
                    profile_weights.append(-0.75)
                    continue

                w = 0.0
                if mid in rated_dict:
                    w = max(w, rated_dict[mid] / 5.0)
                if mid in liked_ids:
                    w = max(w, 1.0)
                if mid in saved_ids:
                    w = max(w, 0.85)

                if w > 0:
                    profile_indices.append(idx)
                    profile_weights.append(w)

            if profile_indices:
                sub_matrix = self.tfidf_matrix[profile_indices]
                w_arr = np.array(profile_weights, dtype=np.float32).reshape(1, -1)
                user_profile_vec = w_arr @ sub_matrix
                raw_sim = cosine_similarity(user_profile_vec, self.tfidf_matrix)[0]
                content_scores = np.clip(raw_sim, 0.0, 1.0).astype(np.float32)

        # 2. Collaborative Filtering: Fast Vector-Based User Cosine Similarity
        if self._filled_user_item_matrix is not None and self.user_item_matrix is not None:
            cols = list(self.user_item_matrix.columns)
            col_idx_map = {col: i for i, col in enumerate(cols)}
            u_vec = np.zeros((1, len(cols)), dtype=np.float32)

            for mid, r in rated_dict.items():
                if mid in col_idx_map:
                    u_vec[0, col_idx_map[mid]] = float(r)
            for mid in liked_ids:
                if mid in col_idx_map and u_vec[0, col_idx_map[mid]] == 0:
                    u_vec[0, col_idx_map[mid]] = 5.0
            for mid in saved_ids:
                if mid in col_idx_map and u_vec[0, col_idx_map[mid]] == 0:
                    u_vec[0, col_idx_map[mid]] = 4.5
            for mid in disliked_ids:
                if mid in col_idx_map:
                    u_vec[0, col_idx_map[mid]] = 1.0

            if np.any(u_vec > 0):
                sim_row = cosine_similarity(u_vec, self._filled_user_item_matrix)[0]
                sim_indices = np.argsort(sim_row)[::-1][:40]

                scores = {}
                sim_sums = {}

                for s_idx in sim_indices:
                    sim_score = float(sim_row[s_idx])
                    if sim_score <= 0.05:
                        continue
                    other_uid = self.user_item_matrix.index[s_idx]
                    if other_uid == user_id:
                        continue

                    other_ratings = self._user_ratings_dict.get(int(other_uid), {})
                    for m_id, rating in other_ratings.items():
                        if m_id in all_interacted:
                            continue
                        if rating >= 3.5:
                            scores[m_id] = scores.get(m_id, 0.0) + (sim_score * rating)
                            sim_sums[m_id] = sim_sums.get(m_id, 0.0) + sim_score

                for mid in scores:
                    if sim_sums[mid] > 0:
                        pred_r = scores[mid] / sim_sums[mid]
                        idx = self.movie_id_to_idx.get(mid)
                        if idx is not None:
                            collab_scores[idx] = min(1.0, max(0.0, pred_r / 5.0))

        # 3. Hybrid Ensemble Score Blending
        if mode.lower() == "content":
            final_scores = content_scores
        elif mode.lower() == "collaborative":
            final_scores = collab_scores
        else:  # hybrid
            c_w = float(content_weight)
            cb_w = 1.0 - c_w
            final_scores = (c_w * content_scores) + (cb_w * collab_scores)

        # 4. Rank, Filter & Generate Human-Readable Explanations
        ranked_indices = np.argsort(final_scores)[::-1]
        results = []
        records = self.movies_records if self.movies_records else self.movies_df.to_dict('records')

        anchor_titles = []
        for mid in list(liked_ids) + list(saved_ids) + [m for m, r in rated_dict.items() if r >= 4.0]:
            idx = self.movie_id_to_idx.get(mid)
            if idx is not None:
                anchor_titles.append(records[idx]['clean_title'])
            if len(anchor_titles) >= 2:
                break
        anchor_str = f"'{anchor_titles[0]}'" if len(anchor_titles) == 1 else (f"'{anchor_titles[0]}' & '{anchor_titles[1]}'" if len(anchor_titles) >= 2 else "your saved titles")

        for idx in ranked_indices:
            row = records[idx]
            mid = int(row['movieId'])
            if mid in all_interacted:
                continue

            score = float(final_scores[idx])
            c_score = float(content_scores[idx])
            cb_score = float(collab_scores[idx])

            if c_score >= cb_score:
                reason = f"Matches themes, genres & style of movies you liked ({anchor_str})"
            else:
                reason = f"Highly praised by viewers who share your movie taste"

            results.append({
                "movieId": mid,
                "tmdbId": int(row.get('tmdbId', 0)),
                "clean_title": row['clean_title'],
                "title": row['title'],
                "year_display": row.get('year_display', ''),
                "genres": row['genres_list'],
                "avg_rating": float(row['avg_rating']),
                "vote_count": int(row['vote_count']),
                "similarity_score": round(score, 4),
                "content_score": round(c_score, 4),
                "collab_score": round(cb_score, 4),
                "explanation": {
                    "shared_genres": row['genres_list'][:2],
                    "shared_keywords": ["Personal Taste Match", "Liked Genres"],
                    "reason": reason
                }
            })

            if len(results) >= top_n:
                break

        res_payload = {
            "recommendations": results,
            "is_cold_start": False,
            "reason": f"Tuned from {len(liked_ids)} liked, {len(disliked_ids)} disliked, {len(saved_ids)} in Wishlist, and {len(rated_dict)} rated titles"
        }
        self._personalized_cache[p_cache_key] = res_payload
        return res_payload

