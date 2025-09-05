import React, { useState, useRef, useEffect } from 'react';
import SlideCard from './components/SlideCard';
import SlideViewer from './components/SlideViewer';
import { Slide } from './types';

const slideData: Slide[] = [
  {
    id: 1,
    title: 'Brand Alaysis Mangkabayan',
    description: 'DESAIN GRAFIS DASAR - PROJECT 2',
    embedCode: `<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="1920" height="1080" src="https://embed.figma.com/proto/ST0veoo6HOF1fssLEbBFM0/BRAND-ANALYSIS-MANGKABAYAN?page-id=0%3A1&node-id=16-524&viewport=326%2C389%2C0.21&scaling=contain&content-scaling=fixed&starting-point-node-id=16%3A524&embed-host=share&hotspot-hints=0&hide-ui=1" allowfullscreen></iframe>`,
    semester: 'Semester 3'
  },
  {
    id: 2,
    title: 'Gaya Hidup dan Preferensi Mahasiswa dalam Kehidupan',
    description: 'GRAPHIC DESIGN STYLE - PROJECT SEMESTER 2',
    embedCode: `<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="1920" height="1080" src="https://embed.figma.com/proto/PyT9PpC6YUFDjDLQquaugD/Untitled?page-id=0%3A1&node-id=3-1529&viewport=400%2C-32%2C0.26&scaling=contain&content-scaling=fixed&starting-point-node-id=3%3A1529&embed-host=share&hotspot-hints=0&hide-ui=1" allowfullscreen></iframe>`,
    semester: 'Semester 2'
  },
  {
    id: 3,
    title: 'Bad UI Analysis',
    description: 'DIGITAL MEDIA - PROJECT 1',
    embedCode: `<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;" src="https://www.canva.com/design/DAGxOqDnBrA/H6qya5_rp_PL3Yca1HlbIw/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`,
    semester: 'Semester 3',
    fullscreenBehavior: 'contain'
  },
  {
    id: 4,
    title: 'User Behavior Social Media',
    description: 'DIGITAL MEDIA - PROJECT 2',
    embedCode: `<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;" src="https://www.canva.com/design/DAGxzNBvRFc/CfHH4Jb4rRUMQvSfRYMJaQ/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`,
    semester: 'Semester 3',
    fullscreenBehavior: 'contain'
  },
  {
    id: 5,
    title: 'Membangun Agensi Kreatif',
    description: 'MKWU KEWIRAUSAHAAN - PROJECT 1',
    embedCode: `<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;" src="https://kewirausahaan-2.vercel.app/" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`,
    semester: 'Semester 3'
  },
  {
    id: 6,
    title: 'Tugas 2 Copywriting',
    description: 'COPYWRITING - PROJECT 2',
    embedCode: `<iframe width="1920" height="1080" src="https://tugas-copywriting-2.vercel.app/" loading="lazy" style="border: none;" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`,
    semester: 'Semester 3',
    fullscreenBehavior: 'contain'
  }
];

const sortedSlides = [...slideData].sort((a, b) => {
  const getSemesterNum = (semester?: string): number => {
    if (!semester) return 0;
    const match = semester.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const semesterA = getSemesterNum(a.semester);
  const semesterB = getSemesterNum(b.semester);

  // Primary sort: Semester, descending
  if (semesterA !== semesterB) {
    return semesterB - semesterA;
  }

  // Secondary sort: Title, ascending (alphabetical)
  return a.title.localeCompare(b.title);
});

const App: React.FC = () => {
  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Effect to sync searchQuery from URL on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('search');
    if (query) {
      setSearchQuery(query);
      setIsSearchActive(true);
    }
  }, []);

  const handleSelectSlide = (id: number) => {
    setSelectedSlideId(id);
  };

  const handleCloseSlide = () => {
    setSelectedSlideId(null);
  };

  const handleSearchIconClick = () => {
    setIsSearchActive(true);
  };

  // Commits the current search query to the URL
  const handleSearchCommit = () => {
    const url = new URL(window.location.href);
    if (searchQuery.trim()) {
      url.searchParams.set('search', searchQuery.trim());
    } else {
      url.searchParams.delete('search');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    // Update URL to remove search param
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => searchInputRef.current?.focus(), 400);
    }
  }, [isSearchActive]);

  // Listen for browser navigation events (back/forward) to sync URL with state
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('search') || '';
      setSearchQuery(query);
      if (query) {
        setIsSearchActive(true);
      } else {
        setIsSearchActive(false); 
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const selectedSlide = sortedSlides.find(slide => slide.id === selectedSlideId) || null;

  const filteredSlides = sortedSlides.filter(slide =>
    slide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    slide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
      <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 space-x-4">
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isSearchActive ? 'w-0 opacity-0 pointer-events-none sm:w-auto sm:opacity-100 sm:pointer-events-auto' : 'w-auto opacity-100'}`}>
              <h1 className="text-2xl font-bold text-blue-900 whitespace-nowrap">
                BACHTIAR ARYANSYAH PUTRA
              </h1>
              <p className="text-sm text-blue-900/80 whitespace-nowrap">Presentation Showcase</p>
            </div>

            <div className="relative flex items-center justify-end flex-1">
              <div className={`flex items-center h-10 transition-all duration-400 ease-in-out ${isSearchActive ? 'w-80 bg-white rounded-full shadow-md' : 'w-10 bg-white rounded-full shadow-sm hover:shadow-md'}`}>
                <div className="relative w-full h-full">
                  <button
                    onClick={handleSearchIconClick}
                    disabled={isSearchActive}
                    className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-500 focus:outline-none transition-all duration-400 ease-in-out ${isSearchActive ? 'left-1 cursor-default' : 'left-0'}`}
                    aria-label="Search presentations"
                  >
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>

                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={handleSearchCommit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchCommit();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className={`w-full h-full bg-transparent py-2 transition-all duration-400 ease-in-out focus:outline-none text-gray-800 ${isSearchActive ? 'pl-10 pr-8 opacity-100' : 'pl-8 opacity-0 pointer-events-none'}`}
                    aria-hidden={!isSearchActive}
                  />

                  {isSearchActive && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleCloseSearch}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800 focus:outline-none rounded-full"
                      aria-label="Close search bar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
        <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-5xl font-bold text-center text-blue-900 mb-8 font-cycle-animation">PRESENTATIONS</h2>
            {filteredSlides.length > 0 ? (
                filteredSlides.map((slide) => (
                    <SlideCard 
                        key={slide.id} 
                        slide={slide} 
                        onSelect={() => handleSelectSlide(slide.id)}
                    />
                ))
            ) : (
                 <div className="text-center p-8 backdrop-blur-lg bg-white/30 border border-white/20 rounded-2xl">
                    <h3 className="text-2xl font-bold text-blue-900">No Presentations Found</h3>
                    <p className="text-blue-800/90 mt-2">Try adjusting your search query.</p>
                </div>
            )}
        </div>
      </main>

      {selectedSlide && <SlideViewer slide={selectedSlide} onClose={handleCloseSlide} />}

      <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
          <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;