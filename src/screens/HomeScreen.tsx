import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, View } from 'react-native';
import { Header } from '../components/Home/Header';
import { SignOutButton } from '../components/Home/SignOutButton';
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
