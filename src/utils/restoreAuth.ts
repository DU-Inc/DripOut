import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseconfig';
import { authCache } from './authCacheManager';

export const restoreAuthSession = async () => {
  try {
    // Try memory cache first for fastest response
    const cachedToken = await authCache.getToken();
    if (cachedToken) {
      console.log('Using cached token from memory');
      return cachedToken;
    }

    // Get token from AsyncStorage
    const asyncStorageToken = await AsyncStorage.getItem('firebaseUserToken');
    
    // Get token from Firebase Auth (if user is logged in)
    let currentUser = null;
    try {
      // Fix for linter error - use auth() function call
      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        currentUser = await firebaseUser.getIdToken(true);
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      // Continue with AsyncStorage token
    }

    // Determine which token to use (prefer Firebase's token if available)
    const finalToken = currentUser || asyncStorageToken;
    
    if (finalToken) {
      // Check if token should be expired based on inactivity or absolute timeout
      const lastActivityStr = await AsyncStorage.getItem('lastActivityTimestamp');
      const createTimeStr = await AsyncStorage.getItem('authCreateTimestamp');
      
      // Default to current time if timestamps are missing
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
      const createTime = createTimeStr ? parseInt(createTimeStr, 10) : Date.now();
      
      const now = Date.now();
      const INACTIVITY_TIMEOUT = 10 * 24 * 60 * 60 * 1000; // 10 days
      const ABSOLUTE_TIMEOUT = 190 * 24 * 60 * 60 * 1000; // 190 days
      
      const isInactive = now - lastActivity > INACTIVITY_TIMEOUT;
      const isExpired = now - createTime > ABSOLUTE_TIMEOUT;
      
      if (isInactive) {
        console.log('Auth session invalid due to inactivity');
        await authCache.invalidateCache();
        return null;
      }
      
      if (isExpired) {
        console.log('Auth session invalid due to absolute timeout');
        await authCache.invalidateCache();
        return null;
      }
      
      // Update cache with the valid token
      await authCache.setToken(finalToken);
      await authCache.updateLastActivity();
      return finalToken;
    }

    return null;
  } catch (error) {
    console.error('Error restoring auth session:', error);
    return null;
  }
};
