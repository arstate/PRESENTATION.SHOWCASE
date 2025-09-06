import React, { useState, useRef, useEffect, useCallback } from 'react';

// Declare global libraries from CDN
declare const pdfjsLib: any;
declare const JSZip: any;
declare const heic2any: any;
declare const FFmpeg: any;
declare const FFmpegUtil: any;


type SupportedInput = 'png' | 'jpg' | 'heic' | 'pdf' | 'video';
type SupportedOutput = 'png' | 'jpg' | 'ico' | 'gif';

interface ManagedFile {
  id: string;
  file: File;
  type: SupportedInput;
}

interface ConversionResult {
  name: string;
  blob: Blob;
  size: number;
}

const MediaConverterApp: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [files, setFiles] = useState<ManagedFile[]>([]);
    const [toType, setToType] = useState<SupportedOutput>('png');
    const [availableOutputTypes, setAvailableOutputTypes] = useState<SupportedOutput[]>(['png', 'jpg', 'ico', 'gif']);
    const [quality, setQuality] = useState<number>(92); // For JPG
    const [gifQuality, setGifQuality] = useState<number>(5); // 1-10 scale for GIF resolution
    const [gifFps, setGifFps] = useState<number>(12); // For GIF
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ percentage: 0, text: '' });
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [error, setError] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const estimationTimeoutRef = useRef<number | null>(null);
    
    // FFmpeg state
    const [ffmpeg, setFfmpeg] = useState<any>(null);
    const [ffmpegLoading, setFfmpegLoading] = useState(true);
    const ffmpegRef = useRef<any>(null);


    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
        
        // Load FFmpeg
        const loadFfmpeg = async () => {
            if (ffmpegRef.current || typeof FFmpeg === 'undefined') return;
            try {
                const ffmpegInstance = new FFmpeg.FFmpeg();
                ffmpegInstance.on('log', ({ message }: { message: string }) => {
                    if(message.includes('ffmpeg.wasm v0.12.10')) {
                       setProgress({ percentage: 50, text: 'FFmpeg core loaded.' });
                    }
                });
                setProgress({ percentage: 25, text: 'Loading FFmpeg...' });
                await ffmpegInstance.load();
                ffmpegRef.current = ffmpegInstance;
                setFfmpeg(ffmpegInstance);
            } catch (err) {
                console.error("Failed to load FFmpeg", err);
                setError("Failed to load the video conversion engine. Please try refreshing.");
            } finally {
                setFfmpegLoading(false);
                setProgress({ percentage: 0, text: '' });
            }
        };

        loadFfmpeg();

    }, []);

    const resetState = () => {
        setFiles([]);
        setToType('png');
        setAvailableOutputTypes(['png', 'jpg', 'ico', 'gif']);
        setQuality(92);
        setGifQuality(5);
        setGifFps(12);
        setIsProcessing(false);
        setProgress({ percentage: 0, text: '' });
        setResult(null);
        setError('');
        setEstimatedSize(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const getFileType = (fileName: string): SupportedInput | null => {
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg'].includes(extension)) return 'jpg';
        if (extension === 'png') return 'png';
        if (['heic', 'heif'].includes(extension)) return 'heic';
        if (extension === 'pdf') return 'pdf';
        if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'flv'].includes(extension)) return 'video';
        return null;
    };
    
    useEffect(() => {
        if (files.length === 0) {
            setAvailableOutputTypes(['png', 'jpg', 'ico', 'gif']);
            setError('');
            return;
        }

        const hasVideo = files.some(f => f.type === 'video');
        const hasImage = files.some(f => ['jpg', 'png', 'heic'].includes(f.type));
        const hasPdf = files.some(f => f.type === 'pdf');
        
        let newTypes: SupportedOutput[] = [];
        let newError = '';

        if (hasVideo && !hasImage && !hasPdf) { // Only videos
            newTypes = ['gif'];
        } else if (!hasVideo) { // No videos, regular image/pdf conversion
            const allCanConvertToIco = files.every(f => f.type === 'jpg' || f.type === 'png');
            newTypes = ['png', 'jpg'];
            if (allCanConvertToIco) newTypes.push('ico');
        } else { // Mixed content
            newError = "Cannot mix videos with images/PDFs in the same batch. Please process them separately.";
            newTypes = [];
        }

        setAvailableOutputTypes(newTypes);
        setError(newError);
        
        if (newTypes.length > 0 && !newTypes.includes(toType)) {
            setToType(newTypes[0]);
        } else if (newTypes.length === 0) {
            setToType(undefined as any); // Clear selection if no options are valid
        }

    }, [files, toType]);

    const handleFileChange = (incomingFiles: FileList | null) => {
        if (!incomingFiles) return;

        setError('');
        let newManagedFiles: ManagedFile[] = [];
        let rejectedCount = 0;

        for (const file of Array.from(incomingFiles)) {
             const type = getFileType(file.name);
             if (type) {
                newManagedFiles.push({
                    id: `${file.name}-${file.lastModified}-${Math.random()}`,
                    file: file,
                    type: type,
                });
             } else {
                rejectedCount++;
             }
        }

        setFiles(prev => [...prev, ...newManagedFiles]);
        if (rejectedCount > 0) {
            setError(`${rejectedCount} file(s) had an unsupported type and were ignored.`);
        }
    };

    const handleRemoveFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const formatBytes = (bytes: number, decimals = 2): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    const getQualityLabel = (q: number): string => {
        if (q > 100) return 'Lossless (Not Compressed)';
        return `Quality: ${q}%`;
    };
    
    const getGifQualityLabel = (q: number): string => {
        const levels = ["Tiny", "Very Small", "Small", "Low", "Medium", "Good", "High", "Very High", "Excellent", "Max"];
        return `Resolution / Quality: ${levels[q-1] || 'Medium'}`;
    };


    const convertToBlob = useCallback(async (
        sourceFile: File, 
        sourceType: SupportedInput, 
        targetType: SupportedOutput, 
        qualityValue: number
    ): Promise<Blob> => {
        const qualityRatio = qualityValue > 100 ? 1.0 : qualityValue / 100;
        
        if (sourceType === 'heic') {
            const conversionResult = await heic2any({
                blob: sourceFile,
                toType: `image/${targetType === 'jpg' ? 'jpeg' : 'png'}`,
                quality: qualityRatio,
            });
            const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
            if (!(blob instanceof Blob)) throw new Error("HEIC conversion failed.");
            return blob;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                if (targetType === 'ico') {
                    width = 32;
                    height = 32;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Could not get canvas context');

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas toBlob failed.'));
                    },
                    targetType === 'jpg' ? 'image/jpeg' : 'image/png',
                    targetType === 'jpg' ? qualityRatio : undefined
                );
            };
            img.onerror = () => reject(new Error('Failed to load image.'));
            img.src = URL.createObjectURL(sourceFile);
        });
    }, []);

    useEffect(() => {
        if (files.length !== 1 || toType === 'ico' || files[0].type === 'pdf' || files[0].type === 'video') {
            setEstimatedSize(null);
            return;
        }

        if (estimationTimeoutRef.current) clearTimeout(estimationTimeoutRef.current);

        estimationTimeoutRef.current = window.setTimeout(async () => {
            try {
                const singleFile = files[0];
                const blob = await convertToBlob(singleFile.file, singleFile.type, toType, quality);
                setEstimatedSize(blob.size);
            } catch {
                setEstimatedSize(null);
            }
        }, 500);

        return () => {
            if (estimationTimeoutRef.current) clearTimeout(estimationTimeoutRef.current);
        };
    }, [files, toType, quality, convertToBlob]);

    const handleConvert = async () => {
        if (files.length === 0 || !toType) return;

        setIsProcessing(true);
        setError('');
        setProgress({ percentage: 0, text: 'Starting conversion...' });

        try {
            const totalFiles = files.length;
            const zip = new JSZip();
            let convertedFileCount = 0;
            let outputFilename = `converted_files.zip`;
            
            for (const managedFile of files) {
                const { file, type } = managedFile;
                const baseFilename = file.name.substring(0, file.name.lastIndexOf('.'));
                const fileProgressStart = (convertedFileCount / totalFiles) * 100;

                setProgress({ percentage: fileProgressStart, text: `Preparing ${file.name}...` });
                
                if (toType === 'gif' && type === 'video') {
                    if (!ffmpeg) throw new Error("FFmpeg is not loaded.");
                    
                    const scale = 150 + (gifQuality * 35); // Maps 1-10 to 185-500px width.
                    const inputFilename = `input.${file.name.split('.').pop()}`;

                    await ffmpeg.writeFile(inputFilename, await FFmpegUtil.fetchFile(file));

                    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
                        const ffmpegProgress = progress * (100 / totalFiles);
                        setProgress({
                            percentage: fileProgressStart + ffmpegProgress,
                            text: `Converting: ${file.name} (${Math.round(progress * 100)}%)`
                        });
                    });

                    await ffmpeg.exec(['-i', inputFilename, '-vf', `fps=${gifFps},scale=${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`, 'output.gif']);
                    
                    const data = await ffmpeg.readFile('output.gif');
                    zip.file(`${baseFilename}.gif`, data as Uint8Array);

                } else if (type === 'pdf') {
                    const pdfFolder = totalFiles > 1 ? zip.folder(baseFilename) : zip;
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    for (let p = 1; p <= pdf.numPages; p++) {
                        setProgress({percentage: fileProgressStart + (p/pdf.numPages * 100 / totalFiles), text: `Processing page ${p} of ${pdf.numPages}`});
                        const page = await pdf.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        const context = canvas.getContext('2d');
                        await page.render({ canvasContext: context, viewport }).promise;
                        const pageBlob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), toType === 'jpg' ? 'image/jpeg' : 'image/png', toType === 'jpg' ? (quality > 100 ? 1.0 : quality/100) : undefined));
                        pdfFolder?.file(`page_${String(p).padStart(3, '0')}.${toType}`, pageBlob);
                    }
                } else if (['jpg', 'png', 'heic'].includes(type)) {
                    const convertedBlob = await convertToBlob(file, type, toType, quality);
                    zip.file(`${baseFilename}.${toType}`, convertedBlob);
                }
                convertedFileCount++;
            }

            if (totalFiles === 1) { // If single file, don't zip
                // FIX: Cast JSZip file entries to 'any' to access their properties
                // without TypeScript errors, since JSZip types are not formally imported.
                const entries: any[] = Object.values(zip.files);
                if (entries.length > 0 && !entries[0].dir) {
                    const singleEntry = entries[0];
                    outputFilename = singleEntry.name;
                    const blob = await singleEntry.async('blob');
                    setResult({ name: outputFilename, blob, size: blob.size });
                } else { // Handle single PDF -> zip of pages
                     const finalBlob = await zip.generateAsync({ type: "blob" });
                     setResult({ name: outputFilename, blob: finalBlob, size: finalBlob.size });
                }
            } else {
                 const finalBlob = await zip.generateAsync({ type: "blob" });
                 setResult({ name: outputFilename, blob: finalBlob, size: finalBlob.size });
            }

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred during conversion.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDownload = () => {
        if (!result) return;
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.name;
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
                handleFileChange(e.dataTransfer.files);
            }
        },
    };

    if (ffmpegLoading) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center text-gray-900 font-sans relative z-10">
                <div className="p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 text-center">
                    <svg className="animate-spin h-10 w-10 text-brand-blue mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 2C6.47715 2 2 6.47715 2 12H4C4 7.58172 7.58172 4 12 4V2Z" /></svg>
                    <h2 className="text-xl font-bold text-blue-900">Loading Conversion Engine...</h2>
                    <p className="text-blue-800/80 mt-2">{progress.text}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center py-4 space-x-4">
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <h1 className="text-2xl font-bold text-blue-900">MEDIA CONVERTER</h1>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Convert Media Files</h2>
                    {files.length === 0 && (
                        <div {...dragDropHandlers}>
                            <input type="file" accept=".png,.jpg,.jpeg,.heic,.heif,.pdf,.mp4,.mov,.webm" ref={fileInputRef} multiple onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} role="button" aria-label="Upload Files"
                                className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="font-semibold text-center">{isDraggingOver ? 'Drop files here' : 'Click to upload files'}</span>
                                <span className="text-sm text-blue-900/70 text-center">{!isDraggingOver && 'or drag and drop (JPG, PNG, HEIC, PDF, MP4...)'}</span>
                            </div>
                        </div>
                    )}
                    
                    {files.length > 0 && !result && (
                         <div className="space-y-4">
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {files.map(managedFile => (
                                    <div key={managedFile.id} className="p-3 rounded-lg bg-white/70 shadow flex items-center justify-between animate-fade-in-fast">
                                        <style>{`.animate-fade-in-fast { animation: fadeIn 0.3s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                                        <div className="truncate pr-4 flex-1">
                                            <p className="font-bold text-sm text-blue-900 truncate">{managedFile.file.name}</p>
                                            <p className="text-xs text-blue-800/80">{managedFile.type.toUpperCase()} &bull; {formatBytes(managedFile.file.size)}</p>
                                        </div>
                                        <button onClick={() => handleRemoveFile(managedFile.id)} className="flex-shrink-0 p-2 rounded-full text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                             <div {...dragDropHandlers}>
                                <input type="file" multiple accept=".png,.jpg,.jpeg,.heic,.heif,.pdf,.mp4,.mov,.webm" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className={`w-full text-center py-3 border-2 rounded-lg transition-all duration-300 text-blue-900 font-semibold ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                    {isDraggingOver ? 'Drop Files to Add' : 'Add More Files'}
                                </button>
                            </div>
                            
                            <div>
                                <label htmlFor="toType" className="block text-sm font-medium text-blue-900/90 mb-2">Convert To:</label>
                                <select id="toType" value={toType ?? ''} onChange={e => setToType(e.target.value as SupportedOutput)} className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" disabled={availableOutputTypes.length === 0}>
                                    {availableOutputTypes.length === 0 && <option>Invalid file mix</option>}
                                    {availableOutputTypes.map(format => <option key={format} value={format}>{format.toUpperCase()}</option>)}
                                </select>
                            </div>

                             {toType === 'gif' && (
                                <>
                                <div>
                                    <label htmlFor="gifQuality" className="block text-sm font-medium text-blue-900/90 mb-2">{getGifQualityLabel(gifQuality)}</label>
                                    <input id="gifQuality" type="range" min="1" max="10" value={gifQuality} onChange={e => setGifQuality(parseInt(e.target.value))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <label htmlFor="gifFps" className="block text-sm font-medium text-blue-900/90 mb-2">Frames Per Second (FPS): {gifFps}</label>
                                    <input id="gifFps" type="range" min="1" max="30" value={gifFps} onChange={e => setGifFps(parseInt(e.target.value))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                </>
                            )}
                            
                            {(toType === 'jpg') && (
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label htmlFor="quality" className="block text-sm font-medium text-blue-900/90">{getQualityLabel(quality)}</label>
                                        {estimatedSize !== null && <span className="text-sm text-blue-800 font-semibold h-5">Est. Size: ~{formatBytes(estimatedSize)}</span>}
                                    </div>
                                    <input id="quality" type="range" min="1" max="101" value={quality} onChange={e => setQuality(parseInt(e.target.value))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            )}

                             {(files.some(f => f.type === 'pdf') || files.length > 1) && !files.some(f => f.type === 'video') &&
                                <p className="text-xs text-center text-blue-800/70 p-2 bg-blue-50 rounded-md">
                                    {files.some(f => f.type === 'pdf') && `All pages of any PDFs will be converted to ${toType.toUpperCase()} images. `}
                                    {files.length > 1 && 'All converted files will be downloaded as a single .zip file.'}
                                </p>
                             }

                            {isProcessing ? (
                                <div className="space-y-2">
                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-brand-blue h-4 rounded-full transition-all duration-300" style={{ width: `${progress.percentage}%` }}></div></div>
                                    <p className="text-center text-sm font-semibold text-blue-900 mt-2 truncate">{progress.text}</p>
                                </div>
                            ) : (
                                <button onClick={handleConvert} disabled={!toType || error !== ''} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">Convert {files.length} {files.length > 1 ? 'Files' : 'File'}</button>
                            )}
                         </div>
                    )}

                    {result && (
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-bold text-green-600">Conversion Complete!</h3>
                            <div className="flex justify-center items-center p-4 bg-green-50 rounded-lg">
                                <div><p className="text-sm text-green-700">Output Size</p><p className="font-bold text-lg text-green-600">{formatBytes(result.size)}</p></div>
                            </div>
                            <div className="space-y-3 pt-4">
                                <button onClick={handleDownload} className="w-full bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">Download: {result.name}</button>
                                <button onClick={resetState} className="w-full bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">Convert More Files</button>
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

export default MediaConverterApp;