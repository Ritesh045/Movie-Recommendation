import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Bookmark, Check } from 'lucide-react';
import { useInteractions } from '../context/InteractionContext';
import { useAuth } from '../context/AuthContext';

const MovieCard = ({ movie, mode = 'hybrid', rank = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isLiked, isSaved, getRating, toggleLike, toggleSave } = useInteractions();

  if (!movie) return null;

  const mid = Number(movie.movieId);
  const liked = isLiked(mid);
  const saved = isSaved(mid);
  const userRating = movie.user_rating !== undefined ? movie.user_rating : getRating(mid);

  const title = movie.clean_title || movie.title || 'Unknown';
  const scorePct = movie.similarity_score ? (movie.similarity_score * 100).toFixed(1) : null;
  const genresStr = Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(' • ') : movie.genres;

  const handleClick = () => {
    navigate(`/movie/${movie.movieId}`);
  };

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await toggleLike(mid);
  };

  const handleSaveClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await toggleSave(mid);
  };

  return (
    <div className={`movie-card-container ${rank ? 'has-rank' : ''}`} onClick={handleClick}>
      {rank && (
        <div className="top10-rank-number">
          {rank}
        </div>
      )}
      <img
        src={movie.poster_url}
        alt={title}
        className="movie-card-poster"
        loading="lazy"
      />
      <div className="movie-card-overlay">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <div className="card-title mb-0 flex-grow-1 text-truncate" title={title}>
            {title}
          </div>
          {/* Quick Action Icons */}
          <div className="d-flex align-items-center gap-1 ms-1">
            <button
              type="button"
              className={`btn btn-sm p-1 border-0 rounded-circle ${liked ? 'text-danger' : 'text-light text-opacity-75'}`}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', lineHeight: 1 }}
              onClick={handleLikeClick}
              title={liked ? "Unlike" : "Like"}
              aria-label={liked ? "Unlike" : "Like"}
            >
              <Heart size={14} fill={liked ? "#e50914" : "none"} color={liked ? "#e50914" : "#ffffff"} />
            </button>
            <button
              type="button"
              className={`btn btn-sm p-1 border-0 rounded-circle ${saved ? 'text-warning' : 'text-light text-opacity-75'}`}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', lineHeight: 1 }}
              onClick={handleSaveClick}
              title={saved ? "Remove from My List" : "Add to My List"}
              aria-label={saved ? "Remove from My List" : "Add to My List"}
            >
              {saved ? (
                <Check size={14} color="#ffd700" strokeWidth={3} />
              ) : (
                <Bookmark size={14} color="#ffffff" />
              )}
            </button>
          </div>
        </div>

        <div className="card-meta">
          {scorePct ? (
            <span className="card-match-pill">{scorePct}% Match</span>
          ) : userRating ? (
            <span className="badge bg-warning text-dark px-1 py-0" style={{ fontSize: '0.72rem' }}>
              You: {userRating}★
            </span>
          ) : (
            <span className="text-secondary">{movie.year_display}</span>
          )}
          <span className="card-rating-star">
            <Star size={12} fill="#ffd700" color="#ffd700" className="me-1" />
            {movie.avg_rating ? movie.avg_rating.toFixed(1) : 'N/A'}
          </span>
        </div>
        <div className="card-genre-tags">{genresStr}</div>
      </div>
    </div>
  );
};

export default MovieCard;

