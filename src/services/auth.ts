import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut  
} from 'firebase/auth';
import { auth } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Sign Up function
export const signUp = async (email: string, password: string, navigation: any) => {
  try {
    console.log(`Attempting to sign up user: ${email}`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Storing the token in AsyncStorage
    const token = await userCredential.user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    console.log('Sign up successful. User:', userCredential.user.email);
    navigation.replace('Home');
    return userCredential;
  } catch (error) {
    console.error('Sign Up Error:', error);
    throw error;
  }
};

// Firebase Sign In function
export const signIn = async (email: string, password: string, navigation: any) => {
  try {
    console.log(`Attempting to sign in user: ${email}`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Storing the token in AsyncStorage
    const token = await userCredential.user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    console.log('Sign in successful. User:', userCredential.user.email);
    navigation.replace('Home');
    return userCredential;
  } catch (error) {
    console.error('Sign In Error:', error);
    throw error;
  }
};

// Firebase Password Reset function
export const resetPassword = async (email: string) => {
  try {
    console.log(`Attempting to reset password for: ${email}`);
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Password Reset Error:', error);
    throw error;
  }
};

// Firebase Sign Out function
export const signOutUser = async () => {
  try {
    console.log('Attempting to sign out user.');
    await signOut(auth);

    // Remove token from AsyncStorage
    await AsyncStorage.removeItem('firebaseUserToken');

    console.log('User signed out successfully');
    // No need to navigate here, let the auth listener handle navigation
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};

