import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CodeInput, { CodeInputHandle } from './CodeInput';

// Function to make dimensions responsive (copied from SignInScreen)
const width = require('react-native').Dimensions.get('window').width;
const scale = width / 375; // Using iPhone 8 as baseline
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface PhoneVerificationPanelProps {
  authMethod: 'email' | 'phone';
  showVerificationPanel: boolean;
  verificationCode: string;
  verificationRemainingTime: number;
  phoneAuthError: string;
  remainingTime: number;
  resendLimitReached: boolean;
  codeInputRef: React.RefObject<CodeInputHandle>;
  theme: any;
  styles: any;
  onVerificationCodeChange: (code: string) => void;
  onVerifyCode: () => void;
  onResendCode: () => void;
  formatRemainingTime: (seconds: number) => string;
}

const PhoneVerificationPanel: React.FC<PhoneVerificationPanelProps> = ({
  authMethod,
  showVerificationPanel,
  verificationCode,
  verificationRemainingTime,
  phoneAuthError,
  remainingTime,
  resendLimitReached,
  codeInputRef,
  theme,
  styles,
  onVerificationCodeChange,
  onVerifyCode,
  onResendCode,
  formatRemainingTime,
}) => {
  if (authMethod !== 'phone' || !showVerificationPanel) {
    return null;
  }

  return (
    <>
      {/* Verification Code Input - For Phone Auth Only */}
      <View style={[styles.verificationContainer, { marginTop: normalize(5) }]}>
        {/* Verification Expiry Timer - moved above the text */}
        <View style={styles.expiryContainer}>
          <Icon name="timer-outline" size={normalize(14)} color={theme.text.secondary} />
          <Text style={styles.expiryText}>
            Code expires in {formatRemainingTime(verificationRemainingTime)}
          </Text>
        </View>
        
        <Text style={styles.verificationText}>
          Enter the verification code sent to your phone
        </Text>
        
        {/* Display error message if there is one */}
        {phoneAuthError ? (
          <View style={styles.errorPromptNoBg}>
            <Icon name="alert-circle-outline" size={normalize(16)} color={theme.error} />
            <Text style={styles.phoneErrorText}>{phoneAuthError}</Text>
          </View>
        ) : null}
        
        <CodeInput
          codeLength={6}
          value={verificationCode}
          onChange={onVerificationCodeChange}
          onFullCode={onVerifyCode}
          ref={codeInputRef}
          isError={!!phoneAuthError}
        />
      </View>

      {/* Resend Code Button with Timer - only show when verification panel is visible */}
      <View style={[styles.resendContainer, { marginTop: normalize(16) }]}>
        <View style={styles.resendTimerContainer}>
          <Icon name="clock-outline" size={normalize(16)} color={theme.text.secondary} />
          <Text style={styles.resendTimerText}>
            {remainingTime > 0 
              ? `Resend code in ${formatRemainingTime(remainingTime)}` 
              : 'Resend code'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onResendCode}
          disabled={remainingTime > 0 || resendLimitReached}
          style={[
            styles.resendButton,
            (remainingTime > 0 || resendLimitReached) && styles.resendButtonDisabled
          ]}
        >
          <Text style={[
            styles.resendButtonText,
            (remainingTime > 0 || resendLimitReached) && styles.resendButtonTextDisabled 
          ]}>
            {resendLimitReached ? 'Limit Reached' : 'Resend'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default PhoneVerificationPanel;