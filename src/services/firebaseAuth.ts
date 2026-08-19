import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const getGoogleAuthProvider = (forceConsent = true): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  WORKSPACE_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });
  if (forceConsent) {
    provider.setCustomParameters({
      prompt: 'consent select_account',
      access_type: 'offline',
    });
  }
  return provider;
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (forceConsent = true): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = getGoogleAuthProvider(forceConsent);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถรับ Access Token จาก Google Workspace ได้ กรุณาลองใหม่อีกครั้ง');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const clearCachedToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};
