import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, Platform, Easing } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import Button from './Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createAuthStyles } from '../../styles/components/auth.styles';
import { createBottomSheetWelcomeStyles, SHEET_HEIGHT } from '../../styles/components/bottomSheetWelcome.styles';
import { text } from '../../styles/theme/text';
import { BottomSheetWelcomeProps } from '../../types/components';

// Add global setTimeout type
declare const setTimeout: (callback: () => void, ms: number) => number;

const BottomSheetWelcome: React.FC<BottomSheetWelcomeProps> = ({
  onGetStarted,
  onAlreadyHaveAccount,
  onContinueAsGuest,
  onSocialSignIn,
}) => {
  const { theme, isDarkMode } = useTheme();
  const authStyles = createAuthStyles(theme);
  const styles = createBottomSheetWelcomeStyles(theme);
  
  const translateYAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  
  // Animation for the pulsing button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start with the sheet offscreen
    translateYAnim.setValue(SHEET_HEIGHT);
    
    // Animate sheet sliding up on mount
    Animated.timing(translateYAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
      delay: 500,
    }).start();
    
    // Start pulsing animation after the sheet appears
    setTimeout(startPulseAnimation, 1200);
  }, []);
  
  // Function to create continuous pulse animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        // Slightly scale up
        Animated.timing(pulseAnim, {
          toValue: 1.03, // Very subtle scale increase (3%)
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        // Scale back down
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        // Short pause
        Animated.delay(800),
      ])
    ).start();
  };

  // Function to handle "Continue as Guest" with slide out animation
  const handleGuestContinue = () => {
    // Slide out animation (down)
    Animated.timing(translateYAnim, {
      toValue: SHEET_HEIGHT,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, call the provided handler
      onContinueAsGuest();
    });
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: translateYAnim }] }
      ]}
    >
      <View style={styles.contentContainer}>
        {/* Title and Subtitle */}
        <View>
          <Text style={[authStyles.title, { textAlign: 'center', marginBottom: 4 }]}>
            {text.welcome.title}
          </Text>
          <Text style={[authStyles.subtitle, { textAlign: 'center', marginBottom: 24 }]}>
            {text.welcome.subtitle}
          </Text>
        </View>

        {/* Buttons in their own container */}
        <View style={styles.buttonsContainer}>
          {/* Wrap the Get Started button in an Animated.View for pulsing */}
          <Animated.View style={[styles.pulseButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Button
              title={text.welcome.buttons.getStarted}
              onPress={onGetStarted}
              style={{
                ...authStyles.button,
                ...theme.elevation.medium,
                backgroundColor: theme.primary,
                borderColor: theme.primary,
                borderWidth: 1,
                paddingVertical: 12,
                paddingHorizontal: 18,
                width: '100%',
              }}
              textStyle={{ color: theme.text.onPrimary }}
            />
          </Animated.View>

          <Button
            title={text.welcome.buttons.alreadyHaveAccount}
            onPress={onAlreadyHaveAccount}
            style={{
              ...authStyles.button,
              // Remove elevation to fix shadow warning on transparent background
              backgroundColor: 'transparent',
              borderColor: theme.border,
              borderWidth: 0.5,
              paddingVertical: 12,
              paddingHorizontal: 18,
              width: '100%',
              marginTop: 16,
            }}
            textStyle={{ color: theme.text.primary }}
          />
        </View>

        {/* Divider Section */}
        <View style={authStyles.divider}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>
            {text.welcome.divider.guest}{' '}
            <Text style={authStyles.footerLink} onPress={handleGuestContinue}>
              {text.welcome.divider.guestLink}
            </Text>
            {' '}{text.welcome.divider.or}
          </Text>
          <View style={authStyles.dividerLine} />
        </View>

        {/* Social Buttons in their own container */}
        <View style={[authStyles.socialButtons, styles.socialContainer]}>
          <TouchableOpacity
            style={{
              ...authStyles.socialButton,
              ...theme.elevation.light,
              backgroundColor: theme.background, // Ensure solid background for shadow
            }}
            onPress={() => onSocialSignIn('google')}
          >
            <Icon name="google" size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              ...authStyles.socialButton,
              ...theme.elevation.light,
              backgroundColor: theme.background, // Ensure solid background for shadow
            }}
            onPress={() => onSocialSignIn('apple')}
          >
            <Icon name="apple" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

export default BottomSheetWelcome; 