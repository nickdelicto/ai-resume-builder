import React, { useState, useEffect, useRef } from 'react';
import Meta from '../components/common/Meta';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Script from 'next/script';
import StickyHeader from '../components/common/StickyHeader';

export default function ContactPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const recaptchaRef = useRef(null);
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const { status } = useSession();
  
  // Add contact-page class to body
  useEffect(() => {
    // Add class to body when component mounts
    document.body.classList.add('contact-page');
    
    // Remove class when component unmounts
    return () => {
      document.body.classList.remove('contact-page');
    };
  }, []);

  // Load reCAPTCHA manually
  useEffect(() => {
    // Check if reCAPTCHA is already loaded
    if (window.grecaptcha) {
      setRecaptchaLoaded(true);
      return;
    }

    // Create a unique ID for the recaptcha container
    const containerId = 'recaptcha-container-' + Date.now();
    recaptchaRef.current = containerId;
    
    // Function to initialize reCAPTCHA
    window.onRecaptchaLoad = () => {
      setRecaptchaLoaded(true);
      
      try {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'contact_form' })
            .then(token => {
              setRecaptchaToken(token);
            })
            .catch(err => {
              console.error('reCAPTCHA execution error:', err);
            });
        });
      } catch (error) {
        console.error('reCAPTCHA initialization error:', error);
      }
    };
    
    // Load the reCAPTCHA script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}&onload=onRecaptchaLoad`;
    script.async = true;
    script.defer = true;
    script.id = 'recaptcha-script-' + Date.now();
    
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Remove the script
      if (document.getElementById(script.id)) {
        document.head.removeChild(script);
      }
      
      // Remove global callback
      if (window.onRecaptchaLoad) {
        window.onRecaptchaLoad = undefined;
      }
      
      // Try to clean up grecaptcha
      if (window.grecaptcha) {
        try {
          // Just reset the reference, don't try to delete the object
          window.grecaptcha = undefined;
        } catch (e) {
          console.warn('Could not clean up grecaptcha');
        }
      }
    };
  }, []);

  // Add effect to handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling down 300px
      const scrollPosition = window.scrollY;
      if (scrollPosition > 300) {
        setShowStickyHeader(true);
      } else {
        setShowStickyHeader(false);
      }
    };
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Reset form
  const resetForm = () => {
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setSubmitSuccess(false);
    setSubmitError(null);
    
    // Refresh reCAPTCHA token
    if (recaptchaLoaded && window.grecaptcha) {
      try {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'contact_form' })
            .then(token => {
              setRecaptchaToken(token);
            });
        });
      } catch (error) {
        console.error('Error refreshing reCAPTCHA:', error);
      }
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'name': setName(value); break;
      case 'email': setEmail(value); break;
      case 'subject': setSubject(value); break;
      case 'message': setMessage(value); break;
      default: break;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!name || !email || !subject || !message) {
      toast.error('Please fill out all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    // Refresh reCAPTCHA token before submission
    if (recaptchaLoaded && window.grecaptcha) {
      try {
        const token = await window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'contact_form_submit' });
        setRecaptchaToken(token);
      } catch (error) {
        console.error('Error executing reCAPTCHA:', error);
        toast.error('reCAPTCHA verification failed. Please try again.');
        return;
      }
    } else {
      toast.error('reCAPTCHA is not loaded. Please refresh the page.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          recaptchaToken: recaptchaToken
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitSuccess(true);
        toast.success('Message sent successfully!');
        resetForm();
      } else {
        setSubmitError(data.message || 'Something went wrong. Please try again.');
        toast.error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSubmitError('Network error. Please try again later.');
      toast.error('Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation handler
  const handleBuildNewClick = async () => {
    // Show loading toast if available
    let toastId;
    if (typeof toast !== 'undefined') {
      toastId = toast.loading('Creating new resume...');
    }
    
    try {
      // For unauthenticated users or if API call fails, use the original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.success('Starting new resume!', { id: toastId });
      }
    } catch (error) {
      console.error('Error creating new resume:', error);
      
      // Fallback to original behavior
      router.push('/builder/new');
      
      if (toastId) {
        toast.error('Something went wrong. Starting with a blank resume.', { id: toastId });
      }
    }
  };

  return (
    <>
      <Meta
        title="Contact Us | IntelliResume"
        description="Get in touch with the IntelliResume team. We're here to help with any questions about our resume builder."
        keywords="contact IntelliResume, resume builder support, help with resume, customer support"
      />

      {/* Sticky Header that appears on scroll */}
      {showStickyHeader && <StickyHeader />}

      <div className="contact-container">
        <div className="contact-header">
          <h1>Contact Us</h1>
          <p>Have questions or feedback? We'd love to hear from you!</p>
        </div>
        
        <div className="contact-content">
          <div className="contact-form-container">
            {submitSuccess ? (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h2>Message Sent!</h2>
                <p>Thank you for reaching out. We'll get back to you as soon as possible.</p>
                <button 
                  onClick={resetForm}
                  className="send-another-btn"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleChange}
                    required
                    placeholder="Your email address"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={subject}
                    onChange={handleChange}
                    required
                    placeholder="Subject of your message"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={message}
                    onChange={handleChange}
                    required
                    placeholder="Your message"
                    rows="5"
                  ></textarea>
                </div>
                
                <div className="recaptcha-container">
                  <div id={recaptchaRef.current} className="g-recaptcha"></div>
                  <p className="recaptcha-note">
                    This site is protected by reCAPTCHA and the Google{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>{' '}
                    apply.
                  </p>
                </div>
                
                {submitError && <div className="error-message">{submitError}</div>}
                
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={isSubmitting || !recaptchaLoaded}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
                
                {!recaptchaLoaded && (
                  <p className="loading-message">Loading reCAPTCHA verification...</p>
                )}
              </form>
            )}
          </div>
          
          <div className="contact-info">
                        
            <div className="info-card">
              <div className="info-icon">❓</div>
              <h3>FAQ</h3>
              <p>Check our frequently asked questions:</p>
              <Link href="/#">Visit FAQ Page</Link>
            </div>
            
            <div className="info-card">
              <div className="info-icon">🔗</div>
              <h3>Connect</h3>
              <p>Follow me on social media:</p>
              <div className="social-links">
                {/* <a href="#" aria-label="LinkedIn" className="social-link">
                  LinkedIn
                </a> */}
                <a href="https://x.com/delicto_nick" aria-label="X" className="social-link" target="_blank" rel="noreferrer">
                  X
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .contact-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        
        .contact-header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .contact-header h1 {
          font-size: 2.5rem;
          color: var(--primary-blue);
          margin-bottom: 10px;
        }
        
        .contact-header p {
          font-size: 1.1rem;
          color: var(--text-medium);
        }
        
        .contact-content {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 40px;
        }
        
        @media (max-width: 768px) {
          .contact-content {
            grid-template-columns: 1fr;
          }
        }
        
        .contact-form-container {
          background: white;
          border-radius: 10px;
          box-shadow: var(--shadow-md);
          padding: 30px;
        }
        
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .form-group label {
          font-weight: 500;
          color: var(--text-dark);
          font-size: 0.95rem;
        }
        
        .form-group input,
        .form-group textarea {
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          border-color: var(--primary-blue);
          outline: none;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
        }
        
        .submit-btn {
          background: var(--primary-blue);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
          margin-top: 10px;
        }
        
        .submit-btn:hover {
          background-color: #0056b3;
        }
        
        .submit-btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #e53e3e;
          padding: 10px;
          background-color: #fff5f5;
          border-radius: 6px;
          font-size: 0.9rem;
        }
        
        .loading-message {
          color: #718096;
          font-size: 0.9rem;
          text-align: center;
          margin-top: 10px;
        }
        
        .success-message {
          text-align: center;
          padding: 20px;
        }
        
        .success-icon {
          background-color: #48bb78;
          color: white;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          margin: 0 auto 20px;
        }
        
        .success-message h2 {
          color: #2f855a;
          margin-bottom: 15px;
        }
        
        .success-message p {
          color: var(--text-medium);
          margin-bottom: 25px;
        }
        
        .send-another-btn {
          background-color: transparent;
          border: 2px solid var(--primary-blue);
          color: var(--primary-blue);
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .send-another-btn:hover {
          background-color: var(--primary-blue);
          color: white;
        }
        
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .info-card {
          background: white;
          border-radius: 10px;
          box-shadow: var(--shadow-sm);
          padding: 25px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .info-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }
        
        .info-icon {
          font-size: 24px;
          margin-bottom: 15px;
        }
        
        .info-card h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: var(--text-dark);
        }
        
        .info-card p {
          color: var(--text-medium);
          margin-bottom: 10px;
          font-size: 0.95rem;
        }
        
        .info-card a {
          color: var(--primary-blue);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .info-card a:hover {
          color: #0056b3;
          text-decoration: underline;
        }
        
        .social-links {
          display: flex;
          gap: 15px;
        }
        
        .social-link {
          color: var(--primary-blue);
          text-decoration: none;
        }
        
        .recaptcha-container {
          margin-top: 10px;
        }
        
        .recaptcha-note {
          font-size: 0.8rem;
          color: #718096;
          margin-top: 10px;
        }
        
        .recaptcha-note a {
          color: #4a6cf7;
          text-decoration: none;
        }
        
        .recaptcha-note a:hover {
          text-decoration: underline;
        }
      `}</style>
      
      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes gradientFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .animated-button {
          animation: gradientFlow 3s ease infinite;
        }
        
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          
          .animated-button {
            padding: 12px 20px !important;
            font-size: 15px !important;
            width: auto !important;
            max-width: none !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </>
  );
} 