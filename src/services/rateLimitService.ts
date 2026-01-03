import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';

/**
 * Rate Limiting Service for Beta Features
 * 
 * Manages usage limits for:
 * - Fashion Advisor Chat: 5 requests per 6 hours
 * - 3D Try-On: 5 try-on sessions per 6 hours
 * 
 * Each feature has independent counters and reset cycles.
 */

export enum FeatureType {
  FASHION_ADVISOR = 'fashionAdvisor',
  TRY_ON = 'tryOn'
}

interface UsageLimit {
  count: number;              // Current usage count
  lastResetTime: number;      // Timestamp of last reset (ms)
  limit: number;             // Maximum allowed requests
  resetIntervalHours: number; // Reset period in hours
}

interface RateLimitResult {
  allowed: boolean;          // Whether action is allowed
  remainingCount: number;    // Remaining requests
  timeUntilReset: number;   // Time until reset in milliseconds
  totalLimit: number;       // Total limit for this feature
}

class RateLimitService {
  private readonly DEFAULT_LIMITS = {
    [FeatureType.FASHION_ADVISOR]: {
      limit: 5,
      resetIntervalHours: 6
    },
    [FeatureType.TRY_ON]: {
      limit: 5,
      resetIntervalHours: 6
    }
  };

  /**
   * Get storage key for a specific feature and user
   */
  private getStorageKey(featureType: FeatureType): string {
    const userId = auth().currentUser?.uid || 'anonymous';
    return `rateLimits_${featureType}_${userId}`;
  }

  /**
   * Get current usage data for a feature
   */
  private async getUsageData(featureType: FeatureType): Promise<UsageLimit> {
    const key = this.getStorageKey(featureType);
    const defaults = this.DEFAULT_LIMITS[featureType];
    
    try {
      const storedData = await AsyncStorage.getItem(key);
      
      if (storedData) {
        const parsed: UsageLimit = JSON.parse(storedData);
        
        // Check if we need to reset (6 hours have passed)
        const now = Date.now();
        const timeSinceReset = now - parsed.lastResetTime;
        const resetIntervalMs = parsed.resetIntervalHours * 60 * 60 * 1000;
        
        if (timeSinceReset >= resetIntervalMs) {
          // Reset the counter
          const resetData: UsageLimit = {
            count: 0,
            lastResetTime: now,
            limit: defaults.limit,
            resetIntervalHours: defaults.resetIntervalHours
          };
          
          await AsyncStorage.setItem(key, JSON.stringify(resetData));
          console.log(`✅ RateLimit: Reset ${featureType} counter after ${Math.round(timeSinceReset / (60 * 60 * 1000))} hours`);
          return resetData;
        }
        
        return parsed;
      }
    } catch (error) {
      console.error(`❌ RateLimit: Error reading usage data for ${featureType}:`, error);
    }
    
    // Return default data if no stored data or error
    const defaultData: UsageLimit = {
      count: 0,
      lastResetTime: Date.now(),
      limit: defaults.limit,
      resetIntervalHours: defaults.resetIntervalHours
    };
    
    await this.saveUsageData(featureType, defaultData);
    return defaultData;
  }

  /**
   * Save usage data for a feature
   */
  private async saveUsageData(featureType: FeatureType, data: UsageLimit): Promise<void> {
    const key = this.getStorageKey(featureType);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ RateLimit: Error saving usage data for ${featureType}:`, error);
    }
  }

  /**
   * Check if an action is allowed for a specific feature
   */
  async checkLimit(featureType: FeatureType): Promise<RateLimitResult> {
    const usageData = await this.getUsageData(featureType);
    const allowed = usageData.count < usageData.limit;
    const remainingCount = Math.max(0, usageData.limit - usageData.count);
    
    // Calculate time until reset
    const now = Date.now();
    const resetIntervalMs = usageData.resetIntervalHours * 60 * 60 * 1000;
    const timeUntilReset = Math.max(0, resetIntervalMs - (now - usageData.lastResetTime));
    
    console.log(`🔍 RateLimit: ${featureType} check - Count: ${usageData.count}/${usageData.limit}, Remaining: ${remainingCount}, Reset in: ${Math.round(timeUntilReset / (60 * 1000))}min`);
    
    return {
      allowed,
      remainingCount,
      timeUntilReset,
      totalLimit: usageData.limit
    };
  }

  /**
   * Increment usage count for a feature (call after successful action)
   */
  async incrementUsage(featureType: FeatureType): Promise<void> {
    const usageData = await this.getUsageData(featureType);
    
    if (usageData.count < usageData.limit) {
      usageData.count += 1;
      await this.saveUsageData(featureType, usageData);
      console.log(`📈 RateLimit: Incremented ${featureType} usage to ${usageData.count}/${usageData.limit}`);
    } else {
      console.warn(`⚠️ RateLimit: Attempted to increment ${featureType} usage but limit already reached`);
    }
  }

  /**
   * Get remaining request count for a feature
   */
  async getRemainingCount(featureType: FeatureType): Promise<number> {
    const result = await this.checkLimit(featureType);
    return result.remainingCount;
  }

  /**
   * Get time until reset in milliseconds
   */
  async getTimeUntilReset(featureType: FeatureType): Promise<number> {
    const result = await this.checkLimit(featureType);
    return result.timeUntilReset;
  }

  /**
   * Get time until reset formatted as human-readable string
   */
  async getTimeUntilResetFormatted(featureType: FeatureType): Promise<string> {
    const timeMs = await this.getTimeUntilReset(featureType);
    
    if (timeMs <= 0) {
      return 'Available now';
    }
    
    const hours = Math.floor(timeMs / (60 * 60 * 1000));
    const minutes = Math.floor((timeMs % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Manually reset usage for a feature (for testing/admin purposes)
   */
  async resetUsage(featureType: FeatureType): Promise<void> {
    const defaults = this.DEFAULT_LIMITS[featureType];
    const resetData: UsageLimit = {
      count: 0,
      lastResetTime: Date.now(),
      limit: defaults.limit,
      resetIntervalHours: defaults.resetIntervalHours
    };
    
    await this.saveUsageData(featureType, resetData);
    console.log(`🔄 RateLimit: Manually reset ${featureType} usage`);
  }

  /**
   * Clear all rate limit data (for logout/cleanup)
   */
  async clearAllData(): Promise<void> {
    try {
      const keys = [
        this.getStorageKey(FeatureType.FASHION_ADVISOR),
        this.getStorageKey(FeatureType.TRY_ON)
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log('🧹 RateLimit: Cleared all rate limit data');
    } catch (error) {
      console.error('❌ RateLimit: Error clearing data:', error);
    }
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Export types for use in components
export type { RateLimitResult };