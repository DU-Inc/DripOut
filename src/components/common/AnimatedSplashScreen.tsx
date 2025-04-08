import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, Image } from 'react-native';
import { createStyles, PANEL_WIDTH } from '../../styles/components/AnimatedSplashScreen.styles';
import { text } from '../../styles/theme/text';
import { useTheme } from "../../styles/theme/ThemeContext";
import { getThemeColors } from '../../styles/theme/colors';

// Add global setTimeout and clearTimeout types
declare const setTimeout: (callback: () => void, ms: number) => number;
declare const clearTimeout: (timeoutId: number) => void;

const AnimatedSplashScreen = () => {
  const { isDarkMode } = useTheme();
  const themeColors = getThemeColors(isDarkMode);
  const styles = createStyles(themeColors);
  
  const leftPanelAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const rightPanelAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const dashAnim = useRef(new Animated.Value(-500)).current;

  useEffect(() => {
    // Add dummy listeners to prevent the "onAnimatedValueUpdate with no listeners registered" warning
    const leftPanelListener = leftPanelAnim.addListener(() => {});
    const rightPanelListener = rightPanelAnim.addListener(() => {});
    const dashAnimListener = dashAnim.addListener(() => {});
    
    // Start the door closing animation at 1.8s
    const timer = setTimeout(() => {
      const animation = Animated.parallel([
        Animated.timing(leftPanelAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rightPanelAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Start dash animation when panels meet
        Animated.sequence([
          Animated.delay(500), // Wait for panels to be halfway
          Animated.timing(dashAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]);
      
      animation.start();
      
      return () => animation.stop();
    }, 1800);

    return () => {
      clearTimeout(timer);
      // Remove listeners when component unmounts
      leftPanelAnim.removeListener(leftPanelListener);
      rightPanelAnim.removeListener(rightPanelListener);
      dashAnim.removeListener(dashAnimListener);
      
      // Reset animated values to prevent lingering animations
      leftPanelAnim.setValue(-PANEL_WIDTH);
      rightPanelAnim.setValue(PANEL_WIDTH);
      dashAnim.setValue(-500);
    };
  }, [leftPanelAnim, rightPanelAnim, dashAnim]);

  return (
    <View style={styles.container}>
      {/* GIF Background */}
      <Image
        source={require('../../assets/images/gif/splash.gif')}
        style={styles.background}
      />

      {/* Sliding Panels */}
      <Animated.View
        style={[
          styles.panel,
          styles.leftPanel,
          {
            transform: [{ translateX: leftPanelAnim }],
          },
        ]}
      >
        <Text style={[styles.panelText, styles.leftText]}>{text.splash.leftPanel}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          styles.rightPanel,
          {
            transform: [{ translateX: rightPanelAnim }],
          },
        ]}
      >
        <Text style={[styles.panelText, styles.rightText]}>{text.splash.rightPanel}</Text>
      </Animated.View>

      {/* Falling Dash */}
      <Animated.View
        style={[
          styles.dash,
          {
            transform: [{ translateY: dashAnim }],
          },
        ]}
      >
        <Text style={styles.dashText}>{text.splash.dash}</Text>
      </Animated.View>
    </View>
  );
};

export default AnimatedSplashScreen; 