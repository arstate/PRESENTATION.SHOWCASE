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
  const iframeSrc = getIframeSrc(slide.embedCode);
  const isFigma = iframeSrc?.includes('figma.com');
  const [isLoading, setIsLoading] = useState(true); // Unified loading state for all content

  // Handle Escape key press to close the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
    // Request fullscreen on the container element, not the iframe directly.
    // This is more reliable for cross-origin content.
    fullscreenContainerRef.current?.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  };

  const handleIframeLoad = () => {
    // For non-Figma content, we can hide the loader as soon as the iframe loads.
    // For Figma, we do nothing here and let the `useEffect` message listener
    // handle hiding the loader at the correct time.
    if (!isFigma) {
      setIsLoading(false);
    }
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
          className={`w-full h-full bg-black relative fullscreen-container ${slide.fullscreenBehavior === 'contain' ? 'fullscreen-contain' : ''}`}
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
              src={iframeSrc}
              title={slide.title}
              onLoad={handleIframeLoad}
              className={`w-full h-full border-0 transition-opacity duration-500 ${isFigma ? 'transform scale-[1.35]' : ''} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              allowFullScreen
              allow="fullscreen"
            />
           ) : (
            <div className="w-full h-full flex items-center justify-center text-red-500 bg-gray-900 p-4">
              <p>Error: Invalid presentation embed code. Could not find src URL.</p>
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