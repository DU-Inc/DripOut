import React, { useEffect } from 'react';
import { 
  createStackNavigator, 
  StackCardInterpolationProps, 
  StackCardStyleInterpolator, 
  CardStyleInterpolators
} from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import { View, StyleSheet, Dimensions, Platform, Animated, BackHandler } from 'react-native';
import { OnboardingProvider } from '../context/OnboardingContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import OnboardingBrandsScreen from '../screens/OnboardingBrandsScreen';
import OnboardingSizingScreen from '../screens/OnboardingSizingScreen';
import OnboardingReview from '../screens/OnboardingReview';
import { RootStackParamList } from '../types/NavigationTypes';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add declaration for setTimeout
declare const setTimeout: (callback: () => void, ms: number) => number;

// Enable native screens for better performance
enableScreens(true);

const Stack = createStackNavigator<RootStackParamList>();
const { width } = Dimensions.get('window');

// Add a WeakSet at the top of the file to track animated values with listeners
const addedAnimatedListeners = new WeakSet();

// Standard push transition interpolator
const pushFullTransitionInterpolator: StackCardStyleInterpolator = ({ 
  current, 
  next, 
  layouts 
}) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width, 0],
    extrapolate: 'clamp',
  });

  let prevTranslateX = new Animated.Value(0).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
    extrapolate: 'clamp',
  });
  if (next && next.progress) {
    prevTranslateX = next.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -layouts.screen.width], // Preserve push-away effect
      extrapolate: 'clamp',
    });
    // Add a dummy listener if not already added to avoid the warning
    if (next.progress.addListener && !addedAnimatedListeners.has(next.progress)) {
      next.progress.addListener(() => {});
      addedAnimatedListeners.add(next.progress);
    }
  }

  return {
    cardStyle: {
      transform: [{ translateX }],
      backgroundColor: 'transparent', // Ensure transparency
    },
    overlayStyle: { opacity: 0 },
    containerStyle: {
      transform: [{ translateX: prevTranslateX as any }], // Casting to any to satisfy type checking
    },
  };
};

// Standard horizontal slide interpolator (modified for transparency)
const horizontalSlideInterpolator: StackCardStyleInterpolator = (props) => {
  const originalInterpolator = CardStyleInterpolators.forHorizontalIOS(props);
  return {
    ...originalInterpolator,
    cardStyle: {
      ...originalInterpolator.cardStyle,
      backgroundColor: 'transparent', // Ensure transparency
    },
    overlayStyle: {
      ...originalInterpolator.overlayStyle,
      opacity: 0 // Ensure no overlay for standard slide either
    }
  };
};

// Define navigation props type for options function
type OnboardingScreenOptionsProps = {
  route: RouteProp<RootStackParamList, keyof RootStackParamList>;
  navigation: StackNavigationProp<RootStackParamList>;
};

// Wrapper component for OnboardingReview to handle navigation back
const OnboardingReviewWrapper: React.FC = (props) => {
  const navigation = useNavigation();
  
  // Handle back button press and hardware back button
  useEffect(() => {
    // Custom back button handler
    const handleBackPress = () => {
      // Check if there's a parent navigator to go back to
      if (navigation.getParent()) {
        // Prevent default back behavior
        return true;
      }
      return false;
    };
    
    // Add back button handler for Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      // Clean up the event listener
      backHandler.remove();
    };
  }, [navigation]);
  
  // We can also handle returnTo route here if needed, but we're doing it in the OnboardingReview component
  
  return <OnboardingReview {...props} />;
};

// Dedicated navigator for the onboarding flow, wrapped in its context provider
const OnboardingNavigator: React.FC = () => {
  return (
    <OnboardingProvider>
      <View style={styles.container}>
        <Stack.Navigator 
          initialRouteName="Onboarding"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: 'transparent' }, 
            cardOverlayEnabled: false,
            detachPreviousScreen: false,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            presentation: 'card',
          }}
        >
          {/* Onboarding flow steps in correct sequence */}
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{
              cardStyleInterpolator: pushFullTransitionInterpolator,
              gestureEnabled: false, // Disable gesture for first screen
            }}
          />
          <Stack.Screen 
            name="OnboardingBrands" 
            component={OnboardingBrandsScreen}
            options={({ route, navigation }: OnboardingScreenOptionsProps) => ({
              cardStyleInterpolator: pushFullTransitionInterpolator,
              detachPreviousScreen: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            })}
          />
          <Stack.Screen 
            name="OnboardingSizing" 
            component={OnboardingSizingScreen}
            options={({ route, navigation }: OnboardingScreenOptionsProps) => ({
              cardStyleInterpolator: pushFullTransitionInterpolator,
              detachPreviousScreen: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            })}
          />
          <Stack.Screen 
            name="OnboardingOverview" 
            component={OnboardingReviewWrapper}
            options={({ route, navigation }: OnboardingScreenOptionsProps) => ({
              cardStyleInterpolator: pushFullTransitionInterpolator,
              detachPreviousScreen: false,
              gestureEnabled: false, // Disable gesture to prevent accidental dismissal
              gestureDirection: 'horizontal',
            })}
          />
          {/* Main tabs is accessible from onboarding flow for completing the process */}
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabsPlaceholder}
            options={{
              gestureEnabled: false, // Disable gesture to prevent going back to onboarding
              animationEnabled: true,
            }}
          />
        </Stack.Navigator>
      </View>
    </OnboardingProvider>
  );
};

// Placeholder component for MainTabs to allow proper navigation in standalone flow
const MainTabsPlaceholder = () => {
  // Get navigation for the placeholder
  const navigation = useNavigation();
  
  // When this placeholder is mounted, immediately check if we should dismiss the modal
  useEffect(() => {
    const checkReturnRoute = async () => {
      try {
        // Get the return route from AsyncStorage
        const returnRoute = await AsyncStorage.getItem('onboardingReturnTo');
        console.log('MainTabsPlaceholder: Should return to:', returnRoute || 'previous screen');
        
        // Small delay to ensure proper animation
        setTimeout(() => {
          // Navigate back to dismiss the modal
          if (navigation.getParent()) {
            navigation.getParent()?.goBack();
          }
        }, 300);
      } catch (error) {
        console.error('MainTabsPlaceholder: Error checking return route:', error);
        // Still try to go back on error
        if (navigation.getParent()) {
          navigation.getParent()?.goBack();
        }
      }
    };
    
    checkReturnRoute();
  }, [navigation]);
  
  return <View style={{ flex: 1, backgroundColor: 'white' }} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default OnboardingNavigator; 