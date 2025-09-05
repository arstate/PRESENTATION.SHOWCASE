import React from 'react';
import { Slide } from '../types';

interface SlideCardProps {
  slide: Slide;
  onSelect: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({ slide, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="group relative w-full text-left p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out
                 backdrop-blur-lg bg-white/30 border border-white/20 
                 hover:bg-brand-yellow hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50"
      aria-label={`View presentation: ${slide.title}`}
    >
      <div className="pr-24">
        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 transition-colors duration-300">{slide.title}</h2>
        <p className="text-md text-blue-800/90 font-medium transition-colors duration-300">{slide.description}</p>
      </div>
      <div className="mt-4">
        <span className="inline-block bg-brand-yellow text-blue-900 text-sm font-semibold px-4 py-2 rounded-full transition-colors duration-300
                         group-hover:bg-brand-blue group-hover:text-white">
            View Presentation
        </span>
      </div>
      {slide.semester && (
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-brand-blue/10 text-brand-blue group-hover:bg-white/30 group-hover:text-blue-900 transition-colors duration-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {slide.semester}
        </div>
      )}
    </button>
  );
};

export default SlideCard;