import { Platform } from 'react-native';

// Centralized API Configuration
// Change these URLs once and they'll update across the entire app

const API_URLS = {
  // All environments now use the production API server
  IOS_SIMULATOR: 'http://34.27.7.69:8000',
  IOS_DEVICE: 'http://34.27.7.69:8000',
  ANDROID_EMULATOR: 'http://34.27.7.69:8000',
  ANDROID_DEVICE: 'http://34.27.7.69:8000',
  
  // Production/Staging URLs
  PRODUCTION: 'http://34.27.7.69:8000',
  STAGING: 'http://34.27.7.69:8000',
};

// Environment detection and URL selection
const getApiBaseUrl = (): string => {
  // For production builds, use production URL
  if (__DEV__ === false) {
    return API_URLS.PRODUCTION;
  }
  
  // For development, detect platform and environment
  if (Platform.OS === 'ios') {
    // iOS Simulator uses localhost, real device uses localhost (will be auto-detected)
    return API_URLS.IOS_DEVICE;
  } else {
    // Android Emulator uses 10.0.2.2, real device uses localhost (will be auto-detected)
    return __DEV__ ? API_URLS.ANDROID_DEVICE : API_URLS.ANDROID_EMULATOR;
  }
};

// Export the centralized API base URL
export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API endpoints
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Development helper: Get your computer's IP address for device testing
export const getDevelopmentIP = (): string => {
  // This will be automatically detected by React Native's development server
  // For manual override, you can set this environment variable
  return 'localhost'; // Default to localhost, can be overridden via environment
};

// Log the current configuration for debugging
console.log(`🌐 API Configuration: Using base URL: ${API_BASE_URL}`);
console.log(`🌐 Development IP: ${getDevelopmentIP()}`);
console.log(`🌐 Platform: ${Platform.OS}`);
console.log(`🌐 Environment: ${__DEV__ ? 'Development' : 'Production'}`); 