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
  QuerySnapshot,
  doc,
  getDoc,
  runTransaction,
  increment,
  updateDoc
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
    let followDocRef: DocumentReference<DocumentData>;
    
    // Use a transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // FIRST: Do all reads (must happen before writes)
      // 1. Prepare document references
      const followsCollection = collection(db, 'follows');
      followDocRef = doc(followsCollection);
      
      // 2. Read follower document
      const followerRef = doc(db, 'users', followerId);
      const followerSnap = await transaction.get(followerRef);
      
      // 3. Read followed user document
      const followedRef = doc(db, 'users', followedId);
      const followedSnap = await transaction.get(followedRef);
      
      // Get current counts
      const currentFollowingCount = followerSnap.exists() ? (followerSnap.data().followingCount || 0) : 0;
      const currentFollowersCount = followedSnap.exists() ? (followedSnap.data().followersCount || 0) : 0;
      
      // SECOND: Perform all writes
      // 1. Create follow relationship
      transaction.set(followDocRef, {
        followerId,
        followedId,
        createdAt: serverTimestamp()
      });
      
      // 2. Update follower's following count if the document exists
      if (followerSnap.exists()) {
        transaction.update(followerRef, {
          followingCount: currentFollowingCount + 1
        });
      }
      
      // 3. Update followed user's followers count if the document exists
      if (followedSnap.exists()) {
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

    // Use a transaction to update counts and delete the relationship
    await runTransaction(db, async (transaction) => {
      // FIRST: Do all reads
      // Get the document references to delete
      const followDocRefs = querySnapshot.docs.map(doc => doc.ref);
      
      // 1. Read follower's document
      const followerRef = doc(db, 'users', followerId);
      const followerSnap = await transaction.get(followerRef);
      
      // 2. Read followed user's document
      const followedRef = doc(db, 'users', followedId);
      const followedSnap = await transaction.get(followedRef);
      
      // Calculate the new counts
      const currentFollowingCount = followerSnap.exists() ? (followerSnap.data().followingCount || 0) : 0;
      const currentFollowersCount = followedSnap.exists() ? (followedSnap.data().followersCount || 0) : 0;
      
      // Ensure we don't decrement below 0
      const newFollowingCount = Math.max(0, currentFollowingCount - 1);
      const newFollowersCount = Math.max(0, currentFollowersCount - 1);
      
      // SECOND: Perform all writes
      // 1. Delete all matching relationships (usually just one)
      followDocRefs.forEach(docRef => {
        transaction.delete(docRef);
      });
      
      // 2. Update follower's following count if document exists
      if (followerSnap.exists()) {
        transaction.update(followerRef, {
          followingCount: newFollowingCount
        });
      }
      
      // 3. Update followed user's followers count if document exists
      if (followedSnap.exists()) {
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