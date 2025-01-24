import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut  
} from 'firebase/auth';
import { auth } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProfile } from './firestoreService'; // Import the function to save user profiles

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
    
    // Sign in with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Get the user's ID token for storage
    const token = await userCredential.user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    console.log('Sign in successful. User:', userCredential.user.email);
    return userCredential;

  } catch (error) {
    console.error('Sign In Error:', error);
    throw error; // Rethrow the error for error handling in the UI
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
    console.log('Attempting to sign out user.');
    
    // Sign out from Firebase
    await signOut(auth);

    // Remove the stored token from AsyncStorage
    await AsyncStorage.removeItem('firebaseUserToken');
    
    console.log('User signed out successfully');

  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error; // Rethrow the error for error handling in the UI
  }
};
