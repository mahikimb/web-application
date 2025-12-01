import React from 'react';
import './Team.css';

// Import team member images from assets folder
const teamImages = {
  'joseph-mwaka': null,
  'lucas-mahikimba': null
};

// Try to import Joseph's image
try {
  teamImages['joseph-mwaka'] = require('../assets/images/team/joseph.jpeg');
} catch (e) {
  try {
    teamImages['joseph-mwaka'] = require('../assets/images/team/joseph.jpg');
  } catch (e2) {
    teamImages['joseph-mwaka'] = null;
  }
}

// Try to import Lucas's image
try {
  teamImages['lucas-mahikimba'] = require('../assets/images/team/lucas.png');
} catch (e) {
  teamImages['lucas-mahikimba'] = null;
}

// Helper function to get team member image
const getTeamImage = (imageName) => {
  return teamImages[imageName] || null;
};

// Team Member Card Component
const TeamMemberCard = ({ member }) => {
  const memberImage = getTeamImage(member.imageName);

  return (
    <div className="team-card">
      <div className="team-image">
        {memberImage ? (
          <img 
            src={memberImage} 
            alt={member.name}
            className="team-photo"
          />
        ) : (
          <span className="team-emoji">{member.fallbackEmoji}</span>
        )}
      </div>
      <h3 className="team-name">{member.name}</h3>
      <p className="team-role">{member.role}</p>
      <p className="team-bio">{member.bio}</p>
    </div>
  );
};

const Team = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'Lucas Lucas',
      role: 'Chief Technology Officer',
      bio: 'Expert in software architecture and cloud solutions with over 15 years of experience.',
      imageName: 'Lucas Lucas',
      fallbackEmoji: '👩‍💼'
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Lead Developer',
      bio: 'Full-stack developer specializing in React, Node.js, and modern web technologies.',
      imageName: 'michael-chen',
      fallbackEmoji: '👨‍💻'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      role: 'AI/ML Engineer',
      bio: 'Machine learning specialist focused on building intelligent systems and data analytics.',
      imageName: 'emily-rodriguez',
      fallbackEmoji: '👩‍🔬'
    },
    {
      id: 4,
      name: 'James wa pwani',
      role: 'UX/UI Designer',
      bio: 'Creative designer passionate about creating intuitive and beautiful user experiences.',
      imageName: 'James wa pwani',
      fallbackEmoji: '👨‍🎨'
    },
    {
      id: 5,
      name: 'Joseph Mwaka',
      role: 'Mobile App Developer',
      bio: 'Expert in developing cross-platform mobile applications using React Native and Flutter, delivering seamless user experiences.',
      imageName: 'joseph-mwaka',
      fallbackEmoji: '👨‍💻'
    },
    {
      id: 6,
      name: 'Lucas Mahikimba',
      role: 'Web App Developer',
      bio: 'Specialized in building responsive web applications with modern frameworks, ensuring optimal performance and user engagement.',
      imageName: 'lucas-mahikimba',
      fallbackEmoji: '👨‍💻'
    }
  ];

  return (
    <section id="team" className="team">
      <div className="container">
        <h2 className="section-title">Our Team</h2>
        <p className="section-subtitle">Meet the talented professionals behind Softica Labs</p>
        <div className="team-grid">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Team;

