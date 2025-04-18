import React, { useState, useEffect, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, StyleSheet, Animated } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from "./AuthNavigator";
import OverviewScreen from "../screens/OverviewScreen";
import SocialScreen from "../screens/SocialScreen";
import UserProfileScreen from "../screens/profiles/UserProfileScreen";
import UserPreferencesScreen from "../screens/profiles/UserPreferencesScreen";
import SettingsScreen from "../screens/profiles/SettingsScreen";
import ThreeDScreen from "../screens/3DScreen";
import ClosetScreen from "../screens/ClosetScreen";
import RecommendationScreen from "../screens/RecommendationScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import OnboardingBrandsScreen from "../screens/OnboardingBrandsScreen";
import OnboardingSizingScreen from "../screens/OnboardingSizingScreen";
import OnboardingReview from "../screens/OnboardingReview";
import HomeScreen from "../screens/HomeScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import UserDetailScreen from "../screens/UserDetailScreen";
import SearchScreen from "../screens/SearchScreen";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import SignInScreen from "../screens/auth/SignInScreen";
import SignUpScreen from "../screens/auth/SignUpScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import SuccessOptionsSheet from "../components/common/SuccessOptionsSheet";
import AnimatedSplashScreen from "../components/common/AnimatedSplashScreen";
import { RootStackParamList, MainTabParamList } from "../types/NavigationTypes";
import { useTheme } from "../styles/theme/ThemeContext";
import { appStateManager } from "../utils/appStateManager";
import { OnboardingProvider } from "../context/OnboardingContext";
import { auth } from "../Config/firebaseconfig";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../Config/firebaseconfig";
import FeedNavigator from "./feedNavigator/FeedNavigator";

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;
// Add global clearTimeout type
declare const clearTimeout: (id: number) => void;

// Create both stack and tab navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// IMPORTANT - App State Constants
enum AppState {
  SPLASH = 'splash',            // Initial splash screen
  AUTH_CHECK = 'auth_check',    // Checking authentication
  WELCOME = 'welcome',          // Welcome screen for non-authenticated users
  MAIN_APP = 'main_app',        // Main app for authenticated users
  ONBOARDING = 'onboarding'     // Onboarding flow 
}

enum OptionsSheetState {
  HIDDEN = 'hidden',            // Options sheet is not showing
  SHOWING = 'showing',          // Options sheet is currently visible
  DISMISSED = 'dismissed'       // Options sheet was shown and dismissed
}

// Main tab navigator for the app's primary screens
const MainTabNavigator = () => {
  const { isDarkMode } = useTheme();
  
  // Define colors based on theme
  const activeColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const inactiveColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
          borderTopColor: isDarkMode ? '#38383A' : '#F2F2F7',
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0.1,
          shadowColor: isDarkMode ? '#7C6BFF' : '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 8,
          height: 85, // Taller to accommodate iPhone home indicator
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarShowLabel: true,
        tabBarLabelStyle: { 
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 5,
        }
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={FeedNavigator} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? "home" : "home-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color} 
              />
            ) : null;
          },
        }}
      />
      <Tab.Screen 
        name="SocialTab" 
        component={SocialScreen} 
        options={{
          tabBarLabel: 'Social',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? "people" : "people-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color} 
              />
            ) : null;
          },
        }}
      />
      <Tab.Screen 
        name="DiscoverTab" 
        component={RecommendationScreen} 
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? "search" : "search-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color} 
              />
            ) : null;
          },
        }}
      />
      <Tab.Screen 
        name="3DTab" 
        component={ThreeDScreen} 
        options={{
          tabBarLabel: '3D',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? "cube" : "cube-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color}
                style={isDarkMode && focused ? {
                  textShadowColor: 'rgba(124, 107, 255, 0.8)',
                  textShadowOffset: {width: 0, height: 0},
                  textShadowRadius: 8
                } : {}}
              />
            ) : null;
          },
        }}
      />
      <Tab.Screen 
        name="ClosetTab" 
        component={ClosetScreen} 
        options={{
          tabBarLabel: 'Closet',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = "shirt-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color}
                style={focused ? { transform: [{ scale: 1.1 }] } : {}} 
              />
            ) : null;
          },
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={UserProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => {
            const iconName = focused ? "person" : "person-outline";
            return iconName ? (
              <Icon 
                name={iconName} 
                size={size} 
                color={color} 
              />
            ) : null;
          },
        }}
      />
    </Tab.Navigator>
  );
};

// Options sheet overlay that appears on top of any screens
const OptionsSheetOverlay = ({ onNavigateToOnboarding, onDismiss }: { onNavigateToOnboarding: () => void, onDismiss: () => void }) => {
  const [firstName, setFirstName] = useState<string>('');
  const [showSheet, setShowSheet] = useState<boolean>(true);
  const [navigatingToOnboarding, setNavigatingToOnboarding] = useState<boolean>(false);
  
  // Animation values for background scaling
  const backgroundScale = useRef(new Animated.Value(1)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  
  // Track sheet drag progress
  const [sheetDragProgress, setSheetDragProgress] = useState(0);
  
  // Fetch user's first name when component mounts
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        // Try to get name from AsyncStorage first (faster)
        let storedName = await AsyncStorage.getItem('userFirstName');
        
        // If no name in storage, try to get from Firestore
        const currentUser = auth().currentUser;
        if (!storedName && currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().firstName) {
            const firstName = userDoc.data().firstName;
            if (typeof firstName === 'string') {
              storedName = firstName;
              // Save to AsyncStorage for future use
              await AsyncStorage.setItem('userFirstName', firstName);
            }
          }
        }
        
        if (storedName) {
          setFirstName(storedName);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }
    };
    
    fetchUserName();
    
    // Animate the background when first shown - smoother animation with sequence
    Animated.sequence([
      // First fade in the background overlay
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Then scale down the content with a nice spring effect
      Animated.spring(backgroundScale, {
        toValue: 0.95,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Update the backgroundScale value calculation based on sheetDragProgress
  useEffect(() => {
    // Calculate scale value that gradually restores from 0.95 to 1 as sheet is dragged
    const targetScale = 0.95 + (0.05 * sheetDragProgress);
    
    // Animate to the target scale
    Animated.spring(backgroundScale, {
      toValue: targetScale,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, [sheetDragProgress]);
  
  const handleCompleteOnboarding = () => {
    console.log("User selected 'Complete Onboarding' from options sheet");
    
    // Prevent multiple clicks or other interactions
    setNavigatingToOnboarding(true);
    
    // Mark that the sheet has been shown for this session
    AsyncStorage.setItem('optionsSheetLastShown', Date.now().toString())
      .then(() => console.log("OptionsSheetOverlay: Marked options sheet as shown for this session"))
      .catch(err => console.error("OptionsSheetOverlay: Failed to mark options sheet as shown:", err));
    
    // Hide the options sheet with animation
    setShowSheet(false);
    
    // CRITICAL: Trigger navigation BEFORE animations
    // This way navigation starts while sheet is still visible
    onNavigateToOnboarding();
    
    // Then animate the background scaling back to normal
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(backgroundScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      // First notify parent that sheet is dismissed
      onDismiss();
      
      // Reset navigation state after everything is complete
      setNavigatingToOnboarding(false);
    });
  };
  
  const handleProceedToHome = () => {
    console.log("User selected 'Go Home' from options sheet");
    
    // Mark that the sheet has been shown for this session
    AsyncStorage.setItem('optionsSheetLastShown', Date.now().toString())
      .then(() => console.log("OptionsSheetOverlay: Marked options sheet as shown for this session"))
      .catch(err => console.error("OptionsSheetOverlay: Failed to mark options sheet as shown:", err));
    
    // Hide the options sheet with animation
    setShowSheet(false);
    
    // Animate the background scaling back to normal
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(backgroundScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Notify parent sheet is dismissed - just stay on main app
      onDismiss();
    });
  };
  
  const handleDismissSheet = () => {
    console.log("User dismissed options sheet");
    
    // Mark that the sheet has been shown for this session
    AsyncStorage.setItem('optionsSheetLastShown', Date.now().toString())
      .then(() => console.log("OptionsSheetOverlay: Marked options sheet as shown for this session"))
      .catch(err => console.error("OptionsSheetOverlay: Failed to mark options sheet as shown:", err));
    
    // Hide the options sheet with animation
    setShowSheet(false);
    
    // Animate the background scaling back to normal
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(backgroundScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Notify parent sheet is dismissed
      onDismiss();
    });
  };
  
  // Progress handler for sheet drag
  const handleSheetDragProgress = (progress: number) => {
    setSheetDragProgress(progress);
  };
  
  const isDarkMode = () => {
    const { theme } = useTheme();
    // Check if background color is dark (assuming dark themes have dark backgrounds)
    return theme.background.toLowerCase() === '#000000' || 
           theme.background.toLowerCase() === '#121212' || 
           theme.background.startsWith('#0') ||
           theme.background.startsWith('#1');
  };
  
  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: backgroundOpacity,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [
            { scale: backgroundScale },
            { translateY: backgroundScale.interpolate({
                inputRange: [0.95, 1],
                outputRange: [-12, 0]
              })
            }
          ],
          borderRadius: 25 * (1 - sheetDragProgress * 0.8),
          borderWidth: 1 * (1 - sheetDragProgress * 0.9), 
          borderColor: isDarkMode()
            ? `rgba(255, 255, 255, ${0.12 * (1 - sheetDragProgress)})` 
            : `rgba(0, 0, 0, ${0.12 * (1 - sheetDragProgress)})`,
          shadowColor: isDarkMode() ? '#000' : '#888',
          shadowOffset: { width: 0, height: 8 * (1 - sheetDragProgress) },
          shadowOpacity: 0.35 * (1 - sheetDragProgress),
          shadowRadius: 20 * (1 - sheetDragProgress),
          overflow: 'hidden',
        }}
      >
        {/* This is a placeholder view that will be rendered behind the success options sheet */}
      </Animated.View>
      
      <SuccessOptionsSheet
        visible={showSheet}
        onDismiss={handleDismissSheet}
        onCompleteOnboarding={handleCompleteOnboarding}
        onProceedToHome={handleProceedToHome}
        onDragProgress={handleSheetDragProgress}
        isSignIn={true}
        firstName={firstName}
      />
    </Animated.View>
  );
};

// Separate component for onboarding navigation with proper context
const OnboardingNavigator = () => {
  return (
    <OnboardingProvider>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'none', // Use animation:none instead of animationEnabled:false
          gestureEnabled: false // Disable gestures to improve direct navigation
        }}
      >
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
        />
        <Stack.Screen 
          name="OnboardingBrands" 
          component={OnboardingBrandsScreen} 
        />
        <Stack.Screen 
          name="OnboardingSizing" 
          component={OnboardingSizingScreen} 
        />
        <Stack.Screen 
          name="OnboardingOverview" 
          component={OnboardingReview}
          options={{ animation: 'slide_from_right' }} // Keep animation for final step
        />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
};

// AppNavigator component - single source of navigation truth for the app
const AppNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();
  
  // Core state tracking
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [optionsSheetState, setOptionsSheetState] = useState<OptionsSheetState>(OptionsSheetState.HIDDEN);
  
  // Auth and onboarding state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  
  // Track splash screen completion
  const [splashCompleted, setSplashCompleted] = useState(false);
  
  // Track initialization completion
  const [initializationCompleted, setInitializationCompleted] = useState(false);
  
  // Function to navigate to onboarding - only called from options sheet
  const navigateToOnboarding = async () => {
    console.log("AppNavigator: User selected 'Complete Onboarding' from options sheet");
    
    // CRITICAL: Load target screen immediately while the sheet is still visible
    try {
      // Determine the first incomplete step to navigate to directly
      const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
      const completedSteps = completedStepsStr ? JSON.parse(completedStepsStr) : [];
      
      // Determine incomplete steps
      const allSteps = [1, 2, 3, 4];
      const incompleteSteps = allSteps.filter(step => !completedSteps.includes(step));
      
      console.log('AppNavigator: Quick check for incomplete steps:', incompleteSteps);
      
      // Store current route for later return
      const currentRouteName = navigationRef.current?.getCurrentRoute()?.name || 'MainTabs';
      await AsyncStorage.setItem('onboardingReturnTo', currentRouteName);
      console.log(`AppNavigator: Saved return route: ${currentRouteName}`);
      
      // Update app state
      appStateManager.setOnboarding(true);
      setIsOnboarding(true);
      
      // If there are incomplete steps, navigate to the first one immediately
      if (incompleteSteps.length > 0) {
        const firstIncompleteStep = Math.min(...incompleteSteps);
        let targetScreen;
        
        // Determine target screen
        switch (firstIncompleteStep) {
          case 1: targetScreen = 'Onboarding'; break;
          case 2: targetScreen = 'OnboardingBrands'; break;
          case 3: targetScreen = 'OnboardingSizing'; break;
          case 4: targetScreen = 'OnboardingOverview'; break;
          default: targetScreen = 'Onboarding';
        }
        
        console.log(`AppNavigator: PRE-LOADING direct navigation to ${targetScreen} (step ${firstIncompleteStep}) while sheet is still visible`);
        
        // Navigate immediately with directNavigation flag
        if (navigationRef.current) {
          // Use a nested stack of setTimeout with 0 delay to ensure navigation happens 
          // in a separate render cycle but as fast as possible
          setTimeout(() => {
            (navigationRef.current as any).navigate('OnboardingFlow', {
              screen: targetScreen,
              params: { directNavigation: true }
            });
          }, 0);
        }
      } else {
        // If all steps are completed, go to review
        console.log('AppNavigator: PRE-LOADING navigation to review screen while sheet is still visible');
        if (navigationRef.current) {
          setTimeout(() => {
            (navigationRef.current as any).navigate('OnboardingFlow');
          }, 0);
        }
      }
    } catch (error) {
      console.error('AppNavigator: Error during pre-loading navigation:', error);
      // Fall back to normal navigation on error
      if (navigationRef.current) {
        (navigationRef.current as any).navigate('OnboardingFlow');
      }
    }
  };
  
  // Function to handle options sheet dismiss
  const handleOptionsSheetDismiss = () => {
    console.log("AppNavigator: Options sheet dismissed");
    
    // Update app state and local state
    appStateManager.setShowOnboardingOptions(false);
    setOptionsSheetState(OptionsSheetState.DISMISSED);
    
    // Set onboarding to false - user chose to stay in main app
    appStateManager.setOnboarding(false);
  };
  
  // Add this function to the AppNavigator component
  // This will be our single source of truth for auth state changes
  const handleAuthStateChange = (isAuthenticated: boolean) => {
    console.log(`AppNavigator: handleAuthStateChange called with isAuthenticated=${isAuthenticated}`);
    
    // Update local state
    setIsAuthenticated(isAuthenticated);
    
    // CRITICAL: Immediately navigate to Welcome screen when user is logged out
    if (!isAuthenticated && navigationRef.current) {
      console.log('AppNavigator: Auth state is false, FORCING navigation to Welcome screen');
      
      // Use setTimeout to ensure this happens after current execution context
      setTimeout(() => {
        try {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
          console.log('AppNavigator: Successfully navigated to Welcome screen');
        } catch (error) {
          console.error('AppNavigator: Error navigating to Welcome:', error);
        }
      }, 100);
    }
  };
  
  // Initialization effect - runs once on mount
  useEffect(() => {
    // Start with splash screen
    setAppState(AppState.SPLASH);
    
    const initialize = async () => {
      console.log("AppNavigator: Starting initialization during splash screen...");
      
      try {
        // Clear the options sheet shown flag on each app launch
        await AsyncStorage.removeItem('optionsSheetLastShown');
        
        // Check if there's a current user in Firebase
        const currentUser = auth().currentUser;
        
        if (currentUser) {
          console.log(`AppNavigator: Firebase reports user is signed in: ${currentUser.uid}`);
          
          // User is authenticated - force check onboarding status
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const onboardingCompleted = userDoc.exists() && userDoc.data().onboardingCompleted === true;
            const onboardingStarted = userDoc.exists() && userDoc.data().onboardingStarted === true;
            const onboardingSkipped = userDoc.exists() && userDoc.data().onboardingSkipped === true;
            
            console.log(`AppNavigator: Onboarding - completed:${onboardingCompleted}, started:${onboardingStarted}, skipped:${onboardingSkipped}`);
            
            // Set the authenticated and onboarding state
            setIsAuthenticated(true);
            setIsOnboarding(!onboardingCompleted);
            
            // Update app state manager
            appStateManager.setAuthenticated(true);
            appStateManager.setOnboarding(!onboardingCompleted);
            
            // Note: We'll decide whether to show options sheet after splash screen completes
          } catch (error) {
            console.error('AppNavigator: Error checking onboarding status:', error);
            
            // Default to authenticated without onboarding on error
            setIsAuthenticated(true);
            setIsOnboarding(false);
            appStateManager.setAuthenticated(true);
            appStateManager.setOnboarding(false);
          }
        } else {
          console.log("AppNavigator: No user is signed in");
          
          // No user, so not authenticated
          setIsAuthenticated(false);
          setIsOnboarding(false);
          appStateManager.setAuthenticated(false);
          appStateManager.setOnboarding(false);
        }
        
        // Also initialize appStateManager (for subscriptions, etc.)
        await appStateManager.initialize();
        
        // Mark initialization as complete
        setInitializationCompleted(true);
        console.log("AppNavigator: Initialization completed during splash screen");
        
      } catch (error) {
        console.error('AppNavigator: Error during initialization:', error);
        
        // Default to not authenticated on error
        setIsAuthenticated(false);
        setIsOnboarding(false);
        appStateManager.setAuthenticated(false);
        appStateManager.setOnboarding(false);
        
        // Mark initialization as complete despite error
        setInitializationCompleted(true);
      }
    };
    
    // Start initialization during splash screen
    initialize();
    
    // Simulate splash screen duration - must be at least 3 seconds
    // This ensures the splash screen animation completes
    const splashTimer = setTimeout(() => {
      console.log("AppNavigator: Splash screen duration completed");
      setSplashCompleted(true);
    }, 3500); // 3.5 seconds to ensure animation completes
    
    return () => clearTimeout(splashTimer);
  }, []);
  
  // Effect to handle state transitions after both splash and initialization complete
  useEffect(() => {
    // Only proceed when both splash screen and initialization are done
    if (splashCompleted && initializationCompleted) {
      console.log("AppNavigator: Both splash screen and initialization are complete");
      console.log(`AppNavigator: Final auth state - isAuthenticated=${isAuthenticated}, isOnboarding=${isOnboarding}`);
      
      if (isAuthenticated) {
        // User is authenticated, set app state to main app
        setAppState(AppState.MAIN_APP);
        
        // Check if there are incomplete onboarding steps that need to be completed
        if (isOnboarding) {
          const checkOnboardingStatus = async () => {
            try {
              // FIRST check if we should show the options sheet before doing anything else
              const optionsSheetLastShown = await AsyncStorage.getItem('optionsSheetLastShown');
              if (!optionsSheetLastShown) {
                console.log('AppNavigator: Showing options sheet for onboarding - this must happen before any navigation');
                setTimeout(() => {
                  setOptionsSheetState(OptionsSheetState.SHOWING);
                  appStateManager.setShowOnboardingOptions(true);
                }, 300);
                return; // Exit function - don't navigate to steps yet until the user makes a choice
              }
              
              // If options sheet has already been shown, proceed with normal onboarding step navigation
              console.log('AppNavigator: Options sheet already shown, continuing with step navigation');
              
              // Get onboarding status from AsyncStorage
              const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
              
              // IMPORTANT: Do NOT consider skipped steps when determining the first step to navigate to
              // We only care about what steps are actually completed, not what was skipped in a previous session
              
              // Parse completed steps
              const completedSteps = completedStepsStr ? JSON.parse(completedStepsStr) : [];
              
              // Clear any session-skipped steps on app initialization
              await AsyncStorage.removeItem('sessionSkippedSteps');
              
              // For DEBUG purposes only - still fetch the skipped steps to log them
              const skippedStepsStr = await AsyncStorage.getItem('onboardingSkippedSteps');
              const skippedSteps = skippedStepsStr ? JSON.parse(skippedStepsStr) : [];
              
              // Determine which steps are incomplete (not completed)
              // Ignore skipped steps for this determination
              const allSteps = [1, 2, 3, 4]; // All possible steps
              const incompleteSteps = allSteps.filter(
                step => !completedSteps.includes(step)
              );
              
              console.log('AppNavigator: Completed steps:', completedSteps);
              console.log('AppNavigator: Skipped steps (ignored for navigation):', skippedSteps);
              console.log('AppNavigator: Incomplete steps:', incompleteSteps);
              
              // If there are incomplete steps, navigate to the first one
              if (incompleteSteps.length > 0) {
                const firstIncompleteStep = Math.min(...incompleteSteps);
                console.log(`AppNavigator: Navigating to first incomplete step: ${firstIncompleteStep}`);
                
                // Give time for the main app to initialize
                setTimeout(() => {
                  // Determine which screen to navigate to
                  let targetScreen;
                  switch (firstIncompleteStep) {
                    case 1:
                      targetScreen = 'Onboarding';
                      break;
                    case 2:
                      targetScreen = 'OnboardingBrands';
                      break;
                    case 3:
                      targetScreen = 'OnboardingSizing';
                      break;
                    case 4:
                      targetScreen = 'OnboardingFlow'; // This will show the review screen
                      break;
                    default:
                      targetScreen = 'Onboarding';
                  }
                  
                  // For the review step, navigate to the full flow
                  if (firstIncompleteStep === 4) {
                    if (navigationRef.current) {
                      (navigationRef.current as any).navigate('OnboardingFlow');
                    }
                  } else {
                    // For other steps, navigate to that specific screen within the flow
                    if (navigationRef.current) {
                      console.log(`AppNavigator: Directly navigating to ${targetScreen} (step ${firstIncompleteStep})`);
                      // First, reset the OnboardingFlow navigator state to avoid any unwanted transitions
                      // Then navigate directly to the target screen to avoid showing other screens first
                      (navigationRef.current as any).navigate('OnboardingFlow', {
                        screen: targetScreen,
                        params: { directNavigation: true }
                      });
                    }
                  }
                }, 300);
                
                return; // Exit function after navigation
              }
              
              // If all steps are either completed or skipped but onboarding is not marked as complete,
              // show the review screen
              if (completedSteps.length < 4 && !completedSteps.includes(4)) {
                console.log('AppNavigator: Steps are incomplete, navigating to review screen');
                
                setTimeout(() => {
                  if (navigationRef.current) {
                    (navigationRef.current as any).navigate('OnboardingFlow');
                  }
                }, 300);
                
                return; // Skip showing options sheet
              }
              
            } catch (error) {
              console.error('AppNavigator: Error checking onboarding status:', error);
              
              // On error, default to showing options sheet
              AsyncStorage.getItem('optionsSheetLastShown')
                .then(lastShown => {
                  if (!lastShown) {
                    setTimeout(() => {
                      setOptionsSheetState(OptionsSheetState.SHOWING);
                      appStateManager.setShowOnboardingOptions(true);
                    }, 300);
                  }
                })
                .catch(err => console.error('AppNavigator: Error checking options sheet status:', err));
            }
          };
          
          // Run the async function
          checkOnboardingStatus();
        }
      } else {
        // User is not authenticated, go to welcome screen
        setAppState(AppState.WELCOME);
      }
    }
  }, [splashCompleted, initializationCompleted, isAuthenticated, isOnboarding]);
  
  // Update the subscribeToAuthState call to use our handler
  useEffect(() => {
    const unsubscribeAuth = appStateManager.subscribeToAuthState(handleAuthStateChange);
    
    // Keep other subscriptions as they were
    const unsubscribeOnboarding = appStateManager.subscribeToOnboardingState((isOnboard) => {
      console.log('AppNavigator: Onboarding state changed ->', isOnboard);
      setIsOnboarding(isOnboard);
    });
    
    const unsubscribeOptionsSheet = appStateManager.subscribeToOptionsSheetState((showSheet) => {
      console.log('AppNavigator: Options sheet state changed ->', showSheet);
      if (showSheet) {
        setOptionsSheetState(OptionsSheetState.SHOWING);
      } else {
        // Only change to HIDDEN if currently SHOWING to avoid overriding DISMISSED
        if (optionsSheetState === OptionsSheetState.SHOWING) {
          setOptionsSheetState(OptionsSheetState.HIDDEN);
        }
      }
    });

    return () => {
      console.log('AppNavigator: Cleaning up auth state listeners');
      unsubscribeAuth();
      unsubscribeOnboarding();
      unsubscribeOptionsSheet();
    };
  }, [optionsSheetState]);
  
  // Render splash screen during initialization
  if (appState === AppState.SPLASH) {
    return <AnimatedSplashScreen />;
  }
  
  // Render welcome screen for non-authenticated users
  if (appState === AppState.WELCOME) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen as React.ComponentType<any>} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
  
  // Render main app for authenticated users
  if (appState === AppState.MAIN_APP) {
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen 
            name="UserPreferencesScreen" 
            component={UserPreferencesScreen} 
            options={{ headerShown: true, title: "User Preferences" }} 
          />
          <Stack.Screen 
            name="SettingsScreen" 
            component={SettingsScreen}
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="CreatePostScreen" 
            component={CreatePostScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="UserDetailScreen" 
            component={UserDetailScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SearchScreen" 
            component={SearchScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/* Only add OnboardingFlow as a screen that can be navigated to, never as the initial screen */}
          <Stack.Screen 
            name="OnboardingFlow" 
            component={OnboardingNavigator} 
            options={{ 
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }}
          />
        </Stack.Navigator>
        
        {/* Overlay the options sheet when needed */}
        {optionsSheetState === OptionsSheetState.SHOWING && (
          <OptionsSheetOverlay 
            onNavigateToOnboarding={navigateToOnboarding} 
            onDismiss={handleOptionsSheetDismiss}
          />
        )}
      </NavigationContainer>
    );
  }
  
  // Default fallback
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
};

export default AppNavigator;
