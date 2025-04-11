import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Alert,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { useTheme } from '../styles/theme/ThemeContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import OnboardingBubbles from '../components/Onboarding/OnboardingBubbles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingContext } from '../context/OnboardingContext';
import { markOnboardingSkipped } from '../utils/appStateManager';
import StepTracker from '../components/Onboarding/StepTracker';
import { auth } from '../Config/firebaseconfig';
import { getUserPreferences } from '../services/firestoreService';

/* global setTimeout */

type OnboardingBrandsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingBrands'>;
type OnboardingBrandsScreenRouteProp = RouteProp<RootStackParamList, 'OnboardingBrands'>;

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

const OnboardingBrandsScreen: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const navigation = useNavigation<OnboardingBrandsScreenNavigationProp>();
  const route = useRoute<OnboardingBrandsScreenRouteProp>();
  const { selectedBrands, selectedStyles, addBrand, removeBrand } = useOnboardingContext();
  
  // Track completed and filled steps
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [filledSteps, setFilledSteps] = useState<number[]>([]);
  
  // Animation for button pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State to track if user has made any selections
  const [hasSelections, setHasSelections] = useState(selectedBrands.length > 0);
  
  // State for tutorial overlay
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  
  useEffect(() => {
    // Update hasSelections whenever selectedBrands changes
    setHasSelections(selectedBrands.length > 0);
  }, [selectedBrands]);
  
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
    console.log("OnboardingBrandsScreen mounted");
    
    // Load completed steps from storage if available
    AsyncStorage.getItem('onboardingCompletedSteps')
      .then(steps => {
        if (steps) {
          try {
            const parsedSteps = JSON.parse(steps);
            if (Array.isArray(parsedSteps)) {
              setCompletedSteps(parsedSteps);
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
            }
          } catch (e) {
            console.error("Error parsing filled steps:", e);
          }
        }
      })
      .catch(err => {
        console.error("Error loading filled steps:", err);
      });
      
    // Preload existing brand preferences from database if user is logged in
    const preloadExistingPreferences = async () => {
      try {
        // Check if we're coming from the review screen in edit mode
        const fromReview = route.params?.fromReview;
        
        // If we're in edit mode, don't reload from database (keep current selections)
        if (fromReview) {
          console.log("In edit mode - keeping current brand selections instead of loading from database");
          return;
        }
        
        const currentUser = auth().currentUser;
        if (!currentUser) return;
        
        // Try to get preferences from user_preferences collection
        const preferences = await getUserPreferences(currentUser.uid);
        if (preferences && preferences.preferredBrands && preferences.preferredBrands.length > 0) {
          console.log("Preloading existing brand preferences:", preferences.preferredBrands);
          
          // Add each brand to the context if not already selected
          preferences.preferredBrands.forEach((brand: string) => {
            if (!selectedBrands.includes(brand)) {
              addBrand(brand);
            }
          });
          
          // Update hasSelections state
          setHasSelections(preferences.preferredBrands.length > 0);
        }
      } catch (error) {
        console.error("Error preloading existing preferences:", error);
      }
    };
    
    preloadExistingPreferences();
  }, [selectedBrands, addBrand]);

  // Add debugging logs for selectedBrands
  useEffect(() => {
    console.log('OnboardingBrandsScreen: selectedBrands changed:', selectedBrands);
  }, [selectedBrands]);

  // Handle skip button - just move to next step without saving anything
  const handleSkip = () => {
    // If user has made selections, confirm they want to skip
    if (selectedBrands.length > 0) {
      Alert.alert(
        'Skip Step',
        'Skipping will not save your brand selections. Do you want to save your selections instead?',
        [
          {
            text: 'Skip Without Saving',
            onPress: async () => {
              // Clear any previously saved brands
              await AsyncStorage.removeItem('selectedBrands');
              
              // Clear selected brands from context
              selectedBrands.forEach(brand => removeBrand(brand));
              
              // Mark step as skipped for this session only
              const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
              let sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
              
              if (!sessionSkippedSteps.includes(2)) {
                sessionSkippedSteps.push(2);
                await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                  .catch(err => console.error("Error saving session-skipped steps:", err));
                console.log("Marked step 2 as skipped for this session:", sessionSkippedSteps);
              }
              
              // Remove this step from completed steps if it was there
              const updatedCompletedSteps = completedSteps.filter((step: number) => step !== 2);
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
          
          if (!sessionSkippedSteps.includes(2)) {
            sessionSkippedSteps.push(2);
            await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
              .catch(err => console.error("Error saving session-skipped steps:", err));
            console.log("Marked step 2 as skipped for this session:", sessionSkippedSteps);
          }
          
          // Navigate to the next incomplete step
          navigateToNextIncompleteStep();
        } catch (error) {
          console.error("Error in handleSkip:", error);
          navigation.navigate('OnboardingSizing');
        }
      })();
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
              // Mark remaining steps as skipped for this session only
              const sessionSkippedSteps = [2, 3]; // Brand and sizing steps
              await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                .catch(err => console.error("Error saving session-skipped steps:", err));
              console.log("Marked remaining steps as skipped for this session:", sessionSkippedSteps);
              
              // Clear relevant saved data
              await AsyncStorage.removeItem('selectedBrands');
              await AsyncStorage.removeItem('sizingData');
              
              // Clear brand selections from context
              if (selectedBrands.length > 0) {
                selectedBrands.forEach(brand => removeBrand(brand));
              }
              
              // Remove these steps from completed steps
              const filteredCompletedSteps = completedSteps.filter(step => step !== 2 && step !== 3);
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(filteredCompletedSteps))
                .catch(err => console.error("Error saving completed steps:", err));
              
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
  
  // Add a smart navigation function that routes to the next incomplete step
  const navigateToNextIncompleteStep = async () => {
    try {
      // Get completed steps from AsyncStorage
      const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
      const completedSteps = completedStepsStr ? JSON.parse(completedStepsStr) : [];
      
      // Get session-skipped steps from AsyncStorage
      const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
      const sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
      
      // Check sizing data
      const sizingData = await AsyncStorage.getItem('sizingData');
      const sizing = sizingData ? JSON.parse(sizingData) : {};
      const sizingComplete = !!(sizing && (sizing.topSize || sizing.bottomSize || sizing.shoeSize));
      
      console.log('Navigation check - completed steps:', completedSteps);
      console.log('Navigation check - session-skipped steps:', sessionSkippedSteps);
      console.log('Navigation check - sizing data:', { sizingComplete });
      
      // Check if step 3 (Sizing) needs to be visited
      const step3IsCompleted = completedSteps.includes(3);
      const step3IsSkipped = sessionSkippedSteps.includes(3);
      if (!step3IsCompleted && !step3IsSkipped && !sizingComplete) {
        console.log('Navigating to OnboardingSizing - next incomplete step');
        navigation.navigate('OnboardingSizing');
        return;
      }
      
      // If all steps are either completed or skipped, go to review
      console.log('Navigating to OnboardingOverview - all other steps completed or skipped');
      navigation.navigate('OnboardingOverview');
    } catch (error) {
      console.error('Error navigating to next incomplete step:', error);
      // Default to next step on error
      navigation.navigate('OnboardingSizing');
    }
  };

  const navigateToNextEmptyOrReview = async () => {
    try {
      // Check which steps are empty
      const sizingData = await AsyncStorage.getItem('sizingData');
      const sizing = sizingData ? JSON.parse(sizingData) : {};
      const hasSizing = !!(sizing && (sizing.topSize || sizing.bottomSize || sizing.shoeSize));
      
      console.log('Navigation check - sizing:', hasSizing);
      
      // Navigate to sizing if it's empty, otherwise go to review
      if (!hasSizing) {
        navigation.navigate('OnboardingSizing');
      } else {
        // Sizing is already filled, go to review
        navigation.navigate('OnboardingOverview');
      }
    } catch (error) {
      console.error('Error navigating to next section:', error);
      // Default to next step on error
      navigation.navigate('OnboardingSizing');
    }
  };
  
  const handleContinue = async () => {
    // Show tutorial overlay if no brands selected
    if (!hasSelections) {
      setShowTutorialOverlay(true);
      return;
    }
    
    // Mark second step as filled and completed
    const updatedFilledSteps = [...filledSteps];
    if (!updatedFilledSteps.includes(2)) {
      updatedFilledSteps.push(2);
      setFilledSteps(updatedFilledSteps);
      await AsyncStorage.setItem('onboardingFilledSteps', JSON.stringify(updatedFilledSteps))
        .catch(err => console.error("Error saving filled steps:", err));
    }
    
    const updatedCompletedSteps = [...completedSteps];
    if (!updatedCompletedSteps.includes(2)) {
      updatedCompletedSteps.push(2);
      setCompletedSteps(updatedCompletedSteps);
      await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedCompletedSteps))
        .catch(err => console.error("Error saving completed steps:", err));
    }
    
    // Save selected brands to AsyncStorage
    await AsyncStorage.setItem('selectedBrands', JSON.stringify(selectedBrands))
      .catch(err => console.error("Error saving selected brands:", err));
    
    // Check if we came from the review screen
    const fromReview = route.params?.fromReview;
    
    if (fromReview) {
      // Check if other steps are filled
      checkAndNavigateToNextEmptyStep(selectedStyles, selectedBrands);
      return;
    }
    
    // Navigate to the next empty section or review if all are filled
    navigateToNextEmptyOrReview();
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
      if (isStylesEmpty) {
        // Styles is empty, go there first - preserving fromReview parameter
        navigation.navigate('Onboarding', { fromReview: true });
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

  // Close tutorial overlay
  const closeTutorialOverlay = () => {
    setShowTutorialOverlay(false);
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
        currentStep={2}
        completedSteps={completedSteps}
        filledSteps={filledSteps}
        navigation={navigation}
        screenNames={SCREEN_NAMES}
      />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Your Favorite Brands</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Select the brands you love to wear and shop from.
        </Text>
      </View>

      <View style={styles.bubblesContainer}>
        <OnboardingBubbles 
          type="brands"
          options={[
            'Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance',
            'Levi\'s', 'Gap', 'H&M', 'Zara', 'Uniqlo',
            'Calvin Klein', 'Tommy Hilfiger', 'Ralph Lauren', 'Gucci', 'Louis Vuitton',
            'Supreme', 'Off-White', 'Balenciaga', 'Yeezy', 'Jordan',
            'North Face', 'Patagonia', 'Columbia', 'Vans', 'Converse'
          ]}
          onSelectionChange={() => {}}
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
              Please select at least one brand to continue. Tap on any bubbles that represent your favorite brands.
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
    paddingTop: 20,
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

export default OnboardingBrandsScreen;
