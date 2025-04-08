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
import { RootStackParamList, MainTabParamList } from "../types/NavigationTypes"; // Centralized types for navigation
import { useTheme } from "../styles/themeprovider";
import { auth } from "../config/firebaseconfig";
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => appStateManager.isAuthenticated());
  const [isOnboarding, setIsOnboarding] = useState(() => appStateManager.isOnboarding());
  const [isSignupSuccess, setIsSignupSuccess] = useState(() => appStateManager.isSignupInProgress());
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

  // Initialize appStateManager on first render
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AppNavigator: Initializing auth state...');
        
        // Check for biometric credentials before initializing
        // This helps to preload authentication data for faster sign-in experience
        const biometricIdentifier = await AsyncStorage.getItem('biometricAuthIdentifier');
        const biometricEnabled = await AsyncStorage.getItem('useBiometricAuth');
        
        if (biometricIdentifier && biometricEnabled === 'true') {
          console.log('AppNavigator: Biometric credentials found, initializing with priority');
        }
        
        // Initialize the appStateManager to check for existing auth tokens
        await appStateManager.initialize();
        
        // After initialization, get current states
        const authenticated = appStateManager.isAuthenticated();
        const onboarding = appStateManager.isOnboarding();
        const signupSuccess = appStateManager.isSignupInProgress();
        const showOptions = appStateManager.shouldShowOnboardingOptions();
        
        console.log(`AppNavigator: Initial auth state - Authenticated=${authenticated}, Onboarding=${onboarding}, SignupSuccess=${signupSuccess}, ShowOptions=${showOptions}`);
        
        setIsAuthenticated(authenticated);
        setIsOnboarding(onboarding && !showOptions); // Only set onboarding if we don't need to show options
        setIsSignupSuccess(signupSuccess);
        setShowOptionsSheet(showOptions);
      } catch (error) {
        console.error('AppNavigator: Error initializing auth state:', error);
        // Default to not authenticated on error
        setIsAuthenticated(false);
        setIsOnboarding(false);
        setIsSignupSuccess(false);
        setShowOptionsSheet(false);
      } finally {
        // Finish loading after a short delay to ensure smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      }
    };

    initializeAuth();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribeAuth = appStateManager.subscribeToAuthState((isAuth) => {
      console.log('AppNavigator: Authentication state changed ->', isAuth);
      setIsAuthenticated(isAuth);
    });
    
    // Subscribe to onboarding state changes
    const unsubscribeOnboarding = appStateManager.subscribeToOnboardingState((isOnboard) => {
      console.log('AppNavigator: Onboarding state changed ->', isOnboard);
      // Only update onboarding if we don't need to show options
      if (!appStateManager.shouldShowOnboardingOptions()) {
        setIsOnboarding(isOnboard);
      }
    });

    // Subscribe to signup success state changes
    const unsubscribeSignupSuccess = appStateManager.subscribeToSignupProgress((isSuccess) => {
      console.log('AppNavigator: Signup success state changed ->', isSuccess);
      setIsSignupSuccess(isSuccess);
    });
    
    // Subscribe to options sheet state changes
    const unsubscribeOptionsSheet = appStateManager.subscribeToOptionsSheetState((showSheet: boolean) => {
      console.log('AppNavigator: Options sheet state changed ->', showSheet);
      setShowOptionsSheet(showSheet);
      
      // If showing options sheet, don't show onboarding yet
      if (showSheet) {
        setIsOnboarding(false);
      }
    });

    // Cleanup function to unsubscribe from all listeners
    return () => {
      console.log('AppNavigator: Cleaning up auth state listeners');
      unsubscribeAuth();
      unsubscribeOnboarding();
      unsubscribeSignupSuccess();
      unsubscribeOptionsSheet();
    };
  }, []);

  // Determine what screens to show
  const shouldShowAuth = !isAuthenticated;
  // Only show onboarding if authenticated, needs onboarding, and not showing options sheet
  const shouldShowOnboarding = isAuthenticated && isOnboarding && !showOptionsSheet;
  // Show auth navigator (with SignIn screen) if showing options sheet
  const shouldShowAuthForOptions = isAuthenticated && showOptionsSheet;
  const shouldShowMainApp = isAuthenticated && !isOnboarding && !showOptionsSheet;

  // Display loading indicator during initialization
  if (isLoading) {
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
