import React from 'react';
import './Logo.css';

// Import logo from assets folder
let logoImage = null;
try {
  logoImage = require('../assets/images/logo/Logo.png');
} catch (e) {
  try {
    logoImage = require('../assets/images/logo/logo.png');
  } catch (e2) {
    logoImage = null;
  }
}

const Logo = ({ className = '', showText = true, size = 'medium' }) => {
  return (
    <div className={`logo-container ${className} ${size}`}>
      {logoImage ? (
        <img 
          src={logoImage} 
          alt="Softica Labs Logo" 
          className="logo-icon logo-image"
          style={{ display: 'block' }}
        />
      ) : (
        <svg 
          className="logo-icon" 
          viewBox="0 0 120 120" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagon outline */}
          <path
            d="M 60 15 L 105 35 L 105 75 L 60 105 L 15 75 L 15 35 Z"
            fill="none"
            stroke="#0F3D91"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* S shape inside hexagon - integrated with hexagon outline */}
          <path
            d="M 25 55 Q 30 45, 40 45 Q 50 45, 55 50 Q 60 55, 55 60 Q 50 65, 40 65 Q 30 65, 25 75"
            fill="none"
            stroke="#0F3D91"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dot above hexagon */}
          <circle
            cx="100"
            cy="28"
            r="5"
            fill="#0F3D91"
          />
          {/* Curved line connecting dot to hexagon top-right corner */}
          <path
            d="M 100 28 Q 102.5 30, 105 35"
            fill="none"
            stroke="#0F3D91"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      {showText && (
        <div className="logo-text">
          <span className="logo-text-softica">SOFTICA</span>
          <span className="logo-text-labs">LABS</span>
        </div>
      )}
    </div>
  );
};

export default Logo;

