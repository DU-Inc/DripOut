import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID } from '@env';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Auth helper - temporarily disabled
/* Original implementation
export const googleSignIn = async (idToken: string, accessToken: string) => {
  try {
    // Create a Google credential with the tokens
    const credential = GoogleAuthProvider.credential(idToken, accessToken);
    
    // Sign in with credential
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};
*/

// Stub implementation
export const googleSignIn = async (idToken: string, accessToken: string) => {
  console.log('Google sign in is temporarily disabled');
  throw new Error('Google sign in is temporarily disabled');
};

export default {
  auth,
  googleProvider,
  googleSignIn
}; 