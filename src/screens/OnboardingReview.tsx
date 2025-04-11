import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Pressable,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { useTheme } from '../styles/theme/ThemeContext';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import StepTracker from '../components/Onboarding/StepTracker';
import { markOnboardingCompleted, markOnboardingSkipped } from '../utils/appStateManager';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseconfig';
import { setUserPreferences, getUserPreferences } from '../services/firestoreService';
import SuccessOptionsSheet from '../components/common/SuccessOptionsSheet';

// Add setTimeout type declaration at the top
declare const setTimeout: (callback: () => void, ms: number) => number;

type OnboardingReviewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingOverview'>;

// Define the total number of onboarding steps
const TOTAL_ONBOARDING_STEPS = 4;

// Map of step numbers to screen names
const SCREEN_NAMES = [
  "", // No step 0
  "Onboarding", // Step 1: Style preferences
  "OnboardingBrands", // Step 2: Brand preferences
  "OnboardingSizing", // Step 3: Sizing preferences
  "OnboardingOverview" // Step 4: Overview of selections
];

const { width } = Dimensions.get('window');

// Update the route typing to handle returnTo parameter
type OnboardingReviewRouteParams = {
  returnTo?: string;
  fromReview?: boolean;
};

const OnboardingReview: React.FC = () => {
  const navigation = useNavigation<OnboardingReviewScreenNavigationProp>();
  const { isDarkMode, theme } = useTheme();
  const { 
    selectedStyles, 
    selectedBrands, 
    addStyle,
    removeStyle,
    addBrand,
    removeBrand
  } = useOnboardingContext();
  
  // State for sizes (loaded from AsyncStorage)
  const [topSize, setTopSize] = useState<string>('');
  const [bottomSize, setBottomSize] = useState<string>('');
  const [shoeSize, setShoeSize] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [filledSteps, setFilledSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State for Success Options Sheet
  const [showSuccessSheet, setShowSuccessSheet] = useState<boolean>(false);

  // Flag to determine if onboarding is already completed based on DB
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  
  // Delete feature states
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [deletedStyles, setDeletedStyles] = useState<string[]>([]);
  const [deletedBrands, setDeletedBrands] = useState<string[]>([]);
  const [showDeletedItems, setShowDeletedItems] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'styles' | 'brands' | null>(null);
  const [animatingItems, setAnimatingItems] = useState<{[key: string]: boolean}>({});
  
  // Animation values
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Update the wiggle animation to be more Apple-like
  useEffect(() => {
    if (isDeleteMode) {
      // Create a continuous loop with more natural oscillation
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggleAnim, {
            toValue: 0.5,
            duration: 180,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Ease-in-out bezier curve
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: -0.5,
            duration: 360,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation and reset to neutral position
      wiggleAnim.stopAnimation();
      wiggleAnim.setValue(0);
    }
  }, [isDeleteMode, wiggleAnim]);
  
  // Check if onboarding is already completed in the database
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const currentUser = auth().currentUser;
        if (!currentUser) return;
        
        // Get user document to check onboarding status
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('Firebase user data onboarding status:', {
            completed: userData.onboardingCompleted,
            steps: userData.onboardingSteps,
          });
          
          // Check if onboarding is already marked as completed
          if (userData.onboardingCompleted === true) {
            console.log('Onboarding already completed according to user document');
            setIsOnboardingCompleted(true);
            return;
          }
          
          // If not explicitly marked as completed, check if all steps are completed
          if (userData.onboardingSteps && userData.onboardingSteps.completedSteps) {
            const completedSteps = userData.onboardingSteps.completedSteps;
            // All 4 steps need to be completed
            const allStepsCompleted = [1, 2, 3, 4].every(step => completedSteps.includes(step));
            
            if (allStepsCompleted) {
              console.log('All steps are already completed according to user document');
              setIsOnboardingCompleted(true);
              return;
            }
          }
          
          // Also check if all required fields are filled in user_preferences
          const preferences = await getUserPreferences(currentUser.uid);
          if (preferences) {
            console.log('User preferences from database:', preferences);
            const hasStyles = preferences.preferredStyles && preferences.preferredStyles.length > 0;
            const hasBrands = preferences.preferredBrands && preferences.preferredBrands.length > 0;
            const hasSizing = !!(preferences.topsSize || preferences.bottomsSize || preferences.shoeSize);
            
            console.log('Preference checks:', { hasStyles, hasBrands, hasSizing });
            
            if (hasStyles && hasBrands && hasSizing) {
              console.log('All preference fields are filled in user_preferences');
              setIsOnboardingCompleted(true);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    
    checkOnboardingStatus();
  }, []);
  
  // Load sizing data from AsyncStorage on mount
  useEffect(() => {
    const loadSizingData = async () => {
      try {
        const sizingData = await AsyncStorage.getItem('sizingData');
        if (sizingData) {
          const { topSize: top, bottomSize: bottom, shoeSize: shoe } = JSON.parse(sizingData);
          setTopSize(top || '');
          setBottomSize(bottom || '');
          setShoeSize(shoe || '');
        }
      } catch (error) {
        console.error('Error loading sizing data:', error);
      }
    };
    
    // Load completed steps
    const loadCompletedSteps = async () => {
      try {
        const stepsString = await AsyncStorage.getItem('onboardingCompletedSteps');
        console.log('Loading completed steps from AsyncStorage:', stepsString);
        
        if (stepsString) {
          const steps = JSON.parse(stepsString);
          console.log('Parsed steps from AsyncStorage:', steps);
          
          // Add step 4 (current step) if not already included
          if (Array.isArray(steps) && !steps.includes(4)) {
            const updatedSteps = [...steps, 4];
            console.log('Adding step 4 to completed steps:', updatedSteps);
            setCompletedSteps(updatedSteps);
            await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedSteps));
          } else if (Array.isArray(steps)) {
            console.log('Setting completed steps:', steps);
            setCompletedSteps(steps);
          } else {
            console.warn('Steps is not an array:', steps);
            setCompletedSteps([4]);
          }
        } else {
          // Default if no steps stored
          console.log('No completed steps found, defaulting to [4]');
          const defaultSteps = [4];
          setCompletedSteps(defaultSteps);
          await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(defaultSteps));
        }
        
        // Also load filled steps
        const filledStepsString = await AsyncStorage.getItem('onboardingFilledSteps');
        console.log('Loading filled steps from AsyncStorage:', filledStepsString);
        
        if (filledStepsString) {
          try {
            const filledSteps = JSON.parse(filledStepsString);
            if (Array.isArray(filledSteps)) {
              console.log('Setting filled steps:', filledSteps);
              setFilledSteps(filledSteps);
            }
          } catch (e) {
            console.error('Error parsing filled steps:', e);
          }
        }
      } catch (error) {
        console.error('Error loading completed steps:', error);
      }
    };
    
    loadSizingData();
    loadCompletedSteps();
  }, []);
  
  // Button press animation
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  
  // Function to handle empty sections - don't allow delete mode for empty sections
  const canEnterDeleteMode = (section: 'styles' | 'brands'): boolean => {
    switch (section) {
      case 'styles':
        return selectedStyles.length > 0;
      case 'brands':
        return selectedBrands.length > 0;
      default:
        return false;
    }
  };

  // Function to check if a section is now empty and should exit delete mode
  const checkAndExitDeleteModeIfEmpty = (section: 'styles' | 'brands') => {
    if (isDeleteMode && activeSection === section) {
      const isEmpty = !canEnterDeleteMode(section);
      if (isEmpty) {
        setIsDeleteMode(false);
      }
    }
  };

  // Toggle delete mode
  const toggleDeleteMode = (section: 'styles' | 'brands') => {
    // Only enter delete mode if there are items to delete
    if (!isDeleteMode && !canEnterDeleteMode(section)) return;
    
    setActiveSection(section);
    setIsDeleteMode(prev => !prev);
    if (isDeleteMode) {
      setShowDeletedItems(false);
    }
  };

  // Animation for item removal/addition
  const animateItemTransition = (itemKey: string) => {
    if (animatingItems[itemKey]) return; // Prevent animation conflicts
    
    // Mark this item as currently animating
    setAnimatingItems(prev => ({ ...prev, [itemKey]: true }));
    
    // After animation completes, remove from animating items
    setTimeout(() => {
      setAnimatingItems(prev => {
        const updated = { ...prev };
        delete updated[itemKey];
        return updated;
      });
    }, 500); // Match animation duration
  };
  
  // Update handle remove item to check if section becomes empty
  const handleRemoveItem = (item: string, type: 'styles' | 'brands') => {
    const itemKey = `${type}-${item}`;
    animateItemTransition(itemKey);
    
    if (type === 'styles') {
      setDeletedStyles(prev => [...prev, item]);
      removeStyle(item);
      
      // If this was the last style, exit delete mode
      if (selectedStyles.length === 1) {
        setTimeout(() => checkAndExitDeleteModeIfEmpty('styles'), 300);
      }
    } else {
      setDeletedBrands(prev => [...prev, item]);
      removeBrand(item);
      
      // If this was the last brand, exit delete mode
      if (selectedBrands.length === 1) {
        setTimeout(() => checkAndExitDeleteModeIfEmpty('brands'), 300);
      }
    }
  };
  
  // Handle item restoration
  const handleRestoreItem = (item: string, type: 'styles' | 'brands') => {
    const itemKey = `${type}-${item}`;
    animateItemTransition(itemKey);
    
    if (type === 'styles') {
      setDeletedStyles(prev => prev.filter(style => style !== item));
      addStyle(item);
    } else {
      setDeletedBrands(prev => prev.filter(brand => brand !== item));
      addBrand(item);
    }
  };
  
  // Get total deleted items count
  const getTotalDeletedCount = () => {
    return deletedStyles.length + deletedBrands.length;
  };
  
  // Update the clearOnboardingAsyncStorage function
  const clearOnboardingAsyncStorage = async () => {
    try {
      const keysToRemove = [
        'selectedStyles',
        'selectedBrands',
        'sizingData',
        'onboardingCompletedSteps',
        'onboardingFilledSteps',
        'onboardingSkippedSteps', // Keep for backward compatibility
        'sessionSkippedSteps',    // Add session-skipped steps
        'onboardingStarted'
        // Intentionally not removing 'onboardingReturnTo' here so we can use it for navigation
      ];
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      console.log('Cleared onboarding AsyncStorage data');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };
  
  // Add logic to show alert when editing a completed step
  const navigateToStep = (step: number, screenName: string) => {
    // Check if the step is already completed
    if (completedSteps.includes(step)) {
      Alert.alert(
        'Edit Completed Section',
        'This section is already completed. Making changes will update your preferences in the database.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Edit Anyway',
            onPress: () => {
              // Store that this section was previously completed before editing
              AsyncStorage.setItem(`previouslyCompleted-${step}`, 'true')
                .catch(err => console.error(`Error marking step ${step} as previously completed:`, err));
              
              navigation.navigate(screenName as any, { fromReview: true });
            }
          }
        ]
      );
    } else {
      navigation.navigate(screenName as any, { fromReview: true });
    }
  };

  // Function to check if all sections have required data filled
  const checkAllSectionsCompleted = (): boolean => {
    const hasStyles = selectedStyles.length > 0;
    const hasBrands = selectedBrands.length > 0;
    const hasSizing = !!(topSize || bottomSize || shoeSize);
    return hasStyles && hasBrands && hasSizing;
  };
  
  // Helper function to navigate to the next incomplete section
  const navigateToNextIncompleteSection = () => {
    const hasStyles = selectedStyles.length > 0;
    const hasBrands = selectedBrands.length > 0;
    const hasSizing = topSize || bottomSize || shoeSize;
    
    // Navigate to the first incomplete section
    if (!hasStyles) {
      navigation.navigate('Onboarding', { fromReview: true });
    } else if (!hasBrands) {
      navigation.navigate('OnboardingBrands', { fromReview: true });
    } else if (!hasSizing) {
      navigation.navigate('OnboardingSizing', { fromReview: true });
    }
  };

  // Update the handleSubmit function
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // VALIDATION: Check if all required steps have data
      const hasStyles = selectedStyles.length > 0;
      const hasBrands = selectedBrands.length > 0;
      const hasSizing = !!(topSize || bottomSize || shoeSize);
      
      // Determine if all required fields across all steps are filled
      const allFieldsFilled: boolean = hasStyles && hasBrands && hasSizing;
      
      // Check if user is missing any steps and notify them
      if (!hasStyles || !hasBrands || !hasSizing) {
        let missingSteps = [];
        if (!hasStyles) missingSteps.push('Style Preferences');
        if (!hasBrands) missingSteps.push('Brand Preferences');
        if (!hasSizing) missingSteps.push('Size Profile');
        
        const missingText = missingSteps.join(', ');
        
        if (missingSteps.length > 0) {
          Alert.alert(
            'Missing Information',
            `The following sections are incomplete: ${missingText}. You can still continue, but we recommend filling them for the best experience.`,
            [
              { text: 'Go Back and Edit', style: 'cancel', onPress: () => setIsSubmitting(false) },
              { 
                text: 'Continue Anyway', 
                onPress: () => finishOnboarding(allFieldsFilled) 
              }
            ]
          );
          return;
        }
      }
      
      // If all validations pass, finish the onboarding process
      await finishOnboarding(allFieldsFilled);
    } catch (error) {
      console.error("Error during submission:", error);
      setIsSubmitting(false);
      Alert.alert(
        'Error',
        'There was a problem saving your preferences. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Update the finishOnboarding function to properly handle completion status
  const finishOnboarding = async (allFieldsFilled: boolean) => {
    try {
      // Get all completed and filled steps
      const allCompletedSteps = [...new Set([...completedSteps, ...filledSteps])];
      
      // Verify which steps should be marked as completed based on data
      const hasStyles = selectedStyles.length > 0;
      const hasBrands = selectedBrands.length > 0;
      
      // For sizing, ALL THREE fields must be filled to consider it completed
      const hasTopSize = !!topSize;
      const hasBottomSize = !!bottomSize;
      const hasShoeSize = !!shoeSize;
      const hasAllSizingData = hasTopSize && hasBottomSize && hasShoeSize;
      const hasSomeSizingData = hasTopSize || hasBottomSize || hasShoeSize;
      
      console.log("Validation for database submission in finishOnboarding:", {
        hasStyles,
        hasBrands,
        hasTopSize,
        hasBottomSize,
        hasShoeSize,
        hasAllSizingData,
        hasSomeSizingData
      });
      
      // Only include steps in completedSteps if they meet the completion criteria
      let updatedCompletedSteps = [];
      
      // Only add steps that meet completion criteria
      if (hasStyles) updatedCompletedSteps.push(1);
      if (hasBrands) updatedCompletedSteps.push(2);
      if (hasAllSizingData) updatedCompletedSteps.push(3); // MUST HAVE ALL THREE SIZES
      updatedCompletedSteps.push(4); // Always include the review step
      
      console.log("Steps to be marked as completed:", updatedCompletedSteps);
      
      // Create the data objects
      const sizingData = {
        topSize,
        bottomSize,
        shoeSize
      };
      
      // Save to database since the user explicitly clicked "Complete Setup"
      const currentUser = auth().currentUser;
      if (currentUser) {
        // Create a userPreferences object matching the schema in firestoreService.ts
        const userPreferencesData = {
          preferredStyles: selectedStyles,
          preferredBrands: selectedBrands,
          topsSize: topSize || '',
          bottomsSize: bottomSize || '',
          shoeSize: shoeSize || '',
          // Set default values for other required fields
          colorPreferences: [],
          emailNotifications: true,
          pushNotifications: true
        };
        
        console.log("Saving preferences to database because Complete Setup was clicked");
        console.log("Saving sizing data (even if incomplete):", {
          topsSize: topSize || '',
          bottomsSize: bottomSize || '',
          shoeSize: shoeSize || ''
        });
        
        try {
          // First, get current onboarding state to preserve other properties
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          let currentOnboardingSteps = {};
          let wasAlreadyCompleted = false;
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.onboardingSteps) {
              currentOnboardingSteps = userData.onboardingSteps;
            }
            
            // Check if onboarding was already completed before
            wasAlreadyCompleted = userData.onboardingCompleted === true;
          }
          
          // Save to the user_preferences collection
          await setUserPreferences(currentUser.uid, userPreferencesData);
          console.log("User preferences saved to database in user_preferences collection");
          
          // Also save the steps information in the user document with detailed validation data
          await updateDoc(userDocRef, {
            onboardingSteps: {
              ...currentOnboardingSteps,
              completedSteps: updatedCompletedSteps,
              filledSteps: updatedCompletedSteps.filter(step => step !== 4),
              lastUpdated: new Date(),
              validationData: {
                hadStyles: hasStyles,
                hadBrands: hasBrands, 
                hadSizing: hasSomeSizingData,
                hasAllSizing: hasAllSizingData,
                hasTopSize: hasTopSize,
                hasBottomSize: hasBottomSize,
                hasShoeSize: hasShoeSize,
                stylesCount: selectedStyles.length,
                brandsCount: selectedBrands.length,
                verifiedAt: new Date()
              }
            },
            // Set onboarding as completed since the user explicitly clicked "Complete Setup"
            onboardingCompleted: true
          });
          console.log("User document updated with completion status and marked as completed");
          
          // Mark onboarding as completed using the app state manager
          await markOnboardingCompleted();
          console.log("Onboarding explicitly marked as completed via app state manager");
        } catch (dbError) {
          console.error("Error saving preferences to database:", dbError);
          // Show error to user
          Alert.alert(
            'Connection Issue',
            'Failed to save all preferences to the server. Please check your connection and try again.',
            [{ text: 'OK', style: 'default' }]
          );
          
          setIsSubmitting(false);
          return;
        }
        
        // Clear onboarding AsyncStorage data
        await clearOnboardingAsyncStorage();
        
        // Get the return route from AsyncStorage if it exists
        const returnRoute = await AsyncStorage.getItem('onboardingReturnTo');
        console.log('Returning to:', returnRoute || 'previous screen');
        
        // Small delay to ensure everything is complete
        setTimeout(() => {
          // Navigate back to dismiss the modal
          if (navigation && navigation.getParent()) {
            navigation.getParent()?.goBack();
          } else {
            navigation.goBack();
          }
        }, 300);
      } else {
        throw new Error("No authenticated user found");
      }
    } catch (error) {
      console.error("Error during finishOnboarding:", error);
      setIsSubmitting(false);
      Alert.alert(
        'Error',
        'There was a problem completing your onboarding. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle the "Complete Onboarding" option from the SuccessOptionsSheet
  const handleCompleteOnboarding = async () => {
    try {
      // Close the SuccessOptionsSheet first
      setShowSuccessSheet(false);
      
      // Get onboarding returnTo route if available
      const returnRoute = await AsyncStorage.getItem('onboardingReturnTo');
      
      // Save all user preferences to database before marking onboarding as completed
      const currentUser = auth().currentUser;
      if (currentUser) {
        // Validate sizing data - ALL THREE fields must be filled for step 3 completion
        const hasAllSizingData = !!(topSize && bottomSize && shoeSize);
        console.log("Sizing validation for database submission:", { 
          topSize: !!topSize, 
          bottomSize: !!bottomSize, 
          shoeSize: !!shoeSize, 
          hasAllSizingData 
        });
        
        // Create a userPreferences object
        const userPreferencesData = {
          preferredStyles: selectedStyles,
          preferredBrands: selectedBrands,
          topsSize: topSize || '',
          bottomsSize: bottomSize || '',
          shoeSize: shoeSize || '',
          // Set default values for other required fields
          colorPreferences: [],
          emailNotifications: true,
          pushNotifications: true
        };
        
        try {
          // First, get current onboarding state to preserve other properties
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          let currentOnboardingSteps = {};
          
          if (userDoc.exists() && userDoc.data().onboardingSteps) {
            currentOnboardingSteps = userDoc.data().onboardingSteps;
          }
          
          // Save completed steps - only include steps that meet completion criteria
          let updatedCompletedSteps = [];
          
          // Only add steps that have actual data
          if (selectedStyles.length > 0) updatedCompletedSteps.push(1);
          if (selectedBrands.length > 0) updatedCompletedSteps.push(2);
          if (hasAllSizingData) updatedCompletedSteps.push(3); // MUST HAVE ALL THREE SIZES
          updatedCompletedSteps.push(4); // Always include review step
          
          console.log("Steps to be marked as completed in database:", updatedCompletedSteps);
          
          // Save to the user_preferences collection using the service
          await setUserPreferences(currentUser.uid, userPreferencesData);
          console.log("User preferences saved to database during explicit completion");
          
          // Also save the steps information in the user document
          await updateDoc(userDocRef, {
            onboardingSteps: {
              ...currentOnboardingSteps,
              completedSteps: updatedCompletedSteps,
              filledSteps: updatedCompletedSteps.filter(step => step !== 4),
              lastUpdated: new Date(),
              wasExplicitlyCompleted: true,
              validationData: {
                hadStyles: selectedStyles.length > 0,
                hadBrands: selectedBrands.length > 0,
                hadSizing: !!(topSize || bottomSize || shoeSize),
                hasAllSizing: hasAllSizingData,
                hasTopSize: !!topSize,
                hasBottomSize: !!bottomSize,
                hasShoeSize: !!shoeSize,
                stylesCount: selectedStyles.length,
                brandsCount: selectedBrands.length,
                verifiedAt: new Date()
              }
            }
          });
          console.log("User document updated with completed steps during explicit completion");
        } catch (error) {
          console.error("Error saving preferences during explicit completion:", error);
          // Continue with completion process even if there was an error saving preferences
        }
      }
      
      // NOW is when we should mark onboarding as completed, since the user explicitly clicked "Complete Onboarding"
      await markOnboardingCompleted();
      console.log("Onboarding explicitly marked as completed by user action");
      
      // Clear onboarding AsyncStorage data
      await clearOnboardingAsyncStorage();
      
      // Small delay to ensure the sheet is closed
      setTimeout(() => {
        // Check the return route and decide what to do
        if (returnRoute && returnRoute.length > 0) {
          console.log(`Onboarding complete - returning to specific route: ${returnRoute}`);
          
          // If we have a specific return route, use it
          // This is usually set when launching onboarding from a specific screen
          if (navigation.canGoBack()) {
            // First go back to dismiss the modal
            navigation.goBack();
            
            // Then after a small delay, navigate to the specific screen if needed
            // Only needed if the return route is different from where we're going back to
            setTimeout(() => {
              if (returnRoute !== 'MainTabs' && returnRoute !== 'OnboardingFlow') {
                // Try to navigate to the specific screen
                navigation.navigate(returnRoute as any);
              }
            }, 300);
          } else {
            // If we can't go back, just dismiss the modal
            if (navigation && navigation.getParent()) {
              navigation.getParent()?.goBack();
            } else {
              navigation.goBack();
            }
          }
        } else {
          console.log('Onboarding complete - returning to previous screen');
          
          // No specific return route, just dismiss the modal
          if (navigation && navigation.getParent()) {
            navigation.getParent()?.goBack();
          } else {
            navigation.goBack();
          }
        }
      }, 300);
    } catch (error) {
      console.error('Error handling complete onboarding:', error);
      
      // Fallback - just try to go back
      navigation.goBack();
    }
  };

  // Handle proceeding to home screen from SuccessOptionsSheet
  const handleProceedToHome = async () => {
    try {
      // First clear any onboarding AsyncStorage data
      await clearOnboardingAsyncStorage();
      
      // Close the SuccessOptionsSheet
      setShowSuccessSheet(false);
      
      // Instead of navigating to MainTabs, dismiss the modal
      // Get the return route from AsyncStorage if it exists
      const returnRoute = await AsyncStorage.getItem('onboardingReturnTo');
      
      console.log('Onboarding complete - dismissing modal and returning to:', returnRoute || 'previous screen');
      
      // Small delay to ensure the sheet is closed
      setTimeout(() => {
        // Navigate back to dismiss the modal
        if (navigation && navigation.getParent()) {
          // If we have a parent navigator, use goBack to dismiss the modal
          navigation.getParent()?.goBack();
        } else {
          // Fallback if no parent navigator
          navigation.goBack();
        }
      }, 300);
    } catch (error) {
      console.error('Error proceeding to home from options sheet:', error);
      
      // Fallback - just try to go back
      navigation.goBack();
    }
  };

  // Update renderStylesSection to use the new navigateToStep function
  const renderStylesSection = () => {
    const isActive = isDeleteMode && activeSection === 'styles';
    
    return (
      <Pressable onPress={handleBackgroundPress}>
        <View style={[
          styles.section, 
          { 
            backgroundColor: theme.glassmorphism.background,
            borderColor: theme.border
          }
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Style Preferences</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>Your favorite styles</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {renderBin('styles')}
              
              <TouchableOpacity
                style={[
                  styles.editButton, 
                  { 
                    backgroundColor: 'transparent',
                    borderColor: theme.primary + '60',
                    borderWidth: 1,
                    ...theme.elevation.light
                  }
                ]}
                onPress={() => !isDeleteMode ? navigateToStep(1, 'Onboarding') : toggleDeleteMode('styles')}
              >
                <Text style={[styles.editButtonText, { color: theme.text.secondary }]}>Edit</Text>
                <Icon name="pencil" size={16} color={theme.primary + '80'} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.contentContainer}>
            {selectedStyles.length > 0 ? (
              <View style={styles.tagsContainer}>
                {selectedStyles.map((style, index) => {
                  const wiggleRotation = wiggleAnim.interpolate({
                    inputRange: [-0.5, 0, 0.5],
                    outputRange: isActive ? ['-2deg', '0deg', '2deg'] : ['0deg', '0deg', '0deg'],
                  });
                  
                  return (
                    <Animated.View 
                      key={index} 
                      style={[
                        styles.tagItem, 
                        { 
                          backgroundColor: theme.glassmorphism.background,
                          transform: [{ rotate: wiggleRotation }],
                          ...theme.elevation.light
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => {
                          if (isActive) {
                            handleRemoveItem(style, 'styles');
                          } else {
                            handleItemPress('styles');
                          }
                        }}
                        onLongPress={() => handleLongPressItem('styles')}
                        delayLongPress={300}
                        style={styles.tagContent}
                      >
                        {isActive && (
                          <View style={styles.deleteIcon}>
                            {renderDeleteIcon()}
                          </View>
                        )}
                        <Text style={[styles.tagText, { color: theme.text.primary }]}>{style}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No style preferences selected
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };
  
  const renderBrandsSection = () => {
    const isActive = isDeleteMode && activeSection === 'brands';
    
    return (
      <Pressable onPress={handleBackgroundPress}>
        <View style={[
          styles.section, 
          { 
            backgroundColor: theme.glassmorphism.background,
            borderColor: theme.border
          }
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Brand Preferences</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>Your favorite brands</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {renderBin('brands')}
              
              <TouchableOpacity
                style={[
                  styles.editButton, 
                  { 
                    backgroundColor: 'transparent',
                    borderColor: theme.primary + '60',
                    borderWidth: 1,
                    ...theme.elevation.light
                  }
                ]}
                onPress={() => !isDeleteMode ? navigateToStep(2, 'OnboardingBrands') : toggleDeleteMode('brands')}
              >
                <Text style={[styles.editButtonText, { color: theme.text.secondary }]}>Edit</Text>
                <Icon name="pencil" size={16} color={theme.primary + '80'} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.contentContainer}>
            {selectedBrands.length > 0 ? (
              <View style={styles.tagsContainer}>
                {selectedBrands.map((brand, index) => {
                  const wiggleRotation = wiggleAnim.interpolate({
                    inputRange: [-0.5, 0, 0.5],
                    outputRange: isActive ? ['-2deg', '0deg', '2deg'] : ['0deg', '0deg', '0deg'],
                  });
                  
                  return (
                    <Animated.View 
                      key={index} 
                      style={[
                        styles.tagItem, 
                        { 
                          backgroundColor: theme.glassmorphism.background,
                          transform: [{ rotate: wiggleRotation }],
                          ...theme.elevation.light
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => {
                          if (isActive) {
                            handleRemoveItem(brand, 'brands');
                          } else {
                            handleItemPress('brands');
                          }
                        }}
                        onLongPress={() => handleLongPressItem('brands')}
                        delayLongPress={300}
                        style={styles.tagContent}
                      >
                        {isActive && (
                          <View style={styles.deleteIcon}>
                            {renderDeleteIcon()}
                          </View>
                        )}
                        <Text style={[styles.tagText, { color: theme.text.primary }]}>{brand}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No brand preferences selected
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };
  
  const renderSizingSection = () => {
    return (
      <Pressable onPress={handleBackgroundPress}>
        <View style={[
          styles.section, 
          { 
            backgroundColor: theme.glassmorphism.background,
            borderColor: theme.border
          }
        ]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Size Profile</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>Your clothing sizes</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[
                  styles.editButton, 
                  { 
                    backgroundColor: 'transparent',
                    borderColor: theme.primary + '60',
                    borderWidth: 1,
                    ...theme.elevation.light
                  }
                ]}
                onPress={() => navigateToStep(3, 'OnboardingSizing')}
              >
                <Text style={[styles.editButtonText, { color: theme.text.secondary }]}>Edit</Text>
                <Icon name="pencil" size={16} color={theme.primary + '80'} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.contentContainer}>
            {(topSize || bottomSize || shoeSize) ? (
              <View style={styles.sizingContainer}>
                {topSize && (
                  <View style={[
                    styles.sizeItem, 
                    { 
                      backgroundColor: theme.glassmorphism.background,
                      ...theme.elevation.light
                    }
                  ]}>
                    <Text style={[styles.sizeLabel, { color: theme.text.secondary }]}>Tops</Text>
                    <Text style={[styles.sizeValue, { color: theme.text.primary }]}>{topSize}</Text>
                  </View>
                )}
                
                {bottomSize && (
                  <View style={[
                    styles.sizeItem, 
                    { 
                      backgroundColor: theme.glassmorphism.background,
                      ...theme.elevation.light
                    }
                  ]}>
                    <Text style={[styles.sizeLabel, { color: theme.text.secondary }]}>Bottoms</Text>
                    <Text style={[styles.sizeValue, { color: theme.text.primary }]}>{bottomSize}</Text>
                  </View>
                )}
                
                {shoeSize && (
                  <View style={[
                    styles.sizeItem, 
                    { 
                      backgroundColor: theme.glassmorphism.background,
                      ...theme.elevation.light
                    }
                  ]}>
                    <Text style={[styles.sizeLabel, { color: theme.text.secondary }]}>Shoes</Text>
                    <Text style={[styles.sizeValue, { color: theme.text.primary }]}>{shoeSize}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                No sizing information provided
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };
  
  // Render deleted items modal
  const renderDeletedItemsModal = () => {
    const getSectionTitle = () => {
      switch (activeSection) {
        case 'styles':
          return 'Removed Styles';
        case 'brands':
          return 'Removed Brands';
        default:
          return 'Removed Items';
      }
    };
    
    const getEmptyStateMessage = () => {
      switch (activeSection) {
        case 'styles':
          return 'No styles have been removed\n\nTo delete, long press on a style or the delete button';
        case 'brands':
          return 'No brands have been removed\n\nTo delete, long press on a brand or the delete button';
        default:
          return 'No items have been removed';
      }
    };
    
    const isEmpty = activeSection === 'styles' ? deletedStyles.length === 0 : 
                   activeSection === 'brands' ? deletedBrands.length === 0 : true;
    
    return (
      <Modal
        visible={showDeletedItems}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeletedItems(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowDeletedItems(false)}
        >
          <View 
            style={[
              styles.deletedItemsContainer, 
              { 
                backgroundColor: theme.glassmorphism.background,
                ...theme.elevation.high,
                shadowColor: theme.glassmorphism.shadow,
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.5,
                shadowRadius: 25,
                elevation: 20,
                borderWidth: 1,
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : theme.border,
              }
            ]}
          >
            <View style={[styles.deletedItemsHeader, { borderBottomColor: `${theme.border}60` }]}>
              <Text style={[styles.deletedItemsTitle, { color: theme.text.primary }]}>
                {getSectionTitle()}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDeletedItems(false)}
                style={styles.closeButton}
              >
                <Icon name="close-circle" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            
            {isEmpty ? (
              <Text style={[styles.noItemsText, { color: theme.text.secondary }]}>
                {getEmptyStateMessage()}
              </Text>
            ) : (
              <>
                {activeSection === 'styles' && deletedStyles.length > 0 && (
                  <View style={styles.deletedSection}>
                    <View style={styles.tagsContainer}>
                      {deletedStyles.map((style, index) => {
                        const wiggleRotation = wiggleAnim.interpolate({
                          inputRange: [-0.5, 0, 0.5],
                          outputRange: ['-2deg', '0deg', '2deg'],
                        });
                        
                        return (
                          <Animated.View 
                            key={index} 
                            style={[
                              styles.tagItem, 
                              { 
                                backgroundColor: theme.glassmorphism.background,
                                transform: [{ rotate: wiggleRotation }],
                                ...theme.elevation.light
                              },
                            ]}
                          >
                            <Pressable
                              onPress={() => handleRestoreItem(style, 'styles')}
                              style={styles.tagContent}
                            >
                              <View style={styles.restoreIcon}>
                                {renderRestoreIcon(theme.primary)}
                              </View>
                              <Text style={[styles.tagText, { color: theme.text.primary }]}>{style}</Text>
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {activeSection === 'brands' && deletedBrands.length > 0 && (
                  <View style={styles.deletedSection}>
                    <View style={styles.tagsContainer}>
                      {deletedBrands.map((brand, index) => {
                        const wiggleRotation = wiggleAnim.interpolate({
                          inputRange: [-0.5, 0, 0.5],
                          outputRange: ['-2deg', '0deg', '2deg'],
                        });
                        
                        return (
                          <Animated.View 
                            key={index} 
                            style={[
                              styles.tagItem, 
                              { 
                                backgroundColor: theme.glassmorphism.background,
                                transform: [{ rotate: wiggleRotation }],
                                ...theme.elevation.light
                              },
                            ]}
                          >
                            <Pressable
                              onPress={() => handleRestoreItem(brand, 'brands')}
                              style={styles.tagContent}
                            >
                              <View style={styles.restoreIcon}>
                                {renderRestoreIcon(theme.primary)}
                              </View>
                              <Text style={[styles.tagText, { color: theme.text.primary }]}>{brand}</Text>
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    );
  };
  
  // Function to handle long press on an item to enter delete mode
  const handleLongPressItem = (section: 'styles' | 'brands') => {
    // Only enter delete mode if there are items to delete
    if (!canEnterDeleteMode(section)) return;
    
    // If we're already in delete mode for a different section
    if (isDeleteMode && activeSection !== section) {
      // First exit delete mode for the current section
      setIsDeleteMode(false);
      // Then after a brief delay, enter delete mode for the new section
      setTimeout(() => {
        setActiveSection(section);
        setIsDeleteMode(true);
      }, 100);
    } 
    // If not in delete mode or in delete mode for the same section
    else if (!isDeleteMode) {
      setActiveSection(section);
      setIsDeleteMode(true);
    }
  };

  // Handle clicking on items from another section to exit delete mode
  const handleItemPress = (section: 'styles' | 'brands') => {
    if (isDeleteMode && activeSection !== section) {
      setIsDeleteMode(false);
    }
  };
  
  // Handle clicking outside items to exit delete mode
  const handleBackgroundPress = () => {
    if (isDeleteMode) {
      setIsDeleteMode(false);
      setShowDeletedItems(false);
    }
  };
  
  // Render Bin Icon
  const renderBin = (section: 'styles' | 'brands') => {
    const isActive = isDeleteMode && activeSection === section;
    const count = section === 'styles' ? deletedStyles.length : deletedBrands.length;
    
    return (
      <View style={styles.binContainer}>
        <Pressable
          onPress={() => {
            // If in delete mode, clicking bin shows deleted items but keeps delete mode active
            if (isDeleteMode && activeSection === section) {
              setShowDeletedItems(true);
            } else if (!isDeleteMode) {
              // If not in delete mode, just show deleted items without entering delete mode
              setActiveSection(section);
              setShowDeletedItems(true);
            }
          }}
          onLongPress={() => toggleDeleteMode(section)}
          style={({ pressed }) => [
            styles.bin,
            pressed && { opacity: 0.7 }
          ]}
        >
          <Icon 
            name={isActive ? "trash" : "trash-outline"} 
            size={22} 
            color={isActive ? theme.error : theme.text.secondary} 
          />
          {count > 0 && (
            <View style={[styles.binCounter, { backgroundColor: theme.error }]}>
              <Text style={styles.binCounterText}>{count}</Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  };
  
  // Inside the component function, update the styles that use theme
  const renderDeleteIcon = () => (
    <View style={[styles.iconBase, {
      backgroundColor: theme.glassmorphism.background
    }]}>
      <Icon name="remove-circle-outline" size={18} color={theme.error} />
    </View>
  );

  const renderRestoreIcon = (color: string) => (
    <View style={[styles.iconBase, {
      backgroundColor: theme.glassmorphism.background
    }]}>
      <Icon name="add-circle-outline" size={16} color={color} />
    </View>
  );
  
  // Add this useEffect block that disables going back with gestures
  useEffect(() => {
    // Disable the ability to go back with gesture
    if (navigation.canGoBack()) {
      navigation.setOptions({
        gestureEnabled: false
      });
    }
  }, [navigation]);
  
  // Add useEffect to navigate to first incomplete section on mount
  useEffect(() => {
    // Check if we should navigate to the first incomplete section
    // Do this after initial data loading is done
    const checkAndNavigateToIncomplete = async () => {
      try {
        // Wait a bit to ensure all data is loaded
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500);
        });
        
        // Only navigate automatically if there are incomplete sections
        const hasStyles = selectedStyles.length > 0;
        const hasBrands = selectedBrands.length > 0;
        const hasSizing = topSize || bottomSize || shoeSize;
        
        // Navigate to the first incomplete section if needed
        if (!hasStyles) {
          navigation.navigate('Onboarding', { fromReview: true });
        } else if (!hasBrands) {
          navigation.navigate('OnboardingBrands', { fromReview: true });
        } else if (!hasSizing) {
          navigation.navigate('OnboardingSizing', { fromReview: true });
        }
      } catch (error) {
        console.error("Error navigating to incomplete section:", error);
      }
    };
    
    // Check if we need automatic navigation
    const determineIfNavigationNeeded = async () => {
      try {
        // Get the auto-navigate preference from AsyncStorage
        const shouldNavigate = await AsyncStorage.getItem('shouldNavigateToIncomplete');
        if (shouldNavigate === 'true') {
          // Reset the flag so it doesn't keep navigating
          await AsyncStorage.setItem('shouldNavigateToIncomplete', 'false');
          // Then perform navigation
          checkAndNavigateToIncomplete();
        }
      } catch (error) {
        console.error("Error checking navigation preference:", error);
      }
    };
    
    determineIfNavigationNeeded();
  }, [navigation, selectedStyles, selectedBrands, topSize, bottomSize, shoeSize]);
  
  // Add a useEffect to sync onboarding completion state between Firebase and local storage
  useEffect(() => {
    const syncOnboardingCompletionState = async () => {
      try {
        // Instead of syncing with Firebase, just check AsyncStorage to ensure consistency
        // Get the current state from AsyncStorage
        const stylesData = await AsyncStorage.getItem('selectedStyles');
        const styles = stylesData ? JSON.parse(stylesData) : [];
        const brandsData = await AsyncStorage.getItem('selectedBrands');
        const brands = brandsData ? JSON.parse(brandsData) : [];
        const sizingData = await AsyncStorage.getItem('sizingData');
        const sizing = sizingData ? JSON.parse(sizingData) : {};
        
        // Check current state of selections for step validation
        const hasStyles = styles.length > 0;
        const hasBrands = brands.length > 0;
        const hasTopSize = sizing && sizing.topSize;
        const hasBottomSize = sizing && sizing.bottomSize;
        const hasShoeSize = sizing && sizing.shoeSize;
        const hasSizingData = !!(hasTopSize || hasBottomSize || hasShoeSize);
        const hasAllSizingData = !!(hasTopSize && hasBottomSize && hasShoeSize);
        
        console.log('Current selection state:', { 
          hasStyles, 
          hasBrands, 
          hasTopSize, 
          hasBottomSize, 
          hasShoeSize,
          hasSizingData,
          hasAllSizingData
        });
        
        // Get completed steps from AsyncStorage
        const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
        const completedSteps = completedStepsStr ? JSON.parse(completedStepsStr) : [];
        
        // Calculate which steps should actually be marked as completed
        let validCompletedSteps = [];
        
        // Only add steps that have actual data
        if (hasStyles) validCompletedSteps.push(1);
        if (hasBrands) validCompletedSteps.push(2);
        if (hasAllSizingData) validCompletedSteps.push(3); // ALL THREE required for completion
        
        // Always include review step
        validCompletedSteps.push(4);
        
        console.log('Valid completed steps based on current data:', validCompletedSteps);
        console.log('Current completed steps in AsyncStorage:', completedSteps);
        
        // If there's a mismatch between AsyncStorage and what should be valid, update AsyncStorage
        const arraysEqual = (a: number[], b: number[]): boolean => {
          if (a.length !== b.length) return false;
          a.sort();
          b.sort();
          for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
          }
          return true;
        };
        
        const needsUpdate = !arraysEqual(completedSteps, validCompletedSteps);
        
        if (needsUpdate) {
          console.log('Mismatch detected in AsyncStorage, updating to match current app state');
          await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(validCompletedSteps));
          setCompletedSteps(validCompletedSteps);
          
          // Also update filled steps
          let validFilledSteps = [];
          if (hasStyles) validFilledSteps.push(1);
          if (hasBrands) validFilledSteps.push(2);
          if (hasSizingData) validFilledSteps.push(3); // ANY sizing data for filled
          await AsyncStorage.setItem('onboardingFilledSteps', JSON.stringify(validFilledSteps));
          setFilledSteps(validFilledSteps);
          
          console.log('AsyncStorage updated to:', validCompletedSteps);
        }
      } catch (error) {
        console.error('Error checking onboarding completion state:', error);
      }
    };
    
    // Run the sync after loading data
    syncOnboardingCompletionState();
  }, [selectedStyles, selectedBrands, topSize, bottomSize, shoeSize]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Skip All container - kept for layout, but button is hidden on review screen */}
      <View style={styles.topButtonContainer}>
        {/* Button intentionally left empty to maintain spacing */}
      </View>
      
      {/* Step Tracker */}
      <StepTracker
        totalSteps={TOTAL_ONBOARDING_STEPS}
        currentStep={4}
        completedSteps={completedSteps}
        filledSteps={filledSteps}
        navigation={navigation}
        screenNames={SCREEN_NAMES}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Review</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Confirm your preferences before completing setup
        </Text>
      </View>
      
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStylesSection()}
        {renderBrandsSection()}
        {renderSizingSection()}
        
        {/* Additional information */}
        <View style={[styles.infoBox, { backgroundColor: `${theme.primary}15` }]}>
          <Icon name="information-circle-outline" size={22} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.text.primary }]}>
            You can always update these preferences later in your profile settings.
          </Text>
        </View>
      </ScrollView>
      
      {/* Submit Button */}
      <View style={styles.footer}>
        <Animated.View 
          style={[
            styles.buttonContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton, 
              { 
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                borderWidth: 1,
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 10,
                ...theme.elevation.medium
              }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.7}
          >
            <Text style={[styles.submitButtonText, { color: theme.text.onPrimary }]}>
              {isSubmitting ? 'Completing...' : 'Complete Setup'}
            </Text>
            <Icon name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Deleted Items Modal */}
      {renderDeletedItemsModal()}
      
      {/* Success Options Sheet */}
      <SuccessOptionsSheet
        visible={showSuccessSheet}
        onDismiss={() => setShowSuccessSheet(false)}
        onCompleteOnboarding={handleCompleteOnboarding}
        onProceedToHome={handleProceedToHome}
      />
    </SafeAreaView>
  );
};

// Define the styles without backdropFilter properties
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topButtonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 0,
    height: 38, // Keep the same height as when the button was visible
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
    maxWidth: 300,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: Platform.OS === 'ios' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    minHeight: 60,
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    margin: 4,
    borderWidth: 0,
  },
  tagItemActive: {
    // Remove all the styles that added a red border
  },
  tagItemDeleted: {
    opacity: 0.9,
  },
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    position: 'relative',
    minHeight: 30,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteIcon: {
    position: 'absolute',
    top: -9,
    right: -9,
    zIndex: 2,
  },
  restoreIcon: {
    position: 'absolute',
    top: -9,
    right: -9,
    zIndex: 2,
  },
  iconBase: {
    borderRadius: 10,
    padding: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sizingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sizeItem: {
    width: '30%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0,
    alignItems: 'center',
    position: 'relative',
  },
  sizeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sizeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Delete feature styles
  binContainer: {
    position: 'relative',
  },
  bin: {
    padding: 10,
    borderRadius: 20,
  },
  binCounter: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  binCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  deletedItemsContainer: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 0,
  },
  deletedItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  deletedItemsTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'left',
  },
  closeButton: {
    padding: 6,
  },
  deletedSection: {
    marginBottom: 16,
  },
  noItemsText: {
    textAlign: 'left',
    fontStyle: 'normal',
    marginTop: 20,
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
});

export default OnboardingReview;
