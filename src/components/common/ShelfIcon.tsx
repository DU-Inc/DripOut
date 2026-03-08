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
  /** Background color when active */
  activeBackgroundColor?: string;
  /** Background color when inactive */
  inactiveBackgroundColor?: string;
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
  /** Whether the user is a guest (disables animations and state updates) */
  isGuest?: boolean;
}

const ShelfIcon: React.FC<ShelfIconProps> = ({
  isInShelf = false,
  onToggle,
  size = 20,
  activeColor = '#FF6347',
  inactiveColor = '#8E8E93',
  activeBackgroundColor = '#FF6347',
  inactiveBackgroundColor = 'rgba(0,0,0,0.1)',
  showBackground = true,
  variant = 'hanger',
  disabled = false,
  label,
  style,
  textStyle,
  showAnimation = true,
  hitSlop = { top: 10, bottom: 10, left: 10, right: 10 },
  isGuest = false,
}) => {
  const [localIsInShelf, setLocalIsInShelf] = useState(isInShelf);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Update local state when prop changes
  useEffect(() => {
    setLocalIsInShelf(isInShelf);
  }, [isInShelf]);

  // Animation when state changes (disabled for guests)
  useEffect(() => {
    if (showAnimation && !isGuest) {
      // Scale and opacity animation only (background color handled by state)
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
  }, [localIsInShelf, showAnimation, isGuest, scaleAnim, opacityAnim]);

  const handlePress = () => {
    if (disabled) return;

    const newState = !localIsInShelf;
    
    // Only update local state if user is not a guest
    if (!isGuest) {
      setLocalIsInShelf(newState);
    }
    
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

  // Get background color based on state (no animation to avoid conflicts)
  const getBackgroundColor = () => {
    return localIsInShelf ? activeBackgroundColor : inactiveBackgroundColor;
  };

  const containerStyle: ViewStyle = [
    styles.container,
    showBackground && {
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
          showBackground && {
            backgroundColor: getBackgroundColor(),
            borderRadius: size / 2 + 4,
            padding: 6,
          },
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