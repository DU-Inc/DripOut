import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert, 
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  Dimensions
} from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import { createAuthStyles } from '../../styles/components/auth.styles';
import { createForgotPasswordStyles } from '../../styles/components/forgotPassword.styles';
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedFormContainer from '../../components/common/AnimatedFormContainer';
import { ForgotPasswordScreenProps, ForgotPasswordStep } from '../../types/components';
import { text } from '../../styles/theme/text';
import PasswordChecklist, { PasswordRequirement } from '../../components/common/PasswordChecklist';
import PasswordMatchChecklist from '../../components/common/PasswordMatchChecklist';
import { resetPassword, AuthErrorResponse } from '../../services/auth';

// Add global setTimeout and clearTimeout type declarations
declare const setTimeout: (callback: () => void, ms: number) => number;
declare const clearTimeout: (id: number | null) => void;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const authStyles = createAuthStyles(theme);
  const styles = createForgotPasswordStyles(theme);

  // Animated value for button position instead of state
  const buttonBottomPosition = useRef(new Animated.Value(0)).current;

  // Get email from route params if available
  const initialEmail = route.params?.email || '';
  const initialIdentifierType = route.params?.identifierType || 'email';

  // State for forgot password flow
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>(ForgotPasswordStep.ENTER_EMAIL);
  const [email, setEmail] = useState(initialIdentifierType === 'email' ? initialEmail : '');
  const [phone, setPhone] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>(initialIdentifierType);

  // Keyboard event listeners with smooth animation
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Animate button to sit directly on top of keyboard with no margin
        Animated.timing(buttonBottomPosition, {
          toValue: e.endCoordinates.height -25, // No offset, place directly on top of keyboard
          duration: 350, // Match keyboard animation duration
          useNativeDriver: false, // Position can't use native driver
        }).start();
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Animate button back to bottom position smoothly
        Animated.timing(buttonBottomPosition, {
          toValue: 0,
          duration: 250, // Match keyboard animation duration
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Validation functions
  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);
  
  const validatePhone = useCallback((phone: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  }, []);
  
  const validateIdentifier = useCallback((inputText: string) => {
    if (identifierType === 'email') {
      return validateEmail(inputText);
    } else {
      return validatePhone(inputText);
    }
  }, [identifierType, validateEmail, validatePhone]);

  // Add initial validation effect
  useEffect(() => {
    if (initialEmail && initialIdentifierType === 'email') {
      const isValid = validateEmail(initialEmail);
      setIdentifierValid(isValid);
      if (!isValid) {
        setIdentifierError(text.auth.validation.email.invalid);
      }
    }
  }, [initialEmail, initialIdentifierType, validateEmail]);

  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validation states
  const [identifierValid, setIdentifierValid] = useState(false);
  const [codeValid, setCodeValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  
  // Error states
  const [identifierError, setIdentifierError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Focus states
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Animation refs
  const alertShown = useRef(false);
  
  // Timer refs for validation prompts
  const identifierTimer = useRef<number | null>(null);
  const codeTimer = useRef<number | null>(null);
  const passwordTimer = useRef<number | null>(null);
  
  // Reset alert shown ref when changing steps
  useEffect(() => {
    alertShown.current = false;
  }, [currentStep]);
  
  // Add a navigation intent ref to prevent double navigation
  const navigationInProgress = useRef(false);

  // Disable gesture navigation when in verification step
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: currentStep !== ForgotPasswordStep.VERIFY_CODE
    });
  }, [navigation, currentStep]);

  // Handle back button
  const handleBackPress = () => {
    if (currentStep === ForgotPasswordStep.SET_PASSWORD) {
      if (alertShown.current || navigationInProgress.current) return;
      
      alertShown.current = true;
      Alert.alert(
        text.auth.forgotPassword.alerts.confirmExit.title,
        text.auth.forgotPassword.alerts.confirmExit.message,
        [
          { 
            text: text.auth.forgotPassword.alerts.confirmExit.continue, 
            style: "cancel",
            onPress: () => {
              alertShown.current = false;
            }
          },
          { 
            text: text.auth.forgotPassword.alerts.confirmExit.exit, 
            onPress: () => {
              alertShown.current = false;
              navigationInProgress.current = true;
              navigation.navigate('SignIn' as any, { email: email });
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { 
          cancelable: false,
          onDismiss: () => {
            alertShown.current = false;
          }
        }
      );
    } else if (currentStep > ForgotPasswordStep.ENTER_EMAIL) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  // Prevent going back once email is verified (handles hardware back button)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only prevent back navigation if we're on the password reset step
      if (currentStep !== ForgotPasswordStep.SET_PASSWORD) {
        return; // Allow normal navigation when not on the SET_PASSWORD step
      }
      
      // Allow navigation if it's already in progress
      if (navigationInProgress.current) {
        return;
      }
      
      // Prevent showing alert twice
      if (alertShown.current) return;
      
      // Prevent default behavior
      e.preventDefault();
      alertShown.current = true;
      
      // Show the alert
      Alert.alert(
        text.auth.forgotPassword.alerts.confirmExit.title,
        text.auth.forgotPassword.alerts.confirmExit.message,
        [
          { 
            text: text.auth.forgotPassword.alerts.confirmExit.continue, 
            style: "cancel",
            onPress: () => {
              alertShown.current = false;
            }
          },
          { 
            text: text.auth.forgotPassword.alerts.confirmExit.exit, 
            onPress: () => {
              alertShown.current = false;
              navigationInProgress.current = true;
              navigation.navigate('SignIn' as any, { email: email });
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { 
          cancelable: false,
          onDismiss: () => {
            alertShown.current = false;
          }
        }
      );
    });

    return unsubscribe;
  }, [navigation, currentStep]);
  
  // Validation functions
  const validateCode = useCallback((code: string) => {
    return code.length === 4;
  }, []);
  
  // Enhanced password validation functions
  const validateMinLength = useCallback((password: string) => {
    return password.length >= 8;
  }, []);
  
  const validateHasNumbers = useCallback((password: string) => {
    const numberCount = (password.match(/\d/g) || []).length;
    return numberCount >= 2;
  }, []);
  
  // Password validation all requirements
  const validatePassword = useCallback((password: string) => {
    return validateMinLength(password) && 
           validateHasNumbers(password);
  }, [validateMinLength, validateHasNumbers]);
  
  const checkPasswordsMatch = useCallback(() => {
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // Password requirements for checklist
  const passwordRequirements = useMemo(() => {
    return [
      {
        id: 'length',
        text: 'At least 8 characters',
        validator: validateMinLength,
        isMet: validateMinLength(newPassword)
      },
      {
        id: 'numbers',
        text: 'At least 2 numbers',
        validator: validateHasNumbers,
        isMet: validateHasNumbers(newPassword)
      }
    ];
  }, [validateMinLength, validateHasNumbers, newPassword]);

  // Add state to control checklist visibility
  const [showPasswordChecklist, setShowPasswordChecklist] = useState(false);
  const [showMatchChecklist, setShowMatchChecklist] = useState(false);
  
  // Add debounce timer for password checklist
  const passwordChecklistTimer = useRef<number | null>(null);
  const matchChecklistTimer = useRef<number | null>(null);

  // Handle input changes
  const handleEmailChange = useCallback((inputText: string) => {
    setEmail(inputText);
    
    // Clear any existing timer
    if (identifierTimer.current) {
      clearTimeout(identifierTimer.current);
      identifierTimer.current = null;
    }
    
    const isValid = validateEmail(inputText);
    setIdentifierValid(isValid);
    
    // Only clear errors when typing becomes valid
    if (isValid) {
      setIdentifierError('');
    }
  }, [validateEmail]);

  const handlePhoneChange = useCallback((inputText: string) => {
    // Only allow numbers
    const numericText = inputText.replace(/[^0-9]/g, '');
    if (numericText !== inputText) return;
    
    setPhone(numericText);
    
    // Clear any existing timer
    if (identifierTimer.current) {
      clearTimeout(identifierTimer.current);
      identifierTimer.current = null;
    }
    
    const isValid = validatePhone(numericText);
    setIdentifierValid(isValid);
    
    // Only clear errors when typing becomes valid
    if (isValid) {
      setIdentifierError('');
    }
  }, [validatePhone]);
  
  const handleCodeChange = useCallback((inputText: string) => {
    // Only allow numeric input for code
    const numericText = inputText.replace(/[^0-9]/g, '');
    if (numericText !== inputText) return;
    
    setVerificationCode(numericText);
    
    // Clear any existing timer
    if (codeTimer.current) {
      clearTimeout(codeTimer.current);
      codeTimer.current = null;
    }
    
    const isValid = validateCode(numericText);
    setCodeValid(isValid);
    
    // Only clear errors when typing becomes valid
    if (isValid) {
      setCodeError('');
    }
  }, [validateCode]);
  
  const handlePasswordChange = useCallback((inputText: string) => {
    setNewPassword(inputText);
    
    // Clear any existing validation timer
    if (passwordTimer.current) {
      clearTimeout(passwordTimer.current);
      passwordTimer.current = null;
    }
    
    // Clear any existing checklist timer
    if (passwordChecklistTimer.current) {
      clearTimeout(passwordChecklistTimer.current);
      passwordChecklistTimer.current = null;
    }
    
    // Check requirements
    const isMinLengthMet = validateMinLength(inputText);
    const isNumbersMet = validateHasNumbers(inputText);
    
    // Set overall password validity
    const isValid = isMinLengthMet && isNumbersMet;
    setPasswordValid(isValid);
    
    // Only clear errors when typing becomes valid
    if (isValid) {
      setPasswordError('');
    }
    
    // Check if passwords match whenever password changes
    if (confirmPassword) {
      const match = inputText === confirmPassword;
      setPasswordsMatch(match);
      if (match) {
        setConfirmPasswordError('');
      }
    }
    
    // Only start checklist timer if user has typed something and checklist is not already shown
    if (!showPasswordChecklist && inputText.length > 0) {
      passwordChecklistTimer.current = setTimeout(() => {
        setShowPasswordChecklist(true);
      }, 2000);
    }
  }, [validateMinLength, validateHasNumbers, confirmPassword, showPasswordChecklist]);
  
  const handleConfirmPasswordChange = useCallback((inputText: string) => {
    setConfirmPassword(inputText);
    
    // Clear any existing match checklist timer
    if (matchChecklistTimer.current) {
      clearTimeout(matchChecklistTimer.current);
      matchChecklistTimer.current = null;
    }
    
    // Check if passwords match
    const match = newPassword === inputText;
    setPasswordsMatch(match);
    
    // Only clear errors when typing becomes valid
    if (match) {
      setConfirmPasswordError('');
    }
    
    // Only start checklist timer if user has typed something and checklist is not already shown
    if (!showMatchChecklist && inputText.length > 0) {
      matchChecklistTimer.current = setTimeout(() => {
        setShowMatchChecklist(true);
      }, 2000);
    }
  }, [newPassword, showMatchChecklist]);
  
  // Toggle between email and phone
  const toggleIdentifierType = useCallback(() => {
    setIdentifierType(current => current === 'email' ? 'phone' : 'email');
    setIdentifierValid(false); // Reset validation
    setIdentifierError(''); // Clear any errors
  }, []);
  
  // Reset all timers on unmount
  useEffect(() => {
    return () => {
      if (identifierTimer.current) clearTimeout(identifierTimer.current);
      if (codeTimer.current) clearTimeout(codeTimer.current);
      if (passwordTimer.current) clearTimeout(passwordTimer.current);
      if (passwordChecklistTimer.current) clearTimeout(passwordChecklistTimer.current);
      if (matchChecklistTimer.current) clearTimeout(matchChecklistTimer.current);
    };
  }, []);
  
  // Keyboard dismissal
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Render error prompt for each field
  const renderErrorPrompt = (error: string) => {
    if (!error) return null;
    
    return (
      <View style={styles.errorPrompt}>
        <Icon name="alert-circle-outline" size={16} color={theme.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  };
  
  // Update the render function for the email/phone input section
  const renderIdentifierInput = () => (
    <View style={styles.inputContainer}>
      {/* Error message ABOVE the input field */}
      {renderErrorPrompt(identifierError)}
      
      {identifierType === 'email' ? (
        <FormInput
          value={email}
          onChangeText={handleEmailChange}
          placeholder={text.auth.forgotPassword.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          isValid={identifierValid}
          error={identifierError ? " " : undefined}
          onFocus={handleIdentifierFocus}
          onBlur={handleIdentifierBlur}
          containerStyle={{ 
            marginBottom: 8,
          }}
          inputStyle={{
            color: theme.text.primary,
            fontSize: 16,
          }}
          labelStyle={{
            color: theme.text.secondary,
            fontSize: 14,
          }}
        />
      ) : (
        <FormInput
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder={text.auth.forgotPassword.phonePlaceholder}
          keyboardType="phone-pad"
          autoCapitalize="none"
          isValid={identifierValid}
          error={identifierError ? " " : undefined}
          onFocus={handleIdentifierFocus}
          onBlur={handleIdentifierBlur}
          containerStyle={{ 
            marginBottom: 8,
          }}
          inputStyle={{
            color: theme.text.primary,
            fontSize: 16,
          }}
          labelStyle={{
            color: theme.text.secondary,
            fontSize: 14,
          }}
        />
      )}
    </View>
  );
  
  // Screen content based on current step
  const renderStepContent = () => {
    switch(currentStep) {
      case ForgotPasswordStep.ENTER_EMAIL:
        return (
          <View style={styles.formContainer}>
            <Text style={authStyles.title}>
              {text.auth.forgotPassword.title}
            </Text>
            <Text style={[authStyles.subtitle, { marginBottom: 20 }]}>
              {text.auth.forgotPassword.subtitle}
            </Text>
            
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  identifierType === 'email' ? styles.toggleButtonActive : null,
                ]}
                onPress={() => setIdentifierType('email')}
              >
                <Text 
                  style={[
                    styles.toggleText,
                    identifierType === 'email' ? styles.toggleTextActive : null,
                  ]}
                >
                  Email
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  identifierType === 'phone' ? styles.toggleButtonActive : null,
                ]}
                onPress={() => setIdentifierType('phone')}
              >
                <Text 
                  style={[
                    styles.toggleText,
                    identifierType === 'phone' ? styles.toggleTextActive : null,
                  ]}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Step 1: Email/Phone Input */}
            <AnimatedFormContainer
              isFocused={identifierFocused}
              translateY={-1}
              animationDelay={0}
            >
              {renderIdentifierInput()}
            </AnimatedFormContainer>
          </View>
        );
      
      case ForgotPasswordStep.VERIFY_CODE:
        return (
          <View style={styles.formContainer}>
            <Text style={authStyles.title}>
              {text.auth.forgotPassword.verificationTitle}
            </Text>
            <Text style={[authStyles.subtitle, { marginBottom: 20 }]}>
              {text.auth.forgotPassword.verificationSubtitle.replace('{type}', identifierType)}
            </Text>
            
            {/* Step 2: Verification Code Input */}
            <AnimatedFormContainer
              isFocused={codeFocused}
              translateY={-1}
              animationDelay={0}
            >
              <View style={styles.inputContainer}>
                {/* Error message ABOVE the input field */}
                {renderErrorPrompt(codeError)}
                
                <FormInput
                  value={verificationCode}
                  onChangeText={handleCodeChange}
                  placeholder={text.auth.forgotPassword.codePlaceholder}
                  keyboardType="number-pad"
                  maxLength={4}
                  isValid={codeValid}
                  error={codeError ? " " : undefined}
                  onFocus={handleCodeFocus}
                  onBlur={handleCodeBlur}
                  containerStyle={{ 
                    marginBottom: 8,
                  }}
                  inputStyle={{
                    color: theme.text.primary,
                    fontSize: 16,
                  }}
                  labelStyle={{
                    color: theme.text.secondary,
                    fontSize: 14,
                  }}
                />
                <Text style={styles.hintText}>
                  {text.auth.forgotPassword.codeHint}
                </Text>
              </View>
            </AnimatedFormContainer>
          </View>
        );
      
      case ForgotPasswordStep.SET_PASSWORD:
        return (
          <View style={styles.formContainer}>
            <Text style={authStyles.title}>
              {text.auth.forgotPassword.newPasswordTitle}
            </Text>
            <Text style={[authStyles.subtitle, { marginBottom: 12 }]}>
              {text.auth.forgotPassword.newPasswordSubtitle}
            </Text>
            
            {/* Password requirements checklist - placed ABOVE password input */}
            <View style={{ width: '100%', marginBottom: 4 }}>
              <PasswordChecklist
                password={newPassword}
                requirements={passwordRequirements}
                showChecklist={showPasswordChecklist || newPassword.length > 0}
              />
            </View>
            
            {/* Step 3: New Password Input */}
            <AnimatedFormContainer
              isFocused={passwordFocused}
              translateY={confirmPasswordFocused ? -2 : -1}
              animationDelay={0}
            >
              <View style={styles.inputContainer}>
                <FormInput
                  value={newPassword}
                  onChangeText={handlePasswordChange}
                  placeholder={text.auth.forgotPassword.passwordPlaceholder}
                  secureTextEntry={!showPassword}
                  isValid={passwordValid}
                  error={showPasswordChecklist && !passwordValid && newPassword.length > 0 ? " " : undefined}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  containerStyle={{ 
                    marginBottom: 4,
                  }}
                  inputStyle={{
                    color: theme.text.primary,
                    fontSize: 16,
                  }}
                  labelStyle={{
                    color: theme.text.secondary,
                    fontSize: 14,
                  }}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Icon 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={theme.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </AnimatedFormContainer>
            
            {/* Password match checklist - placed ABOVE confirm password input */}
            <View style={{ width: '100%', marginTop: 1, marginBottom: 4 }}>
              <PasswordMatchChecklist
                password={newPassword}
                confirmPassword={confirmPassword}
                showChecklist={showMatchChecklist || confirmPassword.length > 0}
                passwordValid={passwordValid}
              />
            </View>

            {/* Step 3: Confirm Password Input */}
            <AnimatedFormContainer
              isFocused={confirmPasswordFocused}
              translateY={-1}
              animationDelay={200}
            >
              <View style={styles.inputContainer}>
                <FormInput
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder={text.auth.forgotPassword.confirmPasswordPlaceholder}
                  secureTextEntry={!showConfirmPassword}
                  isValid={confirmPassword.length > 0 && passwordsMatch}
                  error={showMatchChecklist && confirmPassword.length > 0 && !passwordsMatch ? " " : undefined}
                  onFocus={handleConfirmPasswordFocus}
                  onBlur={handleConfirmPasswordBlur}
                  containerStyle={{ 
                    marginBottom: 4,
                  }}
                  inputStyle={{
                    color: theme.text.primary,
                    fontSize: 16,
                  }}
                  labelStyle={{
                    color: theme.text.secondary,
                    fontSize: 14,
                  }}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Icon 
                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={theme.text.secondary}
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </AnimatedFormContainer>
          </View>
        );
    }
  };
  
  // Function to validate and show errors
  const validateAndShowErrors = () => {
    let isValid = true;
    
    if (currentStep === ForgotPasswordStep.ENTER_EMAIL) {
      if (!identifierValid) {
        setIdentifierError(identifierType === 'email' ? 
          text.auth.validation.email.invalid : 
          text.auth.validation.phone.invalid);
        isValid = false;
      }
    }
    else if (currentStep === ForgotPasswordStep.VERIFY_CODE) {
      if (!codeValid) {
        setCodeError(text.auth.validation.code.invalid);
        isValid = false;
      }
      
      // For demo, hardcode verification to 0000
      if (verificationCode !== '0000') {
        setCodeError(text.auth.validation.code.invalid);
        isValid = false;
      }
    }
    else if (currentStep === ForgotPasswordStep.SET_PASSWORD) {
      // For password step, just show the checklists instead of error messages
      if (!validatePassword(newPassword) || !passwordsMatch) {
        // Set a flag to show we're validating - this is what makes borders turn red
        setShowPasswordChecklist(true);
        
        // If confirm password exists, also show match checklist
        if (confirmPassword.length > 0) {
          setShowMatchChecklist(true);
        }
        
        isValid = false;
      }
    }
    
    return isValid;
  };

  // Handle continue button click
  const handleContinue = async () => {
    // For first step - send reset link
    if (currentStep === ForgotPasswordStep.ENTER_EMAIL) {
      // Basic form validation
      if (!validateAndShowErrors()) return;
      
      // Only email is supported for password reset
      if (identifierType !== 'email') {
        setIdentifierError("Password reset is only available for email. Please enter your email address.");
        return;
      }
      
      setLoading(true);
      
      try {
        // Call Firebase resetPassword function
        await resetPassword(email);
        
        // Show success message
        Alert.alert(
          'Reset Email Sent',
          `We've sent a password reset link to ${email}. Please check your email and follow the instructions to reset your password.`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate back to sign in screen
                navigation.navigate('SignIn' as any, { email: email });
              }
            }
          ]
        );
      } catch (error) {
        // Handle specific error types
        const authError = error as AuthErrorResponse;
        setIdentifierError(authError.userFriendlyMessage);
      } finally {
        setLoading(false);
      }
    } 
    // For verification step - verify the code
    else if (currentStep === ForgotPasswordStep.VERIFY_CODE) {
      if (!validateAndShowErrors()) return;
      
      setLoading(true);
      
      // Simulating verification code check
      setTimeout(() => {
        setLoading(false);
        
        // For demo - if code is 0000, proceed to next step
        if (verificationCode === '0000') {
          setCurrentStep(ForgotPasswordStep.SET_PASSWORD);
        } else {
          setCodeError(text.auth.validation.code.invalid);
        }
      }, 1000);
    }
    // For password reset step - update the password
    else if (currentStep === ForgotPasswordStep.SET_PASSWORD) {
      if (!validateAndShowErrors()) return;
      
      setLoading(true);
      
      // Simulating password update
      setTimeout(() => {
        setLoading(false);
        
        Alert.alert(
          text.auth.forgotPassword.alerts.success.title,
          text.auth.forgotPassword.alerts.success.message,
          [
            { 
              text: text.auth.forgotPassword.alerts.success.button, 
              onPress: () => {
                // Set navigation flag to prevent double navigation
                navigationInProgress.current = true;
                
                // Navigate to sign in and pass the email
                navigation.navigate('SignIn' as any, { email: email });
                
                // Reset navigation flag
                setTimeout(() => {
                  navigationInProgress.current = false;
                }, 500);
              }
            }
          ]
        );
      }, 1500);
    }
  };
  
  // Handle focus and blur functions
  const handleIdentifierFocus = () => {
    setIdentifierFocused(true);
    setCodeFocused(false);
    setPasswordFocused(false);
    setConfirmPasswordFocused(false);
  };
  
  const handleIdentifierBlur = () => {
    setIdentifierFocused(false);
  };
  
  const handleCodeFocus = () => {
    setCodeFocused(true);
    setIdentifierFocused(false);
    setPasswordFocused(false);
    setConfirmPasswordFocused(false);
  };
  
  const handleCodeBlur = () => {
    setCodeFocused(false);
  };
  
  const handlePasswordFocus = () => {
    setPasswordFocused(true);
    setIdentifierFocused(false);
    setCodeFocused(false);
    
    // Show checklist when focusing if there's already text
    if (newPassword.length > 0) {
      setShowPasswordChecklist(true);
    }
    
    // Stagger focus changes to prevent animation conflicts
    setTimeout(() => {
      setConfirmPasswordFocused(false);
    }, 100);
  };
  
  const handlePasswordBlur = () => {
    // Just mark as not focused, don't affect password value or visibility state
    setTimeout(() => {
      setPasswordFocused(false);
    }, 50);
  };
  
  const handleConfirmPasswordFocus = () => {
    setConfirmPasswordFocused(true);
    setIdentifierFocused(false);
    setCodeFocused(false);
    
    // Show match checklist when focusing if there's already text
    if (confirmPassword.length > 0) {
      setShowMatchChecklist(true);
    }
    
    // Stagger focus changes to prevent animation conflicts
    setTimeout(() => {
      setPasswordFocused(false);
    }, 100);
  };
  
  const handleConfirmPasswordBlur = () => {
    // Just mark as not focused, don't affect password value
    setTimeout(() => {
      setConfirmPasswordFocused(false);
    }, 50);
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Icon name="arrow-left" size={24} color={theme.text.primary} />
          </TouchableOpacity>

          <View style={styles.content}>
            {renderStepContent()}
          </View>
          
          {/* Button Container - Positioned at bottom with smooth animation */}
          <Animated.View 
            style={[
              styles.buttonContainer,
              { 
                bottom: buttonBottomPosition,
                paddingBottom: 0 // Remove any padding that might create space
              }
            ]}
          >
            {/* Conditional rendering based on input validity */}
            {(
              (currentStep === ForgotPasswordStep.ENTER_EMAIL && !identifierValid) ||
              (currentStep === ForgotPasswordStep.VERIFY_CODE && !codeValid) ||
              (currentStep === ForgotPasswordStep.SET_PASSWORD && (!passwordValid || !passwordsMatch))
            ) ? (
              // Render wrapped button when disabled to show error messages
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => validateAndShowErrors()}
                style={{ width: '100%' }}
              >
                <Button
                  title={
                    currentStep === ForgotPasswordStep.SET_PASSWORD 
                      ? text.auth.forgotPassword.buttons.resetPassword
                      : text.auth.forgotPassword.buttons.continue
                  }
                  onPress={() => {}} // Empty handler since parent handles it
                  loading={loading}
                  disabled={true}
                  style={{
                    width: '100%',
                    marginBottom: 0 // Remove any margin that might create space
                  }}
                />
              </TouchableOpacity>
            ) : (
              // Render direct button when valid for normal functionality
              <Button
                title={
                  currentStep === ForgotPasswordStep.SET_PASSWORD 
                    ? text.auth.forgotPassword.buttons.resetPassword
                    : text.auth.forgotPassword.buttons.continue
                }
                onPress={handleContinue}
                loading={loading}
                disabled={false}
                style={{
                  width: '100%',
                  marginBottom: 0 // Remove any margin that might create space
                }}
              />
            )}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen; 