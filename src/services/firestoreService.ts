import { doc, setDoc, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';

// Add global setTimeout type declaration at the top of the file
declare const setTimeout: (callback: () => void, ms: number) => number;

// Define the full interface for User Profile
export interface UserProfile {
  userID: string;
  email: string;
  username: string;
  fullName?: string; // Optional field
  profilePictureURL?: string; // Optional field
  createdAt: Date;
  updatedAt?: Date; // Optional field for tracking profile updates
  isVerified: boolean;
  userRole: string; // e.g., 'user', 'store', 'brand'
  userGender?: string; // Optional field for gender
  userDisplayName?: string; // Optional field for display name
  userPronouns?: string; // Optional field for pronouns
  userType: string; // e.g., 'premium', 'basic'
  useBiometricAuth?: boolean; // Track if user wants to use biometric authentication
  lastLoginAt?: Date; // Track last successful login
  onboardingCompleted?: boolean; // Track if user has completed onboarding
}

// Define the interface for User Preferences
export interface UserPreferences {
  preferredStyles: string[];
  preferredBrands: string[];
  topsSize: string;
  bottomsSize: string;
  shoeSize: string;
  colorPreferences: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// Function to create or update a user profile in Firestore
export const createUserProfile = async (userId: string, profileData: Partial<UserProfile>): Promise<void> => {
  try {
    // Ensure undefined fields are removed before writing to Firestore
    const cleanProfileData = Object.keys(profileData).reduce((acc, key) => {
      if (profileData[key as keyof UserProfile] !== undefined) {
        acc[key] = profileData[key as keyof UserProfile];
      }
      return acc;
    }, {} as any);
    
    // IMPORTANT: Always include userID field with correct capitalization
    // This ensures we're matching the field used in security rules
    cleanProfileData.userID = userId;

    // Add retry logic for Firebase permission errors
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // Get document by userId (which matches the auth UID)
        // But the field inside the document uses userID (capital ID)
        const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
        await setDoc(userDocRef, cleanProfileData, { merge: true }); // 'merge: true' ensures we don't overwrite existing data
        console.log('User profile successfully written!');
        return; // Success - exit the function
      } catch (innerError: any) {
        if (innerError?.code === 'permission-denied' || 
            (innerError?.message && innerError.message.includes('Missing or insufficient permissions'))) {
          // If this is a permissions error
          if (retryCount === maxRetries) {
            console.warn(`Failed to update user profile after ${maxRetries} retries due to permissions.`);
            // Don't throw, just log and continue
            return;
          }
          retryCount++;
          // Fix setTimeout callback format
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * Math.pow(2, retryCount)));
        } else {
          // For non-permission errors, throw immediately
          throw innerError;
        }
      }
    }
  } catch (error) {
    console.error('Error writing user profile: ', error);
    // For most errors, we'll just log rather than break authentication flow
  }
};

// Function to fetch a user profile by userId from Firestore
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserProfile; // Cast the document data to the UserProfile interface
    } else {
      console.log('No such user profile!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile: ', error);
    return null;
  }
};

// Function to update biometric auth preference
export const updateBiometricPreference = async (userId: string, useBiometric: boolean): Promise<void> => {
  try {
    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    
    // Create the data object with userID field to match security rules
    const updateData = {
      userID: userId, // Always include this for security rules
      useBiometricAuth: useBiometric,
      updatedAt: new Date()
    };
    
    // Try to update with retry logic for permissions
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        await setDoc(userDocRef, updateData, { merge: true });
        console.log('Biometric preference updated!');
        return; // Success - exit the function
      } catch (innerError: any) {
        if (innerError?.code === 'permission-denied' || 
            (innerError?.message && innerError.message.includes('Missing or insufficient permissions'))) {
          // If this is a permissions error
          if (retryCount === maxRetries) {
            console.warn(`Failed to update biometric preference after ${maxRetries} retries due to permissions.`);
            // Don't throw, just log and continue
            return;
          }
          retryCount++;
          // Wait before retrying (exponential backoff)
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * Math.pow(2, retryCount)));
        } else {
          // For non-permission errors, throw immediately
          throw innerError;
        }
      }
    }
  } catch (error) {
    console.error('Error updating biometric preference: ', error);
    // Don't throw the error to prevent breaking auth flow
  }
};

// Function to create or update user preferences in Firestore
export const setUserPreferences = async (userId: string, preferencesData: Partial<UserPreferences>): Promise<void> => {
  try {
    const preferencesDocRef: DocumentReference<DocumentData> = doc(db, 'user_preferences', userId);
    await setDoc(preferencesDocRef, preferencesData, { merge: true }); // 'merge: true' ensures we don't overwrite existing data
    console.log('User preferences successfully written!');
  } catch (error) {
    console.error('Error writing user preferences: ', error);
    throw error;
  }
};

// Function to fetch user preferences by userId from Firestore
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const preferencesDocRef: DocumentReference<DocumentData> = doc(db, 'user_preferences', userId);
    const preferencesDoc = await getDoc(preferencesDocRef);

    if (preferencesDoc.exists()) {
      return preferencesDoc.data() as UserPreferences; // Cast the document data to the UserPreferences interface
    } else {
      console.log('No such user preferences!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user preferences: ', error);
    return null;
  }
}; 