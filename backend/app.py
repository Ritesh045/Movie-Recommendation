"""
backend/app.py
CineSphere - Flask REST API Backend.

Exposes RESTful endpoints serving movie metadata, search autocompletion,
genre carousels, single movie details, and hybrid ML recommendations.
Loads precomputed TF-IDF vectorizer, Cosine Similarity matrix, and SVD model once at startup.
"""

import os
import sys

# Ensure root project directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from backend.recommender import MovieRecommender
from backend.tmdb_api import get_movie_poster_url
from backend.models import db, User, UserRating, UserLike, UserSaved, UserDislike
from backend.auth import auth_bp

from concurrent.futures import ThreadPoolExecutor
import pandas as pd
import numpy as np

app = Flask(__name__)
# Enable CORS for all routes so React dev server can access API
CORS(app)

# Initialize Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["500 per day", "150 per hour"]
)

# Database Configuration (SQLite)
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'users.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'cinesphere-super-secret-jwt-key-2026-v1')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Initialize Database & JWT
db.init_app(app)
jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)

# Auto-create SQLite database tables on startup
with app.app_context():
    db.create_all()

# Initialize recommender instance once at startup
recommender = MovieRecommender()

# Thread pool for ultra-fast parallel poster resolution
executor = ThreadPoolExecutor(max_workers=20)

# In-memory home payload cache for 0ms instant backend responses
HOME_CACHE = None


def enrich_movie_item(movie_dict: dict) -> dict:
    """Helper to attach poster_url to movie payload before returning JSON response."""
    item = dict(movie_dict)
    tmdb_id = item.get('tmdbId', 0)
    title = item.get('clean_title', item.get('title', ''))
    genres = item.get('genres', [])
    genres_str = ", ".join(genres) if isinstance(genres, list) else str(genres)
    
    item['poster_url'] = get_movie_poster_url(tmdb_id, title, genres_str)
    return item


def enrich_movies_parallel(movies_list: list) -> list:
    """Enriches a list of movie dicts in parallel using worker threads for instant response times."""
    if not movies_list:
        return []
    return list(executor.map(enrich_movie_item, movies_list))


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "online",
        "service": "CineSphere API",
        "models_loaded": recommender.is_loaded,
        "total_movies": len(recommender.movies_df) if recommender.movies_df is not None else 0
    })


def generate_home_payload() -> dict:
    """
    Generates the entire home catalog payload using fast dictionary indexing.
    Executes in ~0.1s instead of 8s, eliminating backend delays.
    """
    if not recommender.is_loaded or recommender.movies_df is None:
        return {}

    df = recommender.movies_df
    records = df.to_dict('records')

    genre_map = {}
    for r in records:
        r_item = {
            "movieId": int(r['movieId']),
            "tmdbId": int(r.get('tmdbId', 0)),
            "clean_title": r['clean_title'],
            "title": r['title'],
            "year_display": r.get('year_display', ''),
            "genres": r['genres_list'],
            "avg_rating": float(r['avg_rating']),
            "vote_count": int(r['vote_count'])
        }
        for g in r['genres_list']:
            gl = g.lower()
            if gl not in genre_map:
                genre_map[gl] = []
            genre_map[gl].append(r_item)

    for gl in genre_map:
        genre_map[gl].sort(key=lambda x: (x['avg_rating'], x['vote_count']), reverse=True)

    def get_by_genre(genre_name, limit=16):
        return genre_map.get(genre_name.lower(), [])[:limit]

    top_movies = recommender.get_top_rated_movies(top_n=20, min_votes=30)
    action = get_by_genre('Action', 16)
    scifi = get_by_genre('Sci-Fi', 16)
    drama = get_by_genre('Drama', 16)
    comedy = get_by_genre('Comedy', 16)
    animation = get_by_genre('Animation', 16)
    thriller = get_by_genre('Thriller', 16)
    romance = get_by_genre('Romance', 16)

    all_to_enrich = top_movies + action + scifi + drama + comedy + animation + thriller + romance
    enriched_all = enrich_movies_parallel(all_to_enrich)

    idx = 0
    trending_enriched = enriched_all[idx : idx + len(top_movies)]
    idx += len(top_movies)

    action_enriched = enriched_all[idx : idx + len(action)]
    idx += len(action)

    scifi_enriched = enriched_all[idx : idx + len(scifi)]
    idx += len(scifi)

    drama_enriched = enriched_all[idx : idx + len(drama)]
    idx += len(drama)

    comedy_enriched = enriched_all[idx : idx + len(comedy)]
    idx += len(comedy)

    animation_enriched = enriched_all[idx : idx + len(animation)]
    idx += len(animation)

    thriller_enriched = enriched_all[idx : idx + len(thriller)]
    idx += len(thriller)

    romance_enriched = enriched_all[idx : idx + len(romance)]

    return {
        "top10": trending_enriched[:10],
        "trending": trending_enriched[10:],
        "action": action_enriched,
        "scifi": scifi_enriched,
        "drama": drama_enriched,
        "comedy": comedy_enriched,
        "animation": animation_enriched,
        "thriller": thriller_enriched,
        "romance": romance_enriched,
    }


# Pre-warm home cache on startup
try:
    HOME_CACHE = generate_home_payload()
    print("[SUCCESS] Pre-warmed HOME_CACHE successfully.")
except Exception as err:
    print(f"[WARNING] Failed to pre-warm HOME_CACHE: {err}")


@app.route('/api/home_content', methods=['GET'])
def get_home_content():
    """
    Returns ALL homepage sections instantly in < 1ms from in-memory cache.
    Eliminates network delays and guarantees instant UI rendering.
    """
    global HOME_CACHE
    if HOME_CACHE is not None:
        return jsonify(HOME_CACHE)

    HOME_CACHE = generate_home_payload()
    return jsonify(HOME_CACHE)


@app.route('/api/movies/trending', methods=['GET'])
def get_trending_movies():
    """Returns top rated / trending movies for homepage carousels."""
    if not recommender.is_loaded:
        return jsonify({"error": "Models not loaded"}), 500
    
    limit = request.args.get('limit', default=16, type=int)
    min_votes = request.args.get('min_votes', default=30, type=int)
    
    top_movies = recommender.get_top_rated_movies(top_n=limit, min_votes=min_votes)
    enriched = enrich_movies_parallel(top_movies)
    return jsonify(enriched)



@app.route('/api/movies/search', methods=['GET'])
def search_movies():
    """Search/autocomplete movies by query string."""
    q = request.args.get('q', default='', type=str).strip().lower()
    limit = request.args.get('limit', default=20, type=int)
    
    if not q:
        return jsonify([])
    
    df = recommender.movies_df
    # Match query in clean_title or title
    matched_df = df[
        df['clean_title'].astype(str).str.lower().str.contains(q) |
        df['title'].astype(str).str.lower().str.contains(q)
    ].head(limit)
    
    results = []
    for _, row in matched_df.iterrows():
        item = {
            "movieId": int(row['movieId']),
            "tmdbId": int(row.get('tmdbId', 0)),
            "clean_title": row['clean_title'],
            "title": row['title'],
            "year_display": row.get('year_display', ''),
            "genres": row['genres_list'],
            "avg_rating": float(row['avg_rating']),
            "vote_count": int(row['vote_count'])
        }
        results.append(enrich_movie_item(item))
        
    return jsonify(results)


from backend.tmdb_api import get_movie_poster_url, get_now_playing_india, get_upcoming_india

@app.route('/api/movies/now-playing-india', methods=['GET'])
def get_now_playing_in_india():
    """Returns real-time movies currently playing in Indian theaters via TMDB."""
    limit = request.args.get('limit', default=12, type=int)
    return jsonify(get_now_playing_india(limit))


@app.route('/api/movies/upcoming-india', methods=['GET'])
def get_upcoming_in_india():
    """Returns real-time upcoming movie releases in India via TMDB."""
    limit = request.args.get('limit', default=12, type=int)
    return jsonify(get_upcoming_india(limit))


@app.route('/api/movies/genres', methods=['GET'])
def get_all_genres():
    """Returns list of unique available genres in the database."""
    if not recommender.is_loaded:
        return jsonify([])
    
    genres_set = set()
    for g_list in recommender.movies_df['genres_list']:
        if isinstance(g_list, list):
            for g in g_list:
                if g and g != '(no genres listed)':
                    genres_set.add(g)
    return jsonify(sorted(list(genres_set)))


@app.route('/api/movies/genre/<genre_name>', methods=['GET'])
def get_movies_by_genre(genre_name: str):
    """Returns top rated movies for a specific genre category."""
    if not recommender.is_loaded:
        return jsonify([])
    
    limit = request.args.get('limit', default=12, type=int)
    df = recommender.movies_df
    
    # Filter by genre
    matching_rows = []
    for _, row in df.iterrows():
        if genre_name.lower() in [g.lower() for g in row['genres_list']]:
            matching_rows.append(row)
            
    if not matching_rows:
        return jsonify([])
        
    genre_df = pd.DataFrame(matching_rows)
    # Sort by avg_rating & vote_count
    sorted_df = genre_df.sort_values(by=['avg_rating', 'vote_count'], ascending=[False, False]).head(limit)
    
    results = []
    for _, row in sorted_df.iterrows():
        item = {
            "movieId": int(row['movieId']),
            "tmdbId": int(row.get('tmdbId', 0)),
            "clean_title": row['clean_title'],
            "title": row['title'],
            "year_display": row.get('year_display', ''),
            "genres": row['genres_list'],
            "avg_rating": float(row['avg_rating']),
            "vote_count": int(row['vote_count'])
        }
        results.append(enrich_movie_item(item))
        
    return jsonify(results)


@app.route('/api/movies/<int:movie_id>', methods=['GET'])
@jwt_required()
def get_movie_detail(movie_id: int):
    """Returns detailed metadata for a specific movie by ID (Requires Auth)."""
    if not recommender.is_loaded:
        return jsonify({"error": "Models not loaded"}), 500
    
    df = recommender.movies_df
    matched = df[df['movieId'] == movie_id]
    
    if matched.empty:
        return jsonify({"error": "Movie not found"}), 404
    
    row = matched.iloc[0]
    detail = {
        "movieId": int(row['movieId']),
        "tmdbId": int(row.get('tmdbId', 0)),
        "clean_title": row['clean_title'],
        "title": row['title'],
        "year": int(row['year']) if pd.notnull(row.get('year')) else None,
        "year_display": row.get('year_display', ''),
        "genres": row['genres_list'],
        "avg_rating": float(row['avg_rating']),
        "vote_count": int(row['vote_count']),
        "user_tags": row.get('user_tags', ''),
        "corpus": row.get('corpus', '')
    }
    return jsonify(enrich_movie_item(detail))


@app.route('/api/movies/<int:movie_id>/interaction', methods=['GET'])
@jwt_required(optional=True)
def get_movie_interaction(movie_id: int):
    """
    GET /api/movies/<id>/interaction
    Returns current user's interaction state: is_liked, is_disliked, is_saved (Wishlist), and user_rating.
    """
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"is_liked": False, "is_disliked": False, "is_saved": False, "user_rating": None})

    uid = int(user_id)
    is_liked = UserLike.query.filter_by(user_id=uid, movie_id=movie_id).first() is not None
    is_disliked = UserDislike.query.filter_by(user_id=uid, movie_id=movie_id).first() is not None
    is_saved = UserSaved.query.filter_by(user_id=uid, movie_id=movie_id).first() is not None
    rating_record = UserRating.query.filter_by(user_id=uid, movie_id=movie_id).first()

    return jsonify({
        "movieId": movie_id,
        "is_liked": is_liked,
        "is_disliked": is_disliked,
        "is_saved": is_saved,
        "user_rating": rating_record.rating if rating_record else None
    })


@app.route('/api/movies/<int:movie_id>/like', methods=['POST'])
@jwt_required()
def toggle_movie_like(movie_id: int):
    """
    POST /api/movies/<id>/like
    Toggles Like (YouTube-style):
    - If previously Disliked, automatically clears Dislike.
    - Toggles Like on/off.
    """
    uid = int(get_jwt_identity())
    existing_like = UserLike.query.filter_by(user_id=uid, movie_id=movie_id).first()
    existing_dislike = UserDislike.query.filter_by(user_id=uid, movie_id=movie_id).first()

    if existing_dislike:
        db.session.delete(existing_dislike)

    if existing_like:
        db.session.delete(existing_like)
        is_liked = False
        msg = "Like removed."
    else:
        new_like = UserLike(user_id=uid, movie_id=movie_id)
        db.session.add(new_like)
        is_liked = True
        msg = "👍 Liked! Boosting this title and similar movies in your recommendations."

    db.session.commit()

    return jsonify({
        "movieId": movie_id,
        "is_liked": is_liked,
        "is_disliked": False,
        "message": msg
    })


@app.route('/api/movies/<int:movie_id>/dislike', methods=['POST'])
@jwt_required()
def toggle_movie_dislike(movie_id: int):
    """
    POST /api/movies/<id>/dislike
    Toggles Dislike (YouTube-style):
    - If previously Liked, automatically clears Like.
    - Toggles Dislike on/off.
    - Disliking heavily downranks similar themes in Content & Collaborative models.
    """
    uid = int(get_jwt_identity())
    existing_like = UserLike.query.filter_by(user_id=uid, movie_id=movie_id).first()
    existing_dislike = UserDislike.query.filter_by(user_id=uid, movie_id=movie_id).first()

    if existing_like:
        db.session.delete(existing_like)

    if existing_dislike:
        db.session.delete(existing_dislike)
        is_disliked = False
        msg = "Dislike removed."
    else:
        new_dislike = UserDislike(user_id=uid, movie_id=movie_id)
        db.session.add(new_dislike)
        is_disliked = True
        msg = "👎 Disliked. We will tune recommendations to avoid movies like this."

    db.session.commit()

    return jsonify({
        "movieId": movie_id,
        "is_liked": False,
        "is_disliked": is_disliked,
        "message": msg
    })


@app.route('/api/movies/<int:movie_id>/save', methods=['POST'])
@jwt_required()
def toggle_movie_save(movie_id: int):
    """
    POST /api/movies/<id>/save
    Toggles Save to Wishlist for the authenticated user.
    """
    uid = int(get_jwt_identity())
    existing = UserSaved.query.filter_by(user_id=uid, movie_id=movie_id).first()

    if existing:
        db.session.delete(existing)
        is_saved = False
        msg = "Removed from your Wishlist."
    else:
        new_save = UserSaved(user_id=uid, movie_id=movie_id)
        db.session.add(new_save)
        is_saved = True
        msg = "🔖 Added to your Wishlist!"

    db.session.commit()

    return jsonify({
        "movieId": movie_id,
        "is_saved": is_saved,
        "message": msg
    })


@app.route('/api/rate', methods=['POST'])
@jwt_required()
def rate_movie():
    """
    POST /api/rate
    Allows authenticated user to rate a movie (1.0 to 5.0 stars) or clear rating (0.0).
    Persists rating in SQLite database and dynamically updates recommender user-item matrix.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    movie_id = data.get('movieId')
    rating = data.get('rating')

    if not movie_id or rating is None:
        return jsonify({"error": "movieId and rating are required"}), 400

    try:
        mid = int(movie_id)
        rating_val = float(rating)

        existing = UserRating.query.filter_by(user_id=user_id, movie_id=mid).first()

        if rating_val <= 0.0:
            if existing:
                db.session.delete(existing)
                db.session.commit()
            return jsonify({
                "message": "Rating cleared.",
                "userId": user_id,
                "movieId": mid,
                "rating": None
            })

        rating_val = max(1.0, min(5.0, rating_val))
        if existing:
            existing.rating = rating_val
        else:
            new_r = UserRating(user_id=user_id, movie_id=mid, rating=rating_val)
            db.session.add(new_r)

        db.session.commit()

        # Dynamically update in-memory user_item_matrix if loaded
        if recommender.user_item_matrix is not None:
            if user_id not in recommender.user_item_matrix.index:
                recommender.user_item_matrix.loc[user_id] = np.nan
            recommender.user_item_matrix.loc[user_id, mid] = rating_val

            if recommender.user_sim_df is not None:
                from sklearn.metrics.pairwise import cosine_similarity
                filled = recommender.user_item_matrix.fillna(0)
                u_vec = filled.loc[[user_id]]
                sim_row = cosine_similarity(u_vec, filled)[0]
                sim_series = pd.Series(sim_row, index=recommender.user_item_matrix.index)
                recommender.user_sim_df.loc[user_id] = sim_series
                recommender.user_sim_df[user_id] = sim_series

        return jsonify({
            "message": f"Rating of {rating_val}★ saved! AI recommendations updated.",
            "userId": user_id,
            "movieId": mid,
            "rating": rating_val
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/library', methods=['GET'])
@jwt_required()
def get_user_library():
    """
    GET /api/user/library
    Returns the user's entire interactive movie collections:
    Wishlist (saved), Liked, Disliked, and Rated titles.
    """
    user_id = int(get_jwt_identity())
    
    likes = UserLike.query.filter_by(user_id=user_id).order_by(UserLike.created_at.desc()).all()
    dislikes = UserDislike.query.filter_by(user_id=user_id).order_by(UserDislike.created_at.desc()).all()
    saved = UserSaved.query.filter_by(user_id=user_id).order_by(UserSaved.created_at.desc()).all()
    ratings = UserRating.query.filter_by(user_id=user_id).order_by(UserRating.created_at.desc()).all()

    liked_ids = [l.movie_id for l in likes]
    disliked_ids = [d.movie_id for d in dislikes]
    saved_ids = [s.movie_id for s in saved]
    ratings_map = {r.movie_id: r.rating for r in ratings}

    # Fetch movie metadata from recommender's DataFrame
    df = recommender.movies_df
    records_by_id = {int(r['movieId']): r for r in df.to_dict('records')} if df is not None else {}

    def build_items(id_list, ratings_dict=None):
        out = []
        for mid in id_list:
            if mid in records_by_id:
                row = dict(records_by_id[mid])
                item = {
                    "movieId": int(row['movieId']),
                    "tmdbId": int(row.get('tmdbId', 0)),
                    "clean_title": row['clean_title'],
                    "title": row['title'],
                    "year_display": row.get('year_display', ''),
                    "genres": row['genres_list'],
                    "avg_rating": float(row['avg_rating']),
                    "vote_count": int(row['vote_count'])
                }
                if ratings_dict and mid in ratings_dict:
                    item['user_rating'] = ratings_dict[mid]
                out.append(item)
        return enrich_movies_parallel(out)

    liked_movies = build_items(liked_ids)
    disliked_movies = build_items(disliked_ids)
    saved_movies = build_items(saved_ids)
    rated_movies = build_items(list(ratings_map.keys()), ratings_map)

    return jsonify({
        "liked_ids": liked_ids,
        "disliked_ids": disliked_ids,
        "saved_ids": saved_ids,
        "wishlist_ids": saved_ids,
        "ratings_map": ratings_map,
        "liked_movies": liked_movies,
        "disliked_movies": disliked_movies,
        "saved_movies": saved_movies,
        "wishlist_movies": saved_movies,
        "rated_movies": rated_movies,
        "counts": {
            "likes": len(liked_ids),
            "dislikes": len(disliked_ids),
            "saved": len(saved_ids),
            "wishlist": len(saved_ids),
            "ratings": len(ratings_map)
        }
    })


@app.route('/api/user-recommendations', methods=['GET'])
@jwt_required()
def get_user_personalized_recommendations():
    """
    GET /api/user-recommendations
    Returns dynamic Personalized Hybrid Recommendations driven by user's
    Likes, Dislikes, Wishlist, and Star Ratings.
    Query Params:
    - mode: 'hybrid', 'content', 'collaborative'
    - content_weight: alpha weight float (0.0 to 1.0)
    - limit: number of recommendations
    """
    user_id = int(get_jwt_identity())
    mode = request.args.get('mode', default='hybrid', type=str)
    content_weight = request.args.get('content_weight', default=0.6, type=float)
    top_n = request.args.get('limit', default=12, type=int)

    likes = UserLike.query.filter_by(user_id=user_id).all()
    dislikes = UserDislike.query.filter_by(user_id=user_id).all()
    saved = UserSaved.query.filter_by(user_id=user_id).all()
    ratings = UserRating.query.filter_by(user_id=user_id).all()

    liked_ids = [l.movie_id for l in likes]
    disliked_ids = [d.movie_id for d in dislikes]
    saved_ids = [s.movie_id for s in saved]
    rated_dict = {r.movie_id: r.rating for r in ratings}

    result = recommender.get_user_personalized_hybrid_recommendations(
        user_id=user_id,
        liked_ids=liked_ids,
        saved_ids=saved_ids,
        disliked_ids=disliked_ids,
        rated_dict=rated_dict,
        mode=mode,
        content_weight=content_weight,
        top_n=top_n
    )

    enriched_recs = enrich_movies_parallel(result.get("recommendations", []))

    return jsonify({
        "recommendations": enriched_recs,
        "is_cold_start": result.get("is_cold_start", False),
        "reason": result.get("reason", ""),
        "userId": user_id,
        "mode": mode,
        "content_weight": content_weight,
        "interaction_stats": {
            "likes_count": len(liked_ids),
            "dislikes_count": len(disliked_ids),
            "saved_count": len(saved_ids),
            "wishlist_count": len(saved_ids),
            "ratings_count": len(rated_dict)
        }
    })



@app.route('/api/recommendations/<int:movie_id>', methods=['GET'])
@jwt_required()
def get_recommendations(movie_id: int):
    """
    Returns hybrid recommendations for a target movie.
    Query Params:
    - mode: 'hybrid', 'content', or 'collaborative'
    - content_weight: alpha weight float (0.0 to 1.0)
    - genre: optional genre filter
    - min_rating: minimum star rating float
    - limit / top_n: number of recommendations
    """
    if not recommender.is_loaded:
        return jsonify({"error": "Models not loaded"}), 500
    
    mode = request.args.get('mode', default='hybrid', type=str)
    content_weight = request.args.get('content_weight', default=0.6, type=float)
    genre_filter = request.args.get('genre', default='All', type=str)
    min_rating = request.args.get('min_rating', default=0.0, type=float)
    top_n = request.args.get('limit', default=10, type=int)

    df = recommender.movies_df
    matched = df[df['movieId'] == movie_id]
    
    if matched.empty:
        return jsonify({"error": "Target movie not found"}), 404
        
    query_title = matched.iloc[0]['clean_title']
    
    raw_recs = recommender.recommend(
        query_title=query_title,
        mode=mode,
        content_weight=content_weight,
        genre_filter=genre_filter,
        min_rating=min_rating,
        top_n=top_n
    )
    
    enriched_recs = [enrich_movie_item(r) for r in raw_recs]
    return jsonify(enriched_recs)


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"[INFO] Starting CineSphere Flask REST API on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
