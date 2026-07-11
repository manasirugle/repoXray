import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "firebase/auth";

// Define a simplified User type that supports both real Firebase User and Mock User
export interface RepoXrayUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const isMockMode = 
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "AIzaSyFakeKeyPlaceholderForDevelopmentMode" ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("Placeholder");

if (typeof window !== "undefined") {
  console.log(`[RepoXrayAuth] Initializing in ${isMockMode ? "MOCK DEVELOPMENT" : "FIREBASE PRODUCTION"} mode.`);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyFakeKeyPlaceholderForDevelopmentMode",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "coderecall-development.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "coderecall-development",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "coderecall-development.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:00000000000000"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom mock callbacks list
const mockListeners: Array<(user: RepoXrayUser | null) => void> = [];

// Get persistent mock user session from localStorage
const getMockUser = (): RepoXrayUser | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("repoxray_mock_user");
  return data ? JSON.parse(data) : null;
};

// Sign in helper
export const signInWithGoogle = async (): Promise<any> => {
  if (isMockMode) {
    // Generate mock developer session
    const mockUser: RepoXrayUser = {
      uid: "mock_local_developer_uid",
      email: "developer@repoxray.local",
      displayName: "Local Developer",
      photoURL: null
    };
    localStorage.setItem("repoxray_mock_user", JSON.stringify(mockUser));
    // Trigger mock listeners
    mockListeners.forEach(listener => listener(mockUser));
    return mockUser;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-in failed:", error);
    throw error;
  }
};

// Sign out helper
export const logoutUser = async (): Promise<void> => {
  if (isMockMode) {
    localStorage.removeItem("repoxray_mock_user");
    mockListeners.forEach(listener => listener(null));
    return;
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-out failed:", error);
    throw error;
  }
};

// Helper to get active JWT ID Token (needed for Bearer Header backend authentication)
export const getIdToken = async (user: any): Promise<string | null> => {
  if (!user) return null;
  if (isMockMode) {
    return "mock_local_developer_token";
  }
  
  try {
    const firebaseUser = user as FirebaseUser;
    return await firebaseUser.getIdToken(false); // Use cached token to avoid Firebase rate-limiting on frequent polls
  } catch (err) {
    console.error("Failed to fetch ID Token:", err);
    return null;
  }
};

// Subscription observer for auth state changes
export const onAuthStateChanged = (
  authInstance: any,
  callback: (user: any) => void
) => {
  if (isMockMode) {
    // Register mock observer
    mockListeners.push(callback);
    // Call immediately with current mock value
    setTimeout(() => {
      callback(getMockUser());
    }, 100);
    // Return unsubscribe function
    return () => {
      const idx = mockListeners.indexOf(callback);
      if (idx !== -1) mockListeners.splice(idx, 1);
    };
  }

  // Fallback to real Firebase Auth Observer
  return firebaseOnAuthStateChanged(authInstance, callback);
};
