import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, LogIn } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import { getHomeContent } from '../api';
import { useAuth } from '../context/AuthContext';

const CACHE_KEY = 'cinesphere_home_cache_v3';

const getInitialCache = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Ignore storage errors
  }
  return null;
};

const Home = () => {
  const [content, setContent] = useState(() => getInitialCache());
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const fetchFreshContent = async () => {
      try {
        const freshData = await getHomeContent();
        if (isMounted && freshData) {
          setContent(freshData);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
          } catch (e) {
            // Ignore quota errors
          }
        }
      } catch (err) {
        console.error('Error loading homepage content:', err);
      }
    };

    fetchFreshContent();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroMovie = content?.top10?.[0] || null;

  return (
    <div>
      <HeroBanner movies={content?.top10} movie={heroMovie} />
      
      {!isAuthenticated && (
        <div className="container mt-4 mb-2">
          <div 
            className="p-3 p-md-4 rounded-4 d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(229, 9, 20, 0.22) 0%, rgba(18, 18, 24, 0.9) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(229, 9, 20, 0.4)',
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '46px', height: '46px', backgroundColor: 'rgba(229, 9, 20, 0.25)', color: '#e50914' }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h5 className="text-white fw-bold mb-1" style={{ fontSize: '1.05rem' }}>
                  Previewing CineSphere Streaming Catalog
                </h5>
                <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>
                  Sign in or create a free account to watch movies, access AI recommendations, and chat with CineBot.
                </p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              <Link to="/login" className="btn btn-outline-light btn-sm fw-semibold px-3 py-2 rounded-3">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-danger btn-sm fw-bold px-3 py-2 d-flex align-items-center gap-1 rounded-3" style={{ backgroundColor: '#e50914', borderColor: '#e50914' }}>
                <LogIn size={16} />
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: isAuthenticated ? '-40px' : '0px', position: 'relative', zIndex: 10 }}>
        {content?.top10?.length > 0 && (
          <MovieRow 
            title="🏆 Top 10 Movies & Shows Today" 
            movies={content.top10} 
            isTop10={true} 
          />
        )}
        
        {content?.trending?.length > 0 && (
          <MovieRow 
            title="🔥 Trending Now" 
            movies={content.trending} 
          />
        )}

        {content?.action?.length > 0 && (
          <MovieRow 
            title="💥 Action & Sci-Fi Blockbusters" 
            movies={content.action} 
          />
        )}

        {content?.drama?.length > 0 && (
          <MovieRow 
            title="🎭 Critically Acclaimed Dramas" 
            movies={content.drama} 
          />
        )}

        {content?.scifi?.length > 0 && (
          <MovieRow 
            title="🚀 Sci-Fi & Cyberpunk Adventures" 
            movies={content.scifi} 
          />
        )}

        {content?.thriller?.length > 0 && (
          <MovieRow 
            title="🔪 High-Octane Thrillers & Crime" 
            movies={content.thriller} 
          />
        )}

        {content?.comedy?.length > 0 && (
          <MovieRow 
            title="😂 Comedy Hits & Laughs" 
            movies={content.comedy} 
          />
        )}

        {content?.animation?.length > 0 && (
          <MovieRow 
            title="🎨 Animation & Anime Favorites" 
            movies={content.animation} 
          />
        )}

        {content?.romance?.length > 0 && (
          <MovieRow 
            title="❤️ Romantic Hits & Feel-Good Stories" 
            movies={content.romance} 
          />
        )}
      </div>
    </div>
  );
};

export default Home;

