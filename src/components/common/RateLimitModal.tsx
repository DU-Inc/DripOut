import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../styles/themeprovider';
import { FeatureType, rateLimitService } from '../../services/rateLimitService';

const { width, height } = Dimensions.get('window');

interface RateLimitModalProps {
  visible: boolean;
  featureType: FeatureType;
  onClose: () => void;
  title?: string;
  customMessage?: string;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({
  visible,
  featureType,
  onClose,
  title,
  customMessage,
}) => {
  const { isDarkMode } = useTheme();
  const [remainingCount, setRemainingCount] = useState(0);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [progressWidth] = useState(new Animated.Value(0));
  
  // Colors
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const overlayColor = isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)';

  // Update data when modal becomes visible
  useEffect(() => {
    if (visible) {
      updateRateLimitInfo();
      // Update every minute while modal is open
      const interval = setInterval(updateRateLimitInfo, 60000);
      return () => clearInterval(interval);
    }
  }, [visible, featureType]);

  const updateRateLimitInfo = async () => {
    try {
      const result = await rateLimitService.checkLimit(featureType);
      setRemainingCount(result.remainingCount);
      
      const formatted = await rateLimitService.getTimeUntilResetFormatted(featureType);
      setTimeUntilReset(formatted);

      // Animate progress bar based on usage
      const usagePercentage = ((result.totalLimit - result.remainingCount) / result.totalLimit) * 100;
      Animated.timing(progressWidth, {
        toValue: usagePercentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } catch (error) {
      console.error('Error updating rate limit info:', error);
    }
  };

  const getFeatureDisplayName = (type: FeatureType): string => {
    switch (type) {
      case FeatureType.FASHION_ADVISOR:
        return 'Fashion Advisor';
      case FeatureType.TRY_ON:
        return '3D Try-On';
      default:
        return 'Feature';
    }
  };

  const getFeatureIcon = (type: FeatureType): string => {
    switch (type) {
      case FeatureType.FASHION_ADVISOR:
        return 'sparkles';
      case FeatureType.TRY_ON:
        return 'shirt';
      default:
        return 'information-circle';
    }
  };

  const getDefaultMessage = (): string => {
    const featureName = getFeatureDisplayName(featureType);
    return `Since ${featureName} is currently in beta and costs are covered by us, we want to ensure fair access for all users. You can make 5 requests every 6 hours to help us provide the best experience for everyone! 🚀`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <StatusBar backgroundColor="transparent" translucent />
      
      {/* Overlay */}
      <View style={[styles.overlay, { backgroundColor: overlayColor }]}>
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        {/* Modal Content */}
        <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: mainColor + '20' }]}>
              <Icon name={getFeatureIcon(featureType)} size={24} color={mainColor} />
            </View>
            <Text style={[styles.title, { color: textColor }]}>
              {title || `${getFeatureDisplayName(featureType)} Limit Reached`}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={24} color={subTextColor} />
            </TouchableOpacity>
          </View>

          {/* Usage Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: subTextColor }]}>
                Requests Remaining
              </Text>
              <Text style={[styles.progressValue, { color: textColor }]}>
                {remainingCount} / 5
              </Text>
            </View>
            
            <View style={[styles.progressBarContainer, { backgroundColor: borderColor }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: remainingCount > 0 ? '#4CAF50' : mainColor,
                    width: progressWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Message */}
          <View style={styles.messageSection}>
            <Text style={[styles.message, { color: textColor }]}>
              {customMessage || getDefaultMessage()}
            </Text>
          </View>

          {/* Reset Time */}
          {timeUntilReset && timeUntilReset !== 'Available now' && (
            <View style={[styles.resetSection, { borderColor }]}>
              <Icon name="time-outline" size={20} color={mainColor} />
              <Text style={[styles.resetText, { color: subTextColor }]}>
                Reset in: <Text style={{ color: mainColor, fontWeight: '600' }}>{timeUntilReset}</Text>
              </Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: mainColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  closeButton: {
    padding: 4,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  messageSection: {
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  resetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  resetText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RateLimitModal;