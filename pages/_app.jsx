import '../styles/globals.css';
import AuthProvider from '../components/auth/auth-provider';
import Navigation from '../components/common/Navigation';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Check if the current page is the builder page
  // We'll use this to adjust padding for pages with the navigation
  const isBuilderPage = router.pathname === '/new-resume-builder' || 
                       router.pathname.startsWith('/resume/edit/');
  
  // Check if this is the PDF template capture page - don't render Navigation for it
  const isPdfCapturePage = router.pathname === '/resume-template-capture';
  
  return (
    <AuthProvider>
      {!isPdfCapturePage && <Navigation />}
      <div className={`app-container ${isBuilderPage ? 'pt-14' : isPdfCapturePage ? 'pt-0' : 'pt-20'}`}>
        <Component {...pageProps} />
      </div>
      
      <style jsx global>{`
        .app-container {
          min-height: 100vh;
        }
      `}</style>
    </AuthProvider>
  );
} 