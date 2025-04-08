import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AnimatedSplashScreen from './src/components/common/AnimatedSplashScreen';
// Need Animated and StyleSheet again
import { View, Animated, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/styles/theme/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { appStateManager } from './src/utils/appStateManager';

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;

const App = () => {
  // State to track if the splash screen should be *visible*
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  // Animation value for splash screen opacity
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('App Component: Mount detected, calling initializeApp', Date.now());
        // Initialize app state manager (assumed idempotent)
        await appStateManager.initialize();
        if (!isMounted) return;
        console.log('App Component: appStateManager.initialize() awaited.', Date.now());

        // Minimum delay for splash screen visibility
        await new Promise<void>(resolve => setTimeout(resolve, 3000)); // Keep or adjust this delay
        if (!isMounted) return;
        console.log('App Component: Splash Timeout Complete', Date.now());

        // Start fade-out animation for the splash screen
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 300, // Fade-out duration
          useNativeDriver: true,
        }).start(() => {
          // After animation completes, set splash to not visible
          if (isMounted) {
            setIsSplashVisible(false);
            console.log('App Component: Splash fade-out complete, setting invisible.', Date.now());
          }
        });

      } catch (error) {
        console.error('App initialization failed:', error);
        // Optionally set an error state here or handle differently
        // For now, we'll still hide the splash after timeout even if init failed
         Animated.timing(splashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            if (isMounted) setIsSplashVisible(false);
         });
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      // Cleanup might still be needed depending on what initialize does
      // appStateManager.cleanup();
      console.log('App Component: Unmount cleanup run');
    };
  }, []); // Empty dependency array

  // No need for the second useEffect tracking isReady anymore

  // Render the main app content *always*
  // The splash screen will be rendered conditionally on top
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={styles.flexOne}>
        <View style={styles.flexOne}>
          <SafeAreaProvider>
            {/* RootNavigator is always mounted */}
            <RootNavigator />
          </SafeAreaProvider>

          {/* Conditionally render the Splash Screen overlay */}
          {isSplashVisible && (
            <Animated.View
              style={[
                styles.splashOverlay,
                { opacity: splashOpacity }, // Apply fade-out animation
              ]}
              pointerEvents="none" // Make overlay non-interactive after fade starts (optional)
            >
              <AnimatedSplashScreen />
            </Animated.View>
          )}
        </View>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  splashOverlay: {
    // Use StyleSheet.absoluteFill to cover the entire screen
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#YourSplashScreenBackgroundColor', // Important: Match your splash background
    zIndex: 1000, // Ensure it's on top
  },
});

export default App;
