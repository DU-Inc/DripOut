import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions
const baseWidth = 375; // Standard iPhone width
const baseHeight = 812; // Standard iPhone X height

// Scaling factors
const widthScale = SCREEN_WIDTH / baseWidth;
const heightScale = SCREEN_HEIGHT / baseHeight;

/**
 * Normalize a size based on device screen size
 * @param size - The size to normalize
 * @param based - Whether to base scaling on width, height, or use the smaller factor
 * @returns Normalized size
 */
export const normalize = (
  size: number, 
  based: 'width' | 'height' | 'min' = 'width'
): number => {
  let scale: number;
  
  switch (based) {
    case 'height':
      scale = heightScale;
      break;
    case 'min':
      scale = Math.min(widthScale, heightScale);
      break;
    case 'width':
    default:
      scale = widthScale;
  }
  
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Additional responsive utilities
export const responsiveWidth = (width: number): number => {
  return (width / 100) * SCREEN_WIDTH;
};

export const responsiveHeight = (height: number): number => {
  return (height / 100) * SCREEN_HEIGHT;
};

export const isSmallDevice = SCREEN_WIDTH < 375; 