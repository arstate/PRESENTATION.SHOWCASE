import React, { useState, useEffect } from 'react';
import HomeScreen, { AppKey } from './apps/HomeScreen';
import PresentationShowcaseApp from './apps/PresentationShowcaseApp';
import ShortLinkGeneratorApp from './apps/ShortLinkGeneratorApp';
import PDFMergerApp from './apps/PDFMergerApp';
import GooglePhotosEmbedderApp from './apps/GooglePhotosEmbedderApp';
import PDFCompressorApp from './apps/PDFCompressorApp';
import MediaConverterApp from './apps/MediaConverterApp';
import RemoveBackgroundApp from './apps/RemoveBackgroundApp';
import TextToImageApp from './apps/TextToImageApp';
import ShowcasePasswordPrompt from './apps/auth/ShowcasePasswordPrompt';
import LoginScreen from './components/LoginScreen';
import { authStateObserver, User } from './firebase';

// --- BACKGROUND COMPONENT ---
const BackgroundBlobs = () => (
  <div className="blob-container">
    <div className="blob blob-1"></div>
    <div className="blob blob-2"></div>
    <div className="blob blob-3"></div>
    <div className="blob blob-4"></div>
  </div>
);

// --- HELPERS (exported for use in other components) ---

// Simple hash function to create a basic link between search and token.
// This is NOT for cryptography, just to prevent trivial URL manipulation.
export const SECRET_SALT = 'arstate-ppt-showcase-2025';
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36); // Base36 for a more URL-friendly string
};

const isInsideGoogleAIStudio = (): boolean => {
    try {
        return window.location.ancestorOrigins[0] === 'https://aistudio.google.com';
    } catch (e) {
        return false;
    }
};

const getAppKeyFromHash = (hash: string): AppKey | null => {
    const path = hash.substring(1).split('?')[0]; // Get path part, ignore query
    if (path === '/showcase') return 'showcase';
    if (path === '/shortlink') return 'shortlink';
    if (path === '/pdfmerger') return 'pdfmerger';
    if (path === '/gphotos') return 'gphotos';
    if (path === '/pdfcompressor') return 'pdfcompressor';
    if (path === '/mediaconverter') return 'mediaconverter';
    if (path === '/removebackground') return 'removebackground';
    if (path === '/texttoimage') return 'texttoimage';
    return null;
}

const canBypassAuthViaSearch = (hash: string): boolean => {
    const searchPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    const searchTerm = params.get('search');
    const token = params.get('_sec');

    if (!searchTerm || !token || !searchTerm.trim() || !token.trim()) {
        return false;
    }

    // Validate that the token was generated for this specific search term
    const expectedToken = simpleHash(searchTerm.trim() + SECRET_SALT);
    return token.trim() === expectedToken;
};


// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
    const [locationHash, setLocationHash] = useState(window.location.hash);
    const [isShowcaseAuthenticated, setIsShowcaseAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
    const [isGuestSession, setIsGuestSession] = useState(false);
    const isStudio = isInsideGoogleAIStudio();

    useEffect(() => {
      const unsubscribe = authStateObserver((firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
              setIsGuestSession(false);
          } else if (isStudio) {
              // If user is not logged in (or logs out) and we are in AI Studio,
              // automatically start a guest session.
              setIsGuestSession(true);
          }
      });
      return () => unsubscribe();
    }, [isStudio]);

    useEffect(() => {
      const handleHashChange = () => {
        // Use functional update to access the previous hash state
        setLocationHash(prevHash => {
            const prevAppKey = getAppKeyFromHash(prevHash);
            const newAppKey = getAppKeyFromHash(window.location.hash);
            
            // When navigating away from the showcase, reset authentication.
            if (prevAppKey === 'showcase' && newAppKey !== 'showcase') {
                setIsShowcaseAuthenticated(false);
            }
            
            // Return the new hash to update the state, triggering a re-render
            return window.location.hash;
        });
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }, []); // Empty dependency array ensures this effect runs only once

    const handleSelectApp = (appKey: AppKey) => {
        window.location.hash = `/${appKey}`;
    }

    const handleBack = () => {
        window.location.hash = '';
    }
    
    const handleSuccessfulAuth = () => {
        setIsShowcaseAuthenticated(true);
    };

    const handleSignInLater = () => {
        setIsGuestSession(true);
    };

    const renderAppContent = () => {
        const activeApp = getAppKeyFromHash(locationHash);
        
        // 1. Loading state: waiting for Firebase to confirm auth status
        if (user === undefined) {
             return (
                <div className="flex items-center justify-center min-h-screen z-50">
                    <svg className="animate-spin h-10 w-10 text-brand-yellow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.47715 2 2 6.47715 2 12H4C4 7.58172 7.58172 4 12 4V2Z"/>
                    </svg>
                </div>
            );
        }

        // 2. Not logged in and not a guest: show the login screen
        if (!user && !isGuestSession) {
            return <LoginScreen onSignInLater={handleSignInLater} />;
        }
        
        // At this point, the user is either logged in or is a guest.
        
        // 3. Showcase Search Link Bypass (re-checking is cheap and ensures access)
        if (activeApp === 'showcase' && canBypassAuthViaSearch(locationHash)) {
             return <PresentationShowcaseApp onBack={handleBack} user={user} />;
        }
        
        // --- Content Routing ---
        if (activeApp === 'showcase') {
            return isShowcaseAuthenticated
                ? <PresentationShowcaseApp onBack={handleBack} user={user} />
                : <ShowcasePasswordPrompt onBack={handleBack} onSuccess={handleSuccessfulAuth} user={user} />;
        }
        if (activeApp === 'shortlink') return <ShortLinkGeneratorApp onBack={handleBack} user={user} />;
        if (activeApp === 'pdfmerger') return <PDFMergerApp onBack={handleBack} user={user} />;
        if (activeApp === 'gphotos') return <GooglePhotosEmbedderApp onBack={handleBack} user={user} />;
        if (activeApp === 'pdfcompressor') return <PDFCompressorApp onBack={handleBack} user={user} />;
        if (activeApp === 'mediaconverter') return <MediaConverterApp onBack={handleBack} user={user} />;
        if (activeApp === 'removebackground') return <RemoveBackgroundApp onBack={handleBack} user={user} />;
        if (activeApp === 'texttoimage') return <TextToImageApp onBack={handleBack} user={user} />;
        
        // If no specific app was matched, it must be the home screen.
        return <HomeScreen onSelectApp={handleSelectApp} user={user} />;
    }
    
    return (
        <>
            <BackgroundBlobs />
            {renderAppContent()}
        </>
    );
};

export default App;
