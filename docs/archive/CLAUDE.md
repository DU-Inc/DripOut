# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About DripOut

DripOut is a React Native fashion discovery and social commerce app that combines e-commerce, social networking, and AI-powered recommendations. The app features virtual try-on capabilities, personalized product recommendations, and a social feed for fashion content.

## Development Commands

### Running the App
```bash
npm start                 # Start Metro bundler
npm run ios              # Run iOS simulator
npm run android          # Run Android emulator
npm run build            # Create production bundle
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm test                 # Run Jest tests (minimal coverage currently)
```

### Testing Individual Features
Most testing is currently manual. Focus on these critical user flows:
- Authentication (email, Apple, Google sign-in)
- Onboarding sequence (4 screens)
- Product browsing and recommendations
- Social features (posts, likes, comments)
- Virtual try-on functionality

## Architecture Overview

### Navigation Structure
The app uses React Navigation 6 with nested navigators:
```
AppNavigator (Root)
├── WelcomeScreen (Unauthenticated)
├── AuthNavigator (Sign in/up)
├── OnboardingNavigator (First-time setup)
└── MainTabNavigator (Main app - 5 tabs)
    ├── HomeTab → FeedNavigator
    ├── SocialTab, DiscoverTab, 3DTab, ClosetTab
    └── ProfileTab
```

### State Management
**Global State**: Custom `AppStateManager` singleton (`src/utils/appStateManager.ts`)
- Handles authentication status, onboarding, preferences
- Subscription-based listeners for components
- Automatic token validation and cache invalidation

**Local State**: React hooks with AsyncStorage caching for performance

### Key Services Architecture
Located in `src/services/`:
- **firestoreService.ts** - Database operations, user profiles
- **authGuard.ts** - Authentication monitoring and validation  
- **productService.ts** - External API integration for products
- **postService.ts** - Social features (posts, likes, comments)
- **recommendationService.ts** - AI-powered product suggestions
- **storageService.ts** - Firebase Storage for media uploads

### Authentication System
Multi-layered approach:
- Firebase Auth (email/password, Apple, Google)
- Server-side token validation
- Biometric authentication support
- Automatic session management with background checks

## Important File Locations

### Core Configuration
- `src/navigations/AppNavigator.tsx` - Master navigation logic
- `src/Config/firebaseconfig.ts` - Firebase initialization
- `src/types/NavigationTypes.ts` - Navigation type definitions
- `src/styles/themeprovider.tsx` - Theme management (light/dark)

### Screen Organization
- `src/screens/auth/` - Authentication flows
- `src/screens/Onboarding*` - First-time user setup (4 screens)
- `src/screens/profiles/` - User profile management
- `src/screens/ExpandedProduct*` - Product detail views
- `src/screens/PostDetail*` - Social content views

### Critical Components
- `src/hooks/useOptimizedProfile.ts` - Profile data optimization
- `src/components/common/` - Reusable UI components
- `src/utils/appStateManager.ts` - Global state management

## Development Patterns

### Service Layer Pattern
Services handle all business logic and return promises:
```typescript
// Always handle errors consistently
try {
  const result = await productService.getRecommendations(userId);
  return result;
} catch (error) {
  console.error('Service error:', error);
  throw error; // Let UI handle display
}
```

### Navigation Pattern
Use typed navigation parameters:
```typescript
// In NavigationTypes.ts
export type RootStackParamList = {
  ProductDetail: { productId: string; userId: string };
};

// In components
const navigation = useNavigation<NavigationProp<RootStackParamList>>();
navigation.navigate('ProductDetail', { productId: '123', userId: '456' });
```

### Theme Usage
All screens should use the theme provider:
```typescript
const { isDarkMode } = useTheme();
const textColor = isDarkMode ? '#FFFFFF' : '#202020';
```

## Key Technical Constraints

### Performance Considerations
- Heavy use of AsyncStorage caching (1-hour TTL)
- Image optimization needed for product catalogs
- Profile data is optimized with essential vs secondary loading
- Use `useOptimizedProfile` hook for profile screens

### Firebase Integration
- Firestore for user data and social features
- Firebase Storage for media uploads
- Firebase Functions for AI recommendations
- Authentication uses multiple providers with fallback

### External Dependencies
- Product data comes from external APIs (configurable endpoints)
- AI recommendations require server-side processing
- Virtual try-on uses specialized ML models

## Common Tasks

### Adding New Screens
1. Create screen in appropriate `src/screens/` subfolder
2. Add to navigation types in `NavigationTypes.ts`
3. Register in appropriate navigator (App/Auth/Tab)
4. Follow existing patterns for theming and error handling

### Working with User Data
- Always use `firestoreService.ts` functions for database operations
- Profile updates must call `propagateProfileUpdates()` for consistency
- Cache user data in AsyncStorage for performance
- Handle offline scenarios gracefully

### Social Features
- Posts, likes, comments use separate services
- All social data includes user metadata (username, avatar)
- Real-time updates use Firestore listeners
- Follow relationships managed via `followService.ts`

## Recent Critical Fixes (v1.1.0) 🚨

**IMPORTANT**: The following critical caching issues have been addressed:

### 1. Product Cache User Isolation ✅ 
- **Issue**: Product cache was not consistently using user-specific keys, risking data leakage
- **Fix**: All product cache functions now require `userId` parameter for complete data isolation
- **Impact**: Prevents users from seeing cached data from other users

### 2. Interaction Preloading Implementation ✅
- **Issue**: Interaction preloading was incomplete (just clearing caches)
- **Fix**: Implemented actual API calls to preload likes, saves, and follows
- **Impact**: Significantly improved app startup performance for social features

### 3. Logger Production Safety ✅
- **Issue**: `console.error` was disabled in production, breaking crash reporting
- **Fix**: Preserved `console.error` while still reducing log noise in production
- **Impact**: Maintains crash reporting functionality for production debugging

### Breaking Changes in Caching API
```typescript
// OLD (unsafe - could leak data between users)
await getTrendingProducts(); // Used global cache

// NEW (safe - requires user isolation)
await getTrendingProducts(false, userId); // Requires userId parameter
```

## Current Limitations & Improvement Areas

See `error_fixes.md` for detailed improvement roadmap (30+ items). Key areas:
- **Testing**: Minimal test coverage, needs comprehensive test suite
- **Security**: Token encryption and shorter lifecycles needed
- **Performance**: Image optimization and caching improvements
- **Accessibility**: Screen reader support missing
- **Error Handling**: Inconsistent error boundaries
- **State Management**: Consider migrating to Redux/Zustand for complex state

## Firebase Configuration

Ensure these Firebase services are enabled:
- Authentication (Email, Apple, Google providers)
- Firestore Database with proper security rules
- Storage with image/video upload capabilities
- Functions for AI/ML processing

The app expects Firebase config files in `src/Config/firebaseconfig.ts` with proper initialization for all services.