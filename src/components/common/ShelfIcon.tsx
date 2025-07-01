// src/components/common/ShelfIcon.tsx
// Reusable hanger/shelf icon component with animations

import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';

export interface ShelfIconProps {
  /** Whether the item is in shelf */
  isInShelf?: boolean;
  /** Callback when shelf state is toggled */
  onToggle?: (isInShelf: boolean) => void;
  /** Size of the icon */
  size?: number;
  /** Color when in shelf */
  activeColor?: string;
  /** Color when not in shelf */
  inactiveColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Whether to show background circle */
  showBackground?: boolean;
  /** Icon style variant */
  variant?: 'hanger' | 'shelf' | 'minimal';
  /** Whether component is disabled */
  disabled?: boolean;
  /** Optional text label */
  label?: string;
  /** Custom style for container */
  style?: ViewStyle;
  /** Custom style for text */
  textStyle?: TextStyle;
  /** Whether to show success animation */
  showAnimation?: boolean;
  /** Hit slop for better touch targets */
  hitSlop?: { top: number; bottom: number; left: number; right: number };
}

const ShelfIcon: React.FC<ShelfIconProps> = ({
  isInShelf = false,
  onToggle,
  size = 20,
  activeColor = '#FF6347',
  inactiveColor = '#8E8E93',
  backgroundColor = 'rgba(0,0,0,0.6)',
  showBackground = true,
  variant = 'hanger',
  disabled = false,
  label,
  style,
  textStyle,
  showAnimation = true,
  hitSlop = { top: 10, bottom: 10, left: 10, right: 10 },
}) => {
  const [localIsInShelf, setLocalIsInShelf] = useState(isInShelf);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Update local state when prop changes
  useEffect(() => {
    setLocalIsInShelf(isInShelf);
  }, [isInShelf]);

  // Animation when state changes
  useEffect(() => {
    if (showAnimation) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [localIsInShelf, showAnimation]);

  const handlePress = () => {
    if (disabled) return;

    const newState = !localIsInShelf;
    setLocalIsInShelf(newState);
    onToggle?.(newState);
  };

  const getIconName = () => {
    switch (variant) {
      case 'shelf':
        return localIsInShelf ? 'bookshelf' : 'bookshelf';
      case 'minimal':
        return localIsInShelf ? 'bookmark' : 'bookmark-outline';
      case 'hanger':
      default:
        // Using a hanger-like icon - we'll use a clothing hanger icon
        return localIsInShelf ? 'hanger' : 'hanger';
    }
  };

  const getIconColor = () => {
    if (disabled) return inactiveColor;
    return localIsInShelf ? activeColor : inactiveColor;
  };

  const containerStyle: ViewStyle = [
    styles.container,
    showBackground && {
      backgroundColor,
      borderRadius: size / 2 + 4,
      padding: 6,
    },
    disabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      disabled={disabled}
      hitSlop={hitSlop}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Icon
          name={getIconName()}
          size={size}
          color={getIconColor()}
        />
      </Animated.View>
      
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: getIconColor(),
              fontSize: size * 0.6,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ShelfIcon;