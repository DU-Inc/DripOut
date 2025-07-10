/**
 * Memory-First Caching Service
 * High-performance in-memory cache layer that sits above AsyncStorage
 * Provides instant access to frequently used data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  memoryUsage: number;
  totalEntries: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    memoryUsage: 0,
    totalEntries: 0
  };

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get data from cache with fallback to AsyncStorage
   */
  async get<T>(key: string, fallbackFn?: () => Promise<T>, ttl?: number): Promise<T | null> {
    const now = Date.now();
    
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && (now - memoryEntry.timestamp) < memoryEntry.ttl) {
      // Update access statistics
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = now;
      this.stats.hits++;
      
      console.log(`🎯 Memory cache HIT for: ${key}`);
      return memoryEntry.data;
    }

    // Memory cache miss - check AsyncStorage
    try {
      const asyncData = await AsyncStorage.getItem(key);
      if (asyncData) {
        const parsed = JSON.parse(asyncData);
        
        // Check if AsyncStorage data is still valid
        if (parsed.timestamp && ttl && (now - parsed.timestamp) < ttl) {
          // Store in memory cache for next time
          this.setMemory(key, parsed.data, ttl);
          this.stats.hits++;
          
          console.log(`💾 AsyncStorage cache HIT for: ${key}, promoted to memory`);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn(`Error reading from AsyncStorage for key ${key}:`, error);
    }

    // Both caches miss - use fallback function if provided
    if (fallbackFn) {
      try {
        const freshData = await fallbackFn();
        if (freshData !== null && freshData !== undefined) {
          // Store in both memory and AsyncStorage
          await this.set(key, freshData, ttl || 60 * 60 * 1000); // Default 1 hour TTL
          console.log(`🔄 Cache MISS for: ${key}, fetched fresh data`);
          return freshData;
        }
      } catch (error) {
        console.error(`Error in fallback function for key ${key}:`, error);
      }
    }

    this.stats.misses++;
    console.log(`❌ Cache MISS for: ${key}, no fallback available`);
    return null;
  }

  /**
   * Set data in both memory and AsyncStorage
   */
  async set<T>(key: string, data: T, ttl: number = 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    
    // Store in memory
    this.setMemory(key, data, ttl);
    
    // Store in AsyncStorage
    try {
      const asyncData = {
        data,
        timestamp: now,
        version: '1.0.0'
      };
      await AsyncStorage.setItem(key, JSON.stringify(asyncData));
      console.log(`💾 Stored in both memory and AsyncStorage: ${key}`);
    } catch (error) {
      console.warn(`Error storing to AsyncStorage for key ${key}:`, error);
    }
  }

  /**
   * Set data only in memory cache
   */
  private setMemory<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Remove entry from both memory and AsyncStorage
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Deleted from both caches: ${key}`);
    } catch (error) {
      console.warn(`Error deleting from AsyncStorage for key ${key}:`, error);
    }
    this.updateStats();
  }

  /**
   * Clear memory cache (keeps AsyncStorage)
   */
  clearMemory(): void {
    this.cache.clear();
    this.updateStats();
    console.log('🧹 Memory cache cleared');
  }

  /**
   * Clear both memory and AsyncStorage for keys matching pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    // Find matching keys in memory
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    // Delete from memory
    keysToDelete.forEach(key => this.cache.delete(key));

    // Delete from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchingKeys = allKeys.filter(key => key.includes(pattern));
      await AsyncStorage.multiRemove(matchingKeys);
      console.log(`🧹 Cleared ${keysToDelete.length} entries matching pattern: ${pattern}`);
    } catch (error) {
      console.warn(`Error clearing pattern ${pattern}:`, error);
    }

    this.updateStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
      this.updateStats();
    }
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Update internal statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    
    // Rough estimate of memory usage
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      try {
        memoryUsage += JSON.stringify(entry.data).length * 2; // Rough estimate (UTF-16)
      } catch {
        memoryUsage += 1000; // Fallback estimate
      }
    }
    this.stats.memoryUsage = memoryUsage;
  }

  /**
   * Preload data into cache
   */
  async preload<T>(key: string, dataLoader: () => Promise<T>, ttl?: number): Promise<void> {
    if (!this.cache.has(key)) {
      try {
        const data = await dataLoader();
        await this.set(key, data, ttl);
        console.log(`🔄 Preloaded data for: ${key}`);
      } catch (error) {
        console.warn(`Failed to preload data for ${key}:`, error);
      }
    }
  }
}

// Global instance
export const memoryCache = new MemoryCache(150); // Allow up to 150 entries

// Convenience functions for common cache keys
export const CacheKeys = {
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
  USER_POSTS: (userId: string) => `user_posts_${userId}`,
  FEED_POSTS: (userId: string) => `feed_posts_${userId}`,
  BRAND_DATA: 'brand_data',
  PRODUCT_INTERACTIONS: (userId: string) => `product_interactions_${userId}`,
  USER_PREFERENCES: (userId: string) => `user_preferences_${userId}`,
  CONVERSATIONS: (userId: string) => `conversations_${userId}`,
  SHELF_PRODUCTS: (userId: string) => `shelf_products_${userId}`,
};

// Export the class for specialized instances if needed
export { MemoryCache };