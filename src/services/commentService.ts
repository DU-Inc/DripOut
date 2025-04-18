import { db, auth } from '../Config/firebaseconfig';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Interface for Comment document
 */
export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  postId: string;
  text: string;
  createdAt: any;
  likes: number;
}

/**
 * Add a comment to a post using a transaction to maintain consistent comment count
 * @param postId - The ID of the post to comment on
 * @param text - The comment text
 * @returns Promise with the created comment
 */
export const addComment = async (postId: string, text: string): Promise<Comment> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const userId = currentUser.uid;
    const username = currentUser.displayName || 'Anonymous';
    const userAvatar = currentUser.photoURL || null; // Use null instead of undefined

    let commentRef: any;
    
    // Use a transaction to ensure consistent comment count
    await runTransaction(db, async (transaction) => {
      // Get the post document
      const postRef = doc(db, 'posts', postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        throw new Error(`Post ${postId} does not exist`);
      }

      // Create a new comment document
      const commentsCollection = collection(db, 'comments');
      commentRef = doc(commentsCollection);
      
      transaction.set(commentRef, {
        userId,
        username,
        userAvatar,
        postId,
        text,
        likes: 0,
        createdAt: serverTimestamp()
      });

      // Update the post's comment count
      const currentComments = postDoc.data().comments || 0;
      transaction.update(postRef, {
        comments: currentComments + 1
      });
    });

    console.log(`User ${userId} commented on post ${postId}`);
    
    // Return the created comment
    return {
      id: commentRef.id,
      userId,
      username,
      userAvatar,
      postId,
      text,
      likes: 0,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Delete a comment from a post
 * @param commentId - The ID of the comment to delete
 * @param postId - The ID of the post
 * @returns Promise indicating success
 */
export const deleteComment = async (commentId: string, postId: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Use a transaction to ensure consistent comment count
    await runTransaction(db, async (transaction) => {
      // Get the comment document
      const commentRef = doc(db, 'comments', commentId);
      const commentDoc = await transaction.get(commentRef);

      if (!commentDoc.exists()) {
        throw new Error(`Comment ${commentId} does not exist`);
      }

      // Check if the user is the author of the comment
      const commentData = commentDoc.data();
      if (commentData.userId !== currentUser.uid) {
        throw new Error('You can only delete your own comments');
      }

      // Get the post document
      const postRef = doc(db, 'posts', postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        throw new Error(`Post ${postId} does not exist`);
      }

      // Delete the comment
      transaction.delete(commentRef);

      // Update the post's comment count (ensuring it doesn't go below 0)
      const currentComments = postDoc.data().comments || 0;
      transaction.update(postRef, {
        comments: Math.max(0, currentComments - 1)
      });
    });

    console.log(`Comment ${commentId} deleted from post ${postId}`);
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Get all comments for a post
 * @param postId - The ID of the post
 * @returns Promise with array of comments for the post
 */
export const getCommentsByPost = async (postId: string): Promise<Comment[]> => {
  try {
    const commentsCollection = collection(db, 'comments');
    const commentsQuery = query(
      commentsCollection,
      where('postId', '==', postId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        userId: data.userId,
        username: data.username,
        userAvatar: data.userAvatar,
        postId: data.postId,
        text: data.text,
        createdAt: data.createdAt,
        likes: data.likes || 0
      });
    });

    return comments;
  } catch (error) {
    console.error('Error getting comments by post:', error);
    throw error;
  }
};

/**
 * Like a comment
 * @param commentId - The ID of the comment to like
 * @returns Promise indicating success
 */
export const likeComment = async (commentId: string): Promise<void> => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error(`Comment ${commentId} does not exist`);
    }

    const currentLikes = commentDoc.data().likes || 0;
    await updateDoc(commentRef, {
      likes: currentLikes + 1
    });

    console.log(`Comment ${commentId} liked`);
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
};

/**
 * Unlike a comment
 * @param commentId - The ID of the comment to unlike
 * @returns Promise indicating success
 */
export const unlikeComment = async (commentId: string): Promise<void> => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error(`Comment ${commentId} does not exist`);
    }

    const currentLikes = commentDoc.data().likes || 0;
    await updateDoc(commentRef, {
      likes: Math.max(0, currentLikes - 1)
    });

    console.log(`Comment ${commentId} unliked`);
  } catch (error) {
    console.error('Error unliking comment:', error);
    throw error;
  }
};