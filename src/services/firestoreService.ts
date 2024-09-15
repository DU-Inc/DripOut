// src/firebase/firestoreService.ts

import { doc, setDoc, getDoc, DocumentReference, DocumentData } from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';

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
  userAge?: number; // Optional field for age
  userMusic?: string; // Optional field for music preferences
  userGender?: string; // Optional field for gender
  userDisplayName?: string; // Optional field for display name
  userPronouns?: string; // Optional field for pronouns
  userType: string; // e.g., 'premium', 'basic'
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
export const createUserProfile = async (userId: string, profileData: UserProfile): Promise<void> => {
  try {
    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    await setDoc(userDocRef, profileData, { merge: true }); // 'merge: true' ensures we don't overwrite existing data
    console.log('User profile successfully written!');
  } catch (error) {
    console.error('Error writing user profile: ', error);
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

// Function to create or update user preferences in Firestore
export const setUserPreferences = async (userId: string, preferencesData: UserPreferences): Promise<void> => {
  try {
    const preferencesDocRef: DocumentReference<DocumentData> = doc(db, 'user_preferences', userId);
    await setDoc(preferencesDocRef, preferencesData, { merge: true }); // 'merge: true' ensures we don't overwrite existing data
    console.log('User preferences successfully written!');
  } catch (error) {
    console.error('Error writing user preferences: ', error);
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
