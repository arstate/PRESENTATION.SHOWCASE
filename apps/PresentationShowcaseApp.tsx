import React, { useState, useRef, useEffect } from 'react';
import SlideCard from '../components/SlideCard';
import SlideViewer from '../components/SlideViewer';
import { Slide } from '../types';
import { simpleHash, SECRET_SALT } from '../App';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

// --- TOAST COMPONENT ---
const Toast: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000); // Automatically dismiss after 3 seconds
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div 
            role="alert"
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-800/90 text-white rounded-full shadow-lg animate-fade-in-up"
        >
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
            {message}
        </div>
    );
};


// --- DATA FOR PRESENTATION SHOWCASE ---
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
    semester: 'Semester 2',
    pdfUrl: 'https://drive.usercontent.google.com/download?id=1caao9aPD1r8DqVnBqobFFl9EyhhZRf7k&export=download&authuser=0&confirm=t&uuid=90c8c47c-1a5a-4e83-9e94-85aa99690316&at=AN8xHooafPEEVKTgvOuedpuFg7lh:1757185479510',
    templateUrl: 'https://drive.usercontent.google.com/download?id=1uhzIP_0MwD9WOPzEVXqE_8nzbgZXbzN-&export=download&authuser=0&confirm=t&uuid=46087059-39a3-4dff-a100-114ac7c5fdaf&at=AN8xHoo2r4YkV8wuEoZMERXOEHM-:1757186585197'
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
  },
  {
    id: 7,
    title: 'UNSUR AUDIO PADA VIDEOGRAFI',
    description: 'VIDEOGRAFI - SEMESTER 2',
    embedCode: `<iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;" src="https://www.canva.com/design/DAGmlhHRsZ0/_q98bVZfaRV99dsWMST95w/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe>`,
    semester: 'Semester 2',
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
  if (semesterA !== semesterB) return semesterB - semesterA;
  return a.title.localeCompare(b.title);
});


const PresentationShowcaseApp: React.FC<{ onBack: () => void, user: User | null }> = ({ onBack, user }) => {
  const getSearchFromHash = (hash: string): string => {
    const searchPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    return params.get('search') || '';
  };

  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => getSearchFromHash(window.location.hash));
  const [isSearchActive, setIsSearchActive] = useState(() => !!getSearchFromHash(window.location.hash));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (message: string) => {
      setNotification(message);
  };

  const handleSelectSlide = (id: number) => setSelectedSlideId(id);
  const handleCloseSlide = () => setSelectedSlideId(null);
  
  // This is now handled in AppHeader, but we keep the state management here.
  // The state setter is passed down via searchProps.
  const handleSearchIconClick = () => setIsSearchActive(true);


  // Called on every keystroke to invalidate the current session.
  const handleSearchChange = (newQuery: string) => {
    setSearchQuery(newQuery);

    const hashParts = window.location.hash.split('?');
    const basePath = hashParts[0];
    const params = new URLSearchParams(hashParts[1] || '');

    if (newQuery.trim()) {
        params.set('search', newQuery);
        params.delete('_sec'); // CRITICAL: remove token to invalidate bypass
    } else {
        params.delete('search');
        params.delete('_sec');
    }

    const newSearch = params.toString();
    const newHash = newSearch ? `${basePath}?${newSearch}` : basePath;

    // Use replaceState to avoid cluttering browser history with every keystroke
    if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
        // Manually dispatch a hashchange event because replaceState doesn't.
        window.dispatchEvent(new Event('hashchange'));
    }
  };

  // Called on blur or Enter to generate a new, valid, shareable link.
  const handleSearchCommit = () => {
    const hashParts = window.location.hash.split('?');
    const basePath = hashParts[0];
    const params = new URLSearchParams(hashParts[1] || '');
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery) {
        params.set('search', trimmedQuery);
        // Generate the secure token based on the search term
        const token = simpleHash(trimmedQuery + SECRET_SALT);
        params.set('_sec', token);
    } else {
        params.delete('search');
        params.delete('_sec');
    }

    const newSearch = params.toString();
    const newHash = newSearch ? `${basePath}?${newSearch}` : basePath;
    
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }
  };

  const handleCloseSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    
    const hashParts = window.location.hash.split('?');
    const basePath = hashParts[0];
    const params = new URLSearchParams(hashParts[1] || '');
    params.delete('search');
    params.delete('_sec');

    const newSearch = params.toString();
    const newHash = newSearch ? `${basePath}?${newSearch}` : basePath;

    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }
  };

  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => searchInputRef.current?.focus(), 400);
    }
  }, [isSearchActive]);

  useEffect(() => {
    const handleHashChange = () => {
      const query = getSearchFromHash(window.location.hash);
      setSearchQuery(query);
      setIsSearchActive(!!query);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const selectedSlide = sortedSlides.find(slide => slide.id === selectedSlideId) || null;
  const filteredSlides = sortedSlides.filter(slide =>
    slide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    slide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchProps = {
    isSearchActive, 
    setIsSearchActive,
    searchQuery, 
    handleSearchChange, 
    handleSearchCommit, 
    handleCloseSearch, 
    searchInputRef
  };

  return (
    <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
      <AppHeader 
        title="PRESENTATIONS" 
        onBack={onBack} 
        user={user}
        showSearch={true}
        searchProps={searchProps}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
        <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-5xl font-bold text-center text-blue-900 mb-8 font-cycle-animation">PRESENTATIONS</h2>
            {filteredSlides.length > 0 ? (
                filteredSlides.map((slide) => (<SlideCard key={slide.id} slide={slide} onSelect={() => handleSelectSlide(slide.id)} onShowNotification={showNotification} />))
            ) : (<div className="text-center p-8 backdrop-blur-lg bg-white/30 border border-white/20 rounded-2xl"><h3 className="text-2xl font-bold text-blue-900">No Presentations Found</h3><p className="text-blue-800/90 mt-2">Try adjusting your search query.</p></div>)}
        </div>
      </main>
      {selectedSlide && <SlideViewer slide={selectedSlide} onClose={handleCloseSlide} />}
      {notification && <Toast message={notification} onDismiss={() => setNotification(null)} />}
      <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
          <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PresentationShowcaseApp;