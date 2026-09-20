import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, LogIn } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import LoadingSpinner from '../components/LoadingSpinner';
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

  if (!content) {
    return (
      <div style={{ paddingTop: '160px', minHeight: '80vh', backgroundColor: '#141414' }}>
        <LoadingSpinner text="Loading CineSphere Streaming Catalog..." />
      </div>
    );
  }

  const heroMovie = content?.top10?.[0] || null;

  return (
    <div>
      <HeroBanner movies={content?.top10} movie={heroMovie} />
      
      {!isAuthenticated && (
        <div 
          className="position-fixed bottom-0 start-50 translate-middle-x mb-4 px-3 px-md-4 py-3 rounded-4 d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 shadow-lg"
          style={{
            width: '92%',
            maxWidth: '960px',
            zIndex: 9999,
            background: 'rgba(16, 16, 22, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(229, 9, 20, 0.45)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(229, 9, 20, 0.25)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '42px', height: '42px', backgroundColor: 'rgba(229, 9, 20, 0.25)', color: '#e50914' }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h6 className="text-white fw-bold mb-0" style={{ fontSize: '0.98rem' }}>
                Previewing CineSphere Streaming Catalog
              </h6>
              <p className="text-secondary mb-0" style={{ fontSize: '0.82rem' }}>
                Sign in or create a free account to watch movies, get AI recommendations, and chat with CineBot.
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <Link to="/login" className="btn btn-outline-light btn-sm fw-semibold px-3 py-1-5 rounded-3" style={{ fontSize: '0.85rem' }}>
              Sign In
            </Link>
            <Link to="/signup" className="btn btn-danger btn-sm fw-bold px-3 py-1-5 d-flex align-items-center gap-1 rounded-3" style={{ backgroundColor: '#e50914', borderColor: '#e50914', fontSize: '0.85rem' }}>
              <LogIn size={15} />
              Create Account
            </Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
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

