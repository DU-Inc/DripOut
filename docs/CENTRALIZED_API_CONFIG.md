# Centralized API Configuration

## Overview

The DripOut app now uses a centralized API configuration system to manage all API endpoints in one place. This eliminates the need to hardcode IP addresses throughout the codebase and makes it easy to switch between different environments.

## Files Updated

### ✅ Centralized Configuration
- `src/Config/apiConfig.ts` - Main configuration file with all API URLs

### ✅ Services Updated to Use Centralized Config
- `src/services/recommendationService.ts` - Now imports `API_BASE_URL` from apiConfig
- `src/services/productService.ts` - Now imports `API_BASE_URL` from apiConfig

### ✅ Platform Configuration Files
- `android/app/src/main/res/xml/network_security_config.xml` - Updated with current IP
- `ios/DripOutApp/AppDelegate.mm` - Updated with current IP

## How It Works

### Environment Detection
The `apiConfig.ts` file automatically detects the environment and platform:

```typescript
const getApiBaseUrl = (): string => {
  // For production builds, use production URL
  if (__DEV__ === false) {
    return API_URLS.PRODUCTION;
  }
  
  // For development, detect platform and environment
  if (Platform.OS === 'ios') {
    return __DEV__ ? API_URLS.IOS_DEVICE : API_URLS.IOS_SIMULATOR;
  } else {
    return __DEV__ ? API_URLS.ANDROID_DEVICE : API_URLS.ANDROID_EMULATOR;
  }
};
```

### Available URLs
```typescript
const API_URLS = {
  IOS_SIMULATOR: 'http://localhost:8000',
  IOS_DEVICE: 'http://192.168.1.251:8000',
  ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  ANDROID_DEVICE: 'http://192.168.1.251:8000',
  PRODUCTION: 'https://your-production-api.com',
  STAGING: 'https://your-staging-api.com',
};
```

## Usage in Services

### Before (Hardcoded)
```typescript
const API_BASE_URL = 'http://192.168.1.225:8000';
```

### After (Centralized)
```typescript
import { API_BASE_URL } from '../Config/apiConfig';
```

## Updating IP Address

### Option 1: Manual Update
Update the IP addresses in `src/Config/apiConfig.ts`:
```typescript
IOS_DEVICE: 'http://YOUR_NEW_IP:8000',
ANDROID_DEVICE: 'http://YOUR_NEW_IP:8000',
```

### Option 2: Using the Utility Script
```bash
node utils/updateIpAddress.js 192.168.1.251
```

This script will automatically update:
- `src/Config/apiConfig.ts`
- `android/app/src/main/res/xml/network_security_config.xml`
- `ios/DripOutApp/AppDelegate.mm`

## Benefits

1. **Single Source of Truth**: All API URLs are defined in one place
2. **Easy Environment Switching**: Automatic detection of platform and environment
3. **No More Hardcoded IPs**: Services import the centralized configuration
4. **Easy Updates**: Change IP once, updates everywhere
5. **Production Ready**: Automatic switching to production URLs in release builds

## Adding New Services

When creating new services that need to make API calls:

1. Import the centralized configuration:
```typescript
import { API_BASE_URL, buildApiUrl } from '../Config/apiConfig';
```

2. Use the helper functions:
```typescript
// For simple endpoints
const url = `${API_BASE_URL}/your-endpoint`;

// For complex endpoints with the helper
const url = buildApiUrl('your-endpoint');
```

## Current Status

- ✅ `recommendationService.ts` - Updated to use centralized config
- ✅ `productService.ts` - Updated to use centralized config
- ✅ `newsService.ts` - Uses external APIs (correctly hardcoded)
- ✅ Platform configs - Updated with current IP

## Next Steps

1. Test the app to ensure all API calls work correctly
2. Update any remaining services that might have hardcoded URLs
3. Consider adding environment variables for even more flexibility 