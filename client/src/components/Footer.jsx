import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Globe, 
  ChevronDown 
} from 'lucide-react';

const Footer = () => {
  const [language, setLanguage] = useState('English');

  return (
    <footer className="netflix-footer">
      <div className="netflix-footer-container">
        
        {/* Social Icons Row */}
        <div className="netflix-footer-socials">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
            <Facebook size={24} color="#ffffff" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
            <Instagram size={24} color="#ffffff" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
            <Twitter size={24} color="#ffffff" />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
            <Youtube size={24} color="#ffffff" />
          </a>
        </div>

        {/* 4-Column Netflix Links Grid */}
        <div className="netflix-footer-grid">
          <div className="netflix-footer-col">
            <a href="#faq">FAQ</a>
            <Link to="/search">Explore Library</Link>
            <Link to="/">Investor Relations</Link>
            <a href="#privacy">Privacy & Cookie Preferences</a>
            <a href="#speed">Speed Test (&lt;15ms Latency)</a>
          </div>

          <div className="netflix-footer-col">
            <a href="#help">Help Center</a>
            <a href="#jobs">Jobs & Careers</a>
            <a href="#terms">Terms of Use</a>
            <a href="#legal">Legal Notices</a>
            <a href="#only-on-cinesphere">Only on CineSphere</a>
          </div>

          <div className="netflix-footer-col">
            <Link to="/">Account</Link>
            <a href="#ways-to-watch">Ways to Watch</a>
            <a href="#corporate">Corporate Information</a>
            <a href="#recommendations">Hybrid ML Engine Specs</a>
            <a href="#model">SVD & TF-IDF Models</a>
          </div>

          <div className="netflix-footer-col">
            <a href="#media">Media Center</a>
            <a href="#contact">Contact Us</a>
            <a href="#api">Flask REST API Docs</a>
            <a href="#dataset">MovieLens 100K Dataset</a>
            <a href="#tmdb">TMDB Poster API</a>
          </div>
        </div>

        {/* Language Selector Dropdown */}
        <div className="netflix-footer-lang-container">
          <div className="netflix-lang-picker">
            <Globe size={16} className="lang-globe-icon" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              className="lang-select-input"
            >
              <option value="English">English</option>
              <option value="Hindi">हिन्दी</option>
              <option value="Spanish">Español</option>
              <option value="French">Français</option>
            </select>
            <ChevronDown size={14} className="lang-arrow-icon" />
          </div>
        </div>

        {/* Service Code Button */}
        <div className="netflix-footer-service-code">
          <button className="service-code-btn">Service Code: 804-921-CS</button>
        </div>

        {/* Netflix Copyright & Info */}
        <div className="netflix-footer-copyright">
          <p className="copyright-title">CineSphere AI — Hybrid Movie Recommendation System</p>
          <p className="copyright-sub">
            Movie metadata sourced from MovieLens 100k (GroupLens Research). Posters and backdrop media provided by TMDB REST API.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;


