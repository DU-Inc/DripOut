// src/services/welcomeProductCache.ts
// Welcome screen background product cache - persists forever until corrupted

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRandomProducts, Product } from './productService';

// Cache configuration
const CACHE_KEY = '@DripOut:welcomeProductCache';
const CURRENT_APP_VERSION = '1.0.0'; // Update this with app version changes
const CACHE_SIZE = 25; // Number of products to cache for background

// Cache structure
interface WelcomeProductCache {
  products: Product[];
  version: string;
  createdAt: number;
}

// Static fallback products for offline scenarios
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'fallback-1',
    name: 'Classic Denim Jacket',
    brand: 'Fashion Brand',
    price: 89.99,
    currency: 'USD',
    images: [{ id: 'img1', url: 'https://via.placeholder.com/300x400/4A90E2/FFFFFF?text=Denim+Jacket' }],
    productUrl: '#'
  },
  {
    id: 'fallback-2', 
    name: 'Vintage Sneakers',
    brand: 'Street Wear',
    price: 129.99,
    currency: 'USD',
    images: [{ id: 'img2', url: 'https://via.placeholder.com/300x400/50E3C2/FFFFFF?text=Sneakers' }],
    productUrl: '#'
  },
  {
    id: 'fallback-3',
    name: 'Summer Dress',
    brand: 'Chic Style',
    price: 65.00,
    currency: 'USD', 
    images: [{ id: 'img3', url: 'https://via.placeholder.com/300x400/F5A623/FFFFFF?text=Summer+Dress' }],
    productUrl: '#'
  }
];

/**
 * Get cached welcome products for background display
 * Returns products immediately - never makes API calls
 */
export const getCachedWelcomeProducts = async (): Promise<Product[]> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    
    if (cachedData) {
      const cache: WelcomeProductCache = JSON.parse(cachedData);
      
      // Validate cache integrity
      if (cache.products && 
          Array.isArray(cache.products) && 
          cache.products.length > 0 &&
          cache.version === CURRENT_APP_VERSION) {
        
        console.log(`WelcomeCache: Using cached products (${cache.products.length} items)`);
        return cache.products;
      } else {
        console.log('WelcomeCache: Cache validation failed, using fallback');
      }
    } else {
      console.log('WelcomeCache: No cache found, using fallback');
    }
  } catch (error) {
    console.error('WelcomeCache: Error reading cache:', error);
  }
  
  // Return fallback products if cache is invalid/missing
  console.log('WelcomeCache: Returning fallback products');
  return FALLBACK_PRODUCTS;
};

/**
 * Check if welcome cache needs refresh
 * Only refreshes if cache is corrupted, missing, or version mismatch
 */
export const needsWelcomeCacheRefresh = async (): Promise<boolean> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    
    if (!cachedData) {
      console.log('WelcomeCache: No cache exists - needs refresh');
      return true;
    }
    
    const cache: WelcomeProductCache = JSON.parse(cachedData);
    
    // Check for corruption or version mismatch
    const needsRefresh = !cache.products || 
                        !Array.isArray(cache.products) || 
                        cache.products.length === 0 ||
                        cache.version !== CURRENT_APP_VERSION;
    
    if (needsRefresh) {
      console.log('WelcomeCache: Cache corrupted or version mismatch - needs refresh');
    } else {
      console.log('WelcomeCache: Cache is valid - no refresh needed');
    }
    
    return needsRefresh;
  } catch (error) {
    console.error('WelcomeCache: Error checking cache validity:', error);
    return true; // Refresh on any error
  }
};

/**
 * Refresh welcome cache with fresh products from API
 * Only call this when cache is missing/corrupted
 */
export const refreshWelcomeCache = async (): Promise<boolean> => {
  try {
    console.log('WelcomeCache: Starting cache refresh...');
    
    // Fetch products from API
    const products = await fetchRandomProducts(CACHE_SIZE);
    
    if (!products || products.length === 0) {
      console.log('WelcomeCache: API returned no products, keeping existing cache');
      return false;
    }
    
    // Create cache object
    const cache: WelcomeProductCache = {
      products,
      version: CURRENT_APP_VERSION,
      createdAt: Date.now()
    };
    
    // Save to AsyncStorage
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    
    console.log(`WelcomeCache: Successfully cached ${products.length} products`);
    return true;
    
  } catch (error) {
    console.error('WelcomeCache: Error refreshing cache:', error);
    return false;
  }
};

/**
 * Initialize welcome cache if needed
 * Call this during app startup
 */
export const initializeWelcomeCache = async (): Promise<void> => {
  try {
    const needsRefresh = await needsWelcomeCacheRefresh();
    
    if (needsRefresh) {
      console.log('WelcomeCache: Initializing cache...');
      await refreshWelcomeCache();
    } else {
      console.log('WelcomeCache: Cache already initialized and valid');
    }
  } catch (error) {
    console.error('WelcomeCache: Error during initialization:', error);
  }
};

/**
 * Clear welcome cache (for debugging/testing)
 */
export const clearWelcomeCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('WelcomeCache: Cache cleared');
  } catch (error) {
    console.error('WelcomeCache: Error clearing cache:', error);
  }
};

/**
 * Get cache info for debugging
 */
export const getWelcomeCacheInfo = async (): Promise<{
  exists: boolean;
  productCount: number;
  version: string | null;
  createdAt: number | null;
}> => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    
    if (!cachedData) {
      return { exists: false, productCount: 0, version: null, createdAt: null };
    }
    
    const cache: WelcomeProductCache = JSON.parse(cachedData);
    
    return {
      exists: true,
      productCount: cache.products?.length || 0,
      version: cache.version || null,
      createdAt: cache.createdAt || null
    };
  } catch (error) {
    console.error('WelcomeCache: Error getting cache info:', error);
    return { exists: false, productCount: 0, version: null, createdAt: null };
  }
};