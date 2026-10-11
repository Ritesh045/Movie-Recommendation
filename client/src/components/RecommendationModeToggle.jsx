import React, { useState, useEffect, useRef } from 'react';
import { Sliders, Cpu, Users, Sparkles } from 'lucide-react';

const RecommendationModeToggle = ({ mode, onModeChange, contentWeight, onWeightChange }) => {
  const [localWeight, setLocalWeight] = useState(contentWeight);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setLocalWeight(contentWeight);
  }, [contentWeight]);

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalWeight(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (onWeightChange) onWeightChange(val);
    }, 120);
  };

  return (
    <div className="d-flex flex-column align-items-start my-4">
      <div className="d-flex align-items-center mb-2">
        <Sliders size={18} className="me-2 text-danger" />
        <span className="fw-bold text-light">Recommendation Mode:</span>
      </div>

      <div className="mode-toggle-container">
        <button
          type="button"
          className={`mode-toggle-btn ${mode === 'hybrid' ? 'active' : ''}`}
          onClick={() => onModeChange('hybrid')}
        >
          <Sparkles size={16} className="me-1" />
          Hybrid Engine (Recommended)
        </button>

        <button
          type="button"
          className={`mode-toggle-btn ${mode === 'content' ? 'active' : ''}`}
          onClick={() => onModeChange('content')}
        >
          <Cpu size={16} className="me-1" />
          Content-Based Only
        </button>

        <button
          type="button"
          className={`mode-toggle-btn ${mode === 'collaborative' ? 'active' : ''}`}
          onClick={() => onModeChange('collaborative')}
        >
          <Users size={16} className="me-1" />
          Collaborative Only
        </button>
      </div>

      {mode === 'hybrid' && onWeightChange && (
        <div className="mt-3 p-3 bg-dark border border-secondary border-opacity-25 rounded w-100 max-w-md shadow-sm">
          <div className="d-flex justify-content-between text-secondary mb-1" style={{ fontSize: '0.85rem' }}>
            <span>Content Weight (α): {Math.round(localWeight * 100)}%</span>
            <span>Collaborative Weight: {Math.round((1 - localWeight) * 100)}%</span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={localWeight}
            onChange={handleSliderChange}
            aria-label="Adjust Content vs Collaborative Weight"
          />
        </div>
      )}
    </div>
  );
};

export default RecommendationModeToggle;
