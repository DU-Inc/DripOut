import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Initialize Firebase instances
const db = firestore();

// Export Firebase instances, types and commonly used values
export { 
  db,
  auth,
  storage,
  firestore,
  FirebaseFirestoreTypes
};

// Export commonly used Firebase values
export const FieldValue = firestore.FieldValue;
export const Timestamp = firestore.Timestamp;
