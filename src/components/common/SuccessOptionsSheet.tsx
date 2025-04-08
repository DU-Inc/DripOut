import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Dimensions, 
  TouchableWithoutFeedback, 
  Modal,
  Platform,
  BackHandler,
  Easing,
  PanResponder
} from 'react-native';
import { useTheme } from "../../styles/theme/ThemeContext";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from './Button';
import { text } from '../../text';

const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

// Height of the sheet - roughly half the screen
const SHEET_HEIGHT = height * 0.6;

interface SuccessOptionsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onCompleteOnboarding: () => void;
  onProceedToHome: () => void;
  onDragProgress?: (progress: number) => void;
  isSignIn?: boolean; // Flag to determine if sheet shown after sign-in (vs sign-up)
  firstName?: string; // User's first name to personalize greeting
}

const SuccessOptionsSheet: React.FC<SuccessOptionsSheetProps> = ({
  visible,
  onDismiss,
  onCompleteOnboarding,
  onProceedToHome,
  onDragProgress,
  isSignIn = false,
  firstName = ''
}) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Add state to prevent multiple dismissals
  const [isDismissing, setIsDismissing] = useState(false);

  // Helper function to get appropriate title text
  const getTitleText = () => {
    if (isSignIn) {
      // For sign-in flow
      if (firstName) {
        // Personalized greeting with first name
        return text.components.successOptions.signIn.personalizedTitle.replace('%firstName%', firstName);
      }
      return text.components.successOptions.signIn.title;
    }
    // Default sign-up flow
    return text.components.successOptions.title;
  };

  // Helper function to get appropriate subtitle text
  const getSubtitleText = () => {
    if (isSignIn) {
      return text.components.successOptions.signIn.subtitle;
    }
    return text.components.successOptions.subtitle;
  };

  // Add effect to report drag progress to parent
  useEffect(() => {
    if (onDragProgress) {
      // Create a listener for the translateY value
      const id = translateY.addListener(({ value }) => {
        // Convert the drag distance to a progress value (0-1)
        // where 0 is fully shown and 1 is fully hidden
        // Calculate only when dragging down (value > 0)
        if (value > 0) {
          // Calculate how far down the sheet has been dragged as a percentage
          // Max drag distance is considered to be 100px for a full scale restoration
          const dragProgress = Math.min(value / 100, 1);
          onDragProgress(dragProgress);
        } else {
          // When at rest at the top, ensure progress is 0
          onDragProgress(0);
        }
      });
      
      return () => {
        // Clean up listener on unmount
        translateY.removeListener(id);
      };
    }
  }, [translateY, onDragProgress]);

  // Configure pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward swipes
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down far enough, dismiss
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          // Otherwise snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40
          }).start();
          
          // Reset the background scale when sheet snaps back
          if (onDragProgress) {
            onDragProgress(0);
          }
        }
      }
    })
  ).current;

  // Handle back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible && !isDismissing) {
        closeSheet();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, isDismissing]);

  // Show animation when visible changes
  useEffect(() => {
    if (visible) {
      // Reset the dismiss flag
      setIsDismissing(false);
      
      // Debug log for visibility
      console.log('SuccessOptionsSheet becoming visible');
      console.log('Is Sign In mode:', isSignIn);
      console.log('First name:', firstName || 'none');
      
      // Start from off screen
      translateY.setValue(SHEET_HEIGHT);
      
      // Animate in - use spring animation for the sheet to match the background
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8, // Match friction with background animation
          tension: 40, // Match tension with background animation
          // Remove bounciness and speed - using friction/tension instead
        })
      ]).start();
    } else {
      console.log('SuccessOptionsSheet becoming hidden');
    }
  }, [visible, translateY, backdropOpacity, isSignIn, firstName]);

  // Updated close sheet method to reset drag progress
  const closeSheet = () => {
    if (isDismissing) return;
    
    setIsDismissing(true);
    
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.spring(translateY, {
        toValue: SHEET_HEIGHT,
        useNativeDriver: true,
        friction: 10,
        tension: 60,
      })
    ]).start(() => {
      onDismiss();
      setIsDismissing(false);
    });
  };

  // Handle complete onboarding with dismiss animation
  const handleCompleteOnboarding = () => {
    if (isDismissing) return;
    
    // Directly call the onboarding handler without dismissing the sheet first
    // This prevents any timing issues with the navigation
    onCompleteOnboarding();
  };

  // Handle proceed to home with dismiss animation
  const handleProceedToHome = () => {
    if (isDismissing) return;
    
    setIsDismissing(true);
    
    // Use spring for more natural dismissal
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }),
      Animated.spring(translateY, {
        toValue: SHEET_HEIGHT,
        useNativeDriver: true,
        friction: 10,
        tension: 60,
      })
    ]).start(() => {
      setIsDismissing(false);
      onProceedToHome();
    });
  };

  // Don't render anything if not visible
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        {/* Backdrop - touchable for dismissing */}
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View 
            style={[
              styles.backdrop, 
              { opacity: backdropOpacity, backgroundColor: 'rgba(0, 0, 0, 0.5)' }
            ]} 
          />
        </TouchableWithoutFeedback>
        
        {/* The sheet */}
        <Animated.View 
          style={[
            styles.sheet, 
            { 
              backgroundColor: theme.background,
              transform: [{ translateY }],
              ...theme.elevation.medium
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle for visual indication of draggable area */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.text.tertiary }]} />
          </View>
          
          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text.primary }]}>
              {getTitleText()}
            </Text>
            
            <Text style={[styles.subtitle, { 
              color: theme.text.secondary,
              lineHeight: normalize(24)
            }]}>
              {getSubtitleText()}
            </Text>
            
            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Onboarding Button */}
              <Button
                title={text.components.successOptions.onboardingButton}
                onPress={handleCompleteOnboarding}
                style={{
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  borderWidth: 1,
                  paddingVertical: normalize(12),
                  paddingHorizontal: normalize(18),
                  width: '100%',
                  ...theme.elevation.light
                }}
                textStyle={{ color: theme.text.onPrimary }}
              />
              
              {/* Home Button */}
              <Button
                title={text.components.successOptions.homeButton}
                onPress={handleProceedToHome}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme.border,
                  borderWidth: 1,
                  paddingVertical: normalize(12),
                  paddingHorizontal: normalize(18),
                  width: '100%',
                  marginTop: normalize(16)
                }}
                textStyle={{ color: theme.text.primary }}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    height: SHEET_HEIGHT,
    width: '100%',
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    paddingBottom: Platform.OS === 'ios' ? normalize(40) : normalize(30),
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: normalize(12),
    paddingBottom: normalize(8),
  },
  handle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: normalize(24),
    paddingTop: normalize(16),
    paddingBottom: normalize(32),
  },
  title: {
    fontSize: normalize(22),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: normalize(12),
  },
  subtitle: {
    fontSize: normalize(16),
    textAlign: 'center',
    marginBottom: normalize(36),
    lineHeight: normalize(22),
  },
  buttonsContainer: {
    width: '100%',
  },
});

export default SuccessOptionsSheet; 