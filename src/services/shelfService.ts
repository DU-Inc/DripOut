// src/services/shelfService.ts
// Service for managing user's product shelf/hanger functionality

import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { auth } from '../Config/firebaseconfig';
import { logger } from '../utils/logger';

// Cache configuration - Optimized for performance
const SHELF_CACHE_KEY = '@DripOut:shelf';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days (increased from 24h - user saved items are stable)
const CURRENT_CACHE_VERSION = '1.0.0';

// Shelf product interface
export interface ShelfProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  currency?: string;
  images: {
    id: string;
    url: string;
  }[];
  productUrl?: string;
  addedAt: number; // timestamp when added to shelf
  source: 'overview' | 'product_detail' | 'recommendation'; // where it was added from
}

// Cache structure
interface ShelfCache {
  products: ShelfProduct[];
  timestamp: number;
  version: string;
  userId: string;
}

// User-specific cache key
const getUserSpecificCacheKey = (userId: string): string => {
  return `${SHELF_CACHE_KEY}_${userId}`;
};

// Validate cache structure and freshness
const isCacheValid = (cache: ShelfCache, userId: string): boolean => {
  const now = Date.now();
  return cache && 
         cache.version === CURRENT_CACHE_VERSION &&
         cache.userId === userId &&
         Array.isArray(cache.products) &&
         (now - cache.timestamp) < CACHE_TTL;
};

// Get cached shelf products
const getCachedShelfProducts = async (userId: string): Promise<ShelfProduct[]> => {
  try {
    const cacheKey = getUserSpecificCacheKey(userId);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cache: ShelfCache = JSON.parse(cachedData);
      
      if (isCacheValid(cache, userId)) {
        logger.log(`Using cached shelf products (${cache.products.length} items)`);
        return cache.products;
      } else {
        logger.log('Shelf cache invalid or expired, clearing');
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    logger.error('Error getting cached shelf products:', error);
  }
  
  return [];
};

// Update cached shelf products
const updateCachedShelfProducts = async (products: ShelfProduct[], userId: string): Promise<void> => {
  try {
    const cacheKey = getUserSpecificCacheKey(userId);
    const cache: ShelfCache = {
      products,
      timestamp: Date.now(),
      version: CURRENT_CACHE_VERSION,
      userId
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    logger.log(`Successfully updated shelf cache with ${products.length} products`);
  } catch (error) {
    logger.error('Error updating shelf cache:', error);
  }
};

// Sync shelf products with Firestore
const syncShelfWithFirestore = async (products: ShelfProduct[], userId: string): Promise<void> => {
  try {
    const userShelfRef = firestore().collection('user_shelves').doc(userId);
    
    await userShelfRef.set({
      products,
      lastUpdated: firestore.FieldValue.serverTimestamp(),
      version: CURRENT_CACHE_VERSION
    }, { merge: true });
    
    logger.log('Successfully synced shelf with Firestore');
  } catch (error) {
    logger.error('Error syncing shelf with Firestore:', error);
    // Don't throw - shelf should work offline
  }
};

// Load shelf products from Firestore
const loadShelfFromFirestore = async (userId: string): Promise<ShelfProduct[]> => {
  try {
    const userShelfRef = firestore().collection('user_shelves').doc(userId);
    const doc = await userShelfRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      if (data && Array.isArray(data.products)) {
        logger.log(`Loaded ${data.products.length} shelf products from Firestore`);
        return data.products;
      }
    }
  } catch (error) {
    logger.error('Error loading shelf from Firestore:', error);
  }
  
  return [];
};

/**
 * Get all products in user's shelf
 */
export const getShelfProducts = async (forceRefresh = false): Promise<ShelfProduct[]> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    logger.warn('No authenticated user - cannot get shelf products');
    return [];
  }

  const userId = currentUser.uid;

  // Check cache first unless force refresh
  if (!forceRefresh) {
    const cachedProducts = await getCachedShelfProducts(userId);
    if (cachedProducts.length > 0) {
      return cachedProducts;
    }
  }

  // Cache miss or force refresh - load from Firestore
  logger.log('Loading shelf products from Firestore');
  try {
    const firestoreProducts = await loadShelfFromFirestore(userId);
    
    // Update cache with Firestore data
    await updateCachedShelfProducts(firestoreProducts, userId);
    
    return firestoreProducts;
  } catch (error) {
    logger.error('Error loading shelf products:', error);
    
    // Fallback to cache even if expired
    const staleCache = await getCachedShelfProducts(userId);
    return staleCache;
  }
};

/**
 * Add a product to the shelf
 */
export const addToShelf = async (product: Omit<ShelfProduct, 'addedAt' | 'source'>, source: ShelfProduct['source'] = 'overview'): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    logger.warn('No authenticated user - cannot add to shelf');
    return false;
  }

  try {
    const userId = currentUser.uid;
    const currentShelf = await getShelfProducts();
    
    // Check if product already exists in shelf
    const existingIndex = currentShelf.findIndex(p => p.id === product.id);
    if (existingIndex !== -1) {
      logger.log(`Product ${product.id} already in shelf`);
      return true; // Already added, consider it success
    }

    // Create shelf product with metadata
    const shelfProduct: ShelfProduct = {
      ...product,
      addedAt: Date.now(),
      source
    };

    // Add to shelf
    const updatedShelf = [...currentShelf, shelfProduct];
    
    // Update cache immediately (optimistic update)
    await updateCachedShelfProducts(updatedShelf, userId);
    
    // Sync with Firestore in background
    syncShelfWithFirestore(updatedShelf, userId).catch(error => {
      logger.error('Background sync failed for shelf add:', error);
    });

    logger.log(`Successfully added product ${product.id} to shelf from ${source}`);
    return true;
  } catch (error) {
    logger.error('Error adding product to shelf:', error);
    return false;
  }
};

/**
 * Remove a product from the shelf
 */
export const removeFromShelf = async (productId: string): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    logger.warn('No authenticated user - cannot remove from shelf');
    return false;
  }

  try {
    const userId = currentUser.uid;
    const currentShelf = await getShelfProducts();
    
    // Filter out the product
    const updatedShelf = currentShelf.filter(p => p.id !== productId);
    
    if (updatedShelf.length === currentShelf.length) {
      logger.log(`Product ${productId} not found in shelf`);
      return true; // Not in shelf, consider it success
    }

    // Update cache immediately (optimistic update)
    await updateCachedShelfProducts(updatedShelf, userId);
    
    // Sync with Firestore in background
    syncShelfWithFirestore(updatedShelf, userId).catch(error => {
      logger.error('Background sync failed for shelf remove:', error);
    });

    logger.log(`Successfully removed product ${productId} from shelf`);
    return true;
  } catch (error) {
    logger.error('Error removing product from shelf:', error);
    return false;
  }
};

/**
 * Check if a product is in the shelf
 */
export const isInShelf = async (productId: string): Promise<boolean> => {
  try {
    const shelfProducts = await getShelfProducts();
    return shelfProducts.some(p => p.id === productId);
  } catch (error) {
    logger.error('Error checking if product is in shelf:', error);
    return false;
  }
};

/**
 * Clear all products from shelf
 */
export const clearShelf = async (): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    logger.warn('No authenticated user - cannot clear shelf');
    return false;
  }

  try {
    const userId = currentUser.uid;
    
    // Update cache immediately (optimistic update)
    await updateCachedShelfProducts([], userId);
    
    // Sync with Firestore in background
    syncShelfWithFirestore([], userId).catch(error => {
      logger.error('Background sync failed for shelf clear:', error);
    });

    logger.log('Successfully cleared shelf');
    return true;
  } catch (error) {
    logger.error('Error clearing shelf:', error);
    return false;
  }
};

/**
 * Get shelf statistics
 */
export const getShelfStats = async (): Promise<{
  totalProducts: number;
  recentlyAdded: number;
  oldestProduct?: ShelfProduct;
  newestProduct?: ShelfProduct;
}> => {
  try {
    const shelfProducts = await getShelfProducts();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentlyAdded = shelfProducts.filter(p => p.addedAt > oneDayAgo).length;
    const sortedByDate = [...shelfProducts].sort((a, b) => a.addedAt - b.addedAt);
    
    return {
      totalProducts: shelfProducts.length,
      recentlyAdded,
      oldestProduct: sortedByDate[0],
      newestProduct: sortedByDate[sortedByDate.length - 1]
    };
  } catch (error) {
    logger.error('Error getting shelf stats:', error);
    return {
      totalProducts: 0,
      recentlyAdded: 0
    };
  }
};

/**
 * Cleanup function for when user logs out
 */
export const cleanupShelfOnLogout = async (): Promise<void> => {
  try {
    // Get all AsyncStorage keys to find user-specific shelf caches
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for shelf cache keys
    const shelfCacheKeys = allKeys.filter(key => key.includes(SHELF_CACHE_KEY));
    
    if (shelfCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(shelfCacheKeys);
      logger.log('Cleaned up shelf caches on logout:', shelfCacheKeys.length, 'cache keys removed');
    }
  } catch (error) {
    logger.error('Error cleaning up shelf caches on logout:', error);
  }
};

/**
 * Batch operations for shelf management
 */
export const batchAddToShelf = async (products: Array<Omit<ShelfProduct, 'addedAt' | 'source'>>, source: ShelfProduct['source'] = 'overview'): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const product of products) {
    const result = await addToShelf(product, source);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  logger.log(`Batch add to shelf completed: ${success} success, ${failed} failed`);
  return { success, failed };
};

/**
 * Move products from shelf to try-on bucket
 * This is a helper function for 3D screen integration
 */
export const moveShelfProductsToTryOn = async (productIds: string[]): Promise<ShelfProduct[]> => {
  try {
    const shelfProducts = await getShelfProducts();
    const productsToMove = shelfProducts.filter(p => productIds.includes(p.id));
    
    // Remove moved products from shelf
    for (const productId of productIds) {
      await removeFromShelf(productId);
    }
    
    logger.log(`Moved ${productsToMove.length} products from shelf to try-on`);
    return productsToMove;
  } catch (error) {
    logger.error('Error moving products from shelf to try-on:', error);
    return [];
  }
};