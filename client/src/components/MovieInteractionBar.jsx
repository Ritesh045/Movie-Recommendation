import React, { useState } from 'react';
import { Heart, Bookmark, Star, Sparkles, X, Check } from 'lucide-react';
import { useInteractions } from '../context/InteractionContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MovieInteractionBar = ({ movieId, onInteractionChange }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { isLiked, isSaved, getRating, toggleLike, toggleSave, setRating } = useInteractions();

  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mid = Number(movieId);
  const liked = isLiked(mid);
  const saved = isSaved(mid);
  const currentRating = getRating(mid);

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
    const res = await toggleLike(mid);
    setIsSubmitting(false);
    if (!res.error) {
      showToast(res.is_liked ? '❤️ Added to Liked! Content preferences boosted.' : 'Removed from Liked.');
      if (onInteractionChange) onInteractionChange();
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    const res = await toggleSave(mid);
    setIsSubmitting(false);
    if (!res.error) {
      showToast(res.is_saved ? '🔖 Saved to My List! Stored in your library.' : 'Removed from My List.');
      if (onInteractionChange) onInteractionChange();
    }
  };

  const handleRate = async (score) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    const res = await setRating(mid, score);
    setIsSubmitting(false);
    if (!res.error) {
      showToast(`⭐ Rated ${score}★! Collaborative matrix synchronized.`);
      if (onInteractionChange) onInteractionChange();
    }
  };

  const handleClearRating = async () => {
    if (!isAuthenticated) return;
    setIsSubmitting(true);
    await setRating(mid, 0.0);
    setIsSubmitting(false);
    showToast('Rating cleared.');
    if (onInteractionChange) onInteractionChange();
  };

  return (
    <div className="my-4 p-3 rounded-4 bg-dark bg-opacity-75 border border-secondary border-opacity-25 shadow-lg">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        
        {/* Left Side: Like & Save Buttons */}
        <div className="d-flex align-items-center gap-2">
          {/* Like Button */}
          <button
            type="button"
            className={`btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold transition-all ${
              liked 
                ? 'btn-danger shadow-sm' 
                : 'btn-outline-light border-opacity-25'
            }`}
            style={{ fontSize: '0.9rem' }}
            onClick={handleLike}
            disabled={isSubmitting}
            title={liked ? "Unlike this movie" : "Like this movie (Boosts content suggestions)"}
          >
            <Heart 
              size={18} 
              fill={liked ? "#ffffff" : "none"} 
              color={liked ? "#ffffff" : "#ff4d4f"} 
            />
            <span>{liked ? 'Liked' : 'Like'}</span>
          </button>

          {/* Save / My List Button */}
          <button
            type="button"
            className={`btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold transition-all ${
              saved 
                ? 'btn-warning text-dark fw-bold shadow-sm' 
                : 'btn-outline-light border-opacity-25'
            }`}
            style={{ fontSize: '0.9rem' }}
            onClick={handleSave}
            disabled={isSubmitting}
            title={saved ? "Remove from My List" : "Save to My List (Watchlist)"}
          >
            {saved ? (
              <Check size={18} strokeWidth={2.5} />
            ) : (
              <Bookmark size={18} />
            )}
            <span>{saved ? 'In My List' : '+ Add to List'}</span>
          </button>
        </div>

        {/* Right Side: Interactive Star Rating */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex flex-column align-items-end">
            <div className="d-flex align-items-center gap-1">
              <span className="text-secondary me-2 small fw-semibold">
                {currentRating ? `Your Rating: ${currentRating.toFixed(1)}★` : 'Rate:'}
              </span>
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isLit = hoverRating >= starVal || (!hoverRating && currentRating >= starVal);
                return (
                  <button
                    key={starVal}
                    type="button"
                    className="btn p-0 border-0 bg-transparent"
                    style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(starVal)}
                    title={`Rate ${starVal} Star${starVal > 1 ? 's' : ''}`}
                    aria-label={`Rate ${starVal} Stars`}
                  >
                    <Star
                      size={22}
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
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Dynamic Real-Time Feedback Pill */}
      {feedbackMsg && (
        <div 
          className="mt-3 py-1 px-3 rounded-pill bg-danger bg-opacity-25 border border-danger border-opacity-50 text-white small d-inline-flex align-items-center gap-2"
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
