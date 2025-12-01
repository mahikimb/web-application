import React, { useState, useEffect } from 'react';
import './Hero.css';
import Logo from './Logo';

const AnimatedText = ({ text, className }) => {
  const words = text.split(' ');
  const [visibleWords, setVisibleWords] = useState(0);
  const [isShowing, setIsShowing] = useState(true);

  useEffect(() => {
    let timer;
    
    if (isShowing) {
      // Showing words one by one
      if (visibleWords < words.length) {
        timer = setTimeout(() => {
          setVisibleWords(visibleWords + 1);
        }, 400); // Delay between each word appearing
      } else {
        // All words shown, wait then start hiding
        timer = setTimeout(() => {
          setIsShowing(false);
        }, 2000); // Show all words for 2 seconds
      }
    } else {
      // Hiding words one by one
      if (visibleWords > 0) {
        timer = setTimeout(() => {
          setVisibleWords(visibleWords - 1);
        }, 300); // Delay between each word disappearing
      } else {
        // All words hidden, start showing again
        timer = setTimeout(() => {
          setIsShowing(true);
        }, 500); // Brief pause before restarting
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visibleWords, isShowing, words.length]);

  return (
    <p className={className}>
      {words.map((word, index) => (
        <span
          key={index}
          className={`animated-word ${
            index < visibleWords ? 'visible' : 'hidden'
          }`}
        >
          {word}
          {index < words.length - 1 && '\u00A0'}
        </span>
      ))}
    </p>
  );
};

const Hero = ({ onContactClick }) => {
  return (
    <section id="home" className="hero">
      <div className="hero-background"></div>
      <div className="hero-content">
        <div className="hero-logo">
          <Logo size="large" showText={false} />
        </div>
        <AnimatedText 
          text="Innovative Digital Solutions" 
          className="hero-tagline"
        />
        <p className="hero-description">
          Transforming ideas into powerful digital experiences through cutting-edge technology
        </p>
        <button className="hero-cta" onClick={onContactClick}>
          Get Started
        </button>
      </div>
    </section>
  );
};

export default Hero;

