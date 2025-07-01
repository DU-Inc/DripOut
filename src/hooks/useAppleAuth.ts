import { useState, useCallback } from 'react';
import { 
  signInWithApple, 
  isAppleAuthSupported, 
  revokeAppleTokenAndDeleteAccount,
  signInForAccountDeletion,
  AppleAuthResponse 
} from '../services/auth/appleAuthService';
import { Platform } from 'react-native';

export const useAppleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  // Check if Apple Sign In is supported on the device
  const checkSupport = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setIsSupported(false);
      return false;
    }
    
    try {
      const supported = await isAppleAuthSupported();
      setIsSupported(supported);
      return supported;
    } catch (err) {
      console.error('Error checking Apple Sign In support:', err);
      setIsSupported(false);
      return false;
    }
  }, []);

  // Sign in with Apple
  const signIn = useCallback(async (): Promise<AppleAuthResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      // Check if Apple Sign In is supported
      const supported = await checkSupport();
      if (!supported) {
        throw new Error('Apple Sign In is not supported on this device');
      }

      // Perform sign in
      const result = await signInWithApple();
      return result;
    } catch (err: any) {
      setError(err.message || 'An error occurred during Apple Sign In');
      return null;
    } finally {
      setLoading(false);
    }
  }, [checkSupport]);

  // Delete account function
  const deleteAccount = useCallback(async (authorizationCode?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!authorizationCode) {
        // Need to get fresh authorization code
        console.log('Getting fresh authorization code for account deletion...');
        const newAuthCode = await signInForAccountDeletion();
        await revokeAppleTokenAndDeleteAccount(newAuthCode);
      } else {
        await revokeAppleTokenAndDeleteAccount(authorizationCode);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during account deletion');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    signIn,
    deleteAccount,
    loading,
    error,
    isSupported,
    checkSupport
  };
};

export default useAppleAuth; 