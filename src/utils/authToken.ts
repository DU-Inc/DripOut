import { auth } from '../Config/firebaseconfig';

/**
 * Get Firebase authentication token for API requests
 * @param forceRefresh - Whether to force token refresh (default: false)
 * @returns Promise with the token string, or null if user is not authenticated
 */
export const getAuthToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  try {
    const currentUser = auth().currentUser;
    
    if (!currentUser) {
      console.log('⚠️ No authenticated user found');
      return null;
    }
    
    const token = await currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    console.error('❌ Error getting Firebase token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return auth().currentUser !== null;
};


