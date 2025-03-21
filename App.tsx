import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/styles/themeprovider';
import AppNavigator from './src/navigations/AppNavigator'; // Import AppNavigator
import { appStateManager } from './src/utils/appStateManager';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const App: React.FC = () => {
  useEffect(() => {
    // Cleanup on app unmount
    return () => {
      appStateManager.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
