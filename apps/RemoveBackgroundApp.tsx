import React, { useState, useRef, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { User, onRemoveBgHistoryChange, saveRemoveBgToHistory, clearRemoveBgHistory } from '../firebase';

// Hardcoded API key as per user request. In a production environment, this should be an environment variable.
const API_KEY = '3add61fae69722d01998f77bc4ef4e4d89a8e64590b588c0421fb6918a48340ea50b011de0aadd4282464faf62ab82ab';
const API_ENDPOINT = 'https://clipdrop-api.co/remove-background/v1';

export type HistoryItem = {
    id: number;
    key?: string; // Firebase key
    originalImage: string; // base64
    resultImage: string; // base64
    originalFilename: string;
};

const LOCAL_STORAGE_KEY = 'removeBgHistory';

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

/**
 * Compresses an image file if it's larger than the target size.
 * Maintains resolution and aspect ratio, reduces quality.
 * Converts large PNGs to JPEGs for better compression.
 */
const compressImageFile = (file: File, targetSizeInBytes: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error("Could not get canvas context"));
                }
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // For PNGs > 4MB, convert to JPEG for better compression. Otherwise, use original type.
                const targetMimeType = file.type === 'image/png' ? 'image/jpeg' : file.type;
                const targetExtension = targetMimeType.split('/')[1] === 'jpeg' ? 'jpg' : targetMimeType.split('/')[1];
                const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const targetFilename = `${originalName}.${targetExtension}`;

                let quality = 0.9;
                
                const performCompression = (currentQuality: number) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                return reject(new Error("Canvas toBlob failed"));
                            }
                            // If the blob is small enough or we've hit the quality floor, resolve.
                            if (blob.size <= targetSizeInBytes || currentQuality <= 0.1) {
                                const compressedFile = new File([blob], targetFilename, {
                                    type: targetMimeType,
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                // Otherwise, reduce quality and try again.
                                performCompression(currentQuality - 0.05);
                            }
                        },
                        targetMimeType,
                        currentQuality
                    );
                };

                performCompression(quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};


const RemoveBackgroundApp: React.FC<{ onBack: () => void, user: User | null }> = ({ onBack, user }) => {
    const [file, setFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load history from Firebase for logged-in users, or localStorage for guests
    useEffect(() => {
        if (user) {
            const unsubscribe = onRemoveBgHistoryChange(user.uid, setHistory);
            return () => unsubscribe();
        } else {
            try {
                const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (storedHistory) {
                    setHistory(JSON.parse(storedHistory));
                }
            } catch (e) {
                console.error("Failed to parse history from localStorage", e);
                setHistory([]);
            }
        }
    }, [user]);

    // Cleanup object URLs on unmount or when they change
    useEffect(() => {
        return () => {
            if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
            if (resultImageUrl) URL.revokeObjectURL(resultImageUrl);
        };
    }, [originalImageUrl, resultImageUrl]);

    const handleStartOver = () => {
        setFile(null);
        setOriginalImageUrl(null);
        setResultImageUrl(null);
        setIsLoading(false);
        setLoadingMessage('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileSelect = async (selectedFile: File | null) => {
        if (!selectedFile) return;

        handleStartOver(); // Reset everything for the new file

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Invalid file type. Please upload a JPG, PNG, or WEBP image.');
            return;
        }
        
        const MAX_SIZE_BYTES = 4 * 1024 * 1024;
        if (selectedFile.size > MAX_SIZE_BYTES) {
            setIsLoading(true);
            setLoadingMessage("Compressing image...");
            try {
                const compressedFile = await compressImageFile(selectedFile, MAX_SIZE_BYTES);
                setFile(compressedFile);
                setOriginalImageUrl(URL.createObjectURL(compressedFile));
            } catch (err) {
                setError('Failed to compress image. The file might be corrupted.');
                console.error(err);
                handleStartOver();
            } finally {
                setIsLoading(false);
                setLoadingMessage("");
            }
        } else {
            setFile(selectedFile);
            setOriginalImageUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleRemoveBackground = async () => {
        if (!file) {
            setError('No file selected.');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Removing background, please wait...');
        setError('');
        setResultImageUrl(null);

        const formData = new FormData();
        formData.append('image_file', file);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
                throw new Error(errorData.error || `API responded with status: ${response.status}`);
            }

            const resultBlob = await response.blob();
            setResultImageUrl(URL.createObjectURL(resultBlob));

            // Save to history
            const originalB64 = await blobToDataURL(file);
            const resultB64 = await blobToDataURL(resultBlob);
            
            const newItem: Omit<HistoryItem, 'key'> = {
                id: Date.now(),
                originalImage: originalB64,
                resultImage: resultB64,
                originalFilename: file.name
            };

            if (user) {
                await saveRemoveBgToHistory(user.uid, newItem);
            } else {
                const newHistory = [newItem, ...history];
                setHistory(newHistory);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
            }


        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to process image: ${message}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleLoadFromHistory = (item: HistoryItem) => {
        handleStartOver();
        try {
            const originalBlob = dataURLToBlob(item.originalImage);
            const resultBlob = dataURLToBlob(item.resultImage);

            setFile(new File([originalBlob], item.originalFilename, { type: originalBlob.type }));
            setOriginalImageUrl(URL.createObjectURL(originalBlob));
            setResultImageUrl(URL.createObjectURL(resultBlob));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            setError("Failed to load history item. It may be corrupted.");
            console.error(e);
            handleStartOver();
        }
    };
    
    const handleClearHistory = () => {
        if (user) {
            clearRemoveBgHistory(user.uid);
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
            <AppHeader title="REMOVE BACKGROUND" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="w-full max-w-4xl mx-auto p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Image Background Remover</h2>
                    
                    {!file && !isLoading && (
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

                    {file && !resultImageUrl && !isLoading && (
                        <div className="text-center space-y-6">
                            <h3 className="text-xl font-bold text-blue-900">Your Image</h3>
                            <div className="max-w-md mx-auto">
                                <img src={originalImageUrl!} alt="Original upload" className="rounded-lg shadow-lg max-h-80 mx-auto" />
                            </div>
                             <div className="flex justify-center items-center gap-4">
                                <button onClick={handleStartOver} className="bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                    Change Image
                                </button>
                                <button onClick={handleRemoveBackground} disabled={isLoading} className="bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? 'Processing...' : 'Remove Background'}
                                </button>
                             </div>
                        </div>
                    )}
                    
                    {isLoading && (
                         <div className="text-center my-4 text-blue-900 space-y-4">
                            <svg className="animate-spin h-10 w-10 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="font-semibold">{loadingMessage}</p>
                            {originalImageUrl && <img src={originalImageUrl} alt="Processing..." className="rounded-lg shadow-lg max-h-40 mx-auto opacity-50" />}
                         </div>
                    )}
                    
                    {resultImageUrl && (
                        <div className="text-center space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">Original</h3>
                                    <img src={originalImageUrl!} alt="Original" className="rounded-lg shadow-md max-h-80 mx-auto" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">Result</h3>
                                    <div className="checkerboard rounded-lg shadow-md inline-block">
                                        <img src={resultImageUrl} alt="Background removed" className="rounded-lg max-h-80 mx-auto" />
                                    </div>
                                </div>
                             </div>
                             <div className="flex justify-center items-center gap-4 pt-4 border-t border-brand-blue/20">
                                <button onClick={handleStartOver} className="bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                    Remove Another
                                </button>
                                <a href={resultImageUrl} download={`background-removed-${file?.name || 'image.png'}`} className="inline-block bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                                    Download
                                </a>
                             </div>
                        </div>
                    )}
                    
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                </div>

                <div className="w-full max-w-4xl mx-auto mt-12 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-blue-900">History</h3>
                        {history.length > 0 && (
                             <button onClick={handleClearHistory} className="text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:underline">Clear History</button>
                        )}
                    </div>

                    {history.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {history.map(item => (
                                <button key={item.id} onClick={() => handleLoadFromHistory(item)} className="group relative block w-full aspect-square bg-gray-200 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 checkerboard">
                                    <img src={item.resultImage} alt="Result from history" className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                                        <p className="text-white text-xs text-center line-clamp-3">{item.originalFilename}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 rounded-lg bg-white/20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <h4 className="mt-2 text-lg font-medium text-blue-900">History is empty</h4>
                            <p className="mt-1 text-sm text-blue-800/80">Images you process will appear here.</p>
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

export default RemoveBackgroundApp;