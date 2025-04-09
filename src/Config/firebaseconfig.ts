import { initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';
import { getFirestore } from 'firebase/firestore';
import auth from '@react-native-firebase/auth';

// Check if all Firebase environment variables are present
if (
  !FIREBASE_API_KEY ||
  !FIREBASE_AUTH_DOMAIN ||
  !FIREBASE_PROJECT_ID ||
  !FIREBASE_STORAGE_BUCKET ||
  !FIREBASE_MESSAGING_SENDER_ID ||
  !FIREBASE_APP_ID
) {
  throw new Error('Missing Firebase environment variables.');
}

// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase App for Web SDK components
console.log('Initializing Firebase app...');
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Log storage bucket configuration from environment
console.log('Firebase Storage bucket from env:', FIREBASE_STORAGE_BUCKET);

// Export auth from react-native-firebase
console.log('Using React Native Firebase Auth');
export { auth };
