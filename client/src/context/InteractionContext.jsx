import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserLibrary, toggleMovieLike, toggleMovieSave, rateMovie as apiRateMovie } from '../api';

const InteractionContext = createContext(null);

export const InteractionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [ratingsMap, setRatingsMap] = useState({});
  const [libraryData, setLibraryData] = useState({
    liked_movies: [],
    saved_movies: [],
    rated_movies: [],
  });
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Refresh user interactions library from server
  const fetchLibrary = useCallback(async () => {
    if (!isAuthenticated) {
      setLikedIds(new Set());
      setSavedIds(new Set());
      setRatingsMap({});
      setLibraryData({ liked_movies: [], saved_movies: [], rated_movies: [] });
      return;
    }

    try {
      setLoadingLibrary(true);
      const data = await getUserLibrary();
      if (data) {
        setLikedIds(new Set(data.liked_ids || []));
        setSavedIds(new Set(data.saved_ids || []));
        setRatingsMap(data.ratings_map || {});
        setLibraryData({
          liked_movies: data.liked_movies || [],
          saved_movies: data.saved_movies || [],
          rated_movies: data.rated_movies || [],
        });
      }
    } catch (err) {
      console.warn('Unable to load user library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const isLiked = useCallback((movieId) => likedIds.has(Number(movieId)), [likedIds]);
  const isSaved = useCallback((movieId) => savedIds.has(Number(movieId)), [savedIds]);
  const getRating = useCallback((movieId) => ratingsMap[Number(movieId)] || null, [ratingsMap]);

  const toggleLike = async (movieId) => {
    if (!isAuthenticated) return { error: 'Please sign in to like movies' };
    const mid = Number(movieId);
    try {
      const res = await toggleMovieLike(mid);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (res.is_liked) next.add(mid);
        else next.delete(mid);
        return next;
      });
      // Refresh full library in background to update recommendations
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error toggling like:', err);
      return { error: err.message };
    }
  };

  const toggleSave = async (movieId) => {
    if (!isAuthenticated) return { error: 'Please sign in to save movies to My List' };
    const mid = Number(movieId);
    try {
      const res = await toggleMovieSave(mid);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (res.is_saved) next.add(mid);
        else next.delete(mid);
        return next;
      });
      // Refresh full library in background
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error toggling save:', err);
      return { error: err.message };
    }
  };

  const setRating = async (movieId, score) => {
    if (!isAuthenticated) return { error: 'Please sign in to rate movies' };
    const mid = Number(movieId);
    try {
      const res = await apiRateMovie(mid, score);
      setRatingsMap((prev) => {
        const next = { ...prev };
        if (res.rating) next[mid] = res.rating;
        else delete next[mid];
        return next;
      });
      // Refresh full library in background to update collaborative matrix
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error setting rating:', err);
      return { error: err.message };
    }
  };

  return (
    <InteractionContext.Provider
      value={{
        likedIds,
        savedIds,
        ratingsMap,
        libraryData,
        loadingLibrary,
        isLiked,
        isSaved,
        getRating,
        toggleLike,
        toggleSave,
        setRating,
        refreshLibrary: fetchLibrary,
        likesCount: likedIds.size,
        savedCount: savedIds.size,
        ratedCount: Object.keys(ratingsMap).length,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
};

export const useInteractions = () => {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteractions must be used within an InteractionProvider');
  }
  return context;
};

export default InteractionContext;
