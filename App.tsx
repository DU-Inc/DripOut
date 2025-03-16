import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/styles/themeprovider';
import AppNavigator from './src/navigations/AppNavigator'; // Import AppNavigator
import BottomNavigationBar from './src/components/NavigationButton/BottomNavigationBar'; // Import the new component
import { appStateManager } from './src/utils/appStateManager';

const App: React.FC = () => {
  useEffect(() => {
    // Cleanup on app unmount
    return () => {
      appStateManager.cleanup();
    };
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;
