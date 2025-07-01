// src/services/appPreloader.ts
// App-level preloader to eliminate loading delays

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';
import { preloadAllProductSections } from './productCache';
import { getCachedFeedPosts } from './postService';
import { 
  batchUpdateLikesCache, 
  batchUpdateSavesCache, 
  batchUpdateFollowsCache,
  clearAllInteractionCaches 
} from './interactionCache';
import { logger } from '../utils/logger';

// Preloader configuration
const PRELOADER_CONFIG = {
  PRELOAD_TIMEOUT: 10000, // 10 seconds max for preloading
  RETRY_DELAY: 2000, // 2 seconds between retries
  MAX_RETRIES: 3,
  BACKGROUND_PRELOAD_DELAY: 1000, // 1 second delay for background preloading
  CACHE_REFRESH_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
};

// Preloader state
interface PreloaderState {
  isPreloading: boolean;
  isInitialized: boolean;
  lastPreloadTime: number;
  preloadAttempts: number;
  backgroundPreloadScheduled: boolean;
}

// Global preloader state
let preloaderState: PreloaderState = {
  isPreloading: false,
  isInitialized: false,
  lastPreloadTime: 0,
  preloadAttempts: 0,
  backgroundPreloadScheduled: false,
};

// Store preloader state in AsyncStorage
const PRELOADER_STATE_KEY = '@DripOut:preloaderState';

// Preload results interface
interface PreloadResults {
  products: {
    trending: number;
    newDrops: number;
    editorsPicks: number;
  };
  posts: number;
  interactions: boolean;
  success: boolean;
  duration: number;
  errors: string[];
}

// Save preloader state
const savePreloaderState = async (state: PreloaderState): Promise<void> => {
  try {
    await AsyncStorage.setItem(PRELOADER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Error saving preloader state:', error);
  }
};

// Load preloader state
const loadPreloaderState = async (): Promise<PreloaderState> => {
  try {
    const stateStr = await AsyncStorage.getItem(PRELOADER_STATE_KEY);
    if (stateStr) {
      const savedState = JSON.parse(stateStr);
      return {
        ...preloaderState,
        ...savedState,
        isPreloading: false, // Always reset this on app start
        backgroundPreloadScheduled: false,
      };
    }
  } catch (error) {
    logger.error('Error loading preloader state:', error);
  }
  return preloaderState;
};

// Check if preloading is needed
const shouldPreload = (state: PreloaderState): boolean => {
  const now = Date.now();
  const timeSinceLastPreload = now - state.lastPreloadTime;
  
  return (
    !state.isInitialized ||
    timeSinceLastPreload > PRELOADER_CONFIG.CACHE_REFRESH_INTERVAL ||
    state.preloadAttempts === 0
  );
};

// Preload products with retry logic - Requires userId for data isolation
const preloadProducts = async (userId: string): Promise<{
  products: { trending: number; newDrops: number; editorsPicks: number };
  errors: string[];
}> => {
  const errors: string[] = [];
  let retryCount = 0;
  
  while (retryCount < PRELOADER_CONFIG.MAX_RETRIES) {
    try {
      logger.info('Preloading products sections for user:', userId);
      const productSections = await preloadAllProductSections(userId);
      
      return {
        products: {
          trending: productSections.trending.length,
          newDrops: productSections.newDrops.length,
          editorsPicks: productSections.editorsPicks.length,
        },
        errors: [],
      };
    } catch (error) {
      retryCount++;
      const errorMsg = `Product preload attempt ${retryCount} failed: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      
      if (retryCount < PRELOADER_CONFIG.MAX_RETRIES) {
        logger.info(`Retrying product preload in ${PRELOADER_CONFIG.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, PRELOADER_CONFIG.RETRY_DELAY));
      }
    }
  }
  
  return {
    products: { trending: 0, newDrops: 0, editorsPicks: 0 },
    errors,
  };
};

// Preload posts with retry logic
const preloadPosts = async (): Promise<{ posts: number; errors: string[] }> => {
  const errors: string[] = [];
  let retryCount = 0;
  
  while (retryCount < PRELOADER_CONFIG.MAX_RETRIES) {
    try {
      logger.info('Preloading posts...');
      const posts = await getCachedFeedPosts(false); // Cache-first approach
      
      return {
        posts: posts.length,
        errors: [],
      };
    } catch (error) {
      retryCount++;
      const errorMsg = `Posts preload attempt ${retryCount} failed: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      
      if (retryCount < PRELOADER_CONFIG.MAX_RETRIES) {
        logger.info(`Retrying posts preload in ${PRELOADER_CONFIG.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, PRELOADER_CONFIG.RETRY_DELAY));
      }
    }
  }
  
  return {
    posts: 0,
    errors,
  };
};

// Preload user interactions (likes, saves, follows)
const preloadInteractions = async (): Promise<{ interactions: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return { interactions: false, errors: ['No authenticated user'] };
    }
    
    logger.info('Preloading user interactions for user:', currentUser.uid);
    
    // Clear stale caches first
    await clearAllInteractionCaches();
    
    // Import services dynamically to avoid circular dependencies
    const { getUserLikes } = require('./likeService');
    const { getUserSaves } = require('./saveService');
    const { getFollowingList } = require('./followService');
    
    // Preload user interactions in parallel with retry logic
    const interactionPromises = [
      getUserLikes(currentUser.uid).catch((error: any) => {
        logger.error('Failed to preload likes:', error);
        errors.push(`Likes preload failed: ${error}`);
        return [];
      }),
      getUserSaves(currentUser.uid).catch((error: any) => {
        logger.error('Failed to preload saves:', error);
        errors.push(`Saves preload failed: ${error}`);
        return [];
      }),
      getFollowingList(currentUser.uid).catch((error: any) => {
        logger.error('Failed to preload follows:', error);
        errors.push(`Follows preload failed: ${error}`);
        return [];
      })
    ];
    
    const [likes, saves, follows] = await Promise.all(interactionPromises);
    
    // Update caches with fetched data
    await Promise.all([
      batchUpdateLikesCache(likes.map((like: any) => like.postId || like.id)),
      batchUpdateSavesCache(saves.map((save: any) => save.postId || save.id)),
      batchUpdateFollowsCache(follows.map((follow: any) => follow.followedUserId || follow.id))
    ]);
    
    logger.info('Successfully preloaded interactions:', {
      likes: likes.length,
      saves: saves.length,
      follows: follows.length
    });
    
    return { interactions: true, errors };
  } catch (error) {
    const errorMsg = `Interactions preload failed: ${error}`;
    logger.error(errorMsg);
    errors.push(errorMsg);
    
    return { interactions: false, errors };
  }
};

// Main preload function
export const preloadAppData = async (forceReload = false): Promise<PreloadResults> => {
  const startTime = Date.now();
  
  // Load current state
  preloaderState = await loadPreloaderState();
  
  // Check if preloading is needed
  if (!forceReload && !shouldPreload(preloaderState)) {
    logger.info('Preloading skipped - data is fresh');
    return {
      products: { trending: 0, newDrops: 0, editorsPicks: 0 },
      posts: 0,
      interactions: false,
      success: true,
      duration: Date.now() - startTime,
      errors: ['Skipped - data is fresh'],
    };
  }
  
  // Set preloading state
  preloaderState.isPreloading = true;
  preloaderState.preloadAttempts++;
  
  logger.info('Starting app data preload...');
  
  const currentUser = auth().currentUser;
  const userId = currentUser?.uid;
  
  // Create a timeout promise to prevent hanging
  const timeoutPromise = new Promise<PreloadResults>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Preload timeout'));
    }, PRELOADER_CONFIG.PRELOAD_TIMEOUT);
  });
  
  // Main preload promise
  const preloadPromise = (async (): Promise<PreloadResults> => {
    const errors: string[] = [];
    
    try {
      // Ensure we have a valid userId for product preloading
      if (!userId) {
        errors.push('No authenticated user - cannot preload user-specific data');
        return {
          products: { trending: 0, newDrops: 0, editorsPicks: 0 },
          posts: 0,
          interactions: false,
          success: false,
          duration: Date.now() - startTime,
          errors,
        };
      }
      
      // Preload all data in parallel for maximum efficiency
      const [productsResult, postsResult, interactionsResult] = await Promise.all([
        preloadProducts(userId), // Now requires userId for data isolation
        preloadPosts(),
        preloadInteractions(),
      ]);
      
      // Collect all errors
      errors.push(...productsResult.errors);
      errors.push(...postsResult.errors);
      errors.push(...interactionsResult.errors);
      
      const success = errors.length === 0;
      const duration = Date.now() - startTime;
      
      // Update preloader state
      preloaderState.isPreloading = false;
      preloaderState.isInitialized = true;
      preloaderState.lastPreloadTime = Date.now();
      
      if (success) {
        preloaderState.preloadAttempts = 0; // Reset attempts on success
      }
      
      await savePreloaderState(preloaderState);
      
      const results: PreloadResults = {
        products: productsResult.products,
        posts: postsResult.posts,
        interactions: interactionsResult.interactions,
        success,
        duration,
        errors,
      };
      
      logger.info('App data preload completed:', {
        success,
        duration,
        products: productsResult.products,
        posts: postsResult.posts,
        interactions: interactionsResult.interactions,
        errors: errors.length,
      });
      
      return results;
    } catch (error) {
      preloaderState.isPreloading = false;
      await savePreloaderState(preloaderState);
      
      const errorMsg = `Preload failed: ${error}`;
      logger.error(errorMsg);
      errors.push(errorMsg);
      
      return {
        products: { trending: 0, newDrops: 0, editorsPicks: 0 },
        posts: 0,
        interactions: false,
        success: false,
        duration: Date.now() - startTime,
        errors,
      };
    }
  })();
  
  // Race between preload and timeout
  try {
    return await Promise.race([preloadPromise, timeoutPromise]);
  } catch (error) {
    preloaderState.isPreloading = false;
    await savePreloaderState(preloaderState);
    
    logger.error('Preload timed out or failed:', error);
    return {
      products: { trending: 0, newDrops: 0, editorsPicks: 0 },
      posts: 0,
      interactions: false,
      success: false,
      duration: Date.now() - startTime,
      errors: [`Preload failed: ${error}`],
    };
  }
};

// Background preload function (non-blocking)
export const scheduleBackgroundPreload = (): void => {
  if (preloaderState.backgroundPreloadScheduled) {
    return; // Already scheduled
  }
  
  preloaderState.backgroundPreloadScheduled = true;
  
  setTimeout(async () => {
    preloaderState.backgroundPreloadScheduled = false;
    
    try {
      logger.info('Starting background preload...');
      await preloadAppData(false);
    } catch (error) {
      logger.error('Background preload failed:', error);
    }
  }, PRELOADER_CONFIG.BACKGROUND_PRELOAD_DELAY);
};

// App state change handler for smart preloading
let appStateSubscription: any = null;

export const initializePreloader = (): void => {
  logger.info('Initializing app preloader...');
  
  // Set up app state listener for background preloading
  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App became active - check if background preload is needed
      loadPreloaderState().then(state => {
        if (shouldPreload(state)) {
          logger.info('App became active - scheduling background preload');
          scheduleBackgroundPreload();
        }
      });
    }
  });
};

// Cleanup function
export const cleanupPreloader = (): void => {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  preloaderState.backgroundPreloadScheduled = false;
  logger.info('Preloader cleanup completed');
};

// Get preloader status
export const getPreloaderStatus = (): {
  isPreloading: boolean;
  isInitialized: boolean;
  lastPreloadTime: number;
  preloadAttempts: number;
} => {
  return {
    isPreloading: preloaderState.isPreloading,
    isInitialized: preloaderState.isInitialized,
    lastPreloadTime: preloaderState.lastPreloadTime,
    preloadAttempts: preloaderState.preloadAttempts,
  };
};

// Force refresh all caches
export const forceRefreshAllCaches = async (): Promise<PreloadResults> => {
  logger.info('Force refreshing all caches...');
  return await preloadAppData(true);
};

// Check if data is stale and needs refresh
export const isDataStale = async (): Promise<boolean> => {
  const state = await loadPreloaderState();
  return shouldPreload(state);
}; 