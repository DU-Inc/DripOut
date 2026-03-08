import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../Config/firebaseconfig';
import { getUserPreferences, UserPreferences, UserProfile } from './firestoreService';
import { getPostsByUser, Post } from './postService';
import { getFollowCounts } from './followService';

// Cache configuration
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days for most data
const POSTS_CACHE_EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days for posts
const BATCH_SIZE = 10; // For pagination

// Cache key generators
const getCacheKeys = (userId: string) => ({
  profile: `user_profile_cache_${userId}`,
  profileTimestamp: `user_profile_cache_timestamp_${userId}`,
  posts: `user_posts_cache_${userId}`,
  postsTimestamp: `user_posts_cache_timestamp_${userId}`,
  postsLastFetch: `user_posts_last_fetch_${userId}`, // New key for tracking last fetch
  preferences: `user_preferences_cache_${userId}`,
  preferencesTimestamp: `user_preferences_cache_timestamp_${userId}`,
  followCounts: `user_follow_counts_cache_${userId}`,
  followCountsTimestamp: `user_follow_counts_cache_timestamp_${userId}`,
  savedOutfits: `user_saved_outfits_cache_${userId}`,
  savedOutfitsTimestamp: `user_saved_outfits_cache_timestamp_${userId}`,
  favoriteProducts: `user_favorite_products_cache_${userId}`,
  favoriteProductsTimestamp: `user_favorite_products_cache_timestamp_${userId}`,
});

// Interfaces
interface SavedOutfit {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  products: any[];
  createdAt: any;
}

interface FavoritedProduct {
  id: string;
  userId: string;
  name: string;
  brand: string;
  price: number | string;
  imageUrl: string;
  favorited: any;
  url?: string;
  productId?: string | null;
  description?: string;
}

interface ProfileData {
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  posts: Post[];
  followCounts: { followers: number; following: number };
  savedOutfits: SavedOutfit[];
  favoriteProducts: FavoritedProduct[];
}

interface LoadingStates {
  profile: boolean;
  preferences: boolean;
  posts: boolean;
  followCounts: boolean;
  savedOutfits: boolean;
  favoriteProducts: boolean;
}

class ProfileOptimizationService {
  private static instance: ProfileOptimizationService;
  private postUpdateListeners: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): ProfileOptimizationService {
    if (!ProfileOptimizationService.instance) {
      ProfileOptimizationService.instance = new ProfileOptimizationService();
    }
    return ProfileOptimizationService.instance;
  }

  /**
   * Check if cached data is still valid
   */
  private async isCacheValid(timestampKey: string, isPostsCache: boolean = false): Promise<boolean> {
    try {
      const cachedTimestampStr = await AsyncStorage.getItem(timestampKey);
      if (!cachedTimestampStr) return false;
      
      const timestamp = parseInt(cachedTimestampStr, 10);
      const now = Date.now();
      const expiryTime = isPostsCache ? POSTS_CACHE_EXPIRY_TIME : CACHE_EXPIRY_TIME;
      
      return (now - timestamp) < expiryTime;
    } catch (error) {
      console.warn('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Check if posts need to be fetched based on conditions
   */
  private async shouldFetchPosts(userId: string, isRefresh: boolean = false): Promise<boolean> {
    if (isRefresh) return true; // Always fetch on manual refresh
    
    const cacheKeys = getCacheKeys(userId);
    try {
      const [lastFetchStr, postsStr] = await Promise.all([
        AsyncStorage.getItem(cacheKeys.postsLastFetch),
        AsyncStorage.getItem(cacheKeys.posts)
      ]);

      // Fetch if:
      // 1. No last fetch time (first app open)
      // 2. No cached posts
      // 3. Cache is invalid
      if (!lastFetchStr || !postsStr) return true;

      const lastFetch = parseInt(lastFetchStr, 10);
      const now = Date.now();
      
      // Check if cache is still valid
      const cacheValid = await this.isCacheValid(cacheKeys.postsTimestamp, true);
      if (!cacheValid) return true;

      return false;
    } catch (error) {
      console.warn('Error checking if posts should be fetched:', error);
      return true;
    }
  }

  /**
   * Subscribe to post updates
   */
  subscribeToPostUpdates(userId: string, callback: () => void): () => void {
    const key = `post_updates_${userId}`;
    this.postUpdateListeners.set(key, callback);
    return () => this.postUpdateListeners.delete(key);
  }

  /**
   * Notify listeners of post updates
   */
  private notifyPostUpdate(userId: string) {
    const key = `post_updates_${userId}`;
    const callback = this.postUpdateListeners.get(key);
    if (callback) callback();
  }

  /**
   * Handle new post creation
   */
  async handleNewPost(userId: string): Promise<void> {
    const cacheKeys = getCacheKeys(userId);
    
    try {
      // Fetch new posts from network
      const posts = await this.fetchPostsFromNetwork(userId);
      
      // Update cache
      const now = Date.now().toString();
      await this.batchCacheOperations([
        [cacheKeys.posts, JSON.stringify(posts)],
        [cacheKeys.postsTimestamp, now],
        [cacheKeys.postsLastFetch, now]
      ]);

      // Notify listeners
      this.notifyPostUpdate(userId);
    } catch (error) {
      console.error('Error handling new post:', error);
    }
  }

  /**
   * Batch cache operations for better performance
   */
  private async batchCacheOperations(operations: Array<[string, string]>): Promise<void> {
    try {
      await AsyncStorage.multiSet(operations);
    } catch (error) {
      console.warn('Error in batch cache operations:', error);
    }
  }

  /**
   * Load essential data first (profile and preferences)
   */
  async loadEssentialData(userId: string): Promise<{ profile: UserProfile | null; preferences: UserPreferences | null }> {
    const cacheKeys = getCacheKeys(userId);
    
    try {
      // Check cache for essential data
      const [profileValid, preferencesValid] = await Promise.all([
        this.isCacheValid(cacheKeys.profileTimestamp),
        this.isCacheValid(cacheKeys.preferencesTimestamp)
      ]);

      let profile: UserProfile | null = null;
      let preferences: UserPreferences | null = null;

      // Load from cache if valid
      if (profileValid || preferencesValid) {
        const cachePromises = [];
        
        if (profileValid) {
          cachePromises.push(AsyncStorage.getItem(cacheKeys.profile));
        } else {
          cachePromises.push(Promise.resolve(null));
        }
        
        if (preferencesValid) {
          cachePromises.push(AsyncStorage.getItem(cacheKeys.preferences));
        } else {
          cachePromises.push(Promise.resolve(null));
        }

        const [cachedProfile, cachedPreferences] = await Promise.all(cachePromises);
        
        if (cachedProfile) {
          profile = JSON.parse(cachedProfile);
        }
        
        if (cachedPreferences) {
          preferences = JSON.parse(cachedPreferences);
        }
      }

      // Fetch missing data from network
      const networkPromises = [];
      
      if (!profile) {
        networkPromises.push(this.fetchProfileFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(profile));
      }
      
      if (!preferences) {
        networkPromises.push(this.fetchPreferencesFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(preferences));
      }

      const [networkProfile, networkPreferences] = await Promise.all(networkPromises);
      
      // Update cache with new data
      const cacheOperations: Array<[string, string]> = [];
      const now = Date.now().toString();
      
      if (!profile && networkProfile) {
        profile = networkProfile;
        cacheOperations.push([cacheKeys.profile, JSON.stringify(networkProfile)]);
        cacheOperations.push([cacheKeys.profileTimestamp, now]);
      }
      
      if (!preferences && networkPreferences) {
        preferences = networkPreferences;
        cacheOperations.push([cacheKeys.preferences, JSON.stringify(networkPreferences)]);
        cacheOperations.push([cacheKeys.preferencesTimestamp, now]);
      }
      
      if (cacheOperations.length > 0) {
        await this.batchCacheOperations(cacheOperations);
      }

      return { profile, preferences };
    } catch (error) {
      console.error('Error loading essential data:', error);
      return { profile: null, preferences: null };
    }
  }

  /**
   * Load secondary data (posts, follows, outfits, products)
   */
  async loadSecondaryData(userId: string, isRefresh: boolean = false): Promise<Partial<ProfileData>> {
    const cacheKeys = getCacheKeys(userId);
    
    try {
      // Check if posts need to be fetched
      const shouldFetch = await this.shouldFetchPosts(userId, isRefresh);
      
      // Check cache validity for other secondary data
      const [followCountsValid, outfitsValid, productsValid] = await Promise.all([
        this.isCacheValid(cacheKeys.followCountsTimestamp),
        this.isCacheValid(cacheKeys.savedOutfitsTimestamp),
        this.isCacheValid(cacheKeys.favoriteProductsTimestamp)
      ]);

      // Load from cache where valid
      const cachePromises = [
        AsyncStorage.getItem(cacheKeys.posts),
        followCountsValid ? AsyncStorage.getItem(cacheKeys.followCounts) : Promise.resolve(null),
        outfitsValid ? AsyncStorage.getItem(cacheKeys.savedOutfits) : Promise.resolve(null),
        productsValid ? AsyncStorage.getItem(cacheKeys.favoriteProducts) : Promise.resolve(null)
      ];

      const [cachedPosts, cachedFollowCounts, cachedOutfits, cachedProducts] = await Promise.all(cachePromises);

      // Parse cached data
      let posts: Post[] = cachedPosts ? JSON.parse(cachedPosts) : [];
      let followCounts = cachedFollowCounts ? JSON.parse(cachedFollowCounts) : { followers: 0, following: 0 };
      let savedOutfits: SavedOutfit[] = cachedOutfits ? JSON.parse(cachedOutfits) : [];
      let favoriteProducts: FavoritedProduct[] = cachedProducts ? JSON.parse(cachedProducts) : [];

      // Fetch missing data from network
      const networkPromises = [];
      
      if (shouldFetch) {
        networkPromises.push(this.fetchPostsFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(posts));
      }
      
      if (!followCountsValid) {
        networkPromises.push(this.fetchFollowCountsFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(followCounts));
      }
      
      if (!outfitsValid) {
        networkPromises.push(this.fetchSavedOutfitsFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(savedOutfits));
      }
      
      if (!productsValid) {
        networkPromises.push(this.fetchFavoriteProductsFromNetwork(userId));
      } else {
        networkPromises.push(Promise.resolve(favoriteProducts));
      }

      const [networkPosts, networkFollowCounts, networkOutfits, networkProducts] = await Promise.all(networkPromises);

      // Update with network data and cache
      const cacheOperations: Array<[string, string]> = [];
      const now = Date.now().toString();

      if (shouldFetch && networkPosts) {
        posts = networkPosts;
        cacheOperations.push([cacheKeys.posts, JSON.stringify(networkPosts)]);
        cacheOperations.push([cacheKeys.postsTimestamp, now]);
        cacheOperations.push([cacheKeys.postsLastFetch, now]);
      }

      if (!followCountsValid && networkFollowCounts) {
        followCounts = networkFollowCounts;
        cacheOperations.push([cacheKeys.followCounts, JSON.stringify(networkFollowCounts)]);
        cacheOperations.push([cacheKeys.followCountsTimestamp, now]);
      }

      if (!outfitsValid && networkOutfits) {
        savedOutfits = networkOutfits;
        cacheOperations.push([cacheKeys.savedOutfits, JSON.stringify(networkOutfits)]);
        cacheOperations.push([cacheKeys.savedOutfitsTimestamp, now]);
      }

      if (!productsValid && networkProducts) {
        favoriteProducts = networkProducts;
        cacheOperations.push([cacheKeys.favoriteProducts, JSON.stringify(networkProducts)]);
        cacheOperations.push([cacheKeys.favoriteProductsTimestamp, now]);
      }

      if (cacheOperations.length > 0) {
        await this.batchCacheOperations(cacheOperations);
      }

      return {
        posts,
        followCounts,
        savedOutfits,
        favoriteProducts
      };
    } catch (error) {
      console.error('Error loading secondary data:', error);
      return {};
    }
  }

  /**
   * Clear all cache for a user
   */
  async clearUserCache(userId: string): Promise<void> {
    const cacheKeys = getCacheKeys(userId);
    const keysToRemove = Object.values(cacheKeys);
    
    try {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Cache cleared for user ${userId}`);
    } catch (error) {
      console.warn('Error clearing user cache:', error);
    }
  }

  /**
   * Force refresh all data
   */
  async forceRefreshAllData(userId: string): Promise<ProfileData> {
    try {
      // Clear cache first
      await this.clearUserCache(userId);
      
      // Fetch all data from network
      const [
        profile,
        preferences,
        posts,
        followCounts,
        savedOutfits,
        favoriteProducts
      ] = await Promise.all([
        this.fetchProfileFromNetwork(userId),
        this.fetchPreferencesFromNetwork(userId),
        this.fetchPostsFromNetwork(userId),
        this.fetchFollowCountsFromNetwork(userId),
        this.fetchSavedOutfitsFromNetwork(userId),
        this.fetchFavoriteProductsFromNetwork(userId)
      ]);

      // Cache all data
      const cacheKeys = getCacheKeys(userId);
      const now = Date.now().toString();
      
      const cacheOperations: Array<[string, string]> = [
        [cacheKeys.profile, JSON.stringify(profile)],
        [cacheKeys.profileTimestamp, now],
        [cacheKeys.preferences, JSON.stringify(preferences)],
        [cacheKeys.preferencesTimestamp, now],
        [cacheKeys.posts, JSON.stringify(posts)],
        [cacheKeys.postsTimestamp, now],
        [cacheKeys.followCounts, JSON.stringify(followCounts)],
        [cacheKeys.followCountsTimestamp, now],
        [cacheKeys.savedOutfits, JSON.stringify(savedOutfits)],
        [cacheKeys.savedOutfitsTimestamp, now],
        [cacheKeys.favoriteProducts, JSON.stringify(favoriteProducts)],
        [cacheKeys.favoriteProductsTimestamp, now]
      ];

      await this.batchCacheOperations(cacheOperations);

      return {
        profile,
        preferences,
        posts,
        followCounts,
        savedOutfits,
        favoriteProducts
      };
    } catch (error) {
      console.error('Error force refreshing data:', error);
      throw error;
    }
  }

  // Private network fetch methods
  private async fetchProfileFromNetwork(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as UserProfile;
        // Convert Firestore Timestamp to Date if needed
        if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
          userData.createdAt = userData.createdAt.toDate();
        }
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile from network:', error);
      return null;
    }
  }

  private async fetchPreferencesFromNetwork(userId: string): Promise<UserPreferences | null> {
    try {
      return await getUserPreferences(userId);
    } catch (error) {
      console.error('Error fetching preferences from network:', error);
      return null;
    }
  }

  private async fetchPostsFromNetwork(userId: string): Promise<Post[]> {
    try {
      return await getPostsByUser(userId);
    } catch (error) {
      console.error('Error fetching posts from network:', error);
      return [];
    }
  }

  private async fetchFollowCountsFromNetwork(userId: string): Promise<{ followers: number; following: number }> {
    try {
      return await getFollowCounts(userId);
    } catch (error) {
      console.error('Error fetching follow counts from network:', error);
      return { followers: 0, following: 0 };
    }
  }

  private async fetchSavedOutfitsFromNetwork(userId: string): Promise<SavedOutfit[]> {
    try {
      const outfitsSnapshot = await db
        .collection("saved_outfits")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      
      if (outfitsSnapshot.empty) {
        return [];
      }

      return outfitsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Saved Outfit",
          imageUrl: data.imageUrl,
          products: data.products || [],
          createdAt: data.createdAt
        };
      });
    } catch (error) {
      console.error('Error fetching saved outfits from network:', error);
      return [];
    }
  }

  private async fetchFavoriteProductsFromNetwork(userId: string): Promise<FavoritedProduct[]> {
    try {
      const productsSnapshot = await db
        .collection("favorited_products")
        .where("userId", "==", userId)
        .orderBy("favorited", "desc")
        .limit(10)
        .get();
      
      if (productsSnapshot.empty) {
        return [];
      }

      return productsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Product",
          brand: data.brand || "Unknown",
          price: data.price || 0,
          imageUrl: data.imageUrl || '',
          favorited: data.favorited,
          url: data.url,
          productId: data.productId,
          description: data.description
        };
      });
    } catch (error) {
      console.error('Error fetching favorite products from network:', error);
      return [];
    }
  }
}

export const profileOptimizationService = ProfileOptimizationService.getInstance();
export type { ProfileData, LoadingStates, SavedOutfit, FavoritedProduct }; 