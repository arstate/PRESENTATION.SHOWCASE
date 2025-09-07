import React, { useState, useRef, useEffect } from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';
import { saveImageToHistory, updateImageHistory, clearImageHistory } from '../firebase';
import { GoogleGenAI } from '@google/genai';

// API Keys provided by the user
const TEXT_TO_IMAGE_API_KEY = '6bde68f0b5f5f5f414520e8331977e717cabb2c8bc2390b2a9cd0263a5254ec3092c5bd8f1a4686b8138ecc594b69c5d';
const TEXT_TO_IMAGE_API_ENDPOINT = 'https://clipdrop-api.co/text-to-image/v1';
const UNCROP_API_KEY = '7c792264bfe2b2a9f521629b7f0841164eccfa9055409d632a09c4f6281356fe3f65061a2187fbcf3b11e7b3d6dfc2cd';
const UNCROP_API_ENDPOINT = 'https://clipdrop-api.co/uncrop/v1';

type AspectRatio = '1:1' | '4:3' | '3:4';
type LoadingState = {
    active: boolean;
    message: string;
    startTime: number;
}
export type HistoryItem = {
    id: number;
    key?: string; // Firebase key
    prompt: string;
    originalImage: string; // base64
    uncroppedImages: Record<string, string>; // base64
};

const LOCAL_STORAGE_KEY = 'textToImageHistory';

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

interface TextToImageAppProps {
    onBack: () => void;
    user: User | null;
    history: HistoryItem[];
}

const TextToImageApp: React.FC<TextToImageAppProps> = ({ onBack, user, history: firebaseHistory }) => {
    const [prompt, setPrompt] = useState<string>('');
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [originalImageBlob, setOriginalImageBlob] = useState<Blob | null>(null);
    const [uncroppedImages, setUncroppedImages] = useState<Record<string, string>>({});
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [activeRatio, setActiveRatio] = useState<AspectRatio>('1:1');
    const [loadingState, setLoadingState] = useState<LoadingState>({ active: false, message: '', startTime: 0 });
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState<string>('');
    const [guestHistory, setGuestHistory] = useState<HistoryItem[]>([]);
    const [currentHistoryItem, setCurrentHistoryItem] = useState<HistoryItem | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
    const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);

    // Load history from localStorage for guests
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

    const generationHistory = user ? firebaseHistory : guestHistory;

    // Effect for the loading timer
    useEffect(() => {
        let interval: number | undefined;
        if (loadingState.active) {
            interval = window.setInterval(() => {
                setElapsedTime((Date.now() - loadingState.startTime) / 1000);
            }, 100);
        } else {
            clearInterval(interval);
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [loadingState.active, loadingState.startTime]);
    
    // Auto-resize textarea
    useEffect(() => {
        if (promptTextAreaRef.current) {
            promptTextAreaRef.current.style.height = 'auto';
            promptTextAreaRef.current.style.height = `${promptTextAreaRef.current.scrollHeight}px`;
        }
    }, [prompt]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
             if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
             Object.values(uncroppedImages).forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const cleanupImageUrls = () => {
        if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
        Object.values(uncroppedImages).forEach(url => URL.revokeObjectURL(url));
    };

    const handleStartOver = () => {
        cleanupImageUrls();
        setPrompt('');
        setGeneratedPrompt('');
        setOriginalImageBlob(null);
        setUncroppedImages({});
        setCurrentImageUrl(null);
        setActiveRatio('1:1');
        setLoadingState({ active: false, message: '', startTime: 0 });
        setError('');
        setCurrentHistoryItem(null);
    };
    
    const handleClearHistory = () => {
        if (user) {
            clearImageHistory(user.uid);
        } else {
            setGuestHistory([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    };

    const handleLoadFromHistory = (itemToLoad: HistoryItem) => {
        handleStartOver(); // Fully reset the state first
    
        try {
            const originalBlob = dataURLToBlob(itemToLoad.originalImage);
            setOriginalImageBlob(originalBlob);
            setCurrentImageUrl(URL.createObjectURL(originalBlob));
            
            const newUncroppedImageUrls: Record<string, string> = {};
            for (const ratio in itemToLoad.uncroppedImages) {
                const dataURL = itemToLoad.uncroppedImages[ratio];
                const blob = dataURLToBlob(dataURL);
                newUncroppedImageUrls[ratio] = URL.createObjectURL(blob);
            }
            setUncroppedImages(newUncroppedImageUrls);
            
            setPrompt(itemToLoad.prompt);
            setGeneratedPrompt(itemToLoad.prompt);
            setCurrentHistoryItem(itemToLoad);
            setActiveRatio('1:1');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            setError("Failed to load history item. It may be corrupted.");
            console.error(e);
            handleStartOver(); // Reset if loading fails
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to enhance.');
            return;
        }
        
        setIsEnhancing(true);
        setError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = "You are an expert prompt engineer for text-to-image AI models. Your task is to take a user's simple prompt and expand it into a detailed, descriptive, and visually rich prompt. Focus on cinematic language, lighting, composition, and artistic style. The output must be a single, cohesive prompt string only, without any additional explanations, introductions, or conversational text. The enhanced prompt must not exceed 1000 characters.";
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt.trim(),
                config: {
                    systemInstruction: systemInstruction,
                },
            });
            
            const enhancedPrompt = response.text.trim();
            const cleanedPrompt = enhancedPrompt.replace(/^"|"$|^```json\s*|```$|^```\s*/gm, '').trim();
            setPrompt(cleanedPrompt);

        } catch (err) {
            console.error("Prompt enhancement failed:", err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to enhance prompt: ${message}`);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        
        handleStartOver(); // Clear previous results before starting
        setLoadingState({ active: true, message: 'Generating...', startTime: Date.now() });
        const currentPrompt = prompt.trim();
        
        const formData = new FormData();
        formData.append('prompt', currentPrompt);

        try {
            const response = await fetch(TEXT_TO_IMAGE_API_ENDPOINT, {
                method: 'POST',
                headers: { 'x-api-key': TEXT_TO_IMAGE_API_KEY },
                body: formData,
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
                 throw new Error(errorData.error || `API responded with status: ${response.status}`);
            }

            const imageBlob = await response.blob();
            if (imageBlob.type.startsWith('image/')) {
                 setOriginalImageBlob(imageBlob);
                 setCurrentImageUrl(URL.createObjectURL(imageBlob));
                 setGeneratedPrompt(currentPrompt);

                 // Save to history (Firebase or localStorage)
                 const imageB64 = await blobToDataURL(imageBlob);
                 const newItem: HistoryItem = {
                     id: Date.now(),
                     prompt: currentPrompt,
                     originalImage: imageB64,
                     uncroppedImages: {},
                 };

                 if (user) {
                     const savedItem = await saveImageToHistory(user.uid, newItem);
                     setCurrentHistoryItem(savedItem);
                 } else {
                     const newHistory = [newItem, ...generationHistory];
                     setGuestHistory(newHistory);
                     localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newHistory));
                     setCurrentHistoryItem(newItem);
                 }

            } else {
                 const errorText = await imageBlob.text();
                 let errorMessage = 'Received an unexpected response from the API.';
                 try {
                     const errorJson = JSON.parse(errorText);
                     if(errorJson.error) errorMessage = errorJson.error;
                 } catch {}
                 throw new Error(errorMessage);
            }

        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate image: ${message}`);
            handleStartOver();
        } finally {
            setLoadingState({ active: false, message: '', startTime: 0 });
        }
    };
    
    const handleUncrop = async (targetRatio: '4:3' | '3:4') => {
        if (!originalImageBlob || loadingState.active || !currentHistoryItem) return;
        
        setLoadingState({ active: true, message: `Uncropping to ${targetRatio}...`, startTime: Date.now() });
        setError('');

        const formData = new FormData();
        formData.append('image_file', originalImageBlob);

        const originalDim = 1024;
        const targetDim = Math.round(originalDim * (4 / 3));
        const totalExtension = targetDim - originalDim;

        const extension1 = Math.floor(totalExtension / 2);
        const extension2 = Math.ceil(totalExtension / 2);

        if (targetRatio === '4:3') {
            formData.append('extend_left', String(extension1));
            formData.append('extend_right', String(extension2));
        } else {
            formData.append('extend_up', String(extension1));
            formData.append('extend_down', String(extension2));
        }

        try {
            const response = await fetch(UNCROP_API_ENDPOINT, {
                method: 'POST',
                headers: { 'x-api-key': UNCROP_API_KEY },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Uncrop API error.' }));
                throw new Error(errorData.error || `API responded with status: ${response.status}`);
            }

            const uncroppedBlob = await response.blob();
            const imageUrl = URL.createObjectURL(uncroppedBlob);
            
            setUncroppedImages(prev => ({ ...prev, [targetRatio]: imageUrl }));
            setCurrentImageUrl(imageUrl);
            
            const uncroppedB64 = await blobToDataURL(uncroppedBlob);
            const updatedUncropped = {
                ...currentHistoryItem.uncroppedImages,
                [targetRatio]: uncroppedB64
            };

            // Update history (Firebase or localStorage)
            if (user && currentHistoryItem.key) {
                await updateImageHistory(user.uid, currentHistoryItem.key, { uncroppedImages: updatedUncropped });
            } else {
                const updatedHistory = generationHistory.map(item =>
                    item.id === currentHistoryItem.id
                        ? { ...item, uncroppedImages: updatedUncropped }
                        : item
                );
                setGuestHistory(updatedHistory);
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
            }
            
            // Update local state for consistency
            setCurrentHistoryItem(prev => prev ? { ...prev, uncroppedImages: updatedUncropped } : null);

        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to uncrop image: ${message}`);
            setActiveRatio('1:1');
            if (originalImageBlob) setCurrentImageUrl(URL.createObjectURL(originalImageBlob));
        } finally {
            setLoadingState({ active: false, message: '', startTime: 0 });
        }
    };

    const handleAspectRatioChange = (newRatio: AspectRatio) => {
        setActiveRatio(newRatio);
        
        if (newRatio === '1:1' && originalImageBlob) {
            // cleanupImageUrls(); // This was causing issues by revoking the original blob URL
            setCurrentImageUrl(URL.createObjectURL(originalImageBlob));
            return;
        }

        if (uncroppedImages[newRatio]) {
            setCurrentImageUrl(uncroppedImages[newRatio]);
        } else if (newRatio !== '1:1') {
            handleUncrop(newRatio);
        }
    };

    const handleDownload = async () => {
        if (!currentImageUrl) return;
        
        try {
            const response = await fetch(currentImageUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safePrompt = generatedPrompt.substring(0, 20).replace(/\s/g, '_') || 'image';
            link.download = `generated-${safePrompt}-${activeRatio.replace(':', 'x')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError("Failed to prepare image for download.");
            console.error(err);
        }
    };
    
    const isLoadingState = loadingState.active;

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <AppHeader title="TEXT TO IMAGE AI" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                <div className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 transition-all duration-300">
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Generate an Image from Text</h2>
                    
                    {!currentImageUrl && !isLoadingState && (
                        <form onSubmit={handleGenerate} className="space-y-6">
                            <div>
                                <label htmlFor="promptInput" className="block text-sm font-medium text-blue-900/90 mb-2">Enter your prompt</label>
                                <textarea id="promptInput" ref={promptTextAreaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A cinematic shot of a raccoon astronaut in a retro space suit, dramatic lighting" required rows={3} maxLength={1000} className="w-full px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition resize-none overflow-hidden" />
                                 <div className="flex justify-between items-center mt-2">
                                    <button
                                        type="button"
                                        onClick={handleEnhancePrompt}
                                        disabled={isLoadingState || isEnhancing || !prompt.trim()}
                                        className="inline-flex items-center gap-2 bg-brand-yellow text-blue-900 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-yellow disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isEnhancing ? (
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        )}
                                        Enhance Prompt
                                    </button>
                                    <p className="text-xs text-blue-900/70">{prompt.length} / 1000</p>
                                </div>
                            </div>
                            <div>
                                <button type="submit" disabled={isLoadingState || isEnhancing} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    Generate Image
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {isLoadingState && (
                         <div className="text-center my-4 text-blue-900 space-y-4">
                            <div className="w-full aspect-square bg-gray-300/50 rounded-lg flex items-center justify-center">
                                <svg className="animate-spin h-16 w-16 text-brand-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                            <p className="font-semibold text-lg">{loadingState.message}</p>
                            <p className="text-2xl font-mono text-brand-blue">{elapsedTime.toFixed(1)}s</p>
                         </div>
                    )}
                    
                    {currentImageUrl && !isLoadingState && (
                        <div className="text-center space-y-6">
                             <div>
                                <h3 className="text-lg font-bold text-blue-900 mb-2">Your Generated Image</h3>
                                <div className={`relative rounded-lg shadow-md inline-block overflow-hidden w-full bg-gray-200 
                                    ${activeRatio === '4:3' ? 'aspect-[4/3]' : activeRatio === '3:4' ? 'aspect-[3/4]' : 'aspect-square'}`}
                                >
                                    <img src={currentImageUrl} alt="AI generated image" className="w-full h-full object-contain" />
                                </div>
                                <p className="text-sm text-blue-800/80 italic mt-3 max-w-lg mx-auto">"{generatedPrompt}"</p>
                             </div>

                             <div className="pt-4 mt-4 border-t border-brand-blue/20">
                                <h4 className="text-md font-bold text-blue-900 mb-3 text-center">Aspect Ratio</h4>
                                <div className="flex justify-center gap-3">
                                    {(['1:1', '4:3', '3:4'] as AspectRatio[]).map(ratio => {
                                        const isActive = activeRatio === ratio;
                                        return (
                                            <button key={ratio} onClick={() => handleAspectRatioChange(ratio)}  className={`px-4 py-2 text-sm font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isActive ? 'bg-brand-blue text-white focus:ring-brand-blue' : 'bg-white/70 text-blue-900 hover:bg-blue-100 focus:ring-brand-blue'}`}>
                                                {ratio} ({ratio === '1:1' ? 'Original' : ratio === '4:3' ? 'Landscape' : 'Portrait'})
                                            </button>
                                        );
                                    })}
                                </div>
                             </div>

                             <div className="flex justify-center items-center gap-4 pt-4 border-t border-brand-blue/20">
                                <button onClick={handleStartOver} className="bg-brand-yellow text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2 transition">
                                    Generate Another
                                </button>
                                <button onClick={handleDownload} className="inline-block bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                                    Download
                                </button>
                             </div>
                        </div>
                    )}
                    
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                </div>

                {generationHistory.length > 0 && (
                    <div className="w-full max-w-4xl mx-auto mt-12 p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-blue-900">Generation History</h3>
                            <button onClick={handleClearHistory} className="text-sm font-semibold text-red-600 hover:text-red-800 focus:outline-none focus:underline">Clear History</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {generationHistory.map(item => (
                                <button key={item.id} onClick={() => handleLoadFromHistory(item)} className="group relative block w-full aspect-square bg-gray-200 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2">
                                    <img src={item.originalImage} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                                        <p className="text-white text-xs text-center line-clamp-3">{item.prompt}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
            <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
                  <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default TextToImageApp;