/**
 * Enhanced Style Bubbles Component
 * Advanced bubble physics with lateral scrolling, wind forces, and Apple Music-style selection
 * Specifically designed for style selection with all styles visible simultaneously
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useTheme } from '../../styles/themeprovider';
import { useOnboardingContext } from '../../context/OnboardingContext';

interface BubbleItem {
  id: string;
  text: string;
  size: number;
  position: Animated.ValueXY;
  opacity: Animated.Value;
  scale: Animated.Value;
  velocity: {
    x: number;
    y: number;
  };
  windForce: {
    x: number;
    y: number;
  };
  isSelected: boolean;
}

interface EnhancedStyleBubblesProps {
  options: string[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced physics constants - CALMED DOWN for better UX
const PHYSICS_CONTAINER_WIDTH = screenWidth * 2.5; // Extended width for scrolling
const PHYSICS_CONTAINER_HEIGHT = screenHeight * 0.5; // Height for bubble area
const DAMPING = 0.88; // Much stronger damping (was 0.98)
const GRAVITY = 0.03; // Subtle gravity (was 0.1)
const REPULSION_STRENGTH = 5; // Gentler repulsion (was 15)
const MIN_FORCE_DISTANCE = 100; // Smaller interaction range (was 120)
const BASE_SPEED = 20; // Much slower movement (was 60)
const WIND_DECAY_RATE = 0.92; // Faster wind decay (was 0.95)
const MAX_WIND_FORCE = 3; // Weaker wind forces (was 8)

const EnhancedStyleBubblesBase: React.FC<EnhancedStyleBubblesProps> = ({ options }) => {
  const { isDarkMode, theme } = useTheme();
  const { selectedStyles, addStyle, removeStyle } = useOnboardingContext();
  
  // Refs for physics and animation
  const bubblesRef = useRef<BubbleItem[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef(Date.now());
  const containerRef = useRef<View>(null);
  const scrollOffsetRef = useRef(new Animated.Value(0));
  const containerTranslateX = useRef(new Animated.Value(0)); // For actual scrolling
  const gestureVelocityRef = useRef({ x: 0, y: 0 });
  
  // State for rendering  
  const [containerInitialized, setContainerInitialized] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render when needed

  // Helper functions for animated values
  const getValueX = (position: Animated.ValueXY): number => {
    return (position.x as any)._value || 0;
  };

  const getValueY = (position: Animated.ValueXY): number => {
    return (position.y as any)._value || 0;
  };

  // Memoized bubble size calculation to prevent expensive recalculation
  const calculateBubbleSize = React.useCallback((text: string): number => {
    const baseSize = 85;
    const maxSize = 120;
    const minSize = 70;
    
    // Adjust size based on text length
    const lengthFactor = Math.max(0.8, 1 - (text.length - 6) * 0.02);
    const size = baseSize * lengthFactor;
    
    return Math.max(minSize, Math.min(maxSize, size));
  }, []);

  // Generate new bubble with enhanced positioning
  const generateBubble = (text: string): BubbleItem => {
    const size = calculateBubbleSize(text);
    const margin = size / 2 + 10;
    
    // Enhanced positioning algorithm for wider container
    const availableWidth = PHYSICS_CONTAINER_WIDTH - (margin * 2);
    const availableHeight = PHYSICS_CONTAINER_HEIGHT - (margin * 2);
    
    // Use grid-based positioning with randomization
    const gridCols = 5;
    const gridRows = 4;
    const cellWidth = availableWidth / gridCols;
    const cellHeight = availableHeight / gridRows;
    
    // Find best position with spacing
    let bestX = margin + Math.random() * availableWidth;
    let bestY = margin + Math.random() * availableHeight;
    let bestDistance = 0;
    
    // Try multiple positions and pick the one with most space
    for (let attempts = 0; attempts < 20; attempts++) {
      const gridX = Math.floor(Math.random() * gridCols);
      const gridY = Math.floor(Math.random() * gridRows);
      
      const testX = margin + gridX * cellWidth + Math.random() * cellWidth;
      const testY = margin + gridY * cellHeight + Math.random() * cellHeight;
      
      // Calculate minimum distance to existing bubbles
      let minDistance = Number.MAX_VALUE;
      for (const bubble of bubblesRef.current) {
        const bubbleX = getValueX(bubble.position);
        const bubbleY = getValueY(bubble.position);
        const dx = testX - bubbleX;
        const dy = testY - bubbleY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
      
      if (minDistance > bestDistance) {
        bestDistance = minDistance;
        bestX = testX;
        bestY = testY;
      }
    }
    
    // Create bubble with physics properties
    const bubble: BubbleItem = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      size,
      position: new Animated.ValueXY({ x: bestX, y: bestY }),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      velocity: {
        x: (Math.random() - 0.5) * 0.5, // Much smaller initial velocity (was * 2)
        y: (Math.random() - 0.5) * 0.5  // Much smaller initial velocity (was * 2)
      },
      windForce: {
        x: 0,
        y: 0
      },
      isSelected: selectedStyles.includes(text)
    };
    
    return bubble;
  };

  // Initialize all bubbles at once (no queue system)
  const initializeBubbles = () => {
    if (containerInitialized && options.length > 0 && bubblesRef.current.length === 0) {
      console.log('🔵 Initializing bubbles:', options.length);
      const newBubbles = options.map(option => generateBubble(option));
      bubblesRef.current = newBubbles;
      
      // Force re-render to show bubbles (without setState array copying)
      setRenderTrigger(prev => prev + 1);
      
      // Animate bubbles into view with longer delays for stability
      newBubbles.forEach((bubble, index) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(bubble.opacity, {
              toValue: 1,
              duration: 600, // Slower entrance (was 400)
              useNativeDriver: true,
              easing: Easing.out(Easing.quad)
            }),
            Animated.spring(bubble.scale, {
              toValue: bubble.isSelected ? 1.3 : 1.0,
              useNativeDriver: true,
              tension: 80, // Gentler spring (was 120)
              friction: 12  // More friction (was 8)
            })
          ]).start();
        }, index * 200); // Longer delays (was 100)
      });
      
      // Start physics simulation
      startPhysicsSimulation();
    }
  };

  // Enhanced physics simulation with wind forces
  const startPhysicsSimulation = () => {
    const animate = () => {
      const currentTime = Date.now();
      const targetFPS = 30; // Reduced from implied 60fps for calmer movement
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 1/targetFPS);
      lastTimeRef.current = currentTime;
      
      // Update each bubble's physics
      for (const bubble of bubblesRef.current) {
        if (!bubble.position) continue;
        
        const x = getValueX(bubble.position);
        const y = getValueY(bubble.position);
        let vx = bubble.velocity.x;
        let vy = bubble.velocity.y;
        
        // Apply damping
        vx *= DAMPING;
        vy *= DAMPING;
        
        // Apply wind forces
        vx += bubble.windForce.x;
        vy += bubble.windForce.y;
        
        // Decay wind forces
        bubble.windForce.x *= WIND_DECAY_RATE;
        bubble.windForce.y *= WIND_DECAY_RATE;
        
        // Apply gravity (gentle downward force)
        vy += GRAVITY;
        
        // Boundary forces (enhanced for wider container)
        const margin = bubble.size / 2;
        const leftBound = margin;
        const rightBound = PHYSICS_CONTAINER_WIDTH - margin;
        const topBound = margin;
        const bottomBound = PHYSICS_CONTAINER_HEIGHT - margin;
        
        // Very gentle boundary repulsion
        if (x < leftBound) vx += (leftBound - x) * 0.1; // Gentler (was 0.2)
        if (x > rightBound) vx -= (x - rightBound) * 0.1; // Gentler (was 0.2)
        if (y < topBound) vy += (topBound - y) * 0.1; // Gentler (was 0.2)
        if (y > bottomBound) vy -= (y - bottomBound) * 0.1; // Gentler (was 0.2)
        
        // Bubble-to-bubble repulsion
        for (const otherBubble of bubblesRef.current) {
          if (otherBubble.id === bubble.id) continue;
          
          const otherX = getValueX(otherBubble.position);
          const otherY = getValueY(otherBubble.position);
          const dx = otherX - x;
          const dy = otherY - y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          if (dist < MIN_FORCE_DISTANCE && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const force = REPULSION_STRENGTH * (MIN_FORCE_DISTANCE - dist) / MIN_FORCE_DISTANCE;
            
            vx -= nx * force;
            vy -= ny * force;
          }
        }
        
        // Cap velocity for stability (prevent erratic movement)
        const maxVelocity = 3; // Maximum velocity limit
        vx = Math.max(-maxVelocity, Math.min(maxVelocity, vx));
        vy = Math.max(-maxVelocity, Math.min(maxVelocity, vy));
        
        // Update position
        const newX = x + vx * deltaTime * BASE_SPEED;
        const newY = y + vy * deltaTime * BASE_SPEED;
        
        bubble.position.setValue({ x: newX, y: newY });
        bubble.velocity.x = vx;
        bubble.velocity.y = vy;
      }
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle pan gesture - separate horizontal scroll from vertical wind
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: containerTranslateX.current } }],
    { 
      useNativeDriver: true, // Use native driver for better performance
      listener: (event: any) => {
        const { velocityX = 0, velocityY = 0, translationX = 0, translationY = 0 } = event.nativeEvent;
        
        // Store velocities for state change handler
        gestureVelocityRef.current = { x: velocityX, y: velocityY };
        
        // Determine gesture direction - horizontal vs vertical
        const absVelX = Math.abs(velocityX);
        const absVelY = Math.abs(velocityY);
        const isHorizontalGesture = absVelX > absVelY * 1.5; // Bias toward horizontal
        
        if (isHorizontalGesture) {
          // Handle horizontal scrolling with boundaries
          const maxScroll = -(PHYSICS_CONTAINER_WIDTH - screenWidth);
          const clampedX = Math.max(maxScroll, Math.min(0, translationX));
          
          // Apply clamped translation for smooth scrolling
          containerTranslateX.current.setValue(clampedX);
          console.log('🔄 Scrolling to:', clampedX);
        } else {
          // For vertical gestures, apply wind forces in real-time
          if (absVelY > 200) { // Higher threshold for more intentional gestures
            applyVerticalWindForce(velocityY);
          }
        }
      }
    }
  );

  const onHandlerStateChange = (event: any) => {
    const { state, velocityX, velocityY } = event.nativeEvent;
    
    if (state === State.END) {
      const absVelX = Math.abs(velocityX);
      const absVelY = Math.abs(velocityY);
      const isHorizontalGesture = absVelX > absVelY * 1.5;
      
      if (isHorizontalGesture) {
        // Add momentum scrolling for horizontal gestures
        const maxScroll = -(PHYSICS_CONTAINER_WIDTH - screenWidth);
        
        Animated.decay(containerTranslateX.current, {
          velocity: velocityX,
          deceleration: 0.997,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // Ensure we stay within bounds after momentum ends
          const currentValue = (containerTranslateX.current as any)._value;
          const clampedValue = Math.max(maxScroll, Math.min(0, currentValue));
          
          if (clampedValue !== currentValue) {
            Animated.spring(containerTranslateX.current, {
              toValue: clampedValue,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        });
      } else if (absVelY > 200) {
        // Apply final wind force for vertical gestures only
        applyVerticalWindForce(velocityY);
      }
    }
  };

  // Apply vertical wind force to all bubbles (for vertical swipes only)
  const applyVerticalWindForce = (velocityY: number) => {
    const windStrength = Math.min(Math.abs(velocityY) / 2000, MAX_WIND_FORCE);
    
    if (windStrength > 0.3) { // Higher threshold for activation
      bubblesRef.current.forEach(bubble => {
        // Only apply vertical forces, no horizontal
        const forceY = (velocityY / 2000) * windStrength * 0.05; // Much gentler force
        bubble.windForce.y += forceY;
        
        // No horizontal wind force to avoid interfering with scrolling
        // bubble.windForce.x remains unchanged
      });
    }
  };

  // Handle bubble selection (Apple Music style) - NO RE-RENDER
  const handleBubbleSelect = (bubble: BubbleItem) => {
    const isCurrentlySelected = selectedStyles.includes(bubble.text);
    console.log('🎯 Bubble selected:', bubble.text, 'was selected:', isCurrentlySelected);
    
    // Update context immediately (this handles persistence)
    if (isCurrentlySelected) {
      removeStyle(bubble.text);
      bubble.isSelected = false;
      console.log('🟡 Removed style:', bubble.text);
    } else {
      addStyle(bubble.text);
      bubble.isSelected = true;
      console.log('🟢 Added style:', bubble.text);
    }
    
    // Apple Music style scale animation - gentler animation
    Animated.spring(bubble.scale, {
      toValue: bubble.isSelected ? 1.3 : 1.0,
      useNativeDriver: true,
      tension: 100, // Gentler spring (was 150)
      friction: 10   // More friction (was 8)
    }).start();
    
    console.log('🔵 Total selected styles:', selectedStyles.length + (bubble.isSelected ? 1 : -1));
    
    // DO NOT call setBubblesList() - this prevents re-render chaos
    // The visual state is managed by the individual bubble's animated scale
    // Context updates handle the data persistence
  };

  // Initialize bubbles when container is ready (only once)
  useEffect(() => {
    console.log('🟢 Effect triggered - containerInitialized:', containerInitialized, 'bubbles exist:', bubblesRef.current.length > 0);
    initializeBubbles();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [containerInitialized]); // Remove options dependency to prevent re-initialization

  // Sync with context changes - NO RE-RENDER
  useEffect(() => {
    console.log('🔄 Context sync triggered - selectedStyles:', selectedStyles);
    let syncChanges = 0;
    
    bubblesRef.current.forEach(bubble => {
      const shouldBeSelected = selectedStyles.includes(bubble.text);
      if (bubble.isSelected !== shouldBeSelected) {
        console.log('🔄 Syncing bubble:', bubble.text, 'to selected:', shouldBeSelected);
        bubble.isSelected = shouldBeSelected;
        syncChanges++;
        
        Animated.spring(bubble.scale, {
          toValue: shouldBeSelected ? 1.3 : 1.0,
          useNativeDriver: true,
          tension: 100, // Gentler spring
          friction: 10   // More friction
        }).start();
      }
    });
    
    console.log('🔄 Context sync complete - changes made:', syncChanges);
    // DO NOT call setBubblesList() - avoid re-render chaos
    // Individual bubble animations handle the visual updates
  }, [selectedStyles]);

  const onContainerLayout = () => {
    setContainerInitialized(true);
  };

  // Memoized font size calculation to prevent recalculation on every render
  const getOptimalFontSize = React.useCallback((text: string, bubbleSize: number): number => {
    const baseSize = bubbleSize * 0.16;
    const lengthFactor = Math.max(0.75, 1 - (text.length - 8) * 0.025);
    return Math.max(11, Math.min(18, baseSize * lengthFactor));
  }, []);

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View style={[
          styles.physicsContainer, 
          { 
            width: PHYSICS_CONTAINER_WIDTH,
            transform: [{ translateX: containerTranslateX.current }]
          }
        ]}>
          {/* Render trigger ensures component updates when bubbles are added/removed */}
          {renderTrigger >= 0 && bubblesRef.current.map((bubble) => (
            <Animated.View
              key={bubble.id}
              style={[
                styles.bubble,
                {
                  width: bubble.size,
                  height: bubble.size,
                  borderRadius: bubble.size / 2,
                  backgroundColor: bubble.isSelected 
                    ? theme.primary + '20'
                    : (isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(242, 242, 247, 0.8)'),
                  borderColor: bubble.isSelected 
                    ? theme.primary 
                    : (isDarkMode ? '#3A3A3C' : '#E5E5EA'),
                  borderWidth: bubble.isSelected ? 2 : 1,
                  transform: [
                    { translateX: bubble.position.x },
                    { translateY: bubble.position.y },
                    { scale: bubble.scale }
                  ],
                  opacity: bubble.opacity,
                  shadowColor: bubble.isSelected ? theme.primary : '#000',
                  shadowOpacity: bubble.isSelected ? 0.3 : 0.1,
                  shadowRadius: bubble.isSelected ? 8 : 4,
                  elevation: bubble.isSelected ? 8 : 4,
                }
              ]}
            >
              <TouchableOpacity
                style={styles.bubbleTouch}
                onPress={() => handleBubbleSelect(bubble)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    {
                      fontSize: getOptimalFontSize(bubble.text, bubble.size),
                      color: bubble.isSelected 
                        ? theme.primary 
                        : (isDarkMode ? '#FFFFFF' : '#000000'),
                      fontWeight: bubble.isSelected ? '600' : '500'
                    }
                  ]}
                >
                  {bubble.text}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </PanGestureHandler>
      
      {/* Scroll indicator to show users they can scroll horizontally */}
      <View style={styles.scrollIndicatorContainer}>
        <View style={styles.scrollTrack}>
          <Animated.View 
            style={[
              styles.scrollThumb,
              {
                transform: [{
                  translateX: containerTranslateX.current.interpolate({
                    inputRange: [-(PHYSICS_CONTAINER_WIDTH - screenWidth), 0],
                    outputRange: [screenWidth - 60, 0], // Thumb moves opposite to content
                    extrapolate: 'clamp'
                  })
                }]
              }
            ]}
          />
        </View>
        <Text style={[styles.scrollHint, { color: theme.text.secondary }]}>
          Swipe to explore more styles
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  physicsContainer: {
    height: PHYSICS_CONTAINER_HEIGHT,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleText: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  scrollIndicatorContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  scrollTrack: {
    width: screenWidth - 40,
    height: 3,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderRadius: 1.5,
    marginBottom: 8,
  },
  scrollThumb: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 1.5,
  },
  scrollHint: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

// Memoized component to prevent unnecessary re-renders
const EnhancedStyleBubbles = React.memo(EnhancedStyleBubblesBase, (prevProps, nextProps) => {
  // Only re-render if options actually change (deep comparison)
  return prevProps.options.length === nextProps.options.length &&
    prevProps.options.every((option, index) => option === nextProps.options[index]);
});

export default EnhancedStyleBubbles;