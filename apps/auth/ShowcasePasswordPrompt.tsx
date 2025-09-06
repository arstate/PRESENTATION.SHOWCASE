import React, { useState } from 'react';
import AppHeader from '../../components/AppHeader';
import { User } from '../../firebase';

interface ShowcasePasswordPromptProps {
    onSuccess: () => void;
    onBack: () => void;
    user: User;
}

const ShowcasePasswordPrompt: React.FC<ShowcasePasswordPromptProps> = ({ onSuccess, onBack, user }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate a small delay for better UX
        setTimeout(() => {
            if (password === 'arya1509') {
                onSuccess();
            } else {
                setError('Incorrect password. Please try again.');
                setPassword('');
            }
            setIsLoading(false);
        }, 500);
    };

    const whatsappNumber = '6289617323344';
    const whatsappMessage = encodeURIComponent('Halo, saya ingin meminta akses untuk melihat Presentation Showcase.');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    return (
        <div className="flex flex-col min-h-screen text-gray-900 font-sans relative z-10">
            <AppHeader title="PRESENTATION SHOWCASE" onBack={onBack} user={user} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-grow flex items-center justify-center">
                <div className="w-full max-w-md p-6 md:p-8 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20">
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-6 text-center">Enter Password</h2>
                        <p className="text-center text-blue-800/90 mb-6">This section is password protected.</p>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="passwordInput" className="block text-sm font-medium text-blue-900/90 mb-2 sr-only">Password</label>
                                <input 
                                    id="passwordInput" 
                                    type="password" 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    placeholder="Password" 
                                    required 
                                    autoFocus
                                    className="w-full text-center px-4 py-3 rounded-lg border-2 border-transparent bg-white/50 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition" />
                            </div>
                            <div>
                                <button type="submit" disabled={isLoading} className="w-full bg-brand-blue text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? (<svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : 'Unlock'}
                                </button>
                            </div>
                        </div>
                    </form>
                    {error && <p className="mt-4 text-center text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    <div className="mt-6 pt-6 border-t border-brand-blue/20 text-center">
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                        >
                           <img src="https://lh3.googleusercontent.com/pw/AP1GczN6VDfNdtar_-u-vK9qwXyVCDunpIfuuoW6WagrKAMy0tuw4rMJ2Q6kFnFdSoMHbAsj6BjB0LOytkctyQwXIENGfHSmrWymF6IzDT6j-YnXMVzFXYQ=w48" alt="WhatsApp Icon" className="w-5 h-5 saturate-0 brightness-[100]" />
                           Get Access
                        </a>
                    </div>
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

export default ShowcasePasswordPrompt;