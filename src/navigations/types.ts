import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: {
    email?: string;
    firstName?: string;
    lastName?: string;
    isValidated?: boolean;
    isGoogleAuth?: boolean;
    identifierType?: string;
    googleAuth?: boolean;
    skipToStep?: string;
    phone?: string;
  } | undefined;
  ForgotPassword: {
    email?: string;
    identifierType?: 'email' | 'phone';
  };
  ResetAuth: undefined;
  Onboarding: {
    progress?: {[key: string]: boolean};
    resuming?: boolean;
  } | undefined;
  OnboardingFlow: undefined;
};

export type RootStackParamList = {
  Welcome: undefined; 
  Auth: undefined;
  MainTabs: undefined;
  UserPreferencesScreen: undefined;
  SettingsScreen: undefined;
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
  
  // Onboarding screens
  OnboardingFlow: undefined;
  Onboarding: undefined;
  OnboardingBrands: undefined;
  OnboardingSizing: undefined;
  
  // Legacy routes for backward compatibility
  Home: undefined;
  Main: undefined;
};

export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>; 