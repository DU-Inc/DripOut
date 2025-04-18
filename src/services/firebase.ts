// This file is being refactored to use only the React Native Firebase SDK
// Import the auth instance directly from firebaseconfig
import { auth } from '../Config/firebaseconfig';
// Commented out Google auth functionality
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID } from '@env';

// Note: The Google Auth functionality is temporarily disabled in the app

/*
// Stub implementation - temporarily disabled
export const googleSignIn = async (idToken: string, accessToken: string) => {
  console.log('Google sign in is temporarily disabled');
  throw new Error('Google sign in is temporarily disabled');
};

// For future implementation when Google Auth is re-enabled:
export const googleSignIn = async (idToken: string, accessToken: string) => {
  try {
    // Create a Google credential with the tokens
    const googleCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);
    
    // Sign in with credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    return userCredential.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};
*/

export default {
  auth,
  // googleSignIn - removed for now
}; 