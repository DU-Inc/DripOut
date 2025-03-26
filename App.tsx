import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/styles/themeprovider';
import AppNavigator from './src/navigations/AppNavigator'; // Import AppNavigator
import { appStateManager } from './src/utils/appStateManager';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OnboardingProvider } from './src/context/OnboardingContext';

const App: React.FC = () => {
  useEffect(() => {
    // Cleanup on app unmount
    return () => {
      appStateManager.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
