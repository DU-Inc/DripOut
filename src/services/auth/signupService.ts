import { doc, setDoc, collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseconfig';
import { sendAndStoreVerificationCode, verifyCode } from '../email/emailService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../../utils/appStateManager';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

export enum SignupErrorTypes {
  EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  INVALID_EMAIL = 'auth/invalid-email',
  WEAK_PASSWORD = 'auth/weak-password',
  NETWORK_ERROR = 'auth/network-request-failed',
  USERNAME_TAKEN = 'auth/username-taken',
  VERIFICATION_FAILED = 'auth/verification-failed',
  VERIFICATION_EXPIRED = 'auth/verification-expired',
  MAX_ATTEMPTS_EXCEEDED = 'auth/max-attempts-exceeded',
  TOO_MANY_REQUESTS = 'auth/too-many-requests',
  COOLDOWN_ACTIVE = 'auth/cooldown-active',
  RATE_LIMITED = 'auth/rate-limited',
  UNKNOWN_ERROR = 'auth/unknown',
  USERNAME_TAKEN_CUSTOM = 'Username is already taken'
}

// Create a map of error codes to user-friendly messages
const ERROR_MESSAGES = {
  [SignupErrorTypes.EMAIL_ALREADY_IN_USE]: "This email is already registered. Please sign in instead.",
  [SignupErrorTypes.INVALID_EMAIL]: "Please enter a valid email address.",
  [SignupErrorTypes.WEAK_PASSWORD]: "Password is too weak. Please choose a stronger password.",
  [SignupErrorTypes.NETWORK_ERROR]: "We're experiencing network issues. Please try again in a few minutes.",
  [SignupErrorTypes.USERNAME_TAKEN]: "This username is already taken. Please choose another one.",
  [SignupErrorTypes.VERIFICATION_FAILED]: "Verification failed. Please request a new code and try again.",
  [SignupErrorTypes.VERIFICATION_EXPIRED]: "Verification code has expired. Please request a new one.",
  [SignupErrorTypes.MAX_ATTEMPTS_EXCEEDED]: "Too many verification attempts. Please try again later.",
  [SignupErrorTypes.TOO_MANY_REQUESTS]: "Too many requests. Please try again in a few minutes.",
  [SignupErrorTypes.COOLDOWN_ACTIVE]: "Please wait before trying again.",
  [SignupErrorTypes.RATE_LIMITED]: "You've been temporarily rate limited. Please try again in a few minutes.",
  [SignupErrorTypes.UNKNOWN_ERROR]: "Something went wrong. Please try again.",
  [SignupErrorTypes.USERNAME_TAKEN_CUSTOM]: "This username is already taken. Please choose another one."
};

interface SignupUserData {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: Date;
  email: string;
  termsAccepted?: boolean;
}

// Comprehensive email validation for Firebase compliance
export const validateEmailFormat = (email: string): { isValid: boolean; errorMessage?: string } => {
  // Check for empty email
  if (!email || email.trim() === '') {
    return { isValid: false, errorMessage: 'Email address is required' };
  }

  // Basic format check with more comprehensive regex
  // This regex checks for:
  // - One @ symbol with text before and after
  // - At least one period in the domain part
  // - Proper format of local and domain parts
  // - No consecutive dots
  const basicFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicFormatRegex.test(email)) {
    return { isValid: false, errorMessage: 'Please enter a valid email address' };
  }

  // More comprehensive checks for Firebase compatibility
  // Check for proper domain structure
  const domainParts = email.split('@')[1].split('.');
  if (domainParts.length < 2) {
    return { isValid: false, errorMessage: 'Email domain is invalid' };
  }

  // Check top-level domain is at least 2 characters
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return { isValid: false, errorMessage: 'Email domain is invalid' };
  }

  // Check for minimum length of local part (username before @)
  const localPart = email.split('@')[0];
  if (localPart.length < 1) {
    return { isValid: false, errorMessage: 'Email username is too short' };
  }

  // Check for consecutive periods which Firebase rejects
  if (email.includes('..')) {
    return { isValid: false, errorMessage: 'Email cannot contain consecutive periods' };
  }

  // Check for invalid characters in the local part
  const invalidLocalCharsRegex = /[^\w.!#$%&'*+/=?^_`{|}~-]/;
  if (invalidLocalCharsRegex.test(localPart)) {
    return { isValid: false, errorMessage: 'Email contains invalid characters' };
  }

  // Check total email length (Firebase has limits)
  if (email.length > 254) {
    return { isValid: false, errorMessage: 'Email address is too long' };
  }

  // All checks passed
  return { isValid: true };
};

// Function to check if an email is already in use with Firebase
export const isEmailAlreadyInUse = async (email: string): Promise<{ inUse: boolean; errorMessage?: string }> => {
  try {
    // Validate email format first
    const formatValidation = validateEmailFormat(email);
    if (!formatValidation.isValid) {
      return { inUse: false, errorMessage: formatValidation.errorMessage };
    }
    
    // Check if email is already registered in Firebase Auth
    try {
      const signInMethods = await auth().fetchSignInMethodsForEmail(email);
      if (signInMethods && signInMethods.length > 0) {
        return { 
          inUse: true, 
          errorMessage: ERROR_MESSAGES[SignupErrorTypes.EMAIL_ALREADY_IN_USE] 
        };
      }
    } catch (error) {
      // If the error is not "user-not-found", then there's a real error
      if (error instanceof Error && !error.message.includes('auth/user-not-found')) {
        if (error.message.includes('auth/invalid-email')) {
          return { 
            inUse: false, 
            errorMessage: ERROR_MESSAGES[SignupErrorTypes.INVALID_EMAIL] 
          };
        }
        
        throw error;
      }
      // Otherwise, user doesn't exist in Auth, which is what we want
    }
    
    // Also check if email is already in use in Firestore
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { 
        inUse: true, 
        errorMessage: ERROR_MESSAGES[SignupErrorTypes.EMAIL_ALREADY_IN_USE] 
      };
    }
    
    // Email is valid and not in use
    return { inUse: false };
    
  } catch (error) {
    console.error('Error checking email:', error);
    // In case of error (like network error), we can't be sure
    return { 
      inUse: false, 
      errorMessage: ERROR_MESSAGES[SignupErrorTypes.NETWORK_ERROR]
    };
  }
};

// Function to check if a username is already taken
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  try {
    if (!username || username.trim().length === 0) {
      return false; // Empty usernames aren't taken (but will fail validation elsewhere)
    }
    
    // Check for exact match first
    const exactQuery = query(collection(db, 'users'), where('username', '==', username));
    const exactQuerySnapshot = await getDocs(exactQuery);
    
    if (!exactQuerySnapshot.empty) {
      return true; // Username is taken with exact match
    }
    
    // Also check for case-insensitive matches
    // Since Firestore doesn't support case-insensitive queries directly,
    // we can check for lowercase version
    const lowercaseQuery = query(collection(db, 'users'), where('usernameLowercase', '==', username.toLowerCase()));
    const lowercaseQuerySnapshot = await getDocs(lowercaseQuery);
    
    return !lowercaseQuerySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    // In case of error, we should be conservative and assume it might be taken
    // This prevents users from getting further in the flow only to be rejected later
    throw new Error(SignupErrorTypes.NETWORK_ERROR);
  }
};

// Step 1: Send verification code to email
export const sendVerificationCode = async (email: string): Promise<boolean> => {
  try {
    // Check if email is already registered in Firebase Auth
    try {
      const signInMethods = await auth().fetchSignInMethodsForEmail(email);
      if (signInMethods && signInMethods.length > 0) {
        throw new Error(SignupErrorTypes.EMAIL_ALREADY_IN_USE);
      }
    } catch (error) {
      // If the error is not "user-not-found", then rethrow it
      if (error instanceof Error && !error.message.includes('auth/user-not-found')) {
        throw error;
      }
      // Otherwise, user doesn't exist in Auth, which is what we want
    }

    // Also check if email is already in use in Firestore
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error(SignupErrorTypes.EMAIL_ALREADY_IN_USE);
    }
    
    // Use the updated service to request verification code from server
    return await sendAndStoreVerificationCode(email);
  } catch (error) {
    console.error('Error sending verification code:', error);
    
    // Format error message for better user experience
    if (error instanceof Error) {
      // Check for known error types
      if (error.message.includes('already in use') || 
          error.message.includes('already registered')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.EMAIL_ALREADY_IN_USE]);
      }
      
      if (error.message.includes('valid email')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.INVALID_EMAIL]);
      }
      
      if (error.message.includes('network') || error.message.includes('connect')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.NETWORK_ERROR]);
      }
      
      if (error.message.includes('attempts') || error.message.includes('too many')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.MAX_ATTEMPTS_EXCEEDED]);
      }
      
      if (error.message.includes('wait') || error.message.includes('try again in')) {
        // Pass through cooldown error directly as it contains the time remaining
        throw error;
      }
      
      // For all other errors, return the error message directly
      throw error;
    }
    
    // Default to unknown error
    throw new Error(ERROR_MESSAGES[SignupErrorTypes.UNKNOWN_ERROR]);
  }
};

// Step 2: Verify the code
export const verifyEmailCode = async (email: string, code: string): Promise<boolean> => {
  try {
    return await verifyCode(email, code);
  } catch (error) {
    console.error('Error verifying code:', error);
    
    // Format error message for better user experience
    if (error instanceof Error) {
      // Check for known error patterns in the message
      if (error.message.includes('expired')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.VERIFICATION_EXPIRED]);
      } 
      
      if (error.message.includes('attempts')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.MAX_ATTEMPTS_EXCEEDED]);
      } 
      
      if (error.message.includes('Incorrect code') || error.message.includes('Invalid')) {
        // Pass through the error with attempts remaining info
        throw error;
      }
      
      if (error.message.includes('not found')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.VERIFICATION_FAILED]);
      }
      
      if (error.message.includes('network') || error.message.includes('connection')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.NETWORK_ERROR]);
      }
      
      // For all other errors, return the error message directly
      throw error;
    }
    
    // Default to unknown error
    throw new Error(ERROR_MESSAGES[SignupErrorTypes.UNKNOWN_ERROR]);
  }
};

// Helper function to calculate age from date of birth
const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  
  // If birthday hasn't happened yet this year, subtract one from age
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
};

// Step 3: Complete signup and create Firebase user
export const completeSignup = async (
  email: string,
  password: string,
  userData: SignupUserData,
  isGoogleAuth: boolean = false
): Promise<string> => {
  try {
    let userId: string;
    let token: string;
    
    if (!isGoogleAuth) {
      // For regular signup, create the user with email and password using React Native Firebase
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update the profile using React Native Firebase
      await user.updateProfile({
        displayName: `${userData.firstName} ${userData.lastName}`.trim()
      });
      
      userId = user.uid;
      token = await user.getIdToken();
    } else {
      // For Google auth, we already have the user in Firebase auth
      // We just need to add additional info to Firestore
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found for Google signup');
      }
      userId = currentUser.uid;
      token = await currentUser.getIdToken();
    }
    
    // Calculate current age from date of birth
    const currentAge = calculateAge(userData.dateOfBirth);
    
    // Save user data to Firestore
    await setDoc(doc(db, 'users', userId), {
      userId: userId,
      email: email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      username: userData.username,
      usernameLowercase: userData.username.toLowerCase(),
      dateOfBirth: Timestamp.fromDate(userData.dateOfBirth),
      age: currentAge,
      termsAccepted: userData.termsAccepted || false,
      termsAcceptedAt: userData.termsAccepted ? Timestamp.now() : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isGoogleAuth: isGoogleAuth,
      onboardingCompleted: false
    });
    
    // Store the token
    await AsyncStorage.setItem('firebaseUserToken', token);
    
    // Set app state for authenticated user that needs onboarding
    appStateManager.setAuthenticated(true);
    appStateManager.setOnboarding(true);
    
    return userId;
  } catch (error) {
    console.error('Error completing signup:', error);
    
    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('auth/email-already-in-use')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.EMAIL_ALREADY_IN_USE]);
      } else if (error.message.includes('auth/invalid-email')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.INVALID_EMAIL]);
      } else if (error.message.includes('auth/weak-password')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.WEAK_PASSWORD]);
      } else if (error.message.includes('auth/network-request-failed')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.NETWORK_ERROR]);
      } else if (error.message.includes('username-taken') || 
                (error.message.includes('username') && error.message.includes('already'))) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.USERNAME_TAKEN_CUSTOM]);
      } else if (error.message.includes('too-many-requests')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.TOO_MANY_REQUESTS]);
      }
    }
    
    // Default to unknown error
    throw new Error(ERROR_MESSAGES[SignupErrorTypes.UNKNOWN_ERROR]);
  }
};

// Use Firebase Functions instead of direct Nodemailer calls
export const sendVerificationEmail = async (email: string, code: string): Promise<boolean> => {
  try {
    const functions = getFunctions();
    const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
    
    await sendVerificationEmail({ email, code });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('network')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.NETWORK_ERROR]);
      } else if (error.message.includes('too-many-requests')) {
        throw new Error(ERROR_MESSAGES[SignupErrorTypes.TOO_MANY_REQUESTS]);
      }
    }
    
    throw new Error(ERROR_MESSAGES[SignupErrorTypes.UNKNOWN_ERROR]);
  }
}; 