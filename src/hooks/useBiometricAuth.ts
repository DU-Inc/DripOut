import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { isBiometricAuthEnabled } from '../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This is a placeholder - in a real implementation we would use a proper biometrics library
// such as react-native-biometrics or react-native-touch-id
const mockBiometricAuth = async (): Promise<boolean> => {
  // Simulate biometric auth with a prompt
  return new Promise((resolve) => {
    Alert.alert(
      'Biometric Authentication',
      'This is a simulated biometric authentication prompt. In a real app, this would use the device\'s biometric sensors.',
      [
        {
          text: 'Cancel',
          onPress: () => resolve(false),
          style: 'cancel',
        },
        {
          text: 'Authenticate',
          onPress: () => resolve(true),
        },
      ]
    );
  });
};

// Check if device supports biometrics
const checkBiometricsSupport = async (): Promise<boolean> => {
  // In a real implementation, we would check device capabilities
  // For now, assume all devices support it for development purposes
  return true;
};

// Helper to get label based on platform
const getBiometricLabel = (): string => {
  if (Platform.OS === 'ios') {
    return 'Face ID / Touch ID';
  } else {
    return 'Biometric Authentication';
  }
};

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check device capabilities and user preferences
  useEffect(() => {
    const checkBiometrics = async () => {
      setIsLoading(true);
      try {
        // Check if device supports biometrics
        const supported = await checkBiometricsSupport();
        setIsAvailable(supported);
        
        // If supported, check if user has enabled biometric login
        if (supported) {
          const enabled = await isBiometricAuthEnabled();
          setIsEnabled(enabled);
          
          // Set biometric type based on platform
          setBiometricType(getBiometricLabel());
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

  // Function to authenticate using biometrics
  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !isEnabled) {
      return false;
    }
    
    try {
      // In a real implementation, this would use the actual biometric API
      // For now, we'll just simulate the authentication
      const authenticated = await mockBiometricAuth();
      
      if (authenticated) {
        // In a real implementation, we would retrieve the securely stored credentials
        // and use them to authenticate
        const storedEmail = await AsyncStorage.getItem('biometricAuthEmail');
        const storedPassword = await AsyncStorage.getItem('biometricAuthPassword');
        
        if (storedEmail && storedPassword) {
          // Return true to indicate successful authentication
          // (in the actual implementation, we'd use the credentials)
          return true;
        } else {
          console.error('Biometric credentials not found');
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }, [isAvailable, isEnabled]);

  // Function to store credentials for biometric auth
  const storeCredentialsForBiometrics = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // In a real implementation, these credentials would be encrypted 
      // using a secure storage system like the Keychain on iOS or KeyStore on Android
      await AsyncStorage.setItem('biometricAuthEmail', email);
      await AsyncStorage.setItem('biometricAuthPassword', password);
      return true;
    } catch (error) {
      console.error('Error storing credentials for biometric auth:', error);
      return false;
    }
  }, []);

  return {
    isAvailable,
    isEnabled,
    isLoading,
    biometricType,
    authenticateWithBiometrics,
    storeCredentialsForBiometrics
  };
}; 