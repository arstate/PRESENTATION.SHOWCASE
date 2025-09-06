import React, { useState, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

interface PhotoResult {
    highResUrl: string;
    previewUrl: string;
    embedCode: string;
}

const FullImagePreview: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
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

    return (
        <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-lg flex items-center justify-center p-4 z-[99999] animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            `}</style>
            <div 
                className="relative max-w-[90vw] max-h-[90vh] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <img 
                    src={imageUrl} 
                    alt="Full size view" 
                    className="block max-w-full max-h-full object-contain rounded-lg border-4 border-white shadow-2xl"
                />
            </div>
             <button 
                onClick={onClose} 
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-white bg-black/40 hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white transition-transform hover:scale-110"
                aria-label="Close image preview"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

const GooglePhotosEmbedderApp: React.FC<{ onBack: () => void, user: User }> = ({ onBack, user }) => {
    const [googlePhotosUrl, setGooglePhotosUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});
    const [results, setResults] = useState<PhotoResult[] | null>(null);
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);

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
            {fullPreviewUrl && <FullImagePreview imageUrl={fullPreviewUrl} onClose={() => setFullPreviewUrl(null)} />}
            
            <AppHeader title="GOOGLE PHOTOS EMBEDDER" onBack={onBack} user={user} />
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
                                        <button
                                            onClick={() => setFullPreviewUrl(result.highResUrl)}
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
                                            <button onClick={() => handleCopy(result.highResUrl, `direct-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`direct-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-yellow text-blue-900 hover:bg-yellow-400 focus:ring-brand-yellow'}`}>
                                                {isCopied[`direct-${index}`] ? 'Copied Link!' : 'Copy Direct Link'}
                                            </button>
                                            <button onClick={() => handleCopy(result.embedCode, `embed-${index}`)} className={`w-full text-center px-3 py-2 text-xs font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${isCopied[`embed-${index}`] ? 'bg-green-500 text-white focus:ring-green-500' : 'bg-brand-blue text-white hover:bg-blue-600 focus:ring-brand-blue'}`}>
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

export default GooglePhotosEmbedderApp;