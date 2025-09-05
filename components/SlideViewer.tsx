import React, { useEffect, useRef } from 'react';
import { Slide } from '../types';

interface SlideViewerProps {
  slide: Slide;
  onClose: () => void;
}

// Helper untuk mengekstrak URL src dari string embed code.
const getIframeSrc = (embedCode: string): string | null => {
  const match = embedCode.match(/src="([^"]*)"/);
  return match ? match[1] : null;
};

const SlideViewer: React.FC<SlideViewerProps> = ({ slide, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const iframeSrc = getIframeSrc(slide.embedCode);

  // Menangani penekanan tombol Escape untuk menutup modal
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

  const handleFullscreen = () => {
    // Meminta fullscreen pada elemen container, bukan iframe secara langsung.
    // Ini lebih andal untuk konten cross-origin.
    fullscreenContainerRef.current?.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-title"
    >
      <div 
        ref={modalRef}
        className="w-full max-w-5xl flex flex-col rounded-2xl shadow-2xl overflow-hidden
                   backdrop-blur-xl bg-white/50 border border-white/20 aspect-video"
        onClick={(e) => e.stopPropagation()} // Mencegah penutupan saat mengklik di dalam modal
      >
        <header className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0">
          <h2 id="slide-title" className="text-xl font-bold text-blue-900">{slide.title}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-900 bg-white/30 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              aria-label="Enter fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
              </svg>
            </button>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-900 bg-white/30 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              aria-label="Close presentation view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <div ref={fullscreenContainerRef} className="flex-grow bg-gray-100/50 fullscreen-container">
           {iframeSrc ? (
            <iframe
              src={iframeSrc}
              title={slide.title}
              className="w-full h-full border-0"
              allowFullScreen
              allow="fullscreen"
            />
           ) : (
            <div className="w-full h-full flex items-center justify-center text-red-600 p-4">
              <p>Error: Invalid presentation embed code. Could not find src URL.</p>
            </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SlideViewer;