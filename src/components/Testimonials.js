import React from 'react';
import './Testimonials.css';

const Testimonials = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Robert Martinez',
      company: 'TechCorp Inc.',
      text: 'Softica Labs transformed our business operations with their innovative software solution. The team was professional, responsive, and delivered exactly what we needed.',
      rating: 5
    },
    {
      id: 2,
      name: 'Jennifer Lee',
      company: 'HealthPlus Systems',
      text: 'Working with Softica Labs was a game-changer. Their AI-powered analytics platform helped us make data-driven decisions and improve our efficiency significantly.',
      rating: 5
    },
    {
      id: 3,
      name: 'Mark Thompson',
      company: 'Global Retail Solutions',
      text: 'The mobile application developed by Softica Labs exceeded our expectations. It\'s user-friendly, fast, and has received excellent feedback from our customers.',
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="testimonials">
      <div className="container">
        <h2 className="section-title">What Our Clients Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-rating">
                {'★'.repeat(testimonial.rating)}
              </div>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-author">
                <p className="testimonial-name">{testimonial.name}</p>
                <p className="testimonial-company">{testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

