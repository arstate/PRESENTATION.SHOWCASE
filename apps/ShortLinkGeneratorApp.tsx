import React, { useState } from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

type Provider = 'is.gd' | 'v.gd' | 'tinyurl.com' | '9qr.de';

const providers: { key: Provider; name: string; info?: string }[] = [
    { key: 'is.gd', name: 'is.gd' },
    { key: 'v.gd', name: 'v.gd' },
    { key: '9qr.de', name: '9qr.de', info: 'No custom alias' },
    { key: 'tinyurl.com', name: 'tinyurl.com' },
];

const ShortLinkGeneratorApp: React.FC<{ onBack: () => void, user: User | null }> = ({ onBack, user }) => {
    const [provider, setProvider] = useState<Provider>('is.gd');
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
            let finalShortUrl: string | null = null;
            const trimmedAlias = customAlias.trim();

            if (provider === 'is.gd' || provider === 'v.gd') {
                let apiUrl = `https://${provider}/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
                if (trimmedAlias) {
                    apiUrl += `&shorturl=${encodeURIComponent(trimmedAlias)}`;
                }
                const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Proxy service returned an error: ${response.status}`);
                const data = await response.json();
                if (data.shorturl) {
                    finalShortUrl = data.shorturl;
                } else if (data.errormessage) {
                    throw new Error(data.errormessage);
                }
            } else if (provider === 'tinyurl.com') {
                let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
                if (trimmedAlias) {
                    apiUrl += `&alias=${encodeURIComponent(trimmedAlias)}`;
                }
                const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Proxy service returned an error: ${response.status}`);
                const textResponse = await response.text();
                if (textResponse.toLowerCase().includes('error')) {
                    throw new Error(textResponse);
                }
                finalShortUrl = textResponse;
            } else if (provider === '9qr.de') {
                if (trimmedAlias) {
                    setError('Custom aliases are not supported for the 9qr.de provider.');
                    setIsLoading(false);
                    return;
                }
                const apiUrl = `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(longUrl)}`;
                const response = await fetch(apiUrl); // Direct call, no proxy needed
                if (!response.ok) throw new Error(`API service returned an error: ${response.status}`);
                const data = await response.json();
                if (data.ok && data.result.full_short_link2) {
                    finalShortUrl = data.result.full_short_link2;
                } else {
                    throw new Error(data.error || 'Unknown error from shrtco.de API');
                }
            }


            if (finalShortUrl) {
                setShortUrl(finalShortUrl);
                
                const qrApiBaseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
                const qrData = encodeURIComponent(finalShortUrl);
                const qrSize = '256x256';
                const qrColor = '0a2342';
                const qrBgColor = 'ffffff';
                const qrMargin = 2;

                const qrUrl = `${qrApiBaseUrl}?data=${qrData}&size=${qrSize}&color=${qrColor}&bgcolor=${qrBgColor}&margin=${qrMargin}`;
                setQrCodeUrl(qrUrl);

            } else {
                throw new Error('An unknown error occurred with the shortening service.');
            }
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Failed to connect to the shortening service.';
            if (message.includes('Failed to fetch')) {
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
            const qrApiBaseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
            const qrData = encodeURIComponent(shortUrl);
            const highResSize = '1000x1000';
            const qrColor = '0a2342';
            const qrBgColor = 'ffffff';
            const qrMargin = 2;

            const downloadUrl = `${qrApiBaseUrl}?data=${qrData}&size=${highResSize}&color=${qrColor}&bgcolor=${qrBgColor}&margin=${qrMargin}`;
            
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error('Failed to fetch QR code image.');
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
            <AppHeader title="SHORT LINK GENERATOR" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <form onSubmit={handleShorten}>
                        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6">Shorten a Long URL</h2>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="provider-select" className="block text-sm font-medium text-blue-900/90 mb-2">Provider</label>
                                <div className="relative">
                                    <select
                                        id="provider-select"
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value as Provider)}
                                        className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition appearance-none"
                                    >
                                        {providers.map((p) => (
                                            <option key={p.key} value={p.key}>
                                                {p.name} {p.info ? `(${p.info})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-blue">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="longUrlInput" className="block text-sm font-medium text-blue-900/90 mb-2">Enter Long URL <span className="text-red-500">*</span></label>
                                <input id="longUrlInput" type="url" value={longUrl} onChange={(e) => setLongUrl(e.target.value)} placeholder="https://example.com/very/long/url" required className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                            </div>
                            {provider !== '9qr.de' && (
                                <div>
                                    <label htmlFor="customAliasInput" className="block text-sm font-medium text-blue-900/90 mb-2">Custom Alias (Optional)</label>
                                    <input id="customAliasInput" type="text" value={customAlias} onChange={(e) => setCustomAlias(e.target.value)} placeholder="my-cool-link" className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                                </div>
                            )}
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

export default ShortLinkGeneratorApp;