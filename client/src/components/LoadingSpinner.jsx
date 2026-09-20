import React from 'react';

const LoadingSpinner = ({ text = 'Loading movies...' }) => {
  return (
    <div className="spinner-container flex-column">
      <div className="netflix-spinner mb-3" />
      <span className="text-secondary" style={{ fontSize: '0.9rem' }}>{text}</span>
    </div>
  );
};

export default LoadingSpinner;
