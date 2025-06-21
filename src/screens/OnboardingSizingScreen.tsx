import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  FlatList,
  Alert,
  Animated,
  Easing
} from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { auth } from '../Config/firebaseconfig';
import { setUserPreferences, getUserPreferences } from '../services/firestoreService';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../utils/appStateManager';
import StepTracker from '../components/Onboarding/StepTracker';

type OnboardingSizingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingSizing'>;
type OnboardingSizingScreenRouteProp = RouteProp<RootStackParamList, 'OnboardingSizing'>;

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

const OnboardingSizingScreen: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const navigation = useNavigation<OnboardingSizingScreenNavigationProp>();
  const route = useRoute<OnboardingSizingScreenRouteProp>();
  const { selectedStyles, selectedBrands } = useOnboardingContext();
  
  // Track completed and filled steps
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [filledSteps, setFilledSteps] = useState<number[]>([]);
  
  // Define size options
  const topSizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const bottomSizeOptions = ["28", "30", "32", "34", "36", "38", "40", "42", "44"];
  const shoeSizeOptions = ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "US 13"];
  
  // State for selected sizes
  const [topSize, setTopSize] = useState('');
  const [bottomSize, setBottomSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for selector modal
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSelector, setCurrentSelector] = useState<'tops' | 'bottoms' | 'shoes' | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  
  // State for tutorial overlay
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false);
  
  // Animation for button pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // State to track if user has made any selections
  const [hasSelections, setHasSelections] = useState(false);
  
  useEffect(() => {
    // Update hasSelections whenever any size changes
    setHasSelections(!!topSize || !!bottomSize || !!shoeSize);
  }, [topSize, bottomSize, shoeSize]);
  
  // Pulse animation for review button
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

  // Skip button - just navigate to review without saving
  const handleSkip = () => {
    // If user has made selections, confirm they want to skip
    if (topSize || bottomSize || shoeSize) {
      Alert.alert(
        'Skip Step',
        'Skipping will not save your sizing information. Do you want to save your selections instead?',
        [
          {
            text: 'Skip Without Saving',
            onPress: async () => {
              // Clear any previously saved sizing data
              await AsyncStorage.removeItem('sizingData');
              
              // Clear the state variables
              setTopSize('');
              setBottomSize('');
              setShoeSize('');
              
              // Mark step as skipped for this session only
              const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
              let sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
              
              if (!sessionSkippedSteps.includes(3)) {
                sessionSkippedSteps.push(3);
                await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                  .catch(err => console.error("Error saving session-skipped steps:", err));
                console.log("Marked step 3 as skipped for this session:", sessionSkippedSteps);
              }
              
              // Remove this step from completed steps if it was there
              const updatedCompletedSteps = completedSteps.filter((step: number) => step !== 3);
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedCompletedSteps))
                .catch(err => console.error("Error saving completed steps:", err));
              
              // Navigate to review screen (this is the last step)
              navigation.navigate('OnboardingOverview');
            }
          },
          {
            text: 'Save & Continue',
            onPress: handleComplete
          },
        ]
      );
    } else {
      // No selections, mark as skipped for this session only and navigate
      (async () => {
        try {
          const sessionSkippedStepsStr = await AsyncStorage.getItem('sessionSkippedSteps');
          let sessionSkippedSteps = sessionSkippedStepsStr ? JSON.parse(sessionSkippedStepsStr) : [];
          
          if (!sessionSkippedSteps.includes(3)) {
            sessionSkippedSteps.push(3);
            await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
              .catch(err => console.error("Error saving session-skipped steps:", err));
            console.log("Marked step 3 as skipped for this session:", sessionSkippedSteps);
          }
          
          // Navigate to review screen (this is the last step)
          navigation.navigate('OnboardingOverview');
        } catch (error) {
          console.error("Error in handleSkip:", error);
          navigation.navigate('OnboardingOverview');
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
              // Mark step as skipped for this session only
              const sessionSkippedSteps = [3]; // Just the sizing step (we're already at step 3)
              await AsyncStorage.setItem('sessionSkippedSteps', JSON.stringify(sessionSkippedSteps))
                .catch(err => console.error("Error saving session-skipped steps:", err));
              console.log("Marked step 3 as skipped for this session:", sessionSkippedSteps);
              
              // Clear sizing data
              await AsyncStorage.removeItem('sizingData');
              
              // Clear local state
              setTopSize('');
              setBottomSize('');
              setShoeSize('');
              
              // Remove this step from completed steps
              const filteredCompletedSteps = completedSteps.filter(step => step !== 3);
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
  
  useEffect(() => {
    console.log("OnboardingSizingScreen mounted");
    
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
      
    // First, try to load from AsyncStorage (faster)
    const loadLocalSizingData = async () => {
      try {
        const sizingData = await AsyncStorage.getItem('sizingData');
        if (sizingData) {
          const parsedData = JSON.parse(sizingData);
          setTopSize(parsedData.topSize || '');
          setBottomSize(parsedData.bottomSize || '');
          setShoeSize(parsedData.shoeSize || '');
          
          // Update hasSelections based on this data
          const hasAnySize = !!(parsedData.topSize || parsedData.bottomSize || parsedData.shoeSize);
          setHasSelections(hasAnySize);
          
          // Verify if step 3 should be considered completed based on current data
          const allSizesFilled = !!(parsedData.topSize && parsedData.bottomSize && parsedData.shoeSize);
          
          // Check the current completion status
          const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
          if (completedStepsStr) {
            const completedSteps = JSON.parse(completedStepsStr);
            const step3IsMarkedCompleted = completedSteps.includes(3);
            
            // If there's a mismatch between the actual data and the completion status, fix it
            if (allSizesFilled && !step3IsMarkedCompleted) {
              // Should be completed but isn't marked as such
              completedSteps.push(3);
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(completedSteps));
              console.log("Fixed: Added step 3 to completed steps because all sizes are filled");
            } else if (!allSizesFilled && step3IsMarkedCompleted) {
              // Shouldn't be completed but is marked as such
              const updatedSteps = completedSteps.filter((step: number) => step !== 3);
              await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedSteps));
              console.log("Fixed: Removed step 3 from completed steps because not all sizes are filled");
            }
          }
        }
      } catch (error) {
        console.error("Error loading sizing data from AsyncStorage:", error);
      }
    };
    
    // Then try to load from database if user is logged in (more authoritative)
    const preloadExistingSizingData = async () => {
      try {
        // Check if we're coming from the review screen in edit mode
        const fromReview = route.params?.fromReview;
        
        // If we're in edit mode, don't reload from database (keep current selections)
        if (fromReview) {
          console.log("In edit mode - keeping current sizing selections instead of loading from database");
          return;
        }
        
        const currentUser = auth().currentUser;
        if (!currentUser) return;
        
        // Try to get preferences from user_preferences collection
        const preferences = await getUserPreferences(currentUser.uid);
        if (preferences) {
          console.log("Preloading existing sizing data from database");
          
          // Only set if there's data
          if (preferences.topsSize) setTopSize(preferences.topsSize);
          if (preferences.bottomsSize) setBottomSize(preferences.bottomsSize);
          if (preferences.shoeSize) setShoeSize(preferences.shoeSize);
          
          // Update hasSelections based on this data
          const hasAnySize = !!(preferences.topsSize || preferences.bottomsSize || preferences.shoeSize);
          setHasSelections(hasAnySize);
          
          // Save to AsyncStorage to keep it in sync
          const sizingData = {
            topSize: preferences.topsSize || '',
            bottomSize: preferences.bottomsSize || '',
            shoeSize: preferences.shoeSize || ''
          };
          await AsyncStorage.setItem('sizingData', JSON.stringify(sizingData));
        }
      } catch (error) {
        console.error("Error preloading existing sizing data:", error);
      }
    };
    
    // Load data, first from local then from server
    loadLocalSizingData().then(preloadExistingSizingData);
  }, []);
  
  // When completing and reviewing sizing info:
  const handleComplete = async () => {
    try {
      // Show tutorial overlay if no sizing information has been provided
      if (!topSize && !bottomSize && !shoeSize) {
        setShowTutorialOverlay(true);
        return;
      }
      
      // Check if ALL sizes are filled - only mark as complete if all three sizes are provided
      const allSizesFilled = !!topSize && !!bottomSize && !!shoeSize;
      console.log("Sizing completion check:", { 
        topSize: !!topSize, 
        bottomSize: !!bottomSize, 
        shoeSize: !!shoeSize, 
        allSizesFilled 
      });
      
      // Get completed and filled steps so far
      const updatedFilledSteps = [...filledSteps];
      
      // Only consider the step as "filled" if at least one size is provided
      // This allows navigation but doesn't mark it as fully complete
      if (!updatedFilledSteps.includes(3) && (topSize || bottomSize || shoeSize)) {
        updatedFilledSteps.push(3);
        setFilledSteps(updatedFilledSteps);
        await AsyncStorage.setItem('onboardingFilledSteps', JSON.stringify(updatedFilledSteps))
          .catch(err => console.error("Error saving filled steps:", err));
        console.log("Step 3 marked as FILLED (at least one size provided)");
      }
      
      // Only mark it as "completed" if ALL sizes are filled
      const updatedCompletedSteps = [...completedSteps];
      if (allSizesFilled) {
        if (!updatedCompletedSteps.includes(3)) {
          updatedCompletedSteps.push(3);
          setCompletedSteps(updatedCompletedSteps);
          await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(updatedCompletedSteps))
            .catch(err => console.error("Error saving completed steps:", err));
          console.log("Step 3 marked as COMPLETED (all sizes provided)");
        }
      } else {
        // If not all sizes are filled, remove it from completed steps (but keep it in filled steps)
        if (updatedCompletedSteps.includes(3)) {
          const filteredSteps = updatedCompletedSteps.filter(step => step !== 3);
          setCompletedSteps(filteredSteps);
          await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(filteredSteps))
            .catch(err => console.error("Error saving completed steps:", err));
          console.log("Step 3 REMOVED from completed steps (not all sizes provided)");
        } else {
          console.log("Step 3 already not in completed steps");
        }
      }
      
      // Save sizing data to AsyncStorage - don't submit to database yet
      const sizingData = { topSize, bottomSize, shoeSize };
      await AsyncStorage.setItem('sizingData', JSON.stringify(sizingData));
      console.log("Saved sizing data to AsyncStorage:", sizingData);
      
      // Check if we came from the review screen
      const fromReview = route.params?.fromReview;
      
      if (fromReview) {
        // Check if other steps are filled
        await checkAndNavigateToNextEmptyStep(selectedStyles, selectedBrands, topSize, bottomSize, shoeSize);
      } else {
        // Always navigate to the review screen after completing sizing
        navigation.navigate('OnboardingOverview');
      }
    } catch (error) {
      console.error("Error navigating to overview:", error);
      // Still navigate even if error occurs
      navigation.navigate('OnboardingOverview');
    }
  };

  // Open the selector modal with appropriate options
  const openSelector = (type: 'tops' | 'bottoms' | 'shoes') => {
    setCurrentSelector(type);
    
    // Set the options based on selector type
    switch (type) {
      case 'tops':
        setCurrentOptions(topSizeOptions);
        break;
      case 'bottoms':
        setCurrentOptions(bottomSizeOptions);
        break;
      case 'shoes':
        setCurrentOptions(shoeSizeOptions);
        break;
    }
    
    setModalVisible(true);
  };
  
  // Handle option selection
  const handleSelect = (option: string) => {
    // Update the appropriate state based on current selector
    switch (currentSelector) {
      case 'tops':
        setTopSize(option);
        break;
      case 'bottoms':
        setBottomSize(option);
        break;
      case 'shoes':
        setShoeSize(option);
        break;
    }
    
    // Close the modal
    setModalVisible(false);
  };

  // Helper function to determine the next navigation destination
  const checkAndNavigateToNextEmptyStep = async (
    styles: string[], 
    brands: string[],
    currentTopSize: string,
    currentBottomSize: string,
    currentShoeSize: string
  ) => {
    try {
      // Check which steps are empty
      const isStylesEmpty = styles.length === 0;
      const isBrandsEmpty = brands.length === 0;
      const isSizingEmpty = !currentTopSize && !currentBottomSize && !currentShoeSize;
      
      // Determine which step to navigate to
      if (isStylesEmpty) {
        // Styles is empty, go there first - preserving fromReview parameter
        navigation.navigate('Onboarding', { fromReview: true });
      } else if (isBrandsEmpty) {
        // Brands is empty, go there next - preserving fromReview parameter
        navigation.navigate('OnboardingBrands', { fromReview: true });
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
        currentStep={3}
        completedSteps={completedSteps}
        filledSteps={filledSteps}
        navigation={navigation}
        screenNames={SCREEN_NAMES}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text.primary }]}>Your Size Profile</Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Help us recommend the perfect fit for your style.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text.primary }]}>Tops Size</Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border,
                }
              ]}
              onPress={() => openSelector('tops')}
            >
              <Text style={{ color: topSize ? theme.text.primary : theme.text.secondary }}>
                {topSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text.primary }]}>Bottoms Size</Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border,
                }
              ]}
              onPress={() => openSelector('bottoms')}
            >
              <Text style={{ color: bottomSize ? theme.text.primary : theme.text.secondary }}>
                {bottomSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text.primary }]}>Shoe Size</Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border,
                }
              ]}
              onPress={() => openSelector('shoes')}
            >
              <Text style={{ color: shoeSize ? theme.text.primary : theme.text.secondary }}>
                {shoeSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
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
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  borderWidth: 1,
                  ...theme.elevation.medium
                }
              ]}
              onPress={handleComplete}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: theme.text.onPrimary }]}>Review</Text>
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
                Size Information Needed
              </Text>
            </View>
            <Text style={[styles.tutorialText, { color: theme.text.secondary }]}>
              To fully complete your sizing profile, please select all three sizes: Tops, Bottoms, and Shoes. This will help us recommend the perfect fit for your items.
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
      
      {/* Size Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopWidth: 1,
              }
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Select {currentSelector === 'tops' ? 'Top' : currentSelector === 'bottoms' ? 'Bottom' : 'Shoe'} Size
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={currentOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { 
                      backgroundColor: 
                        (currentSelector === 'tops' && item === topSize) ||
                        (currentSelector === 'bottoms' && item === bottomSize) ||
                        (currentSelector === 'shoes' && item === shoeSize)
                          ? `${theme.primary}30`  // Semi-transparent highlight
                          : 'transparent',
                      borderBottomColor: theme.border
                    }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={{ 
                    color: theme.text.primary,
                    fontWeight: 
                      (currentSelector === 'tops' && item === topSize) ||
                      (currentSelector === 'bottoms' && item === bottomSize) ||
                      (currentSelector === 'shoes' && item === shoeSize)
                        ? '600'
                        : 'normal'
                  }}>
                    {item}
                  </Text>
                  {/* Show checkmark for selected item */}
                  {((currentSelector === 'tops' && item === topSize) ||
                    (currentSelector === 'bottoms' && item === bottomSize) ||
                    (currentSelector === 'shoes' && item === shoeSize)) && (
                    <Icon name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
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
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  dropdownSelector: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    maxHeight: '70%',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    alignItems: 'center',
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
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tutorialCard: {
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxHeight: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
  },
  tutorialText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialButton: {
    padding: 15,
    borderRadius: 10,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingSizingScreen;
