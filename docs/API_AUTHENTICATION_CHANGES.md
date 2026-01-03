# API Authentication Changes Summary

This document summarizes the changes made to implement Firebase authentication for protected API endpoints.

## Changes Made

### 1. Created Auth Utility (`src/utils/authToken.ts`)
- `getAuthToken()` - Retrieves Firebase authentication token
- `isAuthenticated()` - Checks if user is authenticated
- Handles token refresh automatically

### 2. Updated Recommendation Service (`src/services/recommendationService.ts`)
- Added axios request interceptor to automatically add `Authorization: Bearer <token>` header for protected endpoints
- Added response interceptor to handle:
  - **401 Unauthorized**: Automatically refreshes token and retries request once
  - **429 Rate Limit Exceeded**: Extracts error message and reset time, throws user-friendly error
- Protected endpoints automatically get auth headers:
  - `POST /recommendations`
  - `POST /scrape_on_demand`
  - `POST /create_user_model`
  - `POST /fit_user_model`
  - `POST /user_try_on`
  - Status endpoints (`/recommendations_status`, `/try_on_status`, `/scrape_status`, `/try_on_image`)

### 3. Updated Product Service (`src/services/productService.ts`)
- Created `makeAuthenticatedRequest()` helper function for protected search endpoints
- Updated `searchProducts()` to use authenticated requests for:
  - `GET /products/search` (protected)
  - `POST /products/search` (protected)
- Added 401 and 429 error handling with automatic retry on 401

### 4. Created User Stats Service (`src/services/userStatsService.ts`)
- New service for `GET /user/stats` endpoint
- Returns user usage statistics and remaining limits
- Helper functions:
  - `formatRemainingLimits()` - Format stats for display
  - `hasReachedLimit()` - Check if user has reached a specific limit

### 5. Updated Screen Error Handling

#### FashionAdvisorChatScreen (`src/screens/FashionAdvisorChatScreen.tsx`)
- Added rate limit error detection and user-friendly messages
- Shows reset time when rate limit is reached
- Handles authentication errors

#### RecommendationScreen (`src/screens/RecommendationScreen.tsx`)
- Added rate limit error detection and user-friendly messages
- Shows reset time when rate limit is reached
- Handles authentication errors with appropriate messages

#### 3DScreen (`src/screens/3DScreen.tsx`)
- Added rate limit error handling for product scraping
- Shows user-friendly alerts with reset time

#### CreatePostScreen (`src/screens/CreatePostScreen.tsx`)
- Added rate limit logging for background scraping operations
- Silent error handling (background operation)

## Protected Endpoints

The following endpoints now require Firebase authentication:

1. **POST /recommendations** - Rate limit: 15/day
2. **POST /scrape_on_demand** - Rate limit: 3/day
3. **GET /products/search** - Rate limit: 100/day
4. **POST /products/search** - Rate limit: 100/day

## Public Endpoints (No Auth Required)

- `GET /api` - Health check
- `GET /random_products` - Random products
- `GET /products` - Browse products (if exists)

## Error Handling

### 401 Unauthorized
- Automatically attempts to refresh Firebase token
- Retries the request once with new token
- If refresh fails, throws error: "Authentication failed. Please sign in again."

### 429 Rate Limit Exceeded
- Extracts error message and reset time from API response
- Throws error with `isRateLimit: true` flag
- Error message includes reset time
- Screens display user-friendly messages with reset time

## Usage Example

### Getting User Stats
```typescript
import { getUserStats, formatRemainingLimits } from '../services/userStatsService';

const stats = await getUserStats();
console.log(formatRemainingLimits(stats));
// Output: "Recommendations: 5/15 | Scrapes: 2/3 | Searches: 50/100"
```

### Checking Rate Limits
```typescript
import { getUserStats, hasReachedLimit } from '../services/userStatsService';

const stats = await getUserStats();
if (hasReachedLimit(stats, 'recommendations')) {
  // Show message to user
}
```

## Testing

### Test with Valid Token
All protected endpoints will automatically include the Firebase token in the `Authorization` header.

### Test 401 Handling
1. Use an expired token (or invalid token)
2. Make a request to a protected endpoint
3. Should automatically refresh token and retry

### Test 429 Handling
1. Make requests until rate limit is reached
2. Next request should return 429 with error message
3. Error should be caught and displayed to user with reset time

## Notes

- Token refresh is automatic and transparent to the calling code
- Rate limit errors are caught at the service level and propagated with `isRateLimit` flag
- Background operations (like post scraping) log rate limit errors but don't interrupt user experience
- All protected endpoints are automatically detected and authenticated via interceptors


