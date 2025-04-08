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
  Onboarding: {
    progress?: {[key: string]: boolean};
    resuming?: boolean;
  } | undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Home: undefined;
};

export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>; 