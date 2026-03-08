import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';
import Button from '../common/Button';
import CodeInput, { CodeInputHandle } from './CodeInput';
import { text } from '../../styles/theme/text';
import { normalize } from '../../utils/responsive';

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalizeResponsive = (size: number) => {
  return Math.round(scale * size);
};

interface VerificationPanelProps {
  identifierType: 'email' | 'phone';
  identifier: string;
  code: string;
  onChange: (code: string) => void;
  onChangeStart?: () => void;
  onVerify: () => void;
  onResend: () => void;
  verificationStatus: string;
  verifyingCode: boolean;
  maxAttemptsExceeded: boolean;
  remainingTime: number;
  errorMessage: string;
  isTransitioning: boolean;
  theme: ThemeColors;
  formatIdentifier?: (identifier: string) => string;
}

export interface VerificationPanelHandle {
  focusLastInput: () => void;
}

const VerificationPanel = forwardRef<VerificationPanelHandle, VerificationPanelProps>(
  ({
    identifierType,
    identifier,
    code,
    onChange,
    onChangeStart,
    onVerify,
    onResend,
    verificationStatus,
    verifyingCode,
    maxAttemptsExceeded,
    remainingTime,
    errorMessage,
    isTransitioning,
    theme,
    formatIdentifier = (id) => id
  }, ref) => {
    const [inputFocused, setInputFocused] = useState(false);
    
    // Format remaining time as MM:SS
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    
    // Create base styles
    const styles = StyleSheet.create({
      container: {
        width: '100%',
        marginTop: normalizeResponsive(16),
        marginBottom: normalizeResponsive(24),
        paddingHorizontal: normalizeResponsive(8),
      },
      headerText: {
        fontSize: normalizeResponsive(15),
        color: theme.text.primary,
        marginBottom: normalizeResponsive(4),
        alignSelf: 'center',
        textAlign: 'center',
        fontWeight: '500',
      },
      subText: {
        fontSize: normalizeResponsive(13),
        color: theme.text.secondary,
        marginBottom: normalizeResponsive(16),
        alignSelf: 'center',
        textAlign: 'center',
      },
      errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalizeResponsive(12),
        marginBottom: normalizeResponsive(4),
        paddingHorizontal: normalizeResponsive(8),
        justifyContent: 'center',
      },
      errorText: {
        color: theme.error,
        fontSize: normalizeResponsive(14),
        marginLeft: normalizeResponsive(4),
      },
      resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: normalizeResponsive(24),
        marginBottom: normalizeResponsive(8),
      },
      timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      timerText: {
        color: theme.text.secondary,
        fontSize: normalizeResponsive(14),
        marginLeft: normalizeResponsive(4),
      },
      resendButton: {
        paddingVertical: normalizeResponsive(8),
        paddingHorizontal: normalizeResponsive(16),
        borderRadius: normalizeResponsive(6),
        borderWidth: 1,
        borderColor: theme.primary,
        backgroundColor: 'transparent',
      },
      resendButtonText: {
        color: theme.primary,
        fontSize: normalizeResponsive(14),
        fontWeight: '600',
      },
      resendButtonDisabled: {
        borderColor: theme.border,
        opacity: 0.6,
      },
      resendButtonTextDisabled: {
        color: theme.text.tertiary,
      },
      codeContainer: {
        marginTop: normalizeResponsive(16),
        alignItems: 'center',
      },
      verifyButton: {
        width: '100%',
        paddingVertical: normalizeResponsive(14),
        backgroundColor: theme.primary,
        borderRadius: normalizeResponsive(8),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: normalizeResponsive(24),
      },
      verifyButtonDisabled: {
        backgroundColor: theme.primaryLight,
        opacity: 0.7,
      },
      verifyButtonText: {
        color: 'white',
        fontSize: normalizeResponsive(16),
        fontWeight: '600',
      },
    });
    
    // Expose the focus method via ref
    useImperativeHandle(ref, () => ({
      focusLastInput: () => {
        if (ref && 'current' in ref && ref.current) {
          // @ts-ignore - This is a valid operation but TypeScript doesn't know about it
          ref.current.focusLastInput();
        }
      }
    }));
    
    return (
      <View style={styles.container}>
        <Text style={styles.headerText}>Verification Required</Text>
        <Text style={styles.subText}>
          {identifierType === 'email'
            ? `We've sent a verification code to ${identifier}`
            : `We've sent a verification code to ${formatIdentifier(identifier)}`}
        </Text>
        
        <View style={styles.codeContainer}>
          <CodeInput
            codeLength={6}
            value={code}
            onChange={onChange}
            onChangeStart={onChangeStart}
            onFullCode={onVerify}
            ref={ref}
            isError={!!errorMessage}
          />
        </View>
        
        {/* Error message */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={normalizeResponsive(16)} color={theme.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        
        {/* Resend code section */}
        <View style={styles.resendContainer}>
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={normalizeResponsive(16)} color={theme.text.secondary} />
            <Text style={styles.timerText}>
              {remainingTime > 0 
                ? `Resend in ${formatTime(remainingTime)}` 
                : 'Resend code'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.resendButton,
              (remainingTime > 0 || maxAttemptsExceeded || isTransitioning) && styles.resendButtonDisabled
            ]}
            onPress={onResend}
            disabled={remainingTime > 0 || maxAttemptsExceeded || isTransitioning}
          >
            <Text
              style={[
                styles.resendButtonText,
                (remainingTime > 0 || maxAttemptsExceeded || isTransitioning) && styles.resendButtonTextDisabled
              ]}
            >
              Resend
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Verify button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (code.length < 6 || verifyingCode || maxAttemptsExceeded || isTransitioning) && styles.verifyButtonDisabled
          ]}
          onPress={onVerify}
          disabled={code.length < 6 || verifyingCode || maxAttemptsExceeded || isTransitioning}
        >
          {verifyingCode ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
);

export default VerificationPanel; 