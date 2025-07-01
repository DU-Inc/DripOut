import React, { useRef, useEffect, useState } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import SlidingPanels from '../../components/common/SlidingPanels';
import BottomSheetWelcome from '../../components/common/BottomSheetWelcome';
import { appStateManager } from '../../utils/appStateManager';
import OverviewScreen from '../OverviewScreen';
import { createWelcomeStyles } from '../../styles/components/welcome.styles';
import { WelcomeScreenProps } from '../../types/components';
import ProviderLoginModal from '../../components/common/ProviderLoginModal';
import { auth } from '../../Config/firebaseconfig';
// Google auth temporarily disabled
import useGoogleAuth from '../../hooks/useGoogleAuth'; // Using stub implementation

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createWelcomeStyles(theme);
  
  // Animation for welcome screen opacity
  const opacityAnim = useRef(new Animated.Value(0)).current;
  // State for the provider login modal
  const [providerModalVisible, setProviderModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'apple' | null>(null);
  
  // Get Google auth hook for monitoring state (using stub implementation)
  const { user, isNewUser, userData } = useGoogleAuth();

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      if (currentUser) {
        console.log('User authenticated:', currentUser.email);
        
        // Close any open modals
        setProviderModalVisible(false);
        
        // Navigation will be handled in the ProviderLoginModal component
        // based on whether this is a new user or existing user
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [navigation]);

  // Animate in on mount
  useEffect(() => {
    // Add dummy listener to prevent warning
    const opacityListener = opacityAnim.addListener(() => {});
    
    const animation = Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });
    
    animation.start();
    
    return () => {
      // Clean up animation
      animation.stop();
      opacityAnim.removeListener(opacityListener);
    };
  }, [opacityAnim]);

  // Handlers to pass to the bottom sheet
  const handleGetStarted = () => {
    navigation.navigate('SignUp');
  };

  const handleAlreadyHaveAccount = () => {
    navigation.navigate('SignIn');
  };

  const handleContinueAsGuest = () => {
    // The sheet will slide out in the BottomSheetWelcome component
    // We just need to fade out the entire screen after
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 500,
      delay: 300,
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, set guest mode to true
      appStateManager.setGuestMode(true);
    });
  };

  const handleSocialSignIn = (provider: 'google' | 'apple') => {
    setSelectedProvider(provider);
    setProviderModalVisible(true);
  };

  const handleProviderLogin = (provider: 'google' | 'apple') => {
    // This is handled by the ProviderLoginModal component
    console.log(`Provider auth initiated: ${provider}`);
  };

  const handleCloseModal = () => {
    setProviderModalVisible(false);
    setSelectedProvider(null);
  };

  return (
    // Parent container
    <View style={{ flex: 1 }}>
      {/* Render OverviewScreen in the background */}
      <OverviewScreen isBackgroundMode={true} />
      
      {/* Overlay with Welcome content */}
      <Animated.View
        style={[
          styles.container,
          styles.overlayContainer,
          { opacity: opacityAnim }
        ]}
      >
        <View style={styles.content}>
          {/* Glass Morphism Background */}
          <View style={styles.glassContainer}>
            <View style={styles.glassMorphism} />
          </View>
          
          {/* Sliding Panels with no input fields */}
          <SlidingPanels numInputFields={0} maxInputFields={4} />

          {/* Bottom Sheet with Welcome Buttons */}
          <BottomSheetWelcome
            onGetStarted={handleGetStarted}
            onAlreadyHaveAccount={handleAlreadyHaveAccount}
            onContinueAsGuest={handleContinueAsGuest}
            onSocialSignIn={handleSocialSignIn}
          />
        </View>
      </Animated.View>

      {/* Provider Login Modal */}
      <ProviderLoginModal
        visible={providerModalVisible}
        onClose={handleCloseModal}
        onProviderLogin={handleProviderLogin}
        provider={selectedProvider}
      />
    </View>
  );
};

export default WelcomeScreen;