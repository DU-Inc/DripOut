/* Temporarily disabled Google Auth
import { useState } from 'react';
import { GoogleSignin, statusCodes, User as GoogleUser } from '@react-native-google-signin/google-signin';
import { googleSignIn } from '../services/firebase';
import { Platform } from 'react-native';
import { FIREBASE_CLIENT_ID } from '@env';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseconfig';
import { User } from 'firebase/auth';

// Initialize Google Sign In
GoogleSignin.configure({
  // Use client ID from environment variables
  webClientId: FIREBASE_CLIENT_ID,
  // iOS configuration 
  iosClientId: Platform.OS === 'ios' ? FIREBASE_CLIENT_ID : undefined,
  // Whether to request email from Google
  scopes: ['email', 'profile'],
});

// Define interface for Google user info to avoid type errors
interface GoogleSignInData {
  user: {
    email: string;
    givenName: string | null;
    familyName: string | null;
    photo: string | null;
  };
}

// Custom hook for Google authentication
export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userData, setUserData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  } | null>(null);

  // Check if a user with the given email exists in Firestore
  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (err) {
      console.error("Error checking if user exists:", err);
      return false;
    }
  };

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is already signed in
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut(); // Sign out to ensure fresh login
      
      // Perform Google sign-in with type cast to handle correct response type
      const userInfo = await GoogleSignin.signIn() as unknown as GoogleSignInData;
      
      // Get user data from Google response (with proper typing)
      const email = userInfo.user.email;
      const firstName = userInfo.user.givenName || '';
      const lastName = userInfo.user.familyName || '';
      const profilePicture = userInfo.user.photo || undefined;

      // Store user data
      setUserData({
        email,
        firstName,
        lastName,
        profilePicture
      });

      // Check if user exists in database
      const userExists = await checkUserExists(email);
      setIsNewUser(!userExists);
      
      // Get Google tokens
      const { idToken, accessToken } = await GoogleSignin.getTokens();
      
      // Sign in with Firebase
      const firebaseUser = await googleSignIn(idToken, accessToken);
      setUser(firebaseUser);
      
      return {
        user: firebaseUser,
        isNewUser: !userExists,
        userData: {
          email,
          firstName,
          lastName,
          profilePicture
        }
      };
    } catch (err: any) {
      // Handle specific Google Sign-In errors
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Sign in was cancelled');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Play services are not available');
      } else {
        setError(err.message || 'An unknown error occurred');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await GoogleSignin.signOut();
      setUser(null);
      setUserData(null);
      setIsNewUser(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign out');
    } finally {
      setLoading(false);
    }
  };

  return { signIn, signOut, loading, error, user, isNewUser, userData };
};

export default useGoogleAuth; 
*/

// Provide stub implementation instead of completely removing
import { useState } from 'react';
import { User } from 'firebase/auth';

// Stub hook for Google authentication
export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userData, setUserData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  } | null>(null);

  // Stub implementation to avoid breaking code
  const signIn = async () => {
    setError('Google Sign In has been temporarily disabled');
    return null;
  };

  const signOut = async () => {
    // Stub implementation
  };

  return { signIn, signOut, loading, error, user, isNewUser, userData };
};

export default useGoogleAuth; 