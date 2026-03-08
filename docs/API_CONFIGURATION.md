# API Configuration

## Overview

The DripOut app now uses a centralized API configuration system located in `src/Config/apiConfig.ts`. This ensures that API URLs are managed in one place and automatically adapt to different environments.

## Quick Setup

To change the API URL for your development environment:

1. Open `src/Config/apiConfig.ts`
2. Update the IP address in the `API_URLS` object:

```typescript
const API_URLS = {
  IOS_DEVICE: 'http://YOUR_COMPUTER_IP:8000',        // ← Change this
  ANDROID_DEVICE: 'http://YOUR_COMPUTER_IP:8000',    // ← Change this
  // ... other configurations
};
```

3. Replace `YOUR_COMPUTER_IP` with your actual computer's IP address
4. Restart the app

## How It Works

The configuration automatically detects:
- **Platform**: iOS vs Android
- **Environment**: Development vs Production
- **Device Type**: Simulator/Emulator vs Physical Device

And selects the appropriate API URL accordingly.

## Environment Detection

| Environment | Platform | URL Used |
|-------------|----------|----------|
| Development | iOS Simulator | `http://localhost:8000` |
| Development | iOS Device | `http://YOUR_IP:8000` |
| Development | Android Emulator | `http://10.0.2.2:8000` |
| Development | Android Device | `http://YOUR_IP:8000` |
| Production | Any | `https://your-production-api.com` |

## Files Using This Configuration

- `src/services/productService.ts`
- `src/services/recommendationService.ts`
- Any future services that need API access

## Migration from Old System

Previously, each service had its own hardcoded API URL:
```typescript
// Old way (don't do this)
const API_BASE_URL = 'http://192.168.1.224:8000';
```

Now, all services import from the centralized config:
```typescript
// New way (recommended)
import { API_BASE_URL } from '../Config/apiConfig';
```

## Troubleshooting

If you're having API connection issues:

1. Check your computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update the IP in `src/Config/apiConfig.ts`
3. Ensure your API server is running on port 8000
4. Make sure your device and computer are on the same network
5. Check the console logs for the actual URL being used

## Production Deployment

Before deploying to production:

1. Update the `PRODUCTION` URL in `src/Config/apiConfig.ts`
2. Ensure the production API server is accessible
3. Test the production build thoroughly

## Adding New Services

When creating new services that need API access:

```typescript
import { API_BASE_URL, buildApiUrl } from '../Config/apiConfig';

// Use the base URL directly
const response = await fetch(`${API_BASE_URL}/your-endpoint`);

// Or use the helper function
const response = await fetch(buildApiUrl('your-endpoint'));
``` 