import { useRouter } from 'next/router';

const StickyHeader = () => {
  const router = useRouter();

  const handleFindJobsClick = () => {
    router.push('/jobs/nursing');
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
        background: 'linear-gradient(135deg, #1a73e8 15%, #4f46e5 70%, #6366f1 95%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        IntelliResume
      </div>
      <div style={{
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
      }}>
        <button
          onClick={handleFindJobsClick}
          className="animated-button"
          style={{
            padding: '12px 24px',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(-45deg, #12b886, #1a73e8, #f59f00, #12b886)',
            backgroundSize: '300% 300%',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            transform: 'translateY(0)',
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
          🔥 Find RN Jobs
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          .animated-button {
            padding: 10px 16px !important;
            font-size: 14px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StickyHeader; 