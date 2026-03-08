import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Animated, Easing, Modal } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import EnhancedStyleBubbles from '../components/Onboarding/EnhancedStyleBubbles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager, markOnboardingStarted } from '../utils/appStateManager';
import StepTracker from '../components/Onboarding/StepTracker';
import { auth } from '../Config/firebaseconfig';
import { getUserPreferences } from '../services/firestoreService';

/* global setTimeout */

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
type OnboardingScreenRouteProp = RouteProp<RootStackParamList & {
  Onboarding: { fromReview?: boolean; directNavigation?: boolean }
}, 'Onboarding'>;

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

const OnboardingScreen: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const route = useRoute<OnboardingScreenRouteProp>();
  const { selectedStyles, selectedBrands, addStyle, removeStyle } = useOnboardingContext();
  
  // Track completed steps - store in state
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [filledSteps, setFilledSteps] = useState<number[]>([]);
  
  // Animation for button pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State to track if user has made any selections
  const [hasSelections, setHasSelections] = useState(selectedStyles.length > 0);
  
  // State for tutorial overlay
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  
  // Hardcoded styles list as requested
  const availableStyles = [
    'Casual', 'Formal', 'Streetwear', 'Athletic', 'Vintage',
    'Minimalist', 'Bohemian', 'Preppy', 'Grunge', 'Hipster',
    'Classic', 'Punk', 'Business', 'Retro', 'Sporty',
    'Urban', 'Chic', 'Elegant', 'Indie'
  ];
  
  useEffect(() => {
    // Update hasSelections whenever selectedStyles changes
    setHasSelections(selectedStyles.length > 0);
  }, [selectedStyles]);
  
  // Pulse animation for empty continue button
  useEffect(() => {
    if (!hasSelections) {
      startPulseAnimation();
    } else {
      // Stop animation if user has made selections
      pulseAnim.setValue(1);
    }
  }, [hasSelections]);
  
  // Function to create continuous pulse animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        // Slightly scale up
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        // Scale back down
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  };
  
  useEffect(() => {
    console.log("OnboardingScreen mounted");
    console.log("Current context: styles =", selectedStyles, "brands =", selectedBrands);
    
    // Check if this is a direct navigation from app navigator
    const directNavigation = route.params?.directNavigation;
    if (directNavigation) {
      console.log("Direct navigation to OnboardingScreen detected - skipping intro animations");
      // Skip any intro animations if direct navigation
    }
    
    // Mark onboarding as started in the database when component mounts
    markOnboardingStarted().catch(err => {
      console.error("Failed to mark onboarding as started:", err);
    });
    
    // Clear session-skipped steps on app fresh load - these should not persist across app sessions
    AsyncStorage.removeItem('sessionSkippedSteps')
      .then(() => console.log("Cleared session-skipped steps on app load"))
      .catch(err => console.error("Error clearing session-skipped steps:", err));
    
    // Also clear any old onboardingSkippedSteps from the previous approach
    AsyncStorage.removeItem('onboardingSkippedSteps')
      .then(() => console.log("Cleared old permanent skipped steps on app load"))
      .catch(err => console.error("Error clearing old skipped steps:", err));
    
    // Load completed steps from storage if available
    AsyncStorage.getItem('onboardingCompletedSteps')
      .then(steps => {
        if (steps) {
          try {
            const parsedSteps = JSON.parse(steps);
            if (Array.isArray(parsedSteps)) {
              setCompletedSteps(parsedSteps);
              console.log("Loaded completed steps:", parsedSteps);
            }
          } catch (e) {
            console.error("Error parsing completed steps:", e);
          }
        }
      })
      .catch(err => {
        console.error("Error loading completed steps:", err);
      });
      
    // Load filled steps from storage if available
    AsyncStorage.getItem('onboardingFilledSteps')
      .then(steps => {
        if (steps) {
          try {
            const parsedSteps = JSON.parse(steps);
            if (Array.isArray(parsedSteps)) {
              setFilledSteps(parsedSteps);
              console.log("Loaded filled steps:", parsedSteps);
            }
          } catch (e) {
            console.error("Error parsing filled steps:", e);
          }
        }
      })
      .catch(err => {
        console.error("Error loading filled steps:", err);
      });
      
    // Preload existing style preferences from database if user is logged in
    const preloadExistingPreferences = async () => {
      try {
        // Check if we're coming from the review screen in edit mode
        const fromReview = route.params?.fromReview;
        
        // If we're in edit mode, don't reload from database (keep current selections)
        if (fromReview) {
          console.log("In edit mode - keeping current selections instead of loading from database");
          return;
        }
        
        const currentUser = auth().currentUser;
        if (!currentUser) return;
        
        // Try to get preferences from user_preferences collection
        const preferences = await getUserPreferences(currentUser.uid);
        if (preferences && preferences.preferredStyles && preferences.preferredStyles.length > 0) {
          console.log("Preloading existing style preferences:", preferences.preferredStyles);
          
          // Add each style to the context if not already selected
          preferences.preferredStyles.forEach((style: string) => {
            if (!selectedStyles.includes(style)) {
              addStyle(style);
            }
          });
          
          // Update hasSelections state
          setHasSelections(preferences.preferredStyles.length > 0);
        }
      } catch (error) {
        console.error("Error preloading existing preferences:", error);
      }
    };
    
    preloadExistingPreferences();
  }, [selectedStyles, selectedBrands, addStyle]);

  const navigateToNextEmptyOrReview = async () => {
    try {
      // Check which steps are empty
      const stylesData = await AsyncStorage.getItem('selectedStyles');
      const styles = stylesData ? JSON.parse(stylesData) : [];
      const hasStyles = Array.isArray(styles) && styles.length > 0;
      
      const brandsData = await AsyncStorage.getItem('selectedBrands');
      const brands = brandsData ? JSON.parse(brandsData) : [];
      const hasBrands = Array.isArray(brands) && brands.length > 0;
      
      const sizingData = await AsyncStorage.getItem('sizingData');
      const sizing = sizingData ? JSON.parse(sizingData) : {};
      const hasSizing = !!(sizing && (sizing.topSize || sizing.bottomSize || sizing.shoeSize));
      
      console.log('Navigation check - styles:', hasStyles, 'brands:', hasBrands, 'sizing:', hasSizing);
      
      // Navigate to the first empty section or review if all are filled
      if (!hasBrands) {
        navigation.navigate('OnboardingBrands');
      } else if (!hasSizing) {
        navigation.navigate('OnboardingSizing');
      } else {
        // All sections are filled, go to review
        navigation.navigate('OnboardingOverview');
      }
    } catch (error) {
      console.error('Error navigating to next section:', error);
      // Default to next step on error
      navigation.navigate('OnboardingBrands');
    }
  };

  const handleContinue = async () => {
    // Only proceed if user has made selections
    if (!hasSelections) {
      setShowTutorialOverlay(true);
      return;
    }
    
    try {
      // Mark first step as filled and completed
      const updatedFilledSteps = [...filledSteps];
      if (!updatedFilledSteps.includes(1)) {
        updatedFilledSteps.push(1);
        setFilledSteps(updatedFilledSteps);
        await AsyncStorage.setItem('onboardingFilledSteps', JSON.stringify(updatedFilledSteps))
          .catch(err => console.error("Error saving filled steps:", err));
      }
      
      const updatedCompletedSteps = [...completedSteps];
      if (!updatedCompletedSteps.includes(1)) {
        updatedCompletedSteps.push(1);
        setCompletedSteps(updatedCompletedSteps);
        await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedCompletedSteps))
          .catch(err => console.error("Error saving completed steps:", err));
      }
      
      // Always save the selected styles to AsyncStorage even if already saved
      await AsyncStorage.setItem('selectedStyles', JSON.stringify(selectedStyles))
        .catch(err => console.error("Error saving selected styles:", err));
      console.log("Saved styles to AsyncStorage:", selectedStyles);
      
      // Remove this step from session-skipped steps if it was skipped before
      const skippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
      if (skippedStepsStr) {
        const skippedSteps = JSON.parse(skippedStepsStr);
        if (skippedSteps.includes(1)) {
          const updatedSkippedSteps = skippedSteps.filter((step: number) => step !== 1);
          await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(updatedSkippedSteps));
        }
      }
      
      // Check if we came from the review screen
      const fromReview = route.params?.fromReview;
      
      if (fromReview) {
        // Check if other steps are filled
        checkAndNavigateToNextEmptyStep(selectedStyles, selectedBrands);
        return;
      }
      
      // Navigate to the next incomplete step (not just the next sequential step)
      navigateToNextIncompleteStep();
    } catch (error) {
      console.error("Error in handleContinue:", error);
      // Fallback to simple navigation
      navigation.navigate('OnboardingBrands');
    }
  };

  // Helper function to determine the next navigation destination
  const checkAndNavigateToNextEmptyStep = async (styles: string[], brands: string[]) => {
    try {
      // Load sizing data to check if that step is filled
      let topSize = '';
      let bottomSize = '';
      let shoeSize = '';
      
      try {
        const sizingData = await AsyncStorage.getItem('sizingData');
        if (sizingData) {
          const parsed = JSON.parse(sizingData);
          topSize = parsed.topSize || '';
          bottomSize = parsed.bottomSize || '';
          shoeSize = parsed.shoeSize || '';
        }
      } catch (e) {
        console.error('Error loading sizing data:', e);
      }
      
      // Check which steps are empty
      const isStylesEmpty = styles.length === 0;
      const isBrandsEmpty = brands.length === 0;
      const isSizingEmpty = !topSize && !bottomSize && !shoeSize;
      
      // Determine which step to navigate to
      if (isBrandsEmpty) {
        // Brands is empty, go there next - preserving fromReview parameter
        navigation.navigate('OnboardingBrands', { fromReview: true });
      } else if (isSizingEmpty) {
        // Sizing is empty, go there next - preserving fromReview parameter
        navigation.navigate('OnboardingSizing', { fromReview: true });
      } else {
        // All steps are filled, go back to review
        navigation.navigate('OnboardingOverview');
      }
    } catch (error) {
      console.error('Error navigating to next step:', error);
      // Default to review on error
      navigation.navigate('OnboardingOverview');
    }
  };

  // Handle skipping all onboarding
  const handleSkipAll = async () => {
    Alert.alert(
      'Skip All Steps',
      'Are you sure you want to skip all remaining steps? This will take you directly to the review screen.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip All',
          onPress: async () => {
            try {
              // Mark all steps as skipped for this session only
              const sessionSkippedSteps = [1, 2, 3];
              await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                .catch(err => console.error("Error saving session-skipped steps:", err));
              console.log("Marked all steps as skipped for this session:", sessionSkippedSteps);
              
              // Clear ALL saved data
              await AsyncStorage.removeItem('selectedStyles');
              await AsyncStorage.removeItem('selectedBrands');
              await AsyncStorage.removeItem('sizingData');
              
              // Clear any completed steps so they don't appear completed
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify([]))
                .catch(err => console.error("Error saving completed steps:", err));
              
              // Clear selections from context
              if (selectedStyles.length > 0) {
                selectedStyles.forEach(style => removeStyle(style));
              }
              
              // Navigate directly to the review screen
              navigation.navigate('OnboardingOverview');
            } catch (error) {
              console.error("Error skipping to review:", error);
              // Fallback to review anyway
              navigation.navigate('OnboardingOverview');
            }
          }
        },
      ]
    );
  };

  // Handle skip button
  const handleSkip = () => {
    // If user has made selections, confirm they want to skip
    if (selectedStyles.length > 0) {
      Alert.alert(
        'Skip Step',
        'Skipping will not save your style selections. Do you want to save your selections instead?',
        [
          {
            text: 'Skip Without Saving',
            onPress: async () => {
              // Clear any previously saved styles
              await AsyncStorage.removeItem('selectedStyles');
              
              // Clear selected styles from context 
              selectedStyles.forEach(style => removeStyle(style));
              
              // Mark step as skipped for this session only
              const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
              let sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
              
              if (!sessionSkippedSteps.includes(1)) {
                sessionSkippedSteps.push(1);
                await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                  .catch(err => console.error("Error saving session-skipped steps:", err));
                console.log("Marked step 1 as skipped for this session:", sessionSkippedSteps);
              }
              
              // Remove this step from completed steps if it was there
              const updatedCompletedSteps = completedSteps.filter((step: number) => step !== 1);
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedCompletedSteps))
                .catch(err => console.error("Error saving completed steps:", err));
              
              // Navigate to the next incomplete step
              navigateToNextIncompleteStep();
            }
          },
          {
            text: 'Save & Continue',
            onPress: handleContinue
          },
        ]
      );
    } else {
      // No selections, mark as skipped for this session only and navigate
      (async () => {
        try {
          const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
          let sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
          
          if (!sessionSkippedSteps.includes(1)) {
            sessionSkippedSteps.push(1);
            await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
              .catch(err => console.error("Error saving session-skipped steps:", err));
            console.log("Marked step 1 as skipped for this session:", sessionSkippedSteps);
          }
          
          // Navigate to the next incomplete step
          navigateToNextIncompleteStep();
        } catch (error) {
          console.error("Error in handleSkip:", error);
          navigation.navigate('OnboardingBrands');
        }
      })();
    }
  };

  // Close tutorial overlay
  const closeTutorialOverlay = () => {
    setShowTutorialOverlay(false);
  };

  // Add the navigateToNextIncompleteStep function
  const navigateToNextIncompleteStep = async () => {
    try {
      // Get completed steps from AsyncStorage
      const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
      const completedSteps = completedStepsStr ? JSON.parse(completedStepsStr) : [];
      
      // Get session-skipped steps from AsyncStorage
      const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
      const sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
      
      // Check data for each step
      const stylesData = await AsyncStorage.getItem('selectedStyles');
      const styles = stylesData ? JSON.parse(stylesData) : [];
      const stylesComplete = Array.isArray(styles) && styles.length > 0;
      
      const brandsData = await AsyncStorage.getItem('selectedBrands');
      const brands = brandsData ? JSON.parse(brandsData) : [];
      const brandsComplete = Array.isArray(brands) && brands.length > 0;
      
      const sizingData = await AsyncStorage.getItem('sizingData');
      const sizing = sizingData ? JSON.parse(sizingData) : {};
      const sizingComplete = !!(sizing && (sizing.topSize || sizing.bottomSize || sizing.shoeSize));
      
      console.log('Navigation check - completed steps:', completedSteps);
      console.log('Navigation check - session-skipped steps:', sessionSkippedSteps);
      console.log('Navigation check - data:', { 
        stylesComplete, 
        brandsComplete, 
        sizingComplete 
      });
      
      // Go to the first incomplete step that isn't skipped in this session
      
      // Check if step 2 (Brands) needs to be visited
      const step2IsCompleted = completedSteps.includes(2);
      const step2IsSkipped = sessionSkippedSteps.includes(2);
      if (!step2IsCompleted && !step2IsSkipped && !brandsComplete) {
        console.log('Navigating to OnboardingBrands - first incomplete step');
        navigation.navigate('OnboardingBrands');
        return;
      }
      
      // Check if step 3 (Sizing) needs to be visited
      const step3IsCompleted = completedSteps.includes(3);
      const step3IsSkipped = sessionSkippedSteps.includes(3);
      if (!step3IsCompleted && !step3IsSkipped && !sizingComplete) {
        console.log('Navigating to OnboardingSizing - first incomplete step');
        navigation.navigate('OnboardingSizing');
        return;
      }
      
      // If all steps are either completed or skipped in this session, go to review
      console.log('Navigating to OnboardingOverview - all other steps completed or skipped');
      navigation.navigate('OnboardingOverview');
    } catch (error) {
      console.error('Error navigating to next incomplete step:', error);
      // Default to next step on error
      navigation.navigate('OnboardingBrands');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Skip All button - positioned above StepTracker */}
      <View style={styles.topButtonContainer}>
        <TouchableOpacity
          style={[styles.skipAllButton, { backgroundColor: theme.glassmorphism.background }]}
          onPress={handleSkipAll}
        >
          <Text style={[styles.skipAllText, { color: theme.text.secondary }]}>Skip All</Text>
        </TouchableOpacity>
      </View>
      
      {/* StepTracker */}
      <StepTracker
        totalSteps={TOTAL_ONBOARDING_STEPS}
        currentStep={1}
        completedSteps={completedSteps}
        filledSteps={filledSteps}
        navigation={navigation}
        screenNames={SCREEN_NAMES}
      />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Discover Your Style</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Let's personalize your experience. Select your favorite styles.
        </Text>
      </View>

      <View style={styles.bubblesContainer}>
        <EnhancedStyleBubbles
          options={availableStyles}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={[styles.skipText, { color: theme.text.secondary }]}>Skip</Text>
          </TouchableOpacity>
          
          <Animated.View
            style={[{ transform: [{ scale: pulseAnim }] }]}
          >
            <TouchableOpacity 
              style={[
                styles.button, 
                { 
                  backgroundColor: hasSelections ? theme.primary : theme.primary + '60',
                  opacity: hasSelections ? 1 : 0.8,
                  borderColor: theme.primary,
                  borderWidth: 1,
                  ...theme.elevation.medium
                }
              ]}
              onPress={handleContinue}
            >
              <Text style={[styles.buttonText, { color: theme.text.onPrimary }]}>Continue</Text>
              <Icon name="arrow-forward" size={20} color={theme.text.onPrimary} style={styles.buttonIcon} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Tutorial Overlay Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTutorialOverlay}
        onRequestClose={closeTutorialOverlay}
      >
        <TouchableOpacity
          style={styles.overlayContainer}
          activeOpacity={1}
          onPress={closeTutorialOverlay}
        >
          <View style={[styles.tutorialCard, { backgroundColor: theme.background }]}>
            <View style={styles.tutorialHeader}>
              <Icon name="information-circle-outline" size={28} color={theme.primary} />
              <Text style={[styles.tutorialTitle, { color: theme.text.primary }]}>
                Selection Required
              </Text>
            </View>
            <Text style={[styles.tutorialText, { color: theme.text.secondary }]}>
              Please select at least one style to continue. Tap on any bubbles that represent your preferred styles.
            </Text>
            <TouchableOpacity
              style={[styles.tutorialButton, { backgroundColor: theme.primary }]}
              onPress={closeTutorialOverlay}
            >
              <Text style={[styles.tutorialButtonText, { color: theme.text.onPrimary }]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

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
  },
  skipAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skipAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  bubblesContainer: {
    flex: 1,
    marginVertical: 20,
    position: 'relative',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    width: '75%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  skipButton: {
    padding: 10,
    width: '22%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Tutorial Overlay Styles
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialCard: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tutorialTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  tutorialText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  tutorialButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 10,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
