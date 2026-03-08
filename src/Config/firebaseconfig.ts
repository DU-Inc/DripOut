import firestore, { FirebaseFirestoreTypes, getFirestore } from '@react-native-firebase/firestore';
import auth, { getAuth } from '@react-native-firebase/auth';
import storage, { getStorage } from '@react-native-firebase/storage';

// Initialize Firebase instances (legacy)
const db = firestore();

// Initialize Firebase instances (modular)
const firestoreDB = getFirestore();
const authInstance = getAuth();
const storageInstance = getStorage();

// Export Firebase instances, types and commonly used values
export { 
  db, // Legacy for gradual migration
  auth, // Legacy for gradual migration
  storage, // Legacy for gradual migration
  firestore,
  FirebaseFirestoreTypes,
  // New modular exports
  firestoreDB,
  authInstance,
  storageInstance,
  getFirestore,
  getAuth,
  getStorage
};

// Export commonly used Firebase values
export const FieldValue = firestore.FieldValue;
export const Timestamp = firestore.Timestamp;
