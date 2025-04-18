// src/firebase/firestoreService.ts

import { doc, setDoc, getDoc, DocumentReference, DocumentData, collection, getDocs, query, where, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';
import { createFollowNotification } from './notificationService';

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
  followers?: string[]; // Array of userIDs who follow this user
  following?: string[]; // Array of userIDs this user follows
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
    // Ensure undefined fields are removed before writing to Firestore
    const cleanProfileData = Object.keys(profileData).reduce((acc, key) => {
      if (profileData[key as keyof UserProfile] !== undefined) {
        acc[key] = profileData[key as keyof UserProfile];
      }
      return acc;
    }, {} as any);

    const userDocRef: DocumentReference<DocumentData> = doc(db, 'users', userId);
    await setDoc(userDocRef, cleanProfileData, { merge: true }); // 'merge: true' ensures we don't overwrite existing data
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

// Function to fetch a user profile by username
export const getUserProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return the first user with this username (usernames should be unique)
      return querySnapshot.docs[0].data() as UserProfile;
    } else {
      console.log('No user found with username:', username);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
};

// Function to follow a user
export const followUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    // Update the current user's following list
    const currentUserRef = doc(db, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId)
    });
    
    // Update the target user's followers list
    const targetUserRef = doc(db, 'users', targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId)
    });
    
    // Create a notification for the target user
    await createFollowNotification(currentUserId, targetUserId);
    
    console.log(`User ${currentUserId} now following ${targetUserId}`);
    return true;
  } catch (error) {
    console.error('Error following user:', error);
    return false;
  }
};

// Function to unfollow a user
export const unfollowUser = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    // Update the current user's following list
    const currentUserRef = doc(db, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId)
    });
    
    // Update the target user's followers list
    const targetUserRef = doc(db, 'users', targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId)
    });
    
    console.log(`User ${currentUserId} unfollowed ${targetUserId}`);
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return false;
  }
};

// Function to check if a user is following another user
export const isFollowing = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
  try {
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
    
    if (currentUserDoc.exists()) {
      const userData = currentUserDoc.data() as UserProfile;
      return userData.following?.includes(targetUserId) || false;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

// Function to get followers count
export const getFollowersCount = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.followers?.length || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting followers count:', error);
    return 0;
  }
};

// Function to get following count
export const getFollowingCount = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.following?.length || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
};

// Function to get followers profiles
export const getFollowersProfiles = async (userId: string): Promise<UserProfile[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const followers = userData.followers || [];
      
      // Fetch profile details for each follower
      const followerProfiles: UserProfile[] = [];
      for (const followerId of followers) {
        const profile = await getUserProfile(followerId);
        if (profile) {
          followerProfiles.push(profile);
        }
      }
      
      return followerProfiles;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting followers profiles:', error);
    return [];
  }
};

// Function to get following profiles
export const getFollowingProfiles = async (userId: string): Promise<UserProfile[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      const following = userData.following || [];
      
      // Fetch profile details for each following user
      const followingProfiles: UserProfile[] = [];
      for (const followingId of following) {
        const profile = await getUserProfile(followingId);
        if (profile) {
          followingProfiles.push(profile);
        }
      }
      
      return followingProfiles;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting following profiles:', error);
    return [];
  }
};

// Function to get suggested users to follow (based on interests, mutual connections, etc.)
export const getSuggestedUsers = async (currentUserId: string, limit: number = 10): Promise<UserProfile[]> => {
  try {
    // Get the current user's profile to access their interests
    const currentUserProfile = await getUserProfile(currentUserId);
    if (!currentUserProfile) {
      console.log('Current user profile not found');
      return [];
    }
    
    // Get users the current user is already following
    const followingList = currentUserProfile.following || [];
    
    // Query for users
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    // Filter and process users
    const suggestedUsers: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as UserProfile;
      const userId = userData.userID;
      
      // Skip the current user and users they already follow
      if (userId === currentUserId || followingList.includes(userId)) {
        return;
      }
      
      // Add to suggested users
      suggestedUsers.push(userData);
    });
    
    // Currently, this is just returning random users
    // In a real app, you would implement more sophisticated recommendation algorithms:
    // 1. Users with similar interests based on preferredStyles
    // 2. Users followed by people the current user follows
    // 3. Popular users in the system
    // 4. Users who have interacted with the current user's content
    
    // Limit and randomize the suggestions
    return suggestedUsers
      .sort(() => 0.5 - Math.random()) // Shuffle array
      .slice(0, limit);
      
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return [];
  }
};
