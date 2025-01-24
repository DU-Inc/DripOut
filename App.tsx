import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/styles/themeprovider';
import AppNavigator from './src/navigations/AppNavigator'; // Import AppNavigator
import BottomNavigationBar from './src/components/NavigationButton/BottomNavigationBar'; // Import the new component

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;
