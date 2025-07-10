import { db, auth, Timestamp, FieldValue, firestore } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImageAndGetURL } from './storageService';

// Cache configuration
const FEED_POSTS_CACHE_KEY = '@DripOut:feedPosts';
const FEED_POSTS_TIMESTAMP_KEY = '@DripOut:feedPostsTimestamp';
const CACHE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const CURRENT_CACHE_VERSION = '1.0.0'; // For cache invalidation on app updates

/**
 * Interface for outfit item in a post
 */
export interface OutfitItem {
  name: string;
  brand: string;
  type?: 'shirt' | 'pants' | 'shoes' | 'watch' | 'jewelry' | 'accessory'; // Simplified type options
  affiliateLink?: string; // Optional affiliate link for purchasing the item
  scrapedProduct?: {
    id: string;
    name: string;
    brand?: string;
    price?: number;
    currency?: string;
    images: Array<{ url: string; id: string }>;
    description?: string;
    productUrl?: string;
    site?: string;
  }; // Scraped product data if available
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
  userDisplayName?: string; // Added display name field
  userAvatar?: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  outfitItems?: OutfitItem[]; // Featured clothing pieces
  likes: number;
  comments: number;
  createdAt: any; // Timestamp type - can be FirebaseFirestoreTypes.Timestamp or FieldValue
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
    let userDisplayName = '';
    let userAvatar = '';
    
    try {
      // Import getUserProfile to get the most up-to-date user info
      const { getUserProfile } = require('./firestoreService');
      const userProfile = await getUserProfile(userId);
      
      if (userProfile) {
        // Prefer Firestore username over displayName for consistency
        username = userProfile.username || currentUser.displayName || 'Anonymous';
        userDisplayName = userProfile.userDisplayName || userProfile.username || currentUser.displayName || 'Anonymous';
        userAvatar = userProfile.profilePictureURL || currentUser.photoURL || '';
      } else {
        // Fallback to Firebase Auth user info
        username = currentUser.displayName || 'Anonymous';
        userDisplayName = currentUser.displayName || 'Anonymous';
        userAvatar = currentUser.photoURL || '';
      }
    } catch (error) {
      console.error('Error fetching user profile for post, using fallback:', error);
      username = currentUser.displayName || 'Anonymous';
      userDisplayName = currentUser.displayName || 'Anonymous';
      userAvatar = currentUser.photoURL || '';
    }
    
    console.log('🔄 PostService: Using username:', username, 'and display name:', userDisplayName);

    // Upload the image to Firebase Storage
    const imageUrl = await uploadImageAndGetURL(
      postData.imageUri,
      'posts',
      undefined,
      onProgress
    );

    // Create the post document in Firestore
    const newPost = {
      userId,
      username,
      userDisplayName,
      userAvatar,
      imageUrl,
      caption: postData.caption,
      tags: postData.tags,
      outfitItems: postData.outfitItems || [], // Add outfit items if provided
      likes: 0,
      comments: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('posts').add(newPost);

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

    const querySnapshot = await db
      .collection('posts')
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'desc')
      .get();
    const posts: Post[] = [];

    querySnapshot.docs.forEach((doc) => {
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
    
    try {
      // Get real posts from Firestore
      const querySnapshot = await db
        .collection('posts')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      const posts: Post[] = [];

      console.log(`Fetched ${querySnapshot.size} posts from Firestore`);
      
      // Process each post document
      querySnapshot.docs.forEach((doc) => {
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
    } catch (firestoreError) {
      console.error('Error querying Firestore:', firestoreError);
      return [];
    }
  } catch (error) {
    console.error('Error getting all posts:', error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Validate cached posts data for corruption
 */
const validateCachedPosts = (posts: any): posts is Post[] => {
  if (!Array.isArray(posts)) return false;
  
  return posts.every(post => 
    post && 
    typeof post.id === 'string' &&
    typeof post.userId === 'string' &&
    typeof post.imageUrl === 'string' &&
    typeof post.caption === 'string' &&
    Array.isArray(post.tags) &&
    typeof post.likes === 'number' &&
    typeof post.comments === 'number'
  );
};

/**
 * Clear corrupted cache for a user
 */
const clearUserCache = async (userId: string): Promise<void> => {
  try {
    const userSpecificCacheKey = `${FEED_POSTS_CACHE_KEY}_${userId}`;
    const userSpecificTimestampKey = `${FEED_POSTS_TIMESTAMP_KEY}_${userId}`;
    const userSpecificVersionKey = `${FEED_POSTS_CACHE_KEY}_version_${userId}`;
    
    await AsyncStorage.multiRemove([
      userSpecificCacheKey,
      userSpecificTimestampKey,
      userSpecificVersionKey
    ]);
    
    console.log('Cleared corrupted cache for user:', userId);
  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
};

/**
 * Get all posts for the feed with improved caching
 * 
 * @param forceRefresh Whether to force a refresh from Firestore
 * @returns Array of all posts ordered by creation date
 */
export const getCachedFeedPosts = async (
  forceRefresh: boolean = false
): Promise<Post[]> => {
  try {
    console.log('getCachedFeedPosts called, forceRefresh:', forceRefresh);
    
    // Get current user ID for cache segregation
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('No authenticated user, fetching posts without cache');
      return await getAllPosts();
    }
    
    const userId = currentUser.uid;
    const userSpecificCacheKey = `${FEED_POSTS_CACHE_KEY}_${userId}`;
    const userSpecificTimestampKey = `${FEED_POSTS_TIMESTAMP_KEY}_${userId}`;
    const userSpecificVersionKey = `${FEED_POSTS_CACHE_KEY}_version_${userId}`;
    
    // Check if we need to force refresh
    if (forceRefresh) {
      console.log('Force refresh requested, bypassing cache');
      const posts = await getAllPosts();
      
      // Update cache with fresh data
      try {
        const cacheData = {
          posts,
          version: CURRENT_CACHE_VERSION,
          timestamp: Date.now()
        };
        
        await AsyncStorage.multiSet([
          [userSpecificCacheKey, JSON.stringify(cacheData)],
          [userSpecificTimestampKey, Date.now().toString()],
          [userSpecificVersionKey, CURRENT_CACHE_VERSION]
        ]);
        
        console.log(`Cached ${posts.length} posts for user ${userId}`);
      } catch (cacheError) {
        console.error('Error updating cache after force refresh:', cacheError);
      }
      
      return posts;
    }
    
    // Try to get cached data
    try {
      const [timestampStr, cachedDataStr, versionStr] = await AsyncStorage.multiGet([
        userSpecificTimestampKey,
        userSpecificCacheKey,
        userSpecificVersionKey
      ]);
      
      const timestamp = timestampStr[1] ? parseInt(timestampStr[1], 10) : 0;
      const cachedData = cachedDataStr[1];
      const version = versionStr[1];
      
      // Check if we have valid cache data
      if (cachedData && timestamp && version === CURRENT_CACHE_VERSION) {
        const currentTime = Date.now();
        
        // If cache is still fresh
        if (currentTime - timestamp < CACHE_MAX_AGE) {
          console.log('Checking cached posts validity...');
          
          try {
            const parsedCache = JSON.parse(cachedData);
            const posts = parsedCache.posts || parsedCache; // Handle both new and old cache formats
            
            // Validate cache structure
            if (validateCachedPosts(posts)) {
              console.log(`Using cached posts data (${posts.length} posts)`);
              return posts;
            } else {
              console.log('Cached posts data is corrupted, clearing cache');
              await clearUserCache(userId);
            }
          } catch (parseError) {
            console.error('Error parsing cached posts:', parseError);
            await clearUserCache(userId);
          }
        } else {
          console.log('Cache expired, fetching fresh data');
        }
      } else {
        console.log('Cache invalid or version mismatch, will fetch fresh data');
        if (version && version !== CURRENT_CACHE_VERSION) {
          await clearUserCache(userId);
        }
      }
    } catch (cacheRetrievalError) {
      console.error('Error retrieving cache:', cacheRetrievalError);
    }
    
    // Cache is expired, missing, or corrupted - fetch fresh data
    console.log('Fetching fresh posts data from Firestore');
    const posts = await getAllPosts();
    
    // Update cache with fresh data (fire and forget)
    AsyncStorage.multiSet([
      [userSpecificCacheKey, JSON.stringify({
        posts,
        version: CURRENT_CACHE_VERSION,
        timestamp: Date.now()
      })],
      [userSpecificTimestampKey, Date.now().toString()],
      [userSpecificVersionKey, CURRENT_CACHE_VERSION]
    ]).then(() => {
      console.log(`Successfully cached ${posts.length} posts for user ${userId}`);
    }).catch(cacheError => {
      console.error('Error caching posts:', cacheError);
    });
    
    return posts;
  } catch (error) {
    console.error('Error getting feed posts:', error);
    
    // Try to return cached data as fallback even if expired
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userSpecificCacheKey = `${FEED_POSTS_CACHE_KEY}_${currentUser.uid}`;
        const cachedData = await AsyncStorage.getItem(userSpecificCacheKey);
        
        if (cachedData) {
          const parsedCache = JSON.parse(cachedData);
          const posts = parsedCache.posts || parsedCache;
          
          if (validateCachedPosts(posts)) {
            console.log('Returning stale cached data due to error');
            return posts;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Error accessing fallback cache:', fallbackError);
    }
    
    // If all else fails, return empty array
    return [];
  }
};

/**
 * Updates all existing posts by a user when they update their profile information
 * This ensures that all posts display the current username, display name, and profile picture
 * 
 * @param userId - The user ID whose posts need to be updated
 * @param newUsername - The user's new username (optional)
 * @param newUserAvatar - The user's new profile picture URL (optional)
 * @param newUserDisplayName - The user's new display name (optional)
 * @returns Promise that resolves when the update is complete
 */
export const updatePostsWithNewProfileData = async (
  userId: string,
  newUsername?: string,
  newUserAvatar?: string,
  newUserDisplayName?: string
): Promise<void> => {
  if (!newUsername && !newUserAvatar && !newUserDisplayName) {
    console.log('No profile updates to propagate to posts');
    return;
  }
  
  try {
    console.log(`Updating existing posts for user ${userId} with new profile data`);
    
    // Query all posts by this user
    const postsSnapshot = await db
      .collection('posts')
      .where('userId', '==', userId)
      .get();
    console.log(`Found ${postsSnapshot.size} posts to update with new profile data`);
    
    if (postsSnapshot.empty) {
      console.log('No posts found to update');
      return;
    }
    
    // Create a batch to update all posts at once
    const batchSize = 500; // Firestore has a limit of 500 writes per batch
    let currentBatch = db.batch();
    let operationCount = 0;
    let totalUpdated = 0;
    
    postsSnapshot.docs.forEach((postDoc) => {
      const updateData: Record<string, any> = {};
      
      if (newUsername) updateData.username = newUsername;
      if (newUserAvatar) updateData.userAvatar = newUserAvatar;
      if (newUserDisplayName) updateData.userDisplayName = newUserDisplayName;
      
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
        currentBatch = db.batch();
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

/**
 * Get posts that feature products matching the given criteria
 * 
 * @param productName - The product name to search for (case-insensitive partial match)
 * @param brandName - Optional brand name to filter by
 * @param limitCount - Maximum number of posts to return (default: 20)
 * @returns Array of posts that feature matching products
 */
export const getPostsByProduct = async (
  productName?: string,
  brandName?: string,
  limitCount: number = 20
): Promise<Post[]> => {
  try {
    console.log(`Searching for posts with product: "${productName}", brand: "${brandName}"`);
    
    if (!productName && !brandName) {
      console.warn('No search criteria provided for product search');
      return [];
    }
    
    // Get all posts first (we'll filter client-side due to Firestore array query limitations)
    const querySnapshot = await db
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(200) // Get a larger sample to filter from
      .get();
    
    const matchingPosts: Post[] = [];
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const post: Post = {
        id: doc.id,
        userId: data.userId || 'unknown-user',
        username: data.username || 'anonymous',
        userDisplayName: data.userDisplayName,
        userAvatar: data.userAvatar,
        imageUrl: data.imageUrl,
        caption: data.caption || '',
        tags: data.tags || [],
        outfitItems: data.outfitItems || [],
        likes: data.likes || 0,
        comments: data.comments || 0,
        createdAt: data.createdAt,
      };
      
      // Check if this post has outfit items that match our search criteria
      if (post.outfitItems && post.outfitItems.length > 0) {
        const hasMatchingProduct = post.outfitItems.some((item: OutfitItem) => {
          let nameMatch = true;
          let brandMatch = true;
          
          // Check product name match (case-insensitive partial match)
          if (productName) {
            const itemName = item.name?.toLowerCase() || '';
            const scrapedName = item.scrapedProduct?.name?.toLowerCase() || '';
            const searchTerm = productName.toLowerCase();
            
            nameMatch = itemName.includes(searchTerm) || scrapedName.includes(searchTerm);
          }
          
          // Check brand name match (case-insensitive partial match)
          if (brandName) {
            const itemBrand = item.brand?.toLowerCase() || '';
            const scrapedBrand = item.scrapedProduct?.brand?.toLowerCase() || '';
            const searchBrand = brandName.toLowerCase();
            
            brandMatch = itemBrand.includes(searchBrand) || scrapedBrand.includes(searchBrand);
          }
          
          return nameMatch && brandMatch;
        });
        
        if (hasMatchingProduct) {
          matchingPosts.push(post);
        }
      }
    });
    
    // Limit results and return
    const limitedResults = matchingPosts.slice(0, limitCount);
    console.log(`Found ${limitedResults.length} posts matching product criteria`);
    
    return limitedResults;
  } catch (error) {
    console.error('Error searching posts by product:', error);
    return [];
  }
};

/**
 * Fetch posts for the feed - wrapper function for prefetch service compatibility
 * This function provides a consistent API for the tab prefetch service
 * 
 * @param forceRefresh Whether to force a refresh from Firestore (default: false)
 * @returns Array of posts for the feed
 */
export const fetchPosts = async (forceRefresh: boolean = false): Promise<Post[]> => {
  console.log('🔄 fetchPosts called with forceRefresh =', forceRefresh);
  return await getCachedFeedPosts(forceRefresh);
};