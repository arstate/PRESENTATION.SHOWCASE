import React, { useState, useEffect } from 'react';
import HomeScreen, { AppKey } from './apps/HomeScreen';
import PresentationShowcaseApp from './apps/PresentationShowcaseApp';
import ShortLinkGeneratorApp from './apps/ShortLinkGeneratorApp';
import PDFMergerApp from './apps/PDFMergerApp';
import GooglePhotosEmbedderApp from './apps/GooglePhotosEmbedderApp';
import PDFCompressorApp from './apps/PDFCompressorApp';
import ShowcasePasswordPrompt from './apps/auth/ShowcasePasswordPrompt';

// --- BACKGROUND COMPONENT ---
const BackgroundBlobs = () => (
  <div className="blob-container">
    <div className="blob blob-1"></div>
    <div className="blob blob-2"></div>
    <div className="blob blob-3"></div>
    <div className="blob blob-4"></div>
  </div>
);

// --- HELPERS (moved outside component for stability) ---
const getAppKeyFromHash = (hash: string): AppKey | null => {
    const path = hash.substring(1).split('?')[0]; // Get path part, ignore query
    if (path === '/showcase') return 'showcase';
    if (path === '/shortlink') return 'shortlink';
    if (path === '/pdfmerger') return 'pdfmerger';
    if (path === '/gphotos') return 'gphotos';
    if (path === '/pdfcompressor') return 'pdfcompressor';
    return null;
}

const canBypassAuthViaSearch = (hash: string): boolean => {
    const searchPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    const hasSearch = params.has('search') && params.get('search')!.trim() !== '';
    const hasToken = params.has('_sec') && params.get('_sec')!.trim() !== '';
    return hasSearch && hasToken;
};


// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
    const [locationHash, setLocationHash] = useState(window.location.hash);
    const [isShowcaseAuthenticated, setIsShowcaseAuthenticated] = useState(false);

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

    const activeApp = getAppKeyFromHash(locationHash);

    let activeComponent;
    if (activeApp === 'showcase') {
        const canAccessViaSearch = canBypassAuthViaSearch(locationHash);
        if (isShowcaseAuthenticated || canAccessViaSearch) {
            activeComponent = <PresentationShowcaseApp onBack={handleBack} />;
        } else {
            activeComponent = <ShowcasePasswordPrompt onBack={handleBack} onSuccess={handleSuccessfulAuth} />;
        }
    } else if (activeApp === 'shortlink') {
        activeComponent = <ShortLinkGeneratorApp onBack={handleBack} />;
    } else if (activeApp === 'pdfmerger') {
        activeComponent = <PDFMergerApp onBack={handleBack} />;
    } else if (activeApp === 'gphotos') {
        activeComponent = <GooglePhotosEmbedderApp onBack={handleBack} />;
    } else if (activeApp === 'pdfcompressor') {
        activeComponent = <PDFCompressorApp onBack={handleBack} />;
    } else {
        activeComponent = <HomeScreen onSelectApp={handleSelectApp} />;
    }
    
    return (
        <>
            <BackgroundBlobs />
            {activeComponent}
        </>
    );
};

export default App;