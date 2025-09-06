import React from 'react';
import { Slide } from '../types';

interface SlideCardProps {
  slide: Slide;
  onSelect: () => void;
  onShowNotification: (message: string) => void;
}

const SlideCard: React.FC<SlideCardProps> = ({ slide, onSelect, onShowNotification }) => {
  const handleDownloadClick = (e: React.MouseEvent<HTMLButtonElement>, url?: string) => {
    e.stopPropagation();
    const button = e.currentTarget;

    // By focusing and then blurring, we can use Tailwind's focus styles for the ring effect.
    // The ring will be shown via focus:ring-white.
    button.focus();

    // We'll remove the ring by blurring after a 2-second delay.
    // The fade-out animation is handled by the transition classes.
    setTimeout(() => {
        button.blur();
    }, 2000);

    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      onShowNotification('Download not yet available.');
    }
  };

  return (
    <div
      className="group relative w-full text-left p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out
                 backdrop-blur-lg bg-white/30 border border-white/20 
                 hover:bg-brand-yellow hover:shadow-2xl hover:-translate-y-1"
    >
      <div className="pr-24">
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 transition-colors duration-300">{slide.title}</h2>
        <p className="text-md text-blue-800/90 font-medium transition-colors duration-300">{slide.description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Main action button */}
        <button
          onClick={onSelect}
          className="inline-block bg-brand-yellow text-blue-900 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300
                         group-hover:bg-brand-blue group-hover:text-white hover:ring-2 hover:ring-white hover:ring-offset-2 hover:ring-offset-brand-yellow
                         focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={`View presentation for ${slide.title}`}
        >
            View Presentation
        </button>

        {/* PDF Download Button */}
        <button
          onClick={(e) => handleDownloadClick(e, slide.pdfUrl)}
          className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 
                     bg-blue-100 text-blue-800 hover:bg-green-500 hover:text-white
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white 
                     ring-2 ring-transparent transition-shadow duration-500 ease-out`}
          aria-label="Download as PDF"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
        </button>

        {/* Template Download Button */}
        <button
          onClick={(e) => handleDownloadClick(e, slide.templateUrl)}
          className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 
                     bg-blue-100 text-blue-800 hover:bg-green-500 hover:text-white
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white 
                     ring-2 ring-transparent transition-shadow duration-500 ease-out`}
          aria-label="Download template"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Download Template
        </button>
      </div>
      
      {slide.semester && (
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-brand-blue/10 text-brand-blue group-hover:bg-white/30 group-hover:text-blue-900 transition-colors duration-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {slide.semester}
        </div>
      )}
    </div>
  );
};

export default SlideCard;