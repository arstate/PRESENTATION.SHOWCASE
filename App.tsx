

import React from 'react';
import { useState, useRef, useEffect } from 'react';
import SlideCard from './components/SlideCard';
import SlideViewer from './components/SlideViewer';
import { Slide } from './types';

// Declare global libraries from CDN
declare const pdfjsLib: any;
declare const PDFLib: any;

type AppKey = 'showcase' | 'shortlink' | 'pdfmerger' | 'gphotos';

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
  const getSearchFromHash = (hash: string): string => {
    const searchPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    return params.get('search') || '';
  };

  const [selectedSlideId, setSelectedSlideId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => getSearchFromHash(window.location.hash));
  const [isSearchActive, setIsSearchActive] = useState(() => !!getSearchFromHash(window.location.hash));
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSlide = (id: number) => setSelectedSlideId(id);
  const handleCloseSlide = () => setSelectedSlideId(null);
  const handleSearchIconClick = () => setIsSearchActive(true);

  const handleSearchCommit = () => {
    const hashParts = window.location.hash.split('?');
    const basePath = hashParts[0]; // e.g., #/showcase
    const params = new URLSearchParams(hashParts[1] || '');

    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
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
            
            // FIX: The entire `apiUrl` must be URI-encoded when passed as a query parameter to the proxy service.
            // This prevents the `&` characters within `apiUrl` from being misinterpreted by the proxy.
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`Proxy service returned an error: ${response.status}`);
            }
            
            const data = await response.json();

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
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to connect to the shortening service.';
            if (message === 'Failed to fetch') {
                setError('Failed to process link: Could not connect to the proxy service. It may be offline.');
            } else {
                setError(`Failed to process link: ${message}`);
            }
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


// --- SUB-APP: PDF MERGER ---
interface ManagedFile {
  id: string;
  file: File;
  thumbnail: string;
  type: 'pdf' | 'image';
}

const PDFMergerApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [files, setFiles] = useState<ManagedFile[]>([]);
    const [outputFilename, setOutputFilename] = useState('merged');
    const [isMerging, setIsMerging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [previewFile, setPreviewFile] = useState<ManagedFile | null>(null);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [mergeCompleted, setMergeCompleted] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
    }, []);

    const generateThumbnail = async (file: File, type: 'pdf' | 'image'): Promise<string> => {
        if (type === 'image') {
            return URL.createObjectURL(file);
        }
        if (type === 'pdf') {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                return canvas.toDataURL();
            } catch (e) {
                console.error('Failed to generate PDF thumbnail', e);
                return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUteCI+PHBhdGggZD0iTTE0LjUgMiBITFA1YTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxMGEyIDIgMCAwIDAgMi0yVjcuNVoiLz48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDggMjAgOCIvPjxwYXRoIGQ9Im0xNCAxNC00IDQiLz48cGF0aCBkPSJtMTAgMTRsNCA0Ii8+PC9zdmc+'; // Error icon
            }
        }
        return '';
    };

    const handleFiles = async (incomingFiles: File[]) => {
        if (!incomingFiles || incomingFiles.length === 0) {
            return;
        }

        setIsProcessing(true);
        setError('');

        const newManagedFiles: ManagedFile[] = [];
        let rejectedFileCount = 0;

        for (const file of incomingFiles) {
            const name = file.name.toLowerCase();
            const type = file.type;
            let determinedType: 'pdf' | 'image' | null = null;

            // Prioritize extension check, as it's more reliable for drag-and-drop
            if (name.endsWith('.pdf')) {
                determinedType = 'pdf';
            } else if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
                determinedType = 'image';
            } else if (type === 'application/pdf') {
                determinedType = 'pdf';
            } else if (type === 'image/jpeg' || type === 'image/png') {
                determinedType = 'image';
            }

            if (determinedType) {
                const thumbnail = await generateThumbnail(file, determinedType);
                newManagedFiles.push({
                    id: `${file.name}-${Date.now()}-${Math.random()}`,
                    file,
                    thumbnail,
                    type: determinedType,
                });
            } else {
                rejectedFileCount++;
            }
        }

        if (newManagedFiles.length > 0) {
            setFiles(prev => [...prev, ...newManagedFiles]);
        }

        if (rejectedFileCount > 0) {
            setError('Some files were ignored. Only PDF, JPG, and PNG files are supported.');
        }
        
        setIsProcessing(false);
    };

    const handleRemoveFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };
    
    const handleStartOver = () => {
        setFiles([]);
        setError('');
        setMergeCompleted(false);
    };
    
    const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOutputFilename(e.target.value);
    };

    const handleMerge = async () => {
        if (files.length === 0) {
            setError('Please add files to merge.');
            return;
        }
        setIsMerging(true);
        setError('');
        setMergeCompleted(false);
        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();

            for (const managedFile of files) {
                const fileBytes = await managedFile.file.arrayBuffer();
                if (managedFile.type === 'pdf') {
                    const pdfDoc = await PDFDocument.load(fileBytes);
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                } else {
                    const name = managedFile.file.name.toLowerCase();
                    const type = managedFile.file.type;
                    const image = (type === 'image/png' || name.endsWith('.png'))
                        ? await mergedPdf.embedPng(fileBytes) 
                        : await mergedPdf.embedJpg(fileBytes);
                    
                    const page = mergedPdf.addPage([image.width, image.height]);
                    
                    page.drawImage(image, {
                        x: 0,
                        y: 0,
                        width: image.width,
                        height: image.height,
                    });
                }
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${outputFilename || 'merged'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setMergeCompleted(true);
        } catch (e) {
            console.error(e);
            setError('An error occurred while merging the files. One of the images may be in an unsupported format.');
        } finally {
            setIsMerging(false);
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragReorder = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedItemId || draggedItemId === targetId) {
            return;
        }
        const draggedIndex = files.findIndex(f => f.id === draggedItemId);
        const targetIndex = files.findIndex(f => f.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            return;
        }
        const newFiles = [...files];
        const [draggedItem] = newFiles.splice(draggedIndex, 1);
        newFiles.splice(targetIndex, 0, draggedItem);
        setFiles(newFiles);
    };

    const handleDragEnd = () => {
        setDraggedItemId(null);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };


    const FilePreviewModal: React.FC<{file: ManagedFile, onClose: () => void}> = ({ file, onClose }) => {
      const objectUrl = React.useMemo(() => URL.createObjectURL(file.file), [file]);
      useEffect(() => {
        return () => URL.revokeObjectURL(objectUrl);
      }, [objectUrl]);

      return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose} role="dialog">
            <div className="relative w-full max-w-4xl h-[85vh] bg-gray-900 rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {file.type === 'image' ? (
                   <img src={objectUrl} alt={file.file.name} className="w-full h-full object-contain" />
                ) : (
                   <iframe src={objectUrl} title={file.file.name} className="w-full h-full border-0" />
                )}
                <button onClick={onClose} className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-full text-white bg-black/50 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white" aria-label="Close preview">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
      );
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">PDF MERGER</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Merge PDFs & Images</h2>
                    
                    <div 
                        className="mb-6"
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" ref={fileInputRef} onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} className="hidden" />
                        <div
                             onClick={() => fileInputRef.current?.click()}
                             role="button"
                             aria-label="File upload area"
                             className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${
                                isDraggingOver
                                    ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner'
                                    : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'
                             }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="font-semibold text-center">
                                {isDraggingOver ? 'Drop files here' : 'Click to upload files'}
                            </span>
                            <span className="text-sm text-blue-900/70 text-center">
                                {!isDraggingOver && 'or drag and drop PDFs, JPGs, or PNGs here'}
                            </span>
                        </div>
                    </div>

                    {isProcessing && <div className="text-center my-4 text-blue-900">Processing files...</div>}

                    <div className="min-h-[100px] space-y-3">
                        {files.map((managedFile) => (
                            <div 
                                key={managedFile.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, managedFile.id)}
                                onDragOver={(e) => handleDragReorder(e, managedFile.id)}
                                onDrop={handleDragEnd}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center p-3 rounded-lg bg-white/70 shadow transition-all duration-300 ease-in-out cursor-grab ${draggedItemId === managedFile.id ? 'opacity-50 scale-105' : ''}`}
                            >
                                <button onClick={() => setPreviewFile(managedFile)} className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 border-white shadow-sm mr-4 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                    <img src={managedFile.thumbnail} alt={managedFile.file.name} className="w-full h-full object-cover" />
                                </button>
                                <div className="flex-grow text-sm font-medium text-blue-900 truncate">{managedFile.file.name}</div>
                                <button onClick={() => handleRemoveFile(managedFile.id)} className="ml-4 p-2 rounded-full text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {files.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-brand-blue/20">
                             <div>
                                <label htmlFor="outputFilename" className="block text-sm font-medium text-blue-900/90 mb-2">Output Filename</label>
                                <div className="flex items-center rounded-lg border-2 border-transparent bg-white/50 focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-brand-blue transition">
                                    <input
                                        id="outputFilename"
                                        type="text"
                                        value={outputFilename}
                                        onChange={handleFilenameChange}
                                        className="w-full px-4 py-3 bg-transparent focus:outline-none"
                                        aria-describedby="file-extension"
                                    />
                                    <span id="file-extension" className="pr-4 py-3 text-gray-500 font-medium">.pdf</span>
                                </div>
                            </div>
                            <div className="mt-6 space-y-4">
                                <button onClick={handleMerge} disabled={isMerging} className="w-full bg-brand-blue text-white font-bold px-6 py-4 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg">
                                    {isMerging ? (<svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : `Merge & Download (${files.length} files)`}
                                </button>
                                {mergeCompleted && (
                                    <button onClick={handleStartOver} className="w-full bg-brand-yellow text-blue-900 font-bold px-6 py-4 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition text-lg">
                                        Start Over
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
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

// --- SUB-APP: GOOGLE PHOTOS EMBEDDER ---
interface PhotoResult {
    highResUrl: string;
    previewUrl: string;
    embedCode: string;
}

const GooglePhotosEmbedderApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [googlePhotosUrl, setGooglePhotosUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});
    const [results, setResults] = useState<PhotoResult[] | null>(null);

    const resetState = () => {
        setError('');
        setResults(null);
        setIsCopied({});
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        resetState();
        setIsLoading(true);

        if (!googlePhotosUrl || !googlePhotosUrl.startsWith('https://photos.app.goo.gl/')) {
            setError('Please enter a valid Google Photos share URL.');
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(googlePhotosUrl)}`;
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Proxy service returned an error: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            if (!htmlContent) {
                throw new Error('Proxy service did not return any content.');
            }

            // --- NEW, MORE ROBUST LOGIC ---
            // This regex targets the long, unique base URLs of photos found inside the page's
            // JavaScript data blobs, which is where all album photo URLs are stored.
            // It looks for URLs starting with "https://lh3.googleusercontent.com/",
            // optionally followed by "pw/" or "d/", and then a long ID (40+ chars)
            // to specifically identify photos and ignore other images like avatars.
            const albumImageRegex = /"(https:\/\/lh3\.googleusercontent\.com\/(?:pw\/|d\/)?[a-zA-Z0-9\-_]{40,})[^"]*"/g;
            const matches = [...htmlContent.matchAll(albumImageRegex)];
            const uniqueBaseUrls = new Set<string>();

            if (matches.length > 0) {
                matches.forEach(match => {
                    // match[1] is the clean base URL we want.
                    uniqueBaseUrls.add(match[1]);
                });
            } else {
                // --- FALLBACK LOGIC: For single images or if the primary regex fails ---
                const ogImageMatch = htmlContent.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
                if (ogImageMatch && ogImageMatch[1]) {
                    const imageUrl = ogImageMatch[1];
                    const baseUrl = imageUrl.split('=')[0];
                    uniqueBaseUrls.add(baseUrl);
                }
            }
            
            if (uniqueBaseUrls.size === 0) {
                 throw new Error('Could not extract any images from the URL. Please ensure it is a valid and public Google Photos link.');
            }

            const photoResults: PhotoResult[] = Array.from(uniqueBaseUrls).map(baseUrl => {
                const highResUrl = `${baseUrl}=w2400`;
                const previewUrl = `${baseUrl}=w600`;
                const embedCode = `<a href="${highResUrl}" target="_blank" rel="noopener noreferrer"><img src="${previewUrl}" alt="Embedded from Google Photos" loading="lazy" style="max-width:100%; height:auto; border-radius: 8px;" /></a>`;
                return { highResUrl, previewUrl, embedCode };
            });
            
            setResults(photoResults);

        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            
            if (err.name === 'AbortError') {
                 setError('Failed to process link: The request timed out. The album may be too large or the proxy service is slow.');
            } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
                setError('Failed to process link: Could not connect to the proxy service. It may be offline or blocking requests.');
            } else {
                setError(`Failed to process link: ${message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = (textToCopy: string, key: string) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setIsCopied(prev => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setIsCopied(prev => ({ ...prev, [key]: false }));
            }, 2000);
        });
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">GOOGLE PHOTOS EMBEDDER</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-4xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <form onSubmit={handleGenerate}>
                        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">Generate Google Photos Link</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="gphotosUrlInput" className="block text-sm font-medium text-blue-900/90 mb-2">Enter Google Photos URL <span className="text-red-500">*</span></label>
                                <input id="gphotosUrlInput" type="url" value={googlePhotosUrl} onChange={(e) => setGooglePhotosUrl(e.target.value)} placeholder="https://photos.app.goo.gl/..." required className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                            </div>
                            <div>
                                <button type="submit" disabled={isLoading} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? (<svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : 'Generate'}
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

                    {results && results.length > 0 && (
                        <div className="mt-6 space-y-6 p-4 bg-blue-50 border border-brand-blue/20 rounded-lg">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                               <h3 className="text-xl font-bold text-blue-900">Found {results.length} image{results.length > 1 ? 's' : ''}</h3>
                                {results.length > 1 && (
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <button onClick={() => handleCopy(results.map(r => r.highResUrl).join('\n'), 'all-direct')} className={`w-full sm:w-auto flex-shrink-0 text-center px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isCopied['all-direct'] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                            {isCopied['all-direct'] ? 'Copied Links!' : 'Copy All Direct Links'}
                                        </button>
                                        <button onClick={() => handleCopy(results.map(r => r.embedCode).join('\n\n'), 'all-embed')} className={`w-full sm:w-auto flex-shrink-0 text-center px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isCopied['all-embed'] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-blue text-white hover:bg-blue-600 focus:ring-brand-blue'}`}>
                                            {isCopied['all-embed'] ? 'Copied All!' : 'Copy All Embed Codes'}
                                        </button>
                                    </div>
                                )}
                            </div>
                           
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.map((result, index) => (
                                    <div key={index} className="p-4 bg-white/70 rounded-lg shadow-md space-y-3">
                                        <a href={result.highResUrl} target="_blank" rel="noopener noreferrer" className="block">
                                            <img src={result.previewUrl} alt={`Preview ${index + 1}`} className="w-full h-40 object-cover rounded-md shadow-sm border-2 border-white" />
                                        </a>
                                        <div className="space-y-2">
                                            <button onClick={() => handleCopy(result.highResUrl, `direct-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`direct-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                                {isCopied[`direct-${index}`] ? 'Copied Link!' : 'Copy Direct Link'}
                                            </button>
                                            <button onClick={() => handleCopy(result.embedCode, `embed-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`embed-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                                {isCopied[`embed-${index}`] ? 'Copied Code!' : 'Copy Embed Code'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                {/* FIX: Corrected a typo from `hh2` to `h2` for a valid HTML element. */}
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
                 <AppCard 
                    title="PDF Merger"
                    description="Combine PDFs and images into a single PDF file."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /><path d="M9 17h6" /></svg>}
                    onClick={() => onSelectApp('pdfmerger')}
                />
                 <AppCard 
                    title="Google Photos Embedder"
                    description="Generate direct links and embed codes for your Google Photos."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    onClick={() => onSelectApp('gphotos')}
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