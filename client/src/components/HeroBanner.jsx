import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const formatTitle = (title) => {
  if (!title) return '';
  let clean = title.trim();
  if (clean.endsWith(', The')) return `The ${clean.slice(0, -5)}`;
  if (clean.endsWith(', A')) return `A ${clean.slice(0, -3)}`;
  if (clean.endsWith(', An')) return `An ${clean.slice(0, -4)}`;
  return clean;
};

const HeroBanner = ({ movie, movies = [] }) => {
  const movieList = movies && movies.length > 0 ? movies.slice(0, 7) : (movie ? [movie] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (movieList.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movieList.length);
    }, 4000); // Advance to next movie every 4 seconds

    return () => clearInterval(timer);
  }, [movieList.length, isPaused, currentIndex]);

  if (movieList.length === 0) return null;

  const currentMovie = movieList[currentIndex] || movieList[0];
  const genresStr = Array.isArray(currentMovie.genres) ? currentMovie.genres.join(' • ') : currentMovie.genres;
  const ratingStr = currentMovie.avg_rating ? `${currentMovie.avg_rating.toFixed(1)} ★` : 'N/A';
  const displayTitle = formatTitle(currentMovie.clean_title || currentMovie.title);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + movieList.length) % movieList.length);
    setAnimKey(Date.now());
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movieList.length);
    setAnimKey(Date.now());
  };

  const handleDotClick = (idx) => {
    setCurrentIndex(idx);
    setAnimKey(Date.now());
  };

  return (
    <div
      key={`banner-${currentIndex}`}
      className="hero-banner hero-slide-fade"
      style={{
        backgroundImage: `url("${currentMovie.poster_url}")`,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="hero-gradient-overlay" />
      
      {/* Navigation Arrows for Slider */}
      {movieList.length > 1 && (
        <>
          <button 
            className="hero-slider-btn prev" 
            onClick={handlePrev} 
            aria-label="Previous Slide"
          >
            <ChevronLeft size={28} />
          </button>
          <button 
            className="hero-slider-btn next" 
            onClick={handleNext} 
            aria-label="Next Slide"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <div key={`content-${animKey}`} className="hero-content hero-content-slide">
        <h1 className="hero-title">{displayTitle}</h1>
        <div className="hero-metadata">
          <span className="badge-rating">
            <Star size={16} fill="#ffd700" color="#ffd700" className="me-1" />
            {ratingStr}
          </span>
          <span className="text-secondary">{currentMovie.year_display}</span>
          <span className="text-secondary">•</span>
          <span className="text-secondary">{genresStr}</span>
        </div>
        <p className="hero-overview">
          {currentMovie.corpus || `Experience '${displayTitle}' — a top-rated fan favorite featuring exceptional story and direction.`}
        </p>
        <div className="d-flex align-items-center mt-3">
          <Link to={`/movie/${currentMovie.movieId}`} className="btn-hero-play">
            <Play size={20} fill="#000000" />
            Watch Now
          </Link>
          <Link to={`/movie/${currentMovie.movieId}`} className="btn-hero-info">
            <Info size={20} />
            More Info & Recommendations
          </Link>
        </div>
      </div>

      {/* Slide Indicators / Dots */}
      {movieList.length > 1 && (
        <div className="hero-dots-container">
          {movieList.map((_, idx) => (
            <button
              key={idx}
              className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroBanner;

