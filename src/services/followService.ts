import { db } from '../Config/firebaseconfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp, 
  DocumentReference,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';

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
 * Follow a user
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

  // Create the follow relationship
  try {
    const followsCollection = collection(db, 'follows');
    const followDoc = await addDoc(followsCollection, {
      followerId,
      followedId,
      createdAt: serverTimestamp()
    });

    console.log(`User ${followerId} is now following ${followedId}`);
    return followDoc;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

/**
 * Unfollow a user
 * @param followerId - ID of the user who wants to unfollow someone
 * @param followedId - ID of the user to be unfollowed
 * @returns Promise indicating success
 */
export const unfollowUser = async (
  followerId: string, 
  followedId: string
): Promise<void> => {
  try {
    // Query for all follow relationships matching the criteria
    const followsCollection = collection(db, 'follows');
    const followQuery = query(
      followsCollection,
      where('followerId', '==', followerId),
      where('followedId', '==', followedId)
    );

    const querySnapshot = await getDocs(followQuery);

    // If no relationships found, return early
    if (querySnapshot.empty) {
      console.log(`No follow relationship found between ${followerId} and ${followedId}`);
      return;
    }

    // Delete all matching relationships (usually just one)
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

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
    const followsCollection = collection(db, 'follows');
    const followQuery = query(
      followsCollection,
      where('followerId', '==', followerId),
      where('followedId', '==', followedId)
    );

    const querySnapshot = await getDocs(followQuery);
    
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
    const followsCollection = collection(db, 'follows');
    const followingQuery = query(
      followsCollection,
      where('followerId', '==', userId)
    );

    const querySnapshot = await getDocs(followingQuery);
    
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
    const followsCollection = collection(db, 'follows');
    const followersQuery = query(
      followsCollection,
      where('followedId', '==', userId)
    );

    const querySnapshot = await getDocs(followersQuery);
    
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
    const followersCollection = collection(db, 'follows');
    const followersQuery = query(
      followersCollection,
      where('followedId', '==', userId)
    );
    const followersSnapshot = await getDocs(followersQuery);
    const followersCount = followersSnapshot.size;

    // Get following (users that userId is following)
    const followingQuery = query(
      followersCollection,
      where('followerId', '==', userId)
    );
    const followingSnapshot = await getDocs(followingQuery);
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