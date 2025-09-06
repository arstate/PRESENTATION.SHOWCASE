import React, { useState, useRef, useEffect, useCallback } from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

// Declare global libraries from CDN
declare const pdfjsLib: any;
declare const JSZip: any;
declare const heic2any: any;

type SupportedInput = 'png' | 'jpg' | 'heic' | 'pdf';
type SupportedOutput = 'png' | 'jpg' | 'ico';

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

const MediaConverterApp: React.FC<{ onBack: () => void, user: User }> = ({ onBack, user }) => {
    const [files, setFiles] = useState<ManagedFile[]>([]);
    const [toType, setToType] = useState<SupportedOutput>('png');
    const [availableOutputTypes, setAvailableOutputTypes] = useState<SupportedOutput[]>(['png', 'jpg', 'ico']);
    const [quality, setQuality] = useState<number>(92);
    const [resolution, setResolution] = useState<number>(100); // New: resolution percentage
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ percentage: 0, text: '' });
    const [result, setResult] = useState<ConversionResult | null>(null);
    const [error, setError] = useState('');
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
    const [estimatedDimensions, setEstimatedDimensions] = useState<string | null>(null); // New: estimated output dimensions
    const fileInputRef = useRef<HTMLInputElement>(null);
    const estimationTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
        }
    }, []);

    const resetState = () => {
        setFiles([]);
        setToType('png');
        setAvailableOutputTypes(['png', 'jpg', 'ico']);
        setQuality(92);
        setResolution(100);
        setIsProcessing(false);
        setProgress({ percentage: 0, text: '' });
        setResult(null);
        setError('');
        setEstimatedSize(null);
        setEstimatedDimensions(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const getFileType = (fileName: string): SupportedInput | null => {
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg'].includes(extension)) return 'jpg';
        if (extension === 'png') return 'png';
        if (['heic', 'heif'].includes(extension)) return 'heic';
        if (extension === 'pdf') return 'pdf';
        return null;
    };
    
    useEffect(() => {
        if (files.length === 0) {
            setAvailableOutputTypes(['png', 'jpg', 'ico']);
            return;
        }
        
        const fileTypes = new Set(files.map(f => f.type));
        const canConvertToPng = true; // Always true
        const canConvertToJpg = true; // Always true
        
        // ICO is only available if all files are images (not PDF) and we're not converting from the same type
        const allAreImages = files.every(f => f.type === 'jpg' || f.type === 'png' || f.type === 'heic');
        const canConvertToIco = allAreImages;
        
        // Allow same-type conversion for images (compression), but not for PDF
        const canConvertToSameType = !fileTypes.has('pdf');

        const commonTypes: SupportedOutput[] = [];
        if (canConvertToPng) commonTypes.push('png');
        if (canConvertToJpg) commonTypes.push('jpg');
        if (canConvertToIco) commonTypes.push('ico');

        setAvailableOutputTypes(commonTypes);

        if (!commonTypes.includes(toType)) {
            setToType(commonTypes[0] || 'png');
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
    
    const getResolutionLabel = (res: number): string => {
        if (res === 100) return 'Resolution: Original (100%)';
        return `Resolution: ${res}%`;
    };

    const getQualityLabel = (q: number): string => {
        if (q > 100) return 'Lossless (Not Compressed)';
        return `Quality: ${q}%`;
    };

    // Helper function for PNG compression via JPG intermediate
    const canvasToCompressedPngBlob = (canvas: HTMLCanvasElement, qualityRatio: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            // 1. Canvas to JPG blob
            canvas.toBlob(
                (jpgBlob) => {
                    if (!jpgBlob) return reject(new Error('Intermediate JPG creation failed.'));
                    
                    const img = new Image();
                    const url = URL.createObjectURL(jpgBlob);

                    // 2. Load JPG blob into a new image element
                    img.onload = () => {
                        // 3. Draw new image to a new canvas
                        const finalCanvas = document.createElement('canvas');
                        finalCanvas.width = img.width;
                        finalCanvas.height = img.height;
                        const ctx = finalCanvas.getContext('2d');
                        if (!ctx) {
                            URL.revokeObjectURL(url);
                            return reject(new Error('Could not get final canvas context.'));
                        }
                        ctx.drawImage(img, 0, 0);

                        // 4. New canvas to final PNG blob
                        finalCanvas.toBlob((pngBlob) => {
                            URL.revokeObjectURL(url); // Cleanup
                            if (pngBlob) resolve(pngBlob);
                            else reject(new Error('Final PNG creation failed.'));
                        }, 'image/png');
                    };

                    img.onerror = () => {
                        URL.revokeObjectURL(url); // Cleanup
                        reject(new Error('Failed to load intermediate JPG.'));
                    };

                    img.src = url;
                },
                'image/jpeg',
                qualityRatio
            );
        });
    };

    const convertToBlob = useCallback(async (
        sourceFile: File, 
        sourceType: SupportedInput, 
        targetType: SupportedOutput, 
        qualityValue: number,
        resolutionValue: number
    ): Promise<Blob> => {
        const qualityRatio = qualityValue > 100 ? 1.0 : qualityValue / 100;
        const resolutionRatio = resolutionValue / 100;
        
        if (sourceType === 'heic') {
             // heic2any doesn't support resolution scaling directly.
             // We first convert it to a temporary in-memory PNG blob.
            const heicToPngBlob = await heic2any({ blob: sourceFile, toType: 'image/png' });
            const tempBlob = Array.isArray(heicToPngBlob) ? heicToPngBlob[0] : heicToPngBlob;
            if (!(tempBlob instanceof Blob)) throw new Error("HEIC conversion failed.");

            // Now, we create a temporary File object and recursively call this function to apply
            // resolution scaling and the final conversion to the target type.
            const tempFile = new File([tempBlob], "temp.png", { type: 'image/png' });
            return convertToBlob(tempFile, 'png', targetType, qualityValue, resolutionValue);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(sourceFile);

            img.onload = () => {
                URL.revokeObjectURL(url); // Cleanup after image is loaded into memory
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                if (targetType === 'ico') {
                    width = 32;
                    height = 32;
                } else {
                    width = Math.max(1, Math.round(width * resolutionRatio));
                    height = Math.max(1, Math.round(height * resolutionRatio));
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Could not get canvas context');

                ctx.drawImage(img, 0, 0, width, height);
                
                if (targetType === 'png' && qualityValue <= 100) {
                    canvasToCompressedPngBlob(canvas, qualityRatio).then(resolve).catch(reject);
                } else {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed.'));
                        },
                        targetType === 'jpg' ? 'image/jpeg' : 'image/png',
                        targetType === 'jpg' ? qualityRatio : undefined
                    );
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url); // Cleanup on error too
                reject(new Error('Failed to load image.'));
            };

            img.src = url;
        });
    }, []);

    useEffect(() => {
        if (files.length === 1 && files[0].type !== 'pdf' && toType !== 'ico') {
            const file = files[0].file;
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const newWidth = Math.round(img.width * (resolution / 100));
                const newHeight = Math.round(img.height * (resolution / 100));
                setEstimatedDimensions(`${newWidth} x ${newHeight} px`);
                URL.revokeObjectURL(url);
            };
            img.onerror = () => {
                setEstimatedDimensions(null);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        } else {
            setEstimatedDimensions(null);
        }
    }, [files, resolution, toType]);

    useEffect(() => {
        if (files.length !== 1 || toType === 'ico' || files[0].type === 'pdf') {
            setEstimatedSize(null);
            return;
        }

        if (estimationTimeoutRef.current) clearTimeout(estimationTimeoutRef.current);

        estimationTimeoutRef.current = window.setTimeout(async () => {
            try {
                const singleFile = files[0];
                const blob = await convertToBlob(singleFile.file, singleFile.type, toType, quality, resolution);
                setEstimatedSize(blob.size);
            } catch {
                setEstimatedSize(null);
            }
        }, 500);

        return () => {
            if (estimationTimeoutRef.current) clearTimeout(estimationTimeoutRef.current);
        };
    }, [files, toType, quality, resolution, convertToBlob]);

    const handleConvert = async () => {
        if (files.length === 0 || !toType) return;

        setIsProcessing(true);
        setError('');
        setProgress({ percentage: 0, text: 'Starting conversion...' });

        try {
            const totalFiles = files.length;
            const isSingleFile = totalFiles === 1;

            let finalBlob: Blob;
            let outputFilename: string;

            if (isSingleFile && files[0].type !== 'pdf') {
                const managedFile = files[0];
                const { file, type } = managedFile;
                const baseFilename = file.name.substring(0, file.name.lastIndexOf('.'));

                setProgress({ percentage: 50, text: `Converting ${file.name}...` });
                finalBlob = await convertToBlob(file, type, toType, quality, resolution);
                outputFilename = `${baseFilename}.${toType}`;
                setProgress({ percentage: 100, text: 'Complete!' });
            } else { // Multiple files or any PDF, always zip
                const zip = new JSZip();
                const baseZipName = files.length === 1 ? files[0].file.name.substring(0, files[0].file.name.lastIndexOf('.')) : 'converted_files';
                outputFilename = `${baseZipName}.zip`;

                for (let i = 0; i < totalFiles; i++) {
                    const managedFile = files[i];
                    const { file, type } = managedFile;
                    const baseFilename = file.name.substring(0, file.name.lastIndexOf('.'));
                    
                    const overallProgress = ((i + 1) / totalFiles) * 100;
                    setProgress({ percentage: overallProgress, text: `Converting file ${i + 1} of ${totalFiles}: ${file.name}` });

                    if (type === 'pdf') {
                        const pdfFolder = totalFiles > 1 ? zip.folder(baseFilename) : zip;
                        const arrayBuffer = await file.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        for (let p = 1; p <= pdf.numPages; p++) {
                            const page = await pdf.getPage(p);
                            const resolutionRatio = resolution / 100;
                            const viewport = page.getViewport({ scale: 2.0 * resolutionRatio });
                            const canvas = document.createElement('canvas');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            const context = canvas.getContext('2d');
                            await page.render({ canvasContext: context, viewport }).promise;

                            let pageBlob: Blob;
                            const qualityRatio = quality > 100 ? 1.0 : quality/100;
                            if (toType === 'png' && quality <= 100) {
                                pageBlob = await canvasToCompressedPngBlob(canvas, qualityRatio);
                            } else {
                                pageBlob = await new Promise(resolve => canvas.toBlob(b => resolve(b!), toType === 'jpg' ? 'image/jpeg' : 'image/png', toType === 'jpg' ? qualityRatio : undefined));
                            }

                            pdfFolder?.file(`page_${String(p).padStart(3, '0')}.${toType}`, pageBlob);
                        }
                    } else {
                        const convertedBlob = await convertToBlob(file, type, toType, quality, resolution);
                        zip.file(`${baseFilename}.${toType}`, convertedBlob);
                    }
                }
                finalBlob = await zip.generateAsync({ type: "blob" });
            }
            
            setResult({ name: outputFilename, blob: finalBlob, size: finalBlob.size });

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

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <AppHeader title="MEDIA CONVERTER & COMPRESSOR" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-2xl p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Convert & Compress Media Files</h2>
                    {files.length === 0 && (
                        <div {...dragDropHandlers}>
                            <input type="file" accept=".png,.jpg,.jpeg,.heic,.heif,.pdf" ref={fileInputRef} multiple onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                            <div onClick={() => fileInputRef.current?.click()} role="button" aria-label="Upload Files"
                                className={`w-full flex flex-col items-center justify-center p-8 border-2 rounded-lg transition-all duration-300 cursor-pointer text-blue-900 ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-2 text-brand-blue transition-transform duration-300 ${isDraggingOver ? 'scale-110' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                <span className="font-semibold text-center">{isDraggingOver ? 'Drop files here' : 'Click to upload files'}</span>
                                <span className="text-sm text-blue-900/70 text-center">{!isDraggingOver && 'or drag and drop (JPG, PNG, HEIC, PDF)'}</span>
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
                                <input type="file" multiple accept=".png,.jpg,.jpeg,.heic,.heif,.pdf" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className={`w-full text-center py-3 border-2 rounded-lg transition-all duration-300 text-blue-900 font-semibold ${isDraggingOver ? 'border-solid border-brand-blue bg-blue-50 scale-105 shadow-inner' : 'border-dashed border-brand-blue/50 bg-white/50 hover:bg-blue-50/50'}`}>
                                    {isDraggingOver ? 'Drop Files to Add' : 'Add More Files'}
                                </button>
                            </div>
                            
                            <div>
                                <label htmlFor="toType" className="block text-sm font-medium text-blue-900/90 mb-2">Convert To:</label>
                                <select id="toType" value={toType ?? ''} onChange={e => setToType(e.target.value as SupportedOutput)} className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition">
                                    {availableOutputTypes.map(format => <option key={format} value={format}>{format.toUpperCase()}</option>)}
                                </select>
                            </div>
                             
                            {(toType === 'jpg' || toType === 'png') && (
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label htmlFor="resolution" className="block text-sm font-medium text-blue-900/90">{getResolutionLabel(resolution)}</label>
                                        {estimatedDimensions && <span className="text-sm text-blue-800 font-semibold h-5">{estimatedDimensions}</span>}
                                    </div>
                                    <input id="resolution" type="range" min="10" max="100" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            )}
                            
                            {(toType === 'jpg' || toType === 'png') && (
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label htmlFor="quality" className="block text-sm font-medium text-blue-900/90">{getQualityLabel(quality)}</label>
                                        {estimatedSize !== null && <span className="text-sm text-blue-800 font-semibold h-5">Est. Size: ~{formatBytes(estimatedSize)}</span>}
                                    </div>
                                    <input id="quality" type="range" min="1" max="101" value={quality} onChange={e => setQuality(parseInt(e.target.value))} className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            )}

                             {(files.some(f => f.type === 'pdf') || files.length > 1) &&
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
                                <button onClick={handleConvert} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">Convert {files.length} {files.length > 1 ? 'Files' : 'File'}</button>
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