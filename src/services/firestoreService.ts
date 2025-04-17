import { 
  doc, 
  setDoc, 
  getDoc, 
  DocumentReference, 
  DocumentData, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAt, 
  endAt,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';

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
  
  // Additional optional profile fields for settings screen
  height?: string;             // User's height (optional)
  weight?: string;             // User's weight (optional)
  bodyType?: string;           // User's body type (optional)
  birthday?: string;           // User's birthday (optional)
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

/**
 * Search for users in Firestore by username, display name, full name or email.
 * 
 * @param searchTerm The search term to look for in usernames, display names, full names, and emails
 * @param maxResults Maximum number of results to return (default 20)
 * @returns Array of UserProfile objects matching the search criteria
 */
export const searchUsers = async (searchTerm: string, maxResults: number = 20): Promise<UserProfile[]> => {
  try {
    if (!searchTerm.trim()) {
      return [];
    }

    console.log(`Searching for users with term: '${searchTerm}'`);
    
    // Convert the search term to lowercase for case-insensitive searching
    const searchTermLower = searchTerm.toLowerCase();
    const searchTermUpper = searchTerm.toLowerCase() + '\uf8ff'; // Unicode character after all other characters
    
    // Create a query against the users collection
    const usersCollection = collection(db, 'users');
    let results: UserProfile[] = [];
    const userIds = new Set<string>();
    
    // Try to match by email first (exact match with contains logic)
    const emailQuery = query(
      usersCollection,
      where('email', '>=', searchTermLower),
      where('email', '<=', searchTermUpper),
      orderBy('email'),
      limit(maxResults)
    );
    
    console.log('Executing email search query');
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      console.log(`Found ${emailSnapshot.size} results matching email`);
      emailSnapshot.forEach(doc => {
        const userData = doc.data() as UserProfile;
        results.push(userData);
        userIds.add(userData.userID);
      });
    }
    
    // Next, try to match by username
    if (results.length < maxResults) {
      const remainingResults = maxResults - results.length;
      
      const usernameQuery = query(
        usersCollection,
        where('username', '>=', searchTermLower),
        where('username', '<=', searchTermUpper),
        orderBy('username'),
        limit(remainingResults)
      );
      
      console.log('Executing username search query');
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        console.log(`Found ${usernameSnapshot.size} results matching username`);
        usernameSnapshot.forEach(doc => {
          const userData = doc.data() as UserProfile;
          if (!userIds.has(userData.userID)) {
            results.push(userData);
            userIds.add(userData.userID);
          }
        });
      }
    }
    
    // If we didn't get enough results, try display name
    if (results.length < maxResults) {
      const remainingResults = maxResults - results.length;
      
      const displayNameQuery = query(
        usersCollection,
        where('userDisplayName', '>=', searchTermLower),
        where('userDisplayName', '<=', searchTermUpper),
        orderBy('userDisplayName'),
        limit(remainingResults)
      );
      
      console.log('Executing display name search query');
      const displayNameSnapshot = await getDocs(displayNameQuery);
      
      if (!displayNameSnapshot.empty) {
        console.log(`Found ${displayNameSnapshot.size} results matching display name`);
        displayNameSnapshot.forEach(doc => {
          const userData = doc.data() as UserProfile;
          if (!userIds.has(userData.userID)) {
            results.push(userData);
            userIds.add(userData.userID);
          }
        });
      }
    }
    
    // Add fullName search if there's space for more results
    if (results.length < maxResults) {
      const remainingResults = maxResults - results.length;
      
      const fullNameQuery = query(
        usersCollection,
        where('fullName', '>=', searchTermLower),
        where('fullName', '<=', searchTermUpper),
        orderBy('fullName'),
        limit(remainingResults)
      );
      
      console.log('Executing full name search query');
      const fullNameSnapshot = await getDocs(fullNameQuery);
      
      if (!fullNameSnapshot.empty) {
        console.log(`Found ${fullNameSnapshot.size} results matching full name`);
        fullNameSnapshot.forEach(doc => {
          const userData = doc.data() as UserProfile;
          if (!userIds.has(userData.userID)) {
            results.push(userData);
            userIds.add(userData.userID);
          }
        });
      }
    }
    
    console.log(`Total results: Found ${results.length} users matching search term '${searchTerm}'`);
    return results;
  } catch (error) {
    console.error('Error searching users: ', error);
    return [];
  }
};

/**
 * Get a specific user's profile by username
 * 
 * @param username The username to look for
 * @returns UserProfile object if found, or null
 */
export const getUserProfileByUsername = async (username: string): Promise<UserProfile | null> => {
  try {
    const usersCollection = collection(db, 'users');
    const usernameQuery = query(
      usersCollection,
      where('username', '==', username.toLowerCase())
    );
    
    const querySnapshot = await getDocs(usernameQuery);
    
    if (!querySnapshot.empty) {
      // Return the first matching user (should only be one)
      return querySnapshot.docs[0].data() as UserProfile;
    } else {
      console.log(`No user found with username '${username}'`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user by username: ', error);
    return null;
  }
};

/**
 * Propagates user profile updates to all related collections
 * This ensures that when a user updates their profile, all instances of their
 * profile data (username, avatar, etc.) are updated everywhere in the app
 * 
 * @param userId - The user's ID
 * @param updatedFields - Object containing only the fields that were updated
 * @returns Promise that resolves when all updates are complete
 */
export const propagateProfileUpdates = async (
  userId: string, 
  updatedFields: Partial<UserProfile>
): Promise<void> => {
  console.log('Propagating profile updates for user:', userId);
  console.log('Fields to propagate:', updatedFields);

  try {
    const batchSize = 500; // Firestore has a limit of 500 writes per batch
    const updatePromises: Promise<void>[] = [];
    
    // Only proceed with fields that actually need to be propagated to other collections
    const fieldsToPropagate = {
      ...(updatedFields.username && { username: updatedFields.username }),
      ...(updatedFields.profilePictureURL && { userAvatar: updatedFields.profilePictureURL }),
      ...(updatedFields.userDisplayName && { userDisplayName: updatedFields.userDisplayName }),
    };
    
    // Check if there are any fields that need to be propagated
    if (Object.keys(fieldsToPropagate).length === 0) {
      console.log('No fields to propagate - skipping update propagation');
      return;
    }
    
    // 1. Update user posts using the dedicated postService function
    if (fieldsToPropagate.username || fieldsToPropagate.userAvatar) {
      try {
        // Import the post service function to update all posts by this user
        const { updatePostsWithNewProfileData } = require('./postService');
        
        // Call the dedicated function that handles batching internally
        await updatePostsWithNewProfileData(
          userId,
          fieldsToPropagate.username,
          fieldsToPropagate.userAvatar
        );
        
        console.log('Posts updated successfully through dedicated function');
      } catch (postUpdateError) {
        console.error('Error updating posts with dedicated function, falling back to manual update:', postUpdateError);
        
        // Fallback to original implementation if the dedicated function fails
        console.log('Updating posts using fallback method...');
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', userId)
        );
        
        const postsSnapshot = await getDocs(postsQuery);
        console.log(`Found ${postsSnapshot.size} posts to update with fallback method`);
        
        // Create batches of post updates to avoid exceeding write limits
        let processedCount = 0;
        let batch = writeBatch(db);
        
        postsSnapshot.forEach((postDoc, index) => {
          const updateData: Record<string, any> = {};
          
          if (fieldsToPropagate.username) updateData.username = fieldsToPropagate.username;
          if (fieldsToPropagate.userAvatar) updateData.userAvatar = fieldsToPropagate.userAvatar;
          
          batch.update(postDoc.ref, updateData);
          processedCount++;
          
          // Commit when batch reaches limit and start a new batch
          if (processedCount % batchSize === 0 || index === postsSnapshot.size - 1) {
            updatePromises.push(batch.commit());
            batch = writeBatch(db);
          }
        });
      }
    }
    
    // 2. Update user comments
    if (fieldsToPropagate.username || fieldsToPropagate.userAvatar) {
      console.log('Updating comments...');
      const commentsQuery = query(
        collection(db, 'comments'),
        where('userId', '==', userId)
      );
      
      const commentsSnapshot = await getDocs(commentsQuery);
      console.log(`Found ${commentsSnapshot.size} comments to update`);
      
      let processedCount = 0;
      let batch = writeBatch(db);
      
      commentsSnapshot.forEach((commentDoc, index) => {
        const updateData: Record<string, any> = {};
        
        if (fieldsToPropagate.username) updateData.username = fieldsToPropagate.username;
        if (fieldsToPropagate.userAvatar) updateData.userAvatar = fieldsToPropagate.userAvatar;
        
        batch.update(commentDoc.ref, updateData);
        processedCount++;
        
        if (processedCount % batchSize === 0 || index === commentsSnapshot.size - 1) {
          updatePromises.push(batch.commit());
          batch = writeBatch(db);
        }
      });
    }
    
    // 3. Update user likes
    if (fieldsToPropagate.username) {
      console.log('Updating likes...');
      const likesQuery = query(
        collection(db, 'likes'),
        where('userId', '==', userId)
      );
      
      const likesSnapshot = await getDocs(likesQuery);
      console.log(`Found ${likesSnapshot.size} likes to update`);
      
      let processedCount = 0;
      let batch = writeBatch(db);
      
      likesSnapshot.forEach((likeDoc, index) => {
        const updateData: Record<string, any> = {};
        
        if (fieldsToPropagate.username) updateData.username = fieldsToPropagate.username;
        
        batch.update(likeDoc.ref, updateData);
        processedCount++;
        
        if (processedCount % batchSize === 0 || index === likesSnapshot.size - 1) {
          updatePromises.push(batch.commit());
          batch = writeBatch(db);
        }
      });
    }
    
    // 4. Update conversations (only for display purposes, not functional data)
    if (fieldsToPropagate.username || fieldsToPropagate.userAvatar) {
      console.log('Updating message metadata...');
      const messagesQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', userId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      console.log(`Found ${messagesSnapshot.size} messages to update`);
      
      let processedCount = 0;
      let batch = writeBatch(db);
      
      messagesSnapshot.forEach((messageDoc, index) => {
        const updateData: Record<string, any> = {};
        
        if (fieldsToPropagate.username) updateData.senderName = fieldsToPropagate.username;
        if (fieldsToPropagate.userAvatar) updateData.senderAvatar = fieldsToPropagate.userAvatar;
        
        batch.update(messageDoc.ref, updateData);
        processedCount++;
        
        if (processedCount % batchSize === 0 || index === messagesSnapshot.size - 1) {
          updatePromises.push(batch.commit());
          batch = writeBatch(db);
        }
      });
    }
    
    // Wait for all update promises to resolve
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log('Successfully propagated profile updates to all collections');
    } else {
      console.log('No updates were needed');
    }
  } catch (error) {
    console.error('Error propagating profile updates:', error);
    throw error;
  }
};
