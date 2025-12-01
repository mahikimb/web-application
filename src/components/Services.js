import React from 'react';
import './Services.css';

const Services = () => {
  const services = [
    {
      icon: '💻',
      title: 'Software Development',
      description: 'Custom software solutions tailored to your business needs, built with modern technologies and best practices.'
    },
    {
      icon: '📱',
      title: 'Web and Mobile Applications',
      description: 'Responsive web applications and native mobile apps that provide seamless user experiences across all devices.'
    },
    {
      icon: '🤖',
      title: 'Machine Learning & AI Solutions',
      description: 'Intelligent systems powered by machine learning and artificial intelligence to automate processes and gain insights.'
    },
    {
      icon: '📊',
      title: 'Data Analysis & Consulting',
      description: 'Expert data analysis and strategic consulting to help you make informed decisions and optimize your operations.'
    }
  ];

  return (
    <section id="services" className="services">
      <div className="container">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

