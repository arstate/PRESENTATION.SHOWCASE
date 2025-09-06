import React, { useState, useRef, useEffect } from 'react';

// Declare global libraries from CDN
declare const pdfjsLib: any;
declare const PDFLib: any;

const PDFCompressorApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [originalSize, setOriginalSize] = useState<number>(0);
    const [pageCount, setPageCount] = useState<number>(0);
    const [compressionLevel, setCompressionLevel] = useState<number>(75); // 1-100 scale
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ blob: Blob, size: number } | null>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
    const [isEstimating, setIsEstimating] = useState<boolean>(false);
    const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
    const estimationTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
    }, []);
    
    useEffect(() => {
        if (!file || !pageCount) return;

        if (estimationTimeoutRef.current) {
            clearTimeout(estimationTimeoutRef.current);
        }
        
        estimationTimeoutRef.current = window.setTimeout(async () => {
            if (!file) {
                setIsDebouncing(false);
                return;
            }
            setIsDebouncing(false);
            setIsEstimating(true);
            try {
                const { PDFDocument } = PDFLib;
                const newPdfDoc = await PDFDocument.create();
                const quality = compressionLevel / 100;

                const existingPdfBytes = await file.arrayBuffer();
                const pdfJsDoc = await pdfjsLib.getDocument({ data: existingPdfBytes }).promise;
                
                for (let i = 1; i <= pdfJsDoc.numPages; i++) {
                    const page = await pdfJsDoc.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport }).promise;
                    
                    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
                    const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
                    const jpegImage = await newPdfDoc.embedJpg(jpegBytes);

                    const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
                    newPage.drawImage(jpegImage, {
                        x: 0, y: 0,
                        width: viewport.width,
                        height: viewport.height,
                    });
                }

                const pdfBytes = await newPdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                
                setEstimatedSize(blob.size);

            } catch (e) {
                console.error("Failed to estimate size:", e);
                setEstimatedSize(null);
            } finally {
                setIsEstimating(false);
            }
        }, 2000);

        return () => {
            if (estimationTimeoutRef.current) {
                clearTimeout(estimationTimeoutRef.current);
            }
        };

    }, [compressionLevel, file, pageCount]);

    const formatBytes = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const handleStartOver = () => {
        setFile(null);
        setOriginalSize(0);
        setPageCount(0);
        setCompressionLevel(75);
        setIsProcessing(false);
        setProcessingProgress(0);
        setError('');
        setResult(null);
        setEstimatedSize(null);
        setIsEstimating(false);
        setIsDebouncing(false);
        if (estimationTimeoutRef.current) {
            clearTimeout(estimationTimeoutRef.current);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleFileSelect = async (selectedFile: File | null) => {
        if (!selectedFile) return;

        handleStartOver();

        if (selectedFile.type !== 'application/pdf') {
            setError('Please select a valid PDF file.');
            return;
        }

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPageCount(pdf.numPages);
            setOriginalSize(selectedFile.size);
            setFile(selectedFile);
        } catch (e) {
            console.error('Failed to read PDF', e);
            setError('Could not read the selected PDF. It may be corrupted.');
        }
    };

    const handleCompressionChange = (level: number) => {
        setCompressionLevel(level);
        if (!isDebouncing) setIsDebouncing(true);
        setEstimatedSize(null);
    };

    const handleCompress = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProcessingProgress(0);
        setError('');
        setResult(null);

        try {
            const { PDFDocument } = PDFLib;
            const newPdfDoc = await PDFDocument.create();
            const quality = compressionLevel / 100;

            const existingPdfBytes = await file.arrayBuffer();
            const pdfJsDoc = await pdfjsLib.getDocument({ data: existingPdfBytes }).promise;
            
            for (let i = 1; i <= pdfJsDoc.numPages; i++) {
                const page = await pdfJsDoc.getPage(i);
                // Use a scale of 1.5 to render at a higher resolution before compressing
                const viewport = page.getViewport({ scale: 1.5 }); 

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport }).promise;
                
                // Convert canvas to JPEG, applying the quality setting
                const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
                const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
                const jpegImage = await newPdfDoc.embedJpg(jpegBytes);

                const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
                newPage.drawImage(jpegImage, {
                    x: 0, y: 0,
                    width: viewport.width,
                    height: viewport.height,
                });
                
                setProcessingProgress(Math.round((i / pdfJsDoc.numPages) * 100));
            }

            const pdfBytes = await newPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            setResult({ blob, size: blob.size });

        } catch (e) {
            console.error(e);
            setError('Failed to compress PDF. The file might be corrupted or in an unsupported format.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!result || !file) return;
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        const originalName = file.name.endsWith('.pdf') ? file.name.slice(0, -4) : file.name;
        link.download = `${originalName}-compressed.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    const getCompressionLabel = (level: number): string => {
        let description = "Good Compression";
        if (level <= 20) description = "Extreme Compression";
        else if (level <= 40) description = "High Compression";
        else if (level <= 60) description = "Good Compression";
        else if (level <= 80) description = "Low Compression";
        else description = "Highest Quality";
        return `${description} (${level}%)`;
    };

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">PDF COMPRESSOR</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Compress PDF File</h2>
                    {!file && (
                        <div {...dragDropHandlers}>
                            <input type="file" accept=".pdf" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)} className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} role="button" aria-label="Upload PDF"
                                className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="font-semibold text-center">{isDraggingOver ? 'Drop PDF here' : 'Click to upload a PDF'}</span>
                                <span className="text-sm text-blue-900/70 text-center">{!isDraggingOver && 'or drag and drop a single file'}</span>
                            </div>
                        </div>
                    )}

                    {file && !result && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-lg bg-white/70 shadow flex items-center justify-between">
                                <div className="truncate pr-4">
                                    <p className="font-bold text-blue-900 truncate">{file.name}</p>
                                    <p className="text-sm text-blue-800/80">{pageCount} pages &bull; {formatBytes(originalSize)}</p>
                                </div>
                                <button onClick={handleStartOver} className="p-2 rounded-full text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>

                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <label htmlFor="compressionLevel" className="block text-sm font-medium text-blue-900/90">
                                        {getCompressionLabel(compressionLevel)}
                                    </label>
                                    <span className="text-sm text-blue-800 font-semibold h-5">
                                        {(isEstimating || isDebouncing)
                                            ? 'Estimating...' 
                                            : estimatedSize !== null 
                                                ? `Est. Size: ~${formatBytes(estimatedSize)}`
                                                : ''
                                        }
                                    </span>
                                </div>
                                <input 
                                    id="compressionLevel" 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    step="1" 
                                    value={compressionLevel} 
                                    onChange={(e) => handleCompressionChange(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" 
                                    disabled={isProcessing || isEstimating} 
                                />
                                <div className="flex justify-between text-xs text-blue-800/80 mt-1">
                                    <span>More Compression</span>
                                    <span>Higher Quality</span>
                                </div>
                            </div>
                            
                            <p className="text-xs text-center text-blue-800/70 p-2 bg-blue-50 rounded-md">
                                Note: Compression converts pages to images, so text may not be selectable in the final file.
                            </p>

                            {isProcessing ? (
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div className="bg-brand-blue h-4 rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }}></div>
                                    <p className="text-center text-sm font-semibold text-blue-900 mt-2">{processingProgress}% Complete</p>
                                </div>
                            ) : (
                                <button onClick={handleCompress} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    Compress PDF
                                </button>
                            )}
                        </div>
                    )}
                    
                    {result && (
                        <div className="text-center space-y-4">
                             <h3 className="text-2xl font-bold text-green-600">Compression Complete!</h3>
                             <div className="flex justify-around items-center p-4 bg-green-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600">Original Size</p>
                                    <p className="font-bold text-lg text-gray-800">{formatBytes(originalSize)}</p>
                                </div>
                                 <div>
                                    <p className="text-sm text-green-700">New Size</p>
                                    <p className="font-bold text-lg text-green-600">{formatBytes(result.size)}</p>
                                </div>
                                 <div>
                                    <p className="text-sm text-blue-700">Reduction</p>
                                    <p className="font-bold text-lg text-brand-blue">{Math.round(((originalSize - result.size) / originalSize) * 100)}%</p>
                                </div>
                             </div>
                            <div className="space-y-3 pt-4">
                                <button onClick={handleDownload} className="w-full bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                                    Download Compressed PDF
                                </button>
                                <button onClick={handleStartOver} className="w-full bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                    Compress Another File
                                </button>
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

export default PDFCompressorApp;