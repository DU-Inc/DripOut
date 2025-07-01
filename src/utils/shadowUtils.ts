import { ViewStyle } from 'react-native';
import { getThemeColors } from '../styles/theme/colors';

export type ElevationLevel = 'light' | 'medium' | 'high';

/**
 * Creates safe shadow styles that only apply shadows when a solid background color is provided.
 * This prevents React Native shadow efficiency warnings.
 */
export const createSafeShadow = (
  elevationLevel: ElevationLevel,
  backgroundColor: string,
  isDarkMode: boolean = false
): ViewStyle => {
  // Don't apply shadows to transparent or undefined backgrounds
  if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor.includes('rgba(') && backgroundColor.includes('0)')) {
    return {
      backgroundColor,
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

/**
 * Removes all shadow properties from a style object.
 * Useful for transparent backgrounds or when you want to disable shadows.
 */
export const removeShadow = (backgroundColor?: string): ViewStyle => ({
  backgroundColor: backgroundColor || 'transparent',
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
});

/**
 * Applies shadow only if the background is solid (not transparent).
 * Returns the elevation style or empty object based on background.
 */
export const conditionalShadow = (
  elevationLevel: ElevationLevel,
  backgroundColor?: string,
  isDarkMode: boolean = false
): ViewStyle => {
  if (!backgroundColor || backgroundColor === 'transparent') {
    return {};
  }

  const theme = getThemeColors(isDarkMode);
  return theme.elevation[elevationLevel];
};

/**
 * Creates a style object with guaranteed solid background for shadows.
 * Falls back to theme surface color if no background is provided.
 */
export const createSolidShadow = (
  elevationLevel: ElevationLevel,
  backgroundColor?: string,
  isDarkMode: boolean = false
): ViewStyle => {
  const theme = getThemeColors(isDarkMode);
  const solidBackground = backgroundColor || theme.surface;
  
  return {
    backgroundColor: solidBackground,
    ...theme.elevation[elevationLevel],
  };
};

/**
 * Validates and fixes shadow styles for React Native components.
 * Removes shadow properties from Image components and ensures View components have solid backgrounds.
 */
export const validateShadowStyle = (
  style: ViewStyle,
  componentType: 'View' | 'Image' = 'View'
): ViewStyle => {
  // For Image components, remove all shadow properties
  if (componentType === 'Image') {
    const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation, ...validStyle } = style;
    
    if (shadowColor || shadowOffset || shadowOpacity || shadowRadius || elevation) {
      console.warn('Shadow properties removed from Image component. Apply shadows to a wrapper View instead.');
    }
    
    return validStyle;
  }
  
  // For View components, ensure solid background if shadows are present
  const hasShadow = style.shadowColor || style.shadowOffset || style.shadowOpacity || style.shadowRadius || style.elevation;
  
  if (hasShadow) {
    const backgroundColor = style.backgroundColor;
    
    // Check if background is transparent or missing
    if (!backgroundColor || 
        backgroundColor === 'transparent' || 
        (typeof backgroundColor === 'string' && backgroundColor.includes('rgba') && backgroundColor.endsWith('0)'))) {
      
      console.warn('Shadow efficiency warning: Adding solid background color to View with shadows');
      
      return {
        ...style,
        backgroundColor: backgroundColor || '#FFFFFF', // Fallback to white
      };
    }
  }
  
  return style;
};

/**
 * Creates a wrapper style for Image components that need shadows.
 * Returns both the wrapper style (with shadows) and image style (without shadows).
 */
export const createImageWithShadow = (
  elevationLevel: ElevationLevel,
  imageStyle: ViewStyle,
  backgroundColor?: string,
  isDarkMode: boolean = false
): { wrapperStyle: ViewStyle; imageStyle: ViewStyle } => {
  const theme = getThemeColors(isDarkMode);
  const solidBackground = backgroundColor || theme.surface;
  
  // Remove shadow properties from image style
  const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation, ...cleanImageStyle } = imageStyle;
  
  // Create wrapper with shadows
  const wrapperStyle: ViewStyle = {
    backgroundColor: solidBackground,
    ...theme.elevation[elevationLevel],
    // Ensure wrapper has same border radius as image for consistent appearance
    borderRadius: imageStyle.borderRadius || 0,
  };
  
  return {
    wrapperStyle,
    imageStyle: cleanImageStyle,
  };
}; 