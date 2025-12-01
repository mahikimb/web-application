import React, { useState } from 'react';
import './Portfolio.css';
import VideoModal from './VideoModal';

const Portfolio = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const projects = [
    {
      id: 1,
      title: 'E-Commerce Platform',
      description: 'A full-featured e-commerce solution with payment integration, inventory management, and analytics dashboard.',
      image: '🛒',
      videoUrl: '', // Add YouTube/Vimeo embed URL here (e.g., 'https://www.youtube.com/embed/VIDEO_ID')
      videoDescription: 'Watch how we built a comprehensive e-commerce platform with seamless payment processing and real-time inventory management.'
    },
    {
      id: 2,
      title: 'Healthcare Management System',
      description: 'Comprehensive healthcare platform for patient records, appointments, and telemedicine capabilities.',
      image: '🏥',
      videoUrl: '', // Add video URL here
      videoDescription: 'Explore our healthcare management system that streamlines patient care and improves medical workflow efficiency.'
    },
    {
      id: 3,
      title: 'AI-Powered Analytics Dashboard',
      description: 'Real-time business intelligence dashboard with predictive analytics and machine learning insights.',
      image: '📈',
      videoUrl: '', // Add video URL here
      videoDescription: 'Discover how our AI-powered analytics dashboard transforms data into actionable business insights.'
    },
    {
      id: 4,
      title: 'Mobile Banking App',
      description: 'Secure mobile banking application with biometric authentication and real-time transaction processing.',
      image: '💳',
      videoUrl: '', // Add video URL here
      videoDescription: 'See our secure mobile banking solution with advanced security features and intuitive user experience.'
    },
    {
      id: 5,
      title: 'Learning Management System',
      description: 'Interactive online learning platform with video streaming, assessments, and progress tracking.',
      image: '🎓',
      videoUrl: '', // Add video URL here
      videoDescription: 'Learn about our comprehensive learning management system designed for modern education and training.'
    },
    {
      id: 6,
      title: 'Supply Chain Optimization',
      description: 'AI-driven supply chain management system with demand forecasting and logistics optimization.',
      image: '🚚',
      videoUrl: '', // Add video URL here
      videoDescription: 'Watch how our AI-driven solution optimizes supply chain operations and reduces operational costs.'
    }
  ];

  const handleProjectClick = (project) => {
    setSelectedVideo(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
  };

  return (
    <>
      <section id="portfolio" className="portfolio">
        <div className="container">
          <h2 className="section-title">Our Portfolio</h2>
          <p className="section-subtitle">Explore some of our recent projects and success stories</p>
          <div className="portfolio-grid">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="portfolio-card"
                onClick={() => handleProjectClick(project)}
              >
                <div className="portfolio-image">{project.image}</div>
                <div className="portfolio-content">
                  <h3 className="portfolio-title">{project.title}</h3>
                  <p className="portfolio-description">{project.description}</p>
                  <button className="portfolio-video-btn">
                    Watch Video
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <VideoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        video={selectedVideo}
      />
    </>
  );
};

export default Portfolio;

