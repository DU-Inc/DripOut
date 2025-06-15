import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Text, Alert } from 'react-native';
import { useTheme } from '../../styles/theme/ThemeContext';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/NavigationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../Config/firebaseconfig';
// Using React Native Firebase

interface StepTrackerProps {
  totalSteps: number;
  currentStep: number;
  completedSteps: number[];  // This represents steps that are completed/submitted
  filledSteps?: number[];    // Optional: steps filled in current session but not completed
  navigation: NavigationProp<RootStackParamList>;
  screenNames: string[];
}

const { width } = Dimensions.get('window');

// Helper function to compare arrays
const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const StepTracker: React.FC<StepTrackerProps> = ({
  totalSteps,
  currentStep,
  completedSteps: initialCompletedSteps,
  filledSteps: initialFilledSteps = [],
  navigation,
  screenNames
}) => {
  const { theme, isDarkMode } = useTheme();
  
  // State to track step status
  const [completedSteps, setCompletedSteps] = useState<number[]>(initialCompletedSteps);
  const [filledSteps, setFilledSteps] = useState<number[]>(initialFilledSteps);

  // Check if a step should be considered filled based on local storage data
  const checkStepStatus = async () => {
    try {
      // Get current user for Firestore check
      const currentUser = auth().currentUser;
      let updatedCompletedSteps = [...initialCompletedSteps];
      let updatedFilledSteps = [...initialFilledSteps];
      
      // First try to get data from Firestore for most accurate state
      if (currentUser) {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists && userDoc.data()?.onboardingSteps) {
          const dbSteps = userDoc.data().onboardingSteps;
          if (dbSteps.completedSteps && Array.isArray(dbSteps.completedSteps)) {
            updatedCompletedSteps = dbSteps.completedSteps;
            console.log('Got completed steps from Firestore:', updatedCompletedSteps);
          }
        }
      }
      
      // Then check local storage for each step
      // Step 1: Style preferences
      const stylesData = await AsyncStorage.getItem('selectedStyles');
      const styles = stylesData ? JSON.parse(stylesData) : [];
      const hasStyles = Array.isArray(styles) && styles.length > 0;
      
      // Step 2: Brand preferences
      const brandsData = await AsyncStorage.getItem('selectedBrands');
      const brands = brandsData ? JSON.parse(brandsData) : [];
      const hasBrands = Array.isArray(brands) && brands.length > 0;
      
      // Step 3: Sizing preferences - require ALL three fields
      const sizingData = await AsyncStorage.getItem('sizingData');
      const sizing = sizingData ? JSON.parse(sizingData) : {};
      const hasTopSize = sizing && sizing.topSize;
      const hasBottomSize = sizing && sizing.bottomSize;
      const hasShoeSize = sizing && sizing.shoeSize;
      
      // For filled steps: any sizing data marks it as filled
      const hasSomeSizingData = hasTopSize || hasBottomSize || hasShoeSize;
      
      // For completed steps: all three sizing fields must be filled
      const hasAllSizingData = hasTopSize && hasBottomSize && hasShoeSize;
      
      console.log('Step status check:', {
        styles: hasStyles,
        brands: hasBrands,
        topSize: hasTopSize,
        bottomSize: hasBottomSize,
        shoeSize: hasShoeSize,
        hasAllSizingData,
        hasSomeSizingData
      });
      
      // Update filled steps based on data presence (at least some data)
      if (hasStyles && !updatedFilledSteps.includes(1)) {
        updatedFilledSteps.push(1);
      } else if (!hasStyles && updatedFilledSteps.includes(1)) {
        updatedFilledSteps = updatedFilledSteps.filter(step => step !== 1);
      }
      
      if (hasBrands && !updatedFilledSteps.includes(2)) {
        updatedFilledSteps.push(2);
      } else if (!hasBrands && updatedFilledSteps.includes(2)) {
        updatedFilledSteps = updatedFilledSteps.filter(step => step !== 2);
      }
      
      if (hasSomeSizingData && !updatedFilledSteps.includes(3)) {
        updatedFilledSteps.push(3);
      } else if (!hasSomeSizingData && updatedFilledSteps.includes(3)) {
        updatedFilledSteps = updatedFilledSteps.filter(step => step !== 3);
      }
      
      // Update completed steps based on whether all required fields are filled
      // Only mark step 3 as completed if ALL sizing fields are filled
      // First, start with a clean copy of completed steps from Firebase/AsyncStorage
      let finalCompletedSteps = [...updatedCompletedSteps];
      
      // For each step, make sure its completion status matches actual data
      // Step 1 (styles): Must have at least one style
      if (hasStyles && !finalCompletedSteps.includes(1)) {
        finalCompletedSteps.push(1);
      } else if (!hasStyles && finalCompletedSteps.includes(1)) {
        finalCompletedSteps = finalCompletedSteps.filter(step => step !== 1);
      }
      
      // Step 2 (brands): Must have at least one brand
      if (hasBrands && !finalCompletedSteps.includes(2)) {
        finalCompletedSteps.push(2);
      } else if (!hasBrands && finalCompletedSteps.includes(2)) {
        finalCompletedSteps = finalCompletedSteps.filter(step => step !== 2);
      }
      
      // Step 3 (sizing): Must have ALL THREE sizing fields filled
      if (hasAllSizingData && !finalCompletedSteps.includes(3)) {
        finalCompletedSteps.push(3);
      } else if (!hasAllSizingData && finalCompletedSteps.includes(3)) {
        finalCompletedSteps = finalCompletedSteps.filter(step => step !== 3);
      }
      
      // Step 4 (review): Always keep if already marked as completed
      
      // Save filled steps to AsyncStorage for persistence
      await AsyncStorage.setItem('onboardingFilledSteps', JSON.stringify(updatedFilledSteps));
      
      // Also save the corrected completed steps
      if (!arraysEqual(updatedCompletedSteps, finalCompletedSteps)) {
        await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(finalCompletedSteps));
        console.log('Fixed completed steps in AsyncStorage:', finalCompletedSteps);
      }
      
      // Update state
      setCompletedSteps(finalCompletedSteps);
      setFilledSteps(updatedFilledSteps);
      
      console.log('Updated step status - completed:', finalCompletedSteps, 'filled:', updatedFilledSteps);
    } catch (error) {
      console.error('Error checking step status:', error);
    }
  };
  
  // Run step status check when component mounts or when relevant props change
  useEffect(() => {
    checkStepStatus();
  }, [initialCompletedSteps, initialFilledSteps, currentStep]);
  
  // Calculate dimensions for individual steps
  const stepWidth = (width - 60) / totalSteps; // Width of each step bar
  const stepGap = 5; // Gap between steps
  const barHeight = 4; // Height of the step bars
  const activeBarHeight = 6; // Active bar is slightly taller
  const activeIndicatorSize = 10; // Size of active step indicator
  
  const handleStepPress = (step: number) => {
    // Don't navigate if trying to go to the current step
    if (step === currentStep) return;
    
    // CRITICAL CHECK: Don't allow navigation to steps with no data
    if (!completedSteps.includes(step) && !filledSteps.includes(step)) {
      // Steps must be completed in order
      const lowestIncompleteStep = [1, 2, 3].find(s => 
        !completedSteps.includes(s) && !filledSteps.includes(s)
      );
      
      if (lowestIncompleteStep && step > lowestIncompleteStep) {
        Alert.alert(
          'Complete Previous Steps',
          `Please complete step ${lowestIncompleteStep} first.`,
          [{ text: 'OK', style: 'default' }]
        );
        
        // Navigate to the lowest incomplete step instead
        const screenName = screenNames[lowestIncompleteStep];
        (navigation as any).navigate(screenName, { fromReview: true });
        return;
      }
    }
    
    // If step is already completed, prompt before navigating
    if (completedSteps.includes(step) && step !== totalSteps) {
      Alert.alert(
        'Step Already Completed',
        'This step has been completed. Editing will change your current selection.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Edit Anyway',
            onPress: () => {
              // Navigate to the step with proper params
              const screenName = screenNames[step];
              // Cast navigation to any to avoid type errors with params
              (navigation as any).navigate(screenName, { fromReview: true });
            }
          },
        ]
      );
    } else {
      // Navigate to the step normally
      const screenName = screenNames[step];
      // Cast navigation to any to avoid type errors with params
      (navigation as any).navigate(screenName, { fromReview: true });
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.trackerContainer}>
        {/* Individual step bars */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = completedSteps.includes(stepNumber);
          const isFilled = filledSteps.includes(stepNumber) || isCompleted;
          const isPast = stepNumber < currentStep;
          const isLastStep = stepNumber === totalSteps;
          
          // Define backgroundColor based on step state
          let backgroundColor;
          
          if (isActive) {
            // Current step - pale color like inactive (changed as requested)
            backgroundColor = isDarkMode 
              ? 'rgba(255,255,255,0.3)' 
              : 'rgba(0,0,0,0.15)';
          } else if (isCompleted) {
            // Completed steps - solid primary color
            backgroundColor = theme.primary;
          } else if (isFilled) {
            // Filled but not completed steps - faded primary color
            backgroundColor = theme.primary + '80';
          } else {
            // Unfilled steps - gray
            backgroundColor = isDarkMode 
              ? 'rgba(255,255,255,0.2)' 
              : 'rgba(0,0,0,0.1)';
          }
          
          return (
            <TouchableOpacity 
              key={index}
              style={[
                styles.stepContainer,
                { width: stepWidth }
              ]}
              onPress={() => handleStepPress(stepNumber)}
              activeOpacity={0.7}
            >
              {isLastStep ? (
                // Last step shows "Review" text instead of a bar
                <View style={styles.lastStepContainer}>
                  <Text style={[
                    styles.reviewText, 
                    { 
                      color: isActive ? theme.primary : 
                             isCompleted ? theme.primary : 
                             isFilled ? theme.primary + 'D0' :
                             isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
                      fontWeight: isActive || isCompleted ? '600' : '400'
                    }
                  ]}>
                    Review
                  </Text>
                  
                  {/* Add indicator for review step when active */}
                  {isActive && (
                    <View 
                      style={[
                        styles.reviewStepIndicator,
                        {
                          width: activeIndicatorSize,
                          height: activeIndicatorSize,
                          backgroundColor: theme.primary,
                        }
                      ]} 
                    />
                  )}
                </View>
              ) : (
                // Regular step bar for other steps
                <>
                  <View 
                    style={[
                      styles.stepBar, 
                      { 
                        width: stepWidth - stepGap,
                        height: isActive ? activeBarHeight : barHeight,
                        backgroundColor
                      }
                    ]} 
                  />
                  
                  {/* Only show indicator for current step */}
                  {isActive && (
                    <View 
                      style={[
                        styles.stepIndicator,
                        {
                          width: activeIndicatorSize,
                          height: activeIndicatorSize,
                          backgroundColor: theme.primary,
                        }
                      ]} 
                    />
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 5,
    width: '100%',
  },
  trackerContainer: {
    height: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: '100%',
  },
  stepBar: {
    borderRadius: 3,
  },
  stepIndicator: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    top: -6,
  },
  reviewStepIndicator: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    top: -10,
  },
  lastStepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StepTracker;