import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ paddingTop: '140px', minHeight: '80vh', backgroundColor: '#141414' }}>
        <LoadingSpinner text="Verifying session credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to /login and remember attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
