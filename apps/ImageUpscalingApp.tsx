import React, { useState, useRef, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { User, onImageUpscalingHistoryChange, saveImageUpscalingToHistory, clearImageUpscalingHistory } from '../firebase';

const API_KEY = '61d66cf018dd038e8569f31701128334d62728daed1d18f2a3ea4dec5590cb0793eb09c3cb92e4b1d3e41e7710692f99';
const API_ENDPOINT = 'https://clipdrop-api.co/image-upscaling/v1/upscale';

export type HistoryItem = {
    id: number;
    key?: string; // Firebase key
    originalImage: string; // base64
    resultImage: string; // base64
    originalFilename: string;
    targetWidth: number;
    targetHeight: number;
};

const LOCAL_STORAGE_KEY = 'imageUpscalingHistory';

// --- Helper Functions ---
const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// --- Full Screen Preview Modal ---
const ImagePreviewModal: React.FC<{ item: HistoryItem; onClose: () => void; }> = ({ item, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleDownload = () => {
        try {
            const blob = dataURLToBlob(item.resultImage);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const originalName = item.originalFilename.substring(0, item.originalFilename.lastIndexOf('.')) || item.originalFilename;
            link.download = `upscaled-${originalName}-${item.targetWidth}x${item.targetHeight}.png`; // Assume PNG output
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            // Optionally, show an error to the user
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
                        src={item.resultImage}
                        alt="Upscaled image preview"
                        className="block max-w-full max-h-[75vh] object-contain"
                    />
                </div>
                <div className="flex-shrink-0 flex justify-center items-center gap-4">
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black/50 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

const ImageUpscalingApp: React.FC<{ onBack: () => void, user: User | null }> = ({ onBack, user }) => {
    const [file, setFile] = useState<File | null>(null);
    const [original, setOriginal] = useState<{ url: string; width: number; height: number; size: number; } | null>(null);
    const [result, setResult] = useState<{ url: string; size: number; } | null>(null);
    const [targetWidth, setTargetWidth] = useState<number>(0);
    const [targetHeight, setTargetHeight] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            const unsubscribe = onImageUpscalingHistoryChange(user.uid, setHistory);
            return () => unsubscribe();
        } else {
            try {
                const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (storedHistory) setHistory(JSON.parse(storedHistory));
            } catch (e) { console.error(e); }
        }
    }, [user]);

    useEffect(() => {
        return () => {
            if (original?.url) URL.revokeObjectURL(original.url);
            if (result?.url) URL.revokeObjectURL(result.url);
        };
    }, [original?.url, result?.url]);

    const handleStartOver = () => {
        setFile(null);
        setOriginal(null);
        setResult(null);
        setIsLoading(false);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return;

        handleStartOver();

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
            return;
        }

        const MAX_SIZE_BYTES = 30 * 1024 * 1024;
        if (selectedFile.size > MAX_SIZE_BYTES) {
            setError(`File is too large (${formatBytes(selectedFile.size)}). Maximum size is 30 MB.`);
            return;
        }
        
        const img = new Image();
        const url = URL.createObjectURL(selectedFile);
        img.onload = () => {
            setFile(selectedFile);
            setOriginal({ url, width: img.width, height: img.height, size: selectedFile.size });
            setTargetWidth(img.width * 2);
            setTargetHeight(img.height * 2);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            setError('Could not read the selected image file.');
        };
        img.src = url;
    };

    const handleTargetWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10) || 0;
        setTargetWidth(newWidth);
        if (original && original.width > 0) {
            const aspectRatio = original.height / original.width;
            const newHeight = Math.round(newWidth * aspectRatio);
            setTargetHeight(newHeight);
        }
    };

    const handleTargetHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = parseInt(e.target.value, 10) || 0;
        setTargetHeight(newHeight);
        if (original && original.height > 0) {
            const aspectRatio = original.width / original.height;
            const newWidth = Math.round(newHeight * aspectRatio);
            setTargetWidth(newWidth);
        }
    };

    const handleUpscale = async () => {
        if (!file || targetWidth <= 0 || targetHeight <= 0) {
            setError('Please select a file and set valid target dimensions.');
            return;
        }
        if (targetWidth > 4096 || targetHeight > 4096) {
            setError('Maximum dimensions are 4096x4096 pixels.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('image_file', file);
        formData.append('target_width', String(targetWidth));
        formData.append('target_height', String(targetHeight));

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'x-api-key': API_KEY },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
                throw new Error(errorData.error || `API responded with status: ${response.status}`);
            }

            const resultBlob = await response.blob();
            setResult({ url: URL.createObjectURL(resultBlob), size: resultBlob.size });

            try {
                // Save to history
                const originalB64 = await blobToDataURL(file);
                const resultB64 = await blobToDataURL(resultBlob);
                
                const newItem: Omit<HistoryItem, 'key'> = {
                    id: Date.now(),
                    originalImage: originalB64,
                    resultImage: resultB64,
                    originalFilename: file.name,
                    targetWidth,
                    targetHeight,
                };

                if (user) {
                    await saveImageUpscalingToHistory(user.uid, newItem);
                } else {
                    const newHistory = [newItem, ...history];
                    setHistory(newHistory);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
                }
            } catch (historyError) {
                console.error("Failed to save to history:", historyError);
                throw new Error("Image upscaled successfully, but failed to save to history. The resulting file may be too large.");
            }

        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to upscale image: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClearHistory = () => {
        if (user) {
            clearImageUpscalingHistory(user.uid);
        } else {
            setHistory([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const dragDropHandlers = {
        onDragEnter: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); },
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        },
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            {previewItem && <ImagePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />}
            <AppHeader title="AI IMAGE UPSCALING" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Upscale Your Image</h2>
                    
                    {!original && (
                         <div {...dragDropHandlers}>
                            <input type="file" accept="image/png, image/jpeg, image/webp" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} role="button" aria-label="Upload Image"
                                className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="font-semibold text-center">{isDraggingOver ? 'Drop image here' : 'Click to upload an image'}</span>
                                <span className="text-sm text-blue-900/70 text-center">{!isDraggingOver && 'or drag and drop (JPG, PNG, WEBP)'}</span>
                            </div>
                        </div>
                    )}

                    {original && !result && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-blue-900 mb-2">Original</h3>
                                <img src={original.url} alt="Original" className="rounded-lg shadow-md max-h-80 mx-auto" />
                                <p className="text-sm text-blue-800/80 mt-2">{original.width} x {original.height} &bull; {formatBytes(original.size)}</p>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-blue-900">Upscale Options</h3>
                                <div>
                                    <label className="block text-sm font-medium text-blue-900/90 mb-2">Target Dimensions</label>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={targetWidth} onChange={handleTargetWidthChange} className="w-full px-3 py-2 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"/>
                                        <span className="font-bold">x</span>
                                        <input type="number" value={targetHeight} onChange={handleTargetHeightChange} className="w-full px-3 py-2 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue"/>
                                    </div>
                                </div>
                                 <div className="flex gap-2">
                                    <button onClick={() => { setTargetWidth(original.width * 2); setTargetHeight(original.height * 2);}} className="flex-1 bg-white/70 text-blue-900 font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-brand-blue">2x</button>
                                    <button onClick={() => { setTargetWidth(original.width * 4); setTargetHeight(original.height * 4);}} className="flex-1 bg-white/70 text-blue-900 font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-brand-blue">4x</button>
                                </div>
                                {isLoading ? (
                                     <div className="text-center py-3 text-blue-900 space-y-2"><svg className="animate-spin h-6 w-6 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p>Upscaling...</p></div>
                                ) : (
                                    <div className="flex gap-4">
                                        <button onClick={handleStartOver} className="flex-1 bg-brand-yellow text-blue-900 font-bold px-4 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow">Change</button>
                                        <button onClick={handleUpscale} className="flex-1 bg-brand-blue text-white font-bold px-4 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue">Upscale</button>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}
                    
                    {result && (
                        <div className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">Original</h3>
                                    <img src={original!.url} alt="Original" className="rounded-lg shadow-md max-h-80 mx-auto" />
                                    <p className="text-sm text-blue-800/80 mt-2">{original!.width} x {original!.height} &bull; {formatBytes(original!.size)}</p>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">Upscaled Result</h3>
                                    <img src={result.url} alt="Upscaled result" className="rounded-lg shadow-md max-h-80 mx-auto" />
                                    <p className="text-sm text-blue-800/80 mt-2">{targetWidth} x {targetHeight} &bull; {formatBytes(result.size)}</p>
                                </div>
                             </div>
                             <div className="flex justify-center items-center gap-4 pt-4 border-t border-brand-blue/20">
                                <button onClick={handleStartOver} className="bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow">Upscale Another</button>
                                <a href={result.url} download={`upscaled-${file?.name || 'image.png'}`} className="inline-block bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500">Download</a>
                             </div>
                        </div>
                    )}

                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                </div>

                <div className="w-full max-w-4xl mx-auto mt-12 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-blue-900">History</h3>
                        {history.length > 0 && <button onClick={handleClearHistory} className="text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:underline">Clear History</button>}
                    </div>
                    {history.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {history.map(item => (
                                <button key={item.id} onClick={() => setPreviewItem(item)} className="group relative block w-full aspect-square bg-gray-200 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2">
                                    <img src={item.originalImage} alt="History item" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                        <p className="text-white text-xs text-center font-bold">{item.targetWidth}x{item.targetHeight}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 rounded-lg bg-white/20">
                            <h4 className="mt-2 text-lg font-medium text-blue-900">History is empty</h4>
                            <p className="mt-1 text-sm text-blue-800/80">Your upscaled images will appear here.</p>
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

export default ImageUpscalingApp;
