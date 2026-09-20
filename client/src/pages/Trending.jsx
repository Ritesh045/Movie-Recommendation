import React, { useState, useEffect } from 'react';
import { getTrendingMovies, getMoviesByGenre } from '../api';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import HeroBanner from '../components/HeroBanner';
import { Flame, Film, Tv, Trophy, Sparkles, Filter } from 'lucide-react';

const Trending = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [activeGenre, setActiveGenre] = useState('All');
  const [trendingList, setTrendingList] = useState([]);
  const [topMovie, setTopMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        setLoading(true);
        let data = [];
        if (activeTab === 'all' || activeTab === 'movies') {
          data = await getTrendingMovies(30);
        } else if (activeTab === 'series') {
          data = await getMoviesByGenre('Sci-Fi', 24);
        } else if (activeTab === 'top10') {
          data = await getTrendingMovies(10);
        }

        setTrendingList(data);
        if (data && data.length > 0) {
          setTopMovie(data[0]);
        }
      } catch (err) {
        console.error('Error loading trending page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingData();
  }, [activeTab]);

  // Filter list by selected genre
  const filteredList = trendingList.filter((m) => {
    if (activeGenre === 'All') return true;
    if (!m.genres) return false;
    const gList = Array.isArray(m.genres) ? m.genres : [m.genres];
    return gList.some((g) => g.toLowerCase() === activeGenre.toLowerCase());
  });

  const genres = ['All', 'Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller', 'Animation'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#141414' }}>
      {/* Featured #1 Trending Backdrop Banner */}
      {topMovie && <HeroBanner movies={trendingList} movie={topMovie} />}

      <div 
        className="container px-4" 
        style={{ 
          marginTop: topMovie ? '-60px' : '0px', 
          paddingTop: topMovie ? '0px' : '110px',
          position: 'relative', 
          zIndex: 10 
        }}
      >
        {/* Header Title & Tabs */}
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4 pb-2">
          <div>
            <h1 className="fw-black text-light d-flex align-items-center gap-3 mb-2" style={{ fontSize: '2.5rem', letterSpacing: '-0.5px' }}>
              <Flame color="#e50914" size={36} />
              Trending Now
            </h1>
            <p className="text-secondary mb-0" style={{ fontSize: '0.98rem', maxWidth: '600px' }}>
              Real-time trending movies, binge-worthy series, and daily top picks powered by CineSphere recommendation engine.
            </p>
          </div>

          {/* Navigation Category Tabs */}
          <div className="trending-category-tabs">
            <button
              className={`trending-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Sparkles size={15} /> All Trending
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'movies' ? 'active' : ''}`}
              onClick={() => setActiveTab('movies')}
            >
              <Film size={15} /> Movies
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'series' ? 'active' : ''}`}
              onClick={() => setActiveTab('series')}
            >
              <Tv size={15} /> TV Series
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'top10' ? 'active' : ''}`}
              onClick={() => setActiveTab('top10')}
            >
              <Trophy size={15} className={activeTab === 'top10' ? 'text-white' : 'text-warning'} /> Top 10 Today
            </button>
          </div>
        </div>

        {/* Genre Pill Filter Row */}
        <div className="d-flex align-items-center gap-2 mb-4 pb-3 overflow-auto">
          <span className="text-secondary me-2 d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            <Filter size={15} /> Filter:
          </span>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`trending-genre-pill ${activeGenre === g ? 'active' : ''}`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Content Loading or Grid Display */}
        {loading ? (
          <div className="py-5">
            <LoadingSpinner text="Fetching real-time trending titles..." />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <h5>No trending titles found matching "{activeGenre}".</h5>
            <p>Try switching genre filters or category tabs above.</p>
          </div>
        ) : (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3 g-md-4">
            {filteredList.map((movie, idx) => (
              <div key={movie.movieId} className="col">
                <MovieCard movie={movie} rank={activeTab === 'top10' ? idx + 1 : null} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trending;
