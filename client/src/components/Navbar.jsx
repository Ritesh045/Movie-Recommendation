import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film, Search, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    navigate('/');
  };

  return (
    <nav className={`navbar-cinesphere ${isScrolled ? 'scrolled' : ''}`}>
      <div className="d-flex align-items-center justify-content-between w-100">
        <div className="d-flex align-items-center">
          <Link to="/" className="brand-logo">
            <Film size={28} color="#e50914" />
            CineSphere
          </Link>
          <div className="d-none d-md-flex align-items-center ms-4">
            <Link to="/" className={`nav-link-custom ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/trending" className={`nav-link-custom ${location.pathname === '/trending' ? 'active' : ''}`}>
              🔥 Trending
            </Link>
            <Link to="/search" className={`nav-link-custom ${location.pathname === '/search' ? 'active' : ''}`}>
              Explore & Search
            </Link>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Titles, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {isAuthenticated ? (
            <div className="position-relative">
              <button
                className="btn btn-sm d-flex align-items-center gap-2 text-light rounded-pill px-3 py-1 border border-secondary border-opacity-25"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', cursor: 'pointer' }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div
                  className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: '26px', height: '26px', fontSize: '0.8rem' }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{user?.name?.split(' ')[0] || 'Account'}</span>
              </button>

              {showDropdown && (
                <div
                  className="position-absolute end-0 mt-2 py-2 bg-dark rounded-3 border border-secondary border-opacity-25 shadow-lg"
                  style={{ width: '200px', zIndex: 1100 }}
                >
                  <div className="px-3 py-2 border-bottom border-secondary border-opacity-10">
                    <p className="mb-0 text-light fw-bold" style={{ fontSize: '0.85rem' }}>{user?.name}</p>
                    <p className="mb-0 text-secondary" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                  </div>
                  <button
                    className="w-100 text-start btn text-danger text-decoration-none px-3 py-2 d-flex align-items-center gap-2 border-0"
                    style={{ fontSize: '0.85rem' }}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <Link
                to="/login"
                className="btn btn-outline-light btn-sm fw-semibold px-3 py-1-5 rounded-2"
                style={{ fontSize: '0.85rem', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="btn btn-danger btn-sm fw-bold px-3 py-1-5 d-flex align-items-center gap-1 rounded-2 shadow-sm"
                style={{ backgroundColor: '#e50914', borderColor: '#e50914', fontSize: '0.85rem' }}
              >
                <LogIn size={15} />
                <span>Create Account</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

