import { Platform } from 'react-native';

// Centralized API Configuration
// Change these URLs once and they'll update across the entire app

const API_URLS = {
  // Local development URLs for different environments
  IOS_SIMULATOR: 'http://localhost:8000',
  IOS_DEVICE: 'http://192.168.1.224:8000', // Your computer's IP for iOS device testing
  ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  ANDROID_DEVICE: 'http://192.168.1.224:8000', // Your computer's IP for Android device testing
  
  // Production/Staging URLs (update these when deploying)
  PRODUCTION: 'https://your-production-api.com',
  STAGING: 'https://your-staging-api.com',
};

// Environment detection and URL selection
const getApiBaseUrl = (): string => {
  // For production builds, use production URL
  if (__DEV__ === false) {
    return API_URLS.PRODUCTION;
  }
  
  // For development, detect platform and environment
  if (Platform.OS === 'ios') {
    // iOS Simulator uses localhost, real device uses IP
    return __DEV__ ? API_URLS.IOS_DEVICE : API_URLS.IOS_SIMULATOR;
  } else {
    // Android Emulator uses 10.0.2.2, real device uses IP
    return __DEV__ ? API_URLS.ANDROID_DEVICE : API_URLS.ANDROID_EMULATOR;
  }
};

// Export the centralized API base URL
export const API_BASE_URL = getApiBaseUrl();

// Export individual URLs for reference/documentation
export { API_URLS };

// Helper function to build full API endpoints
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Export common API endpoints (add more as needed)
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  RECOMMENDATIONS: '/recommendations',
  SEARCH: '/search',
  USER_PREFERENCES: '/user-preferences',
};

console.log(`🌐 API Configuration: Using base URL: ${API_BASE_URL}`); 