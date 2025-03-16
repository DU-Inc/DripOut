import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut  
} from 'firebase/auth';
import { auth } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProfile } from './firestoreService'; // Import the function to save user profiles
import { authCache } from '../utils/authCacheManager';

// Firebase Sign Up function
export const signUp = async (
  email: string, 
  password: string, 
  navigation: any, 
  firstName: string, 
  lastName: string, 
  username: string, 
  dateOfBirth?: string // Optional
) => {
  try {
    console.log(`Attempting to sign up user: ${email}`);
    
    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Get the user's ID token for storage
    const token = await userCredential.user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    // Get the user's ID
    const userId = userCredential.user.uid;

    // Calculate user age from date of birth if provided
    let userAge: number | undefined = undefined;
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const currentDate = new Date();
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      const isBirthdayPassed = 
        currentDate.getMonth() > birthDate.getMonth() ||
        (currentDate.getMonth() === birthDate.getMonth() && currentDate.getDate() >= birthDate.getDate());
      userAge = isBirthdayPassed ? age : age - 1;
    }

     // Save the additional user info in Firestore
     await createUserProfile(userId, {
      userID: userId,
      email: email,
      username: username,
      fullName: `${firstName} ${lastName}`, // Join firstName and lastName
      userAge, // Ensure it's either a number or undefined
      createdAt: new Date(),
      isVerified: false, // Default to false until email verification
      userRole: 'user', // Default role
      userType: 'basic', // Default user type
    });

    console.log('Sign up successful. User:', userCredential.user.email);
    return userCredential;

  } catch (error) {
    console.error('Sign Up Error:', error);
    throw error; // Rethrow the error for error handling in the UI
  }
};

// Firebase Sign In function
export const signIn = async (email: string, password: string, navigation: any) => {
  try {
    console.log(`Attempting to sign in user: ${email}`);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    
    // Update both AsyncStorage and cache
    await Promise.all([
      AsyncStorage.setItem('firebaseUserToken', token),
      authCache.setToken(token)
    ]);

    console.log('Sign in successful. User:', userCredential.user.email);
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
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent to:', email);

  } catch (error) {
    console.error('Password Reset Error:', error);
    throw error; // Rethrow the error for error handling in the UI
  }
};

// Firebase Sign Out function
export const signOutUser = async () => {
  try {
    await signOut(auth);
    // Clear both AsyncStorage and cache
    await Promise.all([
      AsyncStorage.removeItem('firebaseUserToken'),
      authCache.invalidateCache()
    ]);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};
