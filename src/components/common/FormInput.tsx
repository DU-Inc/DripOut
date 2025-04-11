import React, { useState, ReactNode, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type FormInputProps = TextInputProps & {
  error?: string;
  isValid?: boolean;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  inputContainerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  value?: string;
  placeholder?: string;
  disableAnimation?: boolean;
};

const FormInput: React.FC<FormInputProps> = ({
  error,
  isValid,
  rightIcon,
  containerStyle,
  inputStyle,
  errorStyle,
  inputContainerStyle,
  labelStyle,
  value,
  placeholder,
  disableAnimation = false,
  ...props
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const styles = StyleSheet.create({
    outerContainer: {
      marginBottom: 16,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      minHeight: 56,
      position: 'relative',
      backgroundColor: theme.background,
    },
    input: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 0,
      paddingHorizontal: 0,
      marginTop: 8,
      marginBottom: 8,
    },
    iconStyle: {
      marginLeft: 8,
    },
    error: {
      fontSize: 12,
      marginTop: 4,
    },
  });

  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const isFloating = disableAnimation ? true : (isFocused || !!value);

  useEffect(() => {
    if (disableAnimation) {
      labelAnim.setValue(1);
    }
  }, [disableAnimation]);

  useEffect(() => {
    if (disableAnimation) {
      return;
    }
    
    Animated.timing(labelAnim, {
      toValue: isFloating ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [isFloating, labelAnim, disableAnimation]);

  const staticLabelStyle = {
    position: 'absolute',
    left: 12,
    top: -8,
    fontSize: 12,
    color: theme.text.secondary,
    backgroundColor: theme.background,
    paddingHorizontal: 4,
    zIndex: 1,
  };

  const animatedLabelStyle = disableAnimation 
    ? staticLabelStyle 
    : {
        position: 'absolute',
        left: 12,
        top: labelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, -8],
        }),
        fontSize: labelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 12],
        }),
        color: labelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [theme.text.tertiary, theme.text.secondary],
        }),
        backgroundColor: theme.background,
        paddingHorizontal: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 4],
        }),
        zIndex: labelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        }),
      };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (props.onBlur) props.onBlur(e);
  };
  
  const focusInput = () => {
    inputRef.current?.focus();
  };

  const borderColor = error
    ? theme.error
    : isFocused
    ? theme.primary
    : theme.border;
  const borderWidth = isFocused || error ? 1.5 : 1;

  return (
    <View style={[styles.outerContainer, containerStyle]}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={focusInput} 
        style={[styles.inputContainer, { borderColor: borderColor, borderWidth: borderWidth }, inputContainerStyle]}
      >
        {placeholder && (
          <Animated.Text style={[animatedLabelStyle as any, labelStyle]}>
            {placeholder}
          </Animated.Text>
        )}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: theme.text.primary },
            inputStyle,
          ]}
          value={value}
          placeholder=""
          placeholderTextColor={theme.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon ? (
          rightIcon
        ) : error ? (
          <Icon
            name="alert-circle-outline"
            size={18}
            color={theme.error}
            style={styles.iconStyle}
          />
        ) : (isValid && isFocused || (isValid && value)) ? (
          <Icon
            name="check-circle-outline"
            size={18}
            color={theme.success}
            style={styles.iconStyle}
          />
        ) : null }
      </TouchableOpacity>
    </View>
  );
};

export default FormInput; 