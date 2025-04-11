import { doc, setDoc, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebaseconfig';

// Add global setTimeout type declaration at the top of the file
declare const setTimeout: (callback: () => void, ms: number) => number;

// Generic helper function to clean an object by removing undefined values.
// Constrained so that T is an object.
function cleanData<T extends object>(data: T): Partial<T> {
  return Object.keys(data).reduce((acc, key) => {
    // We assert that key is a key of T.
    if (data[key as keyof T] !== undefined) {
      acc[key as keyof T] = data[key as keyof T];
    }
    return acc;
  }, {} as Partial<T>);
}

// Define the full interface for User Profile
export interface UserProfile {
  userID: string;
  email: string;
  username: string;
  fullName?: string;           // Optional field
  profilePictureURL?: string;  // Optional field
  createdAt: Date;
  updatedAt?: Date;            // Optional field for tracking profile updates
  isVerified: boolean;
  userRole: string;            // e.g., 'user', 'store', 'brand'
  userGender?: string;         // Optional field for gender
  userDisplayName?: string;    // Optional field for display name
  userPronouns?: string;       // Optional field for pronouns
  userType: string;            // e.g., 'premium', 'basic'
  useBiometricAuth?: boolean;  // Track if user wants to use biometric authentication
  lastLoginAt?: Date;          // Track last successful login
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

/**
 * Creates or updates a user profile in Firestore.
 *
 * The function cleans the incoming data by removing undefined values and
 * ensures that the property "userID" is always included.
 *
 * @param userId The user’s unique identifier.
 * @param profileData A partial UserProfile object containing the user data.
 */
export const createUserProfile = async (userId: string, profileData: Partial<UserProfile>): Promise<void> => {
  try {
    // Clean profileData by removing any properties that are undefined.
    const cleanProfileData = cleanData(profileData);

    // IMPORTANT: Always include userID field with the correct capitalization.
    // This ensures our Firestore security rules which check for "userID" work as expected.
    cleanProfileData.userID = userId;

    // Add retry logic for Firebase permission errors.
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // Create a reference to the user document in the 'users' collection.
        const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
        // Use merge: true so that existing fields are not overwritten.
        await setDoc(userDocRef, cleanProfileData, { merge: true });
        console.log('User profile successfully written!');
        return; // Successfully written, exit the function.
      } catch (innerError: any) {
        if (
          innerError?.code === 'permission-denied' ||
          (innerError?.message && innerError.message.includes('Missing or insufficient permissions'))
        ) {
          // If this is a permissions error, try again until maxRetries is reached.
          if (retryCount === maxRetries) {
            console.warn(`Failed to update user profile after ${maxRetries} retries due to permissions.`);
            return;
          }
          retryCount++;
          // Use exponential backoff before retrying.
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * Math.pow(2, retryCount)));
        } else {
          // Throw any other errors immediately.
          throw innerError;
        }
      }
    }
  } catch (error) {
    console.error('Error writing user profile: ', error);
    // Log the error but do not throw further to prevent breaking the auth flow.
  }
};

/**
 * Fetches a user profile by userId from Firestore.
 *
 * @param userId The user's unique identifier.
 * @returns The UserProfile object if found, or null.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    } else {
      console.log('No such user profile!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user profile: ', error);
    return null;
  }
};

/**
 * Updates the biometric authentication preference of the user.
 *
 * @param userId The user's unique identifier.
 * @param useBiometric A boolean indicating the preference.
 */
export const updateBiometricPreference = async (userId: string, useBiometric: boolean): Promise<void> => {
  try {
    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    // Data to update (includes "userID" for matching security rules).
    const updateData = {
      userID: userId,
      useBiometricAuth: useBiometric,
      updatedAt: new Date()
    };

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        await setDoc(userDocRef, updateData, { merge: true });
        console.log('Biometric preference updated!');
        return;
      } catch (innerError: any) {
        if (
          innerError?.code === 'permission-denied' ||
          (innerError?.message && innerError.message.includes('Missing or insufficient permissions'))
        ) {
          if (retryCount === maxRetries) {
            console.warn(`Failed to update biometric preference after ${maxRetries} retries due to permissions.`);
            return;
          }
          retryCount++;
          await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * Math.pow(2, retryCount)));
        } else {
          throw innerError;
        }
      }
    }
  } catch (error) {
    console.error('Error updating biometric preference: ', error);
    // Do not throw the error so as not to break the authentication flow.
  }
};

/**
 * Creates or updates user preferences in Firestore.
 *
 * @param userId The user's unique identifier.
 * @param preferencesData A partial UserPreferences object.
 */
export const setUserPreferences = async (userId: string, preferencesData: Partial<UserPreferences>): Promise<void> => {
  try {
    const preferencesDocRef: DocumentReference<DocumentData> = doc(db, 'user_preferences', userId);
    await setDoc(preferencesDocRef, preferencesData, { merge: true });
    console.log('User preferences successfully written!');
  } catch (error) {
    console.error('Error writing user preferences: ', error);
    throw error; // Throw error so that calling functions can handle it if needed.
  }
};

/**
 * Fetches user preferences by userId from Firestore.
 *
 * @param userId The user's unique identifier.
 * @returns The UserPreferences object if found, or null.
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const preferencesDocRef: DocumentReference<DocumentData> = doc(db, 'user_preferences', userId);
    const preferencesDoc = await getDoc(preferencesDocRef);

    if (preferencesDoc.exists()) {
      return preferencesDoc.data() as UserPreferences;
    } else {
      console.log('No such user preferences!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching user preferences: ', error);
    return null;
  }
};
