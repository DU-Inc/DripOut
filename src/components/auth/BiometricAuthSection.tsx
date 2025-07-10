import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Function to make dimensions responsive (copied from SignInScreen)
const width = require('react-native').Dimensions.get('window').width;
const scale = width / 375; // Using iPhone 8 as baseline
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface BiometricAuthSectionProps {
  authMethod: 'email' | 'phone';
  useFaceId: boolean;
  isBiometricAvailable: boolean;
  isBiometricLocked: boolean;
  biometricType: string;
  theme: any;
  styles: any;
  onFaceIdIconPress: () => void;
  onToggleBiometric: () => void;
}

const BiometricAuthSection: React.FC<BiometricAuthSectionProps> = ({
  authMethod,
  useFaceId,
  isBiometricAvailable,
  isBiometricLocked,
  biometricType,
  theme,
  styles,
  onFaceIdIconPress,
  onToggleBiometric,
}) => {
  if (authMethod !== 'email' && authMethod !== 'phone') {
    return null;
  }

  return (
    <View style={[styles.faceIdContainer, { marginTop: normalize(12), marginBottom: 0 }]}>
      <TouchableOpacity 
        onPress={onFaceIdIconPress}
        hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        style={styles.faceIdButton}
        disabled={isBiometricLocked || !isBiometricAvailable || !useFaceId}
      >
        <Icon 
          name="face-recognition" 
          size={normalize(26)} 
          color={
            !isBiometricAvailable ? "#999999" :
            isBiometricLocked ? "#999999" :
            !useFaceId ? "#999999" :
            useFaceId ? theme.primary : theme.text.tertiary
          }
          style={{ opacity: (!isBiometricAvailable || isBiometricLocked || !useFaceId) ? 0.5 : 0.85 }}
        />
      </TouchableOpacity>
      
      <Text style={{
        flex: 1,
        color: theme.text.secondary,
        fontSize: normalize(14),
        marginLeft: 8,
      }}>
        {!isBiometricAvailable ? "Biometrics Not Available" :
         isBiometricLocked ? `${biometricType} Locked` : 
         biometricType}
      </Text>
      
      <TouchableOpacity 
        onPress={onToggleBiometric}
        style={styles.faceIdToggle}
        disabled={!isBiometricAvailable}
      >
        <Icon 
          name={useFaceId ? "toggle-switch" : "toggle-switch-off"}
          size={normalize(32)} 
          color={
            !isBiometricAvailable ? "#999999" :
            useFaceId ? theme.primary : theme.text.tertiary
          }
          style={{ opacity: !isBiometricAvailable ? 0.5 : 0.85 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default BiometricAuthSection;