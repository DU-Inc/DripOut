import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  GestureResponderEvent,
  AppState,
  AppStateStatus
} from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import { useOnboardingContext } from '../../context/OnboardingContext';

// Types
type Bubble = {
  id: string;
  label: string;
  size: number;
  isSelected: boolean;
  position: { x: number, y: number };
  velocity: { x: number, y: number };
  lastForce?: { x: number, y: number, timestamp: number }; // To track recent force application
};

interface BubbleProps {
  type: 'styles' | 'brands';
  options: string[];
}

// Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONTAINER_PADDING = 20;
const MIN_BUBBLE_SIZE = 110; // Minimum bubble size
const MAX_BUBBLE_SIZE = 140; // Maximum bubble size
const BOTTOM_MARGIN = 200; // Extra space at bottom to avoid buttons
const INITIAL_VELOCITY_FACTOR = 0.5; 
const DAMPING_FACTOR = 0.97; 
const REPULSION_DISTANCE = 10;
const SWIPE_FORCE_MULTIPLIER = 0.3; // Multiplier for swipe forces

// Main component
const OnboardingBubbles: React.FC<BubbleProps> = ({ type, options }) => {
  const { isDarkMode } = useTheme();
  const { 
    selectedStyles, 
    selectedBrands, 
    addStyle, 
    removeStyle, 
    addBrand, 
    removeBrand 
  } = useOnboardingContext();
  
  // State
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const animationRef = useRef<number>(0);
  const frameCount = useRef(0);
  const touchStartRef = useRef<{id: string, x: number, y: number} | null>(null);
  const isUpdatingRef = useRef<boolean>(false); // Prevent concurrent updates
  
  // Theme colors
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const bubbleBgColor = isDarkMode ? '#1A1A24' : '#F6F6F6';
  const bubbleBorderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const selectedTextColor = '#FFFFFF';
  
  // Helper: Calculate bubble size based on text content
  const calculateBubbleSize = (label: string): number => {
    const estimatedWidth = Math.max(
      MIN_BUBBLE_SIZE,
      label.length * 12 // Approximate pixels per character
    );
    return Math.min(estimatedWidth, MAX_BUBBLE_SIZE);
  };
  
  // Helper: Check if a position is valid for a new bubble
  const isValidPosition = (
    x: number, 
    y: number, 
    size: number, 
    existingBubbles: Bubble[]
  ): boolean => {
    // Check if within screen bounds with padding
    if (
      x - size/2 < CONTAINER_PADDING || 
      x + size/2 > SCREEN_WIDTH - CONTAINER_PADDING ||
      y - size/2 < CONTAINER_PADDING || 
      y + size/2 > SCREEN_HEIGHT - CONTAINER_PADDING - 150
    ) {
      return false;
    }
    
    // Check if too close to any existing bubble
    for (const bubble of existingBubbles) {
      const dx = x - bubble.position.x;
      const dy = y - bubble.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = (size + bubble.size) / 2 + 10; // 10px extra padding
      
      if (distance < minDistance) {
        return false;
      }
    }
    
    return true;
  };
  
  // Helper: Generate bubbles with smart positioning
  const generateBubbles = (options: string[]): Bubble[] => {
    const bubbles: Bubble[] = [];
    const maxAttempts = 100;
    
    // Calculate available space and limit number of bubbles accordingly
    const effectiveWidth = SCREEN_WIDTH - 2 * CONTAINER_PADDING;
    const effectiveHeight = SCREEN_HEIGHT - 2 * CONTAINER_PADDING - BOTTOM_MARGIN;
    const avgBubbleSize = (MIN_BUBBLE_SIZE + MAX_BUBBLE_SIZE) / 2;
    
    // Determine spacing based on screen size to avoid overcrowding on smaller screens
    const deviceSizeFactor = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / 400; // Normalize for different screens
    const spacingFactor = 1.2 + (0.5 * deviceSizeFactor);
    
    const bubbleArea = Math.PI * Math.pow(avgBubbleSize/2, 2) * spacingFactor;
    
    // Calculate max bubbles based on screen size with a reasonable minimum and maximum
    const calculatedMaxBubbles = Math.floor((effectiveWidth * effectiveHeight) / bubbleArea);
    const maxBubbles = Math.min(
      options.length,
      Math.max(8, Math.min(calculatedMaxBubbles, 20)) // Ensure between 8-20 bubbles
    );
    
    // Prioritize selected options
    const selectedOptions = options.filter(option => 
      type === 'styles' ? selectedStyles.includes(option) : selectedBrands.includes(option)
    );
    
    // Randomize remaining options
    const unselectedOptions = options
      .filter(option => !(
        type === 'styles' ? selectedStyles.includes(option) : selectedBrands.includes(option)
      ))
      .sort(() => Math.random() - 0.5);
    
    // Combine and limit
    const displayOptions = [...selectedOptions, ...unselectedOptions].slice(0, maxBubbles);
    
    // Create bubbles
    for (let i = 0; i < displayOptions.length; i++) {
      const option = displayOptions[i];
      const size = calculateBubbleSize(option);
      const isSelected = type === 'styles' 
        ? selectedStyles.includes(option) 
        : selectedBrands.includes(option);
      
      // Try to find a valid position
      let valid = false;
      let x = 0, y = 0;
      let attempts = 0;
      
      while (!valid && attempts < maxAttempts) {
        // Grid-based positioning with randomness for more even distribution
        const gridCols = Math.max(2, Math.floor(effectiveWidth / (size * 0.8)));
        const gridRows = Math.max(2, Math.floor(effectiveHeight / (size * 0.8)));
        
        // Position in a grid cell with random offset
        const gridX = Math.floor(Math.random() * gridCols);
        const gridY = Math.floor(Math.random() * gridRows);
        
        x = CONTAINER_PADDING + (gridX + 0.5) * (effectiveWidth / gridCols);
        y = CONTAINER_PADDING + (gridY + 0.5) * (effectiveHeight / gridRows);
        
        // Add small random offset
        x += (Math.random() - 0.5) * (effectiveWidth / gridCols) * 0.5;
        y += (Math.random() - 0.5) * (effectiveHeight / gridRows) * 0.5;
        
        valid = isValidPosition(x, y, size, bubbles);
        attempts++;
      }
      
      if (!valid) {
        // If we can't find a valid position, just place it at a fixed position
        // This ensures we don't skip bubbles which could lead to missing options
        x = CONTAINER_PADDING + (i % 3) * (effectiveWidth / 3) + (effectiveWidth / 6);
        y = CONTAINER_PADDING + Math.floor(i / 3) * (effectiveHeight / 4) + (effectiveHeight / 8);
      }
      
      // Start bubbles below the screen for entrance animation
      const startX = Math.max(CONTAINER_PADDING + size/2, Math.min(x, SCREEN_WIDTH - CONTAINER_PADDING - size/2));
      const startY = SCREEN_HEIGHT + (i % 3) * 50; // Stagger entrance animation
      
      // Calculate initial velocity based on position - bubbles near the edges get more inward velocity
      const centeringForceX = (SCREEN_WIDTH / 2 - startX) / SCREEN_WIDTH;
      
      // Add the bubble with upward velocity
      bubbles.push({
        id: i.toString(),
        label: option,
        size,
        isSelected,
        position: { 
          x: startX,
          y: startY
        },
        velocity: { 
          // Slightly center-biased horizontal velocity for better distribution
          x: (Math.random() - 0.5 + centeringForceX * 0.3) * 0.5,
          // Staggered upward velocity (negative is up)
          y: -0.7 - Math.random() * 0.5 - (displayOptions.length - i) * 0.02
        }
      });
    }
    
    return bubbles;
  };
  
  // Track component state
  const didInitialize = useRef(false);
  const isActive = useRef(true);
  const appState = useRef(AppState.currentState);
  
  // Initialize bubbles and handle app state changes
  useEffect(() => {
    // On first mount, generate bubbles from the bottom
    // On subsequent renders (like props changes), preserve existing positions
    if (!didInitialize.current) {
      const initialBubbles = generateBubbles(options);
      setBubbles(initialBubbles);
      didInitialize.current = true;
    } else {
      // On re-renders, only update selections, not positions
      setBubbles(prevBubbles => {
        return prevBubbles.map(bubble => {
          const isSelected = type === 'styles' 
            ? selectedStyles.includes(bubble.label) 
            : selectedBrands.includes(bubble.label);
            
          return {
            ...bubble,
            isSelected
          };
        });
      });
    }
    
    // Handler for app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && appState.current !== 'active') {
        // App has come to the foreground, restart animation
        isActive.current = true;
        if (!animationRef.current) {
          startAnimation();
        }
      } else if (nextAppState !== 'active' && appState.current === 'active') {
        // App has gone to the background, pause animation
        isActive.current = false;
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;
        }
      }
      appState.current = nextAppState;
    };
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Start animation
    startAnimation();
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      subscription.remove();
    };
  }, [options, type]);
  
  // Animation loop with physics using requestAnimationFrame for smoother animation
  const startAnimation = () => {
    let lastUpdateTime = 0;
    // Set FPS based on device capabilities - default to 30 FPS for better performance across devices
    const FPS_CAP = 30; 
    const frameInterval = 1000 / FPS_CAP;
    
    const animate = (timestamp: number) => {
      // Stop animation if component is not active
      if (!isActive.current) {
        return;
      }
      
      // Throttle updates for performance and smoother animation
      const elapsed = timestamp - lastUpdateTime;
      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastUpdateTime = timestamp;
      frameCount.current += 1;
      
      // Only apply random forces occasionally for subtle movement
      const applyRandomForce = frameCount.current % 50 === 0;
      
      // Skip animation frame if we're currently handling a selection
      if (!isUpdatingRef.current) {
        setBubbles(prevBubbles => {
        const newBubbles = [...prevBubbles];
        
        // Update positions
        for (let i = 0; i < newBubbles.length; i++) {
          const bubble = newBubbles[i];
          
          // Apply very subtle random force occasionally
          if (applyRandomForce) {
            bubble.velocity.x += (Math.random() - 0.5) * 0.01;
            bubble.velocity.y += (Math.random() - 0.5) * 0.01;
          }
          
          // Calculate new position
          const newX = bubble.position.x + bubble.velocity.x;
          const newY = bubble.position.y + bubble.velocity.y;
          
          // Check screen boundaries
          const radius = bubble.size / 2;
          const leftBound = CONTAINER_PADDING + radius;
          const rightBound = SCREEN_WIDTH - CONTAINER_PADDING - radius;
          const topBound = CONTAINER_PADDING + radius;
          // Use BOTTOM_MARGIN constant for consistency
          const bottomBound = SCREEN_HEIGHT - CONTAINER_PADDING - BOTTOM_MARGIN - radius;
          
          let newVelocityX = bubble.velocity.x;
          let newVelocityY = bubble.velocity.y;
          let updatedX = newX;
          let updatedY = newY;
          
          // Always use safe values to prevent NaN issues
          const safeLeftBound = Math.max(CONTAINER_PADDING, leftBound);
          const safeRightBound = Math.min(SCREEN_WIDTH - CONTAINER_PADDING, rightBound);
          const safeTopBound = Math.max(CONTAINER_PADDING, topBound);
          const safeBottomBound = Math.min(SCREEN_HEIGHT - BOTTOM_MARGIN, bottomBound);
          
          // Default positions if we encounter NaN
          if (isNaN(updatedX)) updatedX = SCREEN_WIDTH / 2;
          if (isNaN(updatedY)) updatedY = SCREEN_HEIGHT / 2;
          
          // Bounce off walls with smooth physics
          if (updatedX < safeLeftBound) {
            // Smooth reflection with energy preservation
            updatedX = safeLeftBound + Math.abs(safeLeftBound - updatedX) * 0.2; 
            newVelocityX = Math.abs(bubble.velocity.x) * 0.8;
          } else if (updatedX > safeRightBound) {
            updatedX = safeRightBound - Math.abs(updatedX - safeRightBound) * 0.2;
            newVelocityX = -Math.abs(bubble.velocity.x) * 0.8;
          }
          
          if (updatedY < safeTopBound) {
            updatedY = safeTopBound + Math.abs(safeTopBound - updatedY) * 0.2;
            newVelocityY = Math.abs(bubble.velocity.y) * 0.8;
          } else if (updatedY > safeBottomBound) {
            updatedY = safeBottomBound - Math.abs(updatedY - safeBottomBound) * 0.2;
            newVelocityY = -Math.abs(bubble.velocity.y) * 0.8;
            
            // Add stronger upward boost from bottom to keep bubbles away from buttons
            newVelocityY -= 0.1;
          }
          
          // Apply light damping to slow bubbles gradually for more natural movement
          newVelocityX *= DAMPING_FACTOR;
          newVelocityY *= DAMPING_FACTOR;
          
          // Ensure velocities are valid numbers
          if (isNaN(newVelocityX)) newVelocityX = (Math.random() - 0.5) * 0.2;
          if (isNaN(newVelocityY)) newVelocityY = -0.5;
          
          newBubbles[i] = {
            ...bubble,
            position: { x: updatedX, y: updatedY },
            velocity: { x: newVelocityX, y: newVelocityY }
          };
        }
        
        // Handle bubble-to-bubble interactions more efficiently
        for (let i = 0; i < newBubbles.length; i++) {
          // Only check bubbles that are close enough to interact
          // Skip distant bubbles for performance
          for (let j = i + 1; j < newBubbles.length; j++) {
            const bubble1 = newBubbles[i];
            const bubble2 = newBubbles[j];
            
            // Early coarse check to skip distant bubbles (optimization)
            const maxSize = Math.max(bubble1.size, bubble2.size);
            const quickDx = Math.abs(bubble1.position.x - bubble2.position.x);
            const quickDy = Math.abs(bubble1.position.y - bubble2.position.y);
            
            // Skip distant bubbles using a coarse check
            if (quickDx > maxSize + REPULSION_DISTANCE || quickDy > maxSize + REPULSION_DISTANCE) {
              continue;
            }
            
            // Safe position access with defined defaults
            const x1 = bubble1.position.x || SCREEN_WIDTH / 2;
            const y1 = bubble1.position.y || SCREEN_HEIGHT / 2;
            const x2 = bubble2.position.x || SCREEN_WIDTH / 2;
            const y2 = bubble2.position.y || SCREEN_HEIGHT / 2;
            
            const dx = x1 - x2;
            const dy = y1 - y2;
            const distanceSquared = dx * dx + dy * dy;
            const minDistance = (bubble1.size + bubble2.size) / 2;
            const repulsionThreshold = minDistance + REPULSION_DISTANCE;
            const repulsionThresholdSquared = repulsionThreshold * repulsionThreshold;
            
            // Use squared distance for performance (avoid sqrt)
            if (distanceSquared > 0 && distanceSquared < repulsionThresholdSquared) {
              // Now that we know we need to handle interaction, calculate actual distance
              const distance = Math.sqrt(distanceSquared);
              
              // Scale push force based on how close bubbles are
              const normalizedDistance = Math.max(0.1, distance / repulsionThreshold);
              const pushForce = 0.1 / normalizedDistance; // Stronger when closer
              
              if (distance > 0.1) { // Avoid extremely small distances
                // Safe normalized direction vector
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Apply forces with a small boost to selected bubbles
                const b1Factor = bubble1.isSelected ? 0.8 : 1.0; // Selected bubbles move less
                const b2Factor = bubble2.isSelected ? 0.8 : 1.0;
                
                newBubbles[i].velocity.x += nx * pushForce * b1Factor;
                newBubbles[i].velocity.y += ny * pushForce * b1Factor;
                newBubbles[j].velocity.x -= nx * pushForce * b2Factor;
                newBubbles[j].velocity.y -= ny * pushForce * b2Factor;
                
                // If actually overlapping, separate bubbles immediately
                if (distance < minDistance) {
                  const overlap = (minDistance - distance) * 0.6; // 60% correction
                  
                  newBubbles[i].position.x += nx * overlap * b1Factor;
                  newBubbles[i].position.y += ny * overlap * b1Factor;
                  newBubbles[j].position.x -= nx * overlap * b2Factor;
                  newBubbles[j].position.y -= ny * overlap * b2Factor;
                }
              } else {
                // Safely handle very close or exact overlaps
                const angle = Math.random() * Math.PI * 2;
                const forceMagnitude = 0.2;
                
                newBubbles[i].velocity.x += Math.cos(angle) * forceMagnitude;
                newBubbles[i].velocity.y += Math.sin(angle) * forceMagnitude;
                newBubbles[j].velocity.x -= Math.cos(angle) * forceMagnitude;
                newBubbles[j].velocity.y -= Math.sin(angle) * forceMagnitude;
                
                // Move them apart immediately
                newBubbles[i].position.x += Math.cos(angle) * 5;
                newBubbles[i].position.y += Math.sin(angle) * 5;
                newBubbles[j].position.x -= Math.cos(angle) * 5;
                newBubbles[j].position.y -= Math.sin(angle) * 5;
              }
              
              // Add a tiny random component to prevent bubbles from getting stuck
              if (frameCount.current % 5 === 0) {
                const randomFactor = 0.01;
                newBubbles[i].velocity.x += (Math.random() - 0.5) * randomFactor;
                newBubbles[i].velocity.y += (Math.random() - 0.5) * randomFactor;
                newBubbles[j].velocity.x += (Math.random() - 0.5) * randomFactor;
                newBubbles[j].velocity.y += (Math.random() - 0.5) * randomFactor;
              }
            }
          }
        }
        
        // Apply natural motion physics and velocity controls
        for (let i = 0; i < newBubbles.length; i++) {
          // Get current velocity with safety checks
          let vx = newBubbles[i].velocity.x || 0;
          let vy = newBubbles[i].velocity.y || 0;
          
          // If we have a recent force application, add visual decay effect
          if (newBubbles[i].lastForce) {
            const timeSinceForce = frameCount.current - (newBubbles[i].lastForce.timestamp || 0);
            if (timeSinceForce < 20) { // Show effect for about 20 frames
              // Decay the effect gradually
              const decayFactor = 1 - (timeSinceForce / 20);
              // Still apply a small amount of the force
              vx += newBubbles[i].lastForce.x * 0.05 * decayFactor;
              vy += newBubbles[i].lastForce.y * 0.05 * decayFactor;
            } else {
              // Clear the force after its effect has faded
              newBubbles[i].lastForce = undefined;
            }
          }
          
          // Apply different velocity caps based on selection state
          // Selected bubbles move a bit slower and more stable
          const MAX_SPEED = newBubbles[i].isSelected ? 1.5 : 2.0;
          if (Math.abs(vx) > MAX_SPEED) vx = Math.sign(vx) * MAX_SPEED;
          if (Math.abs(vy) > MAX_SPEED) vy = Math.sign(vy) * MAX_SPEED;
          
          // Ensure minimum motion for visual interest
          const MIN_SPEED = 0.1;
          const speedSquared = vx * vx + vy * vy;
          
          if (speedSquared < MIN_SPEED * MIN_SPEED) {
            // Add direction based on position relative to center for a gentle inward/outward flow
            const dx = (newBubbles[i].position.x - SCREEN_WIDTH/2) / SCREEN_WIDTH;
            const dy = (newBubbles[i].position.y - SCREEN_HEIGHT/2) / SCREEN_HEIGHT;
            
            // Alternate between inward and outward flow based on frame count
            const flowDirection = Math.sin(frameCount.current * 0.01) > 0 ? 1 : -1;
            
            vx -= dx * 0.03 * flowDirection;
            vy -= dy * 0.02 * flowDirection;
            
            // Also add a small random component for natural variation
            vx += (Math.random() - 0.5) * 0.05;
            vy += (Math.random() - 0.5) * 0.05;
          }
          
          // Occasional gentle "breeze" effect (with directional variation)
          if (Math.random() < 0.005) { // 0.5% chance per frame
            // Create directional breeze that changes over time
            const breezeAngle = (frameCount.current * 0.01) % (Math.PI * 2);
            const breezeStrength = 0.08;
            
            vx += Math.cos(breezeAngle) * breezeStrength;
            vy += (Math.sin(breezeAngle) - 0.2) * breezeStrength; // Slight upward bias
          }
          
          // Apply the velocity updates
          newBubbles[i].velocity.x = vx;
          newBubbles[i].velocity.y = vy;
          
          // Ensure position values are valid
          if (isNaN(newBubbles[i].position.x) || newBubbles[i].position.x === undefined) {
            newBubbles[i].position.x = SCREEN_WIDTH / 2;
          }
          if (isNaN(newBubbles[i].position.y) || newBubbles[i].position.y === undefined) {
            newBubbles[i].position.y = SCREEN_HEIGHT / 2;
          }
        }
        
        return newBubbles;
      });
      }
      
      // Continue the animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Apply force to a bubble (for swipe effect) with visual feedback
  const applyForceToBubble = (bubbleId: string, forceX: number, forceY: number) => {
    setBubbles(prevBubbles => {
      return prevBubbles.map(bubble => {
        if (bubble.id === bubbleId) {
          // Store the force information for visual effects
          return {
            ...bubble,
            velocity: {
              x: bubble.velocity.x + forceX * SWIPE_FORCE_MULTIPLIER,
              y: bubble.velocity.y + forceY * SWIPE_FORCE_MULTIPLIER
            },
            // Record the force and timestamp for visual feedback effects
            lastForce: {
              x: forceX,
              y: forceY,
              timestamp: frameCount.current
            }
          };
        }
        return bubble;
      });
    });
  };
  
  // Handle bubble press in
  const handleBubblePressIn = (bubbleId: string, pageX: number, pageY: number) => {
    touchStartRef.current = { id: bubbleId, x: pageX, y: pageY };
  };
  
  // Handle bubble press out with improved response and feedback
  const handleBubblePressOut = (pageX: number, pageY: number) => {
    if (!touchStartRef.current) return;
    
    const { id: bubbleId, x: startX, y: startY } = touchStartRef.current;
    
    // Calculate distance and direction
    const dx = pageX - startX;
    const dy = pageY - startY;
    const distanceSquared = dx * dx + dy * dy;
    
    // Determine if it's a swipe or a tap - using squared distance for performance
    if (distanceSquared > 100) { // 10px squared
      // It's a swipe - calculate force based on distance and direction
      const distance = Math.sqrt(distanceSquared);
      
      // Calculate swipe speed (higher speed = more force)
      // Adapt force to screen size for consistent feel across devices
      const screenSizeFactor = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / 400;
      const speedFactor = 0.15 * screenSizeFactor;
      
      // Base force on swipe distance and direction
      let forceX = dx * speedFactor;
      let forceY = dy * speedFactor;
      
      // Cap the force to prevent extreme velocities
      const MAX_FORCE = 3.0;
      const forceMagnitude = Math.sqrt(forceX * forceX + forceY * forceY);
      if (forceMagnitude > MAX_FORCE) {
        const scaleFactor = MAX_FORCE / forceMagnitude;
        forceX *= scaleFactor;
        forceY *= scaleFactor;
      }
      
      // Use requestAnimationFrame to apply force without blocking UI
      requestAnimationFrame(() => {
        applyForceToBubble(bubbleId, forceX, forceY);
      });
    } else {
      // It's a tap - toggle selection
      requestAnimationFrame(() => {
        handleBubbleSelection(bubbleId);
      });
    }
    
    touchStartRef.current = null;
  };
  
  // Toggle selection of a bubble without refreshing animation
  const handleBubbleSelection = (bubbleId: string) => {
    // Prevent multiple rapid selection changes
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    console.log(`Toggling selection for bubble ${bubbleId}`);

    // Find the bubble in the current state
    const bubbleToToggle = bubbles.find(bubble => bubble.id === bubbleId);
    if (!bubbleToToggle) {
      isUpdatingRef.current = false;
      return; // Bubble not found
    }
    
    // Determine new selection state
    const newIsSelected = !bubbleToToggle.isSelected;
    
    // Update context first
    if (type === 'styles') {
      if (newIsSelected) {
        addStyle(bubbleToToggle.label);
      } else {
        removeStyle(bubbleToToggle.label);
      }
    } else if (type === 'brands') {
      if (newIsSelected) {
        addBrand(bubbleToToggle.label);
      } else {
        removeBrand(bubbleToToggle.label);
      }
    }

    // Apply the change to our local state, but keep original positions and velocities
    const updatedBubbles = bubbles.map(bubble => {
      if (bubble.id === bubbleId) {
        return {
          ...bubble,               // Preserve ALL existing properties
          isSelected: newIsSelected // Only change the selection state
        };
      }
      return bubble;
    });
    
    // Update state with updated bubbles
    setBubbles(updatedBubbles);
    
    // Release the update lock after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 10);
  };
  
  return (
    <View style={styles.container}>
      {bubbles.map(bubble => {
        // Bubble position styles
        const positionStyle = {
          width: bubble.size,
          height: bubble.size,
          left: bubble.position.x - bubble.size/2,
          top: bubble.position.y - bubble.size/2,
        };
        
        // Scale factor for visual feedback when swiping
        const hasRecentForce = bubble.lastForce && 
          (frameCount.current - (bubble.lastForce.timestamp || 0) < 10);
        
        // Pulse effect for recently swiped bubbles
        const scaleValue = hasRecentForce ? 
          1 + 0.05 * (1 - (frameCount.current - (bubble.lastForce?.timestamp || 0)) / 10) : 1;
        
        // Enhanced visual styles based on state
        const bubbleStyle = {
          backgroundColor: bubble.isSelected ? mainColor : bubbleBgColor,
          borderColor: bubble.isSelected ? mainColor : bubbleBorderColor,
          transform: [{ scale: scaleValue }],
          // Add subtle shadow for selected bubbles
          elevation: bubble.isSelected ? 8 : 4,
          shadowColor: bubble.isSelected ? mainColor : "#000",
          shadowOffset: { width: 0, height: bubble.isSelected ? 3 : 2 },
          shadowOpacity: bubble.isSelected ? 0.3 : 0.15,
          shadowRadius: bubble.isSelected ? 8 : 6,
        };
        
        return (
          <View
            key={bubble.id}
            style={[
              styles.bubbleWrapper,
              positionStyle
            ]}
          >
            <TouchableOpacity
              style={[
                styles.bubble,
                bubbleStyle,
                // Add pulse animation class for recently swiped bubbles
                hasRecentForce && styles.bubblePulse
              ]}
              activeOpacity={0.7} // More responsive feel
              onPressIn={(e) => handleBubblePressIn(bubble.id, e.nativeEvent.pageX, e.nativeEvent.pageY)}
              onPressOut={(e) => handleBubblePressOut(e.nativeEvent.pageX, e.nativeEvent.pageY)}
            >
              <Text
                style={[
                  styles.bubbleText,
                  {
                    color: bubble.isSelected ? selectedTextColor : textColor,
                    // Make text slightly larger for selected bubbles
                    fontSize: bubble.isSelected ? 17 : 16,
                    fontWeight: bubble.isSelected ? '700' : '600'
                  }
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {bubble.label}
              </Text>
              {bubble.isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
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
    flex: 1,
    position: 'relative',
  },
  bubbleWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    // Add enough z-index to ensure bubbles are above any UI elements in the background
    zIndex: 1,
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    padding: 10,
  },
  bubblePulse: {
    // This class is applied when a bubble has recent force applied (swipe)
    // Visual styles are applied in the inline style with transform: scale
  },
  bubbleText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OnboardingBubbles;