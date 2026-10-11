import React, { useState, useEffect } from 'react';
import { Bookmark, Heart, Star, Sparkles, Sliders, Film } from 'lucide-react';
import { useInteractions } from '../context/InteractionContext';
import { getUserPersonalizedRecommendations } from '../api';
import MovieCard from '../components/MovieCard';
import RecommendationModeToggle from '../components/RecommendationModeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';

const MyList = () => {
  const { libraryData, loadingLibrary, likesCount, savedCount, ratedCount } = useInteractions();

  const [activeTab, setActiveTab] = useState('saved'); // 'saved', 'liked', 'rated', 'forYou'
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsMeta, setRecsMeta] = useState(null);
  const [mode, setMode] = useState('hybrid');
  const [contentWeight, setContentWeight] = useState(0.6);

  // Fetch personalized recommendations whenever user opens 'forYou' tab or tunes mode/weight
  useEffect(() => {
    if (activeTab !== 'forYou') return;

    const fetchPersonalized = async () => {
      try {
        setLoadingRecs(true);
        const data = await getUserPersonalizedRecommendations(mode, contentWeight, 18);
        setPersonalizedRecs(data.recommendations || []);
        setRecsMeta(data);
      } catch (err) {
        console.error('Error fetching personalized recommendations:', err);
      } finally {
        setLoadingRecs(false);
      }
    };

    fetchPersonalized();
  }, [activeTab, mode, contentWeight, likesCount, savedCount, ratedCount]);

  const savedMovies = libraryData?.saved_movies || [];
  const likedMovies = libraryData?.liked_movies || [];
  const ratedMovies = libraryData?.rated_movies || [];

  return (
    <div style={{ paddingTop: '110px', minHeight: '90vh', backgroundColor: '#141414' }}>
      <div className="container px-4">
        
        {/* Header Title & Subtitle */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom border-secondary border-opacity-10">
          <div>
            <h1 className="fw-black text-light d-flex align-items-center gap-2 mb-1" style={{ fontSize: '2.4rem' }}>
              <Bookmark color="#ffd700" size={32} />
              My Library & Watchlist
            </h1>
            <p className="text-secondary mb-0" style={{ fontSize: '0.95rem' }}>
              Your saved watchlist, liked movies, and AI recommendations tuned by your taste.
            </p>
          </div>

          {/* Interactive Tabs */}
          <div className="trending-category-tabs">
            <button
              className={`trending-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
            >
              <Bookmark size={15} /> Watchlist ({savedCount})
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              <Heart size={15} /> Liked ({likesCount})
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'rated' ? 'active' : ''}`}
              onClick={() => setActiveTab('rated')}
            >
              <Star size={15} /> Rated ({ratedCount})
            </button>
            <button
              className={`trending-tab-btn ${activeTab === 'forYou' ? 'active' : ''}`}
              onClick={() => setActiveTab('forYou')}
            >
              <Sparkles size={15} /> AI Picks For You
            </button>
          </div>
        </div>

        {/* Tab 1: Saved Watchlist */}
        {activeTab === 'saved' && (
          <div>
            {loadingLibrary ? (
              <LoadingSpinner text="Loading your Watchlist..." />
            ) : savedMovies.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <Bookmark size={48} className="text-secondary opacity-50 mb-3" />
                <h4 className="text-light">Your Watchlist is empty</h4>
                <p className="mb-4">Click the bookmark icon or "+ Add to List" on any movie to save it here.</p>
                <Link to="/search" className="btn btn-danger px-4 py-2 rounded-pill fw-bold">
                  Explore Movies
                </Link>
              </div>
            ) : (
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3 g-md-4">
                {savedMovies.map((movie) => (
                  <div key={movie.movieId} className="col">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Liked Movies */}
        {activeTab === 'liked' && (
          <div>
            {loadingLibrary ? (
              <LoadingSpinner text="Loading Liked titles..." />
            ) : likedMovies.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <Heart size={48} className="text-secondary opacity-50 mb-3" />
                <h4 className="text-light">No liked movies yet</h4>
                <p className="mb-4">Click the heart icon on any movie you love to boost its plot and genre themes in your recommendations.</p>
                <Link to="/trending" className="btn btn-danger px-4 py-2 rounded-pill fw-bold">
                  Browse Trending Titles
                </Link>
              </div>
            ) : (
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3 g-md-4">
                {likedMovies.map((movie) => (
                  <div key={movie.movieId} className="col">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rated Movies */}
        {activeTab === 'rated' && (
          <div>
            {loadingLibrary ? (
              <LoadingSpinner text="Loading your ratings..." />
            ) : ratedMovies.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <Star size={48} className="text-secondary opacity-50 mb-3" />
                <h4 className="text-light">No rated movies yet</h4>
                <p className="mb-4">Give movies star ratings (1★ to 5★) on their details page to train the Collaborative Filtering ML model!</p>
                <Link to="/" className="btn btn-danger px-4 py-2 rounded-pill fw-bold">
                  Rate Movies on Home
                </Link>
              </div>
            ) : (
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3 g-md-4">
                {ratedMovies.map((movie) => (
                  <div key={movie.movieId} className="col">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AI Recommendations Tuned by User Interactions */}
        {activeTab === 'forYou' && (
          <div>
            <div className="p-3 mb-4 rounded-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div>
                <h5 className="text-light mb-1 d-flex align-items-center gap-2">
                  <Sparkles size={18} className="text-warning" />
                  Personalized Recommendations Engine
                </h5>
                <p className="text-secondary mb-0 small">
                  {recsMeta?.reason || 'Calculated in real-time from your Likes, Watchlist, and Star Ratings.'}
                </p>
              </div>

              <RecommendationModeToggle
                mode={mode}
                onModeChange={setMode}
                contentWeight={contentWeight}
                onWeightChange={setContentWeight}
              />
            </div>

            {loadingRecs ? (
              <LoadingSpinner text={`Computing personalized ${mode.toUpperCase()} recommendations...`} />
            ) : recsMeta?.is_cold_start ? (
              <div className="text-center py-5 text-secondary">
                <Sliders size={48} className="text-warning opacity-75 mb-3" />
                <h4 className="text-light">Start Interacting to Unlock Personalization</h4>
                <p className="mb-4" style={{ maxWidth: '550px', margin: '0 auto' }}>
                  Like movies, save to your Watchlist, or rate titles 1–5 stars. Our Hybrid ML Engine will instantly model your preferences!
                </p>
                <Link to="/" className="btn btn-danger px-4 py-2 rounded-pill fw-bold">
                  Browse Catalog
                </Link>
              </div>
            ) : personalizedRecs.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                No recommendations found. Try adjusting the Content Weight slider above.
              </div>
            ) : (
              <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3 g-md-4">
                {personalizedRecs.map((movie) => (
                  <div key={movie.movieId} className="col">
                    <MovieCard movie={movie} mode={mode} />
                    {movie.explanation && (
                      <div 
                        className="bg-dark p-2 rounded mt-2 border border-secondary border-opacity-25 text-start" 
                        style={{ fontSize: '0.75rem' }}
                      >
                        <div className="text-warning fw-semibold mb-1">
                          <Sparkles size={11} className="me-1" />
                          Why Recommended?
                        </div>
                        <div className="text-secondary" style={{ lineHeight: 1.3 }}>
                          {movie.explanation.reason}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MyList;
