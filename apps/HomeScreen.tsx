import React, { useState } from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

export type AppKey = 'showcase' | 'shortlink' | 'pdfmerger' | 'gphotos' | 'pdfcompressor' | 'mediaconverter' | 'removebackground' | 'texttoimage' | 'imageupscaling';
type AppCategory = 'AI' | 'PDF' | 'Tools';
type AppFilter = AppCategory | 'All' | 'Favorites';

interface AppData {
    key: AppKey;
    title: string;
    description: string;
    // Fix: Changed JSX.Element to React.ReactElement to resolve namespace issue.
    icon: React.ReactElement;
    supportedMedia?: string;
    categories: AppCategory[];
}

// Export appsData so other components like App.tsx can use it.
export const appsData: AppData[] = ([
    {
        key: 'imageupscaling',
        title: 'AI Image Upscaling',
        description: 'Enlarge low-resolution images without losing quality.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 8v4m4-4h-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V3h4m14 4V3h-4M3 17v4h4m14-4v4h-4" />
            </svg>
        ),
        supportedMedia: 'PNG, JPG, WEBP',
        categories: ['AI'],
    },
    {
        key: 'gphotos',
        title: 'Google Photos Embedder',
        description: 'Generate direct links and embed codes for your Google Photos.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        categories: ['Tools'],
    },
    {
        key: 'mediaconverter',
        title: 'Media Converter & Compressor',
        description: 'Convert and compress images and PDFs between various formats.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
        ),
        supportedMedia: 'PNG, JPG, HEIC, PDF',
        categories: ['Tools'],
    },
    {
        key: 'pdfcompressor',
        title: 'PDF Compressor',
        description: 'Reduce the file size of your PDF files.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 20H9a2 2 0 01-2-2V6a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H3m2-4l-1-1m1 8l-1 1m16-4h-2m2-4l-1-1m-1 8l1 1" />
            </svg>
        ),
        supportedMedia: 'PDF',
        categories: ['PDF', 'Tools'],
    },
    {
        key: 'pdfmerger',
        title: 'PDF Merger',
        description: 'Combine PDFs and images into a single PDF file.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /><path d="M9 17h6" /></svg>,
        supportedMedia: 'PDF, JPG, PNG',
        categories: ['PDF', 'Tools'],
    },
    {
        key: 'showcase',
        title: 'Presentation Showcase',
        description: 'A curated list of my PPT slides and presentations.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        categories: ['Tools'],
    },
    {
        key: 'removebackground',
        title: 'Remove Background',
        description: 'Automatically erase the background from any image.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7L10 7L4 15L14 15L20 7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 7L8 15" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v4M4 5h4" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 15v4M17 17h4" />
            </svg>
        ),
        supportedMedia: 'PNG, JPG, WEBP',
        categories: ['AI', 'Tools'],
    },
    {
        key: 'shortlink',
        title: 'Short Link Generator',
        description: 'Create short, shareable URLs from long links instantly.',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
        categories: ['Tools'],
    },
    {
        key: 'texttoimage',
        title: 'Text to Image AI',
        description: 'Generate unique images from a text description.',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 2.5l1 1" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5l1 1" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 14.5l1 1" />
            </svg>
        ),
        categories: ['AI'],
    }
] as AppData[]).sort((a, b) => a.title.localeCompare(b.title));


const AppCard: React.FC<{
    title: string;
    description: string;
    // Fix: Changed JSX.Element to React.ReactElement to resolve namespace issue.
    icon: React.ReactElement;
    onClick: () => void;
    supportedMedia?: string;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}> = ({ title, description, icon, onClick, supportedMedia, isFavorite, onToggleFavorite }) => (
    <button 
        onClick={onClick} 
        className="group relative w-full text-left p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out backdrop-blur-lg bg-white/30 border border-white/20 hover:bg-brand-yellow hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50" 
        aria-label={`Open ${title} app`}
    >
        <div className={supportedMedia ? "pr-40" : "pr-16"}>
            <div className="flex items-start gap-6">
                <div className="flex-shrink-0 text-brand-blue group-hover:text-blue-900 transition-colors duration-300">{icon}</div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 transition-colors duration-300">{title}</h2>
                    <p className="text-md text-blue-800/90 font-medium transition-colors duration-300">{description}</p>
                </div>
            </div>
        </div>

        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label={isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
            aria-pressed={isFavorite}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-all duration-200 ease-in-out ${isFavorite ? 'text-brand-blue scale-110' : 'text-blue-900/50'}`} fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </button>

        {supportedMedia && (
            <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-brand-blue/10 text-brand-blue group-hover:bg-white/30 group-hover:text-blue-900 transition-colors duration-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                {supportedMedia}
            </div>
        )}
    </button>
);


const HomeScreen: React.FC<{ 
    onSelectApp: (appKey: AppKey) => void; 
    user: User | null;
    favorites: Set<AppKey>;
    onToggleFavorite: (appKey: AppKey) => void;
}> = ({ onSelectApp, user, favorites, onToggleFavorite }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<AppFilter>('All');
    const filters: AppFilter[] = ['All', 'Favorites', 'AI', 'PDF', 'Tools'];

    const filteredApps = appsData.filter(app => {
        const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              app.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesFilter = activeFilter === 'All' 
            || (activeFilter === 'Favorites' && favorites.has(app.key))
            || (activeFilter !== 'Favorites' && app.categories.includes(activeFilter as AppCategory));


        return matchesSearch && matchesFilter;
    });

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <AppHeader title="Arstate Apps" user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
                
                <div className="max-w-3xl mx-auto mb-10 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-blue-900/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text"
                            placeholder="Search apps by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-full border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition shadow-sm"
                            aria-label="Search for an application"
                        />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`inline-flex items-center justify-center font-bold rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-colors duration-200 ${
                                    activeFilter === filter 
                                        ? 'bg-brand-blue text-white shadow' 
                                        : 'bg-white/50 text-blue-900 hover:bg-white/80'
                                } ${filter === 'Favorites' ? 'w-10 h-10' : 'px-4 py-2 text-sm gap-2'}`}
                                aria-pressed={activeFilter === filter}
                                aria-label={filter}
                            >
                                {filter === 'Favorites' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    filter
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="max-w-3xl mx-auto space-y-8">
                    {filteredApps.length > 0 ? (
                        filteredApps.map(app => (
                            <AppCard 
                                key={app.key}
                                title={app.title}
                                description={app.description}
                                icon={app.icon}
                                supportedMedia={app.supportedMedia}
                                onClick={() => onSelectApp(app.key)}
                                isFavorite={favorites.has(app.key)}
                                onToggleFavorite={() => onToggleFavorite(app.key)}
                            />
                        ))
                    ) : (
                        <div className="text-center p-8 backdrop-blur-lg bg-white/30 border border-white/20 rounded-2xl">
                            <h3 className="text-2xl font-bold text-blue-900">No Apps Found</h3>
                            <p className="text-blue-800/90 mt-2">Try adjusting your search or filter.</p>
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
}

export default HomeScreen;