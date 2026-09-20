import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

const MovieCard = ({ movie, mode = 'hybrid', rank = null }) => {
  const navigate = useNavigate();
  if (!movie) return null;

  const title = movie.clean_title || movie.title || 'Unknown';
  const scorePct = movie.similarity_score ? (movie.similarity_score * 100).toFixed(1) : null;
  const genresStr = Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(' • ') : movie.genres;

  const handleClick = () => {
    navigate(`/movie/${movie.movieId}`);
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
        <div className="card-title" title={title}>
          {title}
        </div>
        <div className="card-meta">
          {scorePct ? (
            <span className="card-match-pill">{scorePct}% Match</span>
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
