import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from "../../styles/themeprovider";

const { width: screenWidth } = Dimensions.get('window');
const PANEL_WIDTH = screenWidth / 2;

interface SlidingPanelsProps {
  progress?: number; // 0 (closed) to 1 (fully open)
  numInputFields?: number; // Number of input fields that will be filled
  maxInputFields?: number; // Maximum number of input fields (defaults to 4)
}

const SlidingPanels: React.FC<SlidingPanelsProps> = ({ 
  progress, 
  numInputFields = 0, 
  maxInputFields = 6 
}) => {
  const { theme } = useTheme();
  const translateXAnim = useRef(new Animated.Value(0)).current; // Controls how far panels move
  const isFirstMount = useRef(true);

  // Calculate progress based on input fields if not directly provided
  // When numInputFields is 0, progress should be 1 (fully open)
  // When numInputFields equals maxInputFields, progress should be 0 (closed)
  const calculatedProgress = progress !== undefined 
    ? progress 
    : numInputFields === 0 
      ? 1 // Fully open if no input fields
      : 1 - (numInputFields / maxInputFields); // Otherwise calculate normally

  useEffect(() => {
    // If it's the first mount and there are no input fields (fully open),
    // set the animation value directly to avoid seeing panels slide from closed position
    if (isFirstMount.current && numInputFields === 0) {
      translateXAnim.setValue(1); // Start fully open
      isFirstMount.current = false;
      console.log(`SlidingPanels: First mount with no input fields, setting to fully open`);
      return;
    }
    
    console.log(`SlidingPanels: Animating to progress=${calculatedProgress}`);
    isFirstMount.current = false;
    
    // Animate to the calculated progress
    Animated.timing(translateXAnim, {
      toValue: calculatedProgress,
      duration: 800, // Slower animation to be more visible
      useNativeDriver: true,
    }).start();
  }, [calculatedProgress, numInputFields]);

  // Interpolate the actual translation distance
  const leftTranslateX = translateXAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -PANEL_WIDTH], // Moves left from 0 to -PANEL_WIDTH
    extrapolate: 'clamp',
  });

  const rightTranslateX = translateXAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PANEL_WIDTH], // Moves right from 0 to PANEL_WIDTH
    extrapolate: 'clamp',
  });

  // Log for debugging
  console.log(`SlidingPanels: numInputFields=${numInputFields}, progress=${calculatedProgress}`);

  const styles = StyleSheet.create({
    panel: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: PANEL_WIDTH,
      backgroundColor: theme.background, // Panels use theme background
      zIndex: 10, // Above HomeScreen, below BottomSheet
    },
    leftPanel: {
      left: 0,
    },
    rightPanel: {
      right: 0,
    },
  });

  return (
    <>
      <Animated.View
        style={[
          styles.panel,
          styles.leftPanel,
          { transform: [{ translateX: leftTranslateX }] },
        ]}
      />
      <Animated.View
        style={[
          styles.panel,
          styles.rightPanel,
          { transform: [{ translateX: rightTranslateX }] },
        ]}
      />
    </>
  );
};

export default SlidingPanels; 