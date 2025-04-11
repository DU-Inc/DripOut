// src/types/NavigationTypes.ts

// Define the tabs in the bottom navigator
export type MainTabParamList = {
  HomeTab: undefined;
  SocialTab: undefined;
  DiscoverTab: undefined;
  '3DTab': undefined;
  ClosetTab: undefined;
  ProfileTab: undefined;
};

// Define the main stack navigator
export type RootStackParamList = {
  Welcome: undefined; // Welcome Screen for not signed in users
  Auth: undefined;
  MainTabs: undefined; // The tab navigator is a single screen in the stack
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
  
  // Legacy types for backward compatibility
  Home: undefined;
  UserProfileScreen: undefined;
  ThreeDScreen: undefined;
  ClosetScreen: undefined;
  CartScreen: undefined;
  RecommendationScreen: undefined;
};
