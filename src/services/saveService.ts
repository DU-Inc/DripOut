import { db, auth } from '../Config/firebaseconfig';

/**
 * Interface for Saved post
 */
export interface SavedPost {
  id?: string;
  userId: string;
  postId: string;
  createdAt: any;
}

/**
 * Check if a user has saved a post
 * @param userId - The user ID
 * @param postId - The post ID
 * @returns Promise with boolean indicating whether the user has saved the post
 */
export const hasUserSavedPost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const querySnapshot = await db
      .collection('saved_posts')
      .where('userId', '==', userId)
      .where('postId', '==', postId)
      .get();

    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if user has saved post:', error);
    throw error;
  }
};

/**
 * Save a post
 * @param userId - The ID of the user saving the post
 * @param postId - The ID of the post to save
 * @returns Promise indicating success
 */
export const savePost = async (userId: string, postId: string): Promise<void> => {
  try {
    // Check if the user has already saved the post
    const alreadySaved = await hasUserSavedPost(userId, postId);
    if (alreadySaved) {
      console.log(`User ${userId} has already saved post ${postId}`);
      return;
    }

    // Create a unique ID for the saved post document
    const savedDocId = `${userId}_${postId}`;
    const savedRef = db.collection('saved_posts').doc(savedDocId);

    // Create the saved post document
    await savedRef.set({
      userId,
      postId,
      createdAt: new Date()
    });

    console.log(`User ${userId} saved post ${postId}`);
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
};

/**
 * Unsave a post
 * @param userId - The ID of the user unsaving the post
 * @param postId - The ID of the post to unsave
 * @returns Promise indicating success
 */
export const unsavePost = async (userId: string, postId: string): Promise<void> => {
  try {
    // Create a unique ID for the saved post document
    const savedDocId = `${userId}_${postId}`;
    const savedRef = db.collection('saved_posts').doc(savedDocId);

    // Delete the saved post document
    await savedRef.delete();

    console.log(`User ${userId} unsaved post ${postId}`);
  } catch (error) {
    console.error('Error unsaving post:', error);
    throw error;
  }
};

/**
 * Toggle save status for a post
 * @param userId - The ID of the user toggling the save
 * @param postId - The ID of the post
 * @returns Promise with boolean indicating the new save status (true = saved, false = unsaved)
 */
export const toggleSavePost = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const isSaved = await hasUserSavedPost(userId, postId);
    
    if (isSaved) {
      await unsavePost(userId, postId);
      return false;
    } else {
      await savePost(userId, postId);
      return true;
    }
  } catch (error) {
    console.error('Error toggling save status:', error);
    throw error;
  }
};

/**
 * Get all posts saved by a user
 * @param userId - The user ID
 * @returns Promise with array of post IDs that the user has saved
 */
export const getSavedPostsByUser = async (userId: string): Promise<string[]> => {
  try {
    const querySnapshot = await db
      .collection('saved_posts')
      .where('userId', '==', userId)
      .get();

    return querySnapshot.docs.map(doc => doc.data().postId);
  } catch (error) {
    console.error('Error getting saved posts by user:', error);
    throw error;
  }
};