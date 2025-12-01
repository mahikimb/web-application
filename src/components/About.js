import React from 'react';
import './About.css';

const About = () => {
  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">About Us</h2>
        <div className="about-content">
          <div className="about-text">
            <p className="about-description">
              Softica Labs is a forward-thinking digital solutions company dedicated to 
              transforming businesses through innovative technology. We combine technical 
              expertise with creative problem-solving to deliver solutions that drive 
              real results.
            </p>
          </div>
          <div className="about-mission-vision">
            <div className="mission-vision-card">
              <h3>Our Mission</h3>
              <p>
                To empower businesses with cutting-edge digital solutions that enhance 
                productivity, streamline operations, and unlock new opportunities for growth.
              </p>
            </div>
            <div className="mission-vision-card">
              <h3>Our Vision</h3>
              <p>
                To be the leading partner for organizations seeking to leverage technology 
                for competitive advantage and sustainable success in the digital age.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

