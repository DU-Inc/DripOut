import { db } from '../Config/firebaseconfig';
import firestore from '@react-native-firebase/firestore';

/**
 * Interface for user preview data
 */
export interface UserPreview {
  id: string;
  username: string;
  userDisplayName?: string;
  fullName?: string;
  profilePictureURL?: string;
}

/**
 * Interface for follow relationship
 */
export interface FollowRelationship {
  id?: string;
  followerId: string;  // User who is following
  followedId: string;  // User being followed
  createdAt: any;      // Timestamp when the follow relationship was created
}

/**
 * Follow a user using a transaction to maintain consistent follower counts
 * @param followerId - ID of the user who wants to follow someone
 * @param followedId - ID of the user to be followed
 * @returns Promise with the document reference of the new follow relationship
 */
export const followUser = async (
  followerId: string, 
  followedId: string
): Promise<DocumentReference<DocumentData>> => {
  // Validate that users are different (can't follow yourself)
  if (followerId === followedId) {
    throw new Error('Users cannot follow themselves');
  }

  // Check if already following
  const isAlreadyFollowing = await isUserFollowing(followerId, followedId);
  if (isAlreadyFollowing) {
    throw new Error('Already following this user');
  }

  // Create the follow relationship with a transaction to update counts
  try {
    let followDocRef: any;
    
    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // FIRST: Do all reads (must happen before writes)
      // 1. Prepare document references
      followDocRef = db.collection('follows').doc();
      
      // 2. Read follower document
      const followerRef = db.collection('users').doc(followerId);
      const followerSnap = await transaction.get(followerRef);
      
      // 3. Read followed user document
      const followedRef = db.collection('users').doc(followedId);
      const followedSnap = await transaction.get(followedRef);
      
      // Get current counts
      const currentFollowingCount = followerSnap.exists ? (followerSnap.data().followingCount || 0) : 0;
      const currentFollowersCount = followedSnap.exists ? (followedSnap.data().followersCount || 0) : 0;
      
      // SECOND: Perform all writes
      // 1. Create follow relationship
      transaction.set(followDocRef, {
        followerId,
        followedId,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      
      // 2. Update follower's following count if the document exists
      if (followerSnap.exists) {
        transaction.update(followerRef, {
          followingCount: currentFollowingCount + 1
        });
      }
      
      // 3. Update followed user's followers count if the document exists
      if (followedSnap.exists) {
        transaction.update(followedRef, {
          followersCount: currentFollowersCount + 1
        });
      }
    });

    console.log(`User ${followerId} is now following ${followedId}`);
    return followDocRef;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

/**
 * Unfollow a user using a transaction to maintain consistent follower counts
 * @param followerId - ID of the user who wants to unfollow someone
 * @param followedId - ID of the user to be unfollowed
 * @returns Promise indicating success
 */
export const unfollowUser = async (
  followerId: string, 
  followedId: string
): Promise<void> => {
  try {
    // Query for the follow relationship
    const querySnapshot = await db
      .collection('follows')
      .where('followerId', '==', followerId)
      .where('followedId', '==', followedId)
      .get();

    // If no relationships found, return early
    if (querySnapshot.empty) {
      console.log(`No follow relationship found between ${followerId} and ${followedId}`);
      return;
    }

    // Use a transaction to update counts and delete the relationship
    await db.runTransaction(async (transaction) => {
      // FIRST: Do all reads
      // Get the document references to delete
      const followDocRefs = querySnapshot.docs.map(doc => doc.ref);
      
      // 1. Read follower's document
      const followerRef = db.collection('users').doc(followerId);
      const followerSnap = await transaction.get(followerRef);
      
      // 2. Read followed user's document
      const followedRef = db.collection('users').doc(followedId);
      const followedSnap = await transaction.get(followedRef);
      
      // Calculate the new counts
      const currentFollowingCount = followerSnap.exists ? (followerSnap.data().followingCount || 0) : 0;
      const currentFollowersCount = followedSnap.exists ? (followedSnap.data().followersCount || 0) : 0;
      
      // Ensure we don't decrement below 0
      const newFollowingCount = Math.max(0, currentFollowingCount - 1);
      const newFollowersCount = Math.max(0, currentFollowersCount - 1);
      
      // SECOND: Perform all writes
      // 1. Delete all matching relationships (usually just one)
      followDocRefs.forEach(docRef => {
        transaction.delete(docRef);
      });
      
      // 2. Update follower's following count if document exists
      if (followerSnap.exists) {
        transaction.update(followerRef, {
          followingCount: newFollowingCount
        });
      }
      
      // 3. Update followed user's followers count if document exists
      if (followedSnap.exists) {
        transaction.update(followedRef, {
          followersCount: newFollowersCount
        });
      }
    });

    console.log(`User ${followerId} has unfollowed ${followedId}`);
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

/**
 * Check if a user is following another user
 * @param followerId - ID of the potential follower
 * @param followedId - ID of the potentially followed user
 * @returns Promise with boolean indicating if followerId is following followedId
 */
export const isUserFollowing = async (
  followerId: string, 
  followedId: string
): Promise<boolean> => {
  try {
    // Query for follow relationships matching the criteria
    const querySnapshot = await db
      .collection('follows')
      .where('followerId', '==', followerId)
      .where('followedId', '==', followedId)
      .get();
    
    // Return true if at least one relationship exists
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw error;
  }
};

/**
 * Get users that a specified user is following
 * @param userId - The user ID to check
 * @returns Promise with array of user IDs that userId is following
 */
export const getFollowing = async (userId: string): Promise<string[]> => {
  try {
    const querySnapshot = await db
      .collection('follows')
      .where('followerId', '==', userId)
      .get();
    
    // Extract the followed user IDs from the documents
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return data.followedId;
    });
  } catch (error) {
    console.error('Error getting following list:', error);
    throw error;
  }
};

/**
 * Get users that are following a specified user
 * @param userId - The user ID to check
 * @returns Promise with array of user IDs that are following userId
 */
export const getFollowers = async (userId: string): Promise<string[]> => {
  try {
    const querySnapshot = await db
      .collection('follows')
      .where('followedId', '==', userId)
      .get();
    
    // Extract the follower user IDs from the documents
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return data.followerId;
    });
  } catch (error) {
    console.error('Error getting followers list:', error);
    throw error;
  }
};

/**
 * Get follower counts for a user
 * @param userId - The user ID to check
 * @returns Promise with object containing follower and following counts
 */
export const getFollowCounts = async (
  userId: string
): Promise<{ followers: number; following: number }> => {
  try {
    // Get followers (users following userId)
    const followersSnapshot = await db
      .collection('follows')
      .where('followedId', '==', userId)
      .get();
    const followersCount = followersSnapshot.size;

    // Get following (users that userId is following)
    const followingSnapshot = await db
      .collection('follows')
      .where('followerId', '==', userId)
      .get();
    const followingCount = followingSnapshot.size;

    return {
      followers: followersCount,
      following: followingCount
    };
  } catch (error) {
    console.error('Error getting follow counts:', error);
    throw error;
  }
};

/**
 * Get users that are following a specified user with full profile data
 * @param userId - The user ID to check
 * @returns Promise with array of UserPreview objects of users following userId
 */
export const getFollowersWithProfile = async (userId: string): Promise<UserPreview[]> => {
  try {
    const querySnapshot = await db
      .collection('follows')
      .where('followedId', '==', userId)
      .get();
    
    // Extract the follower user IDs
    const followerIds = querySnapshot.docs.map(doc => doc.data().followerId);
    
    if (followerIds.length === 0) {
      return [];
    }
    
    // Fetch user profiles in batches (Firestore 'in' query limit is 10)
    const userProfiles: UserPreview[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < followerIds.length; i += batchSize) {
      const batch = followerIds.slice(i, i + batchSize);
      
      const usersSnapshot = await db
        .collection('users')
        .where(firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        userProfiles.push({
          id: doc.id,
          username: userData.username || '',
          userDisplayName: userData.userDisplayName,
          fullName: userData.fullName,
          profilePictureURL: userData.profilePictureURL,
        });
      });
    }
    
    return userProfiles;
  } catch (error) {
    console.error('Error getting followers with profile:', error);
    throw error;
  }
};

/**
 * Get users that a specified user is following with full profile data
 * @param userId - The user ID to check
 * @returns Promise with array of UserPreview objects that userId is following
 */
export const getFollowingWithProfile = async (userId: string): Promise<UserPreview[]> => {
  try {
    const querySnapshot = await db
      .collection('follows')
      .where('followerId', '==', userId)
      .get();
    
    // Extract the followed user IDs
    const followedIds = querySnapshot.docs.map(doc => doc.data().followedId);
    
    if (followedIds.length === 0) {
      return [];
    }
    
    // Fetch user profiles in batches (Firestore 'in' query limit is 10)
    const userProfiles: UserPreview[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < followedIds.length; i += batchSize) {
      const batch = followedIds.slice(i, i + batchSize);
      
      const usersSnapshot = await db
        .collection('users')
        .where(firestore.FieldPath.documentId(), 'in', batch)
        .get();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        userProfiles.push({
          id: doc.id,
          username: userData.username || '',
          userDisplayName: userData.userDisplayName,
          fullName: userData.fullName,
          profilePictureURL: userData.profilePictureURL,
        });
      });
    }
    
    return userProfiles;
  } catch (error) {
    console.error('Error getting following with profile:', error);
    throw error;
  }
};

// Create a combined service object for easier imports
export const followService = {
  followUser,
  unfollowUser,
  isUserFollowing,
  getFollowing,
  getFollowers,
  getFollowCounts,
  getFollowersWithProfile,
  getFollowingWithProfile,
};