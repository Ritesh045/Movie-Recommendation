import React, { useState, useEffect } from 'react';
import { X, Play, Volume2, Sparkles, Film } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !movie) return;

    setLoading(true);
    const cleanTitle = (movie.clean_title || movie.title || '').toLowerCase().trim();

    // 1. Check known dictionary
    let foundKey = null;
    for (const [key, vId] of Object.entries(KNOWN_YOUTUBE_VIDEOS)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        foundKey = vId;
        break;
      }
    }

    if (foundKey) {
      setYoutubeKey(foundKey);
      setLoading(false);
    } else {
      // Default fallback trailer
      setYoutubeKey('YoHD9XEInc0'); // Inception trailer fallback
      setLoading(false);
    }
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  const title = movie.clean_title || movie.title || 'Movie Stream';

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 p-md-5"
      style={{
        zIndex: 10500,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
      }}
      onClick={onClose}
    >
      <div 
        className="position-relative w-100 rounded-4 overflow-hidden shadow-lg border border-secondary border-opacity-25"
        style={{
          maxWidth: '1000px',
          backgroundColor: '#111319',
          boxShadow: '0 25px 50px -12px rgba(229, 9, 20, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom border-secondary border-opacity-25 bg-dark">
          <div className="d-flex align-items-center gap-2 text-white">
            <Film size={20} className="text-danger" />
            <h5 className="mb-0 fw-bold">{title} — Live HD Watch & Trailer</h5>
            <span className="badge bg-danger ms-2 px-2 py-1" style={{ fontSize: '0.72rem' }}>
              <Sparkles size={12} className="me-1" />
              LIVE STREAM
            </span>
          </div>
          <button 
            className="btn btn-outline-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px' }}
            onClick={onClose}
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Player */}
        <div className="ratio ratio-16x9 bg-black position-relative">
          {youtubeKey ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`}
              title={`${title} Live Stream`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-100 h-100 border-0"
            />
          ) : (
            <div className="d-flex align-items-center justify-content-center text-white">
              <span>Loading video stream...</span>
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="p-3 px-4 d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 bg-dark border-top border-secondary border-opacity-25">
          <div className="text-secondary small d-flex align-items-center gap-2">
            <Volume2 size={16} className="text-danger" />
            <span>HD 1080p Surround Sound • CineSphere Streaming Engine</span>
          </div>
          <button 
            className="btn btn-danger btn-sm px-4 fw-bold rounded-3"
            onClick={onClose}
          >
            Close Player
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
