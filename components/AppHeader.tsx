import React, { useState, useRef, useEffect } from 'react';
import { User } from '../firebase';
import { signOutUser } from '../firebase';

interface AppHeaderProps {
    title: string;
    user: User | null;
    onBack?: () => void;
    showSearch?: boolean; // For presentation showcase
    searchProps?: any; // For presentation showcase
}

const UserProfile: React.FC<{ user: User }> = ({ user }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOutUser();
        } catch (error) {
            console.error("Sign out error", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-10 h-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-yellow focus:ring-white">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=3b82f6&color=fff`} alt={user.displayName || 'User profile'} className="w-full h-full object-cover" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        Signed in as<br/>
                        <strong className="truncate block">{user.displayName || user.email}</strong>
                    </div>
                    <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
};


const AppHeader: React.FC<AppHeaderProps> = ({ title, user, onBack, showSearch = false, searchProps = {} }) => {
    if (showSearch) {
        // This is a special case just for the presentation showcase app to keep its complex search UI
        const { isSearchActive, setIsSearchActive, searchQuery, handleSearchChange, handleSearchCommit, handleCloseSearch, searchInputRef } = searchProps;
        return (
            <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between py-4 space-x-4">
                    {onBack && (
                        <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                    )}
                    <div className="flex-1">
                        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isSearchActive ? 'w-0 opacity-0 pointer-events-none sm:w-auto sm:opacity-100 sm:pointer-events-auto' : 'w-auto opacity-100'}`}>
                            <h1 className="text-2xl font-bold text-blue-900 whitespace-nowrap">{title}</h1>
                        </div>
                    </div>
                    <div className="relative flex items-center justify-end space-x-4">
                      <div className={`flex items-center h-10 transition-all duration-400 ease-in-out ${isSearchActive ? 'w-full max-w-xs bg-white rounded-full shadow-md' : 'w-10 bg-white rounded-full shadow-sm hover:shadow-md'}`}>
                        <div className="relative w-full h-full">
                          <button onClick={() => setIsSearchActive(true)} disabled={isSearchActive} className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-500 focus:outline-none transition-all duration-400 ease-in-out ${isSearchActive ? 'left-1 cursor-default' : 'left-0'}`} aria-label="Search presentations">
                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          </button>
                          <input ref={searchInputRef} type="text" placeholder="Search..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} onBlur={handleSearchCommit} onKeyDown={(e) => { if (e.key === 'Enter') { handleSearchCommit(); (e.target as HTMLInputElement).blur(); } }} className={`w-full h-full bg-transparent py-2 transition-all duration-400 ease-in-out focus:outline-none text-gray-800 ${isSearchActive ? 'pl-10 pr-8 opacity-100' : 'pl-8 opacity-0 pointer-events-none'}`} aria-hidden={!isSearchActive} />
                          {isSearchActive && (<button onMouseDown={(e) => e.preventDefault()} onClick={handleCloseSearch} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800 focus:outline-none rounded-full" aria-label="Close search bar"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>)}
                        </div>
                      </div>
                      {user && <UserProfile user={user} />}
                    </div>
                  </div>
                </div>
            </header>
        );
    }

    // Default header for all other apps
    return (
        <header className="sticky top-0 z-20 bg-brand-yellow border-b border-yellow-500/50 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4 space-x-4">
                    <div className="flex items-center space-x-4">
                        {onBack && (
                            <button onClick={onBack} aria-label="Go back to app list" className="p-2 rounded-full hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-blue-900/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-blue-900">{title}</h1>
                    </div>
                    {user && <UserProfile user={user} />}
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
