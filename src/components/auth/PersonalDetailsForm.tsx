import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';
import FormInput from '../common/FormInput';
import Button from '../common/Button';
import { PasswordChecklist as PasswordChecklistComponent, PasswordMatchChecklist } from './PasswordChecklist';
import { PasswordRequirement } from './PasswordChecklist';
import { text } from '../../styles/theme/text';
import { isUsernameTaken } from '../../services/auth/signupService';

// Add global timer type declarations
declare const setTimeout: (callback: (...args: any[]) => void, ms: number) => number;
declare const clearTimeout: (id: number | null) => void;

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface PersonalDetailsFormProps {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstNameValid: boolean;
  lastNameValid: boolean;
  usernameValid: boolean;
  passwordValid: boolean;
  passwordsMatch: boolean;
  firstNameError: string | undefined;
  lastNameError: string | undefined;
  usernameError: string | undefined;
  passwordError: string | undefined;
  confirmPasswordError: string | undefined;
  showErrors: boolean;
  showPasswordChecklist: boolean;
  showPasswordMatchChecklist: boolean;
  passwordRequirements: PasswordRequirement[];
  scrollIndicatorOpacity: Animated.Value;
  scrollViewRef: React.RefObject<ScrollView>;
  firstNameRef: React.RefObject<View>;
  usernameRef: React.RefObject<View>;
  passwordRef: React.RefObject<View>;
  confirmPasswordRef: React.RefObject<View>;
  showPasswordIcon: boolean;
  showConfirmPasswordIcon: boolean;
  isKeyboardVisible: boolean;
  onSetScrollPosition: (position: number, height: number) => void;
  onScrollStart: () => void;
  onScrollEnd: () => void;
  onFirstNameChange: (text: string) => void;
  onLastNameChange: (text: string) => void;
  onUsernameChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onConfirmPasswordChange: (text: string) => void;
  onFirstNameFocus: () => void;
  onFirstNameBlur: () => void;
  onLastNameFocus: () => void;
  onLastNameBlur: () => void;
  onUsernameFocus: () => void;
  onUsernameBlur: () => void;
  onPasswordFocus: () => void;
  onPasswordBlur: () => void;
  onConfirmPasswordFocus: () => void;
  onConfirmPasswordBlur: () => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
  onSubmit: () => void;
  onFieldScroll: (ref: React.RefObject<View>, additionalOffset?: number) => void;
  theme: ThemeColors;
  formValid: boolean;
  hasUnfilledAbove?: boolean;
  hasUnfilledBelow?: boolean;
  onGenerateUsername: () => void;
  hideNameFields?: boolean;
  hidePasswordFields?: boolean;
}

// Username format validation function
const validateUsernameFormat = (username: string): { isValid: boolean; error?: string } => {
  // Check length 6-14 characters
  if (username.length < 6 || username.length > 14) {
    return { 
      isValid: false, 
      error: "Username must be 6-14 characters" 
    };
  }
  
  // Check only allowed characters: alphanumeric plus dot and underscore
  const validCharactersRegex = /^[a-zA-Z0-9._]+$/;
  if (!validCharactersRegex.test(username)) {
    return { 
      isValid: false, 
      error: "Only letters, numbers, . and _ allowed" 
    };
  }
  
  // No spaces allowed
  if (username.includes(' ')) {
    return { 
      isValid: false, 
      error: "Spaces are not allowed" 
    };
  }
  
  return { isValid: true };
};

const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({
  firstName,
  lastName,
  username,
  password,
  confirmPassword,
  firstNameValid,
  lastNameValid,
  usernameValid,
  passwordValid,
  passwordsMatch,
  firstNameError,
  lastNameError,
  usernameError,
  passwordError,
  confirmPasswordError,
  showErrors,
  showPasswordChecklist,
  showPasswordMatchChecklist,
  passwordRequirements,
  scrollIndicatorOpacity,
  scrollViewRef,
  firstNameRef,
  usernameRef,
  passwordRef,
  confirmPasswordRef,
  showPasswordIcon,
  showConfirmPasswordIcon,
  isKeyboardVisible,
  onSetScrollPosition,
  onScrollStart,
  onScrollEnd,
  onFirstNameChange,
  onLastNameChange,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onFirstNameFocus,
  onFirstNameBlur,
  onLastNameFocus,
  onLastNameBlur,
  onUsernameFocus,
  onUsernameBlur,
  onPasswordFocus,
  onPasswordBlur,
  onConfirmPasswordFocus,
  onConfirmPasswordBlur,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
  onSubmit,
  onFieldScroll,
  theme,
  formValid,
  hasUnfilledAbove = false,
  hasUnfilledBelow = false,
  onGenerateUsername,
  hideNameFields = false,
  hidePasswordFields = false
}) => {
  // Add state for username validation
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameFormatError, setUsernameFormatError] = useState<string | undefined>(undefined);
  const usernameCheckTimeout = useRef<number | null>(null);

  // Check username format and availability when username changes
  useEffect(() => {
    // Reset states when username is empty
    if (!username) {
      setIsCheckingUsername(false);
      setUsernameAvailable(null);
      setUsernameFormatError(undefined);
      return;
    }

    // First check the format
    const formatValidation = validateUsernameFormat(username);
    setUsernameFormatError(formatValidation.error);

    // If format is invalid, don't check availability
    if (!formatValidation.isValid) {
      setUsernameAvailable(false);
      return;
    }

    // Clear any previous timeout
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Set a timeout before checking availability
    setIsCheckingUsername(true);
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(username);
        setUsernameAvailable(!taken);
      } catch (error) {
        console.error('Error checking username availability:', error);
        setUsernameAvailable(null); // Indicate error state
      } finally {
        setIsCheckingUsername(false);
      }
    }, 600); // Debounce to avoid too many requests
  }, [username]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, []);

  // Determine username status message
  const getUsernameStatusMessage = () => {
    if (!username) return null;
    
    if (usernameFormatError) {
      return usernameFormatError;
    }
    
    if (isCheckingUsername) {
      return "Checking availability...";
    }
    
    if (usernameAvailable === true) {
      return "Username available";
    }
    
    if (usernameAvailable === false) {
      return "Username not available";
    }
    
    return null;
  };

  // Fix the error type in the FormInput component
  const getUsernameError = (): string | undefined => {
    if (!showErrors) return undefined;
    
    if (usernameError) return usernameError;
    
    if (usernameAvailable === false && !usernameFormatError) {
      return "Username not available";
    }
    
    return undefined;
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
      // Scroll to top after keyboard is dismissed
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2} adjustsFontSizeToFit>
          {text.components.personalDetails.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]} numberOfLines={2}>
          {text.components.personalDetails.subtitle}
        </Text>
        
        {/* Fixed position container for scroll indicator */}
        <View style={styles.scrollIndicatorContainer}>
          <Animated.View style={{ 
            ...styles.scrollIndicatorRow,
            opacity: scrollIndicatorOpacity,
          }}>
            <Icon 
              name={hasUnfilledBelow ? "gesture-swipe-down" : "gesture-swipe-up"} 
              size={normalize(16)} 
              color={theme.text.tertiary} 
            />
            <Text style={[styles.scrollIndicatorText, { color: theme.text.tertiary }]}>
              {hasUnfilledBelow 
                ? (text.components.personalDetails.scroll || "Scroll down for missing fields") 
                : (text.components.personalDetails.scroll || "Scroll up for missing fields")}
            </Text>
          </Animated.View>
        </View>
        
        {/* Wrap inputs in a ScrollView with more bottom padding */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false} // Hide scrollbar
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true} // Always allow scrolling
          onScroll={(event) => {
            const { y } = event.nativeEvent.contentOffset;
            const height = event.nativeEvent.contentSize.height;
            onSetScrollPosition(y, height);
            
            // Call scroll start when scrolling begins
            onScrollStart();
            
            // Call scroll end after each scroll event (will be debounced)
            onScrollEnd();
          }}
          onScrollEndDrag={() => {
            // After user finishes scrolling, wait a moment before scrolling back to top
            if (!isKeyboardVisible) {
              setTimeout(() => {
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ y: 0, animated: true });
                }
              }, 500);
            }
          }}
          scrollEventThrottle={16} // Update scroll position at 60fps
        >
          {/* First and Last Name Row */}
          {!hideNameFields && (
            <View 
              style={styles.nameRow}
              ref={firstNameRef}
            >
              {/* First Name Field */}
              <View style={styles.firstNameContainer}>
                <FormInput
                  value={firstName}
                  onChangeText={onFirstNameChange}
                  placeholder={text.components.personalDetails.firstNamePlaceholder}
                  isValid={firstNameValid}
                  error={showErrors && firstNameError ? firstNameError : undefined}
                  onFocus={() => {
                    onFirstNameFocus();
                    onFieldScroll(firstNameRef);
                  }}
                  onBlur={onFirstNameBlur}
                  containerStyle={styles.formInputMargin}
                  rightIcon={
                    firstNameValid ? 
                    <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} /> : 
                    undefined
                  }
                />
              </View>
              
              {/* Last Name Field */}
              <View style={styles.lastNameContainer}>
                <FormInput
                  value={lastName}
                  onChangeText={onLastNameChange}
                  placeholder={text.components.personalDetails.lastNamePlaceholder}
                  isValid={lastNameValid}
                  onFocus={() => {
                    onLastNameFocus();
                    onFieldScroll(firstNameRef);
                  }}
                  onBlur={onLastNameBlur}
                  containerStyle={styles.formInputMargin}
                />
              </View>
            </View>
          )}
          
          {/* Username Field with availability check */}
          <View ref={usernameRef}>
            {/* Username status message and generate button */}
            <View style={styles.usernameHeaderRow}>
              {getUsernameStatusMessage() && (
                <View style={[
                  styles.usernameStatusContainer, 
                  usernameAvailable === true ? styles.successStatus : 
                  usernameAvailable === false ? styles.errorStatus : 
                  styles.neutralStatus
                ]}>
                  {isCheckingUsername ? (
                    <ActivityIndicator size="small" color={theme.text.secondary} style={styles.statusIcon} />
                  ) : (
                    <Icon 
                      name={usernameAvailable === true ? "check-circle-outline" : "alert-circle-outline"} 
                      size={normalize(14)} 
                      color={usernameAvailable === true ? theme.success : theme.error} 
                      style={styles.statusIcon}
                    />
                  )}
                  <Text 
                    style={[
                      styles.usernameStatusText,
                      { 
                        color: usernameAvailable === true ? theme.success : 
                               usernameAvailable === false ? theme.error : 
                               theme.text.secondary 
                      }
                    ]}
                  >
                    {getUsernameStatusMessage()}
                  </Text>
                </View>
              )}
              
              {/* Generate username button */}
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={onGenerateUsername}
              >
                <Icon 
                  name="magic-staff" 
                  size={normalize(12)} 
                  color={theme.primary} 
                  style={styles.generateIcon}
                />
                <Text style={[styles.generateButtonText, { color: theme.primary }]}>
                  Generate
                </Text>
              </TouchableOpacity>
            </View>
            
            <FormInput
              value={username}
              onChangeText={onUsernameChange}
              placeholder={text.components.personalDetails.usernamePlaceholder}
              isValid={usernameValid && usernameAvailable === true}
              error={getUsernameError()}
              onFocus={() => {
                onUsernameFocus();
                onFieldScroll(usernameRef);
              }}
              onBlur={onUsernameBlur}
              containerStyle={styles.usernameFormInputMargin}
              rightIcon={
                isCheckingUsername ? (
                  <ActivityIndicator size="small" color={theme.text.secondary} />
                ) : usernameValid && usernameAvailable === true ? (
                  <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} />
                ) : usernameAvailable === false ? (
                  <Icon name="close-circle-outline" size={normalize(18)} color={theme.error} />
                ) : undefined
              }
            />
          </View>
          
          {/* Password Field */}
          {!hidePasswordFields && (
            <View style={styles.passwordContainer} ref={passwordRef}>
              {/* Password requirements checklist */}
              {(showPasswordChecklist || password.length > 0) && (
                <PasswordChecklistComponent
                  password={password}
                  requirements={passwordRequirements}
                  showChecklist={true}
                  theme={theme}
                />
              )}
              
              <FormInput
                value={password}
                onChangeText={onPasswordChange}
                placeholder={text.components.personalDetails.passwordPlaceholder}
                isValid={passwordValid}
                error={showErrors && passwordError ? passwordError : undefined}
                onFocus={() => {
                  onPasswordFocus();
                  onFieldScroll(passwordRef);
                }}
                onBlur={onPasswordBlur}
                secureTextEntry={!showPasswordIcon}
                containerStyle={styles.passwordFormInputMargin}
                rightIcon={
                  <TouchableOpacity
                    onPress={onToggleShowPassword}
                    style={styles.iconButton}
                  >
                    <Icon 
                      name={showPasswordIcon ? "eye-off-outline" : "eye-outline"} 
                      size={normalize(18)} 
                      color={theme.text.secondary} 
                    />
                  </TouchableOpacity>
                }
              />
            </View>
          )}
          
          {/* Confirm Password Field */}
          {!hidePasswordFields && (
            <View style={styles.confirmPasswordContainer} ref={confirmPasswordRef}>
              {/* Password match checklist */}
              {passwordValid && (showPasswordMatchChecklist || confirmPassword.length > 0) && (
                <PasswordMatchChecklist
                  password={password}
                  confirmPassword={confirmPassword}
                  showChecklist={true}
                  passwordValid={passwordValid}
                  theme={theme}
                />
              )}
              
              <FormInput
                value={confirmPassword}
                onChangeText={onConfirmPasswordChange}
                placeholder={text.components.personalDetails.confirmPasswordPlaceholder}
                isValid={passwordsMatch}
                error={showErrors && confirmPasswordError ? confirmPasswordError : undefined}
                onFocus={() => {
                  onConfirmPasswordFocus();
                  onFieldScroll(confirmPasswordRef);
                }}
                onBlur={onConfirmPasswordBlur}
                secureTextEntry={!showConfirmPasswordIcon}
                containerStyle={styles.confirmPasswordFormInputMargin}
                rightIcon={
                  <TouchableOpacity
                    onPress={onToggleShowConfirmPassword}
                    style={styles.iconButton}
                  >
                    <Icon 
                      name={showConfirmPasswordIcon ? "eye-off-outline" : "eye-outline"} 
                      size={normalize(18)} 
                      color={theme.text.secondary} 
                    />
                  </TouchableOpacity>
                }
              />
            </View>
          )}
          
          {/* Join Now Button - Now part of the scrollable content */}
          <View style={styles.joinButtonContainer}>
            <Button
              title={text.components.personalDetails.joinButton}
              onPress={() => {
                // Dismiss keyboard and scroll to top before submitting
                Keyboard.dismiss();
                if (scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ y: 0, animated: false });
                }
                // Then call the submit handler
                onSubmit();
              }}
              disabled={!formValid || usernameAvailable !== true}
              style={styles.fullWidthButton}
            />
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: normalize(1),
    height: normalize(540),
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: normalize(4),
  },
  subtitle: {
    fontSize: normalize(15),
    marginBottom: normalize(20),
    marginTop: normalize(4),
    alignSelf: 'center',
    textAlign: 'center',
    width: '100%',
  },
  scrollIndicatorContainer: {
    position: 'absolute',
    top: normalize(62),
    right: normalize(20),
    zIndex: 10,
    height: normalize(30),
    justifyContent: 'center',
  },
  scrollIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicatorText: {
    fontSize: normalize(12),
    marginLeft: normalize(4),
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: normalize(460),
    marginBottom: normalize(20),
    width: '100%',
  },
  scrollViewContent: {
    paddingVertical: normalize(10),
    paddingBottom: normalize(20),
    paddingHorizontal: 0,
  },
  nameRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: normalize(5),
  },
  firstNameContainer: {
    width: '48%',
    position: 'relative',
  },
  lastNameContainer: {
    width: '48%',
    position: 'relative',
  },
  formInputMargin: {
    marginTop: normalize(5),
    marginBottom: normalize(16),
  },
  usernameFormInputMargin: {
    marginTop: normalize(5),
    marginBottom: normalize(16),
  },
  usernameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(4),
    justifyContent: 'space-between',
    width: '100%',
  },
  usernameStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: normalize(8),
    paddingHorizontal: normalize(4),
  },
  statusIcon: {
    marginRight: normalize(4),
  },
  usernameStatusText: {
    fontSize: normalize(12),
    fontWeight: '500',
  },
  successStatus: {
    opacity: 0.9,
  },
  errorStatus: {
    opacity: 0.9,
  },
  neutralStatus: {
    opacity: 0.7,
  },
  passwordContainer: {
    marginBottom: normalize(14),
  },
  passwordFormInputMargin: {
    marginTop: normalize(2),
    marginBottom: 0,
  },
  confirmPasswordContainer: {
    marginBottom: normalize(20),
  },
  confirmPasswordFormInputMargin: {
    marginTop: normalize(2),
    marginBottom: normalize(1),
  },
  iconButton: {
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(8),
  },
  joinButtonContainer: {
    width: '100%',
    marginTop: normalize(1),
    marginBottom: normalize(230),
  },
  fullWidthButton: {
    width: '100%',
  },
  generateButton: {
    paddingVertical: normalize(4),
    paddingHorizontal: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: normalize(12),
    marginLeft: 'auto',
  },
  generateButtonText: {
    fontSize: normalize(12),
    fontWeight: '600',
  },
  generateIcon: {
    marginRight: normalize(4),
  },
});

export default PersonalDetailsForm; 