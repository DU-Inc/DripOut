import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Animated, StyleSheet } from 'react-native';
import AnimatedSplashScreen from './src/components/common/AnimatedSplashScreen';
import { ThemeProvider } from './src/styles/themeprovider';
import { ShelfProvider } from './src/contexts/ShelfContext';
import AppNavigator from './src/navigations/AppNavigator';
import { appStateManager } from './src/utils/appStateManager';
import { testApiConnectivity } from './src/services/productService';
import { 
  initializePreloader, 
  preloadAppData, 
  cleanupPreloader,
  getPreloaderStatus 
} from './src/services/appPreloader';

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
        
        // Initialize preloader first
        initializePreloader();
        
        // Test API connectivity
        const isApiOnline = await testApiConnectivity();
        console.log(`API connectivity test result: ${isApiOnline ? 'Connected' : 'Not connected'}`);
        
        // Initialize app state manager and preload data in parallel
        const [_, preloadResults] = await Promise.all([
          appStateManager.initialize(),
          // Preload app data while splash screen is showing (non-blocking)
          preloadAppData(false).catch(error => {
            console.error('App preload failed, continuing without cache:', error);
            return null; // Don't block app initialization if preload fails
          })
        ]);
        
        if (!isMounted) return;
        console.log('App Component: appStateManager.initialize() completed', Date.now());
        
        // Log preload results if successful
        if (preloadResults) {
          console.log('App Component: Data preload completed:', {
            success: preloadResults.success,
            duration: preloadResults.duration,
            productsLoaded: preloadResults.products.trending + preloadResults.products.newDrops + preloadResults.products.editorsPicks,
            postsLoaded: preloadResults.posts,
            interactionsLoaded: preloadResults.interactions,
            errors: preloadResults.errors.length
          });
        }

        // Minimum delay for splash screen visibility (for branding impact)
        // This ensures users see the splash screen even if initialization is fast
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
      cleanupPreloader(); // Cleanup preloader listeners and state
      console.log('App Component: Unmount cleanup run');
      
      // Remove splash opacity animation listener
      splashOpacity.removeAllListeners();
    };
  }, [splashOpacity]);

  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ShelfProvider>
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
          </ShelfProvider>
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
