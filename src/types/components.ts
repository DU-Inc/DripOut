import { AuthStackNavigationProp } from '../navigations/types';
import { ReactNode } from 'react';

// Types for BottomSheetWelcome component
export interface BottomSheetWelcomeProps {
  onGetStarted: () => void;
  onAlreadyHaveAccount: () => void;
  onContinueAsGuest: () => void;
  onSocialSignIn: (provider: 'google' | 'apple') => void;
}

// Types for Welcome Screen component
export interface WelcomeScreenProps {
  navigation: AuthStackNavigationProp;
}

// Types for Sign In Screen component
export interface SignInScreenProps {
  navigation: AuthStackNavigationProp;
}

// Types for AnimatedFormContainer component
export interface AnimatedFormContainerProps {
  children: ReactNode;
  isFocused?: boolean;
  isVisible?: boolean;
  translateY?: number;
  style?: any;
  animationDelay?: number;
  disableAfterInitial?: boolean;
}

// Types for ForgotPasswordScreen component
export enum ForgotPasswordStep {
  ENTER_EMAIL,
  VERIFY_CODE,
  SET_PASSWORD
}

export interface ForgotPasswordScreenProps {
  navigation: AuthStackNavigationProp;
  route: {
    params?: {
      email?: string;
      identifierType?: 'email' | 'phone';
    };
  };
}

// Other component types can be added here 