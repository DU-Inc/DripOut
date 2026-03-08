import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, StyleSheet, Keyboard, Animated, Text } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import { ThemeColors } from '../../styles/theme/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Add type declaration for setTimeout
declare const setTimeout: (callback: () => void, ms: number) => number;

interface CodeInputProps {
  codeLength: number;
  value: string;
  onChange: (code: string) => void;
  onFullCode?: () => void;
  isVerified?: boolean; // Control when to show verified styling
  isError?: boolean; // Flag for showing error state
  errorMessage?: string; // Error message to display
  onChangeStart?: () => void; // Added callback for when user starts typing
}

// Add a ref type for external access to component methods
export interface CodeInputHandle {
  focusLastInput: () => void; // Method to focus on the last input position
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    width: '90%',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative'
  },
  errorMessage: {
    color: theme.error,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center'
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  codeInputBox: {
    width: 42,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: 'rgba(0,0,0,0.02)', // Very faint grey background
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '500',
    margin: 4,
    color: theme.text.primary,
  },
  codeInputBoxFocused: {
    borderColor: theme.primary,
    borderWidth: 1.5,
  },
  codeInputBoxVerified: {
    borderColor: theme.success,
    borderWidth: 1.5,
    backgroundColor: 'rgba(56,142,60,0.05)', // Very faint green background
  },
  codeInputBoxError: {
    borderColor: theme.error,
    borderWidth: 1.5,
    backgroundColor: 'rgba(211,47,47,0.05)', // Very faint red background
  },
  successIconContainer: {
    position: 'absolute',
    right: 0,
    top: -30,
  }
});

const CodeInput = forwardRef<CodeInputHandle, CodeInputProps>(({ 
  codeLength, 
  value, 
  onChange, 
  onFullCode,
  isVerified = false,
  isError = false,
  errorMessage = '',
  onChangeStart
}, ref) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  // Initialize input refs array with null values
  useEffect(() => {
    inputRefs.current = Array(codeLength).fill(null);
  }, [codeLength]);

  // Auto-focus the first input field on mount
  useEffect(() => {
    // Use a small timeout to ensure the component is fully rendered
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []); // Empty dependency array means this runs once on mount

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focusLastInput: () => {
      // Focus on the last non-empty position or the first empty one
      const lastFilledIndex = value.length - 1;
      const targetIndex = lastFilledIndex >= 0 ? lastFilledIndex : 0;
      
      // Use setTimeout to ensure this runs after any keyboard dismissal
      setTimeout(() => {
        inputRefs.current[targetIndex]?.focus();
        setFocusedIndex(targetIndex);
      }, 100);
    }
  }));

  // Handle focus changes when value changes
  useEffect(() => {
    const valueLength = value.length;
    
    // Determine which input should be focused
    if (valueLength < codeLength) {
      // Focus on the next empty input
      const nextIndex = Math.min(valueLength, codeLength - 1);
      setFocusedIndex(nextIndex);
      // Don't auto-focus here to prevent unexpected keyboard behavior
      // Only set the focusedIndex for styling
    } else {
      // All inputs are filled
      Keyboard.dismiss();
    }
  }, [value, codeLength]);

  const handleChangeText = (text: string, index: number) => {
    // Notify parent that user started typing (for error clearing)
    if (onChangeStart) {
      onChangeStart();
    }
    
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;
    
    // Create a character array from the current value, padded to codeLength
    const valueChars = value.split('');
    while (valueChars.length < codeLength) {
      valueChars.push('');
    }
    
    // If text is empty, clear this position
    if (text === '') {
      valueChars[index] = '';
      
      // Move focus to previous input if available
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } 
    // If a new digit is entered, update just this position
    else if (text.length === 1) {
      valueChars[index] = text;
      
      // Move focus to next input if available
      if (index < codeLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    // If multiple digits (paste), distribute them starting from current position
    else if (text.length > 1) {
      const digits = text.split('');
      
      // Fill in as many positions as we have digits, starting at index
      for (let i = 0; i < digits.length && index + i < codeLength; i++) {
        valueChars[index + i] = digits[i];
      }
    }
    
    // Create the new value string, removing any empty positions
    const newValue = valueChars.join('').trim();
    
    // Update parent state
    onChange(newValue);
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && index > 0 && !value[index]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle initial focus for an input field
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    
    // If field already has content, select it for easy replacement
    if (value[index]) {
      inputRefs.current[index]?.setNativeProps({
        selection: { start: 0, end: 1 }
      });
    }
  };

  // Render individual input boxes
  const renderInputBoxes = () => {
    const boxes = [];

    for (let i = 0; i < codeLength; i++) {
      const isFocused = focusedIndex === i;
      const digit = value[i] || '';

      boxes.push(
        <TextInput
          key={i}
          ref={ref => inputRefs.current[i] = ref}
          style={[
            styles.codeInputBox,
            isFocused && styles.codeInputBoxFocused,
            isVerified && styles.codeInputBoxVerified,
            isError && styles.codeInputBoxError
          ]}
          value={digit}
          onChangeText={(text) => handleChangeText(text, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          onFocus={() => handleFocus(i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus={true}
          blurOnSubmit={false}
          caretHidden={false} // Show cursor for better UX
        />
      );
    }
    
    return boxes;
  };
  
  return (
    <View style={styles.container}>
      {isError && errorMessage ? (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      ) : null}
      <View style={styles.inputsRow}>
        {renderInputBoxes()}
      </View>
      {isVerified && (
        <View style={styles.successIconContainer}>
          <Icon
            name="check-circle-outline"
            size={24}
            color={theme.success}
          />
        </View>
      )}
    </View>
  );
});

export default CodeInput; 