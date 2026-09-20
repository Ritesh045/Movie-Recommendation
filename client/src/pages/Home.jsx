import React, { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import LoadingSpinner from '../components/LoadingSpinner';
import { getHomeContent } from '../api';

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

