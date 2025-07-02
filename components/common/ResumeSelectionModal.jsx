import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { listResumes } from '../../lib/resumeUtils';

/**
 * Modal component to select a resume before proceeding to pricing
 * Shows a simple, elegant list of user's resumes to select which one to apply the one-time plan to
 */
const ResumeSelectionModal = ({ isOpen, onClose, onSelectResume }) => {
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  // Handle animation when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Fetch user's resumes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchResumes();
    }
  }, [isOpen]);

  // Function to fetch user's resumes
  const fetchResumes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await listResumes(true);
      
      if (result.success && result.resumes) {
        setResumes(result.resumes);
        // Auto-select the first resume if available
        if (result.resumes.length > 0) {
          setSelectedResumeId(result.resumes[0].id);
        }
      } else {
        setError('Failed to load your resumes. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while loading your resumes.');
      console.error('Error fetching resumes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resume selection
  const handleSelectResume = (resumeId) => {
    setSelectedResumeId(resumeId);
  };

  // Handle continue button click
  const handleContinue = () => {
    if (selectedResumeId) {
      if (onSelectResume) {
        onSelectResume(selectedResumeId);
      } else {
        // If no callback provided, navigate directly to subscription page
        router.push(`/subscription?resumeId=${selectedResumeId}&action=download`);
      }
      onClose();
    }
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}
      onClick={(e) => {
        // Close modal when clicking outside
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style jsx global>{`
        /* Hide scrollbars but keep functionality */
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari, Opera */
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(26, 115, 232, 0); }
          100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0); }
        }
      `}</style>
      
      <div 
        className="hide-scrollbar"
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          animation: 'slideUp 0.4s ease-out forwards',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(240, 240, 240, 0.8)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#555',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(230, 230, 230, 0.95)';
            e.currentTarget.style.color = '#333';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(240, 240, 240, 0.8)';
            e.currentTarget.style.color = '#555';
          }}
          aria-label="Close modal"
        >
          ×
        </button>
        
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ 
            fontSize: '26px', 
            marginBottom: '12px',
            color: '#1a2b42',
            textAlign: 'center',
            fontWeight: '600',
            lineHeight: '1.3'
          }}>
            Select a Resume
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#64748b',
            marginBottom: '24px',
            textAlign: 'center',
            maxWidth: '380px',
            margin: '0 auto'
          }}>
            Choose which resume you want to download ASAP!
          </p>
        </div>
        
        {isLoading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(26, 115, 232, 0.15)',
              borderLeftColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ 
              marginTop: '16px', 
              color: '#64748b', 
              fontSize: '15px',
              fontWeight: '500'
            }}>
              Loading your resumes...
            </p>
          </div>
        ) : error ? (
          <div style={{
            padding: '20px',
            backgroundColor: '#fff5f7',
            color: '#e53e3e',
            borderRadius: '10px',
            marginBottom: '24px',
            textAlign: 'center',
            border: '1px solid rgba(229, 62, 62, 0.2)',
            boxShadow: '0 2px 5px rgba(229, 62, 62, 0.05)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        ) : resumes.length === 0 ? (
          <div style={{
            padding: '40px 0',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p style={{ marginBottom: '20px', fontSize: '15px' }}>You don't have any resumes yet.</p>
            <button
              onClick={() => {
                onClose();
                router.push('/');
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 10px rgba(26, 115, 232, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#1765cc';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(26, 115, 232, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1a73e8';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(26, 115, 232, 0.2)';
              }}
            >
              Create a Resume First
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '28px' }}>
            <div 
              className="hide-scrollbar"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                border: '1px solid #edf2f7',
                maxHeight: '320px',
                overflowY: 'auto'
              }}
            >
              {resumes.map((resume, index) => (
                <div
                  key={resume.id}
                  onClick={() => handleSelectResume(resume.id)}
                  style={{
                    padding: '16px',
                    borderBottom: index < resumes.length - 1 ? '1px solid #edf2f7' : 'none',
                    backgroundColor: selectedResumeId === resume.id ? '#f0f7ff' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    transform: selectedResumeId === resume.id ? 'translateX(2px)' : 'translateX(0)'
                  }}
                  onMouseOver={(e) => {
                    if (selectedResumeId !== resume.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedResumeId !== resume.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: `2px solid ${selectedResumeId === resume.id ? '#1a73e8' : '#cbd5e0'}`,
                    marginRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    backgroundColor: selectedResumeId === resume.id ? '#e6f0ff' : 'transparent'
                  }}>
                    {selectedResumeId === resume.id && (
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#1a73e8',
                        animation: selectedResumeId === resume.id ? 'pulse 1.5s infinite' : 'none'
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 4px 0',
                      color: selectedResumeId === resume.id ? '#1a73e8' : '#2d3748',
                      transition: 'color 0.2s ease'
                    }}>
                      {resume.title || 'Untitled Resume'}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#718096',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.color = '#475569';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedResumeId || resumes.length === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: selectedResumeId ? '#1a73e8' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedResumeId ? 'pointer' : 'not-allowed',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: selectedResumeId ? '0 4px 10px rgba(26, 115, 232, 0.2)' : 'none'
            }}
            onMouseOver={(e) => {
              if (selectedResumeId) {
                e.currentTarget.style.backgroundColor = '#1765cc';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(26, 115, 232, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedResumeId) {
                e.currentTarget.style.backgroundColor = '#1a73e8';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(26, 115, 232, 0.2)';
              }
            }}
          >
            Continue to Pricing
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeSelectionModal; 