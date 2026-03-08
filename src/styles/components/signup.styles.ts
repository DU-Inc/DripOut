import { StyleSheet, Platform, Dimensions } from 'react-native';
import { ThemeColors } from '../theme/colors';
import { normalize } from '../../utils/responsive';

export const createSignUpStyles = (theme: ThemeColors) => {
  // Main styles
  const baseStyles = StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      width: '100%',
    },
    stepContainer: {
      paddingTop: 20,
      width: '100%',
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
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 12 : 6,
      backgroundColor: theme.background,
      width: '100%',
    },
    content: {
      width: '90%',
      maxWidth: 400,
      alignItems: 'center',
      paddingHorizontal: 0,
    },
    checkboxContainer: {
      position: 'absolute',
      bottom: 75,
      alignSelf: 'center',
      width: '95%',
    },
    buttonContainer: {
      width: '90%',
      alignItems: 'center',
      marginBottom: 0,
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
    signInLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 10,
    },
    signInText: {
      marginRight: 4,
      color: theme.text.secondary,
    },
    signInButton: {
      color: theme.primary,
      fontWeight: '600',
    },
    formContainer: {
      width: '100%',
      padding: 0,
      paddingTop: 20,
      alignItems: 'stretch',
    },
    toggleContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      marginTop: 12,
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
    inputContainer: {
      width: '100%',
      marginBottom: 0,
    },
    title: {
      fontSize: 30,
      fontWeight: 'bold',
      color: theme.text.primary,
      marginBottom: 6,
      alignSelf: 'center',
      flexShrink: 1,
    },
    subtitle: {
      fontSize: 15,
      color: theme.text.secondary,
      marginBottom: 16,
      marginTop: 4,
      alignSelf: 'center',
      textAlign: 'center',
      flexShrink: 1,
    },
    errorPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      marginTop: 0,
    },
    errorText: {
      color: theme.error,
      marginLeft: 0,
      fontSize: 12,
      fontWeight: '500',
    },
    verificationText: {
      fontSize: 13,
      color: theme.text.secondary,
      textAlign: 'left',
      flex: 1,
    },
    verificationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    verificationIcon: {
      marginRight: 4,
      marginTop: -4,
    },
    birthdayContainer: {
      width: '100%',
      marginTop: 8,
      marginBottom: 16,
      alignItems: 'center',
    },
    birthdayInput: {
      width: '100%',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      marginBottom: 14,
      color: theme.text.primary,
      fontSize: 16,
      backgroundColor: 'transparent',
      minHeight: 56,
    },
    birthdayInputText: {
      color: theme.text.primary,
      fontSize: 16,
    },
    birthdayPlaceholder: {
      position: 'absolute',
      left: 14,
      top: 8,
      color: theme.text.secondary,
      fontSize: 12,
      backgroundColor: 'transparent',
    },
    birthdayPlaceholderFloating: {
      left: 12,
      top: -8,
      fontSize: 12,
      paddingHorizontal: 4,
      backgroundColor: theme.background,
    },
    datePickerContainer: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
      justifyContent: 'center',
    },
    collapsedBirthday: {
      paddingVertical: 14,
      paddingHorizontal: 15,
      borderBottomWidth: 0,
      borderLeftWidth: 1,
      borderColor: theme.background,
      borderRightWidth: 1,
      borderBottomColor: theme.primary,
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -55,
      marginBottom: 16,
      backgroundColor: theme.background,
      position: 'relative',
      width: '95%',
      height: 45,
      alignSelf: 'center',
      ...theme.elevation.light,
      zIndex: -1,
    },
    personalDetailsContainer: {
      width: '100%',
      marginTop: 10,
      marginBottom: 25,
      alignItems: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
    },
    firstNameContainer: {
      width: '48%',
      position: 'relative',
    },
    lastNameContainer: {
      width: '48%',
      position: 'relative',
    },
    inputField: {
      width: '100%',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      marginBottom: 16,
      color: theme.text.primary,
      fontSize: 18,
      backgroundColor: 'transparent',
      minHeight: 60,
    },
    inputText: {
      color: theme.text.primary,
      fontSize: 18,
    },
    inputPlaceholder: {
      position: 'absolute',
      left: 16,
      top: 21,
      color: theme.text.secondary,
      fontSize: 16,
      backgroundColor: 'transparent',
    },
    inputPlaceholderFloating: {
      left: 16,
      top: 8,
      fontSize: 12,
      color: theme.text.secondary,
    },
    collapsedPersonalDetails: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderBottomWidth: 0,
      borderLeftWidth: 1,
      borderColor: theme.background,
      borderRightWidth: 1,
      borderBottomColor: theme.primary,
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -20,
      marginBottom: 16,
      backgroundColor: theme.background,
      position: 'relative',
      width: '95%',
      height: 45,
      alignSelf: 'center',
      ...theme.elevation.light,
      zIndex: -2,
    },
  });

  // Personal details styles
  const personalDetailsStyles = StyleSheet.create({
    container: {
      width: '100%',
      marginTop: 1,
      height: 540,
    },
    titleWithLargerFont: {
      fontSize: 26,
    },
    subtitleWithExtraMargin: {
      marginBottom: 30,
    },
    scrollIndicatorContainer: {
      position: 'absolute',
      top: 62,
      right: 20,
      zIndex: 10,
      height: 30,
      justifyContent: 'center',
    },
    scrollIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    scrollIndicatorText: {
      fontSize: 12,
      color: theme.text.tertiary,
      marginLeft: 4,
      fontWeight: '500',
    },
    scrollView: {
      maxHeight: 460,
      marginBottom: 1,
    },
    scrollViewContent: {
      paddingVertical: 10,
      paddingBottom: 20,
    },
    nameRowWithMargin: {
      marginTop: 5,
    },
    formInputMargin: {
      marginTop: 5,
      marginBottom: 16,
    },
    usernameFormInputMargin: {
      marginTop: 5,
      marginBottom: 10,
    },
    passwordContainer: {
      marginBottom: 14,
    },
    passwordFormInputMargin: {
      marginTop: 2,
      marginBottom: 0,
    },
    confirmPasswordContainer: {
      marginBottom: 20,
    },
    confirmPasswordFormInputMargin: {
      marginTop: 2,
      marginBottom: 1,
    },
    iconButtonContainer: {
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    joinButtonContainer: {
      width: '100%',
      marginTop: 1,
      marginBottom: 230,
    },
    fullWidthButton: {
      width: '100%',
    },
  });

  // Checklist styles
  const checklistStyles = StyleSheet.create({
    container: {
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
    },
    icon: {
      marginRight: 6,
    },
    validText: {
      color: theme.success,
      fontSize: 11,
      fontWeight: '500',
    },
    text: {
      color: theme.text.secondary,
      fontSize: 11,
    },
    successText: {
      color: theme.success,
      fontSize: 11,
    },
  });

  // Birthday picker styles
  const birthdayPickerStyles = StyleSheet.create({
    expandedContainer: {
      width: '100%',
      opacity: 1,
      transform: [{ translateY: 0 }],
    },
    animatedFormContainer: {
      width: '100%',
      paddingHorizontal: 0,
      alignSelf: 'stretch',
      marginBottom: 16,
    },
    formInputContainer: {
      width: '100%',
      position: 'relative',
      marginTop: 8,
    },
    formInputMargin: {
      marginBottom: 4,
      width: '100%',
      alignSelf: 'stretch',
    },
  });

  // Verification panel styles
  const verificationStyles = StyleSheet.create({
    container: {
      width: '100%',
      marginTop: 16,
    },
    coloredText: {
      color: theme.text.tertiary,
      fontSize: 15,
      textAlign: 'center',
      marginBottom: 20,
      fontWeight: '500',
    },
    codeContainer: {
      width: '100%',
      alignItems: 'center',
      marginVertical: 20,
    },
    buttonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
    },
    resendRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    resendText: {
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
    resendButtonText: {
      color: theme.primary,
      fontWeight: '600',
      fontSize: 14,
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    resendButtonTextDisabled: {
      color: theme.text.secondary,
    },
  });

  // Common button styles
  const buttonStyles = StyleSheet.create({
    fullWidth: {
      width: '100%',
    },
    withMargin: {
      width: '100%',
      marginBottom: 20,
    },
    withLargerMargin: {
      width: '100%',
      marginBottom: 24,
    },
  });

  // Collapsed sections styles
  const collapsedSectionStyles = StyleSheet.create({
    email: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      marginHorizontal: 15,
      borderBottomWidth: 0,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.background,
      borderBottomColor: theme.primary,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      marginBottom: 45,
      paddingBottom: 15,
      backgroundColor: theme.background,
      position: 'relative',
      width: '97%',
      alignSelf: 'center',
      ...theme.elevation.light,
      zIndex: 1,
    },
    emailText: {
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    personalDetailsShown: {
      marginTop: 10,
      zIndex: 1,
    },
    personalDetailsHidden: {
      marginTop: -15,
      zIndex: 10,
    },
  });

  // Text styles for generic text elements
  const textStyles = StyleSheet.create({
    birthdayText: {
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '500',
    },
  });

  // Layout styles for containers and flexbox elements
  const layoutStyles = StyleSheet.create({
    flex1: {
      flex: 1,
    },
    flexGrow1: {
      flexGrow: 1,
      width: '100%',
    },
    flexRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

  return {
    ...baseStyles,
    personalDetails: personalDetailsStyles,
    checklist: checklistStyles,
    birthdayPicker: birthdayPickerStyles,
    verification: verificationStyles,
    button: buttonStyles,
    collapsedSection: collapsedSectionStyles,
    text: textStyles,
    layout: layoutStyles,
    loadingContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: normalize(24),
      minHeight: normalize(300),
      zIndex: 1,
    },
    loadingText: {
      fontSize: normalize(18),
      fontWeight: '500' as const,
      marginTop: normalize(16),
      textAlign: 'center' as const,
      lineHeight: normalize(24),
    },
    
    successContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: normalize(24),
      minHeight: normalize(300),
      zIndex: 1,
    },
    successTitle: {
      fontSize: normalize(24),
      fontWeight: '700' as const,
      marginTop: normalize(16),
      textAlign: 'center' as const,
    },
    successSubtitle: {
      fontSize: normalize(16),
      marginTop: normalize(10),
      textAlign: 'center' as const,
      lineHeight: normalize(22),
    },
  };
}; 