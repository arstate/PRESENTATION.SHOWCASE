import React from 'react';
import { signInWithGoogle } from '../firebase';

interface LoginScreenProps {
    onSignInLater?: () => void;
    showSignInLater?: boolean;
    isGuestAccessingApp?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSignInLater, showSignInLater = true, isGuestAccessingApp = false }) => {
    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Google Sign-In Error", error);
            // Optionally, display an error message to the user
        }
    };

    const secondaryMessage = isGuestAccessingApp
        ? ", or return to the app list"
        : ", or browse the app list first";

    return (
        <div className="flex flex-col min-h-screen items-center justify-center text-gray-900 font-sans relative z-10 p-4">
             <div className="w-full max-w-md p-6 md:p-10 rounded-2xl shadow-lg backdrop-blur-lg bg-white/30 border border-white/20 text-center">
                <h1 className="text-4xl font-bold text-blue-900 mb-4">Welcome to Arstate Apps</h1>
                <p className="text-blue-800/90 mb-8">Please sign in with your Google account to continue{showSignInLater ? secondaryMessage : "."}</p>
                <div className="space-y-4">
                    <button 
                        onClick={handleLogin}
                        className="inline-flex items-center justify-center gap-3 bg-white text-blue-900 font-bold px-6 py-4 rounded-lg shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition w-full"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6" />
                        Sign in with Google
                    </button>
                    {showSignInLater && onSignInLater && (
                        <button
                            onClick={onSignInLater}
                            className="text-blue-800/90 font-semibold hover:text-blue-900 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-blue rounded"
                        >
                            Sign in Later
                        </button>
                    )}
                </div>
             </div>
        </div>
    );
};

export default LoginScreen;
