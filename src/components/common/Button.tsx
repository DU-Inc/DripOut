import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from "../../styles/theme/ThemeContext";
import { createButtonStyles } from '../../styles/common/button.styles';
import { ButtonProps } from '../../types/common';

const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  style,
  textStyle,
  icon,
  loading = false,
  disabled = false,
  outline = false,
  secondary = false,
}) => {
  const { theme } = useTheme();
  const styles = createButtonStyles(theme);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        outline && styles.outline,
        secondary && styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {icon && icon}
      
      {loading ? (
        <ActivityIndicator color={outline ? theme.primary : theme.text.onPrimary} style={styles.loading} />
      ) : (
        <Text style={[
          styles.text, 
          outline && styles.outlineText,
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default Button; 