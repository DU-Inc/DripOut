import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';

// Declare setTimeout to fix TypeScript error
declare const setTimeout: (callback: () => void, timeout: number) => number;

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

interface CollapsableSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  collapsedContent?: ReactNode;
  rightIcon?: ReactNode;
  style?: any;
  collapsedStyle?: any;
  zIndex?: number;
  titleStyle?: any;
  contentTextStyle?: any;
  isGlobalAnimating?: boolean;
  onAnimationStart?: () => void;
  onAnimationEnd?: () => void;
}

const CollapsableSection: React.FC<CollapsableSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
  collapsedContent,
  rightIcon,
  style,
  collapsedStyle,
  zIndex = 0,
  titleStyle,
  contentTextStyle,
  isGlobalAnimating = false,
  onAnimationStart,
  onAnimationEnd,
}) => {
  const [isLocalAnimating, setIsLocalAnimating] = useState(false);
  
  const toggleSection = () => {
    if (isGlobalAnimating || isLocalAnimating) return;
    
    setIsLocalAnimating(true);
    if (onAnimationStart) onAnimationStart();
    
    LayoutAnimation.configureNext({
      duration: 350,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
        property: LayoutAnimation.Properties.scaleXY,
      },
    });
    
    onToggle();
    
    setTimeout(() => {
      setIsLocalAnimating(false);
      if (onAnimationEnd) onAnimationEnd();
    }, 400);
  };

  if (isExpanded) {
    return (
      <View style={[styles.container, style]}>
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.collapsedContainer, collapsedStyle, { zIndex }]} 
      onPress={toggleSection}
      activeOpacity={0.8}
    >
      <Text style={[styles.collapsedTitle, contentTextStyle]} numberOfLines={1} ellipsizeMode="tail">
        {collapsedContent || title}
      </Text>
      {rightIcon || <Icon name="pencil" size={normalize(18)} color="#388E3C" />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  collapsedContainer: {
    paddingVertical: normalize(14),
    paddingHorizontal: normalize(15),
    borderBottomWidth: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'transparent',
    borderTopLeftRadius: normalize(5),
    borderTopRightRadius: normalize(5),
    borderBottomLeftRadius: normalize(18),
    borderBottomRightRadius: normalize(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: normalize(8),
    position: 'relative',
    width: '95%',
    minHeight: normalize(45),
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    // Generic shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  collapsedTitle: {
    color: '#212121',
    fontSize: normalize(14),
    fontWeight: '500',
    flex: 1, // Allow text to take available space
  }
});

// Create a version that uses theme props
export const createThemedCollapsableSection = (theme: ThemeColors) => {
  const ThemedCollapsableSection: React.FC<CollapsableSectionProps> = (props) => {
    const themedStyles = StyleSheet.create({
      collapsedContainer: {
        ...styles.collapsedContainer,
        borderColor: theme.background,
        borderBottomColor: theme.primary,
        backgroundColor: theme.background,
        ...theme.elevation.light,
        opacity: 1, // Ensure not dimmed
        paddingTop: normalize(16), // Increase top padding for more space above title
        paddingBottom: normalize(12), // Adjust bottom padding
      },
      collapsedTitle: {
        ...styles.collapsedTitle,
        color: theme.text.primary,
        fontSize: normalize(14),
        fontWeight: '500',
        paddingVertical: normalize(2), // Add a bit of spacing
        marginTop: normalize(4), // Add more margin above title text
      },
      contentText: {
        color: theme.text.primary,
        fontSize: normalize(14),
      }
    });

    return (
      <CollapsableSection 
        {...props} 
        collapsedStyle={[themedStyles.collapsedContainer, props.collapsedStyle]}
        contentTextStyle={themedStyles.contentText}
        titleStyle={themedStyles.collapsedTitle}
      />
    );
  };

  return ThemedCollapsableSection;
};

export default CollapsableSection; 