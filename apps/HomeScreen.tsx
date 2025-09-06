import React from 'react';
import AppHeader from '../components/AppHeader';
import { User } from '../firebase';

export type AppKey = 'showcase' | 'shortlink' | 'pdfmerger' | 'gphotos' | 'pdfcompressor' | 'mediaconverter';

const AppCard: React.FC<{title: string, description: string, icon: JSX.Element, onClick: () => void, supportedMedia?: string}> = ({ title, description, icon, onClick, supportedMedia }) => (
    <button 
        onClick={onClick} 
        className="group relative w-full text-left p-6 md:p-8 rounded-2xl shadow-lg transition-all duration-300 ease-in-out backdrop-blur-lg bg-white/30 border border-white/20 hover:bg-brand-yellow hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50" 
        aria-label={`Open ${title} app`}
    >
        <div className={supportedMedia ? "pr-40" : ""}> {/* Add padding to prevent content from overlapping with the absolute-positioned badge */}
            <div className="flex items-start gap-6">
                <div className="flex-shrink-0 text-brand-blue group-hover:text-blue-900 transition-colors duration-300">{icon}</div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2 transition-colors duration-300">{title}</h2>
                    <p className="text-md text-blue-800/90 font-medium transition-colors duration-300">{description}</p>
                </div>
            </div>
        </div>

        {supportedMedia && (
            <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-brand-blue/10 text-brand-blue group-hover:bg-white/30 group-hover:text-blue-900 transition-colors duration-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                {supportedMedia}
            </div>
        )}
    </button>
);


const HomeScreen: React.FC<{ onSelectApp: (appKey: AppKey) => void, user: User | null }> = ({ onSelectApp, user }) => (
    <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
        <AppHeader title="Arstate Apps" user={user} />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow">
            <div className="max-w-3xl mx-auto space-y-8">
                <AppCard 
                    title="Presentation Showcase"
                    description="A curated list of my PPT slides and presentations."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    onClick={() => onSelectApp('showcase')}
                />
                <AppCard 
                    title="Short Link Generator"
                    description="Create short, shareable URLs from long links instantly."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
                    onClick={() => onSelectApp('shortlink')}
                />
                 <AppCard 
                    title="PDF Merger"
                    description="Combine PDFs and images into a single PDF file."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /><path d="M9 17h6" /></svg>}
                    onClick={() => onSelectApp('pdfmerger')}
                    supportedMedia="PDF, JPG, PNG"
                />
                <AppCard 
                    title="PDF Compressor"
                    description="Reduce the file size of your PDF files."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 20H9a2 2 0 01-2-2V6a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H3m2-4l-1-1m1 8l-1 1m16-4h-2m2-4l-1-1m-1 8l1 1" />
                    </svg>}
                    onClick={() => onSelectApp('pdfcompressor')}
                    supportedMedia="PDF"
                />
                <AppCard 
                    title="Media Converter & Compressor"
                    description="Convert and compress images and PDFs between various formats."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>}
                    onClick={() => onSelectApp('mediaconverter')}
                    supportedMedia="PNG, JPG, HEIC, PDF"
                />
                 <AppCard 
                    title="Google Photos Embedder"
                    description="Generate direct links and embed codes for your Google Photos."
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    onClick={() => onSelectApp('gphotos')}
                />
            </div>
        </main>
        <footer className="mt-auto py-6 backdrop-blur-lg bg-white/30 border-t border-white/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-blue-900/80">
              <p>&copy; 2025 Bachtiar Aryansyah Putra. All rights reserved.</p>
            </div>
        </footer>
    </div>
);

export default HomeScreen;