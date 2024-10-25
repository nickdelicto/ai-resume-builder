import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import AuthProvider from './components/AuthProvider'
import { Toaster } from "./components/ui/toaster"
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

// Initialize the Inter font
const inter = Inter({ subsets: ['latin'] })

// Metadata for the application
export const metadata: Metadata = {
  title: 'Intelligent AI Resume Builder',
  description: 'Build an interview-winning ATS-friendly resume with intelligent AI assistance',
}

// Root layout component
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the Google Analytics ID from environment variables
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

  return (
    <html lang="en">
      <head>
        {/* Google Analytics Script */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}

        {/* Crisp Chat Script */}
        <Script id="crisp-widget" strategy="afterInteractive">
          {`
            window.$crisp=[];
            window.CRISP_WEBSITE_ID="9900b3cc-7064-4098-9e25-dd8e06abe759";
            (function(){
              d=document;
              s=d.createElement("script");
              s.src="https://client.crisp.chat/l.js";
              s.async=1;
              d.getElementsByTagName("head")[0].appendChild(s);
            })();
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {/* Authentication Provider wraps the entire application */}
        <AuthProvider>
          {/* Flex container for sticky footer */}
          <div className="flex flex-col min-h-screen">
            {/* Navigation component */}
            <Navbar />
            
            {/* Main content area */}
            <main className="flex-grow">{children}</main>
            
            {/* Footer component */}
            <Footer />
          </div>
          
          {/* Toast notifications component */}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}