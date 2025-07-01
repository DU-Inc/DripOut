// Base colors with proper contrast
const baseColors = {
    primary: '#EF3D47',      // Updated red that works with white text
    primaryLight: '#FF6B6B', // Lighter red that still works with white text
    primaryDark: '#C62828',  // Darker red for emphasis
    accent1: '#26A69A',      // Teal with good contrast
    accent2: '#42A5F5',      // Blue with good contrast
    accent3: '#FFCA28',      // Amber with good contrast
  };
  
  // Light mode colors with improved contrast
  const lightColors = {
    background: '#FFFFFF', // Pure white background
    surface: '#F5F5F5',    // Light gray surface
    text: {
      primary: '#212121',   // Very dark gray, almost black
      secondary: '#757575', // Medium gray for secondary text
      tertiary: '#9E9E9E',  // Light gray for tertiary text
      onPrimary: '#FFFFFF', // White text on primary color
    },
    border: '#E0E0E0',
    error: '#D32F2F',
    success: '#388E3C',
    warning: '#FFA000',
    info: '#1976D2',
    overlay: {
      background: 'rgba(255, 255, 255, 0.9)',
      surface: 'rgba(245, 245, 245, 0.95)',
    },
    glow: {
      light: 'rgba(33, 33, 33, 0.1)',
      dark: 'rgba(255, 255, 255, 0.1)',
    },
    glassmorphism: {
      background: 'rgba(255, 255, 255, 0.92)',  // More opaque for better visibility
      border: 'transparent', // No visible border
      shadow: 'rgba(0, 0, 0, 0)',
      blur: 10,
    },
    elevation: {
      light: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      high: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
      },
    },
    ...baseColors,
  };
  
  // Dark mode colors with strong contrast
  const darkColors = {
    background: '#000000', // Standard dark theme background
    surface: '#1E1E1E',    // Slightly lighter surface
    text: {
      primary: '#FFFFFF',   // White text for primary content
      secondary: '#B0B0B0', // Light gray for secondary text
      tertiary: '#757575',  // Medium gray for tertiary text
      onPrimary: '#FFFFFF', // White text on primary color
    },
    border: '#333333',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    overlay: {
      background: 'rgba(18, 18, 18, 0.9)',
      surface: 'rgba(30, 30, 30, 0.95)',
    },
    glow: {
      light: 'rgba(255, 255, 255, 0.1)',
      dark: 'rgba(255, 255, 255, 0.05)',
    },
    glassmorphism: {
      background: 'rgba(0, 0, 0, 0.92)', // Black-based background
      border: 'transparent', // No visible border
      shadow: 'rgba(0, 0, 0, 0.3)',
      blur: 10,
    },
    elevation: {
      light: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
      },
      medium: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
      high: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 9,
      },
    },
    ...baseColors,
  };
  
  // Define the theme type using lightColors
  export type ThemeColors = typeof lightColors;
  
  // Combine light and dark themes into one object
  export const colors = {
    light: lightColors,
    dark: darkColors,
  };
  
  // Helper function to get the current theme colors based on dark mode
  export const getThemeColors = (isDarkMode: boolean): ThemeColors => {
    return isDarkMode ? colors.dark : colors.light;
  };
  
  // Helper function to create shadow styles only when background color is provided
  export const createShadowStyle = (
    elevationLevel: 'light' | 'medium' | 'high',
    backgroundColor?: string,
    isDarkMode: boolean = false
  ) => {
    // Only apply shadow if backgroundColor is provided and not transparent
    if (!backgroundColor || backgroundColor === 'transparent') {
      return {
        backgroundColor: backgroundColor || 'transparent',
        // Remove all shadow properties for transparent backgrounds
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
      };
    }

    const theme = getThemeColors(isDarkMode);
    return {
      backgroundColor,
      ...theme.elevation[elevationLevel],
    };
  };
  
  // Helper function to create safe elevation styles
  export const createElevationStyle = (
    elevationLevel: 'light' | 'medium' | 'high',
    isDarkMode: boolean = false
  ) => {
    const theme = getThemeColors(isDarkMode);
    return theme.elevation[elevationLevel];
  };
  
  // Export the default theme (light mode)
  export default colors.light;
  