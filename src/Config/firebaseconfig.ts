import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence} from 'firebase/auth';


// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase App
console.log('Initializing Firebase app...');
const app = initializeApp(firebaseConfig);
// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
console.log('Initializing Firestore app...');
export const db = getFirestore(app);

// Listen to Firebase Auth state changes and store the token in AsyncStorage
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    const token = await user.getIdToken(true); // Force refresh token to ensure it's valid
    console.log('Saving token to AsyncStorage:', token);
    await AsyncStorage.setItem('firebaseUserToken', token);
  } else {
    console.log('User is signed out');
    await AsyncStorage.removeItem('firebaseUserToken');
  }
});
