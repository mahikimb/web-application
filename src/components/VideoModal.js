import React, { useEffect } from 'react';
import './VideoModal.css';

const VideoModal = ({ isOpen, onClose, video }) => {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !video) return null;

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="video-modal-close" onClick={onClose} aria-label="Close video">
          ×
        </button>
        <div className="video-modal-header">
          <h2 className="video-modal-title">{video.title}</h2>
          <p className="video-modal-description">
            {video.videoDescription || video.description}
          </p>
        </div>
        <div className="video-modal-player">
          {video.videoUrl ? (
            <iframe
              src={video.videoUrl}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="video-iframe"
            ></iframe>
          ) : (
            <div className="video-placeholder">
              <p>Video coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoModal;

