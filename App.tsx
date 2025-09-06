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

// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
    const getAppKeyFromHash = (hash: string): AppKey | null => {
        const path = hash.substring(1).split('?')[0]; // Get path part, ignore query
        if (path === '/showcase') return 'showcase';
        if (path === '/shortlink') return 'shortlink';
        if (path === '/pdfmerger') return 'pdfmerger';
        if (path === '/gphotos') return 'gphotos';
        if (path === '/pdfcompressor') return 'pdfcompressor';
        return null;
    }

    const hasSearchQuery = (hash: string): boolean => {
        const searchPart = hash.split('?')[1] || '';
        const params = new URLSearchParams(searchPart);
        return params.has('search') && params.get('search')!.trim() !== '';
    };

    const [activeApp, setActiveApp] = useState<AppKey | null>(() => getAppKeyFromHash(window.location.hash));

    const [isShowcaseAuthenticated, setIsShowcaseAuthenticated] = useState(() => {
        if (sessionStorage.getItem('showcase_authenticated') === 'true') {
            return true;
        }
        if (getAppKeyFromHash(window.location.hash) === 'showcase' && hasSearchQuery(window.location.hash)) {
            sessionStorage.setItem('showcase_authenticated', 'true');
            return true;
        }
        return false;
    });

    useEffect(() => {
      const handleHashChange = () => {
        const newActiveApp = getAppKeyFromHash(window.location.hash);
        setActiveApp(newActiveApp);

        if (newActiveApp === 'showcase' && !isShowcaseAuthenticated) {
            if (hasSearchQuery(window.location.hash)) {
                sessionStorage.setItem('showcase_authenticated', 'true');
                setIsShowcaseAuthenticated(true);
            }
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }, [isShowcaseAuthenticated]);

    const handleSelectApp = (appKey: AppKey) => {
        window.location.hash = `/${appKey}`;
    }

    const handleBack = () => {
        window.location.hash = '';
    }
    
    const handleSuccessfulAuth = () => {
        sessionStorage.setItem('showcase_authenticated', 'true');
        setIsShowcaseAuthenticated(true);
    };

    let activeComponent;
    if (activeApp === 'showcase') {
        activeComponent = isShowcaseAuthenticated 
            ? <PresentationShowcaseApp onBack={handleBack} />
            : <ShowcasePasswordPrompt onBack={handleBack} onSuccess={handleSuccessfulAuth} />;
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