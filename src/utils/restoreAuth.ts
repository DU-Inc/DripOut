import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';
import { authCache } from './authCacheManager';

export const restoreAuthSession = async () => {
  try {
    // Try memory cache first
    const cachedToken = await authCache.getToken();
    if (cachedToken) {
      console.log('Using cached token');
      return cachedToken;
    }

    // Start both operations in parallel
    const [asyncStorageToken, currentUser] = await Promise.all([
      AsyncStorage.getItem('firebaseUserToken'),
      auth.currentUser?.getIdToken(true)
    ]);

    // Determine which token to use (prefer Firebase's token if available)
    const finalToken = currentUser || asyncStorageToken;
    
    if (finalToken) {
      // Update cache with the valid token
      await authCache.setToken(finalToken);
      return finalToken;
    }

    return null;
  } catch (error) {
    console.error('Error restoring auth session:', error);
    return null;
  }
};
