/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Text,
  ViewStyle,
  TextStyle,
  Platform,
  InteractionManager,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../../styles/theme/colors';

export type SubAction = {
  /** Unique ID for the sub-action */
  id: string;
  /** Icon component or element to display */
  icon: React.ReactNode;
  /** Label for the sub-action (accessibility and optional display) */
  label: string;
  /** Optional background color for this specific button */
  backgroundColor?: string;
  /** Optional color for this specific button */
  iconColor?: string;
  /** Optional callback function when this action is clicked */
  onClick?: () => void;
};

export type ContentActionProps = {
  /** Array of sub-actions to display when expanded */
  actions: SubAction[];
  /** Direction of the expansion animation */
  expansionMode?: 'arch' | 'vertical';
  /** Primary icon to show in collapsed state */
  primaryIcon?: React.ReactNode;
  /** Size of the primary button (in pixels) */
  size?: number;
  /** Size of sub-action buttons (in pixels) */
  subActionSize?: number;
  /** Primary background color */
  backgroundColor?: string;
  /** Primary icon color */
  iconColor?: string;
  /** Space between sub-actions (in pixels) */
  spacing?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Curvature of the arch (higher = more curved, 0-1) */
  archCurvature?: number;
  /** Whether to expand in reverse direction */
  reverseDirection?: boolean;
  /** Whether to show long labels next to sub-actions */
  showLabels?: boolean;
  /** Label text color */
  labelColor?: string;
  /** Optional additional className */
  style?: ViewStyle;
  /** Callback when expanded state changes */
  onExpandChange?: (isExpanded: boolean) => void;
  /** Control expanded state externally */
  isActive?: boolean;
  /** Is dark mode enabled */
  isDarkMode?: boolean;
};

const ContentAction: React.FC<ContentActionProps> = ({
  actions = [],
  expansionMode = 'vertical',
  primaryIcon,
  size = 40,
  subActionSize = 32,
  backgroundColor,
  iconColor,
  spacing = 16,
  animationDuration = 150,
  archCurvature = 0.5,
  reverseDirection = false,
  showLabels = false,
  labelColor,
  style,
  onExpandChange,
  isActive,
  isDarkMode = true,
}) => {
  // Get theme colors
  const theme = isDarkMode ? colors.dark : colors.light;
  
  // Default iconColor to theme text color if not provided
  const finalIconColor = iconColor || theme.text.primary;
  // Default labelColor to theme text color if not provided
  const finalLabelColor = labelColor || theme.text.primary;
  
  // Use internal state only if isActive is not provided
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  
  // Determine whether menu is expanded based on external or internal state
  const isExpanded = isActive !== undefined ? isActive : internalIsExpanded;
  
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{action: SubAction, index: number} | null>(null);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Animation refs for sub-actions
  const subActionAnims = useRef<{
    scale: Animated.Value;
    opacity: Animated.Value;
    translateY: Animated.Value;
  }[]>([]);
  
  // For cleanup and tracking animations
  const interactionRef = useRef<any>(null);
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  
  // Limit the number of actions to 3
  const limitedActions = actions.slice(0, 3);
  
  // Ensure animation refs are created for all actions
  useEffect(() => {
    // Initialize animation refs for each sub-action
    subActionAnims.current = limitedActions.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }));
    
    // Cleanup function for component unmount
    return () => {
      // Stop all running animations
      animationsRef.current.forEach(anim => anim.stop());
      animationsRef.current = [];
      
      // Cancel any pending interactions
      if (interactionRef.current) {
        interactionRef.current.cancel();
      }
    };
  }, [actions, limitedActions]);
  
  // Helper to store and track animations
  const trackAnimation = (animation: Animated.CompositeAnimation) => {
    animationsRef.current.push(animation);
    // Return the animation so it can be started
    return animation;
  };
  
  // Clear existing animations before starting new ones
  const clearAnimations = () => {
    animationsRef.current.forEach(anim => anim.stop());
    animationsRef.current = [];
  };
  
  // Update animations when isExpanded changes (from either internal or external control)
  useEffect(() => {
    // Clear any running animations before starting new ones
    clearAnimations();
    
    if (isExpanded) {
      setAreSubActionsVisible(true);
      
      // Reset animation values when closed
      subActionAnims.current.forEach((anim) => {
        anim.scale.setValue(0);
        anim.opacity.setValue(0);
        anim.translateY.setValue(0);
      });
      
      // Animate primary button - make it faster
      const primaryAnimation = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: animationDuration * 0.2,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: animationDuration * 0.1,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]);
      
      trackAnimation(primaryAnimation).start();
      
      // Animate sub-actions
      limitedActions.forEach((_, index) => {
        const offset = -(spacing + subActionSize) * (index + 1);
        const delay = index * (animationDuration * 0.05);
        
        // Animate position and opacity
        const subActionAnimation = Animated.parallel([
          Animated.timing(subActionAnims.current[index].translateY, {
            toValue: offset,
            duration: animationDuration,
            delay: delay,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.timing(subActionAnims.current[index].scale, {
            toValue: 1,
            duration: animationDuration,
            delay: delay,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.timing(subActionAnims.current[index].opacity, {
            toValue: 1,
            duration: animationDuration * 0.4,
            delay: delay,
            useNativeDriver: true,
          }),
        ]);
        
        trackAnimation(subActionAnimation).start();
      });
    } else {
      // Animate button back to normal
      const primaryAnimation = Animated.timing(scaleAnim, {
        toValue: 1,
        duration: animationDuration * 0.15,
        useNativeDriver: true,
      });
      
      trackAnimation(primaryAnimation).start();
      
      // Hide sub-actions
      limitedActions.forEach((_, index) => {
        const subActionAnimation = Animated.parallel([
          Animated.timing(subActionAnims.current[index].scale, {
            toValue: 0,
            duration: animationDuration * 0.2,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
          }),
          Animated.timing(subActionAnims.current[index].opacity, {
            toValue: 0,
            duration: animationDuration * 0.2,
            useNativeDriver: true,
          }),
        ]);
        
        trackAnimation(subActionAnimation).start();
      });
      
      // Delay hiding sub-actions to allow the fade animation to complete
      if (interactionRef.current) {
        interactionRef.current.cancel();
      }
      
      // Shorter delay for hiding sub-actions
      interactionRef.current = InteractionManager.runAfterInteractions(() => {
        // Direct state update instead of setTimeout
        setAreSubActionsVisible(false);
      });
    }
    
    // Clean up animations when the effect is re-run or when component unmounts
    return () => {
      if (interactionRef.current) {
        interactionRef.current.cancel();
      }
    };
  }, [isExpanded, animationDuration, spacing, subActionSize, limitedActions]);
  
  // Handle the timeout for action click
  useEffect(() => {
    if (pendingAction) {
      // Cancel any existing interaction
      if (interactionRef.current) {
        interactionRef.current.cancel();
      }
      
      // Execute the click action more quickly
      interactionRef.current = InteractionManager.runAfterInteractions(() => {
        // Update internal state if isActive is not provided
        if (isActive === undefined) {
          setInternalIsExpanded(false);
        }
        
        // Notify parent component
        if (onExpandChange) {
          onExpandChange(false);
        }
        
        setActiveIndex(null);
        
        if (pendingAction.action.onClick) {
          pendingAction.action.onClick();
        }
        
        // Reset the pending action
        setPendingAction(null);
      });
      
      // Cleanup function
      return () => {
        if (interactionRef.current) {
          interactionRef.current.cancel();
        }
      };
    }
  }, [pendingAction, isActive, onExpandChange]);
  
  // Toggle expanded state
  const toggleExpand = () => {
    const newState = !isExpanded;
    
    // Update internal state if isActive is not provided
    if (isActive === undefined) {
      setInternalIsExpanded(newState);
    }
    
    // Notify parent component
    if (onExpandChange) {
      onExpandChange(newState);
    }
    
    // Reset any active index when opening menu
    if (newState === true) {
      setActiveIndex(null);
    }
  };
  
  // Handle pressing on a sub-action
  const handleSubActionPress = (action: SubAction, index: number) => {
    // Clear any running animations first
    clearAnimations();
    
    setActiveIndex(index);
    
    // Animate the pressed action - faster feedback
    const pressAnimation = Animated.sequence([
      Animated.timing(subActionAnims.current[index].scale, {
        toValue: 1.2,
        duration: animationDuration * 0.05,
        useNativeDriver: true,
      }),
      Animated.timing(subActionAnims.current[index].scale, {
        toValue: 0.95,
        duration: animationDuration * 0.05,
        useNativeDriver: true,
      }),
    ]);
    
    trackAnimation(pressAnimation).start();
    
    // Set the pending action - this will trigger the useEffect
    setPendingAction({ action, index });
    
    // Hide all sub-actions - faster collapse
    limitedActions.forEach((_, i) => {
      const hideAnimation = Animated.parallel([
        Animated.timing(subActionAnims.current[i].scale, {
          toValue: 0,
          duration: animationDuration * 0.15,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(subActionAnims.current[i].opacity, {
          toValue: 0,
          duration: animationDuration * 0.15,
          useNativeDriver: true,
        }),
      ]);
      
      trackAnimation(hideAnimation).start();
    });
    
    // Always ensure we reset expanded state in our component
    if (isActive === undefined) {
      setInternalIsExpanded(false);
    }
  };
  
  // Default horizontal dots icon if not expanded
  const horizontalDotsIcon = (
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
      <Circle cx="6" cy="12" r="2" fill={finalIconColor} />
      <Circle cx="12" cy="12" r="2" fill={finalIconColor} />
      <Circle cx="18" cy="12" r="2" fill={finalIconColor} />
    </Svg>
  );
  
  // Vertical dots icon when expanded
  const verticalDotsIcon = (
    <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
      <Circle cx="12" cy="6" r="2" fill={finalIconColor} />
      <Circle cx="12" cy="12" r="2" fill={finalIconColor} />
      <Circle cx="12" cy="18" r="2" fill={finalIconColor} />
    </Svg>
  );
  
  // Choose icon based on expanded state
  const defaultMoreIcon = isExpanded ? verticalDotsIcon : horizontalDotsIcon;

  // Create themed sub-actions with proper colors - ALWAYS use transparent backgrounds
  const themedSubActions = limitedActions.map(action => {
    return {
      ...action,
      backgroundColor: 'transparent', // Always use transparent backgrounds
      iconColor: action.iconColor || finalIconColor
    };
  });

  // Visibility state for sub-actions
  const [areSubActionsVisible, setAreSubActionsVisible] = useState(false);
  
  // Calculate positions for sub-actions
  const getSubActionPosition = (index: number) => {
    return {
      bottom: (spacing + subActionSize) * (index + 1),
    };
  };

  return (
    <View style={[styles.container, { zIndex: 9 }, style]}>
      {/* Primary action button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: 'transparent', // Always transparent background
            zIndex: 105,
          }
        ]}
        activeOpacity={0.7}
        onPress={toggleExpand}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {primaryIcon || defaultMoreIcon}
        </Animated.View>
      </TouchableOpacity>
      
      {/* Sub-action buttons - vertically stacked */}
      {areSubActionsVisible && themedSubActions.map((action, index) => {
        const position = getSubActionPosition(index);
        
        return (
          <View
            key={action.id}
            style={[
              styles.subActionContainer, 
              { 
                bottom: position.bottom,
                zIndex: 104 - index, // Lower z-index but still stacked correctly
              }
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSubActionPress(action, index)}
              style={[
                styles.subActionButton,
                {
                  width: subActionSize,
                  height: subActionSize,
                  borderRadius: subActionSize / 2,
                  backgroundColor: 'transparent', // Always transparent background
                  borderWidth: 0, // Remove border
                }
              ]}
            >
              {action.icon}
              
              {/* Optional label */}
              {showLabels && (
                <View 
                  style={[
                    styles.label,
                    { 
                      left: subActionSize + 4,
                      backgroundColor: isDarkMode ? '#333333' : '#FFFFFF' // Keep label bg
                    }
                  ]}
                >
                  <Text style={[styles.labelText, { color: finalLabelColor }]}>
                    {action.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 105,
    position: 'absolute',
    shadowColor: 'transparent', // Remove shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0, // Remove elevation
  },
  subActionContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
    zIndex: 104,
    backgroundColor: 'transparent',
  },
  subActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 103,
    shadowColor: 'transparent', // Remove shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0, // Remove elevation
    borderWidth: 0,
    borderColor: 'transparent',
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    top: '50%',
    transform: [{ translateY: -10 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 102,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ContentAction;
