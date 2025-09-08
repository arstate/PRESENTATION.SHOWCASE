import React, { useEffect, useRef, useState } from 'react';
import { Slide } from '../types';

interface SlideViewerProps {
  slide: Slide;
  onClose: () => void;
}

// Helper to extract the src URL from an embed code string.
const getIframeSrc = (embedCode: string): string | null => {
  const match = embedCode.match(/src="([^"]*)"/);
  return match ? match[1] : null;
};

const SlideViewer: React.FC<SlideViewerProps> = ({ slide, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrc = getIframeSrc(slide.embedCode);
  const isFigma = iframeSrc?.includes('figma.com');
  const [isLoading, setIsLoading] = useState(true); // Unified loading state for all content
  const [zoomLevel, setZoomLevel] = useState(1);
  const [areZoomControlsVisible, setAreZoomControlsVisible] = useState(true);

  // Reset zoom when the slide changes, especially for Figma embeds
  useEffect(() => {
    setZoomLevel(isFigma ? 1.35 : 1);
  }, [slide.id, isFigma]);

  // Handle key presses (Escape for close, H for zoom controls)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      // Toggle zoom controls with H only for Figma presentations in fullscreen.
      if (isFigma && document.fullscreenElement && event.key.toLowerCase() === 'h' && !event.altKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault(); // Prevent default browser action for 'h'
          setAreZoomControlsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isFigma]);

  // Reset zoom controls visibility when exiting fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
            setAreZoomControlsVisible(true);
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // This effect handles the special loading case for Figma embeds.
  // It listens for a 'postMessage' from the Figma iframe, which indicates
  // the prototype has finished its internal loading sequence.
  useEffect(() => {
    if (!isFigma) {
      // If it's not a Figma embed, this listener is not needed.
      return;
    }

    let fallbackTimer: number;

    const handleFigmaMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.figma.com') {
        return; // Ignore messages from other origins
      }

      let data;
      // Figma may send data as a stringified JSON or a direct object.
      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          // Not valid JSON, do nothing.
          return;
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        data = event.data;
      }

      // The 'played' event type is a reliable indicator that the
      // prototype is ready and interactive.
      if (data && data.type === 'played') {
        setIsLoading(false);
        clearTimeout(fallbackTimer); // Cancel the fallback
        window.removeEventListener('message', handleFigmaMessage); // Clean up the listener
      }
    };

    window.addEventListener('message', handleFigmaMessage);

    // To prevent the user from being stuck on the loader indefinitely if the
    // message never arrives, we set a fallback timeout.
    fallbackTimer = window.setTimeout(() => {
      console.warn("Figma 'played' event not received within 10 seconds. Hiding loader as a fallback.");
      setIsLoading(false);
      window.removeEventListener('message', handleFigmaMessage); // Clean up listener on fallback
    }, 10000);

    // Cleanup function to remove listener and timer when the component unmounts
    return () => {
      window.removeEventListener('message', handleFigmaMessage);
      clearTimeout(fallbackTimer);
    };
  }, [isFigma]); // Dependency array ensures this runs only when `isFigma` changes


  const handleFullscreen = () => {
    // If the slide is configured to use iframe-native fullscreen, trigger it.
    if (slide.fullscreenAction === 'iframe' && iframeRef.current) {
        iframeRef.current.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable iframe full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        // Otherwise, use the default behavior of making the container fullscreen.
        fullscreenContainerRef.current?.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    }
  };

  const handleIframeLoad = () => {
    // For non-Figma content, we can hide the loader as soon as the iframe loads.
    // For Figma, we do nothing here and let the `useEffect` message listener
    // handle hiding the loader at the correct time.
    if (!isFigma) {
      setIsLoading(false);
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => prev + 0.05);
  };
  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(0.2, prev - 0.05)); // Min zoom 20%
  };


  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-title"
    >
      <div 
        ref={modalRef}
        className="slide-modal-size relative rounded-2xl shadow-2xl overflow-hidden bg-black"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div 
          ref={fullscreenContainerRef} 
          className={`w-full h-full bg-black relative fullscreen-container ${slide.fullscreenBehavior === 'contain' ? 'fullscreen-contain' : ''} ${isFigma ? 'is-figma' : ''}`}
        >
           {/* Unified loading indicator. Fades out gracefully. */}
           <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-10 transition-opacity duration-500 ease-in-out ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <svg className="animate-spin h-10 w-10 text-brand-yellow mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.47715 2 2 6.47715 2 12H4C4 7.58172 7.58172 4 12 4V2Z"/>
              </svg>
              <p className="text-lg font-medium">Loading Presentations...</p>
              <p className="text-sm text-white/70">Please wait a moment.</p>
            </div>

           {iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title={slide.title}
              onLoad={handleIframeLoad}
              className={`w-full h-full border-0 transition-opacity duration-500 ${isFigma ? 'transform' : ''} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ transform: `scale(${zoomLevel})` }}
              allowFullScreen
              allow="fullscreen"
            />
           ) : (
            <div className="w-full h-full flex items-center justify-center text-red-500 bg-gray-900 p-4">
              <p>Error: Invalid presentation embed code. Could not find src URL.</p>
            </div>
           )}
           
           {isFigma && (
                <div className={`zoom-controls ${!areZoomControlsVisible ? 'is-hidden' : ''}`} onClick={e => e.stopPropagation()}>
                    <button 
                        className="zoom-reveal-button" 
                        onClick={() => setAreZoomControlsVisible(true)}
                        aria-label="Show zoom controls"
                        title="Show zoom controls"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <div className="zoom-actions-wrapper">
                        <span className="zoom-info-text">hide press "H"</span>
                        <button onClick={handleZoomOut} aria-label="Zoom out" title="Zoom Out">-</button>
                        <button onClick={handleZoomIn} aria-label="Zoom in" title="Zoom In">+</button>
                    </div>
                </div>
            )}
        </div>
        
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h2 id="slide-title" className="text-xl font-bold text-white" style={{textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>{slide.title}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white bg-black/30 hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Enter fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
              </svg>
            </button>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full text-white bg-black/30 hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close presentation view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
      </div>
    </div>
  );
};

export default SlideViewer;