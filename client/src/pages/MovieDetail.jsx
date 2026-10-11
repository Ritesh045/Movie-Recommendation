import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetail, getRecommendations } from '../api';
import MovieCard from '../components/MovieCard';
import RecommendationModeToggle from '../components/RecommendationModeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import { Star, Tag, Lightbulb } from 'lucide-react';

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [mode, setMode] = useState('hybrid');
  const [contentWeight, setContentWeight] = useState(0.6);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);

  // Fetch movie details
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoadingMovie(true);
        const data = await getMovieDetail(id);
        setMovie(data);
      } catch (err) {
        console.error('Failed to fetch movie detail:', err);
      } finally {
        setLoadingMovie(false);
      }
    };

    fetchDetail();
    window.scrollTo(0, 0);
  }, [id]);

  // Fetch recommendations whenever id, mode, or contentWeight changes
  useEffect(() => {
    const fetchRecs = async () => {
      if (!id) return;
      try {
        setLoadingRecs(true);
        const recs = await getRecommendations(id, mode, contentWeight, 'All', 0.0, 10);
        setRecommendations(recs);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchRecs();
  }, [id, mode, contentWeight]);

  if (loadingMovie) {
    return (
      <div style={{ paddingTop: '140px' }}>
        <LoadingSpinner text="Loading movie details..." />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container text-center text-white" style={{ paddingTop: '140px' }}>
        <h2>Movie Not Found</h2>
      </div>
    );
  }

  const genres = Array.isArray(movie.genres) ? movie.genres : [];

  return (
    <div style={{ paddingTop: '80px' }}>
      {/* Backdrop Header */}
      <div
        className="position-relative py-5 px-4"
        style={{
          background: `linear-gradient(180deg, rgba(20,20,20,0.6) 0%, #141414 100%), url(${movie.poster_url}) center/cover no-repeat`,
          minHeight: '400px',
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-3 text-center text-md-start mb-4 mb-md-0">
              <img
                src={movie.poster_url}
                alt={movie.clean_title}
                className="img-fluid rounded shadow-lg"
                style={{ maxHeight: '360px', objectFit: 'cover' }}
              />
            </div>

            <div className="col-md-9 text-white">
              <h1 className="display-4 fw-extrabold mb-2">{movie.clean_title || movie.title}</h1>
              <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                <span className="text-warning fw-bold">
                  <Star size={18} fill="#ffd700" color="#ffd700" className="me-1" />
                  {movie.avg_rating ? movie.avg_rating.toFixed(1) : 'N/A'} ({movie.vote_count} votes)
                </span>
                <span className="text-secondary">{movie.year_display}</span>
                {genres.map((g) => (
                  <span key={g} className="badge bg-secondary opacity-75">
                    {g}
                  </span>
                ))}
              </div>

              <p className="lead text-light mb-4" style={{ maxWidth: '750px' }}>
                {movie.corpus || `Discover detailed metrics and recommendations for '${movie.clean_title}'.`}
              </p>

              {movie.user_tags && (
                <div className="d-flex align-items-center text-secondary small">
                  <Tag size={16} className="me-2 text-danger" />
                  <span>Tags: {movie.user_tags}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="container my-5">
        <h2 className="fw-bold text-white mb-2">🎯 Recommended For You</h2>
        <p className="text-secondary">
          Tune recommendation algorithm preferences below to update candidate scores in real-time.
        </p>

        <RecommendationModeToggle
          mode={mode}
          onModeChange={setMode}
          contentWeight={contentWeight}
          onWeightChange={setContentWeight}
        />

        {loadingRecs ? (
          <LoadingSpinner text={`Computing ${mode.toUpperCase()} recommendations...`} />
        ) : recommendations.length > 0 ? (
          <div>
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-4 my-3">
              {recommendations.map((rec) => (
                <div className="col" key={rec.movieId}>
                  <MovieCard movie={rec} mode={mode} />
                  {rec.explanation && (
                    <div className="bg-dark p-2 rounded mt-2 border border-secondary border-opacity-25 text-start" style={{ fontSize: '0.78rem' }}>
                      <div className="text-warning fw-semibold mb-1">
                        <Lightbulb size={12} className="me-1" />
                        Why Recommended?
                      </div>
                      <div className="text-secondary">{rec.explanation.reason}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-secondary py-4">No recommendations found matching your criteria.</div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
