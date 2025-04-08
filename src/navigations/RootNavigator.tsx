import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import { RootStackParamList } from './types';
import { appStateManager } from '../utils/appStateManager';
import { View, StyleSheet, Dimensions } from 'react-native';

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;

const Stack = createNativeStackNavigator<RootStackParamList>();

// Separate component to contain the navigation logic and access the ref
const NavigationLogic = () => {
  const navigationRef = useNavigationContainerRef();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => appStateManager.isAuthenticated());
  const [isOnboarding, setIsOnboarding] = useState(() => appStateManager.isOnboarding());
  const [isSignupSuccess, setIsSignupSuccess] = useState(() => appStateManager.isSignupInProgress());

  // Effect 1: Handle Initial Loading & State Subscriptions
  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribeAuth = appStateManager.subscribeToAuthState((isAuth) => {
      console.log('Listener: Authentication state changed ->', isAuth);
      setIsAuthenticated(isAuth);
    });
    
    // Subscribe to onboarding state changes
    const unsubscribeOnboarding = appStateManager.subscribeToOnboardingState((isOnboard) => {
      console.log('Listener: Onboarding state changed ->', isOnboard);
      setIsOnboarding(isOnboard);
    });

    // Subscribe to signup success state changes
    const unsubscribeSignupSuccess = appStateManager.subscribeToSignupProgress((isSuccess) => {
      console.log('Listener: Signup success state changed ->', isSuccess);
      setIsSignupSuccess(isSuccess);
    });

    // Perform initial check
    const checkInitialState = async () => {
      try {
        console.log('Checking initial state...');
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        const authenticated = appStateManager.isAuthenticated();
        const onboarding = appStateManager.isOnboarding();
        const signupSuccess = appStateManager.isSignupInProgress();
        setIsAuthenticated(authenticated);
        setIsOnboarding(onboarding);
        setIsSignupSuccess(signupSuccess);
        console.log(`Initial State: Authenticated=${authenticated}, Onboarding=${onboarding}, SignupSuccess=${signupSuccess}`);
      } catch (error) {
        console.error('Error checking initial state:', error);
        setIsAuthenticated(false);
        setIsOnboarding(false);
        setIsSignupSuccess(false);
      } finally {
        console.log('Initial check complete, setting loading to false.');
        setIsLoading(false);
      }
    };

    checkInitialState();

    return () => {
      console.log('Cleaning up listeners');
      unsubscribeAuth();
      unsubscribeOnboarding();
      unsubscribeSignupSuccess();
    };
  }, []);

  // Determine what screens to show
  const shouldShowAuth = !isAuthenticated && !isOnboarding;
  const shouldShowOnboarding = isAuthenticated && isOnboarding;
  const shouldShowSignupSuccess = isAuthenticated && isSignupSuccess;

  // Render Loading state or the Navigator
  if (isLoading) {
    console.log('Rendering Loading State (null)');
    return null;
  }

  console.log(`Navigation State: Authenticated=${isAuthenticated}, Onboarding=${isOnboarding}, SignupSuccess=${shouldShowSignupSuccess}, ShowAuth=${shouldShowAuth}`);

  return (
    <NavigationContainer ref={navigationRef}>
      <View style={styles.container}>
        {/* HomeScreen is always rendered for authenticated users not in onboarding or signup success */}
        <View style={styles.mainContainer}>
          <HomeScreen />
        </View>

        {/* Conditionally render Auth stack as an overlay */}
        {(shouldShowAuth || shouldShowSignupSuccess) && (
          <View style={styles.authContainer}>
            <AuthNavigator />
          </View>
        )}
        
        {/* Conditionally render Onboarding when needed */}
        {shouldShowOnboarding && (
          <View style={styles.authContainer}>
            <AuthNavigator initialRouteName="Onboarding" />
          </View>
        )}
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  authContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
});

// Main RootNavigator component just renders the logic component
const RootNavigator = () => {
  console.log('⚠️ Rendering RootNavigator -> NavigationLogic');
  console.log('⚠️ NOTE: This component may not be used if App.tsx is using AppNavigator directly');
  return <NavigationLogic />;
}

export default RootNavigator; 