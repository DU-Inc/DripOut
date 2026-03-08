import { ReactNode } from 'react';
import { TextStyle, ViewStyle } from 'react-native';

// Button component types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  outline?: boolean;
  secondary?: boolean;
}

// Social Button component types
export interface SocialButtonProps {
  onPress: () => void;
  icon: ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle;
}

// Other common component types can be added here 