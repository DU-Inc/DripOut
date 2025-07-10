/**
 * Tab Prefetch Service
 * Intelligently preloads data for adjacent tabs to improve navigation performance
 */

import { InteractionManager } from 'react-native';
import { memoryCache } from './memoryCache';

// Tab names and their adjacent tabs for prefetching
const TAB_ADJACENCY_MAP = {
  'Home': ['Social', 'Discover'],
  'Social': ['Home', 'Discover'],
  'Discover': ['Social', '3D'],
  '3D': ['Discover', 'Closet'],
  'Closet': ['3D', 'Profile'],
  'Profile': ['Closet']
};

// Data loaders for each tab
type TabDataLoader = {
  key: string;
  loader: () => Promise<any>;
  ttl: number;
  priority: 'high' | 'medium' | 'low';
};

interface TabDataLoaders {
  [tabName: string]: TabDataLoader[];
}

class TabPrefetchService {
  private isEnabled = true;
  private prefetchInProgress = new Set<string>();
  private lastActiveTab: string | null = null;
  
  /**
   * Register data loaders for tabs
   */
  private tabDataLoaders: TabDataLoaders = {
    'Social': [
      {
        key: 'social_posts',
        loader: async () => {
          // Import dynamically to avoid circular dependencies
          const { fetchPosts } = await import('./postService');
          return await fetchPosts();
        },
        ttl: 10 * 60 * 1000, // 10 minutes
        priority: 'high'
      }
    ],
    'Discover': [
      {
        key: 'trending_products',
        loader: async () => {
          const { getTrendingProducts } = await import('./productCache');
          // For prefetch, we need a user ID - this would come from auth state
          const userId = 'prefetch_user'; // TODO: Get from auth context
          return await getTrendingProducts(false, userId);
        },
        ttl: 30 * 60 * 1000, // 30 minutes
        priority: 'high'
      },
      {
        key: 'new_drops',
        loader: async () => {
          const { getNewDropsProducts } = await import('./productCache');
          const userId = 'prefetch_user'; // TODO: Get from auth context
          return await getNewDropsProducts(false, userId);
        },
        ttl: 3 * 60 * 60 * 1000, // 3 hours
        priority: 'medium'
      }
    ],
    'Profile': [
      {
        key: 'user_profile',
        loader: async () => {
          const { getUserProfile } = await import('./firestoreService');
          const userId = 'current_user'; // TODO: Get from auth context
          return await getUserProfile(userId);
        },
        ttl: 60 * 60 * 1000, // 1 hour
        priority: 'high'
      }
    ],
    '3D': [
      {
        key: 'avatar_data',
        loader: async () => {
          // Placeholder for 3D avatar data loading
          return { avatarLoaded: true, timestamp: Date.now() };
        },
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        priority: 'low'
      }
    ]
  };

  /**
   * Enable or disable prefetching
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.prefetchInProgress.clear();
    }
  }

  /**
   * Called when user switches to a new tab
   */
  onTabFocus(tabName: string): void {
    if (!this.isEnabled) return;

    console.log(`🔄 Tab focused: ${tabName}`);
    this.lastActiveTab = tabName;

    // Schedule prefetch for adjacent tabs after interactions complete
    InteractionManager.runAfterInteractions(() => {
      this.prefetchAdjacentTabs(tabName);
    });
  }

  /**
   * Prefetch data for tabs adjacent to the current tab
   */
  private async prefetchAdjacentTabs(currentTab: string): Promise<void> {
    const adjacentTabs = TAB_ADJACENCY_MAP[currentTab as keyof typeof TAB_ADJACENCY_MAP];
    
    if (!adjacentTabs) {
      console.log(`No adjacent tabs defined for ${currentTab}`);
      return;
    }

    console.log(`🚀 Starting prefetch for tabs adjacent to ${currentTab}: [${adjacentTabs.join(', ')}]`);

    // Prefetch data for each adjacent tab
    const prefetchPromises = adjacentTabs.map(tabName => 
      this.prefetchTabData(tabName)
    );

    try {
      await Promise.allSettled(prefetchPromises);
      console.log(`✅ Completed prefetch for tabs adjacent to ${currentTab}`);
    } catch (error) {
      console.warn('Some prefetch operations failed:', error);
    }
  }

  /**
   * Prefetch data for a specific tab
   */
  private async prefetchTabData(tabName: string): Promise<void> {
    const dataLoaders = this.tabDataLoaders[tabName];
    
    if (!dataLoaders || dataLoaders.length === 0) {
      console.log(`No data loaders defined for tab: ${tabName}`);
      return;
    }

    console.log(`🔄 Prefetching data for tab: ${tabName} (${dataLoaders.length} loaders)`);

    // Sort loaders by priority (high first)
    const sortedLoaders = [...dataLoaders].sort((a, b) => {
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Execute loaders based on priority
    for (const loader of sortedLoaders) {
      if (this.prefetchInProgress.has(loader.key)) {
        console.log(`⏭️ Prefetch already in progress for: ${loader.key}`);
        continue;
      }

      try {
        this.prefetchInProgress.add(loader.key);
        
        // Check if data is already in memory cache
        const existing = await memoryCache.get(loader.key);
        if (existing) {
          console.log(`🎯 Data already cached for: ${loader.key}`);
          continue;
        }

        console.log(`🔄 Prefetching: ${loader.key} (priority: ${loader.priority})`);
        
        // Load data and cache it
        const data = await loader.loader();
        if (data) {
          await memoryCache.set(loader.key, data, loader.ttl);
          console.log(`✅ Prefetched and cached: ${loader.key}`);
        }
      } catch (error) {
        console.warn(`❌ Prefetch failed for ${loader.key}:`, error);
      } finally {
        this.prefetchInProgress.delete(loader.key);
      }
    }
  }

  /**
   * Preload data for a specific tab (called manually)
   */
  async preloadTab(tabName: string): Promise<void> {
    console.log(`🎯 Manual preload requested for tab: ${tabName}`);
    await this.prefetchTabData(tabName);
  }

  /**
   * Clear prefetch cache for a specific tab
   */
  async clearTabCache(tabName: string): Promise<void> {
    const dataLoaders = this.tabDataLoaders[tabName];
    
    if (!dataLoaders) return;

    console.log(`🧹 Clearing cache for tab: ${tabName}`);
    
    for (const loader of dataLoaders) {
      await memoryCache.delete(loader.key);
    }
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    isEnabled: boolean;
    prefetchInProgress: string[];
    lastActiveTab: string | null;
    cacheStats: any;
  } {
    return {
      isEnabled: this.isEnabled,
      prefetchInProgress: Array.from(this.prefetchInProgress),
      lastActiveTab: this.lastActiveTab,
      cacheStats: memoryCache.getStats()
    };
  }

  /**
   * Register custom data loader for a tab
   */
  registerTabDataLoader(
    tabName: string, 
    loader: Omit<TabDataLoader, 'key'> & { key: string }
  ): void {
    if (!this.tabDataLoaders[tabName]) {
      this.tabDataLoaders[tabName] = [];
    }
    
    this.tabDataLoaders[tabName].push(loader);
    console.log(`📝 Registered data loader for ${tabName}: ${loader.key}`);
  }
}

// Global instance
export const tabPrefetchService = new TabPrefetchService();

// Convenience functions
export const onTabFocus = (tabName: string) => tabPrefetchService.onTabFocus(tabName);
export const preloadTab = (tabName: string) => tabPrefetchService.preloadTab(tabName);
export const enablePrefetch = (enabled: boolean) => tabPrefetchService.setEnabled(enabled);
export const getPrefetchStats = () => tabPrefetchService.getStats();