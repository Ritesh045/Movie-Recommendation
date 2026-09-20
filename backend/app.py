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
from flask_jwt_extended import JWTManager, jwt_required

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from backend.recommender import MovieRecommender
from backend.tmdb_api import get_movie_poster_url
from backend.models import db
from backend.auth import auth_bp
from backend.chatbot import chatbot_bp

from concurrent.futures import ThreadPoolExecutor
import pandas as pd

app = Flask(__name__)
# Enable CORS for all routes so React dev server can access API
CORS(app)

# Initialize Rate Limiter (~10 requests/min for chatbot)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["500 per day", "150 per hour"]
)
limiter.limit("10 per minute")(chatbot_bp)

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
app.register_blueprint(chatbot_bp)

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


@app.route('/api/home_content', methods=['GET'])
def get_home_content():
    """
    Returns ALL homepage sections instantly in < 1ms from in-memory cache.
    Eliminates network delays and guarantees instant UI rendering.
    """
    global HOME_CACHE
    if HOME_CACHE is not None:
        return jsonify(HOME_CACHE)

    if not recommender.is_loaded:
        return jsonify({"error": "Models not loaded"}), 500

    df = recommender.movies_df

    # 1. Trending & Top 10
    top_movies = recommender.get_top_rated_movies(top_n=20, min_votes=30)
    
    # Helper to get movies by genre keyword
    def get_by_genre(genre_name, limit=16):
        matching = [
            {
                "movieId": int(r['movieId']),
                "tmdbId": int(r.get('tmdbId', 0)),
                "clean_title": r['clean_title'],
                "title": r['title'],
                "year_display": r.get('year_display', ''),
                "genres": r['genres_list'],
                "avg_rating": float(r['avg_rating']),
                "vote_count": int(r['vote_count'])
            }
            for _, r in df.iterrows()
            if genre_name.lower() in [g.lower() for g in r['genres_list']]
        ]
        sorted_list = sorted(matching, key=lambda x: (x['avg_rating'], x['vote_count']), reverse=True)
        return sorted_list[:limit]

    action = get_by_genre('Action', 16)
    scifi = get_by_genre('Sci-Fi', 16)
    drama = get_by_genre('Drama', 16)
    comedy = get_by_genre('Comedy', 16)
    animation = get_by_genre('Animation', 16)
    thriller = get_by_genre('Thriller', 16)
    romance = get_by_genre('Romance', 16)

    # Parallel enrichment across all sections
    all_to_enrich = top_movies + action + scifi + drama + comedy + animation + thriller + romance
    enriched_all = enrich_movies_parallel(all_to_enrich)

    # Map back to respective sections
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

    HOME_CACHE = {
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


from backend.models import UserRating

@app.route('/api/rate', methods=['POST'])
@jwt_required()
def rate_movie():
    """
    POST /api/rate
    Allows authenticated user to rate a movie (1.0 to 5.0 stars).
    Persists rating in SQLite database and dynamically updates recommender user-item matrix.
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    movie_id = data.get('movieId')
    rating = data.get('rating')

    if not movie_id or rating is None:
        return jsonify({"error": "movieId and rating are required"}), 400

    try:
        rating_val = float(rating)
        rating_val = max(1.0, min(5.0, rating_val))

        existing = UserRating.query.filter_by(user_id=int(user_id), movie_id=int(movie_id)).first()
        if existing:
            existing.rating = rating_val
        else:
            new_r = UserRating(user_id=int(user_id), movie_id=int(movie_id), rating=rating_val)
            db.session.add(new_r)

        db.session.commit()

        # Update in-memory user_item_matrix if loaded
        if recommender.user_item_matrix is not None:
            uid = int(user_id)
            mid = int(movie_id)
            if uid not in recommender.user_item_matrix.index:
                recommender.user_item_matrix.loc[uid] = np.nan
            recommender.user_item_matrix.loc[uid, mid] = rating_val

            if recommender.user_sim_df is not None:
                from sklearn.metrics.pairwise import cosine_similarity
                filled = recommender.user_item_matrix.fillna(0)
                u_vec = filled.loc[[uid]]
                sim_row = cosine_similarity(u_vec, filled)[0]
                sim_series = pd.Series(sim_row, index=recommender.user_item_matrix.index)
                recommender.user_sim_df.loc[uid] = sim_series
                recommender.user_sim_df[uid] = sim_series

        return jsonify({
            "message": f"Rating of {rating_val}★ recorded successfully!",
            "userId": user_id,
            "movieId": movie_id,
            "rating": rating_val
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user-recommendations', methods=['GET'])
@jwt_required()
def get_user_personalized_recommendations():
    """
    GET /api/user-recommendations
    Returns User-Based Collaborative Filtering recommendations for current logged-in user.
    Includes cold-start detection flag if user has no rating history.
    """
    user_id = int(get_jwt_identity())
    top_n = request.args.get('limit', default=10, type=int)

    result = recommender.get_user_collaborative_recommendations(user_id=user_id, top_n=top_n)
    
    # Enrich movies with poster URLs
    enriched_recs = enrich_movies_parallel(result.get("recommendations", []))
    
    return jsonify({
        "recommendations": enriched_recs,
        "is_cold_start": result.get("is_cold_start", False),
        "reason": result.get("reason", ""),
        "userId": user_id
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
