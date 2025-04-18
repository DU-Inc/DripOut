import { db, auth } from '../Config/firebaseconfig';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  runTransaction,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Interface for Like document
 */
export interface Like {
  id?: string;
  userId: string;
  postId: string;
  createdAt: any;
}

/**
 * Check if a user has liked a post
 * @param userId - The user ID
 * @param postId - The post ID
 * @returns Promise with boolean indicating whether the user has liked the post
 */
export const hasUserLikedPost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const likesCollection = collection(db, 'likes');
    const likeQuery = query(
      likesCollection,
      where('userId', '==', userId),
      where('postId', '==', postId)
    );

    const querySnapshot = await getDocs(likeQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if user has liked post:', error);
    throw error;
  }
};

/**
 * Like a post using a transaction to maintain consistent like count
 * @param userId - The ID of the user liking the post
 * @param postId - The ID of the post to like
 * @returns Promise indicating success
 */
export const likePost = async (userId: string, postId: string): Promise<void> => {
  try {
    // Check if the user has already liked the post
    const alreadyLiked = await hasUserLikedPost(userId, postId);
    if (alreadyLiked) {
      console.log(`User ${userId} has already liked post ${postId}`);
      return;
    }

    // Use a transaction to update the post's like count and create a like document
    await runTransaction(db, async (transaction) => {
      // Get the post document
      const postRef = doc(db, 'posts', postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        throw new Error(`Post ${postId} does not exist`);
      }

      // Create a unique ID for the like document
      const likeDocId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeDocId);

      // Get current likes count
      const currentLikes = postDoc.data().likes || 0;

      // Update the post's like count
      transaction.update(postRef, {
        likes: currentLikes + 1
      });

      // Create the like document
      transaction.set(likeRef, {
        userId,
        postId,
        createdAt: serverTimestamp()
      });
    });

    console.log(`User ${userId} liked post ${postId}`);
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

/**
 * Unlike a post using a transaction to maintain consistent like count
 * @param userId - The ID of the user unliking the post
 * @param postId - The ID of the post to unlike
 * @returns Promise indicating success
 */
export const unlikePost = async (userId: string, postId: string): Promise<void> => {
  try {
    // Use a transaction to update the post's like count and delete the like document
    await runTransaction(db, async (transaction) => {
      // Get the post document
      const postRef = doc(db, 'posts', postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        throw new Error(`Post ${postId} does not exist`);
      }

      // Create a unique ID for the like document
      const likeDocId = `${userId}_${postId}`;
      const likeRef = doc(db, 'likes', likeDocId);
      
      // Get the like document
      const likeDoc = await transaction.get(likeRef);
      
      // Only proceed if the like exists
      if (likeDoc.exists()) {
        // Get current likes count
        const currentLikes = postDoc.data().likes || 0;
        
        // Update the post's like count (ensure it doesn't go below 0)
        transaction.update(postRef, {
          likes: Math.max(0, currentLikes - 1)
        });
        
        // Delete the like document
        transaction.delete(likeRef);
      }
    });

    console.log(`User ${userId} unliked post ${postId}`);
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
};

/**
 * Toggle like status for a post
 * @param userId - The ID of the user toggling the like
 * @param postId - The ID of the post
 * @returns Promise with boolean indicating the new like status (true = liked, false = unliked)
 */
export const toggleLikePost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const isLiked = await hasUserLikedPost(userId, postId);
    
    if (isLiked) {
      await unlikePost(userId, postId);
      return false;
    } else {
      await likePost(userId, postId);
      return true;
    }
  } catch (error) {
    console.error('Error toggling like status:', error);
    throw error;
  }
};

/**
 * Get posts liked by a user
 * @param userId - The user ID
 * @returns Promise with array of post IDs that the user has liked
 */
export const getLikedPostsByUser = async (userId: string): Promise<string[]> => {
  try {
    const likesCollection = collection(db, 'likes');
    const likeQuery = query(
      likesCollection,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(likeQuery);
    return querySnapshot.docs.map(doc => doc.data().postId);
  } catch (error) {
    console.error('Error getting liked posts by user:', error);
    throw error;
  }
};