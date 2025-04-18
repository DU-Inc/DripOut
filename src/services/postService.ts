import { db, auth } from '../Config/firebaseconfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp, limit } from 'firebase/firestore';
import { uploadImageAndGetURL } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * @param limit Optional number of posts to limit the query to
 * @returns Array of all posts ordered by creation date
 */
export const getAllPosts = async (limitCount: number = 20): Promise<Post[]> => {
  try {
    console.log(`Fetching all posts with limit ${limitCount}`);
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(postsQuery);
    const posts: Post[] = [];

    console.log(`Fetched ${querySnapshot.size} posts from Firestore`);

    // Process each post document
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        userId: data.userId,
        username: data.username,
        userAvatar: data.userAvatar,
        imageUrl: data.imageUrl,
        caption: data.caption,
        tags: data.tags || [], // Ensure tags exists even if missing in Firestore
        outfitItems: data.outfitItems || [], // Include outfit items
        likes: data.likes || 0,
        comments: data.comments || 0,
        createdAt: data.createdAt,
      });
    });

    return posts;
  } catch (error) {
    console.error('Error getting all posts:', error);
    throw error;
  }
};

/**
 * Cache key for storing feed posts in AsyncStorage
 */
const FEED_POSTS_CACHE_KEY = 'feed_posts_cache';
const FEED_POSTS_TIMESTAMP_KEY = 'feed_posts_cache_timestamp';

/**
 * Get all posts for the feed with caching
 * 
 * @param forceRefresh Whether to force a refresh from Firestore
 * @param cacheMaxAge Maximum age of cache in milliseconds (default 5 minutes)
 * @returns Array of all posts ordered by creation date
 */
export const getCachedFeedPosts = async (
  forceRefresh: boolean = false,
  cacheMaxAge: number = 5 * 60 * 1000 // 5 minutes
): Promise<Post[]> => {
  try {
    // Get current user ID for cache segregation
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user, fetching posts without cache');
      return getAllPosts();
    }
    
    const userId = currentUser.uid;
    const userSpecificCacheKey = `${FEED_POSTS_CACHE_KEY}_${userId}`;
    const userSpecificTimestampKey = `${FEED_POSTS_TIMESTAMP_KEY}_${userId}`;
    
    // Check if we need to force refresh
    if (forceRefresh) {
      console.log('Force refresh requested, bypassing cache');
      const posts = await getAllPosts();
      
      // Update cache with fresh data
      await AsyncStorage.setItem(userSpecificCacheKey, JSON.stringify(posts));
      await AsyncStorage.setItem(userSpecificTimestampKey, Date.now().toString());
      
      return posts;
    }
    
    // Check cache timestamp
    const timestampStr = await AsyncStorage.getItem(userSpecificTimestampKey);
    const cachedPostsStr = await AsyncStorage.getItem(userSpecificCacheKey);
    
    // If we have valid cache data and it's not too old
    if (timestampStr && cachedPostsStr) {
      const timestamp = parseInt(timestampStr, 10);
      const currentTime = Date.now();
      
      // If cache is still fresh
      if (currentTime - timestamp < cacheMaxAge) {
        console.log('Using cached posts data');
        return JSON.parse(cachedPostsStr) as Post[];
      }
    }
    
    // Cache is too old or doesn't exist, fetch fresh data
    console.log('Cache expired or missing, fetching fresh posts data');
    const posts = await getAllPosts();
    
    // Update cache with fresh data
    await AsyncStorage.setItem(userSpecificCacheKey, JSON.stringify(posts));
    await AsyncStorage.setItem(userSpecificTimestampKey, Date.now().toString());
    
    return posts;
  } catch (error) {
    console.error('Error getting cached feed posts:', error);
    
    // Try to return cached data even if refresh failed
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userId = currentUser.uid;
        const userSpecificCacheKey = `${FEED_POSTS_CACHE_KEY}_${userId}`;
        const cachedPostsStr = await AsyncStorage.getItem(userSpecificCacheKey);
        
        if (cachedPostsStr) {
          console.log('Returning cached posts due to refresh error');
          return JSON.parse(cachedPostsStr) as Post[];
        }
      }
    } catch (cacheError) {
      console.error('Error reading cached data as fallback:', cacheError);
    }
    
    // If all else fails, throw the original error
    throw error;
  }
};