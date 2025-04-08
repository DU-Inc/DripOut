import { StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemeColors } from '../theme/colors';

// Get device dimensions
const { width, height } = Dimensions.get('window');

export const createSignInStyles = (theme: ThemeColors) => 
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
      paddingBottom: 20,
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
      marginBottom: 12,
    },
    errorPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4, 
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      backgroundColor: theme.error + '10', // Very light version of error color
    },
    errorPromptNoBg: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    errorText: {
      color: theme.error,
      marginLeft: 8,
      fontSize: 12,
    },
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
      marginTop: 2,
      marginBottom: 8,
      width: 'auto',
    },
    forgotPasswordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    faceIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 0,
    },
    faceIdButton: {
      marginRight: 8,
    },
    faceIdToggle: {
      marginLeft: 4,
    },
    faceIdText: {
      color: theme.text.secondary,
      fontSize: 14,
    },
    forgotPassword: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '500',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    checkboxContainer: {
      position: 'absolute',
      bottom: 75, // Position above the footer
      alignSelf: 'center',
      width: '95%',
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
      paddingTop: 1,
      width: '100%',
      backgroundColor: theme.background,
    },
    divider: {
      height: 1,
      width: '90%',
      backgroundColor: theme.border,
      marginBottom: 10,
    },
    signUpLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 10,
    },
    signUpText: {
      marginRight: 0,
      color: theme.text.secondary,
    },
    signUpButton: {
      color: theme.primary,
      fontWeight: '600',
    },
    // Toggle styles for authentication method selection
    toggleContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      marginTop: 10,
      width: '80%', 
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
    toggleButtonDisabled: {
      borderBottomColor: theme.border,
      opacity: 0.5,
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
    toggleTextDisabled: {
      opacity: 0.5,
      color: theme.text.tertiary,
    },
    disabledLabel: {
      fontSize: 12,
      color: theme.error,
      fontStyle: 'italic',
    },
    disabledButton: {
      opacity: 0.6,
      backgroundColor: theme.primary,
    },
    // Verification styles
    verificationContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 14,
      marginTop: 6,
    },
    verificationText: {
      fontSize: 14,
      color: theme.text.secondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    verificationHint: {
      fontSize: 12,
      color: theme.text.tertiary,
      marginTop: 8,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    // Phone verification error styles
    phoneErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: `${theme.error}15`, // 15% opacity error color
      borderRadius: 6,
      width: '100%',
    },
    phoneErrorText: {
      color: theme.error,
      marginLeft: 8,
      fontSize: 13,
      flex: 1,
    },
    // Resend code styles
    resendContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      width: '100%',
      paddingHorizontal: 5,
    },
    resendTimerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    resendTimerText: {
      color: theme.text.secondary,
      marginLeft: 4,
      fontSize: 14,
    },
    resendButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 8,
    },
    resendButtonDisabled: {
      borderColor: theme.border,
      opacity: 0.5,
    },
    resendButtonText: {
      color: theme.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    resendButtonTextDisabled: {
      color: theme.text.secondary,
    },
    // Add styles for verification expiry timer
    expiryContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      padding: 5,
      borderRadius: 12,
      backgroundColor: theme.background === '#000000' ? 'rgba(50, 50, 50, 0.5)' : 'rgba(240, 240, 240, 0.5)',
    },
    expiryText: {
      color: theme.text.secondary,
      marginLeft: 6,
      fontSize: 13,
      fontWeight: '500',
    },
  }); 