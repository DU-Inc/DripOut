import firestore from '@react-native-firebase/firestore';
import { auth, db } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserProfile, updateBiometricPreference } from './firestoreService';
import { authCache } from '../utils/authCacheManager';
import { appStateManager } from '../utils/appStateManager';
import { sessionManager } from '../utils/sessionManager';
import { Alert, Platform } from 'react-native';

// Define custom error codes for better error handling
export enum AuthErrorTypes {
  EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
  INVALID_EMAIL = 'auth/invalid-email',
  WRONG_PASSWORD = 'auth/wrong-password',
  USER_NOT_FOUND = 'auth/user-not-found',
  TOO_MANY_REQUESTS = 'auth/too-many-requests',
  WEAK_PASSWORD = 'auth/weak-password',
  NETWORK_ERROR = 'auth/network-request-failed',
  BIOMETRIC_ERROR = 'auth/biometric-error',
  INVALID_PHONE_NUMBER = 'auth/invalid-phone-number',
  USERNAME_NOT_FOUND = 'auth/username-not-found',
  UNKNOWN_ERROR = 'auth/unknown'
}

// Enum for identifier types
export enum IdentifierType {
  EMAIL = 'email',
  PHONE = 'phone',
  USERNAME = 'username',
  UNKNOWN = 'unknown'
}

// Type for handling auth error responses
export interface AuthErrorResponse {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

// Function to get user-friendly error message
export const getAuthErrorMessage = (error: any): AuthErrorResponse => {
  let code = AuthErrorTypes.UNKNOWN_ERROR;
  let userFriendlyMessage = 'An unknown error occurred. Please try again.';
  
  if (error.code) {
    code = error.code;
    
    switch (error.code) {
      case AuthErrorTypes.EMAIL_ALREADY_IN_USE:
        userFriendlyMessage = 'This email is already in use. Please sign in or use a different email.';
        break;
      case AuthErrorTypes.INVALID_EMAIL:
        userFriendlyMessage = 'Please enter a valid email address.';
        break;
      case AuthErrorTypes.WRONG_PASSWORD:
        userFriendlyMessage = 'Incorrect password. Please try again.';
        break;
      case AuthErrorTypes.USER_NOT_FOUND:
        userFriendlyMessage = 'No account found with this email. Please sign up.';
        break;
      case AuthErrorTypes.TOO_MANY_REQUESTS:
        userFriendlyMessage = 'Too many failed attempts. Please try again later.';
        break;
      case AuthErrorTypes.WEAK_PASSWORD:
        userFriendlyMessage = 'Password is too weak. Please use a stronger password.';
        break;
      case AuthErrorTypes.NETWORK_ERROR:
        userFriendlyMessage = 'Network error. Please check your internet connection.';
        break;
      case AuthErrorTypes.BIOMETRIC_ERROR:
        userFriendlyMessage = 'Biometric authentication failed. Please sign in with your password.';
        break;
      case AuthErrorTypes.INVALID_PHONE_NUMBER:
        userFriendlyMessage = 'Please enter a valid phone number.';
        break;
      case AuthErrorTypes.USERNAME_NOT_FOUND:
        userFriendlyMessage = 'No account found with this username. Please sign up or try a different username.';
        break;
      default:
        userFriendlyMessage = error.message || 'An error occurred. Please try again.';
    }
  }
  
  return {
    code,
    message: error.message || 'Unknown error',
    userFriendlyMessage
  };
};

// Function to determine identifier type
export const determineIdentifierType = (identifier: string): IdentifierType => {
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(identifier)) {
    return IdentifierType.EMAIL;
  }
  
  // Check if it's a phone number (simple validation)
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (phoneRegex.test(identifier.replace(/[\s-()]/g, ''))) {
    return IdentifierType.PHONE;
  }
  
  // If it's not email or phone, assume it's a username
  return IdentifierType.USERNAME;
};

// Function to find user by username
const findUserByUsername = async (username: string): Promise<string | null> => {
  try {
    // Query Firestore for the user with this username
    const querySnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      // Return the email associated with this username
      return userDoc.data().email;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by username:', error);
    return null;
  }
};

// Function to format phone number for authentication
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure it has country code
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    return `+1${cleaned}`;
  }
  
  return cleaned;
};

// Store for recaptcha verifier instance - not needed with React Native Firebase
let recaptchaVerifier: any = null;
// Store for the confirmation result
let confirmationResult: any = null;

// Handle phone number sign-in
export async function signInWithPhone(phoneNumber: string): Promise<{ verificationId: string }> {
  try {
    // Format phone number if needed
    const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
    
    // Request SMS verification code using React Native Firebase
    confirmationResult = await auth().signInWithPhoneNumber(formattedPhoneNumber);
    
    console.log('SMS sent successfully to', formattedPhoneNumber);
    
    return {
      verificationId: confirmationResult.verificationId
    };
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    
    // Translate Firebase error codes to user-friendly messages
    let userFriendlyMessage = 'An error occurred while sending the verification code.';
    
    switch (error.code) {
      case 'auth/invalid-phone-number':
        userFriendlyMessage = 'The phone number is not valid. Please check and try again.';
        break;
      case 'auth/too-many-requests':
        userFriendlyMessage = 'Too many requests from this device. Please try again later.';
        break;
      case 'auth/quota-exceeded':
        userFriendlyMessage = 'SMS quota exceeded. Please try again later.';
        break;
      case 'auth/captcha-check-failed':
        userFriendlyMessage = 'reCAPTCHA verification failed. Please try again.';
        break;
      case 'auth/missing-verification-code':
        userFriendlyMessage = 'Verification code is missing. Please request a new code.';
        break;
      case 'auth/network-request-failed':
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
        break;
      default:
        userFriendlyMessage = 'Failed to send verification code. Please try again.';
        break;
    }
    
    throw {
      code: error.code || 'auth/unknown',
      message: error.message || 'Unknown error occurred',
      userFriendlyMessage
    } as AuthErrorResponse;
  }
}

// Verify phone number with code
export async function verifyPhoneCode(verificationCode: string): Promise<{ userCredential: any, needsOnboarding: boolean }> {
  try {
    // Verify the confirmation result exists
    if (!confirmationResult) {
      throw {
        code: 'auth/missing-verification-id',
        message: 'Verification ID is missing. Please request a new code.',
        userFriendlyMessage: 'Session expired. Please request a new verification code.'
      } as AuthErrorResponse;
    }
    
    // Confirm the verification code with React Native Firebase
    const userCredential = await confirmationResult.confirm(verificationCode);
    
    // Check if user exists in Firestore
    const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
    
    // Determine if they need onboarding
    const needsOnboarding = !userDoc.exists;
    
    // If new user, create a Firestore record
    if (needsOnboarding) {
      await db.collection('users').doc(userCredential.user.uid).set({
        phoneNumber: userCredential.user.phoneNumber,
        createdAt: new Date(),
        lastLogin: new Date(),
        useBiometricAuth: false,
        onboardingCompleted: false
      });
      
      // Set onboarding needed in AsyncStorage and appStateManager
      await AsyncStorage.setItem('onboardingCompleted', 'false');
      appStateManager.setOnboarding(true);
    } else {
      // Update last login time
      await db.collection('users').doc(userCredential.user.uid).update({
        lastLogin: new Date()
      });
      
      // Check if onboarding is already completed
      const onboardingCompleted = userDoc.data().onboardingCompleted === true;
      await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
      appStateManager.setOnboarding(!onboardingCompleted);
    }
    
    // Set authenticated status in appStateManager
    appStateManager.setAuthenticated(true);
    
    return { userCredential, needsOnboarding };
  } catch (error: any) {
    console.error('Error verifying code:', error);
    
    // Translate Firebase error codes to user-friendly messages
    let userFriendlyMessage = 'An error occurred while verifying the code.';
    
    switch (error.code) {
      case 'auth/invalid-verification-code':
        userFriendlyMessage = 'The verification code is not valid. Please check and try again.';
        break;
      case 'auth/code-expired':
        userFriendlyMessage = 'The verification code has expired. Please request a new code.';
        break;
      case 'auth/missing-verification-id':
        userFriendlyMessage = 'Session expired. Please request a new verification code.';
        break;
      case 'auth/too-many-requests':
        userFriendlyMessage = 'Too many attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
        break;
      default:
        if (error.userFriendlyMessage) {
          userFriendlyMessage = error.userFriendlyMessage;
        } else {
          userFriendlyMessage = 'Failed to verify code. Please try again.';
        }
        break;
    }
    
    throw {
      code: error.code || 'auth/unknown',
      message: error.message || 'Unknown error occurred',
      userFriendlyMessage
    } as AuthErrorResponse;
  }
}

// Firebase Sign Up function
export const signUp = async (
  email: string, 
  password: string,
  firstName: string, 
  lastName: string, 
  username: string, 
  dateOfBirth?: string // Optional
) => {
  try {
    console.log(`Attempting to sign up user: ${email}`);
    
    // Create the user with email and password
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    
    // Get the user's ID token for storage
    const token = await userCredential.user.getIdToken();
    
    // Update both AsyncStorage and cache
    await Promise.all([
      AsyncStorage.setItem('firebaseUserToken', token),
      AsyncStorage.setItem('lastActivityTimestamp', Date.now().toString()),
      AsyncStorage.setItem('authCreateTimestamp', Date.now().toString()),
      authCache.setToken(token)
    ]);

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
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isVerified: false, // Default to false until email verification
      userRole: 'user', // Default role
      userType: 'basic', // Default user type
      useBiometricAuth: false, // Default to not using biometric
      onboardingCompleted: false // Default to not completed onboarding
    });
    
    // Set flag to identify new user for onboarding
    await AsyncStorage.setItem('onboardingCompleted', 'false');
    console.log("🟢 Set onboardingCompleted to FALSE for new user");
    
    // Update app state - set authenticated and needing onboarding
    appStateManager.setAuthenticated(true);
    appStateManager.setOnboarding(true);
    
    // Let the signup screens know that signup was successful to show success UI if needed
    appStateManager.setSignupInProgress(true);

    console.log('Sign up successful. User:', userCredential.user.email);
    return userCredential;

  } catch (error: any) {
    console.error('Sign Up Error:', error);
    
    // Return a user-friendly error
    const errorResponse = getAuthErrorMessage(error);
    throw errorResponse;
  }
};

// Firebase Sign In function - Enhanced to support username, email, or phone
export const signIn = async (identifier: string, password: string, useBiometric: boolean = false) => {
  try {
    console.log(`Attempting to sign in user with identifier: ${identifier}`);
    
    const identifierType = determineIdentifierType(identifier);
    let email = identifier;
    let userCredential;
    
    // Process based on identifier type
    switch (identifierType) {
      case IdentifierType.EMAIL:
        console.log('Signing in with email');
        userCredential = await auth().signInWithEmailAndPassword(identifier, password);
        break;
        
      case IdentifierType.PHONE: {
        console.log('Signing in with phone number');
        const formattedPhone = formatPhoneNumber(identifier);
        
        // Find user with this phone number
        const phoneQuerySnapshot = await db
          .collection('users')
          .where('phoneNumber', '==', formattedPhone)
          .limit(1)
          .get();
        
        if (phoneQuerySnapshot.empty) {
          throw { code: AuthErrorTypes.USER_NOT_FOUND, message: 'No user found with this phone number' };
        }
        
        email = phoneQuerySnapshot.docs[0].data().email;
        userCredential = await auth().signInWithEmailAndPassword(email, password);
        break;
      }
        
      case IdentifierType.USERNAME: {
        console.log('Signing in with username');
        const userEmail = await findUserByUsername(identifier);
        
        if (!userEmail) {
          throw { code: AuthErrorTypes.USERNAME_NOT_FOUND, message: 'No user found with this username' };
        }
        
        email = userEmail;
        userCredential = await auth().signInWithEmailAndPassword(email, password);
        break;
      }
        
      default:
        throw { code: AuthErrorTypes.UNKNOWN_ERROR, message: 'Invalid identifier format' };
    }
    
    const token = await userCredential.user.getIdToken();
    const userId = userCredential.user.uid;
    
    // Update both AsyncStorage and cache
    await Promise.all([
      AsyncStorage.setItem('firebaseUserToken', token),
      AsyncStorage.setItem('lastActivityTimestamp', Date.now().toString()),
      // Only set create timestamp if it doesn't exist (first login)
      AsyncStorage.getItem('authCreateTimestamp').then(value => {
        if (!value) {
          return AsyncStorage.setItem('authCreateTimestamp', Date.now().toString());
        }
      }),
      authCache.setToken(token)
    ]);
    
    // Fetch user details from Firestore to check onboarding status
    const userDoc = await db.collection('users').doc(userId).get();
    
    // Check if onboarding is completed and store the status
    let needsOnboarding = false;
    
    if (userDoc.exists) {
      // Set onboarding status based on user document data
      const onboardingCompleted = userDoc.data().onboardingCompleted === true;
      await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
      needsOnboarding = !onboardingCompleted;
      
      // Update the user's last login timestamp in Firestore
      await db.collection('users').doc(userId).update({
        lastLoginAt: new Date(),
        // TEMPORARILY DISABLED: Force biometric auth to false for debugging
        useBiometricAuth: false
      });
    } else {
      // If user document doesn't exist (rare but possible), default to needing onboarding
      await AsyncStorage.setItem('onboardingCompleted', 'false');
      needsOnboarding = true;
      
      // Create a basic user document
      await db.collection('users').doc(userId).set({
        email: email,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        onboardingCompleted: false,
        useBiometricAuth: useBiometric || false
      });
    }
    
    // Update app state based on user status
    console.log("Auth service: Setting authenticated state to TRUE");
    appStateManager.setAuthenticated(true);
    
    // Verify the state was actually updated
    console.log(`Auth service: Verified authenticated state is now: ${appStateManager.isAuthenticated()}`);
    
    // Do not automatically set onboarding state - let the SignInScreen handle this
    // appStateManager.setOnboarding(needsOnboarding);
    
    // Reset signup success state if it was previously set
    appStateManager.setSignupInProgress(false);

    console.log(`Sign in successful. User: ${userCredential.user.email}, Needs onboarding: ${needsOnboarding}`);
    return {
      userCredential,
      needsOnboarding
    };

  } catch (error: any) {
    console.error('Sign In Error:', error);
    
    // Return a user-friendly error
    const errorResponse = getAuthErrorMessage(error);
    throw errorResponse;
  }
};

// Firebase Password Reset function
export const resetPassword = async (email: string) => {
  try {
    console.log(`Attempting to reset password for: ${email}`);
    
    // Send password reset email
    await auth().sendPasswordResetEmail(email);
    console.log('Password reset email sent to:', email);
    
    return { success: true, message: 'Password reset email sent successfully!' };

  } catch (error: any) {
    console.error('Password Reset Error:', error);
    
    // Return a user-friendly error
    const errorResponse = getAuthErrorMessage(error);
    throw errorResponse;
  }
};

// Function to update biometric auth preference
export const setBiometricAuth = async (userId: string, useBiometric: boolean): Promise<void> => {
  try {
    // Update the preference in Firestore
    await updateBiometricPreference(userId, useBiometric);
    
    // Also update locally in AsyncStorage for faster access
    await AsyncStorage.setItem('useBiometricAuth', useBiometric ? 'true' : 'false');
    
    console.log(`Biometric authentication ${useBiometric ? 'enabled' : 'disabled'} for user: ${userId}`);
  } catch (error) {
    console.error('Error updating biometric auth preference:', error);
    throw error;
  }
};

// Function to check if biometric auth is enabled for current user
export const isBiometricAuthEnabled = async (): Promise<boolean> => {
  try {
    // Check local storage first for faster response
    const storedPreference = await AsyncStorage.getItem('useBiometricAuth');
    if (storedPreference !== null) {
      return storedPreference === 'true';
    }
    
    // If not in local storage and user is logged in, check Firestore
    if (auth().currentUser) {
      try {
        const currentUser = auth().currentUser!; // Use non-null assertion
        const userId = currentUser.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists && userDoc.data().useBiometricAuth !== undefined) {
          const useBiometric = !!userDoc.data().useBiometricAuth;
          
          // Cache the result in AsyncStorage
          await AsyncStorage.setItem('useBiometricAuth', useBiometric ? 'true' : 'false');
          
          return useBiometric;
        }
      } catch (firestoreError) {
        console.error('Error accessing Firestore:', firestoreError);
        // Continue with default value - don't let Firestore errors block functionality
      }
    }
    
    // Default to false if no preference is found
    return false;
  } catch (error) {
    console.error('Error checking biometric auth preference:', error);
    return false;
  }
};

// Firebase Sign Out function
export const signOutUser = async () => {
  try {
    // Get user ID before signing out to clear user-specific data
    const userId = auth().currentUser?.uid;
    
    await auth().signOut();
    
    // Items to remove from AsyncStorage
    const itemsToRemove = [
      'firebaseUserToken',
      'lastActivityTimestamp',
      'authCreateTimestamp',
      'useBiometricAuth',
      'onboardingCompleted'
    ];
    
    // Add user-specific search cache key if we have a user ID
    if (userId) {
      itemsToRemove.push(`recentSearches_${userId}`);
      
      // Also clear any other user-specific cache keys (posts, profile, preferences)
      itemsToRemove.push(`user_posts_cache_${userId}`);
      itemsToRemove.push(`user_posts_cache_timestamp_${userId}`);
      itemsToRemove.push(`user_profile_cache_${userId}`);
      itemsToRemove.push(`user_profile_cache_timestamp_${userId}`);
      itemsToRemove.push(`user_preferences_cache_${userId}`);
      itemsToRemove.push(`user_preferences_cache_timestamp_${userId}`);
    }
    
    // Clear all auth-related storage and user-specific caches
    await Promise.all([
      ...itemsToRemove.map(key => AsyncStorage.removeItem(key)),
      authCache.invalidateCache(),
      sessionManager.clearSession()
    ]);
    
    // Update app state
    appStateManager.setAuthenticated(false);
    appStateManager.setOnboarding(false);
    appStateManager.setSignupInProgress(false);
    
    console.log('User signed out successfully and all user caches cleared');
    
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};

// Function to update user's onboarding progress
export const updateOnboardingProgress = async (
  userId: string, 
  progress: {[key: string]: boolean}
): Promise<void> => {
  try {
    console.log(`Updating onboarding progress for user ${userId}:`, progress);
    
    // Get the current user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      // Get current progress or create empty object
      const currentProgress = userDoc.data().onboardingProgress || {};
      
      // Merge the new progress with the existing progress
      const updatedProgress = {
        ...currentProgress,
        ...progress
      };
      
      // Update the document with the merged progress
      await db.collection('users').doc(userId).update({
        onboardingProgress: updatedProgress
      });
      
      console.log('Onboarding progress updated successfully');
      
      // Check if all required steps are complete
      const requiredSteps = [
        'personalDetails',
        'preferences',
        'sizingInfo',
        'styleProfile',
        'brandPreferences'
      ];
      
      const allStepsComplete = requiredSteps.every(step => 
        updatedProgress[step] === true
      );
      
      // If all steps are complete, mark onboarding as completed
      if (allStepsComplete) {
        await db.collection('users').doc(userId).update({
          onboardingCompleted: true
        });
        
        // Update AsyncStorage and app state
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        appStateManager.setOnboarding(false);
        
        console.log('All onboarding steps complete, marked onboarding as completed');
      }
    } else {
      console.error('User document not found');
      throw new Error('User document not found');
    }
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    throw error;
  }
};

// Function to get user's current onboarding progress
export const getOnboardingProgress = async (userId: string): Promise<{[key: string]: boolean}> => {
  try {
    // Get the user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      // Return the onboarding progress or empty object if none exists
      return userDoc.data().onboardingProgress || {};
    } else {
      console.error('User document not found');
      return {};
    }
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    return {};
  }
}; 