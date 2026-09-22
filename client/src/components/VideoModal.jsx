import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, Sparkles, Film, Maximize2, Minimize2 } from 'lucide-react';

// Pre-configured HD trailer YouTube Video IDs for top popular titles
const KNOWN_YOUTUBE_VIDEOS = {
  'inception': 'YoHD9XEInc0',
  'toy story': 'v-PjgYDrg70',
  'dark knight': 'EXeTwQWrcwY',
  'goldeneye': 'lcOqUE0u14E',
  'shawshank redemption': 'PLl99DfY6VU',
  'interstellar': 'zSWdZVtXT7E',
  'heat': '0xbBLJ1WGwQ',
  'matrix': 'vKQi3bBA1y8',
  'fight club': 'qtRKDVy44WY',
  'pulp fiction': 's7EdQ4FqbhY',
  'forrest gump': 'bLvqoHBptjg',
  'godfather': 'UaVTIH8mujA',
  'jumanji': '2QKg5SZ_35I',
  'lion king': '4sj1MT05lAA',
  'avatar': '5PSNL1qE6VY',
  'gladiator': 'P5ieIbInFSU',
  'titanic': 'zCy5WQ9S4c0',
  'star wars': 'vZ734NWnAHA',
};

const VideoModal = ({ isOpen, onClose, movie }) => {
  const [youtubeKey, setYoutubeKey] = useState(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Lock background scrolling when watch mode is active
    document.body.style.overflow = 'hidden';

    // Handle Escape key to close player / return back
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !movie) return;

    const cleanTitle = (movie.clean_title || movie.title || '').toLowerCase().trim();

    let foundKey = null;
    for (const [key, vId] of Object.entries(KNOWN_YOUTUBE_VIDEOS)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        foundKey = vId;
        break;
      }
    }

    setYoutubeKey(foundKey || 'YoHD9XEInc0');
  }, [isOpen, movie]);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreenMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreenMode(false);
    }
  };

  if (!isOpen || !movie) return null;

  const title = movie.clean_title || movie.title || 'Movie Stream';

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 vh-100 d-flex flex-column bg-black text-white"
      style={{
        zIndex: 99999,
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Top Header Bar */}
      <div 
        className="d-flex align-items-center justify-content-between px-3 px-md-4 py-3 bg-dark bg-gradient border-bottom border-secondary border-opacity-25 shadow-lg"
        style={{ height: '64px', minHeight: '64px', zIndex: 10 }}
      >
        {/* Return Back Button */}
        <button 
          className="btn btn-outline-light d-flex align-items-center gap-2 fw-semibold px-3 py-2 rounded-3 shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            transition: 'all 0.2s ease',
          }}
          onClick={onClose}
          aria-label="Return Back"
        >
          <ArrowLeft size={20} className="text-danger" />
          <span>Return Back</span>
        </button>

        {/* Title Info */}
        <div className="d-flex align-items-center gap-2 text-truncate mx-2">
          <Film size={20} className="text-danger flex-shrink-0" />
          <h5 className="mb-0 fw-bold text-truncate" style={{ fontSize: '1.1rem' }}>
            {title}
          </h5>
          <span className="badge bg-danger d-none d-sm-inline-flex align-items-center gap-1 px-2 py-1 ms-2" style={{ fontSize: '0.75rem' }}>
            <Sparkles size={12} />
            LIVE HD STREAM
          </span>
        </div>

        {/* Right Controls */}
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm d-none d-md-flex align-items-center gap-1 text-light border-0"
            onClick={toggleBrowserFullscreen}
            title={isFullscreenMode ? "Exit Fullscreen Browser" : "Full Screen Browser"}
          >
            {isFullscreenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            className="btn btn-danger btn-sm d-flex align-items-center justify-content-center rounded-circle ms-1"
            style={{ width: '36px', height: '36px' }}
            onClick={onClose}
            title="Close Stream (Return Back)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Full Screen Video Container */}
      <div className="flex-grow-1 w-100 h-100 bg-black position-relative overflow-hidden">
        {youtubeKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0`}
            title={`${title} Live Stream`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-100 h-100 border-0"
          />
        ) : (
          <div className="d-flex align-items-center justify-content-center h-100 text-white-50">
            <div className="spinner-border text-danger me-2" role="status" />
            <span>Loading live video stream...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoModal;
