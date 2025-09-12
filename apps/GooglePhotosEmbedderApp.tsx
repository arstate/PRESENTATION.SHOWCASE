import React, { useState, useEffect, useRef } from 'react';
import AppHeader from '../components/AppHeader';
import { 
    User,
    GPhotosHistoryItem,
    PhotoResult,
    saveToGooglePhotosHistory,
    clearGooglePhotosHistory,
    deleteGooglePhotosHistoryItem
} from '../firebase';

const LOCAL_STORAGE_KEY = 'gphotosHistory';

const FullImagePreview: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);

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

    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);

        try {
            // Use a proxy to bypass potential CORS issues with Google Photos image URLs
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Proxy service error: ${response.status}`);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `arstate-gphoto-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback: Open in new tab for manual save
            window.open(imageUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 z-[999]"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="relative max-w-[90vw] max-h-[90vh] flex flex-col gap-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                    @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                `}</style>
                <div className="checkerboard rounded-lg border-4 border-white shadow-2xl overflow-hidden flex-shrink min-h-0">
                     <img 
                        src={imageUrl} 
                        alt="Full size view" 
                        className="block max-w-full max-h-[75vh] object-contain"
                    />
                </div>
                <div className="flex-shrink-0 flex justify-center items-center gap-4">
                     <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {isDownloading ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                         ) : (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                         )}
                        {isDownloading ? 'Downloading...' : 'Download'}
                    </button>
                     <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 focus:ring-offset-black/50 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
             <button 
                onClick={onClose} 
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-white bg-black/40 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white transition-transform hover:scale-110"
                aria-label="Close image preview"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
};


const ResultsView: React.FC<{
    title: string;
    photos: PhotoResult[];
    albumKey: string;
    isCopied: { [key: string]: boolean };
    handleCopy: (text: string, key: string) => void;
    onEnlarge: (url: string) => void;
}> = ({ title, photos, albumKey, isCopied, handleCopy, onEnlarge }) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-blue-900">{title}</h3>
                {photos.length > 1 && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button onClick={() => handleCopy(photos.map(r => r.highResUrl).join('\n\n'), `${albumKey}-all-direct`)} className={`w-full sm:w-auto flex-shrink-0 text-center px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isCopied[`${albumKey}-all-direct`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                            {isCopied[`${albumKey}-all-direct`] ? 'Copied Links!' : 'Copy All Direct Links'}
                        </button>
                        <button onClick={() => handleCopy(photos.map(r => r.embedCode).join('\n\n'), `${albumKey}-all-embed`)} className={`w-full sm:w-auto flex-shrink-0 text-center px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isCopied[`${albumKey}-all-embed`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-blue text-white hover:bg-blue-600 focus:ring-brand-blue'}`}>
                            {isCopied[`${albumKey}-all-embed`] ? 'Copied All!' : 'Copy All Embed Codes'}
                        </button>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((result, index) => (
                    <div key={index} className="p-4 bg-white/70 rounded-lg shadow-md space-y-3">
                        <button
                            onClick={() => onEnlarge(result.highResUrl)}
                            className="group block w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-lg"
                            aria-label="Enlarge image"
                        >
                            <img 
                                src={result.previewUrl} 
                                className="w-full h-auto rounded-lg display-block transition-transform duration-200 ease-in-out group-hover:scale-105" 
                                alt="Click to enlarge" 
                                loading="lazy" 
                            />
                        </button>
                        <div className="space-y-2">
                            <button onClick={() => handleCopy(result.highResUrl, `${albumKey}-direct-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`${albumKey}-direct-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                {isCopied[`${albumKey}-direct-${index}`] ? 'Copied Link!' : 'Copy Direct Link'}
                            </button>
                            <button onClick={() => handleCopy(result.embedCode, `${albumKey}-embed-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`${albumKey}-embed-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-blue text-white hover:bg-blue-600 focus:ring-brand-blue'}`}>
                                {isCopied[`${albumKey}-embed-${index}`] ? 'Copied Code!' : 'Copy Embed Code'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface GooglePhotosEmbedderAppProps {
    onBack: () => void;
    user: User | null;
    history: GPhotosHistoryItem[];
}

const GooglePhotosEmbedderApp: React.FC<GooglePhotosEmbedderAppProps> = ({ onBack, user, history: firebaseHistory }) => {
    const [googlePhotosUrl, setGooglePhotosUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
    const [guestHistory, setGuestHistory] = useState<GPhotosHistoryItem[]>([]);
    const [viewedHistoryItem, setViewedHistoryItem] = useState<GPhotosHistoryItem | null>(null);
    const historyViewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            try {
                const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (storedHistory) {
                    setGuestHistory(JSON.parse(storedHistory));
                }
            } catch (e) {
                console.error("Failed to parse history from localStorage", e);
                setGuestHistory([]);
            }
        }
    }, [user]);
    
    const history = user ? firebaseHistory : guestHistory;

    useEffect(() => {
        if (viewedHistoryItem) {
            setTimeout(() => {
                historyViewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [viewedHistoryItem]);

    const resetState = () => {
        setError('');
        setIsCopied({});
        setViewedHistoryItem(null);
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

            const albumImageRegex = /"(https:\/\/lh3\.googleusercontent\.com\/(?:pw\/|d\/)?[a-zA-Z0-9\-_]{40,})[^"]*"/g;
            const matches = [...htmlContent.matchAll(albumImageRegex)];
            const uniqueBaseUrls = new Set<string>();

            if (matches.length > 0) {
                matches.forEach(match => {
                    uniqueBaseUrls.add(match[1]);
                });
            } else {
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

            const photoResults: PhotoResult[] = Array.from(uniqueBaseUrls).map((baseUrl, index) => {
                const highResUrl = `${baseUrl}=w2400`;
                const previewUrl = `${baseUrl}=w600`;
                const uniqueId = `gphoto-embed-${Date.now()}-${index}`;

                const embedCode = `<style>.${uniqueId}{display:inline-block;position:relative}.${uniqueId} .thumb{cursor:pointer;max-width:100%;height:auto;border-radius:8px;display:block;transition:transform .2s ease}.${uniqueId} .thumb:hover{transform:scale(1.05)}.${uniqueId} .toggle{display:none}.${uniqueId} .lightbox{display:flex;justify-content:center;align-items:center;position:fixed;z-index:99999;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);overflow:hidden;opacity:0;visibility:hidden;transition:opacity .4s ease,visibility .4s ease;padding:4vmin;box-sizing:border-box;}.${uniqueId} .toggle:checked~.lightbox{opacity:1;visibility:visible}.${uniqueId} .lightbox-bg-close{position:absolute;top:0;left:0;width:100%;height:100%;cursor:pointer;z-index:1}.${uniqueId} .lightbox-content{position:relative;z-index:2;max-width:100%;max-height:100%;cursor:default;transform:scale(.9);opacity:0;transition:transform .4s cubic-bezier(0.175,0.885,0.32,1.275),opacity .3s ease}.${uniqueId} .toggle:checked~.lightbox .lightbox-content{transform:scale(1);opacity:1}.${uniqueId} .lightbox-content img{display:block;max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;border:4px solid #fff;box-shadow:0 10px 40px rgba(0,0,0,0.5)}.${uniqueId} .close{position:absolute;top:1rem;right:1.5rem;font-size:2.5rem;font-weight:bold;color:white;line-height:1;text-shadow:0 2px 4px rgba(0,0,0,0.6);cursor:pointer;z-index:3;transition:transform .2s ease}.${uniqueId} .close:hover{transform:scale(1.1)}</style><div class="${uniqueId}"><label for="${uniqueId}-toggle"><img src="${previewUrl}" class="thumb" alt="Click to enlarge" loading="lazy"></label><input type="checkbox" class="toggle" id="${uniqueId}-toggle"><div class="lightbox"><label for="${uniqueId}-toggle" class="lightbox-bg-close"></label><label for="${uniqueId}-toggle" class="close" title="Close">&times;</label><div class="lightbox-content"><img src="${highResUrl}" alt="Full size view" loading="lazy"></div></div></div>`;

                return { highResUrl, previewUrl, embedCode };
            });

            const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
            const albumTitle = titleMatch ? titleMatch[1].replace(' - Google Photos', '').trim() : `Album from ${new Date().toLocaleDateString()}`;

            const newItem: Omit<GPhotosHistoryItem, 'key'> = {
                id: Date.now(),
                sourceUrl: googlePhotosUrl,
                title: albumTitle,
                type: photoResults.length > 1 ? 'album' : 'single',
                photos: photoResults,
                coverPhotoUrl: photoResults[0]?.previewUrl || ''
            };

            if (user) {
                const savedItem = await saveToGooglePhotosHistory(user.uid, newItem);
                setViewedHistoryItem(savedItem);
            } else {
                const newHistory = [newItem, ...history].slice(0, 50); // Keep history to 50 items for guests
                setGuestHistory(newHistory);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
                setViewedHistoryItem(newItem as GPhotosHistoryItem);
            }


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

    const handleLoadFromHistory = (item: GPhotosHistoryItem) => {
        setError('');
        setIsCopied({});
        setViewedHistoryItem(item);
    };

    const handleClearHistory = () => {
        if (user) {
            clearGooglePhotosHistory(user.uid);
        } else {
            setGuestHistory([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const handleDeleteHistoryItem = (itemToDelete: GPhotosHistoryItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete "${itemToDelete.title}" from your history?`)) {
            if (user) {
                if (itemToDelete.key) {
                    deleteGooglePhotosHistoryItem(user.uid, itemToDelete.key)
                        .catch(err => {
                            console.error(err);
                            setError("Failed to delete history item.");
                        });
                }
            } else {
                const newHistory = guestHistory.filter(item => item.id !== itemToDelete.id);
                setGuestHistory(newHistory);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            {fullPreviewUrl && <FullImagePreview imageUrl={fullPreviewUrl} onClose={() => setFullPreviewUrl(null)} />}
            
            <AppHeader title="GOOGLE PHOTOS EMBEDDER" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
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
                </div>

                <div className="w-full max-w-4xl mx-auto mt-12 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-blue-900">History</h3>
                        {history.length > 0 && (
                            <button onClick={handleClearHistory} className="text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:underline">
                                Clear History
                            </button>
                        )}
                    </div>
                    {history.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {history.map(item => (
                                <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-200 shadow-md">
                                    <img src={item.coverPhotoUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-center space-y-1">
                                        <p className="text-white text-xs font-bold line-clamp-2 mb-1">{item.title}</p>
                                        <p className="text-white/80 text-xs mb-2">{item.photos.length} photo{item.photos.length > 1 ? 's' : ''}</p>
                                        <button onClick={() => handleLoadFromHistory(item)} className="w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors bg-brand-blue text-white hover:bg-blue-600 focus:ring-brand-blue">
                                            View
                                        </button>
                                        {item.type === 'album' && (
                                            <>
                                                <button onClick={() => handleCopy(item.photos.map(p => p.highResUrl).join('\n\n'), `history-links-${item.id}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`history-links-${item.id}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                                    {isCopied[`history-links-${item.id}`] ? 'Copied!' : 'Copy All Links'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteHistoryItem(item, e)}
                                        className="absolute top-1 right-1 z-10 w-6 h-6 bg-red-600/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                                        aria-label={`Delete history item: ${item.title}`}
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 rounded-lg bg-white/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <h4 className="mt-2 text-lg font-medium text-blue-900">History is empty</h4>
                            <p className="mt-1 text-sm text-blue-800/80">Links you generate will appear here.</p>
                        </div>
                    )}
                </div>

                <div ref={historyViewRef} className="w-full max-w-4xl mx-auto">
                    {viewedHistoryItem && (
                         <div className="mt-8 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-brand-blue/30">
                            <div className="flex justify-between items-start mb-4 gap-4">
                                <h3 className="text-xl font-bold text-blue-900">Viewing: <span className="font-medium">{viewedHistoryItem.title}</span></h3>
                                <button onClick={() => setViewedHistoryItem(null)} className="flex-shrink-0 text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:underline">
                                    Close View
                                </button>
                            </div>
                             <ResultsView
                                title={`${viewedHistoryItem.photos.length} image${viewedHistoryItem.photos.length > 1 ? 's' : ''}`}
                                photos={viewedHistoryItem.photos}
                                albumKey={`history-${viewedHistoryItem.id}`}
                                isCopied={isCopied}
                                handleCopy={handleCopy}
                                onEnlarge={setFullPreviewUrl}
                            />
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

export default GooglePhotosEmbedderApp;