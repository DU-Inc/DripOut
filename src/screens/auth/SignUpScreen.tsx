import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, TouchableWithoutFeedback, Keyboard, Animated, Easing, Platform, LayoutAnimation, Dimensions, KeyboardAvoidingView } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import { createAuthStyles } from '../../styles/components/auth.styles';
import { createSignUpStyles as createSignUpStylesOriginal } from '../../styles/components/signup.styles';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthStackNavigationProp, RootStackNavigationProp } from '../../navigations/types';
import { text } from '../../styles/theme/text';
import { createThemedCollapsableSection } from '../../components/auth/CollapsableSection';
import { PasswordRequirement } from '../../components/auth/PasswordChecklist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import reusable components
import IdentifierInput from '../../components/auth/IdentifierInput';
import VerificationPanel from '../../components/auth/VerificationPanel';
import BirthdayPicker from '../../components/auth/BirthdayPicker';
import PersonalDetailsForm from '../../components/auth/PersonalDetailsForm';
import Button from '../../components/common/Button';
import TermsCheckbox from '../../components/common/TermsCheckbox';
import CodeInput, { CodeInputHandle } from '../../components/auth/CodeInput';
import SuccessOptionsSheet from '../../components/common/SuccessOptionsSheet';
import SignUpLoading from '../../components/auth/SignUpLoading';
import SignUpSuccess from '../../components/auth/SignUpSuccess';

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;
declare const clearTimeout: (id: number | null) => void;
// Add global interval types
declare const setInterval: (callback: (...args: any[]) => void, ms: number) => number;
declare const clearInterval: (id: number | null) => void;

// Define single step type - we only need basic and complete now
type SignUpStep = 'basic' | 'complete';

type SignUpScreenProps = {
  navigation: AuthStackNavigationProp;
  route: any;
};

// Add this component definition after your imports and before the main component
// This is a transparent overlay that blocks all interactions
const TransitionBlocker = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 9999,
        elevation: 9999, // for Android
      }}
      pointerEvents="box-only"
    />
  );
};

// Add this import near the top with other imports
import { appStateManager } from '../../utils/appStateManager';
import { authGuard } from '../../services/authGuard';

// Import our new email verification service
import { sendVerificationCode, verifyEmailCode, isUsernameTaken, completeSignup, SignupErrorTypes, validateEmailFormat, isEmailAlreadyInUse } from '../../services/auth/signupService';

// Add these to the styles object
// Create a function that takes theme as a parameter
const createExtendedStyles = (theme: any) => {
  const styles = createSignUpStylesOriginal(theme);
  
  return {
    ...styles,
    verificationRequiredContainer: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      padding: normalize(16),
      marginVertical: normalize(10),
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      width: '90%',
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    verificationRequiredText: {
      marginLeft: normalize(8),
      fontSize: normalize(14),
      lineHeight: normalize(20),
      flexShrink: 1,
    }
  };
};

const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const authStyles = createAuthStyles(theme);
  const styles = createSignUpStylesOriginal(theme);
  const ThemedCollapsableSection = createThemedCollapsableSection(theme);
  
  // Get the combined styles
  const combinedStyles = createExtendedStyles(theme);

  // Utility function to safely calculate age with error handling
  const calculateAge = (birthDate: Date): number => {
    try {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      // Return 0 on error rather than crashing
      return 0;
    }
  };

  // First, find where the initial state is being set from route params
  // Get email/phone from route params if available
  const initialEmail = route.params?.email || '';
  const initialPhone = route.params?.phone || '';
  const initialIdentifierType = route.params?.identifierType || 'email';
  const initialValidated = route.params?.isValidated || false;
  const isGoogleAuth = route.params?.isGoogleAuth || false;
  const initialFirstName = route.params?.firstName || '';
  const initialLastName = route.params?.lastName || '';
  const skipToStep = route.params?.skipToStep || '';

  // Current Step State - simplified to just basic and complete
  const [currentStep, setCurrentStep] = useState<SignUpStep>('basic');
  const [loading, setLoading] = useState(false);

  // Add state to track button's position from bottom
  const [buttonBottomOffset, setButtonBottomOffset] = useState(0);
  const buttonRef = useRef<View>(null);

  // Form state (centralized)
  const [email, setEmail] = useState(initialIdentifierType === 'email' ? initialEmail : '');
  const [phone, setPhone] = useState(initialIdentifierType === 'phone' ? initialPhone : '');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>(initialIdentifierType);
  
  // Add state for password - moved up before it's used
  const [personalPassword, setPersonalPassword] = useState('');

  // Add success state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // Validation helper functions
  const validateFirstName = (name: string): boolean => {
    return name.length >= 2 && !/\d/.test(name);
  };

  const validateLastName = (name: string): boolean => {
    return name.length === 0 || (name.length >= 1 && !/\d/.test(name));
  };

  const validatePersonalUsername = (username: string): boolean => {
    // Username must be 6-14 characters
    if (username.length < 6 || username.length > 14) {
      return false;
    }
    
    // Only letters, numbers, dots and underscores allowed
    const validCharactersRegex = /^[a-zA-Z0-9._]+$/;
    if (!validCharactersRegex.test(username)) {
      return false;
    }
    
    // No spaces allowed
    if (username.includes(' ')) {
      return false;
    }
    
    // All checks passed
    return true;
  };

  const validatePersonalPassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasTwoNumbers = (password.match(/\d/g) || []).length >= 2;
    return hasMinLength && hasTwoNumbers;
  };

  const getTruncatedName = (name: string): string => {
    return name.length > 12 ? name.substring(0, 12) + '...' : name;
  };

  const getLastNameInitial = (lastName: string): string => {
    return lastName.length > 0 ? lastName.charAt(0) + '.' : '';
  };

  const getTruncatedIdentifier = (identifier: string): string => {
    if (identifier.includes('@')) {
      const [localPart, domain] = identifier.split('@');
      if (localPart.length > 4) {
        return `${localPart.substring(0, 4)}...@${domain}`;
      }
    }
    return identifier;
  };

  const formatPhoneForDisplay = (phone: string): string => {
    // Simple formatting for display - adjust as needed
    if (phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
    }
    return phone;
  };

  // Password requirements for checklist
  const personalPasswordRequirements = useMemo(() => [
    {
      id: 'length',
      text: 'At least 8 characters',
      validator: (pwd: string) => pwd.length >= 8,
      isMet: personalPassword.length >= 8
    },
    {
      id: 'numbers',
      text: 'Contains at least 2 numbers',
      validator: (pwd: string) => (pwd.match(/\d/g) || []).length >= 2,
      isMet: (personalPassword.match(/\d/g) || []).length >= 2
    }
  ], [personalPassword]);

  // Add state to track if user is currently scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Validation state - Initialize with prop data if available
  const [identifierValid, setIdentifierValid] = useState(initialValidated);
  
  // Error states
  const [identifierError, setIdentifierError] = useState('');
  
  // Focus states
  const [identifierFocused, setIdentifierFocused] = useState(false);
  
  // Timer refs for validation
  const identifierTimer = useRef<number | null>(null);
  
  // Start with terms checked as requested
  const [isTermsChecked, setIsTermsChecked] = useState(true);

  // Add states for verification flow that were removed
  const [verificationErrorMessage, setVerificationErrorMessage] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [maxAttemptsExceeded, setMaxAttemptsExceeded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation values for title and subtitle
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const titleTranslateX = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(1)).current;
  const subtitleTranslateX = useRef(new Animated.Value(0)).current;

  // Animation value for fade transitions and form animations
  const inputOpacity = useRef(new Animated.Value(1)).current;

  // Validation functions
  const validateEmail = useCallback((emailValue: string) => {
    // Use the more comprehensive validation from SignupService
    const validation = validateEmailFormat(emailValue);
    if (!validation.isValid) {
      // Set specific error message from validation
      if (validation.errorMessage) {
        setIdentifierError(validation.errorMessage);
      }
      return false;
    }
    
    return true;
  }, []);
  
  const validatePhone = useCallback((phoneValue: string) => {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phoneValue);
  }, []);

  // ---- State for verification flow ----
  const [showEmailInput, setShowEmailInput] = useState(true);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  // verificationStatus: '' (none), 'pending', 'verified', or 'failed'
  const [verificationStatus, setVerificationStatus] = useState('');
  const [code, setCode] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  // Add new animated values
  const collapseHeight = useRef(new Animated.Value(0)).current;
  const collapseOpacity = useRef(new Animated.Value(1)).current;
  const formHeight = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const screenDimmer = useRef(new Animated.Value(0)).current;

  // Add a new state variable for tracking dimming state
  const [isDimmed, setIsDimmed] = useState(false);

  // Add state to track if back confirmation has been shown
  const [hasShownBackConfirmation, setHasShownBackConfirmation] = useState(false);

  // Add a navigation intent ref to prevent double navigation
  const navigationInProgress = useRef(false);

  // Add birthday related state
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [age, setAge] = useState(0);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false); // Changed to false initially
  const [birthdayValid, setBirthdayValid] = useState(false);
  
  // Add personal details state
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [personalUsername, setPersonalUsername] = useState('');
  const [confirmPersonalPassword, setConfirmPersonalPassword] = useState('');
  
  // Personal details validation state
  const [firstNameValid, setFirstNameValid] = useState(false);
  const [lastNameValid, setLastNameValid] = useState(true); // True by default since it's optional
  const [personalUsernameValid, setPersonalUsernameValid] = useState(false);
  const [personalPasswordValid, setPersonalPasswordValid] = useState(false);
  const [personalPasswordsMatch, setPersonalPasswordsMatch] = useState(false);
  
  // Personal details focus state
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [personalUsernameFocused, setPersonalUsernameFocused] = useState(false);
  const [personalPasswordFocused, setPersonalPasswordFocused] = useState(false);
  const [confirmPersonalPasswordFocused, setConfirmPersonalPasswordFocused] = useState(false);
  
  // Personal details error state
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [personalUsernameError, setPersonalUsernameError] = useState('');
  const [personalPasswordError, setPersonalPasswordError] = useState('');
  const [confirmPersonalPasswordError, setConfirmPersonalPasswordError] = useState('');
  
  // Show password state
  const [showPersonalPassword, setShowPersonalPassword] = useState(false);
  const [showConfirmPersonalPassword, setShowConfirmPersonalPassword] = useState(false);
  
  // Add states for password checklist visibility
  const [showPersonalPasswordChecklist, setShowPersonalPasswordChecklist] = useState(false);
  const [showPersonalPasswordMatchChecklist, setShowPersonalPasswordMatchChecklist] = useState(false);
  
  // Timer refs for password checklist
  const personalPasswordChecklistTimer = useRef<number | null>(null);
  const personalPasswordMatchChecklistTimer = useRef<number | null>(null);
  
  // Add state to track if date picker has been interacted with
  const [datePickerTouched, setDatePickerTouched] = useState(false);
  
  // Add a state for showing input errors in personal details
  const [showPersonalDetailsErrors, setShowPersonalDetailsErrors] = useState(false);
  
  // Add state to track scroll position, keyboard visibility, and whether scroll indicator should be shown
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  
  // Add reference to each input field for position tracking
  const firstNameRef = useRef<View>(null);
  const usernameRef = useRef<View>(null);
  const passwordRef = useRef<View>(null);
  const confirmPasswordRef = useRef<View>(null);
  
  // Add state to track field positions and visibility
  const [fieldPositions, setFieldPositions] = useState({
    firstName: { y: 0, height: 0, filled: false },
    username: { y: 0, height: 0, filled: false },
    password: { y: 0, height: 0, filled: false },
    confirmPassword: { y: 0, height: 0, filled: false }
  });
  
  // Add code input ref
  const codeInputRef = useRef<CodeInputHandle>(null);

  // New state for code verification timer
  const [remainingTime, setRemainingTime] = useState(0);
  const resendTimerRef = useRef<number | null>(null);

  // Scroll view ref
  const scrollViewRef = useRef<ScrollView>(null);

  // Add animated value for scroll indicator
  const scrollIndicatorOpacity = useRef(new Animated.Value(0)).current;

  // Add animated value for button position
  const joinButtonBottomPosition = useRef(new Animated.Value(0)).current;

  // Add this among the other state declarations
  const [isAnimating, setIsAnimating] = useState(false);

  // Add these refs after other refs to track previous state values
  const prevVerificationStatus = useRef('');
  const prevShowBirthdayPicker = useRef(false);
  const prevShowPersonalDetails = useRef(false);
  const prevIsAnimating = useRef(false);
  const stateChangesCount = useRef({
    verificationStatus: 0,
    showBirthdayPicker: 0,
    showPersonalDetails: 0,
    isAnimating: 0
  });

  // Add an animation queue to track pending animations
  const animationQueue = useRef<{ from: string, to: string, actions: () => void }[]>([]);

  // Add a ref to track if an animation is already configured
  const animationConfigured = useRef(false);
  
  // Create a centralized animation configuration function
  const configureLayoutAnimation = (duration = 350, damping = 0.7) => {
    // Prevent duplicate configuration
    if (animationConfigured.current) {
      console.log('⚠️ Animation already configured, skipping additional configuration');
      return false;
    }
    
    console.log('🎬 Configuring layout animation');
    animationConfigured.current = true;
    
    // Configure the animation
    const config = {
      duration: duration,
      create: { 
        type: LayoutAnimation.Types.spring, 
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: damping,
      },
      update: { 
        type: LayoutAnimation.Types.spring,
        springDamping: damping,
        property: LayoutAnimation.Properties.scaleXY,
      },
      delete: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: damping,
      }
    };
    
    LayoutAnimation.configureNext(config, () => {
      console.log('✅ Animation complete callback');
      animationConfigured.current = false;
    });
    
    // Schedule a safety timeout to reset the flag in case the callback fails
    setTimeout(() => {
      animationConfigured.current = false;
    }, duration + 100);
    
    return true;
  };
  
  // Modified transition function with improved synchronization
  const performSectionTransition = (fromSection: string, toSection: string, actions: () => void) => {
    console.log(`🔄 Requesting section transition: ${fromSection} -> ${toSection}`);
    
    // Set transitioning state to block interactions
    setIsTransitioning(true);
    
    // If animation is already in progress, add to queue instead of executing immediately
    if (isAnimating) {
      console.log(`⏳ Animation in progress, queueing transition: ${fromSection} -> ${toSection}`);
      animationQueue.current.push({ from: fromSection, to: toSection, actions });
      
      // Safety timeout to release transition state if queue processing fails
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);
      return;
    }
    
    // Set animation lock before starting
    setIsAnimating(true);
    
    // Ensure we wait a frame before configuring animation
    // This prevents multiple animations from being configured in the same frame
    setTimeout(() => {
      // Configure the animation before making state changes
      console.log(`✨ Starting transition: ${fromSection} -> ${toSection}`);
      
      try {
        if (configureLayoutAnimation()) {
          // Batch all state changes together
          console.log(`✨ Executing transition actions for ${fromSection} -> ${toSection}`);
          actions();
        } else {
          console.log(`⚠️ Failed to configure animation for ${fromSection} -> ${toSection}`);
        }
      } catch (error) {
        console.error('Animation error:', error);
        // If animation fails, still execute actions for app to remain functional
        actions();
      }
      
      // Release animation lock after animation finishes
      setTimeout(() => {
        console.log(`🏁 Completed section transition: ${fromSection} -> ${toSection}`);
        setIsAnimating(false);
        
        // Remove the transition blocker
        setIsTransitioning(false);
        
        // Check if there are any queued animations to process
        if (animationQueue.current.length > 0) {
          const nextAnimation = animationQueue.current.shift();
          if (nextAnimation) {
            console.log(`⏭️ Processing next queued animation: ${nextAnimation.from} -> ${nextAnimation.to}`);
            // Use a larger delay to ensure everything is settled
            setTimeout(() => {
              performSectionTransition(nextAnimation.from, nextAnimation.to, nextAnimation.actions);
            }, 200); // Increased for extra safety
          }
        }
      }, 600); // Increased for extra safety margin
    }, 20); // Wait slightly longer than one frame
  };
  
  // Override React Native's LayoutAnimation to ensure our system is the only one configuring animations
  useEffect(() => {
    const originalConfigureNext = LayoutAnimation.configureNext;
    
    // Override the built-in function
    LayoutAnimation.configureNext = (config, onAnimationDidEnd, onAnimationDidFail) => {
      // Prevent layout animations when resending verification code to avoid stack overflow
      if (verifyingCode || loading) {
        console.log('⛔ Blocked layout animation during verification');
        if (onAnimationDidEnd) {
          setTimeout(onAnimationDidEnd, 0);
        }
        return;
      }
      
      // Only allow our own configured animations through our centralized function
      if (animationConfigured.current) {
        console.log('✅ Using correctly configured animation');
        return originalConfigureNext(config, onAnimationDidEnd, onAnimationDidFail);
      }
      
      // Log and block uncontrolled animations to help debugging
      console.log('⛔ Blocked uncontrolled layout animation');
      if (onAnimationDidEnd) {
        setTimeout(onAnimationDidEnd, 0);
      }
      return;
    };
    
    // Restore original on cleanup
    return () => {
      LayoutAnimation.configureNext = originalConfigureNext;
    };
  }, [loading, verifyingCode]);

  // --- Validation UseEffect --- 
  // Ensures validation state is always in sync with the current identifier type and value
  useEffect(() => {
    if (identifierType === 'email') {
      setIdentifierValid(validateEmail(email));
    } else {
      setIdentifierValid(validatePhone(phone));
    }
  }, [email, phone, identifierType, validateEmail, validatePhone]);

  // Prevent going back once verification has started - but keep gesture enabled
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only prevent back navigation if verification started or completed
      if (!showVerificationPanel && verificationStatus !== 'verified') {
        return; // Allow normal navigation when not in verification
      }
      
      // Allow navigation if it's already in progress
      if (navigationInProgress.current) {
        return;
      }
      
      // Prevent default behavior
      e.preventDefault();
      
      // Different message based on verification status
      const message = verificationStatus === 'verified' 
        ? "Going back will reset your progress including verification. Do you want to continue?" 
        : "You're in the middle of verifying your email. Leaving now will cancel the process and all progress will be lost.";
      
      // Show the confirmation alert
      Alert.alert(
        "Cancel Sign Up?",
        message,
        [
          {
            text: "Continue",
            style: "cancel"
          },
          {
            text: "Cancel Sign Up",
            onPress: () => {
              // Set flag to prevent duplicate navigation
              navigationInProgress.current = true;
              // Reset form state
              resetAndNavigateBack();
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { cancelable: true }
      );
    });

    return unsubscribe;
  }, [navigation, showVerificationPanel, verificationStatus]);

  // Update useEffect to handle keyboard visibility and height
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setIsKeyboardVisible(true);
        // Get keyboard height from event
        const keyboardFrame = event.endCoordinates;
        setKeyboardHeight(keyboardFrame.height);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        
        // When keyboard hides, scroll back to top if in personal details section
        if (showPersonalDetails && scrollViewRef.current) {
          // Small delay to ensure keyboard is fully dismissed before scrolling
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [showPersonalDetails]);

  // Update the field positions and fill status whenever validation changes
  useEffect(() => {
    setFieldPositions(prev => ({
      ...prev,
      firstName: { ...prev.firstName, filled: firstNameValid },
      username: { ...prev.username, filled: personalUsernameValid },
      password: { ...prev.password, filled: personalPasswordValid },
      confirmPassword: { ...prev.confirmPassword, filled: personalPasswordsMatch }
    }));
  }, [firstNameValid, personalUsernameValid, personalPasswordValid, personalPasswordsMatch]);

  // Dismiss keyboard when tapping outside of inputs
  const dismissKeyboard = () => {
    // First check if keyboard is visible and animate button if needed
    if (isKeyboardVisible) {
      // Animate button back to initial position
      Animated.timing(joinButtonBottomPosition, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false
      }).start(() => {
        // Then dismiss keyboard
        Keyboard.dismiss();
        
        // After keyboard is dismissed, scroll to top
        if (scrollViewRef.current) {
          // Use smoother animation with spring behavior
          Animated.timing(contentSlideY, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }).start();
          
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      });
    } else {
      Keyboard.dismiss();
      
      // Even if keyboard isn't visible, ensure we're at the top
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  };

  // Toggle between email and phone with fade animation
  const toggleIdentifierType = useCallback(() => {
    Animated.timing(inputOpacity, {
      toValue: 0,
      duration: 150, // Faster fade out
      easing: Easing.ease,
      useNativeDriver: true,
    }).start(() => {
      // Update state AFTER fade out
      const nextType = identifierType === 'email' ? 'phone' : 'email';
      setIdentifierType(nextType);
      setIdentifierError(''); // Clear error on switch
      
      // Re-validate based on the NEW type and its CURRENT value
      if (nextType === 'email') {
        setIdentifierValid(validateEmail(email));
      } else {
        setIdentifierValid(validatePhone(phone));
      }

      // Fade back in
      Animated.timing(inputOpacity, {
        toValue: 1,
        duration: 200, // Slightly slower fade in
        easing: Easing.ease,
        useNativeDriver: true,
        delay: 50 // Slight delay before fade in
      }).start();
    });
  }, [identifierType, inputOpacity, email, phone, validateEmail, validatePhone]);

  // Email and phone change handlers
  const handleEmailChange = useCallback((inputText: string) => {
    setEmail(inputText);
    setIdentifierError(''); // Clear error on type
    
    // Clear any existing timer
    if (identifierTimer.current) {
      clearTimeout(identifierTimer.current);
      identifierTimer.current = null;
    }
    
    const isValid = validateEmail(inputText);
    setIdentifierValid(isValid);
  }, [validateEmail]);

  const handlePhoneChange = useCallback((inputText: string) => {
    // Only allow numbers
    const numericText = inputText.replace(/[^0-9]/g, '');
    
    setPhone(numericText);
    setIdentifierError(''); // Clear error on type

    // Clear any existing timer
    if (identifierTimer.current) {
      clearTimeout(identifierTimer.current);
      identifierTimer.current = null;
    }
    
    const isValid = validatePhone(numericText);
    setIdentifierValid(isValid);
  }, [validatePhone]);

  // Handle focus and blur functions
  const handleIdentifierFocus = () => {
    setIdentifierFocused(true);
  };
  
  const handleIdentifierBlur = () => {
    setIdentifierFocused(false);
  };

  // Handle clear verification error when user starts typing in code input
  const handleCodeChangeStart = () => {
    if (verificationErrorMessage) {
      setVerificationErrorMessage('');
    }
  };

  // Simplified toggle for birthday picker - minimal animations
  const toggleBirthdayPicker = () => {
    // Check if email is verified
    if (verificationStatus !== 'verified') {
      Alert.alert(
        "Email Verification Required",
        "Please verify your email address before proceeding.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Simple toggle with minimal animation
    if (showPersonalDetails) {
      // Simple state change without complex animation
      setShowPersonalDetails(false);
      setTimeout(() => {
        setShowBirthdayPicker(!showBirthdayPicker);
      }, 50);
    } else {
      // Simple toggle with minimal animation
      setShowBirthdayPicker(!showBirthdayPicker);
    }
  };

  // Add a ref to track the last birthday update time
  const lastBirthdayUpdateTime = useRef(0);
  // Add a ref to store pending date update
  const pendingDateUpdate = useRef<Date | null>(null);
  // Add a birthday update timer ref
  const birthdayUpdateTimerRef = useRef<number | null>(null);

  // Cooldown timer management functions
  const getVerificationCooldownKey = (email: string) => `verification_cooldown_${email}`;

  // Store cooldown end time
  const storeVerificationCooldown = async (email: string, durationSeconds: number) => {
    try {
      const cooldownKey = getVerificationCooldownKey(email);
      const cooldownEnd = Date.now() + (durationSeconds * 1000);
      await AsyncStorage.setItem(cooldownKey, cooldownEnd.toString());
      console.log(`Stored cooldown for ${email}: ${durationSeconds}s until ${new Date(cooldownEnd).toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error storing cooldown:', error);
    }
  };

  // Check if cooldown is active and get remaining time
  const checkVerificationCooldown = async (email: string): Promise<number> => {
    try {
      const cooldownKey = getVerificationCooldownKey(email);
      const cooldownEndStr = await AsyncStorage.getItem(cooldownKey);
      
      if (!cooldownEndStr) return 0;
      
      const cooldownEnd = parseInt(cooldownEndStr);
      const now = Date.now();
      
      if (now >= cooldownEnd) {
        // Cooldown expired, remove it
        await AsyncStorage.removeItem(cooldownKey);
        return 0;
      }
      
      // Calculate remaining seconds
      const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
      console.log(`Cooldown check for ${email}: ${remainingSeconds}s remaining`);
      return remainingSeconds;
    } catch (error) {
      console.error('Error checking cooldown:', error);
      return 0;
    }
  };

  // Clear cooldown
  const clearVerificationCooldown = async (email: string) => {
    try {
      const cooldownKey = getVerificationCooldownKey(email);
      await AsyncStorage.removeItem(cooldownKey);
    } catch (error) {
      console.error('Error clearing cooldown:', error);
    }
  };

  // Initialize cooldown timer if needed
  useEffect(() => {
    const initializeCooldownTimer = async () => {
      if (identifierType === 'email' && email && showVerificationPanel) {
        // Log diagnostic information
        console.log(`Checking cooldown status for ${email}`);
        
        // Check both server and client side cooldown
        const remainingSeconds = await checkVerificationCooldown(email);
        
        if (remainingSeconds > 0) {
          console.log(`Initializing cooldown timer: ${remainingSeconds}s remaining from AsyncStorage`);
          
          // Set the timer to the remaining time
          setRemainingTime(remainingSeconds);
          
          // Start the countdown
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
          
          resendTimerRef.current = setInterval(() => {
            setRemainingTime(prev => {
              const nextValue = prev - 1;
              if (nextValue <= 0) {
                console.log('Cooldown timer completed');
                if (resendTimerRef.current) {
                  clearInterval(resendTimerRef.current);
                  resendTimerRef.current = null;
                }
                return 0;
              }
              return nextValue;
            });
          }, 1000) as unknown as number;
        } else {
          console.log('No active cooldown found');
          // Reset timer state to ensure clean start
          setRemainingTime(0);
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
            resendTimerRef.current = null;
          }
        }
      }
    };
    
    initializeCooldownTimer();
    
    // Cleanup on unmount
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, [email, identifierType, showVerificationPanel]);

  // Simplified birthday change handler with better debouncing
  const handleBirthdayChange = (date: Date) => {
    // Set touched state on first interaction
    if (!datePickerTouched) {
      setDatePickerTouched(true);
    }

    // Very simple update - the component already handles debouncing
    // Just update state since the component guarantees this is a "confirmed" change
    setBirthday(date);
    const calculatedAge = calculateAge(date);
    setAge(calculatedAge);
    setBirthdayValid(calculatedAge >= 12);
    
    // Log for debugging
    console.log(`Birthday updated: ${date.toISOString()}, Age: ${calculatedAge}`);
  };

  // Simplified birthday next handler - minimal animations
  const handleBirthdayNext = () => {
    // Check if email is verified
    if (verificationStatus !== 'verified') {
      Alert.alert(
        "Email Verification Required",
        "Please verify your email address before proceeding.",
        [{ text: "OK" }]
      );
      return;
    }
    
    if (!birthdayValid) {
      Alert.alert(
        "Age Requirement",
        "You must be at least 12 years old to create an account.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Simple state changes with minimal animation
    setShowBirthdayPicker(false);
    
    // Use a simple timeout to ensure state changes don't conflict
    setTimeout(() => {
      setShowPersonalDetails(true);
    }, 50);
  };

  // Update togglePersonalDetails function to use the new transition function
  const togglePersonalDetails = () => {
    console.log('🔍 togglePersonalDetails - Current states:', { 
      showBirthdayPicker, 
      showPersonalDetails, 
      isAnimating 
    });
    
    if (isAnimating) {
      console.log('⚠️ togglePersonalDetails - Animation in progress, skipping');
      return;
    }
    
    // If personal details is not shown, we need to collapse birthday
    if (!showPersonalDetails && showBirthdayPicker) {
      console.log('📉 Need to collapse birthday picker first');
      performSectionTransition('birthday', 'personalDetails', () => {
        setShowBirthdayPicker(false);
        setShowPersonalDetails(true);
      });
    } else if (showPersonalDetails) {
      console.log('🔽 Collapsing personal details');
      performSectionTransition('personalDetails', 'closed', () => {
        setShowPersonalDetails(false);
      });
    } else {
      console.log('🔼 Expanding personal details');
      performSectionTransition('closed', 'personalDetails', () => {
        setShowPersonalDetails(true);
      });
    }
  };

  // Handle personal details input changes
  const handleFirstNameChange = (text: string) => {
    setFirstName(text);
    const isValid = validateFirstName(text);
    setFirstNameValid(isValid);
    
    if (isValid) {
      setFirstNameError('');
    }
  };

  const handleLastNameChange = (text: string) => {
    setLastName(text);
    const isValid = validateLastName(text);
    setLastNameValid(isValid);
    
    if (isValid) {
      setLastNameError('');
    }
  };

  const handlePersonalUsernameChange = (text: string) => {
    setPersonalUsername(text);
    
    // Validate with specific error messages
    if (text.length < 6 || text.length > 14) {
      setPersonalUsernameValid(false);
      setPersonalUsernameError('Username must be 6-14 characters');
      return;
    }
    
    // Check for invalid characters
    const validCharactersRegex = /^[a-zA-Z0-9._]+$/;
    if (!validCharactersRegex.test(text)) {
      setPersonalUsernameValid(false);
      setPersonalUsernameError('Only letters, numbers, . and _ allowed');
      return;
    }
    
    // Check for spaces
    if (text.includes(' ')) {
      setPersonalUsernameValid(false);
      setPersonalUsernameError('Spaces are not allowed');
      return;
    }
    
    // If we got here, username format is valid
    setPersonalUsernameValid(true);
    setPersonalUsernameError('');
  };

  const handlePersonalPasswordChange = (text: string) => {
    setPersonalPassword(text);
    
    // Clear any existing validation timer
    if (personalPasswordChecklistTimer.current) {
      clearTimeout(personalPasswordChecklistTimer.current);
      personalPasswordChecklistTimer.current = null;
    }
    
    // Check requirements
    const isValid = validatePersonalPassword(text);
    setPersonalPasswordValid(isValid);
    
    // Only clear errors when typing becomes valid
    if (isValid) {
      setPersonalPasswordError('');
    }
    
    // Check if passwords match whenever password changes
    if (confirmPersonalPassword) {
      const match = text === confirmPersonalPassword;
      setPersonalPasswordsMatch(match);
      if (match) {
        setConfirmPersonalPasswordError('');
      }
    }
    
    // Show checklist as soon as user starts typing
    if (!showPersonalPasswordChecklist) {
      setShowPersonalPasswordChecklist(true);
    }
  };

  const handleConfirmPersonalPasswordChange = (text: string) => {
    setConfirmPersonalPassword(text);
    
    // Clear any existing match checklist timer
    if (personalPasswordMatchChecklistTimer.current) {
      clearTimeout(personalPasswordMatchChecklistTimer.current);
      personalPasswordMatchChecklistTimer.current = null;
    }
    
    // Check if passwords match
    const match = personalPassword === text && personalPassword.length > 0;
    setPersonalPasswordsMatch(match);
    
    // Only clear errors when typing becomes valid
    if (match) {
      setConfirmPersonalPasswordError('');
    }
    
    // Show match checklist as soon as user starts typing
    if (!showPersonalPasswordMatchChecklist) {
      setShowPersonalPasswordMatchChecklist(true);
    }
  };

  // Handle focus and blur functions for personal details
  const handleFirstNameFocus = () => {
    setFirstNameFocused(true);
    
    // Re-measure field position when focused
    setTimeout(() => {
      if (firstNameRef.current && scrollViewRef.current) {
        firstNameRef.current.measureLayout(
          // @ts-ignore
          scrollViewRef.current,
          (x, y, width, height) => {
            setFieldPositions(prev => ({
              ...prev,
              firstName: { ...prev.firstName, y, height }
            }));
          },
          () => {}
        );
      }
    }, 100);
  };
  
  const handleFirstNameBlur = () => {
    setFirstNameFocused(false);
  };
  
  const handleLastNameFocus = () => {
    setLastNameFocused(true);
  };
  
  const handleLastNameBlur = () => {
    setLastNameFocused(false);
  };
  
  const handlePersonalUsernameFocus = () => {
    setPersonalUsernameFocused(true);
  };
  
  const handlePersonalUsernameBlur = () => {
    setPersonalUsernameFocused(false);
  };
  
  const handlePersonalPasswordFocus = () => {
    setPersonalPasswordFocused(true);
    
    // Show checklist when focusing
    setShowPersonalPasswordChecklist(true);
  };
  
  const handlePersonalPasswordBlur = () => {
    setTimeout(() => {
      setPersonalPasswordFocused(false);
      // Keep checklist visible even after blur
    }, 50);
  };
  
  const handleConfirmPersonalPasswordFocus = () => {
    setConfirmPersonalPasswordFocused(true);
    
    // Show match checklist when focusing
    setShowPersonalPasswordMatchChecklist(true);
  };
  
  const handleConfirmPersonalPasswordBlur = () => {
    setTimeout(() => {
      setConfirmPersonalPasswordFocused(false);
      // Keep checklist visible even after blur
    }, 50);
  };

  // Function to determine if all personal details fields are valid
  const areAllPersonalDetailsFieldsFilled = () => {
    return firstNameValid && 
           personalUsernameValid && 
           personalPasswordValid && 
           personalPasswordsMatch;
  };

  // Function to determine which fields are unfilled and visible/hidden
  const getUnfilledFieldsStatus = useCallback(() => {
    // Get the visible area bounds (accounting for scroll position and keyboard)
    const visibleTop = scrollPosition;
    const visibleBottom = scrollPosition + 350; // ScrollView height
    
    // For fields BELOW, only consider keyboard boundary - not just general visibility
    const keyboardBoundary = isKeyboardVisible ? 
      Dimensions.get('window').height - keyboardHeight - 200 : // 200px buffer above keyboard
      Dimensions.get('window').height; // No keyboard = full height
    
    // Check if there are unfilled fields above or below the visible area
    let unfilledAbove = false;
    let unfilledBelow = false;
    let unfilledVisible = false;
    
    Object.values(fieldPositions).forEach(field => {
      const fieldTop = field.y;
      const fieldBottom = field.y + field.height;
      
      if (!field.filled) {
        // Field is not filled - determine its visibility status
        if (fieldBottom < visibleTop) {
          // Field is ABOVE visible area (under banner)
          unfilledAbove = true;
        } else if (isKeyboardVisible && fieldBottom > keyboardBoundary) {
          // Field is BELOW visible area ONLY if hidden by keyboard
          unfilledBelow = true;
        } else if (fieldTop >= visibleTop && fieldBottom <= visibleBottom) {
          // Field is fully visible
          unfilledVisible = true;
        }
      }
    });
    
    // Log status occasionally for debugging
    if (Date.now() % 2000 < 100) {
      console.log('Field status:', {
        isKeyboardVisible,
        keyboardHeight,
        keyboardBoundary,
        visibleTop,
        visibleBottom,
        unfilledAbove,
        unfilledBelow,
        unfilledVisible
      });
    }
    
    return { unfilledAbove, unfilledBelow, unfilledVisible };
  }, [fieldPositions, scrollPosition, isKeyboardVisible, keyboardHeight]);

  // Function to animate scroll indicator - only show when fields not visible
  const animateScrollIndicator = useCallback((show: boolean) => {
    // Add a dummy listener to the animation to prevent the warning
    const listener = scrollIndicatorOpacity.addListener(() => {});
    
    const animation = Animated.timing(scrollIndicatorOpacity, {
      toValue: show ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    });
    
    animation.start();
    
    // Return a cleanup function that removes the listener and stops the animation
    return () => {
      animation.stop();
      scrollIndicatorOpacity.removeListener(listener);
    };
  }, [scrollIndicatorOpacity]);

  // Function to handle scroll start
  const handleScrollStart = () => {
    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Set scrolling state to true
    if (!isScrolling) {
      setIsScrolling(true);
    }
  };
  
  // Function to handle scroll end after a short delay
  const handleScrollEnd = () => {
    // Clear any existing scroll timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    
    // Set a timeout to determine when scrolling has actually stopped
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      
      // Re-measure field positions after scrolling stops
      if (showPersonalDetails) {
        const measureFieldPositions = () => {
          // Helper function to measure a field's position
          const measureField = (fieldRef: React.RefObject<View>, fieldName: keyof typeof fieldPositions) => {
            if (scrollViewRef.current && fieldRef.current) {
              fieldRef.current.measureLayout(
                // @ts-ignore
                scrollViewRef.current,
                (x, y, width, height) => {
                  setFieldPositions(prev => ({
                    ...prev,
                    [fieldName]: { ...prev[fieldName], y, height }
                  }));
                },
                () => {}
              );
            }
          };
          
          // Measure all fields
          measureField(firstNameRef, 'firstName');
          measureField(usernameRef, 'username');
          measureField(passwordRef, 'password');
          measureField(confirmPasswordRef, 'confirmPassword');
        };
        
        // Delay measurement slightly to ensure scroll has settled
        setTimeout(measureFieldPositions, 50);
      }
    }, 300) as unknown as number; // 300ms delay to ensure scrolling has actually stopped
  };

  // Add a function to scroll to component when clicked
  const scrollToComponent = (fieldRef: React.RefObject<View>, additionalOffset = 0) => {
    // Don't scroll if keyboard is visible - let user control scrolling then
    if (isKeyboardVisible) return;
    
    if (scrollViewRef.current && fieldRef.current) {
      // Get position directly within the ScrollView to avoid unexpected scrolling behavior
      fieldRef.current.measureLayout(
        // @ts-ignore - ReactNative typing issue, but this works
        scrollViewRef.current,
        (x, y, width, height) => {
          // Calculate scroll position with more spacing above (120px)
          const scrollToPosition = Math.max(0, y - 105 + additionalOffset);
          
          // Always scroll to this position when field is tapped
          scrollViewRef.current?.scrollTo({ y: scrollToPosition, animated: true });
        },
        () => {
          // Fallback to simpler method if the first approach fails
          console.log("Measurement failed, using fallback");
        }
      );
    }
  };

  // Update useEffect to detect unfilled fields and animate indicator
  useEffect(() => {
    let animationCleanup: (() => void) | undefined;
    
    if (showPersonalDetails) {
      const { unfilledAbove, unfilledBelow, unfilledVisible } = getUnfilledFieldsStatus();
      
      // Only show indicator if:
      // 1. There are unfilled fields that aren't visible
      // 2. Not all fields are filled yet
      const shouldShow = (unfilledAbove || unfilledBelow) && !areAllPersonalDetailsFieldsFilled();
      
      // Don't show indicator if all unfilled fields are already visible
      const hideWhenAllVisible = unfilledVisible && !unfilledAbove && !unfilledBelow;
      
      animationCleanup = animateScrollIndicator(shouldShow && !hideWhenAllVisible);
    }
    
    return () => {
      if (animationCleanup) {
        animationCleanup();
      }
    };
  }, [getUnfilledFieldsStatus, animateScrollIndicator, areAllPersonalDetailsFieldsFilled, scrollPosition, isKeyboardVisible, showPersonalDetails]);

  // Effect to scroll to top when personal details first shows
  useEffect(() => {
    if (showPersonalDetails && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [showPersonalDetails]);

  // Clean up scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Add effect to measure button position after layout
  useEffect(() => {
    const measureButtonPosition = () => {
      if (buttonRef.current) {
        buttonRef.current.measureInWindow((x, y, width, height) => {
          const windowHeight = Dimensions.get('window').height;
          // Calculate distance from bottom of screen, accounting for safe area
          const bottomOffset = windowHeight - y - height;
          setButtonBottomOffset(bottomOffset);
        });
      }
    };
    
    // Measure after a short delay to ensure layout is complete
    const layoutTimer = setTimeout(measureButtonPosition, 500);
    
    return () => clearTimeout(layoutTimer);
  }, []);

  // Format date for display safely with error handling
  const formatBirthday = (date: Date | null): string => {
    if (!date) return '';
    
    try {
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Return empty string on error rather than crashing
      return '';
    }
  };

  // Add state to track if user has attempted to submit
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Add a state to track if this is coming from Google auth
  const [isFromGoogleAuth, setIsFromGoogleAuth] = useState(isGoogleAuth);

  // ---- Verification Flow Functions ----
  // Update handleSendCode to use our email verification service
  const handleSendCode = async () => {
    // Set attempted submit to true on first try
    setHasAttemptedSubmit(true);
    
    // First check if terms are accepted
    if (!isTermsChecked) {
      Alert.alert("Terms Agreement Required", "Please check the box to agree to the terms and conditions before proceeding.");
      return;
    }

    // Validate identifier before sending
    if (identifierType === 'email') {
      // First do a format validation
      const formatValidation = validateEmailFormat(email);
      if (!formatValidation.isValid) {
        setIdentifierError(formatValidation.errorMessage || 'Please enter a valid email address');
        return;
      }
      
      // Then check if email is already in use
      setLoading(true);
      try {
        const emailCheckResult = await isEmailAlreadyInUse(email);
        if (emailCheckResult.inUse) {
          setIdentifierError(emailCheckResult.errorMessage || 'This email is already in use');
          setLoading(false);
          return;
        }
        if (emailCheckResult.errorMessage && !emailCheckResult.inUse) {
          // This is a case where the email format is invalid according to Firebase
          setIdentifierError(emailCheckResult.errorMessage);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking email:', error);
        Alert.alert(
          "Verification Error", 
          "Unable to verify email format. Please try again.", 
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }
    } else {
      // Phone validation
      if (!(/^\+?[0-9]{10,15}$/.test(phone))) {
        setIdentifierError('Please enter a valid phone number');
        return;
      }
    }
    
    // Clear any previous error
    setIdentifierError('');
    
    // Set transitioning state to block interactions
    setIsTransitioning(true);
    
    // Reset timer and attempts when sending a new code
    setRemainingTime(0);
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setAttemptsLeft(5);
    
    try {
      // Send verification code (only email is supported for now)
      if (identifierType === 'email') {
        await sendVerificationCode(email);
        
        // Store the cooldown time for the first verification code send
        // Use 60 seconds as default server cooldown period
        await storeVerificationCooldown(email, 60);
        
        // Initialize the countdown timer
        setRemainingTime(60);
        if (resendTimerRef.current) {
          clearInterval(resendTimerRef.current);
        }
        
        // Setup the countdown
        resendTimerRef.current = setInterval(() => {
          setRemainingTime(prev => {
            const nextValue = prev - 1;
            if (nextValue <= 0) {
              if (resendTimerRef.current) {
                clearInterval(resendTimerRef.current);
                resendTimerRef.current = null;
              }
              return 0;
            }
            return nextValue;
          });
        }, 1000) as unknown as number;
        
        // Use sequential LayoutAnimation for a folding effect
        LayoutAnimation.configureNext({
          duration: 400,
          create: { 
            type: LayoutAnimation.Types.easeInEaseOut, 
            property: LayoutAnimation.Properties.opacity,
          },
          update: { 
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          },
          delete: {
            type: LayoutAnimation.Types.easeInEaseOut,
            property: LayoutAnimation.Properties.opacity,
          }
        });
        
        // Collapse the input 
        setShowEmailInput(false);
        
        // Then expand the verification panel after a short delay
        setTimeout(() => {
          // Use accordion-like animation for expanding
          LayoutAnimation.configureNext({
            duration: 400,
            create: { 
              type: LayoutAnimation.Types.easeInEaseOut, 
              property: LayoutAnimation.Properties.opacity,
            },
            update: { 
              type: LayoutAnimation.Types.easeInEaseOut,
              property: LayoutAnimation.Properties.opacity,
            }
          });
          
          setShowVerificationPanel(true);
          setVerificationStatus('pending');
          setCode('');
          
          // End transition after another delay to account for the animation
          setTimeout(() => {
            setIsTransitioning(false);
          }, 450);
        }, 100);
      } else {
        // Phone not implemented yet
        Alert.alert(
          "Phone Verification",
          "Phone verification is not yet implemented. Please use email instead.",
          [{ text: "OK" }]
        );
        setLoading(false);
        setIsTransitioning(false);
      }
    } catch (error) {
      // Handle error
      let errorMessage = "An error occurred while sending the verification code. Please try again.";
      
      if (error instanceof Error) {
        if (error.message === SignupErrorTypes.EMAIL_ALREADY_IN_USE) {
          errorMessage = "This email is already in use. Please use a different email or sign in.";
        } else if (error.message === SignupErrorTypes.INVALID_EMAIL) {
          errorMessage = "Please enter a valid email address.";
          setIdentifierError(errorMessage);
        }
      }
      
      Alert.alert("Verification Error", errorMessage, [{ text: "OK" }]);
      setLoading(false);
      setIsTransitioning(false);
    } finally {
      setLoading(false);
    }
  };

  // Update handleVerifyCode to properly track verification status and enforce completion
  const handleVerifyCode = async () => {
    // First check if terms are accepted
    if (!isTermsChecked) {
      Alert.alert("Terms Agreement Required", "Please check the box to agree to the terms and conditions before proceeding.");
      return;
    }

    // Check if code is 6 digits
    if (code.length !== 6) {
      setVerificationErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }
    
    // Don't start if we're already animating
    if (isAnimating) {
      console.log('⚠️ Animation already in progress, skipping verification transition');
      return;
    }

    // Set transitioning state to block interactions during verification
    setIsTransitioning(true);

    // Clear any previous error message
    setVerificationErrorMessage('');

    // Set loading state
    setVerifyingCode(true);

    try {
      // Verify the code (only email supported for now)
      if (identifierType === 'email') {
        const verified = await verifyEmailCode(email, code);
        
        if (verified) {
          console.log('✅ Code verification success - Starting animation transition');
          
          // Use the transition function
          performSectionTransition('verification', 'verified', () => {
            setVerificationStatus('verified');
            setShowVerificationPanel(false);
            setVerifyingCode(false);
            
            // Store the verified email to ensure it's used throughout the signup process
            setEmail(email); // Re-set to ensure it's the verified email
            
            // Show birthday picker after verification is complete
            setShowBirthdayPicker(true);
            
            // Scroll to the next section
            if (scrollViewRef.current) {
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }, 500);
            }
            
            // Show success toast - using timeout to avoid triggering another transition while the first is in progress
            setTimeout(() => {
              Alert.alert(
                "Email Verified", 
                "Your email has been successfully verified. You can now continue with the signup process.",
                [{ text: "Continue" }]
              );
            }, 600);
          });
        } else {
          // This shouldn't happen as errors should be caught in the catch block
          throw new Error('Verification failed');
        }
      } else {
        // Phone not implemented yet
        throw new Error('Phone verification not implemented');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setIsTransitioning(false);
      setVerifyingCode(false);
      
      // Handle specific error types
      let errorMessage = "An error occurred during verification. Please try again.";
      let shouldReduceAttempts = true;
      
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          errorMessage = "Verification code has expired. Please request a new code.";
          shouldReduceAttempts = false;
        } else if (error.message.includes('attempts')) {
          errorMessage = "Maximum verification attempts reached. Please request a new code.";
          shouldReduceAttempts = false;
          setMaxAttemptsExceeded(true);
        } else if (error.message.includes('Invalid')) {
          errorMessage = "Invalid verification code. Please try again.";
        }
      }
      
      // Update attempts if needed
      if (shouldReduceAttempts) {
        const newAttempts = attemptsLeft - 1;
        setAttemptsLeft(newAttempts);
        
        if (newAttempts <= 0) {
          // Set error state
          setVerificationStatus('failed');
          setIdentifierError(identifierType === 'email' ? "Email couldn't be verified" : "Phone number couldn't be verified");
          
          // Set max attempts exceeded flag
          setMaxAttemptsExceeded(true);
          
          // Wait a moment to show the disabled state before transitioning back
          setTimeout(() => {
            // Reset to email input with no animation to avoid conflicts
            setShowEmailInput(true);
            setShowVerificationPanel(false);
            setVerificationStatus('');
            setAttemptsLeft(5);
            setCode('');
            
            // Reset the max attempts and transition states
            setMaxAttemptsExceeded(false);
          }, 1500);
        } else {
          // Show error message with attempts remaining
          setVerificationErrorMessage(`Invalid code. Try again (${newAttempts} ${newAttempts === 1 ? 'attempt' : 'attempts'} remaining).`);
          
          // Focus on the code input after a short delay to allow keyboard to reappear
          setTimeout(() => {
            codeInputRef.current?.focusLastInput();
          }, 200);
        }
      } else {
        // For errors where we don't reduce attempts
        setVerificationErrorMessage(errorMessage);
        
        // If max attempts exceeded, reset after delay
        if (error instanceof Error && error.message === SignupErrorTypes.MAX_ATTEMPTS_EXCEEDED) {
          setTimeout(() => {
            setShowEmailInput(true);
            setShowVerificationPanel(false);
            setVerificationStatus('');
            setAttemptsLeft(5);
            setCode('');
            setMaxAttemptsExceeded(false);
          }, 1500);
        }
      }
    }
  };

  // Handle verified email click
  const handleVerifiedEmailClick = () => {
    if (verificationStatus === 'verified') {
      Alert.alert(
        "Verification Complete",
        isFromGoogleAuth ?
          "You're creating an account with your Google email. If you stop now, you'll need to restart the Google sign-up process." :
          "Would you like to continue with the current email or restart signup?",
        [
          {
            text: "Continue",
            style: "default",
          },
          {
            text: "Restart",
            onPress: () => {
              // Use accordion-like unfolding animation
              LayoutAnimation.configureNext({
                duration: 350,
                create: { 
                  type: LayoutAnimation.Types.spring, 
                  property: LayoutAnimation.Properties.scaleXY,
                  springDamping: 0.7,
                },
                update: { 
                  type: LayoutAnimation.Types.spring,
                  springDamping: 0.7,
                  property: LayoutAnimation.Properties.scaleXY,
                }
              });
              
              // Reset to initial state
              setShowEmailInput(true);
              setShowVerificationPanel(false);
              setVerificationStatus('');
              setEmail('');
              setPhone('');
              setIdentifierValid(false);
              setIdentifierError('');
              setCode('');
              setAttemptsLeft(5);
              
              // Reset birthday and personal details
              setBirthday(null);
              setAge(0);
              setDatePickerTouched(false);
              setBirthdayValid(false);
              setShowBirthdayPicker(false); // Changed to false to fix the initial state issue
              
              // Reset personal details
              setFirstName('');
              setLastName('');
              setPersonalUsername('');
              setPersonalPassword('');
              setConfirmPersonalPassword('');
              setFirstNameValid(false);
              setPersonalUsernameValid(false);
              setPersonalPasswordValid(false);
              setPersonalPasswordsMatch(false);
              setShowPersonalDetails(false);
              setShowPersonalDetailsErrors(false);
              
              // Reset timer
              if (resendTimerRef.current) {
                clearInterval(resendTimerRef.current);
                resendTimerRef.current = null;
              }
              setRemainingTime(0);
              
              // Reset Google auth state if previously set
              setIsFromGoogleAuth(false);
            }
          }
        ]
      );
    } else if (showVerificationPanel) {
      // If verification is in progress, show confirmation dialog
      Alert.alert(
        "Cancel Verification?",
        isFromGoogleAuth ?
          "Editing your Google account email will cancel the account creation process. You'll need to restart with Google sign-in." :
          "Editing your email will cancel the verification process. You may need to wait before requesting a new code.",
        [
          {
            text: "Continue Verification",
            style: "cancel"
          },
          {
            text: "Edit Email",
            onPress: () => {
              // Use accordion-like folding animation
              LayoutAnimation.configureNext({
                duration: 350,
                create: { 
                  type: LayoutAnimation.Types.spring, 
                  property: LayoutAnimation.Properties.scaleXY,
                  springDamping: 0.7,
                },
                update: { 
                  type: LayoutAnimation.Types.spring,
                  springDamping: 0.7,
                  property: LayoutAnimation.Properties.scaleXY,
                },
                delete: {
                  type: LayoutAnimation.Types.spring,
                  property: LayoutAnimation.Properties.scaleXY,
                  springDamping: 0.7,
                }
              });
              
              setShowVerificationPanel(false);
              
              // Reset timer when going back to edit email/phone
              if (resendTimerRef.current) {
                clearInterval(resendTimerRef.current);
                resendTimerRef.current = null;
              }
              setRemainingTime(0);
              
              // Then expand the email input after a short delay
              setTimeout(() => {
                // Use accordion-like unfolding animation
                LayoutAnimation.configureNext({
                  duration: 350,
                  create: { 
                    type: LayoutAnimation.Types.spring, 
                    property: LayoutAnimation.Properties.scaleXY,
                    springDamping: 0.7,
                  },
                  update: { 
                    type: LayoutAnimation.Types.spring,
                    springDamping: 0.7,
                    property: LayoutAnimation.Properties.scaleXY,
                  }
                });
                
                setShowEmailInput(true);
                
                // Also reset Google auth state if applicable
                if (isFromGoogleAuth) {
                  setIsFromGoogleAuth(false);
                }
              }, 100);
            }
          }
        ]
      );
    } else {
      // Use accordion-like folding animation
      LayoutAnimation.configureNext({
        duration: 350,
        create: { 
          type: LayoutAnimation.Types.spring, 
          property: LayoutAnimation.Properties.scaleXY,
          springDamping: 0.7,
        },
        update: { 
          type: LayoutAnimation.Types.spring,
          springDamping: 0.7,
          property: LayoutAnimation.Properties.scaleXY,
        },
        delete: {
          type: LayoutAnimation.Types.spring,
          property: LayoutAnimation.Properties.scaleXY,
          springDamping: 0.7,
        }
      });
      
      setShowVerificationPanel(false);
      
      // Reset timer when going back to edit email/phone
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
      setRemainingTime(0);
      
      // Then expand the email input after a short delay
      setTimeout(() => {
        // Use accordion-like unfolding animation
        LayoutAnimation.configureNext({
          duration: 350,
          create: { 
            type: LayoutAnimation.Types.spring, 
            property: LayoutAnimation.Properties.scaleXY,
            springDamping: 0.7,
          },
          update: { 
            type: LayoutAnimation.Types.spring,
            springDamping: 0.7,
            property: LayoutAnimation.Properties.scaleXY,
          }
        });
        
        setShowEmailInput(true);
      }, 100);
    }
  };

  // Simplified resend code handler to prevent stack overflow and properly sync with server cooldown
  const handleResendCode = useCallback(async () => {
    // Don't do anything if timer is still active
    if (remainingTime > 0) return;
    
    // Double-check we're not already loading
    if (loading) return;
    
    // Set loading state first, before any async operations
    setLoading(true);
    
    try {
      // Clear any previous interval
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
      
      // First check if there's a server-side cooldown still active
      // This helps sync client and server state
      if (identifierType === 'email') {
        try {
          // Send the verification code
          await sendVerificationCode(email);
          
          // Code sent successfully - set the cooldown
          const cooldownDuration = 60; // Standard 60 second cooldown
          await storeVerificationCooldown(email, cooldownDuration);
          
          // Set UI state for the cooldown
          setRemainingTime(cooldownDuration);
          setAttemptsLeft(5);
          setVerificationErrorMessage('');
          setCode('');
          
          // Start the cooldown timer
          resendTimerRef.current = setInterval(() => {
            setRemainingTime(prev => {
              const nextValue = prev - 1;
              if (nextValue <= 0) {
                if (resendTimerRef.current) {
                  clearInterval(resendTimerRef.current);
                  resendTimerRef.current = null;
                }
                return 0;
              }
              return nextValue;
            });
          }, 1000) as unknown as number;
          
          // Show success message
          Alert.alert(
            "Verification Code Sent",
            `A new code has been sent to ${email}.`,
            [{ text: "OK" }]
          );
        } catch (error) {
          console.error('Error sending verification code:', error);
          
          // Parse server cooldown from error if available
          if (error instanceof Error && error.message.includes('wait') && error.message.includes('seconds')) {
            const match = error.message.match(/wait\s+(\d+)\s+seconds/);
            if (match && match[1]) {
              const serverCooldownSeconds = parseInt(match[1]);
              
              // Update local cooldown to match server
              if (serverCooldownSeconds > 0) {
                // Store in AsyncStorage
                await storeVerificationCooldown(email, serverCooldownSeconds);
                
                // Update UI
                setRemainingTime(serverCooldownSeconds);
                
                // Start countdown
                resendTimerRef.current = setInterval(() => {
                  setRemainingTime(prev => {
                    const nextValue = prev - 1;
                    if (nextValue <= 0) {
                      if (resendTimerRef.current) {
                        clearInterval(resendTimerRef.current);
                        resendTimerRef.current = null;
                      }
                      return 0;
                    }
                    return nextValue;
                  });
                }, 1000) as unknown as number;
                
                // Show cooldown message to user
                Alert.alert(
                  "Cooldown Active", 
                  `Please wait ${serverCooldownSeconds} seconds before requesting another code.`,
                  [{ text: "OK" }]
                );
              }
            } else {
              // If we can't parse the exact time, use a generic message
              Alert.alert("Resend Failed", error.message, [{ text: "OK" }]);
            }
          } else {
            // Handle other errors
            Alert.alert(
              "Resend Failed", 
              error instanceof Error ? error.message : "Failed to send verification code",
              [{ text: "OK" }]
            );
          }
        }
      } else {
        // Phone not implemented yet
        Alert.alert(
          "Phone Verification",
          "Phone verification is not yet implemented. Please use email instead.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Error in resend flow:', error);
      Alert.alert(
        "Error", 
        "An unexpected error occurred. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  }, [identifierType, email, remainingTime, loading]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
    };
  }, []);

  // Update handlePersonalDetailsSubmit to complete signup
  const handlePersonalDetailsSubmit = async () => {
    // Set flag to show validation errors
    setShowPersonalDetailsErrors(true);
    
    // Make sure the email was verified
    if (verificationStatus !== 'verified') {
      Alert.alert(
        "Email Verification Required",
        "Please verify your email address before continuing.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Verify terms and conditions are accepted
    if (!isTermsChecked) {
      Alert.alert(
        "Terms & Conditions Required",
        "Please accept the terms and conditions before continuing.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Check what fields are invalid and show appropriate errors
    let hasErrors = false;
    
    // Skip first/last name validation if from Google auth
    if (!isFromGoogleAuth && !firstNameValid) {
      setFirstNameError('First name must have at least 2 characters and no numbers');
      hasErrors = true;
    }
    
    if (!personalUsernameValid) {
      setPersonalUsernameError('Username must be 6-14 characters with only letters, numbers, . and _');
      hasErrors = true;
    }
    
    if (!personalPasswordValid) {
      setPersonalPasswordError('Password must be at least 8 characters with 2 numbers');
      hasErrors = true;
    }
    
    if (!personalPasswordsMatch) {
      setConfirmPersonalPasswordError('Passwords do not match');
      hasErrors = true;
    }
    
    if (hasErrors) {
      return;
    }
    
    try {
      // Show loading screen
      setIsSubmitting(true);
      
      // Reset the background scale
      backgroundScale.setValue(1);
      
      // First check if username is available
      const usernameTaken = await isUsernameTaken(personalUsername);
      if (usernameTaken) {
        setPersonalUsernameError('This username is already taken. Please choose another.');
        setShowPersonalDetailsErrors(true);
        setIsSubmitting(false);
        
        // Scroll to username field to show the error
        if (scrollViewRef.current && usernameRef.current) {
          setTimeout(() => {
            onFieldScroll(usernameRef);
          }, 100);
        }
        return;
      }
      
      // Prepare user data
      const dateOfBirth = birthday || new Date(); // Should never be null at this point
      
      console.log(`Completing signup for ${email} with terms acceptance: ${isTermsChecked}`);
      
      const userData = {
        firstName,
        lastName,
        username: personalUsername,
        dateOfBirth,
        email,
        termsAccepted: isTermsChecked // Include terms acceptance status
      };
      
      // Tell appStateManager we're in the signup success flow - this prevents immediate navigation
      appStateManager.setSignupInProgress(true);
      
      // Complete signup
      await completeSignup(email, personalPassword, userData);
      
      // Show success screen
      setShowSuccess(true);
      setCurrentStep('complete'); // Also set currentStep to complete for consistency
      
      // Update appStateManager to track that options sheet should be shown
      appStateManager.setShowOnboardingOptions(true);
      
      // Show options sheet immediately - no delay
      setShowOptionsSheet(true);
      
      // Reset all validation and form state since signup is complete
      resetFormState();
      
      // Override the back behavior to navigate to welcome if user tries to go back
      navigation.setOptions({
        gestureEnabled: true,
        headerLeft: () => null,
      });
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific errors
      let errorMessage = "An error occurred during signup. Please try again.";
      
      if (error instanceof Error) {
        if (error.message === SignupErrorTypes.EMAIL_ALREADY_IN_USE) {
          errorMessage = "This email is already in use. Please use a different email.";
        } else if (error.message === SignupErrorTypes.WEAK_PASSWORD) {
          errorMessage = "Your password is too weak. Please use a stronger password.";
          setPersonalPasswordError(errorMessage);
        } else if (error.message === SignupErrorTypes.USERNAME_TAKEN) {
          errorMessage = "This username is already taken. Please choose another.";
          setPersonalUsernameError(errorMessage);
          
          // Scroll to username field to show the error
          if (scrollViewRef.current && usernameRef.current) {
            setTimeout(() => {
              onFieldScroll(usernameRef);
            }, 100);
          }
        } else if (error.message === SignupErrorTypes.NETWORK_ERROR) {
          errorMessage = "A network error occurred. Please check your connection and try again.";
        }
      }
      
      Alert.alert("Signup Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add handlers for options sheet
  const handleDismissOptionsSheet = () => {
    setShowOptionsSheet(false);
    
    // Set authenticated state after successful sign-up
    setTimeout(() => {
      // First tell appStateManager to hide the options sheet
      appStateManager.setShowOnboardingOptions(false);
      
      // End signup success flow and set authenticated state
      appStateManager.setSignupInProgress(false);
      appStateManager.setAuthenticated(true);
      authGuard.resetFailedChecks();
      
      // Ensure onboarding flag is false
      appStateManager.setOnboarding(false);
      
      // Navigate to Welcome screen which will now show the main content (not auth overlay)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }]
      });
    }, 300);
  };
  
  // Handle onboarding option
  const handleCompleteOnboarding = () => {
    setShowOptionsSheet(false);
    
    // Set authenticated and start onboarding
    setTimeout(() => {
      // First tell appStateManager to hide the options sheet
      appStateManager.setShowOnboardingOptions(false);
      
      // End signup success flow
      appStateManager.setSignupInProgress(false);
      
      // User has successfully signed up - set authenticated state
      appStateManager.setAuthenticated(true);
      authGuard.resetFailedChecks();
      
      // Set onboarding flag to true
      appStateManager.setOnboarding(true);
      
      // Navigate to onboarding flow
      navigation.navigate('OnboardingFlow');
    }, 300);
  };
  
  // Handle home option
  const handleProceedToHome = () => {
    setShowOptionsSheet(false);
    
    // Set authenticated state and navigate to home
    setTimeout(() => {
      // First tell appStateManager to hide the options sheet
      appStateManager.setShowOnboardingOptions(false);
      
      // End signup success flow
      appStateManager.setSignupInProgress(false);
      
      // User has successfully signed up - set authenticated state
      appStateManager.setAuthenticated(true);
      authGuard.resetFailedChecks();
      
      // Ensure onboarding flag is false
      appStateManager.setOnboarding(false);
      
      // Navigate to Welcome screen which will now show the main content (not auth overlay)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }]
      });
    }, 300);
  };

  // Personal details are valid when all fields are valid
  const arePersonalDetailsValid = () => {
    return firstNameValid && 
           lastNameValid && 
           personalUsernameValid && 
           personalPasswordValid && 
           personalPasswordsMatch;
  };

  // Add new animated values for content animation
  const contentSlideY = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Navigation and Back Handlers
  // Update handleBackConfirmation to remove destructive style
  const handleBackConfirmation = () => {
    if (hasShownBackConfirmation) {
      // If we've already shown the confirmation once, don't show it again
      resetAndNavigateBack();
      return;
    }

    if (navigationInProgress.current) {
      return; // Prevent duplicate dialogs
    }

    if (showVerificationPanel || verificationStatus === 'verified') {
      Alert.alert(
        "Cancel Sign Up?",
        "You're in the middle of verifying your email. Leaving now will cancel the process and all progress will be lost.",
        [
          {
            text: "Continue Verification",
            style: "cancel"
          },
          {
            text: "Cancel Verification",
            onPress: () => {
              // Set flag to prevent duplicate navigation
              navigationInProgress.current = true;
              // Reset form state
              resetAndNavigateBack();
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { cancelable: true }
      );
      // Mark that we've shown the confirmation
      setHasShownBackConfirmation(true);
    } else {
      // If we're in a basic step with no verification, just go back
      navigateBack();
    }
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  // Update handleBack to use the confirmation dialog when needed
  const handleBack = () => {
    if (isTransitioning) {
      return; // Prevent navigation during transitions
    }
    
    // If we're showing success, don't allow going back
    if (showSuccess) {
      return;
    }
    
    if (showVerificationPanel || verificationStatus === 'verified') {
      // Different message based on verification status
      const message = verificationStatus === 'verified' 
        ? "Going back will reset your progress including verification. Do you want to continue?" 
        : "You're in the middle of verifying your email. Leaving now will cancel the process and all progress will be lost.";
      
      Alert.alert(
        "Cancel Sign Up?",
        message,
        [
          {
            text: "Continue",
            style: "cancel"
          },
          {
            text: "Cancel Sign Up",
            onPress: () => {
              // Set flag to prevent duplicate navigation
              navigationInProgress.current = true;
              // Reset form state
              resetAndNavigateBack();
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { cancelable: true }
      );
      return;
    }

    navigateBack();
  };

  // Reset the form state
  const resetFormState = () => {
    // Only reset form fields but keep success state if we're in success mode
    if (!showSuccess) {
      setEmail('');
      setPhone('');
      setCode('');
      setCurrentStep('basic');
      setVerificationStatus('');
      setShowVerificationPanel(false);
      setShowEmailInput(true);
      setAttemptsLeft(5);
      setHasShownBackConfirmation(false);
      setIdentifierValid(false);
      
      // Reset birthday and personal details
      setBirthday(null);
      setAge(0);
      setDatePickerTouched(false);
      setBirthdayValid(false);
      setShowBirthdayPicker(false); // Changed to false to fix the initial state issue
      
      // Reset personal details
      setFirstName('');
      setLastName('');
      setPersonalUsername('');
      setPersonalPassword('');
      setConfirmPersonalPassword('');
      setFirstNameValid(false);
      setPersonalUsernameValid(false);
      setPersonalPasswordValid(false);
      setPersonalPasswordsMatch(false);
      setShowPersonalDetails(false);
      setShowPersonalDetailsErrors(false);
    }
    
    // Always reset timer
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    setRemainingTime(0);
  };

  // Reset the form and navigate back to the start
  const resetAndNavigateBack = () => {
    // Reset all form state
    resetFormState();
    
    // Navigate back
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Handle Sign In navigation
  const handleSignIn = () => {
    if (isTransitioning) {
      return; // Prevent navigation during transitions
    }
    
    if (showVerificationPanel || verificationStatus === 'verified' || currentStep !== 'basic') {
      Alert.alert(
        "Certain you have an account?",
        "All progress will be lost.",
        [
          {
            text: "Complete Sign Up",
            style: "cancel"
          },
          {
            text: "Continue to Sign In",
            onPress: () => {
              // Set flag to prevent duplicate navigation
              navigationInProgress.current = true;
              
              // Save current field values to pass to SignIn
              const params: any = {};
              
              // Always pass the current email/phone, whether valid or not
              if (identifierType === 'email') {
                params.email = email;
              } else {
                params.phone = phone;
              }
              params.identifierType = identifierType;
              
              // Pass the current validation state
              params.isValidated = identifierValid;
              
              // Reset form state before navigating
              resetFormState();
              
              navigation.navigate('SignIn', params);
              
              // Reset the flag after navigation
              setTimeout(() => {
                navigationInProgress.current = false;
              }, 500);
            }
          }
        ],
        { cancelable: true }
      );
    } else {
      // Always pass the current field values
      const params: any = {};
      
      // Always pass the current email/phone, whether valid or not
      if (identifierType === 'email') {
        params.email = email;
      } else {
        params.phone = phone;
      }
      params.identifierType = identifierType;
      
      // Pass the current validation state
      params.isValidated = identifierValid;
      
      // We should NOT reset the field values or validation state here
      // We want to preserve the values for when the user comes back
      
      navigation.navigate('SignIn', params);
    }
  };

  // Render Methods
  // Render the collapsed email section - adjust spacing to touch verification section
  const renderCollapsedEmailSection = () => {
    // Prevent rendering during transitions to avoid stack overflow
    if (isTransitioning || loading || verifyingCode) {
      return (
        <View style={{
          marginTop: normalize(5),
          marginBottom: normalize(-2),
          paddingVertical: normalize(12),
          paddingHorizontal: normalize(12),
          backgroundColor: theme.background,
          width: '97%',
          alignSelf: 'center',
          height: normalize(50), // Fixed height to prevent layout shifts
        }} />
      );
    }

    // No console log here - this was causing the infinite loop
    const rightIcon = verificationStatus === 'verified' 
      ? <Icon name="check-circle-outline" size={normalize(18)} color={theme.success} />
      : <Icon name="pencil" size={normalize(16)} color={theme.text.primary} />;
    
    return (
      <ThemedCollapsableSection
        title={text.components.collapsable.emailVerification}
        isExpanded={false}
        onToggle={handleVerifiedEmailClick}
        collapsedContent={
          identifierType === 'email'
            ? `${verificationStatus === 'verified' ? 
                (isFromGoogleAuth ? 'Verified with Google' : text.components.collapsable.verified) 
                : text.components.collapsable.verifying} ${text.components.collapsable.emailPrefix} ${getTruncatedIdentifier(email)}`
            : `${verificationStatus === 'verified' ? text.components.collapsable.verified : text.components.collapsable.verifying} ${text.components.collapsable.phonePrefix} ${phone}`
        }
        rightIcon={rightIcon}
        zIndex={1}
        collapsedStyle={{
          marginTop: normalize(5),
          marginBottom: normalize(-2), // Negative margin to pull the next component closer
          paddingVertical: 0, // Let the component's internal padding handle spacing
          paddingHorizontal: normalize(12),
          opacity: 1, // Ensure not dim
          backgroundColor: theme.background,
          width: '97%', // Slightly wider for better visual flow
          alignSelf: 'center',
        }}
      >
        {null}
      </ThemedCollapsableSection>
    );
  };

  // Render the collapsed personal details component
  const renderCollapsedPersonalDetails = () => {
    // Avoid re-renders during animation
    if (isAnimating) {
      return null;
    }
    
    // Only log every few seconds to reduce spam
    const shouldLog = Date.now() % 3000 < 100;
    if (shouldLog) {
      console.log('🔍 renderCollapsedPersonalDetails - states:', {
        showPersonalDetails,
        birthdayValid,
        firstNameValid,
        personalUsernameValid,
      });
    }
    
    // Don't show when personal details section is already expanded
    if (showPersonalDetails) {
      if (shouldLog) console.log('❌ Not showing collapsed personal details - section is expanded');
      return null;
    }
    
    // Check if ANY field has valid data
    const hasAnyValidField = 
      firstNameValid || 
      personalUsernameValid || 
      personalPasswordValid || 
      personalPasswordsMatch;
    
    // Only show if birthday is valid and any personal field is valid
    if (!birthdayValid || !hasAnyValidField) {
      if (shouldLog) console.log('❌ Not showing collapsed personal details - no valid data');
      return null;
    }
    
    if (shouldLog) console.log('✅ Rendering collapsed personal details');
    // Prepare display text based on what info is available
    let displayText = text.components.collapsable.personalDetailsTitle;
    
    // If first name is valid, use it
    if (firstNameValid) {
      const nameDisplay = `${getTruncatedName(firstName)} ${getLastNameInitial(lastName)}`.trim();
      // If username is also valid, include it
      displayText = personalUsernameValid ? 
        `${nameDisplay} (@${personalUsername})` : 
        nameDisplay;
    } 
    // Otherwise if only username is valid, show that
    else if (personalUsernameValid) {
      displayText = `@${personalUsername}`;
    }
    // Otherwise if only password is valid, indicate that
    else if (personalPasswordValid) {
      displayText = text.components.collapsable.passwordSaved;
    }
    
    const rightIcon = (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {personalPasswordValid && (
            <Icon 
              name="shield-check" 
              size={normalize(14)} 
              color={personalPasswordsMatch ? theme.success : theme.text.tertiary} 
              style={{ marginRight: normalize(6) }}
            />
          )}
          <Icon name="pencil" size={normalize(16)} color={theme.success} />
        </View>
    );

    return (
      <ThemedCollapsableSection
        title={text.components.collapsable.personalDetailsTitle}
        isExpanded={false}
        onToggle={togglePersonalDetails}
        collapsedContent={displayText}
        rightIcon={rightIcon}
        zIndex={showBirthdayPicker ? 1 : 10}
        collapsedStyle={{ 
          marginTop: showBirthdayPicker ? normalize(20) : normalize(-12),
          paddingVertical: normalize(10),
          paddingHorizontal: normalize(12),
          opacity: 1, // Ensure not dim
          backgroundColor: theme.background,
          width: '97%', // Slightly wider for better visual flow
          alignSelf: 'center',
        }}
      >
        {null}
      </ThemedCollapsableSection>
    );
  };

  // Render the action button
  const renderActionButton = () => {
    if (currentStep === 'basic') {
      if (!showVerificationPanel && showEmailInput) {
        // For the "Send code" button, we need to check both terms and identifier validity
        const isDisabled = !isTermsChecked || !identifierValid;
        
        if (isDisabled) {
          // Only use TouchableOpacity wrapper when button should be disabled
          return (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => {
                // Set attempted submit to true whenever button is clicked
                setHasAttemptedSubmit(true);
                
                if (!isTermsChecked) {
                  Alert.alert("Terms Agreement Required", "Please check the box to agree to the terms and conditions before proceeding.");
                } else if (!identifierValid) {
                  if (identifierType === 'email') {
                    setIdentifierError('Please enter a valid email address');
                  } else {
                    setIdentifierError('Please enter a valid phone number');
                  }
                }
              }}
              style={styles.button.withLargerMargin}
            >
              <Button
                title="Send code"
                onPress={() => {}} // Empty handler since parent TouchableOpacity handles it
                loading={loading}
                disabled={true}
                style={styles.button.fullWidth}
              />
            </TouchableOpacity>
          );
        } else {
          // For valid state, use Button directly with proper handler
          return (
            <Button
              title="Send code"
              onPress={handleSendCode}
              loading={loading}
              disabled={false}
              style={styles.button.withLargerMargin}
            />
          );
        }
      } else {
        // For verification panel button, we handle in the panel itself
        return null;
      }
    } else {
      return null;
    }
  };

  // Add a new animated value for background scaling effect
  const backgroundScale = useRef(new Animated.Value(1)).current;

  // Add effect to animate background scale when options sheet appears
  useEffect(() => {
    // Add dummy listener to prevent warning
    const backgroundScaleListener = backgroundScale.addListener(() => {});
    
    let animation: Animated.CompositeAnimation;
    
    if (showOptionsSheet) {
      // When sheet appears, scale background down slightly with spring effect
      animation = Animated.spring(backgroundScale, {
        toValue: 0.95,
        friction: 8, // Lower friction for more bounce
        tension: 40, // Lower tension for smoother animation
        useNativeDriver: true
      });
    } else {
      // When sheet disappears, scale background back to normal
      animation = Animated.spring(backgroundScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      });
    }
    
    animation.start();
    
    // Clean up animation and listener
    return () => {
      animation.stop();
      backgroundScale.removeListener(backgroundScaleListener);
    };
  }, [showOptionsSheet, backgroundScale]);

  // Add a state to track sheet drag progress
  const [sheetDragProgress, setSheetDragProgress] = useState(0);

  // Update the backgroundScale value calculation based on sheetDragProgress
  useEffect(() => {
    // Calculate scale value that gradually restores from 0.95 to 1 as sheet is dragged
    const targetScale = showOptionsSheet 
      ? 0.95 + (0.05 * sheetDragProgress) // Scale linearly from 0.95 to 1.0 based on drag
      : 1;
    
    // Animate to the target scale
    Animated.spring(backgroundScale, {
      toValue: targetScale,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, [showOptionsSheet, backgroundScale, sheetDragProgress]); // Add sheetDragProgress as dependency

  // Handle sheet drag progress
  const handleSheetDragProgress = (progress: number) => {
    setSheetDragProgress(progress);
  };

  // Add the isDarkMode function just before renderCurrentStep
  const isDarkMode = () => {
    const bgColor = theme.background.toLowerCase();
    const isHex = bgColor.startsWith('#');
    
    if (isHex) {
      const hex = bgColor.substring(1);
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      return brightness < 0.5;
    }
    
    return bgColor.includes('black') || bgColor.includes('dark');
  };

  // Also move generateUsername function above renderCurrentStep
  const generateUsername = async () => {
    // First check if we have a first name
    if (firstName.length < 2) {
      Alert.alert(
        "First Name Required",
        "Please enter your first name before generating a username.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Start generating username - loading state
    setPersonalUsernameValid(false);
    setPersonalUsername(""); // Clear current username
    
    try {
      // Normalize names - remove special characters, convert to lowercase
      const normalizedFirst = firstName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
      
      const normalizedLast = lastName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
      
      // Base username formats to try
      const baseFormats = [];
      
      // Add first name with random numbers
      baseFormats.push(normalizedFirst);
      
      // If we have a last name, add combinations
      if (normalizedLast.length > 0) {
        baseFormats.push(`${normalizedFirst}.${normalizedLast}`);
        baseFormats.push(`${normalizedFirst}_${normalizedLast}`);
        baseFormats.push(`${normalizedFirst}${normalizedLast}`);
        
        // If last name is long enough, use first initial + last name
        if (normalizedLast.length >= 4) {
          baseFormats.push(`${normalizedFirst[0]}${normalizedLast}`);
        }
      }
      
      // Shuffle the array for variety
      const shuffledFormats = baseFormats.sort(() => 0.5 - Math.random());
      
      // Try each format with different numbers until we find an available one
      for (const format of shuffledFormats) {
        // If format is already at least 6 chars, try it as is first
        if (format.length >= 6 && format.length <= 14) {
          const isTaken = await isUsernameTaken(format);
          if (!isTaken) {
            setPersonalUsername(format);
            handlePersonalUsernameChange(format);
            return;
          }
        }
        
        // Try with different random numbers
        for (let i = 0; i < 10; i++) {
          // Generate random 2-4 digit number
          const randomNum = Math.floor(100 + Math.random() * 9000).toString();
          const candidateUsername = `${format}${randomNum}`;
          
          // Make sure it's not too long
          if (candidateUsername.length > 14) continue;
          
          // Check availability
          const isTaken = await isUsernameTaken(candidateUsername);
          if (!isTaken) {
            setPersonalUsername(candidateUsername);
            handlePersonalUsernameChange(candidateUsername);
            return;
          }
        }
      }
      
      // If we get here, we couldn't find an available username
      // Try one last completely random approach
      const randomChars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const randomUsername = normalizedFirst.substring(0, 4) + 
        Array(5).fill(0).map(() => randomChars.charAt(Math.floor(Math.random() * randomChars.length))).join('');
      
      const isTaken = await isUsernameTaken(randomUsername);
      if (!isTaken) {
        setPersonalUsername(randomUsername);
        handlePersonalUsernameChange(randomUsername);
        return;
      }
      
      // If even that fails, show an error
      Alert.alert(
        "Username Generation Failed",
        "We couldn't generate a unique username. Please try entering one manually.",
        [{ text: "OK" }]
      );
      
    } catch (error) {
      console.error("Error generating username:", error);
      Alert.alert(
        "Username Generation Failed",
        "An error occurred while generating a username. Please try again or enter one manually.",
        [{ text: "OK" }]
      );
    }
  };

  // Now renderCurrentStep can use these functions in its dependency array
  const renderCurrentStep = () => {
    if (isSubmitting) {
      return (
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
          zIndex: 10
        }}>
          <SignUpLoading />
        </View>
      );
    }
    
    if (showSuccess || currentStep === 'complete') {
      return (
        <Animated.View style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: showOptionsSheet 
              ? isDarkMode()
                  ? 'rgba(35, 35, 40, 1)'  
                  : 'rgba(245, 245, 250, 1)' 
              : theme.background,
            zIndex: 10,
          },
          showOptionsSheet ? {
            borderRadius: 25 * (1 - sheetDragProgress * 0.8),
            borderWidth: 1 * (1 - sheetDragProgress * 0.8), 
            borderColor: isDarkMode()
              ? `rgba(255, 255, 255, ${0.15 * (1 - sheetDragProgress)})` 
              : `rgba(0, 0, 0, ${0.15 * (1 - sheetDragProgress)})`,
            shadowColor: isDarkMode() ? '#000' : '#888',
            shadowOffset: { width: 0, height: 12 * (1 - sheetDragProgress) },
            shadowOpacity: 0.4 * (1 - sheetDragProgress),
            shadowRadius: 25 * (1 - sheetDragProgress),
            elevation: 20 * (1 - sheetDragProgress),
            margin: 20 * (1 - sheetDragProgress * 0.8),
          } : {},
          {
            transform: [
              { perspective: 1000 },
              { scale: backgroundScale },
              { translateY: Animated.multiply(
                  backgroundScale.interpolate({
                    inputRange: [0.95, 1],
                    outputRange: [-15, 0]
                  }),
                  new Animated.Value(1 - sheetDragProgress)
                )
              },
              { rotateX: backgroundScale.interpolate({
                inputRange: [0.95, 1],
                outputRange: [`${3 * (1 - sheetDragProgress)}deg`, '0deg']
              })}
            ],
            overflow: 'hidden'
          }
        ]}>
          <SignUpSuccess />
        </Animated.View>
      );
    }
    
    return (
      <View style={styles.formContainer}>
        {/* Show either the full form or the collapsed status display */}
        {showEmailInput ? (
          /* Full Form Component - Email/Phone Input */
          <IdentifierInput 
            identifierType={identifierType}
            email={email}
            phone={phone}
            identifierValid={identifierValid}
            identifierError={identifierError}
            identifierFocused={identifierFocused}
            inputOpacity={inputOpacity}
            onToggleIdentifierType={toggleIdentifierType}
            onEmailChange={handleEmailChange}
            onPhoneChange={handlePhoneChange}
            onIdentifierFocus={handleIdentifierFocus}
            onIdentifierBlur={handleIdentifierBlur}
            theme={theme}
            hasAttemptedSubmit={hasAttemptedSubmit}
            onEmailValidated={(isValid, errorMessage) => {
              // Update identifierValid state based on comprehensive validation
              if (errorMessage) {
                setIdentifierError(errorMessage);
              } else if (identifierError && isValid) {
                // Clear error when validation passes
                setIdentifierError('');
              }
              setIdentifierValid(isValid);
            }}
          />
        ) : (
          /* Collapsed Status Display */
          renderCollapsedEmailSection()
        )}
        
        {/* Verification Panel - Using memoized component to prevent re-renders */}
        {renderVerificationPanel()}
        
        {/* Birthday picker - show after email is verified */}
        {verificationStatus === 'verified' ? (
          <ThemedCollapsableSection
            title={text.components.collapsable.birthdayTitle}
            isExpanded={showBirthdayPicker}
            onToggle={toggleBirthdayPicker}
            collapsedContent={birthday ? `${text.components.collapsable.birthdayPrefix} ${formatBirthday(birthday)} (${age} ${text.components.collapsable.yearsOld})` : text.components.birthdayPicker.title}
            collapsedStyle={{
              marginTop: 0,
              marginBottom: normalize(20), 
              paddingVertical: 0,
              paddingHorizontal: normalize(12),
              opacity: 1,
              backgroundColor: theme.background,
              width: '97%',
              alignSelf: 'center',
            }}
          >
            {showBirthdayPicker && !isAnimating && (
              <View 
                style={{
                  marginTop: normalize(10),
                  marginBottom: normalize(10)
                }}
                pointerEvents={isAnimating ? 'none' : 'auto'}
              >
                <BirthdayPicker
                  birthday={birthday}
                  age={age}
                  birthdayValid={birthdayValid}
                  datePickerTouched={datePickerTouched}
                  onDateChange={handleBirthdayChange}
                  formatBirthday={formatBirthday}
                  onContinue={handleBirthdayNext}
                  theme={theme}
                />
              </View>
            )}
          </ThemedCollapsableSection>
        ) : null}
        
        {/* Collapsed Personal Details - show when not expanded */}
        {verificationStatus === 'verified' && birthdayValid && renderCollapsedPersonalDetails()}
        
        {/* Personal Details - show when expanded */}
        {verificationStatus === 'verified' && birthdayValid && !showBirthdayPicker && showPersonalDetails && (
          <PersonalDetailsForm
            firstName={firstName}
            lastName={lastName}
            username={personalUsername}
            password={personalPassword}
            confirmPassword={confirmPersonalPassword}
            firstNameValid={firstNameValid}
            lastNameValid={lastNameValid}
            usernameValid={personalUsernameValid}
            passwordValid={personalPasswordValid}
            passwordsMatch={personalPasswordsMatch}
            firstNameError={firstNameError}
            lastNameError={lastNameError}
            usernameError={personalUsernameError}
            passwordError={personalPasswordError}
            confirmPasswordError={confirmPersonalPasswordError}
            showErrors={showPersonalDetailsErrors}
            showPasswordChecklist={showPersonalPasswordChecklist}
            showPasswordMatchChecklist={showPersonalPasswordMatchChecklist}
            passwordRequirements={personalPasswordRequirements}
            scrollIndicatorOpacity={scrollIndicatorOpacity}
            hasUnfilledAbove={getUnfilledFieldsStatus().unfilledAbove}
            hasUnfilledBelow={getUnfilledFieldsStatus().unfilledBelow}
            scrollViewRef={scrollViewRef}
            firstNameRef={firstNameRef}
            usernameRef={usernameRef}
            passwordRef={passwordRef}
            confirmPasswordRef={confirmPasswordRef}
            showPasswordIcon={showPersonalPassword}
            showConfirmPasswordIcon={showConfirmPersonalPassword}
            isKeyboardVisible={isKeyboardVisible}
            onSetScrollPosition={(y, height) => {
              setScrollPosition(y);
              setContentHeight(height);
            }}
            onScrollStart={handleScrollStart}
            onScrollEnd={handleScrollEnd}
            onFirstNameChange={handleFirstNameChange}
            onLastNameChange={handleLastNameChange}
            onUsernameChange={handlePersonalUsernameChange}
            onPasswordChange={handlePersonalPasswordChange}
            onConfirmPasswordChange={handleConfirmPersonalPasswordChange}
            onFirstNameFocus={handleFirstNameFocus}
            onFirstNameBlur={handleFirstNameBlur}
            onLastNameFocus={handleLastNameFocus}
            onLastNameBlur={handleLastNameBlur}
            onUsernameFocus={handlePersonalUsernameFocus}
            onUsernameBlur={handlePersonalUsernameBlur}
            onPasswordFocus={handlePersonalPasswordFocus}
            onPasswordBlur={handlePersonalPasswordBlur}
            onConfirmPasswordFocus={handleConfirmPersonalPasswordFocus}
            onConfirmPasswordBlur={handleConfirmPersonalPasswordBlur}
            onToggleShowPassword={() => setShowPersonalPassword(!showPersonalPassword)}
            onToggleShowConfirmPassword={() => setShowConfirmPersonalPassword(!showConfirmPersonalPassword)}
            onSubmit={handlePersonalDetailsSubmit}
            onFieldScroll={scrollToComponent}
            theme={theme}
            formValid={isFromGoogleAuth ? personalUsernameValid : arePersonalDetailsValid()}
            onGenerateUsername={generateUsername}
            hideNameFields={isFromGoogleAuth}
            hidePasswordFields={isFromGoogleAuth}
          />
        )}
      </View>
    );
  };

  // Add this useEffect near the other useEffects to handle the logging
  useEffect(() => {
    // Log component rendering states for debugging
    console.log('🔍 Render states:', {
      verificationStatus,
      birthdayValid,
      showBirthdayPicker,
      showPersonalDetails,
      isAnimating
    });
  }, [verificationStatus, birthdayValid, showBirthdayPicker, showPersonalDetails, isAnimating]);

  // Add this useEffect to track state changes
  useEffect(() => {
    // Check if verification status changed
    if (prevVerificationStatus.current !== verificationStatus) {
      console.log(`🔄 verificationStatus changed: ${prevVerificationStatus.current} -> ${verificationStatus}`);
      stateChangesCount.current.verificationStatus++;
      prevVerificationStatus.current = verificationStatus;
    }
    
    // Check if showBirthdayPicker changed
    if (prevShowBirthdayPicker.current !== showBirthdayPicker) {
      console.log(`🔄 showBirthdayPicker changed: ${prevShowBirthdayPicker.current} -> ${showBirthdayPicker}`);
      stateChangesCount.current.showBirthdayPicker++;
      prevShowBirthdayPicker.current = showBirthdayPicker;
    }
    
    // Check if showPersonalDetails changed
    if (prevShowPersonalDetails.current !== showPersonalDetails) {
      console.log(`🔄 showPersonalDetails changed: ${prevShowPersonalDetails.current} -> ${showPersonalDetails}`);
      stateChangesCount.current.showPersonalDetails++;
      prevShowPersonalDetails.current = showPersonalDetails;
    }
    
    // Check if isAnimating changed
    if (prevIsAnimating.current !== isAnimating) {
      console.log(`🔄 isAnimating changed: ${prevIsAnimating.current} -> ${isAnimating}`);
      stateChangesCount.current.isAnimating++;
      prevIsAnimating.current = isAnimating;
    }
    
    // If more than 3 state changes occur in one render cycle, it may indicate a problem
    if (stateChangesCount.current.showBirthdayPicker > 3 ||
        stateChangesCount.current.showPersonalDetails > 3) {
      console.warn('⚠️ Potential render loop detected! Multiple state changes in a short time.');
      console.log('State change counts:', stateChangesCount.current);
    }
    
    // Reset counts every 500ms to avoid false positives
    const resetTimer = setTimeout(() => {
      stateChangesCount.current = {
        verificationStatus: 0,
        showBirthdayPicker: 0,
        showPersonalDetails: 0,
        isAnimating: 0
      };
    }, 500);
    
    return () => clearTimeout(resetTimer);
  }, [verificationStatus, showBirthdayPicker, showPersonalDetails, isAnimating]);

  // Update the effect that tracks field positions
  useEffect(() => {
    // Schedule measurement of field positions on layout
    const measureFieldPositions = () => {
      // Measure field positions within the scrollview
      const measureField = (fieldRef: React.RefObject<View>, fieldName: keyof typeof fieldPositions) => {
        if (scrollViewRef.current && fieldRef.current) {
          fieldRef.current.measureLayout(
            // @ts-ignore
            scrollViewRef.current,
            (x, y, width, height) => {
              setFieldPositions(prev => ({
                ...prev,
                [fieldName]: { ...prev[fieldName], y, height }
              }));
            },
            () => console.log(`Failed to measure ${fieldName}`)
          );
        }
      };
      
      // Measure each field
      measureField(firstNameRef, 'firstName');
      measureField(usernameRef, 'username');
      measureField(passwordRef, 'password');
      measureField(confirmPasswordRef, 'confirmPassword');
    };
    
    // Initial measurement
    if (showPersonalDetails) {
      setTimeout(measureFieldPositions, 300);
    }
    
    // Re-measure on keyboard show/hide
    if (isKeyboardVisible) {
      setTimeout(measureFieldPositions, 300);
    }
    
  }, [showPersonalDetails, isKeyboardVisible]);
  
  // Remove duplicate handleFirstNameFocus

  // Add at the end of the component, right before the return statement
  // Render the success options sheet
  const renderSuccessOptionsSheet = () => {
    return (
      <SuccessOptionsSheet
        visible={showOptionsSheet}
        onDismiss={handleDismissOptionsSheet}
        onCompleteOnboarding={handleCompleteOnboarding}
        onProceedToHome={handleProceedToHome}
        onDragProgress={handleSheetDragProgress}
      />
    );
  };

  // Add this function to prevent navigating back from success screen
  useEffect(() => {
    if (showSuccess) {
      // Prevent going back once signup is successful
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // If we're showing success and user tries to go back, redirect to welcome
        if (e.data.action.type === 'GO_BACK') {
          e.preventDefault();
          
          // Navigate to welcome screen instead
          navigation.reset({
            index: 0,
            routes: [{ name: 'Welcome' }]
          });
        }
      });
      
      return unsubscribe;
    }
  }, [navigation, showSuccess]);

  // Add a function to scroll to component used in the form submission
  const onFieldScroll = (fieldRef: React.RefObject<View>, additionalOffset = 0) => {
    scrollToComponent(fieldRef, additionalOffset);
  };

  // Disable all layout animations during verification to prevent stack overflow
  useEffect(() => {
    // Store original function
    const originalConfigureNext = LayoutAnimation.configureNext;
    
    // Override with our protected version
    LayoutAnimation.configureNext = (config, onAnimationDidEnd, onAnimationDidFail) => {
      // Don't allow any animations during verification or loading
      if (verifyingCode || remainingTime > 0 || loading || isTransitioning) {
        console.log('🛑 Blocked animation during verification/loading');
        // Just call the callback immediately to avoid animation
        if (onAnimationDidEnd) {
          setTimeout(onAnimationDidEnd, 0);
        }
        return;
      }
      
      // Normal case - allow the animation
      return originalConfigureNext(config, onAnimationDidEnd, onAnimationDidFail);
    };
    
    // Restore original on cleanup
    return () => {
      LayoutAnimation.configureNext = originalConfigureNext;
    };
  }, [verifyingCode, remainingTime, loading, isTransitioning]);

  // Simple wrapper to prevent excessive re-renders for verification panel
  const renderVerificationPanel = useCallback(() => {
    if (!showVerificationPanel) return null;
    
    return (
      <VerificationPanel
        ref={codeInputRef}
        identifierType={identifierType}
        identifier={identifierType === 'email' ? email : phone}
        code={code}
        onChange={setCode}
        onChangeStart={handleCodeChangeStart}
        onVerify={handleVerifyCode}
        onResend={handleResendCode}
        verificationStatus={verificationStatus}
        verifyingCode={verifyingCode}
        maxAttemptsExceeded={maxAttemptsExceeded}
        remainingTime={remainingTime}
        errorMessage={verificationErrorMessage}
        isTransitioning={isTransitioning}
        theme={theme}
        formatIdentifier={formatPhoneForDisplay}
      />
    );
  }, [
    showVerificationPanel,
    identifierType,
    email,
    phone,
    code,
    verificationStatus,
    verifyingCode,
    maxAttemptsExceeded,
    remainingTime,
    verificationErrorMessage,
    isTransitioning,
    theme,
    handleResendCode,
    handleVerifyCode
  ]);

  // Add effect to prevent state changes during animations
  useEffect(() => {
    if (isAnimating) {
      console.log('🛑 Animation in progress, preventing state changes');
      const timer = setTimeout(() => {
        console.log('✅ Animation should be complete now, allowing state changes');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);
  
  // Update useEffect to handle Google auth flow
  useEffect(() => {
    // If coming from Google Auth with skipToStep param, go to the birthday step directly
    if (isFromGoogleAuth && skipToStep === 'birthday' && verificationStatus !== 'verified') {
      console.log('Google Auth detected, skipping to birthday step');
      
      // Set verification status to verified
      setVerificationStatus('verified');
      setEmail(initialEmail); // Ensure email is set
      setIdentifierValid(true);
      
      // Show birthday picker
      setShowBirthdayPicker(true);
    }
  }, [isFromGoogleAuth, skipToStep]);
  
  // Main render
  return (
    <SafeAreaView style={[styles.safeArea, { height: '100%' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.layout.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          {/* This View takes flex: 1 and is adjusted by KAV */}
          {/* Content inside might need paddingBottom to avoid fixed footer */}
          <View style={styles.layout.flex1}> 

            <TouchableOpacity
              style={[
                styles.backButton, 
                { 
                  top: Platform.OS === 'ios' ? normalize(15) : normalize(10),
                  // Hide back button when loading, showing success, or transitioning
                  opacity: isSubmitting || showSuccess || isTransitioning ? 0 : 1,
                  // Add pointer events property to completely disable the button in these states
                  pointerEvents: isSubmitting || showSuccess || isTransitioning ? 'none' : 'auto'
                }
              ]}
              onPress={currentStep === 'basic' && !showVerificationPanel && verificationStatus !== 'verified' 
                ? () => navigation.goBack() 
                : handleBack}
              disabled={isTransitioning || isSubmitting || showSuccess}
            >
              <Icon name="arrow-left" size={normalize(24)} color={theme.text.primary} />
            </TouchableOpacity>

            {/* Main Content Area - takes available space */}
            <View style={[styles.layout.flexGrow1, { width: '100%' }]}>
              <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? normalize(12) : normalize(6) }]}>
                <View style={[styles.content, { width: '90%', maxWidth: width * 0.9 }]}>
                  <View style={[styles.stepContainer, { paddingTop: normalize(20) }]}>
                    {!isSubmitting && !showSuccess && renderCurrentStep()}
                  </View>
                  {currentStep !== 'complete' && !isSubmitting && !showSuccess && renderActionButton()}
                </View>
              </View>
            </View>
            
            {/* Render loading and success states outside normal container */}
            {isSubmitting && renderCurrentStep()}
            {showSuccess && renderCurrentStep()}
            
            {/* Transition blocker overlay */}
            <TransitionBlocker isVisible={isTransitioning && !isSubmitting && !showSuccess} />

          </View>
        </TouchableWithoutFeedback>
            
        {/* Render Footer elements outside KAV's direct influence */}
        {(currentStep !== 'basic' || verificationStatus !== 'verified') && !showSuccess && !isSubmitting && (
          <>
            <View style={[styles.checkboxContainer, { bottom: normalize(75) }]}>
              <TermsCheckbox
                isChecked={isTermsChecked}
                onToggle={() => !isTransitioning && setIsTermsChecked(!isTermsChecked)}
              />
            </View>
            <View style={[styles.footerContainer, { 
              paddingBottom: Platform.OS === 'ios' ? normalize(30) : normalize(20),
              paddingTop: normalize(1)
            }]}>
              <View style={styles.divider} />
              <View style={styles.signInLink}>
                <Text style={[styles.signInText, { fontSize: normalize(14) }]}>{text.auth.signUp.footer.haveAccount}</Text>
                <TouchableOpacity onPress={handleSignIn} disabled={isTransitioning}>
                  <Text style={[styles.signInButton, { fontSize: normalize(14) }]}>{text.auth.signUp.footer.signIn}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
      
      {/* Render the success options sheet outside the KeyboardAvoidingView */}
      {renderSuccessOptionsSheet()}
    </SafeAreaView>
  );
};

export default SignUpScreen; 