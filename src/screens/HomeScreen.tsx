import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, View } from 'react-native';
import { Header } from '../components/Home/Header';
import { SignOutButton } from '../components/Home/SignOutButton';
import NavigationButton from '../components/NavigationButton/NavigationButton'; 
import { useTheme } from '../styles/themeprovider';

const HomeScreen: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" className="p-5">
        <Header title="Welcome to the Home" />
        <View className="mt-5">
          <SignOutButton />
          {/* Add navigation buttons */}
          <NavigationButton screenName="UserProfileScreen" title="Go to Profile" />
          <NavigationButton screenName="UserPreferencesScreen" title="Go to Preferences" />
          <NavigationButton screenName="Home" title="Go to Home" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
