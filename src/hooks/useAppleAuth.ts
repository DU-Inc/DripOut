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
      console.log('🍎 useAppleAuth: Starting Apple Sign-In process...');
      setLoading(true);
      setError(null);

      // Check if Apple Sign In is supported
      console.log('🍎 useAppleAuth: Checking device support...');
      const supported = await checkSupport();
      if (!supported) {
        console.error('❌ useAppleAuth: Apple Sign-In not supported on this device');
        throw new Error('Apple Sign In is not supported on this device');
      }
      console.log('✅ useAppleAuth: Device supports Apple Sign-In');

      // Perform sign in
      console.log('🍎 useAppleAuth: Calling signInWithApple service...');
      const result = await signInWithApple();
      console.log('✅ useAppleAuth: Apple Sign-In completed successfully');
      return result;
    } catch (err: any) {
      console.error('❌ useAppleAuth: Error in sign-in process:', err.message);
      setError(err.message || 'An error occurred during Apple Sign In');
      return null;
    } finally {
      setLoading(false);
      console.log('🍎 useAppleAuth: Sign-in process finished');
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