"""
train.py
End-to-End ML Pipeline Execution Script.

Runs dataset downloading, feature extraction, TF-IDF vectorization,
Cosine Similarity precomputation, User-Based Collaborative Matrix Pivoting,
and SVD Latent Matrix Factorization.
Serializes trained artifacts into models/*.pkl for zero-latency runtime inference.
"""

import os
import time
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from scipy.sparse import csr_matrix

from backend.preprocessing import preprocess_data
from backend.utils import save_pickle

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")


def train_pipeline():
    """Executes full preprocessing + model training pipeline."""
    start_time = time.time()
    print("=" * 60)
    print("      MOVIE RECOMMENDATION SYSTEM - ML PIPELINE TRAINER     ")
    print("=" * 60)

    # 1. Run Preprocessing Pipeline
    print("\n[STEP 1/4] Running Data Preprocessing & Feature Engineering...")
    movies_df, ratings_df = preprocess_data()

    os.makedirs(MODELS_DIR, exist_ok=True)

    # 2. Content-Based Filtering: TF-IDF Sparse Matrix (Ultra-Low Memory)
    print("\n[STEP 2/4] Building Content-Based Model (TF-IDF Sparse Matrix)...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        stop_words='english',
        ngram_range=(1, 2)
    )
    
    corpus = movies_df['corpus'].fillna('').values
    tfidf_matrix = vectorizer.fit_transform(corpus)
    print(f" -> TF-IDF Matrix shape: {tfidf_matrix.shape}")

    tfidf_artifact = {
        'vectorizer': vectorizer,
        'tfidf_matrix': tfidf_matrix
    }
    save_pickle(tfidf_artifact, os.path.join(MODELS_DIR, "tfidf_model.pkl"))

    # 3. User-Based Collaborative Filtering Matrix
    print("\n[STEP 3/4] Building User-Based Collaborative Matrix & Cosine Similarity...")
    user_item_matrix = ratings_df.pivot(index="userId", columns="movieId", values="rating")
    print(f" -> User-Item Pivot Matrix Shape: {user_item_matrix.shape}")

    user_item_filled = user_item_matrix.fillna(0)
    user_sim = cosine_similarity(user_item_filled).astype(np.float32)
    user_sim_df = pd.DataFrame(user_sim, index=user_item_matrix.index, columns=user_item_matrix.index)
    print(f" -> User Similarity Matrix Shape: {user_sim_df.shape}")

    user_collab_artifact = {
        'user_item_matrix': user_item_matrix,
        'user_sim_df': user_sim_df
    }
    save_pickle(user_collab_artifact, os.path.join(MODELS_DIR, "user_collaborative.pkl"))

    # 4. Item-Based SVD Latent Factor Matrix Factorization
    print("\n[STEP 4/4] Building SVD Latent Factor Model...")
    movie_id_to_idx = {row['movieId']: idx for idx, row in movies_df.iterrows()}
    
    valid_ratings = ratings_df[ratings_df['movieId'].isin(movie_id_to_idx.keys())].copy()
    valid_ratings['movie_idx'] = valid_ratings['movieId'].map(movie_id_to_idx)
    
    unique_users = valid_ratings['userId'].unique()
    user_id_to_idx = {uid: idx for idx, uid in enumerate(unique_users)}
    valid_ratings['user_idx'] = valid_ratings['userId'].map(user_id_to_idx)

    num_movies = len(movies_df)
    num_users = len(unique_users)

    row_ind = valid_ratings['movie_idx'].values
    col_ind = valid_ratings['user_idx'].values
    rating_vals = valid_ratings['rating'].values

    item_user_sparse = csr_matrix((rating_vals, (row_ind, col_ind)), shape=(num_movies, num_users))

    n_components = min(50, num_users - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    item_latent_features = svd.fit_transform(item_user_sparse).astype(np.float32)
    
    var_explained = svd.explained_variance_ratio_.sum() * 100
    print(f" -> SVD Completed. Total Explained Variance Ratio: {var_explained:.2f}%")

    svd_artifact = {
        'svd': svd,
        'item_features': item_latent_features,
        'explained_variance': var_explained,
        'movie_id_to_idx': movie_id_to_idx,
        'user_id_to_idx': user_id_to_idx
    }
    save_pickle(svd_artifact, os.path.join(MODELS_DIR, "svd_model.pkl"))

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"[SUCCESS] ML Pipeline Execution Complete in {elapsed:.2f} seconds!")
    print("=" * 60)


if __name__ == "__main__":
    train_pipeline()
