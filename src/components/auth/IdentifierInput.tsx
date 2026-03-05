import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';
import FormInput from '../common/FormInput';
import AnimatedFormContainer from '../common/AnimatedFormContainer';
import { text } from '../../styles/theme/text';
import { validateEmailFormat, isEmailAlreadyInUse } from '../../services/auth/signupService';

// Add timer type declarations
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

interface IdentifierInputProps {
  identifierType: 'email' | 'phone';
  email: string;
  phone: string;
  identifierValid: boolean;
  identifierError: string;
  identifierFocused: boolean;
  inputOpacity: Animated.Value;
  onToggleIdentifierType: () => void;
  onEmailChange: (text: string) => void;
  onPhoneChange: (text: string) => void;
  onIdentifierFocus: () => void;
  onIdentifierBlur: () => void;
  theme: ThemeColors;
  // Add these new props to communicate validation status
  onEmailValidated?: (isValid: boolean, errorMessage?: string) => void;
  // Add a prop to track if user has attempted submission
  hasAttemptedSubmit?: boolean;
  // Disable phone toggle when the flow only supports email verification.
  phoneOptionEnabled?: boolean;
}

const IdentifierInput: React.FC<IdentifierInputProps> = ({
  identifierType,
  email,
  phone,
  identifierValid,
  identifierError,
  identifierFocused,
  inputOpacity,
  onToggleIdentifierType,
  onEmailChange,
  onPhoneChange,
  onIdentifierFocus,
  onIdentifierBlur,
  theme,
  onEmailValidated,
  hasAttemptedSubmit,
  phoneOptionEnabled = true
}) => {
  // Add state for email validation
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailFormatValid, setEmailFormatValid] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  
  // Add a debounce timer ref
  const emailCheckTimerRef = useRef<number | null>(null);
  
  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimerRef.current) {
        clearTimeout(emailCheckTimerRef.current);
        emailCheckTimerRef.current = null;
      }
    };
  }, []);
  
  // Function to validate email format in real-time
  const validateEmail = (text: string) => {
    // Skip validation for very short inputs
    if (text.length < 3) {
      setEmailFormatValid(null);
      setEmailStatusMessage(null);
      
      // Notify parent if needed
      if (onEmailValidated) {
        onEmailValidated(false);
      }
      return;
    }
    
    // Validate email format first (synchronous)
    const formatValidation = validateEmailFormat(text);
    setEmailFormatValid(formatValidation.isValid);
    
    if (!formatValidation.isValid) {
      setEmailStatusMessage(formatValidation.errorMessage || "Invalid email format");
      setEmailAvailable(null);
      
      // Notify parent if needed
      if (onEmailValidated) {
        onEmailValidated(false, formatValidation.errorMessage);
      }
      return;
    }
    
    // Only check with Firebase when format is valid
    if (formatValidation.isValid) {
      // Clear any existing check timer
      if (emailCheckTimerRef.current) {
        clearTimeout(emailCheckTimerRef.current);
      }
      
      // Start loading state
      setIsCheckingEmail(true);
      
      // Debounce the external check to avoid too many requests
      emailCheckTimerRef.current = setTimeout(async () => {
        try {
          const result = await isEmailAlreadyInUse(text);
          
          // Set availability status
          setEmailAvailable(!result.inUse);
          
          // Set message based on result
          if (result.inUse) {
            setEmailStatusMessage(result.errorMessage || "Email is already in use");
          } else if (result.errorMessage) {
            // There's an error message but not in use (like network error)
            setEmailStatusMessage(result.errorMessage);
          } else {
            // Email is valid and available
            setEmailStatusMessage("Email is valid and available");
          }
          
          // Notify parent component of validation result
          if (onEmailValidated) {
            onEmailValidated(!result.inUse, result.errorMessage);
          }
        } catch (error) {
          console.error("Error checking email:", error);
          setEmailAvailable(null);
          setEmailStatusMessage("Error checking email");
          
          // Notify parent of failure
          if (onEmailValidated) {
            onEmailValidated(false, "Error checking email");
          }
        } finally {
          setIsCheckingEmail(false);
        }
      }, 600); // Debounce for 600ms
    }
  };
  
  // Update validation when email changes
  useEffect(() => {
    if (identifierType === 'email' && email.length > 0) {
      validateEmail(email);
    } else {
      // Reset validation state when switching to phone
      setEmailFormatValid(null);
      setEmailAvailable(null);
      setEmailStatusMessage(null);
      setIsCheckingEmail(false);
    }
  }, [email, identifierType]);
  
  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    // Call parent's handler
    onEmailChange(text);
    
    // Validate email format in real-time
    if (text.length > 2) {
      validateEmail(text);
    } else {
      // Reset validation for very short inputs
      setEmailFormatValid(null);
      setEmailAvailable(null);
      setEmailStatusMessage(null);
    }
  };
  
  // Render validation icon for email field
  const renderEmailValidationIcon = () => {
    if (isCheckingEmail) {
      return <ActivityIndicator size="small" color={theme.text.secondary} />;
    }
    
    // Only show error icon if user has attempted to submit
    if (emailFormatValid === false) {
      return hasAttemptedSubmit 
        ? <Icon name="close-circle-outline" size={normalize(18)} color={theme.error} />
        : <Icon name="information-outline" size={normalize(18)} color={theme.text.tertiary} />;
    }
    
    if (emailFormatValid === true && emailAvailable === false) {
      return hasAttemptedSubmit 
        ? <Icon name="close-circle-outline" size={normalize(18)} color={theme.error} />
        : <Icon name="information-outline" size={normalize(18)} color={theme.text.tertiary} />;
    }
    
    if (emailFormatValid === true && emailAvailable === true) {
      return <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} />;
    }
    
    return null;
  };
  
  // Determine validation status message style
  const getValidationMessageStyle = () => {
    // Only show red error styling after submission attempt
    if (hasAttemptedSubmit && (emailFormatValid === false || (emailFormatValid === true && emailAvailable === false))) {
      return { color: theme.error };
    }
    
    if (emailFormatValid === true && emailAvailable === true) {
      return { color: theme.success };
    }
    
    // Default to subtle tertiary text color for all prompts and errors before submission attempt
    return { color: theme.text.tertiary };
  };

  // Get the appropriate border color based on validation state and submission attempts
  const getInputBorderColor = () => {
    // Only show error border after submission attempt
    if (hasAttemptedSubmit && (emailFormatValid === false || (emailFormatValid === true && emailAvailable === false))) {
      return theme.error;
    }
    
    // Show success color when email is valid and available
    if (emailFormatValid === true && emailAvailable === true) {
      return theme.success;
    }
    
    // When focused, use the primary color
    if (identifierFocused) {
      return theme.primary;
    }
    
    // Default border color (grey/neutral)
    return theme.border;
  };

  // Get input container style with custom border color
  const getInputContainerStyle = () => {
    return {
      borderColor: getInputBorderColor(),
      marginBottom: normalize(4)
    };
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text.primary }]} adjustsFontSizeToFit numberOfLines={2}>
        {identifierType === 'email' 
          ? text.components.identifierInput.emailTitle 
          : text.components.identifierInput.phoneTitle}
      </Text>
      <Text style={[styles.subtitle, { color: theme.text.secondary }]} numberOfLines={2}>
        {text.components.identifierInput.subtitle}
      </Text>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            { borderBottomColor: identifierType === 'email' || !phoneOptionEnabled ? theme.primary : theme.border },
          ]}
          onPress={() => {
            if (identifierType !== 'email') onToggleIdentifierType();
          }}
          disabled={!phoneOptionEnabled}
        >
          <Text
            style={[
              styles.toggleText,
              { color: identifierType === 'email' || !phoneOptionEnabled ? theme.primary : theme.text.secondary },
              identifierType === 'email' ? styles.toggleTextActive : null,
            ]}
          >
            {text.components.identifierInput.emailToggle}
          </Text>
        </TouchableOpacity>
        {phoneOptionEnabled && (
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { borderBottomColor: identifierType === 'phone' ? theme.primary : theme.border },
            ]}
            onPress={() => {
              if (identifierType !== 'phone') onToggleIdentifierType();
            }}
          >
            <Text
              style={[
                styles.toggleText,
                { color: identifierType === 'phone' ? theme.primary : theme.text.secondary },
                identifierType === 'phone' ? styles.toggleTextActive : null,
              ]}
            >
              {text.components.identifierInput.phoneToggle}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <AnimatedFormContainer
        isFocused={identifierFocused}
        translateY={-1}
        animationDelay={0}
        style={styles.formContainer}
      >
        {/* Email validation message display - always show for email, with correct styling */}
        {identifierType === 'email' && email.length > 0 && (
          <View style={styles.validationPrompt}>
            <Text style={[styles.validationText, getValidationMessageStyle()]}>
              {emailFormatValid === true && emailAvailable === true
                ? "Email is valid and available"
                : hasAttemptedSubmit
                  ? (emailStatusMessage || (emailFormatValid === false ? 'Please enter a valid email address' : 'Enter your email address'))
                  : "Enter your complete email address"
              }
            </Text>
          </View>
        )}
        
        {/* Phone validation message display */}
        {identifierType === 'phone' && phone.length > 0 && (
          <View style={styles.validationPrompt}>
            <Text style={[
              styles.validationText, 
              { color: hasAttemptedSubmit && !identifierValid ? theme.error : theme.text.tertiary }
            ]}>
              {hasAttemptedSubmit && !identifierValid 
                ? (identifierError || "Please enter a valid phone number") 
                : "Enter your complete phone number"}
            </Text>
          </View>
        )}
        
        <Animated.View style={{ opacity: inputOpacity, width: '100%' }}>
          {identifierType === 'email' ? (
            <FormInput
              value={email} 
              onChangeText={handleEmailChange}
              placeholder={text.components.identifierInput.emailPlaceholder} 
              keyboardType="email-address"
              autoCapitalize="none"
              isValid={emailFormatValid === true && emailAvailable === true}
              error={hasAttemptedSubmit && identifierError ? identifierError : undefined}
              onFocus={onIdentifierFocus}
              onBlur={onIdentifierBlur}
              containerStyle={getInputContainerStyle()}
              rightIcon={renderEmailValidationIcon()}
            />
          ) : (
            <FormInput
              value={phone} 
              onChangeText={onPhoneChange}
              placeholder={text.components.identifierInput.phonePlaceholder} 
              keyboardType="phone-pad"
              autoCapitalize="none"
              isValid={identifierValid}
              error={hasAttemptedSubmit && identifierError ? identifierError : undefined}
              onFocus={onIdentifierFocus}
              onBlur={onIdentifierBlur}
              containerStyle={styles.inputContainer}
              inputContainerStyle={{
                borderColor: hasAttemptedSubmit && !identifierValid 
                  ? theme.error 
                  : identifierValid 
                    ? theme.success 
                    : identifierFocused 
                      ? theme.primary 
                      : theme.border
              }}
              rightIcon={
                identifierValid 
                  ? <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} />
                  : hasAttemptedSubmit && phone.length > 0
                    ? <Icon name="close-circle-outline" size={normalize(18)} color={theme.error} />
                    : phone.length > 0
                      ? <Icon name="information-outline" size={normalize(18)} color={theme.text.tertiary} />
                      : null
              }
            />
          )}
        </Animated.View>
        
        <View style={styles.verificationContainer}>
          <Icon 
            name="information-outline" 
            size={normalize(16)} 
            color={theme.text.secondary}
            style={styles.verificationIcon}
          />
          <Text style={[styles.verificationText, { color: theme.text.secondary }]}>
            {text.components.identifierInput.verificationNote}
          </Text>
        </View>
      </AnimatedFormContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 0, // Remove horizontal padding to maintain original width
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '700',
    marginBottom: normalize(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: normalize(15),
    marginBottom: normalize(16),
    marginTop: normalize(4),
    alignSelf: 'center',
    textAlign: 'center',
    width: '90%',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: normalize(16),
    marginTop: normalize(12),
    width: '70%', // Revert to original width
    alignSelf: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(16),
    flex: 1,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  toggleText: {
    fontSize: normalize(14),
    fontWeight: '500',
  },
  toggleTextActive: {
    fontWeight: '600',
  },
  formContainer: {
    width: '100%', // Increasing from 90% to 100% for wider inputs
    paddingHorizontal: 0,
    alignSelf: 'center',
  },
  inputContainer: { 
    marginBottom: normalize(4),
    width: '100%',
    alignSelf: 'stretch',
  },
  errorPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(8),
    marginTop: 0,
  },
  errorText: {
    marginLeft: 0,
    fontSize: normalize(12),
    fontWeight: '500',
  },
  validationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(8),
    marginTop: 0,
  },
  validationText: {
    marginLeft: 0,
    fontSize: normalize(12),
    fontWeight: '500',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed to flex-start to allow text to wrap properly
    marginTop: normalize(4),
    marginBottom: normalize(16),
  },
  verificationIcon: {
    marginRight: normalize(4),
    marginTop: normalize(2), // Adjusted to align with first line of text
  },
  verificationText: {
    fontSize: normalize(13),
    textAlign: 'left',
    flex: 1,
    flexWrap: 'wrap', // Ensure text can wrap
  },
});

export default IdentifierInput; 
