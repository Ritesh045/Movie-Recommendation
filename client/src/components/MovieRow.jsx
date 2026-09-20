import React, { useRef } from 'react';
import MovieCard from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MovieRow = ({ title, movies = [], mode = 'hybrid', isTop10 = false }) => {
  const rowRef = useRef(null);

  const handleScroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? scrollLeft - clientWidth * 0.75 : scrollLeft + clientWidth * 0.75;
      rowRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className={`movie-row ${isTop10 ? 'top10-row' : ''}`}>
      <h2 className="row-title">{title}</h2>
      <div className="row-carousel-wrapper">
        <button
          className="carousel-nav-btn left"
          onClick={() => handleScroll('left')}
          aria-label="Scroll Left"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="row-carousel" ref={rowRef}>
          {movies.map((movie, index) => (
            <MovieCard 
              key={movie.movieId} 
              movie={movie} 
              mode={mode} 
              rank={isTop10 ? index + 1 : null}
            />
          ))}
        </div>

        <button
          className="carousel-nav-btn right"
          onClick={() => handleScroll('right')}
          aria-label="Scroll Right"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default MovieRow;
