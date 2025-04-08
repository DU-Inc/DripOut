import { StyleSheet } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const createButtonStyles = (theme: ThemeColors) => 
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: theme.primary,
      width: '100%',
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text.onPrimary,
      textAlign: 'center',
    },
    icon: {
      marginRight: 8,
    },
    disabled: {
      opacity: 0.5,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.primary,
    },
    outlineText: {
      color: theme.primary,
    },
    secondary: {
      backgroundColor: theme.accent1,
    },
    loading: {
      marginLeft: 8,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.background,
      flex: 1,
      marginHorizontal: 8,
    },
    socialButtonText: {
      marginLeft: 8,
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '500',
    },
  }); 