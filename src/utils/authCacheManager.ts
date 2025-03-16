import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthCache {
    token: string | null;
    lastActivity: number;
    isValid: boolean;
}

class AuthCacheManager {
    private static instance: AuthCacheManager;
    private cache: AuthCache | null = null;
    private readonly CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours



    private constructor() {
    }


    static getInstance(): AuthCacheManager {
        if (!AuthCacheManager.instance) {
            AuthCacheManager.instance = new AuthCacheManager();
        }
        return AuthCacheManager.instance;
    }

    async getToken(): Promise<string | null> {
        if (this.isValidCache()) {
            return this.cache?.token || null;
        }
        return null;
    }

    async setToken(token: string | null): Promise<void> {
        this.cache = {
            token,
            lastActivity: Date.now(),
            isValid: true,
        };
        
    }

    private isValidCache(): boolean {
        if (!this.cache) return false;
        const now = Date.now();
        const isExpired = now - this.cache.lastActivity > this.CACHE_DURATION;

        if (isExpired) {
            this.invalidateCache();
            return false;
        }
        return this.cache.isValid;
    }

    invalidateCache(): void {
        this.cache = null;
    }

    updateLastActivity(): void {
        if (this.cache) {
            this.cache.lastActivity = Date.now();
        }
    }
}

export const authCache = AuthCacheManager.getInstance();