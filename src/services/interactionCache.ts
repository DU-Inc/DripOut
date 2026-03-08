// src/services/interactionCache.ts
// Cache user interactions to reduce API calls and improve performance

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';

// Cache configuration
const LIKES_CACHE_KEY = '@DripOut:userLikes';
const SAVES_CACHE_KEY = '@DripOut:userSaves';
const FOLLOWS_CACHE_KEY = '@DripOut:userFollows';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes
const CURRENT_CACHE_VERSION = '1.0.0';

// Cache data structure
interface InteractionCache {
  data: Set<string>; // Set of post/user IDs
  timestamp: number;
  version: string;
}

// Convert Set to Array for JSON serialization
const serializeCache = (cache: InteractionCache): string => {
  return JSON.stringify({
    data: Array.from(cache.data),
    timestamp: cache.timestamp,
    version: cache.version
  });
};

// Convert Array back to Set after JSON parsing
const deserializeCache = (cacheStr: string): InteractionCache | null => {
  try {
    const parsed = JSON.parse(cacheStr);
    if (parsed && Array.isArray(parsed.data) && parsed.timestamp && parsed.version) {
      return {
        data: new Set(parsed.data),
        timestamp: parsed.timestamp,
        version: parsed.version
      };
    }
  } catch (error) {
    console.error('Error deserializing cache:', error);
  }
  return null;
};

// Validate cache freshness and version
const isCacheValid = (cache: InteractionCache): boolean => {
  const now = Date.now();
  return cache.version === CURRENT_CACHE_VERSION && 
         (now - cache.timestamp) < CACHE_MAX_AGE;
};

// Get user-specific cache key
const getUserCacheKey = (baseKey: string, userId: string): string => {
  return `${baseKey}_${userId}`;
};

// Clear cache for a specific user and type
const clearUserCache = async (cacheKey: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(cacheKey);
    console.log('Cleared interaction cache:', cacheKey);
  } catch (error) {
    console.error('Error clearing interaction cache:', cacheKey, error);
  }
};

/**
 * Get cached interactions for current user
 */
const getCachedInteractions = async (baseKey: string): Promise<Set<string>> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return new Set();
    }

    const cacheKey = getUserCacheKey(baseKey, currentUser.uid);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cache = deserializeCache(cachedData);
      
      if (cache && isCacheValid(cache)) {
        console.log(`Using cached interactions from ${baseKey} (${cache.data.size} items)`);
        return cache.data;
      } else {
        console.log(`Cache invalid for ${baseKey}, clearing`);
        await clearUserCache(cacheKey);
      }
    }
  } catch (error) {
    console.error('Error getting cached interactions:', baseKey, error);
  }
  
  return new Set();
};

/**
 * Update cached interactions for current user
 */
const updateCachedInteractions = async (baseKey: string, interactions: Set<string>): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return;
    }

    const cacheKey = getUserCacheKey(baseKey, currentUser.uid);
    const cache: InteractionCache = {
      data: interactions,
      timestamp: Date.now(),
      version: CURRENT_CACHE_VERSION
    };

    await AsyncStorage.setItem(cacheKey, serializeCache(cache));
    console.log(`Updated ${baseKey} cache with ${interactions.size} items`);
  } catch (error) {
    console.error('Error updating cached interactions:', baseKey, error);
  }
};

// ===== LIKES CACHE =====

/**
 * Get cached user likes
 */
export const getCachedLikes = async (): Promise<Set<string>> => {
  return getCachedInteractions(LIKES_CACHE_KEY);
};

/**
 * Check if user has liked a post (from cache)
 */
export const hasCachedLike = async (postId: string): Promise<boolean | null> => {
  try {
    const likes = await getCachedLikes();
    if (likes.size > 0) {
      return likes.has(postId);
    }
  } catch (error) {
    console.error('Error checking cached like:', error);
  }
  return null; // Cache miss or error
};

/**
 * Update like status in cache
 */
export const updateLikeCache = async (postId: string, isLiked: boolean): Promise<void> => {
  try {
    const likes = await getCachedLikes();
    
    if (isLiked) {
      likes.add(postId);
    } else {
      likes.delete(postId);
    }
    
    await updateCachedInteractions(LIKES_CACHE_KEY, likes);
  } catch (error) {
    console.error('Error updating like cache:', error);
  }
};

/**
 * Batch update likes cache
 */
export const batchUpdateLikesCache = async (likedPostIds: string[]): Promise<void> => {
  try {
    const likes = new Set(likedPostIds);
    await updateCachedInteractions(LIKES_CACHE_KEY, likes);
  } catch (error) {
    console.error('Error batch updating likes cache:', error);
  }
};

// ===== SAVES CACHE =====

/**
 * Get cached user saves
 */
export const getCachedSaves = async (): Promise<Set<string>> => {
  return getCachedInteractions(SAVES_CACHE_KEY);
};

/**
 * Check if user has saved a post (from cache)
 */
export const hasCachedSave = async (postId: string): Promise<boolean | null> => {
  try {
    const saves = await getCachedSaves();
    if (saves.size > 0) {
      return saves.has(postId);
    }
  } catch (error) {
    console.error('Error checking cached save:', error);
  }
  return null; // Cache miss or error
};

/**
 * Update save status in cache
 */
export const updateSaveCache = async (postId: string, isSaved: boolean): Promise<void> => {
  try {
    const saves = await getCachedSaves();
    
    if (isSaved) {
      saves.add(postId);
    } else {
      saves.delete(postId);
    }
    
    await updateCachedInteractions(SAVES_CACHE_KEY, saves);
  } catch (error) {
    console.error('Error updating save cache:', error);
  }
};

/**
 * Batch update saves cache
 */
export const batchUpdateSavesCache = async (savedPostIds: string[]): Promise<void> => {
  try {
    const saves = new Set(savedPostIds);
    await updateCachedInteractions(SAVES_CACHE_KEY, saves);
  } catch (error) {
    console.error('Error batch updating saves cache:', error);
  }
};

// ===== FOLLOWS CACHE =====

/**
 * Get cached user follows
 */
export const getCachedFollows = async (): Promise<Set<string>> => {
  return getCachedInteractions(FOLLOWS_CACHE_KEY);
};

/**
 * Check if user is following someone (from cache)
 */
export const hasCachedFollow = async (userId: string): Promise<boolean | null> => {
  try {
    const follows = await getCachedFollows();
    if (follows.size > 0) {
      return follows.has(userId);
    }
  } catch (error) {
    console.error('Error checking cached follow:', error);
  }
  return null; // Cache miss or error
};

/**
 * Update follow status in cache
 */
export const updateFollowCache = async (userId: string, isFollowing: boolean): Promise<void> => {
  try {
    const follows = await getCachedFollows();
    
    if (isFollowing) {
      follows.add(userId);
    } else {
      follows.delete(userId);
    }
    
    await updateCachedInteractions(FOLLOWS_CACHE_KEY, follows);
  } catch (error) {
    console.error('Error updating follow cache:', error);
  }
};

/**
 * Batch update follows cache
 */
export const batchUpdateFollowsCache = async (followedUserIds: string[]): Promise<void> => {
  try {
    const follows = new Set(followedUserIds);
    await updateCachedInteractions(FOLLOWS_CACHE_KEY, follows);
  } catch (error) {
    console.error('Error batch updating follows cache:', error);
  }
};

// ===== CACHE MANAGEMENT =====

/**
 * Clear all interaction caches for current user
 */
export const clearAllInteractionCaches = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return;
    }

    const cacheKeys = [
      getUserCacheKey(LIKES_CACHE_KEY, currentUser.uid),
      getUserCacheKey(SAVES_CACHE_KEY, currentUser.uid),
      getUserCacheKey(FOLLOWS_CACHE_KEY, currentUser.uid)
    ];

    await AsyncStorage.multiRemove(cacheKeys);
    console.log('Cleared all interaction caches for user:', currentUser.uid);
  } catch (error) {
    console.error('Error clearing all interaction caches:', error);
  }
};

/**
 * Get cache statistics for debugging
 */
export const getInteractionCacheStats = async (): Promise<{
  likes: number;
  saves: number;
  follows: number;
}> => {
  try {
    const [likes, saves, follows] = await Promise.all([
      getCachedLikes(),
      getCachedSaves(), 
      getCachedFollows()
    ]);

    return {
      likes: likes.size,
      saves: saves.size,
      follows: follows.size
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { likes: 0, saves: 0, follows: 0 };
  }
}; 