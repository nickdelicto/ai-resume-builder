import { useRouter } from 'next/router';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const StickyHeader = () => {
  const router = useRouter();

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
      animation: 'slideDown 0.3s forwards',
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#1a73e8',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {/* Logo - using the exact same SVG as in Navigation.jsx */}
        <Image 
          src="/logo.svg" 
          alt="IntelliResume Logo" 
          width={28} 
          height={28} 
          style={{ position: 'relative', top: '-2px' }}
          priority
        />
        IntelliResume
      </div>
      <div style={{
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '15px',
          color: '#333',
          fontWeight: '500',
          display: 'none',
          '@media (min-width: 768px)': {
            display: 'block',
          }
        }}
        className="hide-on-mobile">
          Ready to build your resume?
        </span>
        <button
          onClick={handleBuildNewClick}
          className="animated-button"
          style={{
            padding: '14px 28px',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '17px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(-45deg, #12b886, #1a73e8, #f59f00, #12b886)',
            backgroundSize: '300% 300%',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            transform: 'translateY(0)',
            minWidth: '220px',
            justifyContent: 'center',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
          }}
        >
          Start Building Resume
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
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
    </div>
  );
};

export default StickyHeader; 