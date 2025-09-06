import React, { useState, useRef, useEffect } from 'react';

// --- CONFIGURATION ---

// Helper function to resize, optimize, and convert an image file to a base64 string.
// This prevents oversized payloads from being sent to the serverless function.
const processAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const MAX_DIMENSION = 1920; // Max width or height of 1920px
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context.'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Export as a high-quality JPEG to significantly reduce file size for most photos
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                
                // The result is a Data URL: "data:image/jpeg;base64,iVBORw0KGgo...".
                // We need to strip the prefix to get the raw base64 data.
                if (dataUrl.includes(',')) {
                    resolve(dataUrl.split(',')[1]);
                } else {
                    reject(new Error("Invalid Data URL format created by canvas."));
                }
            };
            
            img.onerror = (err) => reject(new Error(`Image could not be loaded: ${err}`));
            
            if (event.target?.result) {
                img.src = event.target.result as string;
            } else {
                reject(new Error("FileReader did not produce a result."));
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};


const BackgroundRemoverApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to clean up the local blob URL for the original image when it's no longer needed.
    useEffect(() => {
        return () => {
            if (originalImageUrl && originalImageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(originalImageUrl);
            }
        };
    }, [originalImageUrl]);

    const handleStartOver = () => {
        // The useEffect cleanup will handle revoking the old originalImageUrl when it's set to null
        setFile(null);
        setOriginalImageUrl(null);
        setResultImageUrl(null);
        setIsLoading(false);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return;

        // Reset state completely before processing the new file
        handleStartOver(); 

        const fileType = selectedFile.type;
        if (!fileType.startsWith('image/')) {
            setError('Please select a valid image file (PNG, JPG, etc.).');
            return;
        }

        setFile(selectedFile);
        setOriginalImageUrl(URL.createObjectURL(selectedFile));
    };

    const handleRemoveBackground = async () => {
        if (!file) return;

        setIsLoading(true);
        setError('');
        
        try {
            // Use the resizing function to get a smaller, optimized base64 string
            const base64Image = await processAndResizeImage(file);
            
            const response = await fetch('/api/remove-background', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_base64: base64Image,
                }),
            });
            
            const responseData = await response.json();

            if (!response.ok) {
                 // Forward the error message from the backend function
                 throw new Error(responseData.message || `API Error: (${response.status})`);
            }

            if (responseData.result_url) {
                setResultImageUrl(responseData.result_url);
            } else {
                throw new Error("The API response did not contain a result URL.");
            }

        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'An unknown error occurred.';
            // Handle common proxy or network errors
            if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
                setError('Failed to process image: Could not connect to the backend service. Please try again.');
            } else {
                setError(`Failed to process image: ${message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!resultImageUrl || !file) return;
        try {
            // Fetch the image from the remote URL as we can't directly download from a cross-origin source.
            const response = await fetch(resultImageUrl);
            if (!response.ok) throw new Error('Failed to fetch the processed image for download.');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const originalName = file.name.substring(0, file.name.lastIndexOf('.'));
            link.download = `${originalName}-no-bg.png`;
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (downloadError) {
             console.error(downloadError);
             setError("Could not download the image. Please try right-clicking it and choosing 'Save Image As...'.");
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

    const CheckeredBackground = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full -z-10">
            <defs>
                <pattern id="checkered" patternUnits="userSpaceOnUse" width="20" height="20">
                    <rect width="10" height="10" x="0" y="0" fill="#ccc" />
                    <rect width="10" height="10" x="10" y="10" fill="#ccc" />
                    <rect width="10" height="10" x="10" y="0" fill="#fff" />
                    <rect width="10" height="10" x="0" y="10" fill="#fff" />
                </pattern>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="url(#checkered)" />
        </svg>
    );

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">BACKGROUND REMOVER</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Remove Image Background</h2>
                    
                    {!file && (
                        <div {...dragDropHandlers}>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} role="button" aria-label="Upload Image"
                                className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="font-semibold text-center">{isDraggingOver ? 'Drop image here' : 'Click to upload an image'}</span>
                                <span className="text-sm text-blue-900/70 text-center">{!isDraggingOver && 'or drag and drop a single file'}</span>
                            </div>
                        </div>
                    )}

                    {file && (
                        <div className="space-y-6">
                            <div className="relative w-full aspect-video bg-white/50 rounded-lg shadow-inner overflow-hidden flex items-center justify-center">
                                <CheckeredBackground />
                                <img 
                                    src={resultImageUrl || originalImageUrl || ''} 
                                    alt={resultImageUrl ? "Result" : "Original"}
                                    className="max-w-full max-h-full object-contain relative transition-opacity duration-300"
                                />
                                {isLoading && (
                                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white z-10">
                                        <svg className="animate-spin h-10 w-10 text-brand-yellow mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.47715 2 2 6.47715 2 12H4C4 7.58172 7.58172 4 12 4V2Z"/></svg>
                                        <p className="text-lg font-medium">Removing background...</p>
                                    </div>
                                )}
                            </div>

                            {!resultImageUrl && !isLoading && (
                                <button onClick={handleRemoveBackground} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    Remove Background
                                </button>
                            )}
                            
                             {resultImageUrl && !isLoading && (
                                <div className="space-y-3 pt-4 text-center">
                                    <h3 className="text-xl font-bold text-green-600">Background Removed!</h3>
                                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 justify-center">
                                        <button onClick={handleDownload} className="w-full sm:w-auto bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                                            Download Image
                                        </button>
                                        <button onClick={handleStartOver} className="w-full sm:w-auto bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                            Remove Another
                                        </button>
                                    </div>
                                </div>
                            )}

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

export default BackgroundRemoverApp;