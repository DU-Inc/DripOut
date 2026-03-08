import { StyleSheet } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const createWelcomeStyles = (theme: ThemeColors) => 
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      flex: 1,
      position: 'relative',
    },
    glassContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    glassMorphism: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.glassmorphism.background,
    },
    overlayContainer: {
      opacity: 1,
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0
    }
  }); 