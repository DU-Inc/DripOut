import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SocialScreen from '../screens/SocialScreen';
import ViewUserProfileScreen from '../screens/profiles/ViewUserProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import FollowersScreen from '../screens/profiles/FollowersScreen';
import FollowingScreen from '../screens/profiles/FollowingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SuggestedUsersScreen from '../screens/SuggestedUsersScreen';
import { SocialStackParamList } from '../types/NavigationTypes';

const Stack = createNativeStackNavigator<SocialStackParamList>();

const SocialNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SocialFeed"
        component={SocialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewUserProfile"
        component={ViewUserProfileScreen}
        options={{ 
          headerShown: false // We handle our own header in the component
        }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Following"
        component={FollowingScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="SuggestedUsers"
        component={SuggestedUsersScreen}
        options={{ 
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

export default SocialNavigator; 