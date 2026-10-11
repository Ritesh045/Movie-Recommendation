import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, Bookmark, Check } from 'lucide-react';
import { useInteractions } from '../context/InteractionContext';
import { useAuth } from '../context/AuthContext';

const MovieCard = ({ movie, mode = 'hybrid', rank = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { 
    isLiked, 
    isDisliked, 
    isInWishlist, 
    getRating, 
    toggleLike, 
    toggleDislike, 
    toggleWishlist 
  } = useInteractions();

  if (!movie) return null;

  const mid = Number(movie.movieId);
  const liked = isLiked(mid);
  const disliked = isDisliked(mid);
  const inWishlist = isInWishlist(mid);
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

  const handleDislikeClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await toggleDislike(mid);
  };

  const handleWishlistClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await toggleWishlist(mid);
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
          {/* Quick YouTube-Style Action Icons (Like, Dislike, Wishlist) */}
          <div className="d-flex align-items-center gap-1 ms-1">
            {/* Quick Like */}
            <button
              type="button"
              className={`btn btn-sm p-1 border-0 rounded-circle ${liked ? 'text-light bg-danger' : 'text-light text-opacity-80'}`}
              style={{ backgroundColor: liked ? '#e50914' : 'rgba(0, 0, 0, 0.7)', lineHeight: 1 }}
              onClick={handleLikeClick}
              title={liked ? "Remove Like" : "Like"}
              aria-label={liked ? "Remove Like" : "Like"}
            >
              <ThumbsUp size={13} fill={liked ? "#ffffff" : "none"} color="#ffffff" />
            </button>
            {/* Quick Dislike */}
            <button
              type="button"
              className={`btn btn-sm p-1 border-0 rounded-circle ${disliked ? 'text-light bg-danger' : 'text-light text-opacity-80'}`}
              style={{ backgroundColor: disliked ? '#dc3545' : 'rgba(0, 0, 0, 0.7)', lineHeight: 1 }}
              onClick={handleDislikeClick}
              title={disliked ? "Remove Dislike" : "Dislike"}
              aria-label={disliked ? "Remove Dislike" : "Dislike"}
            >
              <ThumbsDown size={13} fill={disliked ? "#ffffff" : "none"} color="#ffffff" />
            </button>
            {/* Quick Wishlist */}
            <button
              type="button"
              className={`btn btn-sm p-1 border-0 rounded-circle ${inWishlist ? 'text-warning' : 'text-light text-opacity-80'}`}
              style={{ backgroundColor: inWishlist ? 'rgba(255, 193, 7, 0.2)' : 'rgba(0, 0, 0, 0.7)', lineHeight: 1 }}
              onClick={handleWishlistClick}
              title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              {inWishlist ? (
                <Check size={13} color="#ffd700" strokeWidth={3} />
              ) : (
                <Bookmark size={13} color="#ffffff" />
              )}
            </button>
          </div>
        </div>

        <div className="card-meta">
          {scorePct ? (
            <span className="card-match-pill">{scorePct}% Match</span>
          ) : userRating ? (
            <span className="badge bg-warning text-dark px-1 py-0 fw-bold" style={{ fontSize: '0.72rem' }}>
              You: {Number(userRating).toFixed(1)}★
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

