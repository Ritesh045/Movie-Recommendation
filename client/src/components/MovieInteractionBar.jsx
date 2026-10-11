import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Bookmark, Star, Sparkles, X, Check } from 'lucide-react';
import { useInteractions } from '../context/InteractionContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getMovieInteraction, 
  toggleMovieLike, 
  toggleMovieDislike, 
  toggleMovieSave, 
  rateMovie as apiRateMovie 
} from '../api';

const MovieInteractionBar = ({ movieId, onInteractionChange }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { 
    isLiked: ctxIsLiked, 
    isDisliked: ctxIsDisliked, 
    isInWishlist: ctxIsInWishlist, 
    getRating: ctxGetRating, 
    toggleLike: ctxToggleLike, 
    toggleDislike: ctxToggleDislike, 
    toggleWishlist: ctxToggleWishlist, 
    setRating: ctxSetRating 
  } = useInteractions();

  const mid = Number(movieId);

  // Local states directly synchronized with server endpoint for persistence across refresh
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [currentRating, setCurrentRating] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);

  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load interaction status & public counts from backend on mount and whenever movieId/auth changes
  const loadInteractions = useCallback(async () => {
    if (!mid || isNaN(mid)) return;
    try {
      const data = await getMovieInteraction(mid);
      if (data) {
        setLikesCount(data.likes_count ?? 0);
        setDislikesCount(data.dislikes_count ?? 0);
        setLiked(Boolean(data.is_liked));
        setDisliked(Boolean(data.is_disliked));
        setInWishlist(Boolean(data.is_saved));
        setCurrentRating(data.user_rating !== null && data.user_rating !== undefined ? Number(data.user_rating) : null);
      }
    } catch (err) {
      // Fallback to context if endpoint has temporary network hiccup
      setLiked(ctxIsLiked(mid));
      setDisliked(ctxIsDisliked(mid));
      setInWishlist(ctxIsInWishlist(mid));
      const cr = ctxGetRating(mid);
      if (cr) setCurrentRating(Number(cr));
    }
  }, [mid, ctxIsLiked, ctxIsDisliked, ctxIsInWishlist, ctxGetRating]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions, isAuthenticated]);

  const showToast = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg('');
    }, 3500);
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await toggleMovieLike(mid);
      if (res) {
        setLiked(Boolean(res.is_liked));
        setDisliked(false);
        if (typeof res.likes_count === 'number') setLikesCount(res.likes_count);
        if (typeof res.dislikes_count === 'number') setDislikesCount(res.dislikes_count);
        showToast(res.is_liked ? '👍 Liked! Similar movie recommendations boosted.' : 'Removed from Liked.');
        ctxToggleLike(mid);
        if (onInteractionChange) onInteractionChange();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update like.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await toggleMovieDislike(mid);
      if (res) {
        setDisliked(Boolean(res.is_disliked));
        setLiked(false);
        if (typeof res.likes_count === 'number') setLikesCount(res.likes_count);
        if (typeof res.dislikes_count === 'number') setDislikesCount(res.dislikes_count);
        showToast(res.is_disliked ? '👎 Disliked. Similar movies penalized & suppressed.' : 'Removed from Disliked.');
        ctxToggleDislike(mid);
        if (onInteractionChange) onInteractionChange();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update dislike.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await toggleMovieSave(mid);
      if (res) {
        setInWishlist(Boolean(res.is_saved));
        showToast(res.is_saved ? '🔖 Added to Wishlist! View anytime in your Wishlist.' : 'Removed from Wishlist.');
        ctxToggleWishlist(mid);
        if (onInteractionChange) onInteractionChange();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update Wishlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRate = async (score) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    // Optimistic UI update
    setCurrentRating(score);
    try {
      const res = await apiRateMovie(mid, score);
      if (res) {
        setCurrentRating(res.rating ? Number(res.rating) : score);
        showToast(`⭐ Rated ${score}★! Saved per user & synchronized with collaborative ML.`);
        ctxSetRating(mid, score);
        if (onInteractionChange) onInteractionChange();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit rating.');
      // Revert if error
      loadInteractions();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearRating = async () => {
    if (!isAuthenticated) return;
    setIsSubmitting(true);
    setCurrentRating(null);
    try {
      await apiRateMovie(mid, 0.0);
      showToast('Rating cleared.');
      ctxSetRating(mid, 0.0);
      if (onInteractionChange) onInteractionChange();
    } catch (err) {
      showToast('Failed to clear rating.');
      loadInteractions();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-4 p-3 rounded-4 bg-dark bg-opacity-75 border border-secondary border-opacity-25 shadow-lg">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        
        {/* Left Side: YouTube-Style Like / Dislike Pill + Wishlist Button */}
        <div className="d-flex flex-wrap align-items-center gap-3">
          
          {/* YouTube-style Segmented Pill: [ 👍 Like {count} | 👎 Dislike {count} ] */}
          <div 
            className="d-inline-flex align-items-center rounded-pill p-1 border border-secondary border-opacity-30"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            role="group"
            aria-label="YouTube style Like or Dislike"
          >
            {/* Like Segment */}
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-1-5 rounded-pill border-0 transition-all ${
                liked 
                  ? 'btn-light text-dark fw-bold shadow-sm' 
                  : 'text-light text-opacity-85 hover-bg-light-10'
              }`}
              style={{ fontSize: '0.88rem' }}
              onClick={handleLike}
              disabled={isSubmitting}
              title={liked ? "Remove Like" : "Like (Boosts recommendations)"}
            >
              <ThumbsUp 
                size={17} 
                fill={liked ? "#111111" : "none"} 
                color={liked ? "#111111" : "currentColor"} 
              />
              <span className="fw-semibold">{liked ? 'Liked' : 'Like'}</span>
              <span className="ms-1 fw-bold opacity-75">{likesCount}</span>
            </button>

            {/* Vertical Segment Divider */}
            <div 
              style={{ 
                width: '1px', 
                height: '20px', 
                backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                margin: '0 4px' 
              }} 
            />

            {/* Dislike Segment */}
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-1-5 rounded-pill border-0 transition-all ${
                disliked 
                  ? 'btn-danger text-white fw-bold shadow-sm' 
                  : 'text-light text-opacity-85 hover-bg-light-10'
              }`}
              style={{ fontSize: '0.88rem' }}
              onClick={handleDislike}
              disabled={isSubmitting}
              title={disliked ? "Remove Dislike" : "Dislike (Suppresses & tunes down similar movies)"}
            >
              <ThumbsDown 
                size={17} 
                fill={disliked ? "#ffffff" : "none"} 
                color={disliked ? "#ffffff" : "currentColor"} 
              />
              <span className="fw-semibold">{disliked ? 'Disliked' : 'Dislike'}</span>
              <span className="ms-1 fw-bold opacity-75">{dislikesCount}</span>
            </button>
          </div>

          {/* Wishlist Button: Add to Wishlist / In Wishlist */}
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold transition-all ${
              inWishlist 
                ? 'btn-warning text-dark fw-bold shadow-sm' 
                : 'btn-outline-light border-opacity-30'
            }`}
            style={{ fontSize: '0.88rem' }}
            onClick={handleWishlist}
            disabled={isSubmitting}
            title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            {inWishlist ? (
              <Check size={17} strokeWidth={2.8} />
            ) : (
              <Bookmark size={17} />
            )}
            <span>{inWishlist ? 'In Wishlist' : '+ Add to Wishlist'}</span>
          </button>
        </div>

        {/* Right Side: Per-User 1 to 5 Star Rating Component */}
        <div className="d-flex align-items-center gap-2 px-3 py-1-5 rounded-pill border border-secondary border-opacity-25 bg-black bg-opacity-40">
          <span className="text-secondary small fw-semibold me-1">
            {currentRating ? `Your Rating: ${currentRating.toFixed(1)}★` : 'Rate:'}
          </span>
          <div className="d-flex align-items-center gap-1">
            {[1, 2, 3, 4, 5].map((starVal) => {
              const isLit = hoverRating >= starVal || (!hoverRating && currentRating >= starVal);
              return (
                <button
                  key={starVal}
                  type="button"
                  className="btn p-0 border-0 bg-transparent"
                  style={{ cursor: 'pointer', lineHeight: 1 }}
                  onMouseEnter={() => setHoverRating(starVal)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(starVal)}
                  title={`Rate ${starVal} Star${starVal > 1 ? 's' : ''}`}
                  aria-label={`Rate ${starVal} Stars`}
                  disabled={isSubmitting}
                >
                  <Star
                    size={20}
                    color={isLit ? '#ffd700' : '#6c757d'}
                    fill={isLit ? '#ffd700' : 'transparent'}
                    style={{
                      transform: hoverRating === starVal ? 'scale(1.25)' : 'scale(1)',
                      transition: 'transform 0.15s ease, color 0.15s ease'
                    }}
                  />
                </button>
              );
            })}

            {currentRating && (
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary p-0 ms-1 text-decoration-none"
                onClick={handleClearRating}
                title="Clear your rating"
                aria-label="Clear rating"
                disabled={isSubmitting}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Dynamic Real-Time Feedback Toast */}
      {feedbackMsg && (
        <div 
          className="mt-3 py-1-5 px-3 rounded-pill bg-danger bg-opacity-20 border border-danger border-opacity-40 text-white small d-inline-flex align-items-center gap-2"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <Sparkles size={14} className="text-warning flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MovieInteractionBar;
