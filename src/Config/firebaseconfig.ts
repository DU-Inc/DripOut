import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Export auth function directly
export { auth };

// Export firestore instance
export const db = firestore();

// Export Timestamp for convenience - use the correct path
export const Timestamp = FirebaseFirestoreTypes.Timestamp;

// Also export FieldValue for convenience
export const FieldValue = FirebaseFirestoreTypes.FieldValue;
