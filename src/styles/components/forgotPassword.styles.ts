import { StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemeColors } from '../theme/colors';

// Get device dimensions
const { width, height } = Dimensions.get('window');

export const createForgotPasswordStyles = (theme: ThemeColors) => 
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 20 : 10,
      backgroundColor: theme.background,
    },
    content: {
      width: '90%',
      maxWidth: 400,
      paddingTop: 45,
      alignItems: 'center',
    },
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 15 : 10,
      left: 15,
      zIndex: 10,
      padding: 8,
      backgroundColor: 'transparent',
      borderRadius: 20,
    },
    inputContainer: {
      width: '100%',
      marginBottom: 16,
    },
    errorPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background === '#000000' ? 'rgba(52, 46, 46, 0.1)' : 'rgba(255, 235, 235, 0.7)',
      paddingHorizontal: 12,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 4,
    },
    errorText: {
      color: theme.error,
      marginLeft: 8,
      fontSize: 12,
    },
    formContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    hintText: {
      marginTop: 8,
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.text.secondary,
      textAlign: 'center',
    },
    toggleContainer: {
      flexDirection: 'row',
      marginBottom: 24,
      marginTop: 16,
      width: '70%',
      alignSelf: 'center',
      justifyContent: 'center',
    },
    toggleButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      flex: 1,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
    },
    toggleButtonActive: {
      borderBottomColor: theme.primary,
    },
    toggleText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text.secondary,
    },
    toggleTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
    buttonContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      width: '100%',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      paddingTop: 10,
      width: '100%',
      backgroundColor: theme.background,
    },
  }); 