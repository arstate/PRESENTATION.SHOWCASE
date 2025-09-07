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

// --- TYPE DECLARATIONS FOR GAPI & GOOGLE GSI ---
declare global {
    interface Window {
        gapi: any;
        google: any;
        firebaseAuth: Auth;
        firebaseDb: Database;
    }
}

// The auth and db instances are initialized in index.html and attached to window
const auth = window.firebaseAuth;
const db = window.firebaseDb;

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


// --- GOOGLE DRIVE INTEGRATION ---

const GOOGLE_API_KEY = "AIzaSyAMf988MAPb7q6kkm-I_Fs0zm16kmHeqdI";
// NOTE: This Client ID should be configured in Google Cloud Console for a production app.
const GOOGLE_CLIENT_ID = "707959094361-itlr1oh8agul67obg0bo65fua8hrlgla.apps.googleusercontent.com";
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Arstate Apps';
let tokenClient: any = null;
let appFolderId: string | null = null;

// Helper to wait for global scripts to be ready, preventing race conditions.
const ensureGoogleScripts = (callback: () => void) => {
    const check = () => {
        if (window.gapi && window.google?.accounts) {
            callback();
        } else {
            setTimeout(check, 100);
        }
    };
    check();
};


export const initDriveClient = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        ensureGoogleScripts(() => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: GOOGLE_API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });
                    // No longer need gapi.client.load('drive', 'v3') as it's handled by discoveryDocs
                    tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: DRIVE_SCOPE,
                        callback: '', // Callback is handled by the Promise in authorizeDrive
                    });
                    resolve();
                } catch (error) {
                    console.error("Error initializing GAPI client:", error);
                    reject(error);
                }
            });
        });
    });
};

export const authorizeDrive = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error("Google Drive client not initialized."));
        }
        tokenClient.callback = (tokenResponse: any) => {
            if (tokenResponse.error) {
                return reject(new Error(tokenResponse.error));
            }
            window.gapi.client.setToken(tokenResponse);
            resolve();
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

const getOrCreateAppFolderId = async (): Promise<string> => {
    if (appFolderId) return appFolderId;

    const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id)',
    });

    if (response.result.files && response.result.files.length > 0) {
        appFolderId = response.result.files[0].id;
        return appFolderId!;
    } else {
        const fileMetadata = {
            name: APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
        };
        const folderResponse = await window.gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
        appFolderId = folderResponse.result.id;
        return appFolderId!;
    }
};

export const uploadToDrive = async (file: File): Promise<string> => {
    const parentFolderId = await getOrCreateAppFolderId();
    const metadata = {
        name: file.name,
        parents: [parentFolderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': `Bearer ${window.gapi.auth.getToken().access_token}` }),
        body: formData,
    });
    
    const result = await response.json();
    if (result.error) {
        throw new Error(result.error.message);
    }
    return result.id;
};

export const getDriveThumbnailUrl = async (fileId: string): Promise<string> => {
    const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'thumbnailLink',
    });
    return response.result.thumbnailLink;
};

export const getDriveFileAsDataUrl = async (fileId: string): Promise<string> => {
    const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
    });

    const blob = new Blob([response.body], { type: response.headers['content-type'] });
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

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

export const saveImageToHistory = async (userId: string, item: Omit<TextToImageHistoryItem, 'key'>): Promise<TextToImageHistoryItem> => {
    const userHistoryRef = textToImageHistoryRef(userId);
    const newRef: ThenableReference = push(userHistoryRef);
    await set(newRef, item);
    return { ...item, key: newRef.key! };
};

export const updateImageHistory = (userId: string, itemKey: string, updates: Partial<TextToImageHistoryItem>): Promise<void> => {
    const itemRef = ref(db, `generation_history/${userId}/${itemKey}`);
    // This function can now update specific fields, like uncroppedImageDriveIds
    return set(itemRef, updates);
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
