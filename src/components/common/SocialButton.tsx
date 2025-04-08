import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from "../../styles/theme/ThemeContext";
import { createButtonStyles } from '../../styles/common/button.styles';
import { SocialButtonProps } from '../../types/common';

type SocialProviderProps = {
  provider: 'google' | 'apple' | 'pinterest';
  onPress: () => void;
  style?: any;
};

const SocialButton: React.FC<SocialProviderProps> = ({ provider, onPress, style }) => {
  const { theme, isDarkMode } = useTheme();
  const styles = createButtonStyles(theme);

  const getIconName = () => {
    switch (provider) {
      case 'google':
        return 'google';
      case 'apple':
        return 'apple';
      case 'pinterest':
        return 'pinterest';
      default:
        return 'account';
    }
  };

  const getIconColor = () => {
    switch (provider) {
      case 'google':
        return '#DB4437';
      case 'apple':
        return isDarkMode ? '#FFFFFF' : '#000000';
      case 'pinterest':
        return '#E60023';
      default:
        return theme.text.primary;
    }
  };

  const iconName = getIconName();
  const iconColor = getIconColor();

  return (
    <TouchableOpacity
      style={[styles.socialButton, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {iconName && <Icon name={iconName} size={24} color={iconColor} />}
    </TouchableOpacity>
  );
};

export default SocialButton; 