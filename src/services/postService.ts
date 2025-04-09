import { db, auth } from '../Config/firebaseconfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { uploadImageAndGetURL } from './storageService';

/**
 * Interface for outfit item in a post
 */
interface OutfitItem {
  name: string;
  brand: string;
  type?: 'shirt' | 'pants' | 'shoes' | 'accessory'; // Optional type field for future use
}

/**
 * Interface for creating a new post
 */
interface CreatePostData {
  imageUri: string;
  caption: string;
  tags: string[];
  outfitItems?: OutfitItem[]; // Optional outfit items (featured pieces)
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
  outfitItems?: OutfitItem[]; // Featured clothing pieces
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
  console.log('🔄 PostService: Creating post...');
  try {
    // Use auth().currentUser instead of auth.currentUser
    const currentUser = auth().currentUser;
    console.log('🔄 PostService: Current user:', currentUser?.uid || 'none');
    
    if (!currentUser) {
      console.error('🔄 PostService: No authenticated user!');
      throw new Error('User not authenticated');
    }
    
    const userId = currentUser.uid;

    // Get user information for the post
    // Simplified for now, but you would normally fetch this from your user profile
    const username = currentUser.displayName || 'Anonymous';
    const userAvatar = currentUser.photoURL || '';
    console.log('🔄 PostService: Using username:', username);

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
      outfitItems: postData.outfitItems || [], // Add outfit items if provided
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(postRef, newPost);

    // Return the created post with its ID
    return {
      id: docRef.id,
      ...newPost,
      outfitItems: postData.outfitItems || [], // Ensure outfit items are included
      createdAt: Timestamp.now(), // Use current timestamp for the return value
    };
  } catch (error: unknown) {
    // Provide more detailed error information
    console.error('Error creating post:', error);
    
    // Extract specific error details if available
    let errorMessage = 'Failed to create post';
    
    // Type-safe handling of errors
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Check for Firebase Storage errors which might have a code property
    const firebaseError = error as { code?: string; serverResponse?: string };
    if (firebaseError.code && typeof firebaseError.code === 'string' && 
        firebaseError.code.startsWith('storage/')) {
      errorMessage = `Firebase Storage error: ${errorMessage}`;
    }
    
    // Create and throw enhanced error
    const enhancedError = new Error(errorMessage) as Error & { 
      code?: string; 
      serverResponse?: string 
    };
    
    // Copy additional properties if they exist
    if (firebaseError.code) enhancedError.code = firebaseError.code;
    if (firebaseError.serverResponse) enhancedError.serverResponse = firebaseError.serverResponse;
    
    throw enhancedError;
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
    // Use auth() as a function just like in createPost
    const currentUser = auth().currentUser;
    const currentUserId = userId || currentUser?.uid;
    
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
        outfitItems: data.outfitItems || [], // Include outfit items
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
        outfitItems: data.outfitItems || [], // Include outfit items
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