import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { isBiometricAuthEnabled, setBiometricAuth } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

// Initialize biometrics instance
const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true, // Allow PIN/pattern/password as fallback
});

// Check if device supports biometrics
const checkBiometricsSupport = async (): Promise<{available: boolean, biometryType: string}> => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType: biometryType || '' };
  } catch (error) {
    console.error('Error checking biometrics support:', error);
    return { available: false, biometryType: '' };
  }
};

// Helper to get label based on biometry type and platform
const getBiometricLabel = (biometryType: string): string => {
  if (!biometryType) {
    if (Platform.OS === 'ios') {
      return 'Face ID / Touch ID';
    } else {
      return 'Biometric Authentication';
    }
  }
  
  switch (biometryType) {
    case BiometryTypes.FaceID:
      return 'Face ID';
    case BiometryTypes.TouchID:
      return 'Touch ID';
    case BiometryTypes.Biometrics:
      return 'Biometrics';
    default:
      return 'Biometric Authentication';
  }
};

declare const setInterval: (callback: () => void, ms: number) => number;
declare const clearInterval: (id: number) => void;

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [failureCount, setFailureCount] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Check device capabilities and user preferences
  useEffect(() => {
    const checkBiometrics = async () => {
      setIsLoading(true);
      try {
        // Check if device supports biometrics
        const { available, biometryType } = await checkBiometricsSupport();
        setIsAvailable(available);
        
        // If supported, check if user has enabled biometric login
        if (available) {
          const enabled = await isBiometricAuthEnabled();
          setIsEnabled(enabled);
          
          // Set biometric type based on device capabilities
          setBiometricType(getBiometricLabel(biometryType));
          
          // Reset failure count if previously stored
          const storedFailureCount = await AsyncStorage.getItem('biometricFailureCount');
          if (storedFailureCount) {
            const count = parseInt(storedFailureCount, 10);
            setFailureCount(count);
            setIsLocked(count >= 5);
          }
        }
      } catch (error) {
        console.error('Error checking biometric support:', error);
        setIsAvailable(false);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkBiometrics();
  }, []);

  // Add a new useEffect to periodically check biometric availability status
  useEffect(() => {
    let checkIntervalId: number;
    
    // Setup a periodic check for biometric status
    // This helps detect when a user disables biometrics in device settings
    const periodicBiometricCheck = async () => {
      try {
        // Check if device still supports biometrics
        const { available, biometryType } = await checkBiometricsSupport();
        
        // If availability changed, update the state
        if (isAvailable !== available) {
          setIsAvailable(available);
          
          // If biometrics are no longer available but were enabled, disable them
          if (!available && isEnabled) {
            setIsEnabled(false);
            
            // Clear stored credentials for security
            await AsyncStorage.removeItem('biometricAuthIdentifier');
            await AsyncStorage.removeItem('biometricAuthPassword');
            
            // Reset failure count
            setFailureCount(0);
            await AsyncStorage.setItem('biometricFailureCount', '0');
            setIsLocked(false);
          }
        }
        
        // Update biometric type if changed
        if (biometryType && getBiometricLabel(biometryType) !== biometricType) {
          setBiometricType(getBiometricLabel(biometryType));
        }
      } catch (error) {
        console.error('Error checking biometric status:', error);
      }
    };
    
    // Run once immediately
    periodicBiometricCheck();
    
    // Then set up interval
    checkIntervalId = setInterval(periodicBiometricCheck, 10000) as unknown as number; // Check every 10 seconds
    
    return () => {
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
      }
    };
  }, [isAvailable, isEnabled, biometricType]);

  // Function to authenticate using biometrics
  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !isEnabled || isLocked) {
      return false;
    }
    
    try {
      // Use the react-native-biometrics library to authenticate
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate to continue',
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use device credentials'
      });
      
      if (success) {
        // Reset failure count on successful authentication
        setFailureCount(0);
        await AsyncStorage.setItem('biometricFailureCount', '0');
        
        // In a real implementation, retrieve the securely stored credentials
        const storedEmail = await AsyncStorage.getItem('biometricAuthIdentifier');
        const storedPassword = await AsyncStorage.getItem('biometricAuthPassword');
        
        if (storedEmail && storedPassword) {
          // Return true to indicate successful authentication
          return true;
        } else {
          console.error('Biometric credentials not found');
          return false;
        }
      } else {
        // Increment failure count on authentication cancellation or failure
        const newFailureCount = failureCount + 1;
        setFailureCount(newFailureCount);
        await AsyncStorage.setItem('biometricFailureCount', newFailureCount.toString());
        
        // Lock biometric authentication after 5 consecutive failures
        if (newFailureCount >= 5) {
          setIsLocked(true);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      
      // Increment failure count on error
      const newFailureCount = failureCount + 1;
      setFailureCount(newFailureCount);
      await AsyncStorage.setItem('biometricFailureCount', newFailureCount.toString());
      
      // Lock biometric authentication after 5 consecutive failures
      if (newFailureCount >= 5) {
        setIsLocked(true);
      }
      
      return false;
    }
  }, [isAvailable, isEnabled, isLocked, failureCount]);

  // Function to store credentials for biometric auth
  const storeCredentialsForBiometrics = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // In a real implementation, credentials should be encrypted
      // Check if device has biometrics hardware before storing
      const { available } = await checkBiometricsSupport();
      if (!available) {
        return false;
      }
      
      // Store credentials in AsyncStorage
      await AsyncStorage.setItem('biometricAuthIdentifier', email);
      await AsyncStorage.setItem('biometricAuthPassword', password);
      
      // Reset failure count when storing new credentials
      setFailureCount(0);
      await AsyncStorage.setItem('biometricFailureCount', '0');
      setIsLocked(false);
      
      return true;
    } catch (error) {
      console.error('Error storing credentials for biometric auth:', error);
      return false;
    }
  }, []);

  // Function to enable/disable biometric authentication
  const toggleBiometricAuth = useCallback(async (enabled: boolean, userId?: string): Promise<boolean> => {
    try {
      // Update local state
      setIsEnabled(enabled);
      
      // Update user preference in database if userId provided
      if (userId) {
        await setBiometricAuth(userId, enabled);
      }
      
      // If disabling, clear stored credentials
      if (!enabled) {
        await AsyncStorage.removeItem('biometricAuthIdentifier');
        await AsyncStorage.removeItem('biometricAuthPassword');
        
        // Reset failure count when disabling
        setFailureCount(0);
        await AsyncStorage.setItem('biometricFailureCount', '0');
        setIsLocked(false);
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
      return false;
    }
  }, []);

  // Function to reset the failure count (call this after successful sign in)
  const resetFailureCount = useCallback(async (): Promise<void> => {
    setFailureCount(0);
    setIsLocked(false);
    await AsyncStorage.setItem('biometricFailureCount', '0');
  }, []);

  return {
    isAvailable,
    isEnabled,
    isLoading,
    biometricType,
    isLocked,
    failureCount,
    authenticateWithBiometrics,
    storeCredentialsForBiometrics,
    toggleBiometricAuth,
    resetFailureCount
  };
}; 