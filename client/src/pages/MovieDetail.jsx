import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getMovieDetail, getRecommendations } from '../api';
import MovieCard from '../components/MovieCard';
import RecommendationModeToggle from '../components/RecommendationModeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import MovieInteractionBar from '../components/MovieInteractionBar';
import { Star, Tag, RefreshCw } from 'lucide-react';

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [mode, setMode] = useState('hybrid');
  const [contentWeight, setContentWeight] = useState(0.6);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [isUpdatingRecs, setIsUpdatingRecs] = useState(false);
  const [recRefreshKey, setRecRefreshKey] = useState(0);

  // In-memory client cache for instant switching between Hybrid, Content, Collaborative
  const recsCacheRef = useRef({});

  // Reset cache on movie navigation
  useEffect(() => {
    recsCacheRef.current = {};
  }, [id]);

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

  // Instant Recommendations: check cache first, prefetch alternate modes in background
  useEffect(() => {
    if (!id) return;
    const cacheKey = `${mode}_${Number(contentWeight).toFixed(2)}`;

    // 1. Instant Cache Hit (0ms)
    if (recsCacheRef.current[cacheKey]) {
      setRecommendations(recsCacheRef.current[cacheKey]);
      setLoadingRecs(false);
      setIsUpdatingRecs(false);
      return;
    }

    let isMounted = true;

    const fetchRecs = async () => {
      try {
        if (recommendations.length > 0) {
          setIsUpdatingRecs(true);
        } else {
          setLoadingRecs(true);
        }

        const recs = await getRecommendations(id, mode, contentWeight, 'All', 0.0, 10);
        if (isMounted) {
          recsCacheRef.current[cacheKey] = recs || [];
          setRecommendations(recs || []);

          // Background Prefetch other modes so menu switching is 100% instant
          const modesToPrefetch = ['hybrid', 'content', 'collaborative'].filter(m => m !== mode);
          modesToPrefetch.forEach(async (m) => {
            const mKey = `${m}_${Number(contentWeight).toFixed(2)}`;
            if (!recsCacheRef.current[mKey]) {
              try {
                const prefetched = await getRecommendations(id, m, contentWeight, 'All', 0.0, 10);
                if (isMounted && prefetched) {
                  recsCacheRef.current[mKey] = prefetched;
                }
              } catch (_) {
                // Ignore prefetch errors silently
              }
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        if (isMounted) {
          setLoadingRecs(false);
          setIsUpdatingRecs(false);
        }
      }
    };

    fetchRecs();

    return () => {
      isMounted = false;
    };
  }, [id, mode, contentWeight, recRefreshKey]);

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

              {/* Interactive Like, Save / My List, and 5-Star Rating Feedback Bar */}
              <MovieInteractionBar 
                movieId={id} 
                onInteractionChange={() => setRecRefreshKey(k => k + 1)} 
              />

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
            {isUpdatingRecs && (
              <div className="d-inline-flex align-items-center gap-2 mb-3 py-1 px-3 rounded-pill bg-warning bg-opacity-10 border border-warning border-opacity-25 text-warning small">
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Updating {mode.toUpperCase()} recommendations in real time...</span>
              </div>
            )}
            <div 
              className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-4 my-3"
              style={{ opacity: isUpdatingRecs ? 0.75 : 1, transition: 'opacity 0.2s ease' }}
            >
              {recommendations.map((rec) => (
                <div className="col" key={rec.movieId}>
                  <MovieCard movie={rec} mode={mode} />
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
