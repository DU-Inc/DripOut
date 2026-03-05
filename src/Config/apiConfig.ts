import { Platform } from 'react-native';
import { API_BASE_URL as API_BASE_URL_ENV } from '@env';

// Centralized API Configuration
// Change these URLs once and they'll update across the entire app

const CLOUD_FALLBACK_URL = 'http://34.27.7.69:8000';
const NORMALIZED_ENV_API_BASE_URL = API_BASE_URL_ENV?.trim() || '';

const API_URLS = {
  // Local defaults for emulator/simulator workflows
  IOS_SIMULATOR: 'http://127.0.0.1:8000',
  IOS_DEVICE: NORMALIZED_ENV_API_BASE_URL || CLOUD_FALLBACK_URL,
  ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  ANDROID_DEVICE: NORMALIZED_ENV_API_BASE_URL || CLOUD_FALLBACK_URL,
  
  // Production/Staging URLs can be overridden by env
  PRODUCTION: NORMALIZED_ENV_API_BASE_URL || CLOUD_FALLBACK_URL,
  STAGING: NORMALIZED_ENV_API_BASE_URL || CLOUD_FALLBACK_URL,
};

// Environment detection and URL selection
const getApiBaseUrl = (): string => {
  // For production builds, use production URL
  if (__DEV__ === false) {
    return API_URLS.PRODUCTION;
  }
  
  if (NORMALIZED_ENV_API_BASE_URL) {
    return NORMALIZED_ENV_API_BASE_URL;
  }

  // For development, detect platform and environment
  if (Platform.OS === 'ios') {
    return API_URLS.IOS_SIMULATOR;
  } else {
    return API_URLS.ANDROID_EMULATOR;
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
