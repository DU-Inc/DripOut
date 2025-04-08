// These are actually globals in React Native environment
/* global setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  InteractionManager,
  ScrollView
} from 'react-native';

// Remove the previous declarations that weren't working
// declare global {...}

import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../styles/themeprovider';
import { useOnboardingContext } from '../../context/OnboardingContext';

// Basic interface for component props
interface BubbleProps {
  type: 'styles' | 'brands';
  options: string[];
  onSelectionChange?: (selected: string[]) => void;
}

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
  animating: boolean;
  // Not adding wobble to the interface since we're managing it separately in a ref
}

// Define a custom type for the timer
type TimeoutID = ReturnType<typeof setTimeout>;

// Optimal number of visible bubbles - balanced for visual interest and space constraints
const MAX_VISIBLE_BUBBLES = 6;

// Apple Music style bubble component with lightweight physics
const OnboardingBubbles: React.FC<BubbleProps> = ({ type, options, onSelectionChange }) => {
  const { isDarkMode } = useTheme();
  const { 
    selectedStyles, 
    selectedBrands, 
    addStyle, 
    removeStyle, 
    addBrand, 
    removeBrand 
  } = useOnboardingContext();
  
  // Refs to prevent re-renders
  const bubblesRef = useRef<BubbleItem[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef(Date.now());
  const containerSizeRef = useRef({ width: 0, height: 0 });
  const queuedOptionsRef = useRef<string[]>([]);
  const isBubblesInitializedRef = useRef(false);
  
  // State for selected options (for rendering chips)
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    type === 'styles' ? selectedStyles : selectedBrands
  );
  
  // Force re-render function (used only when absolutely necessary)
  const [, forceRender] = useState({});
  const triggerRender = () => {
    forceRender({});
    
    // Also update the bubble list state for rendering
    if (bubblesRef.current.length > 0) {
      setBubblesList([...bubblesRef.current]);
    }
  };
  
  // Effect to synchronize selected options from context
  useEffect(() => {
    setSelectedOptions(type === 'styles' ? selectedStyles : selectedBrands);
  }, [selectedStyles, selectedBrands, type]);
  
  // Handle container layout to determine dimensions
  const onContainerLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    
    // Always update dimensions and try to initialize
    containerSizeRef.current = { 
      width, 
      height: Math.max(height - 70, 300)
    };
    
    console.log(`Container layout: ${width}x${height}`);
    
    // Initialize bubbles if not already done and we have valid dimensions
    if (!isBubblesInitializedRef.current && width > 0 && height > 0) {
      console.log("Initializing bubbles from layout event");
      
      // Use a small timeout to ensure the layout is stable
      setTimeout(() => {
        initializeBubbles();
      }, 50);
    }
  };
  
  // Check if two bubbles overlap with improved spacing
  const checkOverlap = (position1: {x: number, y: number}, size1: number, 
                       position2: {x: number, y: number}, size2: number) => {
    const distance = Math.sqrt(
      Math.pow(position1.x - position2.x, 2) + 
      Math.pow(position1.y - position2.y, 2)
    );
    
    // Use a variable buffer that scales with bubble size
    // Larger bubbles need more space between them
    const bufferSize = Math.min(size1, size2) * 0.12 + 15;
    
    return distance < (size1/2 + size2/2 + bufferSize);
  };
  
  // Improved function to calculate optimal bubble size based on text content
  const calculateBubbleSizeForText = (text: string): number => {
    // Step 1: Set a more generous minimum bubble size based on content analysis
    const ABSOLUTE_MIN_SIZE = 110; // Increased from 100px for better text fitting
    
    // Step 2: Analyze the text to determine if it needs special handling
    const wordCount = text.trim().split(/\s+/).length;
    const isSingleWord = wordCount === 1;
    const longestWord = text.split(/\s+/).reduce((longest, word) => 
      word.length > longest.length ? word : longest, '');
    const hasLongWord = longestWord.length > 8;
    
    // Step 3: Measure text width with more generous character widths
    // This addresses the underestimation issue identified
    let textWidthEstimate = 0;
    
    // Process text character by character with more generous width estimates
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Improved width categories with more generous estimates
      if (/[ijlI1.,!|\-' ]/.test(char)) {
        // Narrow characters and spaces
        textWidthEstimate += 6; // Increased from 5
      } else if (/[mwWMQGO@]/.test(char)) {
        // Wide characters
        textWidthEstimate += 18; // Increased from 14
      } else if (/[ABCDEFHNPRSUVXYZ%&]/.test(char)) {
        // Medium-wide characters
        textWidthEstimate += 12; // New category
      } else {
        // Normal width characters
        textWidthEstimate += 10; // Increased from 9
      }
    }
    
    // Step 4: Add more generous padding to ensure text fits completely
    // More consistent with material design guidelines for touch targets
    const horizontalPadding = 50; // Increased from 40
    
    // Step 5: Apply special adjustments for different text patterns
    
    // Single word needs extra space to prevent truncation
    const singleWordAdjustment = isSingleWord ? Math.min(30, longestWord.length * 3) : 0;
    
    // Multi-word text with long words needs extra space
    const longWordAdjustment = (!isSingleWord && hasLongWord) ? 
      Math.min(25, longestWord.length * 2) : 0;
    
    // Calculate total width needed
    const totalWidth = textWidthEstimate + horizontalPadding + 
      singleWordAdjustment + longWordAdjustment;
    
    // Step 6: Calculate size needed for circular bubble
    // For circles, diameter needs to be larger than the text width
    const circleDiameterFactor = 1.1; // Increased from 1.0 for more breathing room
    
    // Calculate base size with improved factors
    const baseSize = Math.max(
      ABSOLUTE_MIN_SIZE,
      totalWidth * circleDiameterFactor
    );
    
    // Step 7: Balance sizes across all bubbles for visual consistency
    const availableWidth = containerSizeRef.current.width - 30; // More available width
    const availableHeight = containerSizeRef.current.height - 30; // More available height
    
    // Calculate maximum size with slightly increased proportions
    const MAX_PROPORTION = 0.4; // Increased from 0.35
    const MAX_SIZE = 150; // Increased from 140
    
    const maxAllowedSize = Math.min(
      availableWidth * MAX_PROPORTION,
      availableHeight * MAX_PROPORTION,
      MAX_SIZE
    );
    
    // Step 8: Return final size with improved clamping
    return Math.min(Math.max(baseSize, ABSOLUTE_MIN_SIZE), maxAllowedSize);
  };
  
  // Generate a new bubble with guaranteed no-overlap
  const generateNewBubble = (text: string): BubbleItem => {
    const availableWidth = containerSizeRef.current.width - 40;
    const availableHeight = containerSizeRef.current.height - 40;
    
    // Calculate appropriate size based on text content
    const textBasedSize = calculateBubbleSizeForText(text);
    
    // Add small random variation (±10%) to make bubbles look more natural
    const sizeVariation = 0.9 + (Math.random() * 0.2); // Between 0.9-1.1
    let size = Math.round(textBasedSize * sizeVariation);
    
    // Ensure size is within reasonable bounds
    const absoluteMinSize = 90; // Ensure bubbles are never too small
    const absoluteMaxSize = 160; // Ensure bubbles are never too large
    const minSize = absoluteMinSize; // Define minSize variable
    size = Math.min(Math.max(size, absoluteMinSize), absoluteMaxSize);
    
    const guaranteedPlacement = (attemptSize: number): [number, number, boolean] => {
      // Simplified Poisson Disk Sampling algorithm for natural-looking distribution
      // This algorithm ensures points are random but maintain a minimum distance from each other
      
      // Step 1: Define the area where bubbles can be placed
      const bubbleRadius = attemptSize / 2;
      
      // Safety margin to keep bubbles fully visible
      const safetyMargin = bubbleRadius + 5;
      
      // Calculate effective area boundaries
      const minX = safetyMargin;
      const maxX = availableWidth - safetyMargin;
      const minY = safetyMargin;
      const maxY = availableHeight - safetyMargin;
      const effectiveWidth = maxX - minX;
      const effectiveHeight = maxY - minY;
      
      // Step 2: Define minimum distance for Poisson distribution
      // This is the key parameter that controls bubble spacing
      // Smaller values allow bubbles to be closer together
      const minDistance = attemptSize * 0.8; // Less strict overlap prevention (reduced from 1.0+)
      
      // Step 3: Generate candidate positions using improved techniques
      
      // Try different strategies for bubble placement
      const strategyOrder = [
        'poissonDisk',     // Natural random distribution with minimum spacing
        'zoneRandom',      // Zone-based randomization
        'pureRandom',      // Pure random positions
        'leastCrowded'     // Fallback to least crowded area
      ];
      
      // First bubble gets center position with slight randomness
      if (bubblesRef.current.length === 0) {
        const centerX = availableWidth / 2 + (Math.random() - 0.5) * 20;
        const centerY = availableHeight / 2 + (Math.random() - 0.5) * 20;
        return [centerX, centerY, true];
      }
      
      // Try each strategy in order until one succeeds
      for (const strategy of strategyOrder) {
        
        // STRATEGY 1: Poisson Disk Sampling
        if (strategy === 'poissonDisk') {
          // Number of candidates to generate per iteration - higher = better distribution
          const POINTS_PER_ITERATION = 25;
          // Number of iterations to attempt
          const MAX_ITERATIONS = 5;
          
          // Improved implementation of Poisson Disk algorithm
          for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            // Choose a reference point from existing bubbles
            const referenceIdx = Math.floor(Math.random() * bubblesRef.current.length);
            const reference = bubblesRef.current[referenceIdx];
            
            if (!reference.position) continue;
            
            // Get reference position
            const refX = getValueX(reference.position);
            const refY = getValueY(reference.position);
            
            // Generate multiple candidate points at suitable distances
            for (let i = 0; i < POINTS_PER_ITERATION; i++) {
              // Choose a random distance between minDistance and 2*minDistance
              // This creates a natural-looking distribution
              const distance = minDistance + minDistance * Math.random();
              
              // Choose a random angle
              const angle = Math.random() * Math.PI * 2;
              
              // Calculate candidate point
              const testX = refX + Math.cos(angle) * distance;
              const testY = refY + Math.sin(angle) * distance;
              
              // Check if point is within bounds
              if (testX < minX || testX > maxX || testY < minY || testY > maxY) {
                continue;
              }
              
              // Check against all existing bubbles
              let valid = true;
              for (const bubble of bubblesRef.current) {
                if (!bubble.position) continue;
                
                const bubbleX = getValueX(bubble.position);
                const bubbleY = getValueY(bubble.position);
                
                if (checkOverlap(
                  { x: testX, y: testY }, 
                  attemptSize, 
                  { x: bubbleX, y: bubbleY }, 
                  bubble.size
                )) {
                  valid = false;
                  break;
                }
              }
              
              if (valid) {
                return [testX, testY, true];
              }
            }
          }
        }
        
        // STRATEGY 2: Zone-based randomization
        // Ensures coverage across the entire container
        if (strategy === 'zoneRandom') {
          // Divide container into zones and try to fill empty zones first
          const GRID_SIZE = 3; // 3x3 grid (9 zones)
          const zoneWidth = effectiveWidth / GRID_SIZE;
          const zoneHeight = effectiveHeight / GRID_SIZE;
          
          // Create zone occupancy map
          const zoneOccupancy = Array(GRID_SIZE * GRID_SIZE).fill(0);
          
          // Count bubbles in each zone
          for (const bubble of bubblesRef.current) {
            if (!bubble.position) continue;
            
            // Calculate which zone this bubble is in
            const bubbleX = getValueX(bubble.position) - minX;
            const bubbleY = getValueY(bubble.position) - minY;
            
            const zoneX = Math.min(Math.floor(bubbleX / zoneWidth), GRID_SIZE - 1);
            const zoneY = Math.min(Math.floor(bubbleY / zoneHeight), GRID_SIZE - 1);
            
            // Update zone occupancy
            const zoneIndex = zoneY * GRID_SIZE + zoneX;
            zoneOccupancy[zoneIndex]++;
          }
          
          // Find least occupied zones
          const minOccupancy = Math.min(...zoneOccupancy);
          const leastOccupiedZones = zoneOccupancy
            .map((count, index) => ({ count, index }))
            .filter(zone => zone.count === minOccupancy)
            .map(zone => zone.index);
          
          // Try placing in least occupied zones
          for (const zoneIndex of leastOccupiedZones) {
            // Convert zone index to coordinates
            const zoneY = Math.floor(zoneIndex / GRID_SIZE);
            const zoneX = zoneIndex % GRID_SIZE;
            
            // Calculate zone boundaries
            const zoneMinX = minX + zoneX * zoneWidth;
            const zoneMaxX = zoneMinX + zoneWidth;
            const zoneMinY = minY + zoneY * zoneHeight;
            const zoneMaxY = zoneMinY + zoneHeight;
            
            // Try multiple positions within this zone
            for (let attempt = 0; attempt < 15; attempt++) {
              // Get random position within zone
              const testX = zoneMinX + Math.random() * (zoneMaxX - zoneMinX);
              const testY = zoneMinY + Math.random() * (zoneMaxY - zoneMinY);
              
              // Check against all existing bubbles
              let valid = true;
              for (const bubble of bubblesRef.current) {
                if (!bubble.position) continue;
                
                const bubbleX = getValueX(bubble.position);
                const bubbleY = getValueY(bubble.position);
                
                if (checkOverlap(
                  { x: testX, y: testY }, 
                  attemptSize, 
                  { x: bubbleX, y: bubbleY }, 
                  bubble.size
                )) {
                  valid = false;
                  break;
                }
              }
              
              if (valid) {
                return [testX, testY, true];
              }
            }
          }
        }
        
        // STRATEGY 3: Pure random positioning with relaxed constraints
        if (strategy === 'pureRandom') {
          // More attempts for greater chance of success
          const MAX_RANDOM_ATTEMPTS = 80; // Increased from 60
          
          for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt++) {
            // Pure random positioning within bounds
            const testX = minX + Math.random() * effectiveWidth;
            const testY = minY + Math.random() * effectiveHeight;
            
            // Use relaxed overlap checks (85% of normal distance)
            let valid = true;
            for (const bubble of bubblesRef.current) {
              if (!bubble.position) continue;
              
              const bubbleX = getValueX(bubble.position);
              const bubbleY = getValueY(bubble.position);
              
              // Calculate distance between centers
              const dx = testX - bubbleX;
              const dy = testY - bubbleY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate minimum distance for no overlap (relaxed)
              const minNonOverlapDistance = (attemptSize + bubble.size) * 0.42; // Reduced factor
              
              if (distance < minNonOverlapDistance) {
                valid = false;
                break;
              }
            }
            
            if (valid) {
              return [testX, testY, true];
            }
          }
        }
        
        // STRATEGY 4: Least crowded area (last resort)
        if (strategy === 'leastCrowded') {
          // Find area with most space using improved sampling
          const GRID_SIZE = 7; // Finer grid for better placement
          let bestDistance = 0;
          let bestX = availableWidth / 2;
          let bestY = availableHeight / 2;
          
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              // Sample point
              const testX = minX + (x + 0.5) * (effectiveWidth / GRID_SIZE);
              const testY = minY + (y + 0.5) * (effectiveHeight / GRID_SIZE);
              
              // Calculate minimum distance to any bubble
              let minDistance = Number.MAX_VALUE;
              
              for (const bubble of bubblesRef.current) {
                if (!bubble.position) continue;
                
                const bubbleX = getValueX(bubble.position);
                const bubbleY = getValueY(bubble.position);
                const dx = testX - bubbleX;
                const dy = testY - bubbleY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                minDistance = Math.min(minDistance, dist);
              }
              
              // If this position has more space, use it
              if (minDistance > bestDistance) {
                bestDistance = minDistance;
                bestX = testX;
                bestY = testY;
              }
            }
          }
          
          // Apply small random jitter to prevent grid alignment
          bestX += (Math.random() - 0.5) * 10;
          bestY += (Math.random() - 0.5) * 10;
          
          // Ensure within bounds
          bestX = Math.max(minX, Math.min(maxX, bestX));
          bestY = Math.max(minY, Math.min(maxY, bestY));
          
          // Return best position found, may have some overlap
          return [bestX, bestY, true];
        }
      }
      
      // Emergency fallback (should never reach here)
      return [availableWidth / 2, availableHeight / 2, false];
    };
    
    // Try to find a position with the current size
    let [x, y, validPosition] = guaranteedPlacement(size);
    
    // If we couldn't find a valid position, try with smaller sizes
    if (!validPosition) {
      // Try with 85% of the original size
      size = Math.max(size * 0.85, minSize * 0.6);
      [x, y, validPosition] = guaranteedPlacement(size);
      
      // If still not valid, try with minimum size
      if (!validPosition) {
        size = minSize * 0.6;
        [x, y] = guaranteedPlacement(size);
      }
    }
    
    // Create position with animated values
    const position = new Animated.ValueXY({ x, y });
    
    // Calculate velocity based on distance from center (bubbles tend to move toward center)
    const centerX = availableWidth / 2;
    const centerY = availableHeight / 2;
    const dx = centerX - x;
    const dy = centerY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Normalized direction toward center with some randomness
    const dirX = dist > 0 ? dx / dist : 0;
    const dirY = dist > 0 ? dy / dist : 0;
    
    // Create bubble with animation values and physics properties
    const bubble: BubbleItem = {
      id: Date.now().toString() + Math.random().toString(),
      text,
      size,
      position,
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      velocity: {
        // Mix of center attraction and randomness for natural movement
        x: dirX * 0.2 + (Math.random() - 0.5) * 0.5,
        y: dirY * 0.2 + (Math.random() - 0.5) * 0.5
      },
      animating: false
    };
    
    return bubble;
  };
  
  // Initialize bubbles and queue - simple and reliable approach
  const initializeBubbles = () => {
    if (isBubblesInitializedRef.current || 
        containerSizeRef.current.width === 0 || 
        containerSizeRef.current.height === 0 || 
        options.length === 0) {
      return;
    }
    
    // Set initialization flag
    isBubblesInitializedRef.current = true;
    
    // Create a local copy of options
    const allOptions = [...options];
    
    // Separate selected and unselected options
    const currentSelected = type === 'styles' ? selectedStyles : selectedBrands;
    const unselectedOptions = allOptions.filter(opt => !currentSelected.includes(opt));
    
    // Clear existing data
    bubblesRef.current = [];
    queuedOptionsRef.current = [];
    
    // Create initial visible bubbles - use a simpler direct approach
    const initialVisible = Math.min(MAX_VISIBLE_BUBBLES, unselectedOptions.length);
    
    console.log(`Initializing ${initialVisible} bubbles from ${unselectedOptions.length} options`);
    
    // Create all bubbles at once - simpler and more reliable
    for (let i = 0; i < initialVisible; i++) {
      const bubble = generateNewBubble(unselectedOptions[i]);
      bubblesRef.current.push(bubble);
    }
    
    // Set remaining options to queue
    queuedOptionsRef.current = unselectedOptions.slice(initialVisible);
    
    // Start animations
    startBubbleAnimations();
    
    // Start animation loop
    lastTimeRef.current = Date.now();
    startAnimationLoop();
    
    // Force a render to show the bubbles
    triggerRender();
    
    // Double-check rendering with a slight delay to ensure bubbles appear
    setTimeout(() => {
      if (bubblesRef.current.length > 0) {
        console.log(`${bubblesRef.current.length} bubbles initialized`);
        triggerRender();
      }
    }, 500);
  };
  
  // Start entrance animations for bubbles
  const startBubbleAnimations = () => {
    bubblesRef.current.forEach((bubble, index) => {
      // Stagger the animations for a nice effect
      const delay = 80 + index * 90; // Faster entrance
      
      // Fade in animation - using native driver for performance
      Animated.timing(bubble.opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
      
      // Scale up animation with bounce
      Animated.spring(bubble.scale, {
        toValue: 1,
        delay,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      }).start();
    });
  };
  
  // Enhanced animation loop with fluid physics
  const startAnimationLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Optimize frame rate based on platform
    const frameInterval = Platform.OS === 'android' ? 2 : 1;
    let frameCount = 0;
    
    // Physics constants
    const DAMPING = 0.98; // Higher value for smoother movement
    const GRAVITY = 0.0015; // Very slight gravity effect
    const RANDOM_FORCE = 0.03; // Stronger random movement
    const BASE_SPEED = 40; // Base movement speed
    const BOUNCE_ENERGY = 0.85; // Energy retained in bounces
    
    // Bubble attraction/repulsion forces
    const MIN_FORCE_DISTANCE = 100; // Distance at which bubbles start to affect each other
    const REPULSION_STRENGTH = 0.0025; // Strength of repulsion force between bubbles
    
    // Time tracking for smooth animation
    let lastStepTime = Date.now();
    
    // Animation loop
    const animate = () => {
      // Frame skipping for performance on slower devices
      frameCount++;
      
      // Get current time and calculate time step
      const now = Date.now();
      let deltaTime = (now - lastStepTime) / 1000; // Convert to seconds
      
      // Cap delta time to prevent huge jumps if the app was in background
      deltaTime = Math.min(deltaTime, 0.05);
      lastStepTime = now;
      
      // Skip frame processing on certain frames for performance
      if (frameCount % frameInterval !== 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Get container dimensions
      const width = containerSizeRef.current.width;
      const height = containerSizeRef.current.height;
      
      // Update all bubbles
      for (let i = 0; i < bubblesRef.current.length; i++) {
        const bubble = bubblesRef.current[i];
        
        // Skip bubbles that are being animated for selection
        if (bubble.animating) continue;
        
        // Get current position
        const x = getValueX(bubble.position);
        const y = getValueY(bubble.position);
        const radius = bubble.size / 2;
        
        // Apply damping to velocity (simulate air resistance)
        let vx = bubble.velocity.x * DAMPING;
        let vy = bubble.velocity.y * DAMPING;
        
        // Add tiny gravity for a more natural feel
        vy += GRAVITY;
        
        // Add random movement to create a floating effect
        // Use perlin noise like pattern for smoother randomness
        const time = now / 1000;
        const bubbleId = parseInt(bubble.id.slice(-5), 10) / 10000;
        vx += Math.sin(time * 2 + bubbleId * 10) * RANDOM_FORCE * 0.015;
        vy += Math.cos(time * 2 + bubbleId * 10) * RANDOM_FORCE * 0.015;
        
        // Random impulses (occasional pushes)
        if (Math.random() < 0.01) { // 1% chance each frame
          vx += (Math.random() - 0.5) * RANDOM_FORCE;
          vy += (Math.random() - 0.5) * RANDOM_FORCE;
        }
        
        // Boundary collision checks with more realistic bouncing
        const padding = 5;
        
        // Left/right wall collisions
        if (x - radius < padding) {
          // Left wall collision
          vx = Math.abs(vx) * BOUNCE_ENERGY; // Bounce right
          // Push away from wall to prevent sticking
          bubble.position.setValue({ 
            x: padding + radius + 1, 
            y: y 
          });
        } else if (x + radius > width - padding) {
          // Right wall collision
          vx = -Math.abs(vx) * BOUNCE_ENERGY; // Bounce left
          bubble.position.setValue({ 
            x: width - padding - radius - 1, 
            y: y 
          });
        }
        
        // Top/bottom wall collisions
        if (y - radius < padding) {
          // Top wall collision
          vy = Math.abs(vy) * BOUNCE_ENERGY; // Bounce down
          bubble.position.setValue({ 
            x: x, 
            y: padding + radius + 1
          });
        } else if (y + radius > height - padding) {
          // Bottom wall collision
          vy = -Math.abs(vy) * BOUNCE_ENERGY; // Bounce up
          bubble.position.setValue({ 
            x: x, 
            y: height - padding - radius - 1
          });
        }
        
        // Apply mutual repulsion/attraction to simulate bubbles pushing each other
        // This creates a more lively interaction
        for (let j = 0; j < bubblesRef.current.length; j++) {
          if (i === j) continue; // Skip self
          
          const otherBubble = bubblesRef.current[j];
          if (otherBubble.animating) continue;
          
          const otherX = getValueX(otherBubble.position);
          const otherY = getValueY(otherBubble.position);
          
          // Calculate distance vector
          const dx = otherX - x;
          const dy = otherY - y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          // Only apply forces when bubbles are close enough
          if (dist < MIN_FORCE_DISTANCE) {
            // Calculate normalized direction
            const nx = dx / dist;
            const ny = dy / dist;
            
            // Calculate repulsion force (stronger when closer)
            const force = REPULSION_STRENGTH * (MIN_FORCE_DISTANCE - dist);
            
            // Apply repulsive force (bubbles push away from each other)
            vx -= nx * force;
            vy -= ny * force;
          }
        }
        
        // Apply velocity to position
        const newX = x + vx * deltaTime * BASE_SPEED;
        const newY = y + vy * deltaTime * BASE_SPEED;
        
        // Update position
        bubble.position.setValue({ x: newX, y: newY });
        
        // Save updated velocity
        bubble.velocity.x = vx;
        bubble.velocity.y = vy;
      }
      
      // Check for collisions every frame for more responsive interactions
      handleBubbleCollisions();
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  
  // Enhanced collision handling with realistic physics
  const handleBubbleCollisions = () => {
    if (bubblesRef.current.length < 2) return;
    
    // Physics constants
    const RESTITUTION = 0.85; // Elasticity of collisions (0-1)
    const COLLISION_PUSH = 0.6; // How strongly to push apart on collision
    
    // No need to limit checks much - we're using direct pairwise comparisons
    // Check more pairs for better collision detection
    const maxPairsToCheck = Platform.OS === 'android' ? 8 : 12;
    let pairsChecked = 0;
    
    // Check nearby bubbles for potential collisions
    // Use a grid-like approach: check bubbles close to each other
    for (let i = 0; i < bubblesRef.current.length && pairsChecked < maxPairsToCheck; i++) {
      const b1 = bubblesRef.current[i];
      if (!b1 || b1.animating) continue;
      
      const x1 = getValueX(b1.position);
      const y1 = getValueY(b1.position);
      const r1 = b1.size / 2;
      
      // Check collisions with the next few bubbles (to avoid checking all pairs)
      // This approach focuses on bubbles that are more likely to collide
      for (let j = i + 1; j < bubblesRef.current.length && j < i + 4; j++) {
        const b2 = bubblesRef.current[j];
        if (!b2 || b2.animating) continue;
        
        pairsChecked++;
        
        const x2 = getValueX(b2.position);
        const y2 = getValueY(b2.position);
        const r2 = b2.size / 2;
        
        // Fast distance squared check
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const minDist = r1 + r2;
        const minDistSq = minDist * minDist;
        
        // Skip if bubbles are far apart
        if (distSq >= minDistSq * 1.01) continue; // Add a little buffer
        
        // Collision detected - calculate response
        const distance = Math.sqrt(distSq);
        const overlap = minDist - distance;
        
        // Only handle real overlaps
        if (overlap <= 0) continue;
        
        // Calculate normalized collision direction
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate mass proportional to size (area)
        const m1 = r1 * r1;
        const m2 = r2 * r2;
        const totalMass = m1 + m2;
        
        // Push bubbles apart immediately to prevent sticking
        // Larger bubbles move less, smaller bubbles move more
        const pushX = nx * overlap * COLLISION_PUSH;
        const pushY = ny * overlap * COLLISION_PUSH;
        
        // Apply position corrections proportional to mass
        b1.position.setValue({
          x: x1 - pushX * (m2 / totalMass),
          y: y1 - pushY * (m2 / totalMass)
        });
        
        b2.position.setValue({
          x: x2 + pushX * (m1 / totalMass),
          y: y2 + pushY * (m1 / totalMass)
        });
        
        // Calculate velocity along the collision normal
        const v1n = b1.velocity.x * nx + b1.velocity.y * ny;
        const v2n = b2.velocity.x * nx + b2.velocity.y * ny;
        
        // Skip collision response if bubbles are already moving apart
        if (v1n - v2n > 0) continue;
        
        // Calculate impulse scalar for collision response
        const impulse = (2 * (v2n - v1n) * RESTITUTION) / totalMass;
        
        // Apply impulse to velocities based on mass
        const impulseX = nx * impulse;
        const impulseY = ny * impulse;
        
        // Update velocities with calculated impulse
        b1.velocity.x += impulseX * m2;
        b1.velocity.y += impulseY * m2;
        
        b2.velocity.x -= impulseX * m1;
        b2.velocity.y -= impulseY * m1;
        
        // Add a small random component to prevent bubbles from getting stuck together
        b1.velocity.x += (Math.random() - 0.5) * 0.01;
        b1.velocity.y += (Math.random() - 0.5) * 0.01;
        
        // Provide visual feedback for collisions - slight scale effect
        // Only on stronger collisions
        const collisionSpeed = Math.abs(v2n - v1n);
        if (collisionSpeed > 0.5) {
          const scaleFactor = Math.min(1.05, 1 + collisionSpeed * 0.02);
          
          // Small temporary scale effect
          Animated.sequence([
            Animated.timing(b1.scale, {
              toValue: scaleFactor,
              duration: 50,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad)
            }),
            Animated.timing(b1.scale, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
              easing: Easing.out(Easing.elastic(2))
            })
          ]).start();
        }
      }
      
      // Also check a couple random bubbles for better distribution of checks
      if (bubblesRef.current.length > 5 && pairsChecked < maxPairsToCheck) {
        // Pick a random bubble that's not too close to i
        const randomOffset = 4 + Math.floor(Math.random() * (bubblesRef.current.length - 4));
        const randomIndex = (i + randomOffset) % bubblesRef.current.length;
        
        if (randomIndex !== i) {
          const b2 = bubblesRef.current[randomIndex];
          if (!b2 || b2.animating) continue;
          
          pairsChecked++;
          
          const x2 = getValueX(b2.position);
          const y2 = getValueY(b2.position);
          const r2 = b2.size / 2;
          
          // Fast distance check
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distSq = dx * dx + dy * dy;
          const minDist = r1 + r2;
          const minDistSq = minDist * minDist;
          
          // Only process nearby bubbles
          if (distSq < minDistSq * 1.01) {
            // Process collision (same as above)
            const distance = Math.sqrt(distSq);
            const overlap = minDist - distance;
            
            if (overlap > 0) {
              // Same collision response as above
              const nx = dx / distance;
              const ny = dy / distance;
              
              // Calculate mass proportional to area
              const m1 = r1 * r1;
              const m2 = r2 * r2;
              const totalMass = m1 + m2;
              
              // Push apart based on mass
              const pushX = nx * overlap * COLLISION_PUSH;
              const pushY = ny * overlap * COLLISION_PUSH;
              
              b1.position.setValue({
                x: x1 - pushX * (m2 / totalMass),
                y: y1 - pushY * (m2 / totalMass)
              });
              
              b2.position.setValue({
                x: x2 + pushX * (m1 / totalMass),
                y: y2 + pushY * (m1 / totalMass)
              });
              
              // Calculate impulse
              const v1n = b1.velocity.x * nx + b1.velocity.y * ny;
              const v2n = b2.velocity.x * nx + b2.velocity.y * ny;
              
              // Skip if moving apart
              if (v1n - v2n > 0) continue;
              
              const impulse = (2 * (v2n - v1n) * RESTITUTION) / totalMass;
              const impulseX = nx * impulse;
              const impulseY = ny * impulse;
              
              b1.velocity.x += impulseX * m2;
              b1.velocity.y += impulseY * m2;
              
              b2.velocity.x -= impulseX * m1;
              b2.velocity.y -= impulseY * m1;
            }
          }
        }
      }
    }
  };
  
  // Track long press timers for each bubble
  const longPressTimersRef = useRef<Record<string, TimeoutID>>({});
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Add fields to track bubbles being held and visual feedback
  const [holdingBubble, setHoldingBubble] = useState<string | null>(null);
  
  // Increase tooltip display time to allow users to see the new instructions
  const TOOLTIP_DISPLAY_TIME = 7000; // 7 seconds to ensure users have time to read
  
  // Animation refs for wobble effect
  const wobbleAnimsRef = useRef<Record<string, Animated.Value>>({});
  
  // Check if this is the first time seeing the screen - simplified without AsyncStorage for now
  useEffect(() => {
    // Show tooltip for longer to make sure users see the instructions
    // This avoids any issues with AsyncStorage causing crashes
    const tooltipTimer = setTimeout(() => {
      setShowTooltip(false);
    }, TOOLTIP_DISPLAY_TIME);
    
    return () => clearTimeout(tooltipTimer);
  }, []);
  
  // Handle touch start - initiate potential long press
  const handleTouchStart = (bubble: BubbleItem) => {
    // Skip if already animating
    if (bubble.animating) return;
    
    // Create wobble animation
    if (!wobbleAnimsRef.current[bubble.id]) {
      wobbleAnimsRef.current[bubble.id] = new Animated.Value(0);
    }
    
    // Set a timer for long press - reduced from 600ms to 300ms for faster response
    longPressTimersRef.current[bubble.id] = setTimeout(() => {
      console.log(`Long press detected on bubble: ${bubble.text}`);
      
      // Mark this bubble as being held
      setHoldingBubble(bubble.id);
      
      // Enhanced dismissal animation that's more distinctive from the selection animation
      Animated.sequence([
        // Initial quick back-and-forth wobble phase
        Animated.timing(wobbleAnimsRef.current[bubble.id], {
          toValue: 1,
          duration: 250, // Faster wobble
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad)
        }),
        // Color flash + swell phase - much more distinctive than selection animation
        Animated.parallel([
          // Swell larger than the selection animation
          Animated.timing(bubble.scale, {
            toValue: 1.5, // Larger than the selection animation (1.2)
            duration: 400, // Faster than before (600)
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          }),
          // More dramatic rotation during swell for visual distinction
          Animated.timing(wobbleAnimsRef.current[bubble.id], {
            toValue: 2, // Use a different value for the second phase
            duration: 400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic)
          })
        ]),
        // Pop phase with spin for extra visual distinction
        Animated.parallel([
          Animated.timing(bubble.scale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic)
          }),
          Animated.timing(bubble.opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic)
          }),
          // Add a spin during the pop for more dramatic effect
          Animated.timing(wobbleAnimsRef.current[bubble.id], {
            toValue: 3, // Third phase value
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic)
          })
        ])
      ]).start(() => {
        console.log(`Dismiss animation complete for bubble: ${bubble.text}`);
        
        // Clear holding state
        setHoldingBubble(null);
        
        // Remove this bubble from the ref
        bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
        
        // Add a new bubble if there are options in queue
        let newBubble: BubbleItem | null = null;
        
        if (queuedOptionsRef.current.length > 0) {
          // Get next option from queue
          const newOption = queuedOptionsRef.current[0];
          queuedOptionsRef.current = queuedOptionsRef.current.slice(1);
          
          console.log(`Adding new bubble from queue after dismissal: ${newOption}`);
          
          // Create new bubble
          newBubble = generateNewBubble(newOption);
          
          // Add to bubbles ref first
          bubblesRef.current.push(newBubble);
          
          // Animate entrance
          Animated.parallel([
            Animated.timing(newBubble.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.quad)
            }),
            Animated.spring(newBubble.scale, {
              toValue: 1,
              friction: 6,
              tension: 40,
              useNativeDriver: true
            })
          ]).start();
        }
        
        // Update our bubblesList state to match the current bubbles
        setBubblesList(prev => {
          // Remove the dismissed bubble
          const filtered = prev.filter(b => b.id !== bubble.id);
          
          // Add the new bubble if it exists
          if (newBubble) {
            return [...filtered, newBubble];
          }
          
          return filtered;
        });
        
        // Force a render to update UI
        triggerRender();
        
        // Haptic feedback removed for now to avoid potential errors
        console.log('Pop animation completed');
      });
      
      // Haptic feedback removed for now to avoid potential errors
      console.log('Started hold animation');
    }, 300); // Reduced from 600ms to 300ms for faster response
  };
  
  // Handle touch end - cancel the long press or trigger selection
  const handleTouchEnd = (bubble: BubbleItem) => {
    // Clear any pending long press timer
    if (longPressTimersRef.current[bubble.id]) {
      clearTimeout(longPressTimersRef.current[bubble.id]);
      delete longPressTimersRef.current[bubble.id];
    }
    
    // If we were holding this bubble but didn't complete the animation, reset it
    if (holdingBubble === bubble.id) {
      // Reset wobble and scale
      wobbleAnimsRef.current[bubble.id]?.setValue(0);
      bubble.scale.setValue(1);
      
      // Clear holding state
      setHoldingBubble(null);
      return;
    }
    
    // If not holding, handle as a normal tap (selection)
    handleBubbleSelect(bubble);
  };
  
  // Handle regular bubble selection (taps)
  const handleBubbleSelect = (bubble: BubbleItem) => {
    // Prevent multiple rapid taps on the same bubble or if holding
    if (bubble.animating || holdingBubble === bubble.id) return;
    
    console.log(`Selecting bubble: ${bubble.text}`);
    
    // Mark bubble as animating
    bubble.animating = true;
    
    // First, update the context and UI state immediately to prevent lag feeling
    // This ensures the chip appears right away
    if (type === 'styles') {
      addStyle(bubble.text);
    } else {
      addBrand(bubble.text);
    }
    
    // Update the selected options state (for chips rendering)
    setSelectedOptions(prevSelected => [...prevSelected, bubble.text]);
    
    // Update the bubble list to reflect the bubble as animating
    setBubblesList(prev => prev.map(b => 
      b.id === bubble.id ? {...b, animating: true} : b
    ));
    
    // Animate the bubble popping out - simplified animation distinct from hold-dismiss
    Animated.parallel([
      // Quick pulse then fade out animation for selection (simpler than the hold animation)
      Animated.sequence([
        // Quick pulse out
        Animated.timing(bubble.scale, {
          toValue: 1.2,
          duration: 80, // Faster than before
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)) // More pronounced bounce
        }),
        // Quick fade down
        Animated.timing(bubble.scale, {
          toValue: 0.1,
          duration: 120, // Faster than before
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic)
        })
      ]),
      // Quick fade out - simpler than the dismissal animation
      Animated.timing(bubble.opacity, {
        toValue: 0,
        duration: 180, // Faster fade for selection
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic)
      })
    ]).start(() => {
      console.log(`Animation complete for bubble: ${bubble.text}`);
      
      // Remove this bubble from the ref immediately
      bubblesRef.current = bubblesRef.current.filter(b => b.id !== bubble.id);
      
      // Add a new bubble if there are options in queue
      let newBubble: BubbleItem | null = null;
      
      if (queuedOptionsRef.current.length > 0) {
        // Get next option from queue
        const newOption = queuedOptionsRef.current[0];
        queuedOptionsRef.current = queuedOptionsRef.current.slice(1);
        
        console.log(`Adding new bubble from queue: ${newOption}`);
        
        // Create new bubble
        newBubble = generateNewBubble(newOption);
        
        // Add to bubbles ref first
        bubblesRef.current.push(newBubble);
        
        // Animate entrance
        Animated.parallel([
          Animated.timing(newBubble.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
          }),
          Animated.spring(newBubble.scale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true
          })
        ]).start();
      }
      
      // Update our bubblesList state to match the current bubbles
      setBubblesList(prev => {
        // Remove the selected bubble
        const filtered = prev.filter(b => b.id !== bubble.id);
        
        // Add the new bubble if it exists
        if (newBubble) {
          return [...filtered, newBubble];
        }
        
        return filtered;
      });
      
      // Force a render to update UI
      triggerRender();
    });
  };
  
  // Handle removing a selection chip
  const handleRemoveSelection = (option: string) => {
    console.log(`Removing selection: ${option}`);
    
    // Remove from context
    if (type === 'styles') {
      removeStyle(option);
    } else {
      removeBrand(option);
    }
    
    // Update the selected options state (for chips rendering)
    setSelectedOptions(prevSelected => prevSelected.filter(o => o !== option));
    
    // Add this option back to bubbles or queue
    if (bubblesRef.current.length < MAX_VISIBLE_BUBBLES) {
      console.log(`Adding removed option back as bubble: ${option}`);
      
      const newBubble = generateNewBubble(option);
      
      // Add to bubbles ref
      bubblesRef.current.push(newBubble);
      
      // Add to state list for rendering
      setBubblesList(prev => [...prev, newBubble]);
      
      // Animate entrance
      Animated.parallel([
        Animated.timing(newBubble.opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        }),
        Animated.spring(newBubble.scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();
    } else {
      console.log(`Adding removed option to queue: ${option}`);
      // Otherwise, add to front of queue
      queuedOptionsRef.current = [option, ...queuedOptionsRef.current];
    }
    
    // Force a render to update UI
    triggerRender();
  };
  
  // Initialize and clean up animations
  useEffect(() => {
    console.log("Component mounted or options changed");
    
    // Try to initialize if we have dimensions
    if (containerSizeRef.current.width > 0 && 
        containerSizeRef.current.height > 0 && 
        options.length > 0 && 
        !isBubblesInitializedRef.current) {
      console.log("Initializing bubbles from useEffect");
      initializeBubbles();
    } else if (!isBubblesInitializedRef.current) {
      // If we don't have dimensions yet, set a backup initialization
      const timer = setTimeout(() => {
        if (!isBubblesInitializedRef.current) {
          console.log("Backup initialization - setting default dimensions");
          // Set default dimensions if we haven't gotten layout yet
          if (containerSizeRef.current.width === 0) {
            const { width, height } = Dimensions.get('window');
            containerSizeRef.current = { 
              width: width * 0.9, 
              height: height * 0.4 
            };
            initializeBubbles();
          }
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // Clean up animation loop on unmount
    return () => {
      console.log("Component unmounting");
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [options]);
  
  // Determine whether text should use multiple lines
  const shouldUseMultiline = (text: string): boolean => {
    // Check if the text contains long words that might need wrapping
    const words = text.trim().split(/\s+/);
    const hasLongWord = words.some(word => word.length > 9);
    
    // Check if the text is particularly long
    const isLongText = text.length > 15;
    
    // Check for special cases where two lines looks better
    const hasMultipleWords = words.length > 1;
    const containsHyphen = text.includes('-');
    
    // Use two lines in any of these cases
    return (
      (hasLongWord && hasMultipleWords) || // Long words in multi-word text
      (isLongText && hasMultipleWords && words.length >= 3) || // Long multi-word text
      (containsHyphen && text.length > 12) // Long hyphenated terms
    );
  };
  
  // Calculate optimal font size based on text and bubble size
  const getOptimalFontSize = (text: string, bubbleSize: number): number => {
    // Step 1: Determine text characteristics
    const wordCount = text.trim().split(/\s+/).length;
    const isSingleWord = wordCount === 1;
    const textLength = text.length;
    const useMultiLine = shouldUseMultiline(text);
    
    // Step 2: Calculate base font size from bubble diameter
    // Larger base size for two-line text
    const baseFontSize = useMultiLine ? 
      bubbleSize * 0.16 : // Smaller base size for multi-line
      bubbleSize * 0.18;  // Normal size for single line
    
    // Step 3: Apply adjustments based on text properties
    let adjustedSize = baseFontSize;
    
    // Single words can have larger font sizes
    if (isSingleWord) {
      // Very short words (2-4 chars) get the largest fonts
      if (textLength <= 4) {
        adjustedSize = Math.min(22, bubbleSize * 0.22);
      } 
      // Medium words (5-8 chars)
      else if (textLength <= 8) {
        adjustedSize = Math.min(20, bubbleSize * 0.20);
      }
      // Longer words (9+ chars)
      else {
        // Scale down more gradually for longer words to prevent shrinking too much
        const lengthFactor = Math.max(0.75, 1 - (textLength - 8) * 0.025);
        adjustedSize = Math.min(18, bubbleSize * 0.18 * lengthFactor);
      }
    }
    // Multi-word text with special handling for multi-line
    else if (useMultiLine) {
      // Two-line text can use larger fonts
      if (textLength <= 20) {
        adjustedSize = Math.min(18, bubbleSize * 0.18);
      } else if (textLength <= 30) {
        adjustedSize = Math.min(16, bubbleSize * 0.16);
      } else {
        adjustedSize = Math.min(14, bubbleSize * 0.14);
      }
    }
    // Single-line multi-word text
    else {
      if (textLength <= 10) {
        adjustedSize = Math.min(18, bubbleSize * 0.18);
      } else if (textLength <= 15) {
        adjustedSize = Math.min(16, bubbleSize * 0.16);
      } else {
        adjustedSize = Math.min(14, bubbleSize * 0.14);
      }
    }
    
    // Step 4: Ensure font size stays within reasonable bounds
    // Different min/max for single vs. multi-line
    const MIN_FONT_SIZE = useMultiLine ? 11 : 12; // Smaller minimum for multi-line
    const MAX_FONT_SIZE = useMultiLine ? 18 : 22; // Smaller maximum for multi-line
    
    return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, adjustedSize));
  };
  
  // Theme colors
  const mainColor = type === 'styles' ? '#FF2D55' : '#007AFF'; // Apple Music red or iOS blue
  const bubbleBgColor = isDarkMode ? 'rgba(40, 40, 40, 0.8)' : 'rgba(242, 242, 247, 0.8)';
  const bubbleBorderColor = isDarkMode ? '#3A3A3C' : '#E5E5EA';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  
  // Add a state for forcing render of bubbles
  const [bubblesList, setBubblesList] = useState<BubbleItem[]>([]);
  
  // Update the bubble list whenever bubblesRef changes
  useEffect(() => {
    // Create a copy of the bubbles ref for rendering
    const updateBubblesList = () => {
      if (bubblesRef.current.length > 0) {
        setBubblesList([...bubblesRef.current]);
      }
    };
    
    // Initial update
    updateBubblesList();
    
    // Set up an interval to periodically check for bubbles
    const checkInterval = setInterval(() => {
      if (bubblesRef.current.length > 0 && bubblesList.length === 0) {
        console.log("Detected bubbles in ref but not in state - updating");
        updateBubblesList();
      }
    }, 500);
    
    return () => clearInterval(checkInterval);
  }, [bubblesList.length]);
  
  // Try to initialize if we have options but no bubbles yet
  useEffect(() => {
    if (options.length > 0 && 
        bubblesList.length === 0 && 
        bubblesRef.current.length === 0 && 
        !isBubblesInitializedRef.current) {
      console.log("Detected options but no bubbles - trying to initialize");
      
      // Use a small timeout to ensure layout has happened
      setTimeout(() => {
        if (containerSizeRef.current.width === 0) {
          const { width, height } = Dimensions.get('window');
          containerSizeRef.current = { 
            width: width * 0.9, 
            height: height * 0.4 
          };
        }
        initializeBubbles();
      }, 300);
    }
  }, [options, bubblesList.length]);
  
  // Debug and development helper
  const showDebugBoundary = false; // Hide the debug boundary in production

  // Helper functions to safely get animated values
  const getValueX = (position: Animated.ValueXY): number => {
    // @ts-ignore: Access private _value field 
    return position.x._value !== undefined ? position.x._value : 0;
  };

  const getValueY = (position: Animated.ValueXY): number => {
    // @ts-ignore: Access private _value field
    return position.y._value !== undefined ? position.y._value : 0;
  };

  return (
    <View style={styles.container}>
      <View 
        style={styles.bubblesContainer} 
        onLayout={onContainerLayout}
      >
        {/* Show fallback if no bubbles */}
        {bubblesList.length === 0 && (
          <View style={styles.fallbackContainer}>
            <Text>Loading style options...</Text>
          </View>
        )}

        {/* Tooltip for teaching about press-and-hold */}
        {showTooltip && bubblesList.length > 0 && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>
              Tip: Tap to select or hold to dismiss any bubble
            </Text>
          </View>
        )}

        {/* Visualization boundary box - helps with debugging bubble placement */}
        {showDebugBoundary && (
          <View style={[
            styles.boundaryBox,
            {
              width: containerSizeRef.current.width - 10, // Increased width (smaller margin)
              height: containerSizeRef.current.height - 10, // Increased height (smaller margin)
              borderColor: 'rgba(255,0,0,0.5)'
            }
          ]} />
        )}
        
        {/* Floating Bubbles */}
        {bubblesList.map((bubble) => (
          <Animated.View
            key={bubble.id}
            style={[
              styles.bubbleWrapper,
              {
                width: bubble.size,
                height: bubble.size,
                transform: [
                  { translateX: bubble.position.x },
                  { translateY: bubble.position.y },
                  { scale: bubble.scale },
                  { translateX: -bubble.size / 2 },
                  { translateY: -bubble.size / 2 },
                  // Add wobble animation if this bubble is being held
                  wobbleAnimsRef.current[bubble.id] ? {
                    // Enhanced wobble animation with different interpolations based on animation phase
                    translateX: wobbleAnimsRef.current[bubble.id].interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3],
                      outputRange: [0, -5, 0, 5, 0, -10, 0, 10, 0, -15, 15, -15, 0]
                    })
                  } : { translateX: 0 },
                  // Add rotation for more distinctive dismissal animation
                  wobbleAnimsRef.current[bubble.id] ? {
                    rotate: wobbleAnimsRef.current[bubble.id].interpolate({
                      inputRange: [0, 1, 2, 3],
                      outputRange: ['0deg', '0deg', '5deg', '-45deg'], // Gradually increasing rotation
                      extrapolate: 'clamp'
                    })
                  } : { rotate: '0deg' }
                ],
                opacity: bubble.opacity
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.bubble,
                { 
                  backgroundColor: bubbleBgColor,
                  borderColor: bubbleBorderColor,
                }
              ]}
              onPressIn={() => handleTouchStart(bubble)}
              onPressOut={() => handleTouchEnd(bubble)}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.bubbleText,
                  { 
                    color: textColor,
                    // Dynamic font size based on text and bubble size
                    fontSize: getOptimalFontSize(bubble.text, bubble.size),
                    // Minimal padding to maximize text space
                    padding: 2,
                    // Center alignment for better appearance
                    textAlign: 'center',
                    // Cover most of bubble interior
                    maxWidth: bubble.size * 0.95,
                    // Allow line height adjustment for multi-line text
                    lineHeight: shouldUseMultiline(bubble.text) ? 
                      Math.min(24, bubble.size * 0.18) : // Tighter for multi-line
                      undefined, // Default for single line
                  }
                ]}
                adjustsFontSizeToFit={true}
                // More aggressive font scaling for better fit
                minimumFontScale={0.35}
                // Allow two lines for longer text
                numberOfLines={shouldUseMultiline(bubble.text) ? 2 : 1}
                allowFontScaling={true}
                // Prevent ellipsis (...) from appearing
                ellipsizeMode="clip"
              >
                {bubble.text}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
      
      {/* Selected Options Chips - Scrollable */}
      <View style={styles.chipsOuterContainer}>
        <ScrollView
          style={styles.chipsScrollView}
          contentContainerStyle={styles.chipsContainer}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          fadingEdgeLength={50}
          alwaysBounceVertical={true}
          overScrollMode="always"
          indicatorStyle={isDarkMode ? "white" : "black"}
        >
          {selectedOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.chip,
                { 
                  backgroundColor: mainColor,
                  borderColor: mainColor,
                }
              ]}
              onPress={() => handleRemoveSelection(option)}
            >
              <Text style={styles.chipText}>{option}</Text>
              <View style={styles.chipRemove}>
                <Text style={styles.chipRemoveText}>×</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Add empty space after last chip for better scrolling UX */}
          {selectedOptions.length > 8 && (
            <View style={styles.chipScrollEndPadding} />
          )}
        </ScrollView>
        
        {/* Optional scroll indicator for better UX */}
        {selectedOptions.length > 8 && (
          <View style={[
            styles.scrollIndicator, 
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]}>
            <Icon 
              name="chevron-down" 
              size={16} 
              color={isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  bubblesContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 300, // Ensure minimum height
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bubbleWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure bubbles appear above fallback
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    padding: 10, // Increased padding for better text display
    // Glassy effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleText: {
    fontWeight: '600',
    textAlign: 'center',
    // Ensure text is centered and adjusts properly
    alignSelf: 'center',
    textAlignVertical: 'center',
    // Improved text rendering
    includeFontPadding: false, // Remove extra padding around text
    maxWidth: '95%', // More of the bubble width for text
    letterSpacing: -0.3, // Tighter letter spacing for better fitting
    // Improve text appearance
    flexShrink: 1, // Allow text to shrink if needed
    flexWrap: 'wrap', // Enable wrapping for multi-line
  },
  // Visualization boundary for debugging bubble placement
  boundaryBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    top: 5, // Positioned closer to the edge
    left: 5, // Positioned closer to the edge
    backgroundColor: 'transparent',
    zIndex: 0,
    opacity: 0.7, // More visible
  },
  // Tooltip for teaching users about hold-to-dismiss
  tooltip: {
    position: 'absolute',
    top: 20,
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker for better visibility
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    // Add subtle shadow for emphasis
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600', // Bolder for better readability
    textAlign: 'center',
    letterSpacing: 0.3, // Slightly increased letter spacing for readability
  },
  // Outer container for the chips section
  chipsOuterContainer: {
    width: '100%',
    minHeight: 60, // Minimum height ensuring at least some chips are visible
    maxHeight: 120, // Maximum height for 2-3 rows of chips
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    position: 'relative', // For positioning scrolling indicator
  },
  // Scrollable container
  chipsScrollView: {
    width: '100%',
    flex: 1,
  },
  // Content container for chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    paddingTop: 10,
    paddingBottom: 15, // Extra padding for better scrolling
    justifyContent: 'flex-start',
  },
  // Extra padding at the end of scrolling chips
  chipScrollEndPadding: {
    height: 15,
    width: '100%',
  },
  // Scroll indicator to show there are more chips
  scrollIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  // Individual chip style
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8, // Slightly larger for better touch target
    paddingHorizontal: 14,
    paddingRight: 8,
    margin: 4,
    borderWidth: 1,
    // Shadow for better visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
    marginRight: 6,
  },
  chipRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 'bold',
  }
});

export default OnboardingBubbles;