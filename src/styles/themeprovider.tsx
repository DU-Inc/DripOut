import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as StyledThemeProvider } from 'styled-components/native';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import { getThemeColors, ThemeColors, colors } from './theme/colors';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: ThemeColors;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  themeMode: 'system',
  setThemeMode: () => {},
  theme: colors.light,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');
  
  // App state listener to update theme when app comes to foreground (in case system theme changed)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && themeMode === 'system') {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [systemColorScheme, themeMode]);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode !== null) {
          setThemeModeState(savedThemeMode as ThemeMode);
          
          if (savedThemeMode === 'system') {
            setIsDarkMode(systemColorScheme === 'dark');
          } else {
            setIsDarkMode(savedThemeMode === 'dark');
          }
        } else {
          // Default to system theme if no preference is saved
          setThemeModeState('system');
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    
    loadTheme();
  }, [systemColorScheme]);

  // Update when system appearance changes (but only if using system theme)
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('themeMode', mode);
      
      if (mode === 'system') {
        setIsDarkMode(systemColorScheme === 'dark');
      } else {
        setIsDarkMode(mode === 'dark');
      }
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  const toggleTheme = async () => {
    if (themeMode === 'system') {
      // If currently using system theme, switch to explicitly light/dark
      const newMode = systemColorScheme === 'dark' ? 'light' : 'dark';
      await setThemeMode(newMode);
    } else {
      // Toggle between light and dark
      const newMode = themeMode === 'dark' ? 'light' : 'dark';
      await setThemeMode(newMode);
    }
  };

  // Get complete theme colors based on dark mode
  const theme = isDarkMode ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeMode, setThemeMode, theme }}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
