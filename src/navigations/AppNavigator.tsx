import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import AuthScreen from "../screens/AuthScreen";
import HomeScreen from "../screens/HomeScreen";
import UserProfileScreen from "../screens/profiles/UserProfileScreen";
import UserPreferencesScreen from "../screens/profiles/UserPreferencesScreen";
import ThreeDScreen from "../screens/3DScreen"; // Import 3D screen
import ClosetScreen from "../screens/ClosetScreen"; // Import ClosetScreen
import RecommendationScreen from "../screens/RecommendationScreen"; // Import RecommendationScreen
import { useAuthSession } from "../hooks/useAuthSession";
import { RootStackParamList } from "../types/NavigationTypes"; // Centralized types for navigation

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="UserProfileScreen"
            component={UserProfileScreen}
            options={{ title: "User Profile" }}
          />
          <Stack.Screen
            name="UserPreferencesScreen"
            component={UserPreferencesScreen}
            options={{ title: "User Preferences" }}
          />
          {/* Add 3D Screen here */}
          <Stack.Screen
            name="ThreeDScreen"
            component={ThreeDScreen}
            options={{ title: "3D Customization" }}
          />
          <Stack.Screen
            name="ClosetScreen"
            component={ClosetScreen} // Add ClosetScreen
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RecommendationScreen"
            component={RecommendationScreen}
            options={{ title: "Fashion Recommendations" }}
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
