import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchMovies } from '../api';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q.trim()) {
      fetchSearchResults(q.trim());
    } else {
      setResults([]);
    }
  }, [searchParams]);

  const fetchSearchResults = async (searchQuery) => {
    try {
      setLoading(true);
      const data = await searchMovies(searchQuery, 24);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newQ = e.target.value;
    setQuery(newQ);
    if (newQ.trim()) {
      setSearchParams({ q: newQ });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="container" style={{ paddingTop: '110px', minHeight: '80vh' }}>
      <div className="row justify-content-center mb-4">
        <div className="col-md-8 col-lg-6">
          <div className="position-relative">
            <SearchIcon className="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" size={20} />
            <input
              type="text"
              className="form-control form-control-lg bg-dark text-white border-secondary ps-5"
              placeholder="Search by title, genre, keyword..."
              value={query}
              onChange={handleInputChange}
              autoFocus
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text={`Searching for "${query}"...`} />
      ) : results.length > 0 ? (
        <div>
          <h4 className="text-secondary mb-4">
            Search Results for <span className="text-white">"{query}"</span> ({results.length} matches)
          </h4>
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-4">
            {results.map((movie) => (
              <div className="col" key={movie.movieId}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        </div>
      ) : query.trim() ? (
        <div className="text-center py-5 text-secondary">
          <h3>No movies found matching "{query}"</h3>
          <p>Try searching for popular titles like "Toy Story", "Matrix", "Jurassic", or "Batman".</p>
        </div>
      ) : (
        <div className="text-center py-5 text-secondary">
          <h3>Start typing to search CineSphere</h3>
          <p>Explore thousands of movies powered by our hybrid recommendation engine.</p>
        </div>
      )}
    </div>
  );
};

export default Search;
