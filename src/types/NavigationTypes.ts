// src/types/NavigationTypes.ts

// Define the tabs in the bottom navigator
export type MainTabParamList = {
  HomeTab: undefined;
  SocialTab: undefined;
  DiscoverTab: undefined;
  '3DTab': {
    preloadedOutfit?: {
      id: string;
      name: string;
      products: any[];
    };
  } | undefined;
  ClosetTab: undefined;
  ProfileTab: undefined;
};

// Define the main stack navigator
export type RootStackParamList = {
  Welcome: undefined; // Welcome Screen for not signed in users
  Auth: undefined;
  MainTabs: {
    screen?: keyof MainTabParamList;
    params?: any;
  } | undefined; // The tab navigator with optional nested navigation
  UserPreferencesScreen: undefined;
  SettingsScreen: undefined;
  
  // Auth screens
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: {
    email?: string;
    identifierType?: 'email' | 'phone';
  };
  
  // Onboarding screens
  OnboardingFlow: undefined; // Container for the onboarding flow
  Onboarding: { fromReview?: boolean } | undefined;
  OnboardingBrands: { fromReview?: boolean } | undefined;
  OnboardingSizing: { fromReview?: boolean } | undefined;
  OnboardingOverview: undefined; // Final overview screen
  
  // Options sheet screen for onboarding decision
  OptionsSheet: undefined;
  
  // Social features
  CreatePostScreen: undefined;
  UserDetailScreen: { userId: string; username?: string };
  SearchScreen: undefined;
  MessagingScreen: { conversationId?: string; otherUserId?: string; otherUserName?: string };
  FollowersFollowingScreen: {
    initialTab?: 'followers' | 'following';
    userId: string;
  };
  PostDetailScreen: {
    postId: string;
    userId: string;
    initialPostIndex?: number;
  };
  OutfitDetailScreen: {
    outfitId: string;
    outfit: {
      id: string;
      userId: string;
      name: string;
      imageUrl: string;
      products: any[];
      createdAt: any;
    };
  };
  
  // Legacy types for backward compatibility
  Home: undefined;
  UserProfileScreen: undefined;
  ThreeDScreen: {
    preloadedOutfit?: {
      id: string;
      name: string;
      products: any[];
    };
  } | undefined;
  ClosetScreen: undefined;
  CartScreen: undefined;
  RecommendationScreen: undefined;
};