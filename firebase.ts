import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    User,
    Auth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// The auth instance is initialized in index.html and attached to window
const auth = (window as any).firebaseAuth as Auth;

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => {
    return signOut(auth);
};

export const authStateObserver = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export type { User };
