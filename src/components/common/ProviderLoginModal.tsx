import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, Modal, StyleSheet, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createAuthStyles } from '../../styles/components/auth.styles';
import useGoogleAuth from '../../hooks/useGoogleAuth';
import useAppleAuth from '../../hooks/useAppleAuth';
import { useNavigation } from '@react-navigation/native';
import { AuthStackNavigationProp } from '../../navigations/types';
import { appStateManager } from '../../utils/appStateManager';

// Add setTimeout type declaration
declare const setTimeout: (callback: () => void, ms: number) => number;
declare const clearTimeout: (id: number) => void;

type ProviderLoginModalProps = {
  visible: boolean;
  onClose: () => void;
  onProviderLogin: (provider: 'google' | 'apple') => void;
  provider: 'google' | 'apple' | null;
};

const ProviderLoginModal: React.FC<ProviderLoginModalProps> = ({
  visible,
  onClose,
  onProviderLogin,
  provider,
}) => {
  const { theme, isDarkMode } = useTheme();
  const authStyles = createAuthStyles(theme);
  const navigation = useNavigation<AuthStackNavigationProp>();
  
  // Get Google authentication functions
  const { 
    signIn: googleSignIn, 
    loading: googleLoading, 
    error: googleError, 
    user: googleUser,
    isNewUser: googleIsNewUser,
    userData: googleUserData
  } = useGoogleAuth();
  
  // Get Apple authentication functions
  const { 
    signIn: appleSignIn, 
    loading: appleLoading, 
    error: appleError,
  } = useAppleAuth();
  
  // State for auth status
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<{
    user: any;
    isNewUser: boolean;
    userData: any;
  } | null>(null);
  
  // Animation for modal fade in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset states when modal becomes visible
      setStatus('idle');
      setErrorMessage(null);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  // Update status when auth state changes (Google or Apple)
  useEffect(() => {
    const isLoading = googleLoading || appleLoading;
    const currentError = googleError || appleError;
    const isSuccess = googleUser || authResult;
    
    if (isLoading) {
      setStatus('loading');
    } else if (currentError) {
      setStatus('error');
      setErrorMessage(currentError);
    } else if (isSuccess) {
      setStatus('success');
      
      // Use the appropriate result data
      const resultData = authResult || {
        user: googleUser,
        isNewUser: googleIsNewUser,
        userData: googleUserData
      };
      
      // Close modal after success with a delay
      const timer = setTimeout(() => {
        onClose();
        
        // Navigate based on whether this is a new user or existing user
        if (resultData.isNewUser && resultData.userData) {
          // For new users, navigate to SignUp screen with pre-filled data
          navigation.navigate('SignUp', {
            email: resultData.userData.email,
            firstName: resultData.userData.firstName,
            lastName: resultData.userData.lastName,
            isValidated: true,
            isGoogleAuth: provider === 'google',
            isAppleAuth: provider === 'apple',
            identifierType: 'email',
            googleAuth: provider === 'google',
            appleAuth: provider === 'apple',
            skipToStep: 'birthday' // Indicates we should skip to the birthday step
          });
        } else {
          // For existing users, set authenticated and navigate to home
          appStateManager.setAuthenticated(true);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [googleLoading, googleError, googleUser, googleIsNewUser, googleUserData, appleLoading, appleError, authResult, provider, navigation, onClose]);

  // Get provider name and icon
  const getProviderInfo = () => {
    switch (provider) {
      case 'google':
        return { name: 'Google', icon: 'google' };
      case 'apple':
        return { name: 'Apple', icon: 'apple' };
      default:
        return { name: '', icon: 'account' }; // Use 'account' as fallback icon instead of empty string
    }
  };

  const providerInfo = getProviderInfo();
  
  // Handle provider sign in
  const handleProviderSignIn = async () => {
    try {
      setStatus('loading');
      setErrorMessage(null);
      setAuthResult(null);
      
      if (provider === 'google') {
        // Call Google sign in
        await googleSignIn();
      } else if (provider === 'apple') {
        // Call Apple sign in
        const result = await appleSignIn();
        if (result) {
          setAuthResult(result);
        }
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Authentication failed');
    }
  };

  // Render different content based on status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.statusText, { color: theme.text.primary, marginTop: 20 }]}>
              Signing in with {providerInfo.name}...
            </Text>
          </View>
        );
      
      case 'success':
        return (
          <View style={styles.statusContainer}>
            <Icon name="check-circle" size={60} color={theme.success} />
            <Text style={[styles.statusText, { color: theme.text.primary, marginTop: 20 }]}>
              Successfully signed in!
            </Text>
            <Text style={[styles.redirectText, { color: theme.text.secondary, marginTop: 10 }]}>
              {(authResult?.isNewUser || googleIsNewUser) ? "Setting up your account..." : "Redirecting to your account..."}
            </Text>
          </View>
        );
        
      case 'error':
        return (
          <View style={styles.statusContainer}>
            <Icon name="alert-circle" size={60} color={theme.error} />
            <Text style={[styles.statusText, { color: theme.text.primary, marginTop: 20 }]}>
              Sign in failed
            </Text>
            {errorMessage && (
              <Text style={[styles.errorText, { color: theme.error }]}>
                {errorMessage}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.retryButton,
                { 
                  backgroundColor: theme.primary,
                  marginTop: 20,
                }
              ]}
              onPress={handleProviderSignIn}
            >
              <Text style={[styles.retryButtonText, { color: theme.text.onPrimary }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        );
        
      default:
        return (
          <View style={styles.emptyContentArea}>
            <Text style={[styles.placeholderText, { color: theme.text.secondary }]}>
              Ready to sign in with {providerInfo.name}
            </Text>
            <TouchableOpacity
              style={[
                styles.signInButton,
                {
                  backgroundColor: theme.primary,
                  marginTop: 30,
                }
              ]}
              onPress={handleProviderSignIn}
            >
              {providerInfo.icon ? (
                <Icon name={providerInfo.icon} size={24} color={theme.text.onPrimary} style={styles.buttonIcon} />
              ) : null}
              <Text style={[styles.signInButtonText, { color: theme.text.onPrimary }]}>
                Continue with {providerInfo.name}
              </Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[
          styles.overlay, 
          { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
        ]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderColor: theme.border,
              borderWidth: 1,
              backgroundColor: theme.background,
              shadowColor: isDarkMode ? theme.glow.light : theme.glow.dark,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 20,
            }
          ]}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.glassContainer}>
              <View style={[
                styles.glassMorphism, 
                { backgroundColor: theme.background }
              ]} />
              
              <View style={[
                styles.glassMorphismOverlay, 
                {
                  backgroundColor: theme.glassmorphism.background,
                  opacity: isDarkMode ? 0.98 : 0.95,
                  borderWidth: 0.5,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : theme.border,
                }
              ]} />
            </View>
            
            <View style={styles.contentContainer}>
              {provider && providerInfo.icon && (
                <View style={styles.providerHeader}>
                  <Icon name={providerInfo.icon} size={36} color={theme.text.primary} />
                  <Text style={[styles.title, { color: theme.text.primary }]}>
                    Continue with {providerInfo.name}
                  </Text>
                </View>
              )}
              
              {renderContent()}
              
              {(status !== 'loading' && status !== 'success') && (
                <TouchableOpacity
                  style={[
                    styles.closeButton, 
                    { 
                      borderColor: theme.border,
                      backgroundColor: isDarkMode 
                        ? 'rgba(0, 0, 0, 0.3)' 
                        : 'rgba(255, 255, 255, 0.3)',
                    }
                  ]}
                  onPress={onClose}
                >
                  <Text style={[styles.closeButtonText, { color: theme.text.secondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');
const modalWidth = Math.min(width * 0.95, 500);
const modalHeight = Math.min(height * 0.75, 650);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: modalWidth,
    height: modalHeight,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
  },
  modalContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 24,
  },
  glassMorphism: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  glassMorphismOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  contentContainer: {
    padding: 30,
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyContentArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 30,
  },
  placeholderText: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500',
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 30,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  redirectText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: '90%',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 10,
  }
});

export default ProviderLoginModal; 