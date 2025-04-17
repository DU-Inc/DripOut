import { db, auth } from '../Config/firebaseconfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp, limit, writeBatch, updateDoc, doc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImageAndGetURL } from './storageService';

/**
 * Interface for outfit item in a post
 */
export interface OutfitItem {
  name: string;
  brand: string;
  type?: 'shirt' | 'pants' | 'shoes' | 'watch' | 'jewelry' | 'accessory'; // Simplified type options
  affiliateLink?: string; // Optional affiliate link for purchasing the item
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
    // Correctly access the current user 
    console.log('🔄 PostService: Accessing auth()...');
    const authInstance = auth();
    console.log('🔄 PostService: Got auth instance, retrieving currentUser...');
    const currentUser = authInstance.currentUser;
    console.log('🔄 PostService: Current user:', currentUser?.uid || 'none', 
                'Authenticated:', currentUser !== null);
    
    if (!currentUser) {
      console.error('🔄 PostService: No authenticated user!');
      throw new Error('User not authenticated');
    }
    
    const userId = currentUser.uid;

    // Get user information for the post
    // Try to get username from Firestore profile first, then fallback to displayName
    let username = 'Anonymous';
    let userAvatar = '';
    
    try {
      // Import getUserProfile to get the most up-to-date user info
      const { getUserProfile } = require('./firestoreService');
      const userProfile = await getUserProfile(userId);
      
      if (userProfile) {
        // Prefer Firestore username over displayName for consistency
        username = userProfile.username || currentUser.displayName || 'Anonymous';
        userAvatar = userProfile.profilePictureURL || currentUser.photoURL || '';
      } else {
        // Fallback to Firebase Auth user info
        username = currentUser.displayName || 'Anonymous';
        userAvatar = currentUser.photoURL || '';
      }
    } catch (error) {
      console.error('Error fetching user profile for post, using fallback:', error);
      username = currentUser.displayName || 'Anonymous';
      userAvatar = currentUser.photoURL || '';
    }
    
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
    
    // Try to check auth state again to provide better error messages
    try {
      const reCheckAuth = auth();
      console.log('🔄 PostService ERROR CHECK: Auth re-check:', 
                 'Auth instance:', !!reCheckAuth,
                 'Current user:', reCheckAuth?.currentUser?.uid || 'none');
    } catch (authCheckError) {
      console.error('🔄 PostService: Error while re-checking auth:', authCheckError);
    }
    
    // Type-safe handling of errors
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Check for Firebase Storage errors which might have a code property
    const firebaseError = error as { code?: string; serverResponse?: string };
    if (firebaseError.code && typeof firebaseError.code === 'string') {
      if (firebaseError.code.startsWith('storage/')) {
        errorMessage = `Firebase Storage error: ${errorMessage}`;
      } else if (firebaseError.code.startsWith('auth/')) {
        errorMessage = `Authentication error: ${errorMessage}`;
      }
    }
    
    // Create and throw enhanced error
    const enhancedError = new Error(errorMessage) as Error & { 
      code?: string; 
      serverResponse?: string,
      authStatus?: string
    };
    
    // Add auth status to error for better debugging
    enhancedError.authStatus = `Auth check: ${!!auth()}, User: ${auth().currentUser?.uid || 'none'}`;
    
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
    // Properly call auth() to get currentUser
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
 * @param limitCount Optional number of posts to limit the query to
 * @returns Array of all posts ordered by creation date
 */
export const getAllPosts = async (limitCount: number = 20): Promise<Post[]> => {
  try {
    console.log(`Fetching all posts with limit ${limitCount}`);
    
    // Check if Firestore is initialized
    if (!db) {
      console.error('Firestore not initialized');
      return [];
    }
    
    // Create mock posts if no real posts exist yet - TO REMOVE IN PRODUCTION
    const mockPosts: Post[] = [];
    for (let i = 0; i < 5; i++) {
      mockPosts.push({
        id: `mock-${i}`,
        userId: `mock-user-${i}`,
        username: `user_${i}`,
        userAvatar: `https://i.pravatar.cc/150?u=${i}`,
        imageUrl: `https://picsum.photos/800/1000?random=${i * 3 + 51}`,
        caption: `This is a sample post #${i} to demonstrate the app's functionality.`,
        tags: ['sample', 'demo', 'fashion'],
        outfitItems: [
          {name: 'Sample Shirt', brand: 'Demo Brand'},
          {name: 'Sample Pants', brand: 'Test Brand'}
        ],
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        createdAt: Timestamp.now(),
      });
    }
    
    try {
      // Try to get real posts from Firestore first
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(postsQuery);
      const posts: Post[] = [];

      console.log(`Fetched ${querySnapshot.size} posts from Firestore`);
      
      if (querySnapshot.size > 0) {
        // Process each post document
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Post data:', JSON.stringify(data, null, 2));
          posts.push({
            id: doc.id,
            userId: data.userId || 'unknown-user',
            username: data.username || 'anonymous',
            userAvatar: data.userAvatar,
            imageUrl: data.imageUrl,
            caption: data.caption || 'No caption',
            tags: data.tags || [], // Ensure tags exists even if missing in Firestore
            outfitItems: data.outfitItems || [], // Include outfit items
            likes: data.likes || 0,
            comments: data.comments || 0,
            createdAt: data.createdAt,
          });
        });
        return posts;
      } else {
        // If no posts in Firestore, return mock posts
        console.log('No posts found in Firestore, returning mock posts');
        return mockPosts;
      }
    } catch (firestoreError) {
      console.error('Error querying Firestore:', firestoreError);
      // Return mock posts on error
      console.log('Returning mock posts due to Firestore error');
      return mockPosts;
    }
  } catch (error) {
    console.error('Error getting all posts:', error);
    return []; // Return empty array instead of throwing
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
    console.log('getCachedFeedPosts called, forceRefresh:', forceRefresh);
    
    // Try to get posts directly - bypass complexity for now
    return await getAllPosts();
    
    /* Commenting out complex caching logic until core functionality works
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
    */
  } catch (error) {
    console.error('Error getting feed posts:', error);
    
    // If all else fails, return an empty array or mock data
    return []; // Or return mock posts if you want to show something
  }
};

/**
 * Updates all existing posts by a user when they update their profile information
 * This ensures that all posts display the current username and profile picture
 * 
 * @param userId - The user ID whose posts need to be updated
 * @param newUsername - The user's new username (optional)
 * @param newUserAvatar - The user's new profile picture URL (optional)
 * @returns Promise that resolves when the update is complete
 */
export const updatePostsWithNewProfileData = async (
  userId: string,
  newUsername?: string,
  newUserAvatar?: string
): Promise<void> => {
  if (!newUsername && !newUserAvatar) {
    console.log('No profile updates to propagate to posts');
    return;
  }
  
  try {
    console.log(`Updating existing posts for user ${userId} with new profile data`);
    
    // Query all posts by this user
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    console.log(`Found ${postsSnapshot.size} posts to update with new profile data`);
    
    if (postsSnapshot.empty) {
      console.log('No posts found to update');
      return;
    }
    
    // Create a batch to update all posts at once
    const batchSize = 500; // Firestore has a limit of 500 writes per batch
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalUpdated = 0;
    
    postsSnapshot.forEach((postDoc) => {
      const updateData: Record<string, any> = {};
      
      if (newUsername) updateData.username = newUsername;
      if (newUserAvatar) updateData.userAvatar = newUserAvatar;
      
      // Update the post document
      currentBatch.update(postDoc.ref, updateData);
      operationCount++;
      totalUpdated++;
      
      // If we've reached the batch limit, commit this batch and start a new one
      if (operationCount >= batchSize) {
        currentBatch.commit().then(() => {
          console.log(`Committed batch of ${operationCount} post updates`);
        });
        
        // Reset batch and counter
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Commit any remaining operations in the final batch
    if (operationCount > 0) {
      await currentBatch.commit();
      console.log(`Committed final batch of ${operationCount} post updates`);
    }
    
    console.log(`Successfully updated ${totalUpdated} posts with new profile data`);
  } catch (error) {
    console.error('Error updating posts with new profile data:', error);
    throw error;
  }
};