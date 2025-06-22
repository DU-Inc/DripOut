import React, { useEffect, useRef } from 'react';
import { View, Animated, Text, Image } from 'react-native';
import Video from 'react-native-video';
import { createStyles, PANEL_WIDTH } from '../../styles/components/AnimatedSplashScreen.styles';
import { text } from '../../styles/theme/text';
import { useTheme } from "../../styles/themeprovider";
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

  // Configuration for splash media
  const SPLASH_MEDIA = {
    // Change this to your preferred media file
    source: require('../../assets/videos/Trimmed_Opening.mp4'),
    isVideo: true, // Set to true for MP4
  };

  useEffect(() => {
    // Add dummy listeners to prevent the "onAnimatedValueUpdate with no listeners registered" warning
    const leftPanelListener = leftPanelAnim.addListener(() => {});
    const rightPanelListener = rightPanelAnim.addListener(() => {});
    const dashAnimListener = dashAnim.addListener(() => {});
    
    // Start the door closing animation after 1 second (when video ends)
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
    }, 900); // Changed from 1800ms to 1000ms to match video duration

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

  // Render background media based on type
  const renderBackgroundMedia = () => {
    if (SPLASH_MEDIA.isVideo) {
      return (
        <Video
          source={SPLASH_MEDIA.source}
          style={styles.background}
          resizeMode="cover"
          repeat={false}
          muted={true}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onError={(error) => console.log('Video error:', error)}
        />
      );
    } else {
      return (
        <Image
          source={SPLASH_MEDIA.source}
          style={styles.background}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Media - GIF or MP4 */}
      {renderBackgroundMedia()}

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