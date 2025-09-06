import React, { useState, useRef, useEffect } from 'react';
import SlideCard from './components/SlideCard';
import SlideViewer from './components/SlideViewer';
import { Slide } from './types';

type AppKey = 'showcase' | 'shortlink';

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
  if (semesterA !== semesterB) return semesterB - semesterA;
  return a.title.localeCompare(b.title);
});

// --- SUB-APP: PRESENTATION SHOWCASE ---
const PresentationShowcaseApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('search');
    if (query) {
      setSearchQuery(query);
      setIsSearchActive(true);
    }
  }, []);

  const handleSelectSlide = (id: number) => setSelectedSlideId(id);
  const handleCloseSlide = () => setSelectedSlideId(null);
  const handleSearchIconClick = () => setIsSearchActive(true);

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
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    window.history.pushState({}, '', url.toString());
  };

  useEffect(() => {
    if (isSearchActive) {
      setTimeout(() => searchInputRef.current?.focus(), 400);
    }
  }, [isSearchActive]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('search') || '';
      setSearchQuery(query);
      setIsSearchActive(!!query);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
            <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isSearchActive ? 'w-0 opacity-0 pointer-events-none sm:w-auto sm:opacity-100 sm:pointer-events-auto' : 'w-auto opacity-100'}`}>
              <h1 className="text-2xl font-bold text-blue-900 whitespace-nowrap">PRESENTATIONS</h1>
            </div>
            <div className="relative flex items-center justify-end flex-1">
              <div className={`flex items-center h-10 transition-all duration-400 ease-in-out ${isSearchActive ? 'w-full max-w-xs bg-white rounded-full shadow-md' : 'w-10 bg-white rounded-full shadow-sm hover:shadow-md'}`}>
                <div className="relative w-full h-full">
                  <button onClick={handleSearchIconClick} disabled={isSearchActive} className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-500 focus:outline-none transition-all duration-400 ease-in-out ${isSearchActive ? 'left-1 cursor-default' : 'left-0'}`} aria-label="Search presentations">
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <input ref={searchInputRef} type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={handleSearchCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleSearchCommit(); (e.target as HTMLInputElement).blur(); } }} className={`w-full h-full bg-transparent py-2 transition-all duration-400 ease-in-out focus:outline-none text-gray-800 ${isSearchActive ? 'pl-10 pr-8 opacity-100' : 'pl-8 opacity-0 pointer-events-none'}`} aria-hidden={!isSearchActive} />
                  {isSearchActive && (<button onMouseDown={(e) => e.preventDefault()} onClick={handleCloseSearch} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800 focus:outline-none rounded-full" aria-label="Close search bar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
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
                filteredSlides.map((slide) => (<SlideCard key={slide.id} slide={slide} onSelect={() => handleSelectSlide(slide.id)}/>))
            ) : (<div className="text-center p-8 backdrop-blur-lg bg-white/30 border border-white/20 rounded-2xl"><h3 className="text-2xl font-bold text-blue-900">No Presentations Found</h3><p className="text-blue-800/90 mt-2">Try adjusting your search query.</p></div>)}
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

// --- SUB-APP: SHORT LINK GENERATOR ---
const ShortLinkGeneratorApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [longUrl, setLongUrl] = useState('');
    const [customAlias, setCustomAlias] = useState('');
    const [shortUrl, setShortUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isDownloadingQr, setIsDownloadingQr] = useState(false);

    const handleShorten = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setShortUrl('');
        setQrCodeUrl('');
        setIsLoading(true);
        setIsCopied(false);

        if (!longUrl) {
            setError('Please enter a URL.');
            setIsLoading(false);
            return;
        }

        try {
            let apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
            if (customAlias.trim()) {
                apiUrl += `&shorturl=${encodeURIComponent(customAlias.trim())}`;
            }

            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
            
            const response = await fetch(proxyUrl);
             if (!response.ok) {
                throw new Error(`Proxy service returned an error: ${response.statusText}`);
            }
            const proxyData = await response.json();

            if (proxyData.contents) {
                const data = JSON.parse(proxyData.contents);
                if (data.shorturl) {
                    setShortUrl(data.shorturl);
                    
                    const qrApiBaseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
                    const qrData = encodeURIComponent(data.shorturl);
                    const qrSize = '256x256'; // Standard size for display
                    const qrColor = '0a2342'; // Dark blue
                    const qrBgColor = 'ffffff'; // White
                    const qrMargin = 2;

                    const qrUrl = `${qrApiBaseUrl}?data=${qrData}&size=${qrSize}&color=${qrColor}&bgcolor=${qrBgColor}&margin=${qrMargin}`;
                    setQrCodeUrl(qrUrl);

                } else if (data.errormessage) {
                    setError(data.errormessage);
                } else {
                    setError('An unknown error occurred with the shortening service.');
                }
            } else {
                 throw new Error('Proxy service did not return the expected content.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to connect to the shortening service.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if(shortUrl) {
            navigator.clipboard.writeText(shortUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleQrDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (!shortUrl || isDownloadingQr) return;

        setIsDownloadingQr(true);
        try {
            // Construct a new URL for the high-resolution QR code for download
            const qrApiBaseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
            const qrData = encodeURIComponent(shortUrl);
            const highResSize = '1000x1000'; // High resolution for download
            const qrColor = '0a2342';
            const qrBgColor = 'ffffff';
            const qrMargin = 2;

            const downloadUrl = `${qrApiBaseUrl}?data=${qrData}&size=${highResSize}&color=${qrColor}&bgcolor=${qrBgColor}&margin=${qrMargin}`;
            
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch QR code image.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const filename = `qrcode-${customAlias.trim() || shortUrl.split('/').pop()}.png`;
            link.setAttribute('download', filename);
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (downloadError) {
            console.error("QR Download failed:", downloadError);
            setError('Could not download the QR code. Please try again.');
        } finally {
            setIsDownloadingQr(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">SHORT LINK GENERATOR</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <form onSubmit={handleShorten}>
                        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">Shorten a Long URL</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="longUrlInput" className="block text-sm font-medium text-blue-900/90 mb-2">Enter Long URL <span className="text-red-500">*</span></label>
                                <input id="longUrlInput" type="url" value={longUrl} onChange={(e) => setLongUrl(e.target.value)} placeholder="https://example.com/very/long/url" required className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                            </div>
                            <div>
                                <label htmlFor="customAliasInput" className="block text-sm font-medium text-blue-900/90 mb-2">Custom Alias (Optional)</label>
                                <input id="customAliasInput" type="text" value={customAlias} onChange={(e) => setCustomAlias(e.target.value)} placeholder="my-cool-link" className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                            </div>
                            <div>
                                <button type="submit" disabled={isLoading} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? (<svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : 'Shorten'}
                                </button>
                            </div>
                        </div>
                    </form>
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    {shortUrl && (
                        <div className="mt-6 p-4 bg-blue-50 border border-brand-blue/20 rounded-lg">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex-1 w-full">
                                    <p className="text-sm text-blue-800">Your shortened link:</p>
                                    <div className="flex items-center justify-between gap-4 mt-2">
                                        <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-brand-blue break-all hover:underline">{shortUrl}</a>
                                        <button onClick={handleCopy} className={`w-24 text-center px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isCopied ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                            {isCopied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                {qrCodeUrl && (
                                    <div className="flex-shrink-0 text-center">
                                        <img src={qrCodeUrl} alt="QR Code for shortened link" className="w-32 h-32 mx-auto border-4 border-white rounded-lg shadow-md" />
                                        <a 
                                           href={qrCodeUrl} 
                                           onClick={handleQrDownload}
                                           className={`mt-2 inline-block bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition ${isDownloadingQr ? 'opacity-50 cursor-not-allowed' : ''}`}
                                           aria-disabled={isDownloadingQr}
                                        >
                                            {isDownloadingQr ? 'Downloading...' : 'Download QR'}
                                        </a>
                                        <p className="text-mt-2 text-xs text-red-600 font-semibold">Kode QR setelah 13 hari akan terhapus!!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
             <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
                  <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
                </div>
              </footer>
        </div>
    );
};

// --- HOME SCREEN / APP HUB ---
const AppCard: React.FC<{title: string, description: string, icon: JSX.Element, onClick: () => void}> = ({ title, description, icon, onClick }) => (
    <button onClick={onClick} className="group relative w-full text-left p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out backdrop-blur-lg bg-white/30 border border-white/20 hover:bg-brand-yellow hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50" aria-label={`Open ${title} app`}>
        <div className="flex items-start gap-6">
            <div className="flex-shrink-0 text-brand-blue group-hover:text-blue-900 transition-colors duration-300">{icon}</div>
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 transition-colors duration-300">{title}</h2>
                <p className="text-md text-blue-800/90 font-medium transition-colors duration-300">{description}</p>
            </div>
        </div>
    </button>
);

const HomeScreen: React.FC<{ onSelectApp: (appKey: AppKey) => void }> = ({ onSelectApp }) => (
    <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
        <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center py-4">
                    <h1 className="text-3xl font-bold text-blue-900">Arstate Apps</h1>
                </div>
            </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
            <div className="max-w-3xl mx-auto space-y-8">
                <AppCard 
                    title="Presentation Showcase"
                    description="A curated list of my PPT slides and presentations."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    onClick={() => onSelectApp('showcase')}
                />
                <AppCard 
                    title="Short Link Generator"
                    description="Create short, shareable URLs from long links instantly."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                    onClick={() => onSelectApp('shortlink')}
                />
            </div>
        </main>
        <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
              <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
            </div>
        </footer>
    </div>
);


// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
    const [activeApp, setActiveApp] = useState<AppKey | null>(null);

    const handleBack = () => {
        setActiveApp(null);
    }

    if (activeApp === 'showcase') {
        return <PresentationShowcaseApp onBack={handleBack} />;
    }
    
    if (activeApp === 'shortlink') {
        return <ShortLinkGeneratorApp onBack={handleBack} />;
    }
    
    return <HomeScreen onSelectApp={setActiveApp} />;
};

export default App;