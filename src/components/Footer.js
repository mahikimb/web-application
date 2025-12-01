import React from 'react';
import './Footer.css';
import Logo from './Logo';

const Footer = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <Logo size="medium" showText={true} />
            </div>
            <p className="footer-tagline">Innovative Digital Solutions</p>
            <p className="footer-description">
              Transforming businesses through cutting-edge technology and innovative solutions.
            </p>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <button onClick={() => scrollToSection('home')}>Home</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('about')}>About</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('services')}>Services</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('portfolio')}>Portfolio</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('team')}>Team</button>
              </li>
              <li>
                <button onClick={() => scrollToSection('contact')}>Contact</button>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Services</h4>
            <ul className="footer-links">
              <li>Software Development</li>
              <li>Web & Mobile Apps</li>
              <li>AI & ML Solutions</li>
              <li>Data Analysis</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4 className="footer-title">Contact</h4>
            <ul className="footer-contact">
              <li>📧 info@softicalabs.com</li>
              <li>📞 +1 (234) 567-890</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Softica Labs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

