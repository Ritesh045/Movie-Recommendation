import React from 'react';
import { Sliders, Cpu, Users, Sparkles } from 'lucide-react';

const RecommendationModeToggle = ({ mode, onModeChange, contentWeight, onWeightChange }) => {
  return (
    <div className="d-flex flex-column align-items-start my-4">
      <div className="d-flex align-items-center mb-2">
        <Sliders size={18} className="me-2 text-danger" />
        <span className="fw-bold text-light">Recommendation Mode:</span>
      </div>

      <div className="mode-toggle-container">
        <button
          className={`mode-toggle-btn ${mode === 'hybrid' ? 'active' : ''}`}
          onClick={() => onModeChange('hybrid')}
        >
          <Sparkles size={16} className="me-1" />
          Hybrid Engine (Recommended)
        </button>

        <button
          className={`mode-toggle-btn ${mode === 'content' ? 'active' : ''}`}
          onClick={() => onModeChange('content')}
        >
          <Cpu size={16} className="me-1" />
          Content-Based Only
        </button>

        <button
          className={`mode-toggle-btn ${mode === 'collaborative' ? 'active' : ''}`}
          onClick={() => onModeChange('collaborative')}
        >
          <Users size={16} className="me-1" />
          Collaborative Only
        </button>
      </div>

      {mode === 'hybrid' && onWeightChange && (
        <div className="mt-3 p-3 bg-dark border border-secondary border-opacity-25 rounded w-100 max-w-md">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: '0.85rem' }}>
            <span>Content Weight (α): {Math.round(contentWeight * 100)}%</span>
            <span>Collaborative Weight: {Math.round((1 - contentWeight) * 100)}%</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={contentWeight}
            onChange={(e) => onWeightChange(parseFloat(e.target.value))}
          />
        </div>
      )}
    </div>
  );
};

export default RecommendationModeToggle;
