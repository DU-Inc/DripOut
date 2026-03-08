import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import { createAnimatedFormContainerStyles } from '../../styles/components/animatedFormContainer.styles';
import { AnimatedFormContainerProps } from '../../types/components';

/**
 * A reusable animated container for form elements that supports:
 * - Slide-in/fade-in animation when first mounted
 * - Slide-up animation when focused
 */
const AnimatedFormContainer: React.FC<AnimatedFormContainerProps> = ({
  children,
  isFocused = false,
  isVisible = true,
  translateY = -20,
  style,
  animationDelay = 0,
  disableAfterInitial = false,
}) => {
  const { theme } = useTheme();
  const styles = createAnimatedFormContainerStyles(theme);
  
  // Animation values
  const translateYAnim = useRef(new Animated.Value(10)).current;
  const [hasInitialAnimated, setHasInitialAnimated] = useState(false);

  // Handle initial animation
  useEffect(() => {
    if (isVisible) {
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        delay: animationDelay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start(() => {
        // Mark that initial animation is complete
        setHasInitialAnimated(true);
      });
    }
  }, [isVisible, animationDelay]);

  // Handle focus animation
  useEffect(() => {
    // Skip animations after initial if disableAfterInitial is true
    if (disableAfterInitial && hasInitialAnimated) {
      return;
    }
    
    Animated.timing(translateYAnim, {
      toValue: isFocused ? translateY : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [isFocused, translateY, disableAfterInitial, hasInitialAnimated]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: translateYAnim }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedFormContainer; 