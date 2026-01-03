// src/services/productCache.ts
// Cache products for OverviewScreen with section-specific strategies

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRandomProducts, Product, SearchProductsResponse, searchProducts } from './productService';
import { memoryCache, CacheKeys } from './memoryCache';

// Cache configuration - Always user-specific for data isolation
const TRENDING_CACHE_KEY = '@DripOut:trendingProducts';
const NEW_DROPS_CACHE_KEY = '@DripOut:newDropsProducts';
const EDITORS_PICKS_CACHE_KEY = '@DripOut:editorsPicksProducts';
const SEARCH_CACHE_KEY = '@DripOut:searchResults';
const CURRENT_CACHE_VERSION = '1.2.0'; // Incremented to force refresh for description fix

// Cache TTL values (different for each section) - Optimized for performance
const TRENDING_TTL = 30 * 60 * 1000; // 30 minutes (changes frequently) - Keep short
const NEW_DROPS_TTL = 3 * 60 * 60 * 1000; // 3 hours (increased from 1h - "new" items stay relevant longer)
const EDITORS_PICKS_TTL = 6 * 60 * 60 * 1000; // 6 hours (increased from 2h - curated content changes slowly)
const SEARCH_TTL = 10 * 60 * 1000; // 10 minutes (search results can change frequently) - Keep short

// Memory cache keys for products
const getMemoryCacheKey = (section: string, userId: string): string => {
  return `products_${section}_${userId}`;
};

// Cache data structure
interface ProductSectionCache {
  products: Product[];
  timestamp: number;
  version: string;
  section: 'trending' | 'newDrops' | 'editorsPicks';
}

// Search cache structure
interface SearchResultCache {
  query: string;
  searchResponse: SearchProductsResponse;
  timestamp: number;
  version: string;
}

// User-specific cache keys
const getUserSpecificCacheKey = (baseKey: string, userId: string): string => {
  return `${baseKey}_${userId}`;
};

// Validate cache structure and freshness
const isCacheValid = (cache: ProductSectionCache, ttl: number): boolean => {
  const now = Date.now();
  return cache && 
         cache.version === CURRENT_CACHE_VERSION &&
         Array.isArray(cache.products) &&
         cache.products.length > 0 &&
         (now - cache.timestamp) < ttl;
};

// Validate individual product structure with detailed logging
const validateProducts = (products: any[]): products is Product[] => {
  if (!Array.isArray(products)) {
    console.warn('Product validation failed: data is not an array');
    return false;
  }
  
  if (products.length === 0) {
    console.warn('Product validation failed: empty array');
    return false;
  }
  
  // Check each product individually for better debugging
  const invalidProducts: number[] = [];
  
  const isValid = products.every((product, index) => {
    const checks = {
      exists: !!product,
      hasId: typeof product?.id === 'string',
      hasName: typeof product?.name === 'string',
      hasBrand: typeof product?.brand === 'string',
      hasPrice: typeof product?.price === 'number',
      hasImages: Array.isArray(product?.images),
      hasImageData: Array.isArray(product?.images) && product.images.length > 0
    };
    
    const productValid = Object.values(checks).every(Boolean);
    
    if (!productValid) {
      invalidProducts.push(index);
      console.warn(`Product ${index} validation failed:`, {
        productId: product?.id || 'NO_ID',
        checks,
        productKeys: product ? Object.keys(product) : 'NULL_PRODUCT'
      });
    }
    
    return productValid;
  });
  
  if (!isValid) {
    console.warn(`Product validation failed: ${invalidProducts.length}/${products.length} products invalid. Invalid indices: [${invalidProducts.join(', ')}]`);
  }
  
  return isValid;
};

// Clear corrupted cache
const clearCache = async (cacheKey: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(cacheKey);
    console.log('Cleared product cache:', cacheKey);
  } catch (error) {
    console.error('Error clearing product cache:', cacheKey, error);
  }
};

// Get cached products for a section - Always requires userId for data isolation
const getCachedProducts = async (
  baseKey: string,
  section: string,
  ttl: number,
  userId: string
): Promise<Product[] | null> => {
  try {
    // Always use user-specific cache keys for data isolation
    const cacheKey = getUserSpecificCacheKey(baseKey, userId);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cache: ProductSectionCache = JSON.parse(cachedData);
      
      if (isCacheValid(cache, ttl) && validateProducts(cache.products)) {
        console.log(`Using cached ${section} products (${cache.products.length} items)`);
        return cache.products;
      } else {
        console.log(`${section} cache invalid or expired, clearing`);
        await clearCache(cacheKey);
      }
    }
  } catch (error) {
    console.error(`Error getting cached ${section} products:`, error);
  }
  
  return null;
};

// Update cached products for a section - Always requires userId for data isolation
const updateCachedProducts = async (
  baseKey: string,
  section: 'trending' | 'newDrops' | 'editorsPicks',
  products: Product[],
  userId: string
): Promise<void> => {
  try {
    // Check if we have any products to cache
    if (!products || products.length === 0) {
      console.warn(`No products to cache for ${section} section`);
      return;
    }

    // Validate product structure
    if (!validateProducts(products)) {
      console.warn(`Some products in ${section} section failed validation, but attempting to cache valid ones`);
      
      // Filter out invalid products and try to cache valid ones
      const validProducts = products.filter((product: any, index: number) => {
        const isValid = product &&
          typeof product.id === 'string' &&
          typeof product.name === 'string' &&
          typeof product.brand === 'string' &&
          typeof product.price === 'number' &&
          Array.isArray(product.images) &&
          product.images.length > 0;
        
        if (!isValid) {
          console.warn(`Filtering out invalid product at index ${index}:`, product?.id || 'NO_ID');
        }
        
        return isValid;
      }) as Product[];
      
      if (validProducts.length === 0) {
        console.error(`No valid products found for ${section} section, skipping cache`);
        return;
      }
      
      console.log(`Caching ${validProducts.length}/${products.length} valid products for ${section}`);
      products = validProducts;
    }

    // Always use user-specific cache keys for data isolation
    const cacheKey = getUserSpecificCacheKey(baseKey, userId);
    const cache: ProductSectionCache = {
      products,
      timestamp: Date.now(),
      version: CURRENT_CACHE_VERSION,
      section
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    console.log(`Successfully updated ${section} cache with ${products.length} products`);
  } catch (error) {
    console.error(`Error updating ${section} cache:`, error);
  }
};

// ===== TRENDING PRODUCTS =====

/**
 * Get cached trending products - Requires userId for data isolation
 */
export const getCachedTrendingProducts = async (userId: string): Promise<Product[] | null> => {
  return getCachedProducts(TRENDING_CACHE_KEY, 'trending', TRENDING_TTL, userId);
};

/**
 * Update trending products cache - Requires userId for data isolation
 */
export const updateTrendingProductsCache = async (products: Product[], userId: string): Promise<void> => {
  await updateCachedProducts(TRENDING_CACHE_KEY, 'trending', products, userId);
};

/**
 * Get trending products with memory-first cache approach - Requires userId for data isolation
 */
export const getTrendingProducts = async (forceRefresh = false, userId: string): Promise<Product[]> => {
  const memoryCacheKey = getMemoryCacheKey('trending', userId);
  
  // Check memory cache first unless force refresh
  if (!forceRefresh) {
    const memoryProducts = await memoryCache.get(
      memoryCacheKey,
      async () => {
        // Fallback to AsyncStorage cache
        const cachedProducts = await getCachedTrendingProducts(userId);
        if (cachedProducts) {
          return cachedProducts;
        }
        
        // No cache available, fetch fresh data
        console.log('Fetching fresh trending products from API');
        const allProducts = await fetchRandomProducts(20);
        console.log(`API returned ${allProducts.length} products for trending section`);
        
        // Use adaptive slicing - take what we get, up to 20
        const trendingProducts = allProducts.slice(0, Math.min(allProducts.length, 20));
        
        if (trendingProducts.length > 0) {
          // Update AsyncStorage cache (fire and forget)
          updateTrendingProductsCache(trendingProducts, userId).catch(error => {
            console.error('Error caching trending products:', error);
          });
        }
        
        return trendingProducts;
      },
      TRENDING_TTL
    );
    
    if (memoryProducts && memoryProducts.length > 0) {
      return memoryProducts;
    }
  }
  
  // Force refresh path
  console.log('Force refresh: Fetching fresh trending products from API');
  try {
    const allProducts = await fetchRandomProducts(20);
    console.log(`API returned ${allProducts.length} products for trending section`);
    
    // Use adaptive slicing - take what we get, up to 20
    const trendingProducts = allProducts.slice(0, Math.min(allProducts.length, 20));
    
    if (trendingProducts.length > 0) {
      // Update both memory and AsyncStorage cache
      await memoryCache.set(memoryCacheKey, trendingProducts, TRENDING_TTL);
      updateTrendingProductsCache(trendingProducts, userId).catch(error => {
        console.error('Error caching trending products:', error);
      });
    } else {
      console.warn('No trending products received from API');
    }
    
    return trendingProducts;
  } catch (error) {
    console.error('Error fetching trending products:', error);
    
    // Try to return stale cache data as fallback
    const staleCache = await getCachedTrendingProducts(userId);
    return staleCache || [];
  }
};

// ===== NEW DROPS PRODUCTS =====

/**
 * Get cached new drops products - Requires userId for data isolation
 */
export const getCachedNewDropsProducts = async (userId: string): Promise<Product[] | null> => {
  return getCachedProducts(NEW_DROPS_CACHE_KEY, 'newDrops', NEW_DROPS_TTL, userId);
};

/**
 * Update new drops products cache - Requires userId for data isolation
 */
export const updateNewDropsProductsCache = async (products: Product[], userId: string): Promise<void> => {
  await updateCachedProducts(NEW_DROPS_CACHE_KEY, 'newDrops', products, userId);
};

/**
 * Get new drops products with cache-first approach - Requires userId for data isolation
 */
export const getNewDropsProducts = async (forceRefresh = false, userId: string): Promise<Product[]> => {
  // Check cache first unless force refresh
  if (!forceRefresh) {
    const cachedProducts = await getCachedNewDropsProducts(userId);
    if (cachedProducts) {
      return cachedProducts;
    }
  }
  
  // Cache miss or force refresh - fetch from API
  console.log('Fetching fresh new drops products from API');
  try {
    const allProducts = await fetchRandomProducts(20);
    console.log(`API returned ${allProducts.length} products for new drops section`);
    
    // Use adaptive slicing - take what we get, up to 20
    const newDropsProducts = allProducts.slice(0, Math.min(allProducts.length, 20));
    
    if (newDropsProducts.length > 0) {
      // Update cache (fire and forget)
      updateNewDropsProductsCache(newDropsProducts, userId).catch(error => {
        console.error('Error caching new drops products:', error);
      });
    } else {
      console.warn('No new drops products received from API');
    }
    
    return newDropsProducts;
  } catch (error) {
    console.error('Error fetching new drops products:', error);
    
    // Try to return stale cache data as fallback
    const staleCache = await getCachedNewDropsProducts(userId);
    return staleCache || [];
  }
};

// ===== EDITOR'S PICKS PRODUCTS =====

/**
 * Get cached editor's picks products - Requires userId for data isolation
 */
export const getCachedEditorsPicksProducts = async (userId: string): Promise<Product[] | null> => {
  return getCachedProducts(EDITORS_PICKS_CACHE_KEY, 'editorsPicks', EDITORS_PICKS_TTL, userId);
};

/**
 * Update editor's picks products cache - Requires userId for data isolation
 */
export const updateEditorsPicksProductsCache = async (products: Product[], userId: string): Promise<void> => {
  await updateCachedProducts(EDITORS_PICKS_CACHE_KEY, 'editorsPicks', products, userId);
};

/**
 * Get editor's picks products with cache-first approach - Requires userId for data isolation
 */
export const getEditorsPicksProducts = async (forceRefresh = false, userId: string): Promise<Product[]> => {
  // Check cache first unless force refresh
  if (!forceRefresh) {
    const cachedProducts = await getCachedEditorsPicksProducts(userId);
    if (cachedProducts) {
      return cachedProducts;
    }
  }
  
  // Cache miss or force refresh - fetch from API
  console.log('Fetching fresh editor\'s picks products from API');
  try {
    const allProducts = await fetchRandomProducts(20);
    console.log(`API returned ${allProducts.length} products for editor's picks section`);
    
    // Use adaptive slicing - take what we get, up to 20
    const editorsPicksProducts = allProducts.slice(0, Math.min(allProducts.length, 20));
    
    if (editorsPicksProducts.length > 0) {
      // Update cache (fire and forget)
      updateEditorsPicksProductsCache(editorsPicksProducts, userId).catch(error => {
        console.error('Error caching editor\'s picks products:', error);
      });
    } else {
      console.warn('No editor\'s picks products received from API');
    }
    
    return editorsPicksProducts;
  } catch (error) {
    console.error('Error fetching editor\'s picks products:', error);
    
    // Try to return stale cache data as fallback
    const staleCache = await getCachedEditorsPicksProducts(userId);
    return staleCache || [];
  }
};

// ===== BATCH OPERATIONS =====

/**
 * Pre-load all product sections (for app startup) - Requires userId for data isolation
 * Uses adaptive slicing to handle varying numbers of products from API
 */
export const preloadAllProductSections = async (userId: string): Promise<{
  trending: Product[];
  newDrops: Product[];
  editorsPicks: Product[];
}> => {
  console.log('Preloading all product sections for user:', userId);
  
  try {
    // Fetch products - request 60 but handle any amount returned
    const allProducts = await fetchRandomProducts(60);
    console.log(`API returned ${allProducts.length} products for preloading`);
    
    // Minimum threshold for meaningful sections
    const MIN_PRODUCTS_TOTAL = 9; // 3 per section minimum
    const MIN_PRODUCTS_PER_SECTION = 3;
    
    if (allProducts.length < MIN_PRODUCTS_TOTAL) {
      console.warn(`Insufficient products for meaningful sections (${allProducts.length} < ${MIN_PRODUCTS_TOTAL})`);
      return { trending: [], newDrops: [], editorsPicks: [] };
    }
    
    // Adaptive slicing based on actual product count
    const totalProducts = allProducts.length;
    let trending: Product[] = [];
    let newDrops: Product[] = [];
    let editorsPicks: Product[] = [];
    
    if (totalProducts >= 60) {
      // Ideal case - enough products for full sections
      trending = allProducts.slice(0, 20);
      newDrops = allProducts.slice(20, 40);
      editorsPicks = allProducts.slice(40, 60);
      console.log('Using ideal product distribution: 20/20/20');
    } else {
      // Adaptive distribution - divide products proportionally
      const productsPerSection = Math.floor(totalProducts / 3);
      const remainder = totalProducts % 3;
      
      // Distribute products, giving extra to trending (most important)
      const trendingCount = productsPerSection + (remainder > 0 ? 1 : 0);
      const newDropsCount = productsPerSection + (remainder > 1 ? 1 : 0);
      const editorsPicksCount = productsPerSection;
      
      trending = allProducts.slice(0, trendingCount);
      newDrops = allProducts.slice(trendingCount, trendingCount + newDropsCount);
      editorsPicks = allProducts.slice(trendingCount + newDropsCount, trendingCount + newDropsCount + editorsPicksCount);
      
      console.log(`Using adaptive distribution: ${trendingCount}/${newDropsCount}/${editorsPicksCount} (total: ${totalProducts})`);
    }
    
    // Validate sections have minimum products before caching
    const validSections: Array<Promise<void>> = [];
    let sectionsUpdated = 0;
    
    if (trending.length >= MIN_PRODUCTS_PER_SECTION) {
      validSections.push(updateTrendingProductsCache(trending, userId));
      sectionsUpdated++;
    } else {
      console.warn(`Trending section too small (${trending.length} < ${MIN_PRODUCTS_PER_SECTION}), skipping cache update`);
    }
    
    if (newDrops.length >= MIN_PRODUCTS_PER_SECTION) {
      validSections.push(updateNewDropsProductsCache(newDrops, userId));
      sectionsUpdated++;
    } else {
      console.warn(`New drops section too small (${newDrops.length} < ${MIN_PRODUCTS_PER_SECTION}), skipping cache update`);
    }
    
    if (editorsPicks.length >= MIN_PRODUCTS_PER_SECTION) {
      validSections.push(updateEditorsPicksProductsCache(editorsPicks, userId));
      sectionsUpdated++;
    } else {
      console.warn(`Editor's picks section too small (${editorsPicks.length} < ${MIN_PRODUCTS_PER_SECTION}), skipping cache update`);
    }
    
    // Update all valid caches in parallel
    if (validSections.length > 0) {
      await Promise.all(validSections);
      console.log(`Successfully preloaded ${sectionsUpdated}/3 product sections for user: ${userId}`);
    } else {
      console.warn('No sections met minimum size requirements for caching');
    }
    
    return { trending, newDrops, editorsPicks };
    
  } catch (error) {
    console.error('Error preloading product sections:', error);
    return { trending: [], newDrops: [], editorsPicks: [] };
  }
};

/**
 * Check if background refresh is needed for any section - Requires userId for data isolation
 */
export const needsBackgroundRefresh = async (userId: string): Promise<{
  trending: boolean;
  newDrops: boolean;
  editorsPicks: boolean;
}> => {
  try {
    const now = Date.now();
    const BACKGROUND_REFRESH_THRESHOLD = 0.8; // Refresh when cache hits 80% of TTL
    
    // Always use user-specific cache keys for data isolation
    const trendingKey = getUserSpecificCacheKey(TRENDING_CACHE_KEY, userId);
    const newDropsKey = getUserSpecificCacheKey(NEW_DROPS_CACHE_KEY, userId);
    const editorsPicksKey = getUserSpecificCacheKey(EDITORS_PICKS_CACHE_KEY, userId);
    
    const [trendingData, newDropsData, editorsPicksData] = await Promise.all([
      AsyncStorage.getItem(trendingKey),
      AsyncStorage.getItem(newDropsKey),
      AsyncStorage.getItem(editorsPicksKey)
    ]);
    
    const checkRefreshNeeded = (cacheData: string | null, ttl: number): boolean => {
      if (!cacheData) return true;
      
      try {
        const cache = JSON.parse(cacheData);
        const age = now - cache.timestamp;
        return age > (ttl * BACKGROUND_REFRESH_THRESHOLD);
      } catch {
        return true;
      }
    };
    
    return {
      trending: checkRefreshNeeded(trendingData, TRENDING_TTL),
      newDrops: checkRefreshNeeded(newDropsData, NEW_DROPS_TTL),
      editorsPicks: checkRefreshNeeded(editorsPicksData, EDITORS_PICKS_TTL)
    };
  } catch (error) {
    console.error('Error checking background refresh needs:', error);
    return { trending: true, newDrops: true, editorsPicks: true };
  }
};

// ===== CACHE MANAGEMENT =====

/**
 * Clear all product caches for a specific user
 * This includes both AsyncStorage and memory cache for complete refresh
 */
export const clearAllProductCaches = async (userId: string): Promise<void> => {
  try {
    // Always use user-specific cache keys for data isolation
    const cacheKeys = [
      getUserSpecificCacheKey(TRENDING_CACHE_KEY, userId),
      getUserSpecificCacheKey(NEW_DROPS_CACHE_KEY, userId),
      getUserSpecificCacheKey(EDITORS_PICKS_CACHE_KEY, userId)
    ];

    // Clear AsyncStorage caches
    await AsyncStorage.multiRemove(cacheKeys);
    
    // Clear memory cache for random products (used by fetchRandomProducts)
    // This ensures pull-to-refresh actually fetches fresh data from API
    await memoryCache.clearPattern('random_products_');
    
    console.log('Cleared all product caches (AsyncStorage + Memory) for user:', userId);
  } catch (error) {
    console.error('Error clearing all product caches:', error);
  }
};

/**
 * Cleanup function for when user logs out - removes all user-specific caches
 * This prevents data leakage and memory leaks
 */
export const cleanupProductCachesOnLogout = async (): Promise<void> => {
  try {
    // Get all AsyncStorage keys to find user-specific product caches
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for product cache keys (any that start with our cache prefixes)
    const productCacheKeys = allKeys.filter(key => 
      key.includes(TRENDING_CACHE_KEY) ||
      key.includes(NEW_DROPS_CACHE_KEY) ||
      key.includes(EDITORS_PICKS_CACHE_KEY)
    );
    
    if (productCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(productCacheKeys);
      console.log('Cleaned up all product caches on logout:', productCacheKeys.length, 'cache keys removed');
    }
  } catch (error) {
    console.error('Error cleaning up product caches on logout:', error);
  }
};

/**
 * Get cache statistics for debugging - Requires userId for data isolation
 */
export const getProductCacheStats = async (userId: string): Promise<{
  trending: { count: number; age: number };
  newDrops: { count: number; age: number };
  editorsPicks: { count: number; age: number };
}> => {
  try {
    const now = Date.now();
    const [trendingCache, newDropsCache, editorsPicksCache] = await Promise.all([
      getCachedTrendingProducts(userId),
      getCachedNewDropsProducts(userId),
      getCachedEditorsPicksProducts(userId)
    ]);
    
    const getCacheAge = async (baseKey: string): Promise<number> => {
      try {
        // Always use user-specific cache keys for data isolation
        const cacheKey = getUserSpecificCacheKey(baseKey, userId);
        const cacheData = await AsyncStorage.getItem(cacheKey);
        if (cacheData) {
          const cache = JSON.parse(cacheData);
          return now - cache.timestamp;
        }
      } catch (error) {
        console.error('Error getting cache age:', error);
      }
      return 0;
    };
    
    const [trendingAge, newDropsAge, editorsPicksAge] = await Promise.all([
      getCacheAge(TRENDING_CACHE_KEY),
      getCacheAge(NEW_DROPS_CACHE_KEY),
      getCacheAge(EDITORS_PICKS_CACHE_KEY)
    ]);
    
    return {
      trending: { count: trendingCache?.length || 0, age: trendingAge },
      newDrops: { count: newDropsCache?.length || 0, age: newDropsAge },
      editorsPicks: { count: editorsPicksCache?.length || 0, age: editorsPicksAge }
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      trending: { count: 0, age: 0 },
      newDrops: { count: 0, age: 0 },
      editorsPicks: { count: 0, age: 0 }
    };
  }
};

// ===== SEARCH RESULT CACHING =====

/**
 * Generate a cache key for search results - includes query normalization
 */
const getSearchCacheKey = (query: string, userId: string): string => {
  // Normalize query for consistent caching (lowercase, trim, collapse spaces)
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return getUserSpecificCacheKey(`${SEARCH_CACHE_KEY}_${normalizedQuery}`, userId);
};

/**
 * Get cached search results for a specific query
 */
export const getCachedSearchResults = async (
  query: string,
  userId: string
): Promise<SearchProductsResponse | null> => {
  try {
    const cacheKey = getSearchCacheKey(query, userId);
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const cache: SearchResultCache = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache is valid and fresh
      if (
        cache.version === CURRENT_CACHE_VERSION &&
        cache.query === query.toLowerCase().trim().replace(/\s+/g, ' ') &&
        (now - cache.timestamp) < SEARCH_TTL &&
        cache.searchResponse &&
        validateProducts(cache.searchResponse.products)
      ) {
        console.log(`Using cached search results for query: "${query}" (${cache.searchResponse.products.length} products)`);
        return cache.searchResponse;
      } else {
        console.log(`Search cache invalid or expired for query: "${query}", clearing`);
        await AsyncStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error(`Error getting cached search results for query: "${query}"`, error);
  }
  
  return null;
};

/**
 * Update cached search results for a specific query
 */
export const updateSearchResultsCache = async (
  query: string,
  searchResponse: SearchProductsResponse,
  userId: string
): Promise<void> => {
  try {
    // Only cache if we have valid products
    if (!searchResponse.products || searchResponse.products.length === 0) {
      console.log(`No products to cache for search query: "${query}"`);
      return;
    }
    
    // Validate products before caching
    if (!validateProducts(searchResponse.products)) {
      console.warn(`Some products in search results failed validation for query: "${query}"`);
      
      // Filter out invalid products
      const validProducts = searchResponse.products.filter((product: any) => {
        return product &&
          typeof product.id === 'string' &&
          typeof product.name === 'string' &&
          typeof product.brand === 'string' &&
          typeof product.price === 'number' &&
          Array.isArray(product.images) &&
          product.images.length > 0;
      }) as Product[];
      
      if (validProducts.length === 0) {
        console.error(`No valid products found for search query: "${query}", skipping cache`);
        return;
      }
      
      // Update search response with valid products only
      searchResponse = {
        ...searchResponse,
        products: validProducts
      };
    }
    
    const cacheKey = getSearchCacheKey(query, userId);
    const cache: SearchResultCache = {
      query: query.toLowerCase().trim().replace(/\s+/g, ' '),
      searchResponse,
      timestamp: Date.now(),
      version: CURRENT_CACHE_VERSION
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    console.log(`Successfully cached search results for query: "${query}" (${searchResponse.products.length} products)`);
  } catch (error) {
    console.error(`Error updating search results cache for query: "${query}"`, error);
  }
};

/**
 * Search products with caching
 */
export const searchProductsWithCache = async (
  query: string,
  userId: string,
  options: {
    searchType?: 'hybrid' | 'text' | 'natural_language';
    page?: number;
    pageSize?: number;
    filters?: any;
    usePost?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<SearchProductsResponse> => {
  const { forceRefresh = false, ...searchOptions } = options;
  
  // Skip cache for paginated requests (page > 1) or when force refresh is requested
  if (!forceRefresh && (searchOptions.page || 1) === 1) {
    const cachedResults = await getCachedSearchResults(query, userId);
    if (cachedResults) {
      // 🐛 DEBUG: Log cached results
      console.log(`[CACHE DEBUG] Using cached results for query: "${query}"`);
      if (cachedResults.products.length > 0) {
        console.log(`[CACHE DEBUG] First cached product brand:`, cachedResults.products[0].brand);
        console.log(`[CACHE DEBUG] First cached product full:`, JSON.stringify(cachedResults.products[0], null, 2));
      }
      return cachedResults;
    }
  }
  
  // Cache miss or force refresh - perform search
  console.log(`Performing fresh search for query: "${query}"`);
  try {
    const searchResponse = await searchProducts(query, searchOptions);
    
    // 🐛 DEBUG: Log fresh search results
    console.log(`[CACHE DEBUG] Fresh search completed for query: "${query}"`);
    if (searchResponse.products.length > 0) {
      console.log(`[CACHE DEBUG] First fresh product brand:`, searchResponse.products[0].brand);
      console.log(`[CACHE DEBUG] First fresh product full:`, JSON.stringify(searchResponse.products[0], null, 2));
    }
    
    // Only cache page 1 results for simplicity
    if ((searchOptions.page || 1) === 1 && searchResponse.products.length > 0) {
      // Update cache (fire and forget)
      updateSearchResultsCache(query, searchResponse, userId).catch(error => {
        console.error('Error caching search results:', error);
      });
    }
    
    return searchResponse;
  } catch (error) {
    console.error(`Error searching for query: "${query}"`, error);
    
    // Try to return cached results as fallback
    const fallbackCache = await getCachedSearchResults(query, userId);
    if (fallbackCache) {
      console.log(`Using cached fallback results for query: "${query}"`);
      return fallbackCache;
    }
    
    // Return empty results if no cache available
    return {
      products: [],
      total: 0,
      page: 1,
      page_size: 20,
      search_method: 'hybrid',
      search_time_ms: 0,
      similarity_scores: null,
      facets: null
    };
  }
};

/**
 * Clear all search caches for a specific user
 */
export const clearSearchCaches = async (userId: string): Promise<void> => {
  try {
    // Get all AsyncStorage keys to find user-specific search caches
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter for search cache keys that belong to this user
    const searchCacheKeys = allKeys.filter(key => 
      key.includes(SEARCH_CACHE_KEY) && key.includes(userId)
    );
    
    if (searchCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(searchCacheKeys);
      console.log(`Cleared ${searchCacheKeys.length} search caches for user: ${userId}`);
    }
  } catch (error) {
    console.error('Error clearing search caches:', error);
  }
};

/**
 * Clear all caches (including search) for a specific user
 */
export const clearAllCachesForUser = async (userId: string): Promise<void> => {
  try {
    await Promise.all([
      clearAllProductCaches(userId),
      clearSearchCaches(userId)
    ]);
    console.log(`Cleared all caches for user: ${userId}`);
  } catch (error) {
    console.error('Error clearing all caches for user:', error);
  }
};

/**
 * Force clear all product caches for testing/debugging
 * This will force fresh API calls on next load
 */
export const forceClearAllCaches = async (): Promise<void> => {
  try {
    console.log('Force clearing all product caches...');
    
    // Get all AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    
    // Filter for product cache keys
    const productCacheKeys = keys.filter(key => 
      key.includes('@DripOut:trendingProducts') ||
      key.includes('@DripOut:newDropsProducts') ||
      key.includes('@DripOut:editorsPicksProducts') ||
      key.includes('@DripOut:searchResults')
    );
    
    if (productCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(productCacheKeys);
      console.log(`Force cleared ${productCacheKeys.length} product cache keys`);
    } else {
      console.log('No product cache keys found to clear');
    }
  } catch (error) {
    console.error('Error force clearing product caches:', error);
  }
}; 