import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    User,
    Auth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getDatabase,
    ref,
    onValue,
    set,
    push,
    remove,
    Database,
    Unsubscribe,
    ThenableReference
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { HistoryItem as TextToImageHistoryItem } from "./apps/TextToImageApp";
import { HistoryItem as RemoveBgHistoryItem } from "./apps/RemoveBackgroundApp";
import { HistoryItem as ImageUpscalingHistoryItem } from "./apps/ImageUpscalingApp";

// The auth and db instances are initialized in index.html and attached to window
const auth = (window as any).firebaseAuth as Auth;
const db = (window as any).firebaseDb as Database;

// --- AUTHENTICATION ---

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};

export const signOutUser = () => {
    return signOut(auth);
};

export const authStateObserver = (callback: (user: User | null) => void): Unsubscribe => {
    return onAuthStateChanged(auth, callback);
};

export type { User };


// --- REALTIME DATABASE (TEXT TO IMAGE HISTORY) ---

const textToImageHistoryRef = (userId: string) => ref(db, `generation_history/${userId}`);

export const onHistoryChange = (userId: string, callback: (items: TextToImageHistoryItem[]) => void): Unsubscribe => {
    const userHistoryRef = textToImageHistoryRef(userId);
    return onValue(userHistoryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const historyItems: TextToImageHistoryItem[] = Object.keys(data)
                .map(key => ({
                    key,
                    ...data[key]
                }))
                .sort((a, b) => b.id - a.id); // Sort by timestamp, newest first
            callback(historyItems);
        } else {
            callback([]); // No history found
        }
    });
};

export const saveImageToHistory = async (userId: string, item: TextToImageHistoryItem): Promise<TextToImageHistoryItem> => {
    const userHistoryRef = textToImageHistoryRef(userId);
    const newRef: ThenableReference = push(userHistoryRef);
    await set(newRef, item);
    return { ...item, key: newRef.key! };
};

export const updateImageHistory = (userId: string, itemKey: string, updates: Partial<TextToImageHistoryItem>): Promise<void> => {
    const itemRef = ref(db, `generation_history/${userId}/${itemKey}`);
    // We can't update directly, we need to fetch, modify, and set
    // For simplicity here, we'll just set the whole field.
    // A more complex app might use `update()` with specific paths.
    if (updates.uncroppedImages) {
        return set(ref(db, `generation_history/${userId}/${itemKey}/uncroppedImages`), updates.uncroppedImages);
    }
    return Promise.resolve();
};

export const clearImageHistory = (userId: string): Promise<void> => {
    const userHistoryRef = textToImageHistoryRef(userId);
    return remove(userHistoryRef);
};

// --- REALTIME DATABASE (REMOVE BACKGROUND HISTORY) ---

const removeBgHistoryRef = (userId: string) => ref(db, `remove_bg_history/${userId}`);

export const onRemoveBgHistoryChange = (userId: string, callback: (items: RemoveBgHistoryItem[]) => void): Unsubscribe => {
    const userHistoryRef = removeBgHistoryRef(userId);
    return onValue(userHistoryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const historyItems: RemoveBgHistoryItem[] = Object.keys(data)
                .map(key => ({
                    key,
                    ...data[key]
                }))
                .sort((a, b) => b.id - a.id); // Sort by timestamp, newest first
            callback(historyItems);
        } else {
            callback([]); // No history found
        }
    });
};

export const saveRemoveBgToHistory = async (userId: string, item: Omit<RemoveBgHistoryItem, 'key'>): Promise<RemoveBgHistoryItem> => {
    const userHistoryRef = removeBgHistoryRef(userId);
    const newRef: ThenableReference = push(userHistoryRef);
    await set(newRef, item);
    return { ...item, key: newRef.key! };
};

export const clearRemoveBgHistory = (userId: string): Promise<void> => {
    const userHistoryRef = removeBgHistoryRef(userId);
    return remove(userHistoryRef);
};

// --- REALTIME DATABASE (IMAGE UPSCALING HISTORY) ---

const imageUpscalingHistoryRef = (userId: string) => ref(db, `image_upscaling_history/${userId}`);

export const onImageUpscalingHistoryChange = (userId: string, callback: (items: ImageUpscalingHistoryItem[]) => void): Unsubscribe => {
    const userHistoryRef = imageUpscalingHistoryRef(userId);
    return onValue(userHistoryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const historyItems: ImageUpscalingHistoryItem[] = Object.keys(data)
                .map(key => ({
                    key,
                    ...data[key]
                }))
                .sort((a, b) => b.id - a.id); // Sort by timestamp, newest first
            callback(historyItems);
        } else {
            callback([]); // No history found
        }
    });
};

export const saveImageUpscalingToHistory = async (userId: string, item: Omit<ImageUpscalingHistoryItem, 'key'>): Promise<ImageUpscalingHistoryItem> => {
    const userHistoryRef = imageUpscalingHistoryRef(userId);
    const newRef: ThenableReference = push(userHistoryRef);
    await set(newRef, item);
    return { ...item, key: newRef.key! };
};

export const clearImageUpscalingHistory = (userId: string): Promise<void> => {
    const userHistoryRef = imageUpscalingHistoryRef(userId);
    return remove(userHistoryRef);
};