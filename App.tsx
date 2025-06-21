import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Animated, StyleSheet } from 'react-native';
import AnimatedSplashScreen from './src/components/common/AnimatedSplashScreen';
import { ThemeProvider } from './src/styles/themeprovider';
import AppNavigator from './src/navigations/AppNavigator';
import { appStateManager } from './src/utils/appStateManager';
import { testApiConnectivity } from './src/services/productService';

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;

const App: React.FC = () => {
  // State to track if the splash screen should be visible
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  // Animation value for splash screen opacity
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        console.log('App Component: Mount detected, initializing app', Date.now());
        
        // Test API connectivity
        const isApiOnline = await testApiConnectivity();
        console.log(`API connectivity test result: ${isApiOnline ? 'Connected' : 'Not connected'}`);
        
        // Initialize app state manager - AppNavigator will use this state
        await appStateManager.initialize();
        
        if (!isMounted) return;
        console.log('App Component: appStateManager.initialize() completed', Date.now());

        // Minimum delay for splash screen visibility (for branding impact)
        await new Promise<void>(resolve => setTimeout(resolve, 2000));
        if (!isMounted) return;
        console.log('App Component: Splash Timeout Complete', Date.now());

        // Add a dummy listener to prevent warning
        const opacityListener = splashOpacity.addListener(() => {});
        
        // Start fade-out animation for the splash screen
        const animation = Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 300, // Fade-out duration
          useNativeDriver: true,
        });
        
        animation.start(() => {
          // After animation completes, set splash to not visible
          if (isMounted) {
            setIsSplashVisible(false);
            console.log('App Component: Splash fade-out complete', Date.now());
          }
        });
        
        return () => {
          // Clean up animation if component unmounts during animation
          animation.stop();
        };
      } catch (error) {
        console.error('App initialization failed:', error);
        // Even if initialization fails, hide splash after timeout
        const errorAnimation = Animated.timing(splashOpacity, { 
          toValue: 0, 
          duration: 300, 
          useNativeDriver: true 
        });
        
        errorAnimation.start(() => {
          if (isMounted) setIsSplashVisible(false);
        });
        
        return () => {
          // Clean up animation if component unmounts during error animation
          errorAnimation.stop();
        };
      }
    };

    // Start initialization process
    initializeApp();

    return () => {
      isMounted = false;
      // Cleanup when app unmounts
      appStateManager.cleanup();
      console.log('App Component: Unmount cleanup run');
      
      // Remove splash opacity animation listener
      splashOpacity.removeAllListeners();
    };
  }, [splashOpacity]);

  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* AppNavigator handles all navigation flows: auth, onboarding, and main app */}
          <AppNavigator />

          {/* Splash Screen Overlay - shown while initializing */}
          {isSplashVisible && (
            <Animated.View
              style={[
                styles.splashOverlay,
                { opacity: splashOpacity }, // Apply fade-out animation
              ]}
              pointerEvents="none" // Make overlay non-interactive during fade
            >
              <AnimatedSplashScreen />
            </Animated.View>
          )}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000, // Ensure it's on top
  },
});

export default App;
