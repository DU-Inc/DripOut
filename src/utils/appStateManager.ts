import { AppState, AppStateStatus } from 'react-native';
import { authCache } from './authCacheManager';

class AppStateManager {
  private static instance: AppStateManager;
  private lastActiveTimestamp: number = Date.now();
  private readonly BACKGROUND_THRESHOLD = 5 * 60 * 60 * 1000; // 5 hours
  private subscription: any; // Store the subscription

  
  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  private setupAppStateListener(): void {
    // New way to add event listener, returns a subscription
    this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground
      const now = Date.now();
      const inactiveTime = now - this.lastActiveTimestamp;

      if (inactiveTime >= this.BACKGROUND_THRESHOLD) {
        // Been in background too long, invalidate cache
        authCache.invalidateCache();
      } else {
        // Update last activity
        authCache.updateLastActivity();
      }
    }
    
    if (nextAppState === 'background') {
      // App went to background
      this.lastActiveTimestamp = Date.now();
    }
  };

  cleanup(): void {
    // New way to remove event listener using the subscription
    this.subscription.remove();
  }
}

export const appStateManager = AppStateManager.getInstance(); 