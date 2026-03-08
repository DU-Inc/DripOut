import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const createAuthStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay.background,
    },
    panel: {
      flex: 1,
      backgroundColor: theme.overlay.surface,
    },
    header: {
      marginBottom: 32,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    content: {
      flex: 1,
      width: '100%',
      padding: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.text.secondary,
      marginBottom: 32,
      marginTop: 12,
    },
    button: {
      // marginTop: 24, // Remove or adjust default top margin if buttons need to be closer initially
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: theme.text.secondary,
      fontSize: 14,
    },
    socialButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    socialButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 8,
      marginHorizontal: 8,
      ...theme.elevation.light,
    },
    socialButtonText: {
      marginLeft: 8,
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      color: theme.text.secondary,
      fontSize: 14,
    },
    footerLink: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    form: {
      flex: 1,
      justifyContent: 'space-between',
    },
    input: {
      marginBottom: 16,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 24,
    },
    forgotPasswordText: {
      fontSize: 14,
    },
    terms: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
    },
    completeContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    completeTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    completeSubtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    passwordChecklist: {
      marginTop: 8,
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.surface,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    checklistText: {
      marginLeft: 8,
      fontSize: 14,
    },
    checklistIcon: {
      width: 20,
      height: 20,
    },
    passwordInputContainer: {
      position: 'relative',
    },
    viewPasswordButton: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -12 }],
    },
    validationMessage: {
      fontSize: 12,
      marginTop: 4,
      marginBottom: 8,
    },
    socialButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      width: '100%',
      marginBottom: 20,
      gap: 16,
    },
    stepTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    stepSubtitle: {
      fontSize: 16,
      color: theme.text.secondary,
      marginBottom: 24,
      textAlign: 'center',
    },
    footerContainer: {
      borderTopWidth: 1,
      borderColor: theme.border,
      padding: 16,
      alignItems: 'center',
    },
    termsBottom: {
      fontSize: 12,
      textAlign: 'center',
      color: theme.text.secondary,
      marginBottom: 8,
    },
    footerButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: theme.surface,
    },
    footerButtonText: {
      fontSize: 16,
      color: theme.text.primary,
      fontWeight: '600',
    },
    logo: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 32,
    },
    buttonsContainer: {
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 16,
    },
    logoText: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.primary,
      textAlign: 'center',
      marginBottom: 32,
    },
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 8,
      paddingHorizontal: 24,
      marginVertical: 16,
    },
    checkbox: {
      marginRight: 8,
    },
    termsText: {
      fontSize: 11,
      color: theme.text.secondary,
      flexShrink: 1,
      textAlign: 'center',
      lineHeight: 16,
    },
    bottomContainer: {
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    signUpButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
    },
  }); 