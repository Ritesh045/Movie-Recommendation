import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserLibrary, toggleMovieLike, toggleMovieDislike, toggleMovieSave, rateMovie as apiRateMovie } from '../api';

const InteractionContext = createContext(null);

export const InteractionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState(new Set());
  const [dislikedIds, setDislikedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [ratingsMap, setRatingsMap] = useState({});
  const [libraryData, setLibraryData] = useState({
    liked_movies: [],
    disliked_movies: [],
    saved_movies: [],
    wishlist_movies: [],
    rated_movies: [],
  });
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Refresh user interactions library from server
  const fetchLibrary = useCallback(async () => {
    if (!isAuthenticated) {
      setLikedIds(new Set());
      setDislikedIds(new Set());
      setSavedIds(new Set());
      setRatingsMap({});
      setLibraryData({ liked_movies: [], disliked_movies: [], saved_movies: [], wishlist_movies: [], rated_movies: [] });
      return;
    }

    try {
      setLoadingLibrary(true);
      const data = await getUserLibrary();
      if (data) {
        setLikedIds(new Set(data.liked_ids || []));
        setDislikedIds(new Set(data.disliked_ids || []));
        setSavedIds(new Set(data.saved_ids || data.wishlist_ids || []));
        setRatingsMap(data.ratings_map || {});
        setLibraryData({
          liked_movies: data.liked_movies || [],
          disliked_movies: data.disliked_movies || [],
          saved_movies: data.saved_movies || data.wishlist_movies || [],
          wishlist_movies: data.wishlist_movies || data.saved_movies || [],
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
  const isDisliked = useCallback((movieId) => dislikedIds.has(Number(movieId)), [dislikedIds]);
  const isSaved = useCallback((movieId) => savedIds.has(Number(movieId)), [savedIds]);
  const isInWishlist = isSaved;
  const getRating = useCallback((movieId) => {
    const num = Number(movieId);
    return ratingsMap[num] ?? ratingsMap[String(num)] ?? ratingsMap[String(movieId)] ?? null;
  }, [ratingsMap]);

  // YouTube-style Like: clears Dislike if active
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
      // Clear dislike locally if liked
      if (res.is_liked) {
        setDislikedIds((prev) => {
          const next = new Set(prev);
          next.delete(mid);
          return next;
        });
      }
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error toggling like:', err);
      return { error: err.message };
    }
  };

  // YouTube-style Dislike: clears Like if active
  const toggleDislike = async (movieId) => {
    if (!isAuthenticated) return { error: 'Please sign in to dislike movies' };
    const mid = Number(movieId);
    try {
      const res = await toggleMovieDislike(mid);
      setDislikedIds((prev) => {
        const next = new Set(prev);
        if (res.is_disliked) next.add(mid);
        else next.delete(mid);
        return next;
      });
      // Clear like locally if disliked
      if (res.is_disliked) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(mid);
          return next;
        });
      }
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error toggling dislike:', err);
      return { error: err.message };
    }
  };

  const toggleSave = async (movieId) => {
    if (!isAuthenticated) return { error: 'Please sign in to add movies to Wishlist' };
    const mid = Number(movieId);
    try {
      const res = await toggleMovieSave(mid);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (res.is_saved) next.add(mid);
        else next.delete(mid);
        return next;
      });
      fetchLibrary();
      return res;
    } catch (err) {
      console.error('Error toggling wishlist/save:', err);
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
        dislikedIds,
        savedIds,
        wishlistIds: savedIds,
        ratingsMap,
        libraryData,
        loadingLibrary,
        isLiked,
        isDisliked,
        isSaved,
        isInWishlist,
        getRating,
        toggleLike,
        toggleDislike,
        toggleSave,
        toggleWishlist: toggleSave,
        setRating,
        refreshLibrary: fetchLibrary,
        likesCount: likedIds.size,
        dislikesCount: dislikedIds.size,
        savedCount: savedIds.size,
        wishlistCount: savedIds.size,
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
