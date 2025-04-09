import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthCache {
    token: string | null;
    lastActivity: number;
    isValid: boolean;
}

class AuthCacheManager {
    private static instance: AuthCacheManager;
    private cache: AuthCache | null = null;
    
    // Extended timeout settings (10 hours inactivity as requested, 190 days absolute)
    private readonly INACTIVITY_TIMEOUT = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
    private readonly ABSOLUTE_TIMEOUT = 190 * 24 * 60 * 60 * 1000; // 190 days in milliseconds
    // Keeping the previous timeout for backward compatibility
    private readonly CACHE_DURATION = 10 * 60 * 60 * 1000; // 10 hours (updated from 5 hours)

    private constructor() {
        // Initialize cache from storage when constructed
        this.loadFromStorage();
    }

    static getInstance(): AuthCacheManager {
        if (!AuthCacheManager.instance) {
            AuthCacheManager.instance = new AuthCacheManager();
        }
        return AuthCacheManager.instance;
    }

    // Load authentication data from AsyncStorage on initialization
    private async loadFromStorage(): Promise<void> {
        try {
            const token = await AsyncStorage.getItem('firebaseUserToken');
            const lastActivityStr = await AsyncStorage.getItem('lastActivityTimestamp');
            const createTimeStr = await AsyncStorage.getItem('authCreateTimestamp');
            
            if (token && lastActivityStr) {
                const lastActivity = parseInt(lastActivityStr, 10);
                const createTime = createTimeStr ? parseInt(createTimeStr, 10) : Date.now();
                
                this.cache = {
                    token,
                    lastActivity,
                    isValid: true
                };
                
                // Validate the loaded cache immediately
                if (!this.isValidCache()) {
                    this.invalidateCache();
                }
            }
        } catch (error) {
            console.error('Error loading auth cache from storage:', error);
            this.invalidateCache();
        }
    }

    async getToken(): Promise<string | null> {
        if (this.isValidCache()) {
            return this.cache?.token || null;
        }
        return null;
    }

    async setToken(token: string | null): Promise<void> {
        const now = Date.now();
        
        this.cache = {
            token,
            lastActivity: now,
            isValid: true,
        };
        
        // Save to AsyncStorage
        if (token) {
            try {
                // Store token, activity time, and creation time
                await Promise.all([
                    AsyncStorage.setItem('firebaseUserToken', token),
                    AsyncStorage.setItem('lastActivityTimestamp', now.toString()),
                    // Only set create timestamp if it doesn't exist
                    AsyncStorage.getItem('authCreateTimestamp').then(existingTimestamp => {
                        if (!existingTimestamp) {
                            return AsyncStorage.setItem('authCreateTimestamp', now.toString());
                        }
                    })
                ]);
            } catch (error) {
                console.error('Error saving auth token to storage:', error);
            }
        }
    }

    private isValidCache(): boolean {
        if (!this.cache) return false;
        
        const now = Date.now();
        
        // For backward compatibility, check using the shorter CACHE_DURATION first
        const isExpiredShort = now - this.cache.lastActivity > this.CACHE_DURATION;
        
        // Check for inactivity timeout (longer duration)
        const isInactive = now - this.cache.lastActivity > this.INACTIVITY_TIMEOUT;
        
        if (isExpiredShort || isInactive) {
            console.log(`Auth token invalidated: ${isExpiredShort ? 'Short timeout' : 'Inactivity'}`);
            this.invalidateCache();
            return false;
        }
        
        return this.cache.isValid;
    }

    // Additional method for async validation including absolute timeout
    async validateWithAbsoluteTimeout(): Promise<boolean> {
        if (!this.cache) return false;
        
        const now = Date.now();
        
        // Check for inactivity timeout
        const isInactive = now - this.cache.lastActivity > this.INACTIVITY_TIMEOUT;
        
        // Check for absolute timeout (from creation date)
        const createTimeStr = await AsyncStorage.getItem('authCreateTimestamp');
        const createTime = createTimeStr ? parseInt(createTimeStr, 10) : null;
        const isExpired = createTime ? (now - createTime) > this.ABSOLUTE_TIMEOUT : false;

        if (isInactive || isExpired) {
            console.log(`Auth token invalidated: ${isInactive ? 'Inactive' : 'Expired'}`);
            await this.invalidateCache();
            return false;
        }
        
        return this.cache.isValid;
    }

    async invalidateCache(): Promise<void> {
        this.cache = null;
        
        try {
            // Clear all auth-related data from storage
            await Promise.all([
                AsyncStorage.removeItem('firebaseUserToken'),
                AsyncStorage.removeItem('lastActivityTimestamp'),
                AsyncStorage.removeItem('authCreateTimestamp')
            ]);
        } catch (error) {
            console.error('Error clearing auth cache from storage:', error);
        }
    }

    async updateLastActivity(): Promise<void> {
        if (this.cache) {
            const now = Date.now();
            this.cache.lastActivity = now;
            
            // Update last activity in storage
            try {
                await AsyncStorage.setItem('lastActivityTimestamp', now.toString());
            } catch (error) {
                console.error('Error updating last activity timestamp:', error);
            }
        }
    }
}

export const authCache = AuthCacheManager.getInstance();