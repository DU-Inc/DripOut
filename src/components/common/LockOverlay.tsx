// src/components/common/LockOverlay.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

interface LockOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

const { width, height } = Dimensions.get('window');

const LockOverlay: React.FC<LockOverlayProps> = ({
  visible,
  onDismiss,
  title = 'Sign in Required',
  message,
  feature = 'this feature',
}) => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();

  const handleSignIn = () => {
    onDismiss();
    // Navigate to auth flow
    (navigation as any).navigate('Auth', { screen: 'SignIn' });
  };

  const displayMessage = message || `Sign in to unlock ${feature}`;

  const themeColors = {
    background: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    text: {
      primary: isDarkMode ? '#FFFFFF' : '#000000',
      secondary: isDarkMode ? '#8E8E93' : '#6E6E73',
    },
    primary: isDarkMode ? '#0A84FF' : '#007AFF',
    border: isDarkMode ? '#38383A' : '#E5E5E7',
    overlay: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[styles.overlay, { backgroundColor: themeColors.overlay }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
              {/* Lock Icon */}
              <View style={[styles.iconContainer, { backgroundColor: themeColors.primary + '20' }]}>
                <Icon
                  name="lock-closed"
                  size={32}
                  color={themeColors.primary}
                />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: themeColors.text.primary }]}>
                {title}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: themeColors.text.secondary }]}>
                {displayMessage}
              </Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.signInButton, { backgroundColor: themeColors.primary }]}
                  onPress={handleSignIn}
                >
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: themeColors.border }]}
                  onPress={onDismiss}
                >
                  <Text style={[styles.cancelButtonText, { color: themeColors.text.secondary }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: Math.min(width * 0.85, 320),
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  signInButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  },
});

export default LockOverlay;