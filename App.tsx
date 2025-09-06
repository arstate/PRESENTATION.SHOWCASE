import React, { useState, useEffect } from 'react';
import HomeScreen, { AppKey } from './apps/HomeScreen';
import PresentationShowcaseApp from './apps/PresentationShowcaseApp';
import ShortLinkGeneratorApp from './apps/ShortLinkGeneratorApp';
import PDFMergerApp from './apps/PDFMergerApp';
import GooglePhotosEmbedderApp from './apps/GooglePhotosEmbedderApp';
import PDFCompressorApp from './apps/PDFCompressorApp';

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

    const [activeApp, setActiveApp] = useState<AppKey | null>(() => getAppKeyFromHash(window.location.hash));

    useEffect(() => {
      const handleHashChange = () => {
        setActiveApp(getAppKeyFromHash(window.location.hash));
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }, []);

    const handleSelectApp = (appKey: AppKey) => {
        window.location.hash = `/${appKey}`;
    }

    const handleBack = () => {
        window.location.hash = '';
    }

    let activeComponent;
    if (activeApp === 'showcase') {
        activeComponent = <PresentationShowcaseApp onBack={handleBack} />;
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