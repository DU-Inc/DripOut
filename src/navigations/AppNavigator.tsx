import React, { useState, useEffect, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthNavigator from "./AuthNavigator";
import OverviewScreen from "../screens/OverviewScreen"; // Replace HomeScreen with OverviewScreen
import SocialScreen from "../screens/SocialScreen"; // Import SocialScreen (renamed from HomeScreen)
import UserProfileScreen from "../screens/profiles/UserProfileScreen";
import UserPreferencesScreen from "../screens/profiles/UserPreferencesScreen";
import SettingsScreen from "../screens/profiles/SettingsScreen"; // Import Settings screen
import ThreeDScreen from "../screens/3DScreen"; // Import 3D screen
import ClosetScreen from "../screens/ClosetScreen"; // Import ClosetScreen
import RecommendationScreen from "../screens/RecommendationScreen"; // Import RecommendationScreen
import OnboardingScreen from "../screens/OnboardingScreen"; // Import Onboarding screen
import OnboardingBrandsScreen from "../screens/OnboardingBrandsScreen"; // Import Onboarding Brands screen
import OnboardingSizingScreen from "../screens/OnboardingSizingScreen"; // Import Onboarding Sizing screen
import HomeScreen from "../screens/HomeScreen";
import CreatePostScreen from "../screens/CreatePostScreen"; // Import CreatePostScreen
import { RootStackParamList, MainTabParamList } from "../types/NavigationTypes"; // Centralized types for navigation
import { useTheme } from "../styles/themeprovider";
import { auth } from "../Config/firebaseconfig";
import { onAuthStateChanged, User, getAuth } from 'firebase/auth'; // Import getAuth
import { getUserPreferences } from "../services/firestoreService";
import { OnboardingProvider } from "../context/OnboardingContext";
import { appStateManager } from "../utils/appStateManager";

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;

// Create both stack and tab navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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
        component={OverviewScreen} 
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

// Separate component for onboarding navigation with proper context
const OnboardingNavigator = () => {
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="OnboardingBrands" component={OnboardingBrandsScreen} />
        <Stack.Screen name="OnboardingSizing" component={OnboardingSizingScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
};

// AppNavigator component that integrates RootNavigator logic and AuthNavigator
const AppNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();
  const [isLoading, setIsLoading] = useState(true);
  // Initialize isAuthenticated based on Firebase Auth state eventually
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(() => appStateManager.isOnboarding());
  const [isSignupSuccess, setIsSignupSuccess] = useState(() => appStateManager.isSignupInProgress());
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // Initialize appStateManager on first render and set up Firebase listener
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const initializeApp = async () => {
      try {
        console.log('AppNavigator: Initializing app state...');
        
        // Try to restore session from AsyncStorage first (for faster startup)
        const storedToken = await AsyncStorage.getItem('firebaseUserToken');
        const lastActivityStr = await AsyncStorage.getItem('lastActivityTimestamp');
        
        if (storedToken && lastActivityStr) {
          const lastActivity = parseInt(lastActivityStr, 10);
          const now = Date.now();
          const elapsedTime = now - lastActivity;
          const maxSessionTime = 10 * 60 * 60 * 1000; // 10 hours
          
          if (elapsedTime < maxSessionTime) {
            console.log(`AppNavigator: Found recent auth session (${elapsedTime / (60 * 1000)} minutes old), attempting to use it`);
            // We have a recently active session, try to use it
            setIsAuthenticated(true); // Pre-set authentication for faster UI response
            
            // After Firebase initializes, refresh the token to ensure it's still valid
            // This will run in the background and update the stored token if needed
            setTimeout(() => {
              const currentUser = auth().currentUser;
              if (currentUser) {
                currentUser.getIdToken(true) // Force token refresh
                  .then(freshToken => {
                    // Update both the token and timestamp
                    Promise.all([
                      AsyncStorage.setItem('firebaseUserToken', freshToken),
                      AsyncStorage.setItem('lastActivityTimestamp', Date.now().toString())
                    ]).then(() => {
                      console.log('AppNavigator: Successfully refreshed token for restored session');
                    });
                  })
                  .catch(error => {
                    console.warn('AppNavigator: Failed to refresh token for restored session:', error);
                  });
              }
            }, 2000); // Short delay to let Firebase auth initialize first
          }
        }
        
        // Check app state manager for full state initialization
        await appStateManager.initialize();
        if (isMounted) {
          setIsOnboarding(appStateManager.isOnboarding());
          setIsSignupSuccess(appStateManager.isSignupInProgress());
          setShowOptionsSheet(appStateManager.shouldShowOnboardingOptions());
          console.log(`AppNavigator: Initial state from AppStateManager - Onboarding=${appStateManager.isOnboarding()}, SignupSuccess=${appStateManager.isSignupInProgress()}, ShowOptions=${appStateManager.shouldShowOnboardingOptions()}`);
        }
      } catch (error) {
        console.error('AppNavigator: Error initializing AppStateManager:', error);
        if (isMounted) {
           // Default states on error
           setIsOnboarding(false);
           setIsSignupSuccess(false);
           setShowOptionsSheet(false);
        }
      }
    };

    initializeApp();

    // Firebase auth state listener with persistence enhancement
    const unsubscribeFirebase = onAuthStateChanged(getAuth(), (user: User | null) => {
      console.log('AppNavigator: Firebase Auth state changed ->', user ? `User(${user.uid})` : 'No User');
      if (isMounted) {
        const newAuthState = !!user;
        setIsAuthenticated(newAuthState);

        // Sync AppStateManager with Firebase state
        if (appStateManager.isAuthenticated() !== newAuthState) {
           appStateManager.setAuthenticated(newAuthState);
        }

        // If user is logged in, update the token and timestamp
        if (user) {
          // Get fresh token and store it for future app launches (10-hour session)
          user.getIdToken(false).then(token => {
            const now = Date.now();
            Promise.all([
              AsyncStorage.setItem('firebaseUserToken', token),
              AsyncStorage.setItem('lastActivityTimestamp', now.toString())
            ]).then(() => {
              console.log('AppNavigator: Updated auth token and timestamp for 10-hour session persistence');
            });
          }).catch(err => {
            console.error('AppNavigator: Failed to get/store token:', err);
          });
        } else {
          // Reset onboarding/options sheet if user logs out
          setIsOnboarding(false);
          setShowOptionsSheet(false);
          appStateManager.setOnboarding(false); // Also update manager state
          appStateManager.setShowOnboardingOptions(false);
          
          // Clear stored authentication data
          Promise.all([
            AsyncStorage.removeItem('firebaseUserToken'),
            AsyncStorage.removeItem('lastActivityTimestamp')
          ]).catch(err => {
            console.error('AppNavigator: Failed to clear auth data:', err);
          });
        }

        // Only stop loading once we have a definitive auth state from Firebase
        if (isLoading) {
          // Use a small delay after getting the first Firebase state
          setTimeout(() => {
            if (isMounted) setIsLoading(false);
          }, 150); // Slightly shorter delay as Firebase is the source of truth
        }
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      console.log('AppNavigator: Cleaning up Firebase Auth listener');
      unsubscribeFirebase();
    };
  }, []); // Run only once on mount

  // Subscribe to all app state changes (Auth, Onboarding, Signup, Options Sheet)
  useEffect(() => {
    let isMounted = true;
    
    // Subscribe to authentication state changes
    const unsubscribeAuth = appStateManager.subscribeToAuthState((isAuth) => {
      if (isMounted) {
        console.log('AppNavigator: Authentication state changed (manager) ->', isAuth);
        // Force a complete re-render by using setTimeout
        setTimeout(() => {
          if (isMounted) {
            console.log('AppNavigator: Setting authenticated state to', isAuth);
            
            // CRITICAL: Specifically handle auth changing to true when already mounted
            if (isAuth && !isAuthenticated) {
              console.log('🧨 CRITICAL AUTH CHANGE: Becoming authenticated while navigator already mounted');
              
              // Force a complete navigator reset in case we're stuck in a screen
              // We'll first set the state
              setIsAuthenticated(isAuth);
              
              // Then force the UI to update 
              setTimeout(() => {
                if (isMounted) {
                  console.log('🧨 FORCING RESET on authentication state change');
                  // Force the component to re-render completely from scratch
                  setIsLoading(true);
                  setTimeout(() => {
                    if (isMounted) {
                      setIsLoading(false);
                    }
                  }, 50);
                }
              }, 100);
            } else {
              // Normal state update for other cases
              setIsAuthenticated(isAuth);
            }
          }
        }, 100);
      }
    });

    // Subscribe to onboarding state changes
    const unsubscribeOnboarding = appStateManager.subscribeToOnboardingState((isOnboard) => {
      if (isMounted) {
        console.log('AppNavigator: Onboarding state changed (manager) ->', isOnboard);
        // Only update onboarding if we don't need to show options
        if (!appStateManager.shouldShowOnboardingOptions()) {
          setIsOnboarding(isOnboard);
        }
      }
    });

    // Subscribe to signup success state changes
    const unsubscribeSignupSuccess = appStateManager.subscribeToSignupProgress((isSuccess) => {
       if (isMounted) {
         console.log('AppNavigator: Signup success state changed (manager) ->', isSuccess);
         setIsSignupSuccess(isSuccess);
       }
    });

    // Subscribe to options sheet state changes
    const unsubscribeOptionsSheet = appStateManager.subscribeToOptionsSheetState((showSheet: boolean) => {
      if (isMounted) {
        console.log('AppNavigator: Options sheet state changed (manager) ->', showSheet);
        setShowOptionsSheet(showSheet);

        // If showing options sheet, don't show onboarding yet
        if (showSheet) {
          setIsOnboarding(false);
        }
      }
    });

    // Cleanup function to unsubscribe from all listeners
    return () => {
      isMounted = false;
      console.log('AppNavigator: Cleaning up all state listeners');
      unsubscribeAuth();
      unsubscribeOnboarding();
      unsubscribeSignupSuccess();
      unsubscribeOptionsSheet();
    };
  }, []); // Run only once on mount

  // Determine what screens to show
  console.log(`AppNavigator: Current state - Auth=${isAuthenticated}, Onboarding=${isOnboarding}, ShowOptions=${showOptionsSheet}, SignupSuccess=${isSignupSuccess}`);
  
  // Calculate rendering flags
  const shouldShowAuth = isAuthenticated === false;
  // Only show onboarding if authenticated, needs onboarding, and not showing options sheet
  const shouldShowOnboarding = isAuthenticated === true && isOnboarding && !showOptionsSheet;
  // Show auth navigator (with SignIn screen) if showing options sheet
  const shouldShowAuthForOptions = isAuthenticated === true && showOptionsSheet;
  const shouldShowMainApp = isAuthenticated === true && !isOnboarding && !showOptionsSheet;
  
  console.log('🔑 AUTH DECISION: isAuthenticated:', isAuthenticated, 'isOnboarding:', isOnboarding, 'showOptionsSheet:', showOptionsSheet);
  console.log('🔑 RENDER DECISION: Auth:', shouldShowAuth, 'Onboarding:', shouldShowOnboarding, 'MainApp:', shouldShowMainApp);
  
  console.log(`AppNavigator: Decision flags - ShowAuth=${shouldShowAuth}, ShowOnboarding=${shouldShowOnboarding}, ShowOptions=${shouldShowAuthForOptions}, ShowMainApp=${shouldShowMainApp}`);

  // Display loading indicator until Firebase auth state is confirmed
  if (isLoading || isAuthenticated === null) { // Check for null initial state too
    console.log('⏳ LOADING STATE - Waiting for auth state to be determined');
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  console.log(`AppNavigator: Rendering state - Auth=${shouldShowAuth}, Onboarding=${shouldShowOnboarding}, MainApp=${shouldShowMainApp}, AuthForOptions=${shouldShowAuthForOptions}`);

  // Layered rendering approach
  if (shouldShowAuth || shouldShowAuthForOptions) {
    // Auth flow - Use AuthNavigator for user not authenticated or for options sheet
    console.log('🔒 RENDERING AUTH UI - AuthNavigator will be shown');
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  } else if (shouldShowOnboarding) {
    // Onboarding flow - Use OnboardingNavigator component that has the OnboardingProvider
    return (
      <NavigationContainer ref={navigationRef}>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  } else {
    // Main app flow - Use tab navigator for returning authenticated users
    console.log('🔵 RENDERING MAIN APP UI - MainTabNavigator will be shown');
    // Ensure we're showing the tab navigator with ProfileTab
    return (
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabNavigator}
          />
          
          {/* Stack screens that can be pushed on top of tabs */}
          <Stack.Screen 
            name="UserPreferencesScreen" 
            component={UserPreferencesScreen} 
            options={{ title: "User Preferences", headerShown: true }} 
          />
          <Stack.Screen 
            name="SettingsScreen" 
            component={SettingsScreen} 
            options={{ headerShown: false }} 
          />
          
          {/* Social feature screens */}
          <Stack.Screen 
            name="CreatePostScreen" 
            component={CreatePostScreen} 
            options={{ headerShown: false }} 
          />
          
          {/* Add stack screen for auth in case we need to show auth screens */}
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
};

export default AppNavigator;
