// src/types/NavigationTypes.ts

// Define the social stack navigator params
export type SocialStackParamList = {
  SocialFeed: undefined;
  ViewUserProfile: { username: string };
  Messages: undefined;
  Chat: {
    username: string;
    avatar: string;
    userId?: string;
  };
  Followers: { 
    username: string;
    userId: string;
  };
  Following: { 
    username: string;
    userId: string;
  };
  Notifications: undefined;
  SuggestedUsers: undefined;
};

// Define the tabs in the bottom navigator
export type MainTabParamList = {
  HomeTab: undefined;
  SocialTab: { screen?: keyof SocialStackParamList; params?: any } | undefined;
  DiscoverTab: undefined;
  '3DTab': undefined;
  ClosetTab: undefined;
  ProfileTab: undefined;
};

// Define the main stack navigator
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  UserPreferencesScreen: undefined;
  SettingsScreen: undefined;
  ViewUserProfileScreen: { username: string }; // Screen to view other users' profiles
  
  // Legacy types for backward compatibility
  Home: undefined;
  UserProfileScreen: undefined;
  ThreeDScreen: undefined;
  ClosetScreen: undefined;
  CartScreen: undefined;
  RecommendationScreen: undefined;
};
