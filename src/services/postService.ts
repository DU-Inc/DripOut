import { db, auth } from '../Config/firebaseconfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { uploadImageAndGetURL } from './storageService';

/**
 * Interface for creating a new post
 */
interface CreatePostData {
  imageUri: string;
  caption: string;
  tags: string[];
}

/**
 * Interface for post data stored in Firestore
 */
export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: Timestamp;
}

/**
 * Create a new post by uploading the image and saving post data
 * 
 * @param postData - The post data including image, caption, and tags
 * @param onProgress - Optional callback for upload progress
 * @returns The created post data
 */
export const createPost = async (
  postData: CreatePostData,
  onProgress?: (progress: number) => void
): Promise<Post> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get user information for the post
    // Simplified for now, but you would normally fetch this from your user profile
    const username = auth.currentUser?.displayName || 'Anonymous';
    const userAvatar = auth.currentUser?.photoURL || '';

    // Upload the image to Firebase Storage
    const imageUrl = await uploadImageAndGetURL(
      postData.imageUri,
      'posts',
      undefined,
      onProgress
    );

    // Create the post document in Firestore
    const postRef = collection(db, 'posts');
    const newPost = {
      userId,
      username,
      userAvatar,
      imageUrl,
      caption: postData.caption,
      tags: postData.tags,
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(postRef, newPost);

    // Return the created post with its ID
    return {
      id: docRef.id,
      ...newPost,
      createdAt: Timestamp.now(), // Use current timestamp for the return value
    };
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

/**
 * Get posts by user ID
 * 
 * @param userId - The user ID to get posts for (defaults to current user)
 * @returns Array of posts for the specified user
 */
export const getPostsByUser = async (userId?: string): Promise<Post[]> => {
  try {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) {
      throw new Error('User ID not provided and user not authenticated');
    }

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(postsQuery);
    const posts: Post[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        username: data.username,
        userAvatar: data.userAvatar,
        imageUrl: data.imageUrl,
        caption: data.caption,
        tags: data.tags,
        likes: data.likes,
        comments: data.comments,
        createdAt: data.createdAt,
      });
    });

    return posts;
  } catch (error) {
    console.error('Error getting posts by user:', error);
    throw error;
  }
};

/**
 * Get all posts for the feed
 * 
 * @returns Array of all posts ordered by creation date
 */
export const getAllPosts = async (): Promise<Post[]> => {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(postsQuery);
    const posts: Post[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        username: data.username,
        userAvatar: data.userAvatar,
        imageUrl: data.imageUrl,
        caption: data.caption,
        tags: data.tags,
        likes: data.likes,
        comments: data.comments,
        createdAt: data.createdAt,
      });
    });

    return posts;
  } catch (error) {
    console.error('Error getting all posts:', error);
    throw error;
  }
};