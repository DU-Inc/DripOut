import React from 'react';
import { 
  createStackNavigator, 
  StackCardInterpolationProps, 
  StackCardStyleInterpolator, 
  CardStyleInterpolators, // Import the standard interpolators
  StackNavigationOptions
} from '@react-navigation/stack';
import { enableScreens } from 'react-native-screens';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import { AuthStackParamList } from './types';
import { View, StyleSheet, Dimensions, Platform, Animated } from 'react-native'; // Added Platform and Animated
import { RouteProp } from '@react-navigation/native'; // Added RouteProp
import { StackNavigationProp } from '@react-navigation/stack'; // Added StackNavigationProp

// For React Native Screens orientation lock
import { NativeStackNavigationOptions } from 'react-native-screens/native-stack';

// Enable native screens for better performance
enableScreens(true);

const Stack = createStackNavigator<AuthStackParamList>();
const { width } = Dimensions.get('window');

// Add a WeakSet at the top of the file to track animated values with listeners
const addedAnimatedListeners = new WeakSet();

// Updated pushFullTransitionInterpolator to preserve containerStyle push-away effect and add a dummy listener
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

// Fade transition for Welcome screen (modified for transparency)
const fadeTransitionInterpolator: StackCardStyleInterpolator = ({ current }) => ({
  cardStyle: {
    opacity: current.progress,
    backgroundColor: 'transparent', // Ensure transparency
  },
});

// Define navigation props type for options function
type AuthScreenOptionsProps = {
  route: RouteProp<AuthStackParamList, keyof AuthStackParamList>;
  navigation: StackNavigationProp<AuthStackParamList>;
};

type AuthNavigatorProps = {
  initialRouteName?: keyof AuthStackParamList;
};

const AuthNavigator: React.FC<AuthNavigatorProps> = ({ initialRouteName = 'Welcome' }) => {
  return (
    <View style={styles.container}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' }, 
          cardOverlayEnabled: false,
          detachPreviousScreen: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{
            cardStyleInterpolator: fadeTransitionInterpolator,
          }}
        />
        <Stack.Screen 
          name="SignIn" 
          component={SignInScreen}
          options={({ route, navigation }: AuthScreenOptionsProps) => {
            const state = navigation.getState();
            const previousRouteName = state.routes[state.index - 1]?.name;
            // Use push only if navigating between SignIn and SignUp
            const interpolator = (previousRouteName === 'SignUp')
              ? pushFullTransitionInterpolator 
              : horizontalSlideInterpolator;
            return { cardStyleInterpolator: interpolator };
          }}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={({ route, navigation }: AuthScreenOptionsProps) => {
            const state = navigation.getState();
            const previousRouteName = state.routes[state.index - 1]?.name;
            // Use push only if navigating between SignIn and SignUp
            const interpolator = (previousRouteName === 'SignIn')
              ? pushFullTransitionInterpolator 
              : horizontalSlideInterpolator;
            return { cardStyleInterpolator: interpolator };
          }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen as React.ComponentType<{}>}
          options={({ route, navigation }: AuthScreenOptionsProps) => {
            const state = navigation.getState();
            const previousRouteName = state.routes[state.index - 1]?.name;
            // Use push transition when coming from SignIn
            const interpolator = (previousRouteName === 'SignIn')
              ? pushFullTransitionInterpolator 
              : horizontalSlideInterpolator;
            return { cardStyleInterpolator: interpolator };
          }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{
            cardStyleInterpolator: pushFullTransitionInterpolator,
            gestureEnabled: false, // Disable gesture to prevent going back with swipe
            headerShown: false, // Hide the header
            detachPreviousScreen: true, // Detach previous screen to improve performance
          }}
        />
      </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AuthNavigator; 