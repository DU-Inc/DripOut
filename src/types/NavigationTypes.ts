// src/types/NavigationTypes.ts

// Define the tabs in the bottom navigator
export type MainTabParamList = {
  HomeTab: undefined;
  DiscoverTab: undefined;
  '3DTab': undefined;
  ClosetTab: undefined;
  ProfileTab: undefined;
};

// Define the main stack navigator
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined; // The tab navigator is a single screen in the stack
  UserPreferencesScreen: undefined;
  SettingsScreen: undefined;
  
  // Legacy types for backward compatibility
  Home: undefined;
  UserProfileScreen: undefined;
  ThreeDScreen: undefined;
  ClosetScreen: undefined;
  CartScreen: undefined;
  RecommendationScreen: undefined;
};
