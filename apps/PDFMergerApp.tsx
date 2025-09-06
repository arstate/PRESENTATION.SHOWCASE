import React, { useState, useRef, useEffect } from 'react';

// Declare global libraries from CDN
declare const pdfjsLib: any;
declare const PDFLib: any;

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

    // Compression State
    const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);
    const [showCompressionOptions, setShowCompressionOptions] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState<number>(75);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState(0);
    const [compressedResult, setCompressedResult] = useState<{ blob: Blob, size: number } | null>(null);
    const [estimatedCompressedSize, setEstimatedCompressedSize] = useState<number | null>(null);
    const [isEstimatingCompression, setIsEstimatingCompression] = useState<boolean>(false);
    const [isDebouncingCompression, setIsDebouncingCompression] = useState<boolean>(false);
    const estimationTimeoutRef = useRef<number | null>(null);


    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
    }, []);

    // Effect for estimating compressed size
    useEffect(() => {
        if (!mergedPdfBlob || !showCompressionOptions) return;

        if (estimationTimeoutRef.current) {
            clearTimeout(estimationTimeoutRef.current);
        }

        estimationTimeoutRef.current = window.setTimeout(async () => {
            setIsDebouncingCompression(false);
            setIsEstimatingCompression(true);
            try {
                const { PDFDocument } = PDFLib;
                const newPdfDoc = await PDFDocument.create();
                const quality = compressionLevel / 100;

                const existingPdfBytes = await mergedPdfBlob.arrayBuffer();
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
                    newPage.drawImage(jpegImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
                }

                const pdfBytes = await newPdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                
                setEstimatedCompressedSize(blob.size);

            } catch (e) {
                console.error("Failed to estimate size:", e);
                setEstimatedCompressedSize(null);
            } finally {
                setIsEstimatingCompression(false);
            }
        }, 2000);

        return () => {
            if (estimationTimeoutRef.current) {
                clearTimeout(estimationTimeoutRef.current);
            }
        };
    }, [compressionLevel, mergedPdfBlob, showCompressionOptions]);


    const formatBytes = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const formatBytesToMB = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0.00 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(decimals)} MB`;
    };
    
    const getCompressionLabel = (level: number): string => {
        if (level <= 20) return `Extreme Compression (${level}%)`;
        if (level <= 50) return `High Compression (${level}%)`;
        if (level <= 80) return `Recommended (${level}%)`;
        return `Highest Quality (${level}%)`;
    };

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
                return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2EtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUteCI+PHBhdGggZD0iTTE0LjUgMiBITFA1YTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxMGEyIDIgMCAwIDAgMi0yVjcuNVoiLz48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDggMjAgOCIvPjxwYXRoIGQ9Im0xNCAxNC00IDQiLz48cGF0aCBkPSJtMTAgMTRsNCA0Ii8+PC9zdmc+'; // Error icon
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
        setMergedPdfBlob(null);
        setShowCompressionOptions(false);
        setCompressionLevel(75);
        setIsCompressing(false);
        setCompressionProgress(0);
        setCompressedResult(null);
        setEstimatedCompressedSize(null);
        setIsEstimatingCompression(false);
        setIsDebouncingCompression(false);
        if (estimationTimeoutRef.current) {
            clearTimeout(estimationTimeoutRef.current);
        }
    };
    
    const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOutputFilename(e.target.value);
    };
    
    const handleCompressionChange = (level: number) => {
        setCompressionLevel(level);
        if (!isDebouncingCompression) setIsDebouncingCompression(true);
        setEstimatedCompressedSize(null);
    };

    const handleMerge = async () => {
        if (files.length === 0) {
            setError('Please add files to merge.');
            return;
        }
        setIsMerging(true);
        setError('');
        setMergeCompleted(false);
        setCompressedResult(null);
        setShowCompressionOptions(false);

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
            setMergedPdfBlob(blob);
            setMergeCompleted(true);
        } catch (e) {
            console.error(e);
            setError('An error occurred while merging the files. One of the images may be in an unsupported format.');
        } finally {
            setIsMerging(false);
        }
    };
    
    const handleCompress = async () => {
        if (!mergedPdfBlob) return;

        setIsCompressing(true);
        setCompressionProgress(0);
        setError('');
        setCompressedResult(null);

        try {
            const { PDFDocument } = PDFLib;
            const newPdfDoc = await PDFDocument.create();
            const quality = compressionLevel / 100;

            const existingPdfBytes = await mergedPdfBlob.arrayBuffer();
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
                newPage.drawImage(jpegImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
                
                setCompressionProgress(Math.round((i / pdfJsDoc.numPages) * 100));
            }

            const pdfBytes = await newPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            setCompressedResult({ blob, size: blob.size });

        } catch (e) {
            console.error(e);
            setError('Failed to compress PDF. The file might be corrupted.');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleDownload = (blob: Blob | null, type: 'merged' | 'compressed') => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const baseFilename = outputFilename || 'merged';
        link.download = type === 'compressed' ? `${baseFilename}-compressed.pdf` : `${baseFilename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

                    {files.length > 0 && !mergeCompleted && (
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
                                    {isMerging ? (<svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : `Merge Files (${files.length})`}
                                </button>
                            </div>
                        </div>
                    )}

                     {mergeCompleted && mergedPdfBlob && (
                        <div className="mt-8 pt-6 border-t border-brand-blue/20 text-center space-y-4">
                            <h3 className="text-2xl font-bold text-green-600">Merge Successful!</h3>
                            <p className="text-blue-900">Your new PDF is ready ({formatBytes(mergedPdfBlob.size)}).</p>

                            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3 justify-center">
                                <button onClick={() => handleDownload(mergedPdfBlob, 'merged')} className="w-full sm:w-auto bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                                    Download Merged PDF
                                </button>
                                <button onClick={() => setShowCompressionOptions(!showCompressionOptions)} className="w-full sm:w-auto bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition">
                                    {showCompressionOptions ? 'Hide Compression' : 'Compress Merged PDF'}
                                </button>
                                <button onClick={handleStartOver} className="w-full sm:w-auto bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                    Start Over
                                </button>
                            </div>

                            {showCompressionOptions && (
                                <div className="mt-6 pt-4 border-t border-brand-blue/20 space-y-4 text-left">
                                    {!compressedResult ? (
                                        <>
                                            <div>
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <label htmlFor="compressionLevel" className="block text-sm font-medium text-blue-900/90">{getCompressionLabel(compressionLevel)}</label>
                                                    <span className="text-sm text-blue-800 font-semibold h-5">
                                                        {(isEstimatingCompression || isDebouncingCompression) ? 'Estimating...' : estimatedCompressedSize !== null ? `Est. Size: ~${formatBytesToMB(estimatedCompressedSize)}` : ''}
                                                    </span>
                                                </div>
                                                <input id="compressionLevel" type="range" min="1" max="100" value={compressionLevel} onChange={(e) => handleCompressionChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" disabled={isCompressing || isEstimatingCompression} />
                                            </div>
                                            {isCompressing ? (
                                                <div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-brand-blue h-4 rounded-full transition-all duration-300" style={{ width: `${compressionProgress}%` }}></div><p className="text-center text-sm font-semibold text-blue-900 mt-2">{compressionProgress}% Complete</p></div>
                                            ) : (
                                                <button onClick={handleCompress} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition">Compress PDF</button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center space-y-4">
                                            <h3 className="text-2xl font-bold text-green-600">Compression Complete!</h3>
                                            <div className="flex justify-around items-center p-4 bg-green-50 rounded-lg">
                                                <div><p className="text-sm text-gray-600">Original</p><p className="font-bold text-lg text-gray-800">{formatBytes(mergedPdfBlob.size)}</p></div>
                                                <div><p className="text-sm text-green-700">New Size</p><p className="font-bold text-lg text-green-600">{formatBytes(compressedResult.size)}</p></div>
                                                <div><p className="text-sm text-blue-700">Reduction</p><p className="font-bold text-lg text-brand-blue">{Math.round(((mergedPdfBlob.size - compressedResult.size) / mergedPdfBlob.size) * 100)}%</p></div>
                                            </div>
                                            <button onClick={() => handleDownload(compressedResult.blob, 'compressed')} className="w-full bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">Download Compressed PDF</button>
                                        </div>
                                    )}
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

export default PDFMergerApp;