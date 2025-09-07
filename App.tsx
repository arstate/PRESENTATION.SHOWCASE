import React, { useState, useEffect } from 'react';
import HomeScreen, { AppKey, appsData } from './apps/HomeScreen';
import PresentationShowcaseApp from './apps/PresentationShowcaseApp';
import ShortLinkGeneratorApp from './apps/ShortLinkGeneratorApp';
import PDFMergerApp from './apps/PDFMergerApp';
import GooglePhotosEmbedderApp from './apps/GooglePhotosEmbedderApp';
import PDFCompressorApp from './apps/PDFCompressorApp';
import MediaConverterApp from './apps/MediaConverterApp';
import RemoveBackgroundApp from './apps/RemoveBackgroundApp';
import TextToImageApp from './apps/TextToImageApp';
import ImageUpscalingApp from './apps/ImageUpscalingApp';
import ShowcasePasswordPrompt from './apps/auth/ShowcasePasswordPrompt';
import LoginScreen from './components/LoginScreen';
import LoginPromptModal from './components/LoginPromptModal'; // Import the new modal
import { 
    signInWithGoogle, // Import sign-in function
    authStateObserver, 
    User,
    onHistoryChange,
    onRemoveBgHistoryChange,
    onImageUpscalingHistoryChange,
    onFavoritesChange,
    addFavorite,
    removeFavorite
} from './firebase';
import { HistoryItem as TextToImageHistoryItem } from './apps/TextToImageApp';
import { HistoryItem as RemoveBgHistoryItem } from './apps/RemoveBackgroundApp';
import { HistoryItem as ImageUpscalingHistoryItem } from './apps/ImageUpscalingApp';


// --- BACKGROUND COMPONENT ---
const BackgroundBlobs = () => (
  <div className="blob-container">
    <div className="blob blob-1"></div>
    <div className="blob blob-2"></div>
    <div className="blob blob-3"></div>
    <div className="blob blob-4"></div>
  </div>
);

// --- HELPERS (exported for use in other components) ---

// Simple hash function to create a basic link between search and token.
// This is NOT for cryptography, just to prevent trivial URL manipulation.
export const SECRET_SALT = 'arstate-ppt-showcase-2025';
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36); // Base36 for a more URL-friendly string
};

const isInsideGoogleAIStudio = (): boolean => {
    try {
        return window.location.ancestorOrigins[0] === 'https://aistudio.google.com';
    } catch (e) {
        return false;
    }
};

const getAppKeyFromHash = (hash: string): AppKey | null => {
    const path = hash.substring(1).split('?')[0]; // Get path part, ignore query
    if (path === '/showcase') return 'showcase';
    if (path === '/shortlink') return 'shortlink';
    if (path === '/pdfmerger') return 'pdfmerger';
    if (path === '/gphotos') return 'gphotos';
    if (path === '/pdfcompressor') return 'pdfcompressor';
    if (path === '/mediaconverter') return 'mediaconverter';
    if (path === '/removebackground') return 'removebackground';
    if (path === '/texttoimage') return 'texttoimage';
    if (path === '/imageupscaling') return 'imageupscaling';
    return null;
}

const canBypassAuthViaSearch = (hash: string): boolean => {
    const searchPart = hash.split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    const searchTerm = params.get('search');
    const token = params.get('_sec');

    if (!searchTerm || !token || !searchTerm.trim() || !token.trim()) {
        return false;
    }

    // Validate that the token was generated for this specific search term
    const expectedToken = simpleHash(searchTerm.trim() + SECRET_SALT);
    return token.trim() === expectedToken;
};


// --- MAIN APP COMPONENT (ROUTER) ---
const App: React.FC = () => {
    const [locationHash, setLocationHash] = useState(window.location.hash);
    const [isShowcaseAuthenticated, setIsShowcaseAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
    const [isGuestSession, setIsGuestSession] = useState(() => localStorage.getItem('isGuestSession') === 'true');
    const isStudio = isInsideGoogleAIStudio();

    // State for the login prompt modal
    const [isLoginPromptVisible, setIsLoginPromptVisible] = useState(false);
    const [pendingAppKey, setPendingAppKey] = useState<AppKey | null>(null);
    const [pendingFavoriteAppKey, setPendingFavoriteAppKey] = useState<AppKey | null>(null);

    // Centralized history state
    const [textToImageHistory, setTextToImageHistory] = useState<TextToImageHistoryItem[]>([]);
    const [removeBgHistory, setRemoveBgHistory] = useState<RemoveBgHistoryItem[]>([]);
    const [imageUpscalingHistory, setImageUpscalingHistory] = useState<ImageUpscalingHistoryItem[]>([]);
    
    // Centralized favorites state
    const [favorites, setFavorites] = useState<Set<AppKey>>(new Set());

    useEffect(() => {
      const unsubscribe = authStateObserver((firebaseUser) => {
          setUser(firebaseUser);
          if (firebaseUser) {
                // Handle pending actions after successful login
                if (pendingAppKey) {
                    window.location.hash = `/${pendingAppKey}`;
                    setPendingAppKey(null);
                    setIsLoginPromptVisible(false);
                }
                if (pendingFavoriteAppKey) {
                    addFavorite(firebaseUser.uid, pendingFavoriteAppKey).then(() => {
                        setPendingFavoriteAppKey(null);
                        setIsLoginPromptVisible(false);
                    });
                }
                // If a user is authenticated, they are not a guest.
                localStorage.removeItem('isGuestSession');
                setIsGuestSession(false);
          } else if (isStudio) {
              // In AI Studio, default to a guest session if not logged in.
              setIsGuestSession(true);
          }
      });
      return () => unsubscribe();
    }, [isStudio, pendingAppKey, pendingFavoriteAppKey]); // Add dependencies

    // Effect to manage history subscriptions based on user auth state
    useEffect(() => {
        if (user) {
            // User is logged in, subscribe to all histories
            const unsubTextToImage = onHistoryChange(user.uid, setTextToImageHistory);
            const unsubRemoveBg = onRemoveBgHistoryChange(user.uid, setRemoveBgHistory);
            const unsubImageUpscaling = onImageUpscalingHistoryChange(user.uid, setImageUpscalingHistory);

            // Return a cleanup function to unsubscribe when user logs out or component unmounts
            return () => {
                unsubTextToImage();
                unsubRemoveBg();
                unsubImageUpscaling();
            };
        } else {
            // User is not logged in (or logged out), clear the histories
            setTextToImageHistory([]);
            setRemoveBgHistory([]);
            setImageUpscalingHistory([]);
        }
    }, [user]); // Re-run this effect whenever the user object changes
    
    // Effect to manage favorites subscription
    useEffect(() => {
        if (user) {
            const unsub = onFavoritesChange(user.uid, setFavorites);
            return () => unsub();
        } else if (isGuestSession) {
             try {
                const storedFavs = localStorage.getItem('guestFavorites');
                if (storedFavs) {
                    setFavorites(new Set(JSON.parse(storedFavs)));
                } else {
                    setFavorites(new Set());
                }
            } catch (e) {
                console.error("Failed to load guest favorites:", e);
                setFavorites(new Set());
            }
        } else {
            setFavorites(new Set()); // Clear on logout
        }
    }, [user, isGuestSession]);

    useEffect(() => {
      const handleHashChange = () => {
        // Use functional update to access the previous hash state
        setLocationHash(prevHash => {
            const prevAppKey = getAppKeyFromHash(prevHash);
            const newAppKey = getAppKeyFromHash(window.location.hash);
            
            // When navigating away from the showcase, reset authentication.
            if (prevAppKey === 'showcase' && newAppKey !== 'showcase') {
                setIsShowcaseAuthenticated(false);
            }
            
            // Return the new hash to update the state, triggering a re-render
            return window.location.hash;
        });
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
      };
    }, []); // Empty dependency array ensures this effect runs only once

    const handleSelectApp = (appKey: AppKey) => {
        // If the user is a guest, show the login prompt instead of navigating.
        if (!user && isGuestSession) {
            setPendingAppKey(appKey);
            setIsLoginPromptVisible(true);
        } else {
            // If logged in, navigate as usual.
            window.location.hash = `/${appKey}`;
        }
    }

    const handleBack = () => {
        window.location.hash = '';
    }
    
    const handleSuccessfulAuth = () => {
        setIsShowcaseAuthenticated(true);
    };

    const handleSignInLater = () => {
        localStorage.setItem('isGuestSession', 'true');
        setIsGuestSession(true);
    };

    const handlePromptLogin = () => {
        signInWithGoogle().catch(error => {
            console.error("Google Sign-In Error from prompt", error);
            // If sign-in fails, just hide the prompt.
            setIsLoginPromptVisible(false);
            setPendingAppKey(null);
            setPendingFavoriteAppKey(null);
        });
    };

    const handlePromptCancel = () => {
        setIsLoginPromptVisible(false);
        setPendingAppKey(null);
        setPendingFavoriteAppKey(null);
    };
    
    const handleToggleFavorite = (appKey: AppKey) => {
        const isCurrentlyFavorited = favorites.has(appKey);

        // For guest users, if they try to FAVORITE an app, prompt them to log in.
        if (!user && isGuestSession && !isCurrentlyFavorited) {
            setPendingFavoriteAppKey(appKey);
            setIsLoginPromptVisible(true);
            return; // Stop further execution for this case
        }
        
        // --- Optimistic UI Update (for logged-in users or guests UN-favoriting) ---
        const newFavorites = new Set(favorites);
        if (isCurrentlyFavorited) {
            newFavorites.delete(appKey);
        } else {
            newFavorites.add(appKey);
        }
        setFavorites(newFavorites);

        // --- Persistence Logic ---
        if (user) {
            const action = isCurrentlyFavorited 
                ? removeFavorite(user.uid, appKey) 
                : addFavorite(user.uid, appKey);
            
            action.catch(error => {
                console.error(`Firebase favorite update failed for app '${appKey}':`, error);
                
                // Revert UI on failure
                setFavorites(currentFavorites => {
                    const revertedFavorites = new Set(currentFavorites);
                    if (isCurrentlyFavorited) {
                        revertedFavorites.add(appKey);
                    } else {
                        revertedFavorites.delete(appKey);
                    }
                    return revertedFavorites;
                });
            });
        } else if (isGuestSession) {
             // This branch will now only handle UN-favoriting for guests.
            localStorage.setItem('guestFavorites', JSON.stringify(Array.from(newFavorites)));
        }
    };


    const renderAppContent = () => {
        const activeApp = getAppKeyFromHash(locationHash);
        
        // 1. Loading state
        if (user === undefined) {
             return (
                <div className="flex items-center justify-center min-h-screen z-50">
                    <svg className="animate-spin h-10 w-10 text-brand-yellow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.47715 2 2 6.47715 2 12H4C4 7.58172 7.58172 4 12 4V2Z"/>
                    </svg>
                </div>
            );
        }

        // 2. Not logged in and not a guest: show the login screen
        if (!user && !isGuestSession) {
            return <LoginScreen onSignInLater={handleSignInLater} />;
        }
        
        // 3. Showcase Search Link Bypass (PRESERVED: this allows access without login for this specific case)
        if (activeApp === 'showcase' && canBypassAuthViaSearch(locationHash)) {
             return <PresentationShowcaseApp onBack={handleBack} user={user} />;
        }
        
        // --- Content Routing ---
        if (activeApp) {
            // If an app is active in the URL, render it.
            // The guest check in handleSelectApp prevents guests from getting here (except for the bypass case above).
            if (activeApp === 'showcase') {
                return isShowcaseAuthenticated
                    ? <PresentationShowcaseApp onBack={handleBack} user={user} />
                    : <ShowcasePasswordPrompt onBack={handleBack} onSuccess={handleSuccessfulAuth} user={user} />;
            }
            if (activeApp === 'shortlink') return <ShortLinkGeneratorApp onBack={handleBack} user={user} />;
            if (activeApp === 'pdfmerger') return <PDFMergerApp onBack={handleBack} user={user} />;
            if (activeApp === 'gphotos') return <GooglePhotosEmbedderApp onBack={handleBack} user={user} />;
            if (activeApp === 'pdfcompressor') return <PDFCompressorApp onBack={handleBack} user={user} />;
            if (activeApp === 'mediaconverter') return <MediaConverterApp onBack={handleBack} user={user} />;
            if (activeApp === 'removebackground') return <RemoveBackgroundApp onBack={handleBack} user={user} history={removeBgHistory} />;
            if (activeApp === 'texttoimage') return <TextToImageApp onBack={handleBack} user={user} history={textToImageHistory} />;
            if (activeApp === 'imageupscaling') return <ImageUpscalingApp onBack={handleBack} user={user} history={imageUpscalingHistory} />;
        }
        
        // Default: Home Screen.
        // Also render the login prompt modal conditionally on top of the home screen.
        let modalMessage: React.ReactNode = null;
        if (pendingAppKey) {
            const appData = appsData.find(app => app.key === pendingAppKey);
            modalMessage = <>You need to sign in with Google to use the <strong className="font-bold">{appData?.title || 'app'}</strong>.</>;
        } else if (pendingFavoriteAppKey) {
            modalMessage = "You need to sign in with Google to save your favorite apps.";
        }

        return (
            <>
                <HomeScreen onSelectApp={handleSelectApp} user={user} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
                {isLoginPromptVisible && modalMessage && (
                    <LoginPromptModal
                        message={modalMessage}
                        onLogin={handlePromptLogin}
                        onCancel={handlePromptCancel}
                    />
                )}
            </>
        );
    }
    
    return (
        <>
            <BackgroundBlobs />
            {renderAppContent()}
        </>
    );
};

export default App;