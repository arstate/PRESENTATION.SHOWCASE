import React from 'react';

interface LoginPromptModalProps {
    appName: string;
    onLogin: () => void;
    onCancel: () => void;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ appName, onLogin, onCancel }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            aria-labelledby="login-prompt-title"
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="w-full max-w-md p-6 md:p-10 rounded-2xl shadow-lg backdrop-blur-lg bg-white/50 border border-white/20 text-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <h2 id="login-prompt-title" className="text-3xl font-bold text-blue-900 mb-4">Sign In Required</h2>
                <p className="text-blue-800/90 mb-8">
                    You need to sign in with Google to use the <strong className="font-bold">{appName}</strong>.
                </p>
                <div className="space-y-4">
                    <button 
                        onClick={onLogin}
                        className="inline-flex items-center justify-center gap-3 bg-white text-blue-900 font-bold px-6 py-4 rounded-lg shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 transition w-full"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6" />
                        Sign in with Google
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full bg-blue-900/80 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPromptModal;