import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';
import AuthScreen from "../screens/AuthScreen";
import OverviewScreen from "../screens/OverviewScreen"; // Replace HomeScreen with OverviewScreen
import SocialNavigator from "./SocialNavigator"; // Import the new SocialNavigator
import UserProfileScreen from "../screens/profiles/UserProfileScreen";
import UserPreferencesScreen from "../screens/profiles/UserPreferencesScreen";
import SettingsScreen from "../screens/profiles/SettingsScreen"; // Import Settings screen
import ThreeDScreen from "../screens/3DScreen"; // Import 3D screen
import ClosetScreen from "../screens/ClosetScreen"; // Import ClosetScreen
import RecommendationScreen from "../screens/RecommendationScreen"; // Import RecommendationScreen
import { useAuthSession } from "../hooks/useAuthSession";
import { RootStackParamList, MainTabParamList } from "../types/NavigationTypes"; // Centralized types for navigation
import { useTheme } from "../styles/themeprovider";

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
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "home" : "home-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="SocialTab" 
        component={SocialNavigator} 
        options={{
          tabBarLabel: 'Social',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "people" : "people-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="DiscoverTab" 
        component={RecommendationScreen} 
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "search" : "search-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="3DTab" 
        component={ThreeDScreen} 
        options={{
          tabBarLabel: '3D',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "cube" : "cube-outline"} 
              size={size} 
              color={color}
              style={isDarkMode && focused ? {
                textShadowColor: 'rgba(124, 107, 255, 0.8)',
                textShadowOffset: {width: 0, height: 0},
                textShadowRadius: 8
              } : {}}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="ClosetTab" 
        component={ClosetScreen} 
        options={{
          tabBarLabel: 'Closet',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name="shirt-outline" 
              size={size} 
              color={color}
              style={focused ? { transform: [{ scale: 1.1 }] } : {}} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={UserProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon 
              name={focused ? "person" : "person-outline"} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main navigator that handles authentication and loads the tab navigator when authenticated
const AppNavigator: React.FC = () => {
  const { initialRoute, loading } = useAuthSession();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {initialRoute === "Home" ? (
        <>
          {/* Main Tab Navigator as the primary interface */}
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          
          {/* Stack screens that can be pushed on top of tabs */}
          <Stack.Screen
            name="UserPreferencesScreen"
            component={UserPreferencesScreen}
            options={{ title: "User Preferences" }}
          />
          <Stack.Screen
            name="SettingsScreen"
            component={SettingsScreen}
            options={{ 
              headerShown: false // We handle our own header in the SettingsScreen component
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
