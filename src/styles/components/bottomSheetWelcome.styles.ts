import { StyleSheet, Dimensions, Platform } from 'react-native';
import { ThemeColors } from '../theme/colors';

// Get device dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate sheet height based on screen width to maintain consistent aspect ratio
// Reduced height since social buttons are removed
export const SHEET_HEIGHT = Math.min(
  Math.max(screenWidth * 0.7, 400), // Reduced minimum height from 500 to 400, and from 90% to 70% of width
  screenHeight * 0.45 // Reduced from 60% to 45% of screen height
);

export const createBottomSheetWelcomeStyles = (theme: ThemeColors) => {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: theme.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      padding: Math.min(24, screenWidth * 0.06), // Responsive padding
      zIndex: 20,
      // Use theme's elevation properties directly
      ...Platform.select({
        ios: {
          ...theme.elevation.medium, // Use all shadow properties from theme
        },
        android: {
          elevation: theme.elevation.medium.elevation,
        },
      }),
    },
    contentContainer: {
      flex: 1,
      paddingTop: Math.min(16, screenWidth * 0.04), // Responsive padding
      justifyContent: 'flex-start', // Changed from space-between to flex-start for better spacing
    },
    buttonsContainer: {
      marginBottom: 16, // Space between button section and divider
    },
    socialContainer: {
      marginTop: 16, // Space between divider and social buttons
      paddingBottom: Math.max(16, screenHeight * 0.02), // Extra bottom padding for safety
    },
    pulseButtonContainer: {
      width: '100%',
    },
  });
}; 