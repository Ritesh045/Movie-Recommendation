import React, { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import MovieRow from '../components/MovieRow';
import LoadingSpinner from '../components/LoadingSpinner';
import { getHomeContent, getUserPersonalizedRecommendations } from '../api';
import { useAuth } from '../context/AuthContext';
import { useInteractions } from '../context/InteractionContext';

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
  const { isAuthenticated } = useAuth();
  const { libraryData, likesCount, savedCount, ratedCount } = useInteractions();
  const [content, setContent] = useState(() => getInitialCache());
  const [personalizedRecs, setPersonalizedRecs] = useState([]);

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

  // Fetch real-time personalized AI recommendations when user is authenticated & interacts
  useEffect(() => {
    if (!isAuthenticated) {
      setPersonalizedRecs([]);
      return;
    }

    let isMounted = true;
    const fetchPersonalized = async () => {
      try {
        const data = await getUserPersonalizedRecommendations('hybrid', 0.6, 14);
        if (isMounted && data && !data.is_cold_start && data.recommendations?.length > 0) {
          setPersonalizedRecs(data.recommendations);
        }
      } catch (err) {
        console.warn('Unable to load personalized recommendations for home:', err);
      }
    };

    fetchPersonalized();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, likesCount, savedCount, ratedCount]);

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
        {/* Real-Time Personalized AI Recommendations Row (Driven by Likes, Saves & Ratings) */}
        {personalizedRecs.length > 0 && (
          <MovieRow 
            title="✨ Top Picks For You (AI Personalized)" 
            movies={personalizedRecs} 
          />
        )}

        {/* My List / Saved Watchlist Row */}
        {libraryData?.saved_movies?.length > 0 && (
          <MovieRow 
            title="🔖 My List (Your Watchlist)" 
            movies={libraryData.saved_movies} 
          />
        )}

        {/* Liked Movies Row */}
        {libraryData?.liked_movies?.length > 0 && (
          <MovieRow 
            title="❤️ Movies You Liked" 
            movies={libraryData.liked_movies} 
          />
        )}

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

