import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  GestureResponderEvent,
  Platform,
  InteractionManager,
  ImageBackground,
} from 'react-native';
// import Swiper from 'react-native-swiper'; // Remove Swiper import
import AddToCartButton from '../common/CardButtons/AddToCartButton';
import ContentAction from '../common/CardButtons/contentAction';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';
import { logger } from '../../utils/logger';

// Add type declaration at the top of file (after imports)
// declare const setTimeout: (callback: (...args: any[]) => void, ms: number) => number;
// declare const clearTimeout: (id: number) => void;

// Remove these global functions
// Create global functions for TypeScript to recognize
// const safeSetTimeout = global.setTimeout;
// const safeClearTimeout = global.clearTimeout;

// Add image loading state tracking
interface ProductImage {
  id: string;
  url: string;
  fallbackUrl?: string;
}

// Add interface for image loading state
interface ImageLoadState {
  [key: string]: boolean;
}

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  currency?: string;
  images: ProductImage[];
  onCartPress?: () => void;
  onCardPress?: (index: number) => void;
  onLikePress?: () => void;
  onDislikePress?: () => void;
  onSharePress?: () => void;
  onHidePress?: () => void;
  cardWidth?: number;
  cardStyle?: object;
  isDarkMode?: boolean;
  imageAspectRatio?: number; // Add aspect ratio prop
  isContentActionActive?: boolean; // Whether this card's action menu is active
  onContentActionExpandChange?: (isExpanded: boolean) => void; // Callback when action menu expands/collapses
}

const { width } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (width / 2) - 10; // Default: 2 cards per row with minimal spacing
const CARD_MIN_HEIGHT = 230; // Minimum card height to prevent overlap
const NUM_HEARTS = 10; // Number of hearts in the animation
const DOUBLE_TAP_DELAY = 450; // Increased from 300ms to 600ms for easier double tapping

// Add a cache for preloaded image components to prevent remounting
const imageCache = new Map<string, React.ReactNode>();

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  currency = '$',
  images,
  onCartPress,
  onCardPress,
  onLikePress,
  onDislikePress,
  onSharePress,
  onHidePress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardStyle = {},
  isDarkMode = true, // Default to dark mode
  imageAspectRatio = 1.33, // Default to 4:3 ratio
  isContentActionActive = false, // Whether this card's action menu is currently active
  onContentActionExpandChange, // Callback when action menu expands/collapses
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimatingHearts, setIsAnimatingHearts] = useState(false);
  const lastTapRef = useRef(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollStartTimeRef = useRef(0);
  const singleTapTimeoutRef = useRef<number | null>(null);
  
  // Add state to track loaded images
  const [loadedImages, setLoadedImages] = useState<ImageLoadState>({});
  const [areImagesPreloaded, setAreImagesPreloaded] = useState(false);
  // No need to track errors - products are pre-validated

  // Only show verbose logs in development
  const DEBUG = __DEV__;
  
  // Animation value for overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation direction state to track current animation type
  const [animationDirection, setAnimationDirection] = useState<'like' | 'dislike' | null>(null);
  
  // Heart animations
  const heartAnimations = useRef<{
    y: Animated.Value,
    x: Animated.Value,
    rotate: Animated.Value,
    scale: Animated.Value,
    opacity: Animated.Value
  }[]>(Array(NUM_HEARTS).fill(0).map(() => ({
    y: new Animated.Value(cardWidth),
    x: new Animated.Value(0),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0)
  }))).current;
  
  // Get theme colors based on dark/light mode
  const theme = isDarkMode ? colors.dark : colors.light;
  // Correctly access elevation style - assuming light is the base for structure
  const baseElevationStyle = theme.elevation.light;

  // Animation refs for cleanup
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // Current animation for immediate cancellation
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Add ref to track rendered images to prevent unnecessary rerenders
  const renderedImagesRef = useRef<{[key: string]: boolean}>({});
  
  // No fallback images - products are pre-validated

  // Preload all images and create cached components
  useEffect(() => {
    if (DEBUG) {
      logger.log(`[IMAGE FLOW] ProductCard ${id} mounted/updated, images count:${images.length}`);
    
      // Log each image in detail
      images.forEach((img, index) => {
        logger.log(`[IMAGE FLOW] ProductCard ${id} Image ${index + 1}:`);
        logger.log(`  ID: ${img.id}`);
        logger.log(`  URL: ${img.url}`);
        logger.log(`  URL type: ${typeof img.url}`);
        logger.log(`  URL length: ${img.url?.length || 0}`);
        logger.log(`  URL starts with http: ${img.url?.startsWith('http')}`);
      });
    }
    
    const preloadImages = async () => {
      // console.log(`[ProductCard ${id}] Starting image preloading for ${images.length} images`);
      // Initialize loading state for all images
      const initialLoadState: ImageLoadState = {};
      
      // Prepare image cache entries
      images.forEach((image, index) => {
        initialLoadState[image.id] = false;
        
        // Create a unique key for the image in this product
        const cacheKeyShared = `product-${id}-image-${image.id}-shared`;
        const cacheKeyNormal = `product-${id}-image-${image.id}-normal`;
        
        // Only create cache entry if not already cached
        if (!imageCache.has(cacheKeyShared)) {
          // console.log(`[ProductCard ${id}] Pre-creating cached component for image ${image.id} (shared)`);
          
          // Create shared element version
          imageCache.set(cacheKeyShared, (
            <SharedElement 
              id={`item.${id}.image`} 
              style={{
                overflow: 'hidden', 
                width: '100%', 
                height: '100%', 
                borderRadius: 12,
                backgroundColor: theme.background
              }}
            >
              <Image
                source={{ uri: image.url }}
                style={[styles.image, { width: cardWidth, height: cardWidth * imageAspectRatio, borderRadius: 12 }]}
                resizeMode="cover"
                key={`preloaded-${image.id}-shared`}
                fadeDuration={0}
                onLoadStart={() => {/* console.log(`[ProductCard ${id}] Cached shared image ${image.id} LOAD START`) */}}
                onLoad={() => {
                  // console.log(`[ProductCard ${id}] Cached shared image ${image.id} LOADED`);
                  handleImageLoad(image.id);
                }}
                onError={(e) => {
                  console.error(`[ProductCard ${id}] Cached shared image ${image.id} failed to load: ${e.nativeEvent.error}, URL: ${image.url}`);
                }}
              />
            </SharedElement>
          ));
        }
        
        // Create normal version
        if (!imageCache.has(cacheKeyNormal)) {
          // console.log(`[ProductCard ${id}] Pre-creating cached component for image ${image.id} (normal)`);
          
          imageCache.set(cacheKeyNormal, (
            <View style={{
              overflow: 'hidden', 
              width: '100%', 
              height: '100%', 
              borderRadius: 12,
              backgroundColor: theme.background
            }}>
              <Image
                source={{ uri: image.url }}
                style={[styles.image, { width: cardWidth, height: cardWidth * imageAspectRatio, borderRadius: 12 }]}
                resizeMode="cover"
                key={`preloaded-${image.id}-normal`}
                fadeDuration={0}
                onLoadStart={() => {/* console.log(`[ProductCard ${id}] Cached normal image ${image.id} LOAD START`) */}}
                onLoad={() => {
                  // console.log(`[ProductCard ${id}] Cached normal image ${image.id} LOADED`);
                  handleImageLoad(image.id);
                }}
                onError={(e) => {
                  console.error(`[ProductCard ${id}] Cached normal image ${image.id} failed to load: ${e.nativeEvent.error}, URL: ${image.url}`);
                }}
              />
            </View>
          ));
        }
      });
      
      setLoadedImages(initialLoadState);
      
      // Mark preloading as complete after a short delay to allow rendering
      setAreImagesPreloaded(true);
    };
    
    preloadImages();

    return () => {
      // console.log(`[ProductCard ${id}] Component unmounting`);
      
      // Optionally clean up image cache for this product when unmounting
      images.forEach(image => {
        const cacheKeyShared = `product-${id}-image-${image.id}-shared`;
        const cacheKeyNormal = `product-${id}-image-${image.id}-normal`;
        
        imageCache.delete(cacheKeyShared);
        imageCache.delete(cacheKeyNormal);
      });
    };
  }, [images, id, cardWidth, theme.background]);
  
  // Update rendered images ref when current index changes
  useEffect(() => {
    if (images[currentImageIndex]) {
      const imageId = images[currentImageIndex].id;
      renderedImagesRef.current[imageId] = true;
    }
  }, [currentImageIndex, images]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
      }
    };
  }, []);

  // Animate overlay when content action changes
  useEffect(() => {
    if (isContentActionActive) {
      Animated.timing(overlayOpacity, {
        toValue: 0.85, // Increased from 0.4 to 0.65 for a darker overlay
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isContentActionActive, overlayOpacity]);

  // Clean up animations on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Stop and clear any running animation
      if (currentAnimation.current) {
        currentAnimation.current.stop();
        currentAnimation.current = null;
      }
      
      // Stop all animations in the refs array
      animationRefs.current.forEach(anim => {
        if (anim) {
          anim.stop();
        }
      });
      
      // Clear the animation refs array
      animationRefs.current = [];
      
      // Clear any timeouts
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
    };
  }, []);

  const handleAddToCart = () => {
    if (onCartPress) {
      onCartPress();
    }
  };

  const formatPrice = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle image load
  const handleImageLoad = (imageId: string) => {
    // console.log(`[ProductCard ${id}] handleImageLoad called for image id:${imageId}, previously loaded:${!!loadedImages[imageId]}`);
    setLoadedImages(prev => ({
      ...prev,
      [imageId]: true
    }));
  };

  // Double tap handler
  const handleDoubleTap = () => {
    // Clear any pending single tap actions
    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }
    
    // Stop any running animation
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }
    
    // Toggle liked state and run the appropriate animation
    if (!isLiked) {
      // Show primary colored hearts floating up
      setAnimationDirection('like');
      animateHeartsOut();
      if (onLikePress) onLikePress();
    } else {
      // Show broken hearts floating down
      setAnimationDirection('dislike');
      animateHeartsIn();
      if (onDislikePress) onDislikePress();
    }
    setIsLiked(!isLiked);
  };
  
  // Heart floating out animation (like)
  const animateHeartsOut = () => {
    setIsAnimatingHearts(true);
    
    // Stop any current animations first
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }
    
    // Reset all heart animations
    heartAnimations.forEach((anim, i) => {
      anim.y.setValue(cardWidth * 0.8); // Start from bottom
      anim.opacity.setValue(0);
      anim.scale.setValue(0.3);
      
      // Start with tighter cluster at bottom
      const randomX = (Math.random() * cardWidth * 0.4) - (cardWidth * 0.2);
      anim.x.setValue(randomX);
      
      // Random rotation
      const randomRotate = (Math.random() * 40) - 20;
      anim.rotate.setValue(randomRotate);
    });
    
    // Create animations for each heart
    const animations = heartAnimations.map((anim, i) => {
      // Stagger the animations
      const delay = i * 50;
      
      // Create animation sequence for this heart
      return Animated.sequence([
        // Wait for the staggered delay
        Animated.delay(delay),
        // Then animate all properties together
        Animated.parallel([
          // Rise up
          Animated.timing(anim.y, {
            toValue: -(cardWidth * 0.5), // Float up higher for more dramatic effect
            duration: 1800,
            useNativeDriver: true,
          }),
          // Expand outward (genie effect)
          Animated.timing(anim.x, {
            toValue: randomOutwardValue(cardWidth), // More dramatic outward dispersion
            duration: 1800,
            useNativeDriver: true,
          }),
          // Fade in quickly then fade out slower
          Animated.sequence([
            Animated.timing(anim.opacity, {
              toValue: 0.9,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          // Scale up more dramatically then down
          Animated.sequence([
            Animated.timing(anim.scale, {
              toValue: 1.5, // Larger scale for more drama
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 0.3,
              duration: 1400,
              useNativeDriver: true,
            }),
          ]),
          // More dramatic random rotation
          Animated.timing(anim.rotate, {
            toValue: randomRotationValue(), // More dramatic rotation
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });
    
    // Run all animations with more dramatic staggering
    const staggerAnim = Animated.stagger(70, animations);
    
    // Store the animation for cancellation
    currentAnimation.current = staggerAnim;
    
    // Add to animation refs for cleanup
    animationRefs.current.push(staggerAnim);
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      
      // Clear references
      if (currentAnimation.current === staggerAnim) {
        currentAnimation.current = null;
      }
      
      const index = animationRefs.current.indexOf(staggerAnim);
      if (index > -1) {
        animationRefs.current.splice(index, 1);
      }
    });
  };
  
  // Heart floating in animation (dislike)
  const animateHeartsIn = () => {
    setIsAnimatingHearts(true);
    
    // Stop any current animations first
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }
    
    // Reset all heart animations
    heartAnimations.forEach((anim, i) => {
      anim.y.setValue(-(cardWidth * 0.2)); // Start from above
      anim.opacity.setValue(0);
      anim.scale.setValue(0.5);
      
      // Wide scattered positions
      const randomX = (Math.random() * cardWidth * 1.2) - (cardWidth * 0.6);
      anim.x.setValue(randomX);
      
      // Random rotation
      const randomRotate = (Math.random() * 60) - 30;
      anim.rotate.setValue(randomRotate);
    });
    
    // Create animations for each heart
    const animations = heartAnimations.map((anim, i) => {
      // Stagger the animations
      const delay = i * 50;
      
      // Create animation sequence for this heart
      return Animated.sequence([
        // Wait for the staggered delay
        Animated.delay(delay),
        // Then animate all properties together
        Animated.parallel([
          // Fall down
          Animated.timing(anim.y, {
            toValue: cardWidth * 0.8, // Fall to bottom
            duration: 1500,
            useNativeDriver: true,
          }),
          // Contract inward (genie effect)
          Animated.timing(anim.x, {
            toValue: randomInwardValue(cardWidth), // Use function instead of direct _value access
            duration: 1500,
            useNativeDriver: true,
          }),
          // Fade in quickly then fade out faster
          Animated.sequence([
            Animated.timing(anim.opacity, {
              toValue: 0.9,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          // Scale up briefly then down quickly
          Animated.sequence([
            Animated.timing(anim.scale, {
              toValue: 1.2,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 0.1, // Smaller final scale
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          // More pronounced rotation
          Animated.timing(anim.rotate, {
            toValue: 0, // Align to vertical for sucking in effect
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });
    
    // Run all animations
    const staggerAnim = Animated.stagger(50, animations);
    
    // Store the animation for cancellation
    currentAnimation.current = staggerAnim;
    
    // Add to animation refs for cleanup
    animationRefs.current.push(staggerAnim);
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      
      // Clear references
      if (currentAnimation.current === staggerAnim) {
        currentAnimation.current = null;
      }
      
      const index = animationRefs.current.indexOf(staggerAnim);
      if (index > -1) {
        animationRefs.current.splice(index, 1);
      }
    });
  };

  // Helper functions to avoid direct _value access
  const randomOutwardValue = (width: number) => {
    // Generate much more dramatic outward dispersion for genie effect
    // Random value between -0.8*width and 0.8*width for wider spread
    return (Math.random() * width * 1.6) - (width * 0.8);
  };
  
  const randomInwardValue = (width: number) => {
    // Generate a value close to center
    return (Math.random() * width * 0.2) - (width * 0.1);
  };
  
  const randomRotationValue = () => {
    // Generate more dramatic random rotation between -60 and 60 degrees
    return (Math.random() * 120) - 60;
  };

  // Create the formatted price string for display
  const formattedPrice = formatPrice(price);
  // Ensure currency is a string
  const currencySymbol = String(currency);

  // Content action sub-actions - bigger icons with explicit colors
  const contentActions = [
    {
      id: 'share',
      icon: <Icon name="share-variant" size={28} color={isDarkMode ? "#FFFFFF" : "#4285F4"} />,
      label: 'Share',
      backgroundColor: 'transparent',
      onClick: onSharePress,
    },
    {
      id: 'like',
      icon: <Icon name="thumb-up-outline" size={28} color={isDarkMode ? "#FFFFFF" : "#4CAF50"} />,
      label: 'Like',
      backgroundColor: 'transparent',
      onClick: onLikePress,
    },
    {
      id: 'dislike',
      icon: <Icon name="thumb-down-outline" size={28} color={isDarkMode ? "#FFFFFF" : "#F44336"} />,
      label: 'Dislike',
      backgroundColor: 'transparent',
      onClick: onDislikePress,
    },
  ].slice(0, 3);

  // Dynamic styles based on provided cardWidth
  const dynamicStyles = {
    container: {
      width: cardWidth,
      minHeight: CARD_MIN_HEIGHT,
      marginBottom: 3, // Add margin to the bottom of each card
    },
    imageContainer: {
      height: cardWidth * imageAspectRatio, 
    },
  };

  // Handle image scroll start
  const handleScrollBegin = () => {
    // console.log(`[ProductCard ${id}] Scroll BEGIN, currentIndex:${currentImageIndex}`);
    setIsScrolling(true);
    scrollStartTimeRef.current = Date.now();
    
    // Clear any pending single tap actions
    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }
  };

  // Handle image scroll end
  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageWidth = event.nativeEvent.layoutMeasurement.width;
    const newIndex = Math.round(contentOffsetX / imageWidth);
    
    // console.log(`[ProductCard ${id}] Scroll END, previousIndex:${currentImageIndex}, newIndex:${newIndex}, offset:${contentOffsetX}`);
    
    if (newIndex !== currentImageIndex) {
      // console.log(`[ProductCard ${id}] Changing current image index from ${currentImageIndex} to ${newIndex}`);
      setCurrentImageIndex(newIndex);
    }
    
    // We use a short delay to determine if this was a scroll or a tap
    window.setTimeout(() => {
      setIsScrolling(false);
    }, 50);
  };

  // Handle image press - combines tap, double-tap, and navigation
  const handleImagePress = () => {
    const now = Date.now();
    
    // Ignore taps that are too close to scrolling
    if (now - scrollStartTimeRef.current < 150) {
      return;
    }
    
    // Check for double tap first
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // This is a double tap
      handleDoubleTap();
      return;
    }
    
    // Single tap - update the last tap time
    lastTapRef.current = now;
    
    // Clear any existing single tap timeout
    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
    }
    
    // Set a longer timeout for single tap to prioritize double tap
    singleTapTimeoutRef.current = window.setTimeout(() => {
      // If no second tap occurred within double tap window,
      // and we're not currently scrolling, treat as a single tap
      if (now === lastTapRef.current && !isScrolling) {
        handleCardPress();
      }
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY + 20); // Wait slightly longer than double tap delay
  };

  // Handle card press - forward to parent with current image index
  const handleCardPress = () => {
    if (onCardPress) {
      // console.log(`[ProductCard ${id}] handleCardPress called. currentImageIndex: ${currentImageIndex}. Triggering navigation.`);
      onCardPress(currentImageIndex);
    }
  };

  // Render image component with placeholder - use cached components
  const renderImage = (image: ProductImage, index: number, isCurrentImage: boolean) => {
    if (DEBUG) {
      logger.log(`[ProductCard ${id}] Rendering image [${index}] id:${image.id}, isCurrentImage:${isCurrentImage}, isLoaded:${!!loadedImages[image.id]}`);
      logger.log(`[ProductCard ${id}] Image URL:`, image.url);
    }
    
    // Track that this image has been rendered at least once
    renderedImagesRef.current[image.id] = true;
    
    // Create cache keys for both versions of this image
    const cacheKeyShared = `product-${id}-image-${image.id}-shared`;
    const cacheKeyNormal = `product-${id}-image-${image.id}-normal`;
    
    // Add default styling for the image container
    const imageContainerStyle = {
      width: cardWidth,
      height: '100%' as const,
      backgroundColor: theme.surface
    };

    // Always use SharedElement for current image to enable transitions
    if (isCurrentImage) {
      return (
        <SharedElement 
          id={`item.${id}.image`}
          style={{
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            borderRadius: 12,
            backgroundColor: theme.background
          }}
        >
          <Image
            source={{ uri: image.url }}
            style={{ width: cardWidth, height: cardWidth * imageAspectRatio, borderRadius: 12 }}
            resizeMode="cover"
            key={`preloaded-${image.id}-shared`}
            fadeDuration={0}
            onLoadStart={() => {
              if (DEBUG) logger.log(`[IMAGE FLOW] Image ${index} loading STARTED: ${image.url}`);
            }}
            onLoad={() => {
              if (DEBUG) logger.log(`[IMAGE FLOW] SUCCESS! Image ${index} LOADED: ${image.url}`);
              handleImageLoad(image.id);
            }}
            onError={(e) => {
              // Image load error - no fallback needed
              if (DEBUG) {
                logger.error(`[IMAGE FLOW] FAILED! Image ${index} failed to load: ${e.nativeEvent.error}`);
                logger.error(`[IMAGE FLOW] Failed URL: ${image.url}`);
                logger.error(`[IMAGE FLOW] URL Host: ${image.url.split('/')[2]}`);
              }
            }}
          />
        </SharedElement>
      );
    } else {
      // For non-current images, use normal view
      return (
        <View style={{
          overflow: 'hidden', 
          width: '100%', 
          height: '100%', 
          borderRadius: 12,
          backgroundColor: theme.background
        }}>
          <Image
            source={{ uri: image.url }}
            style={{ width: cardWidth, height: cardWidth * imageAspectRatio, borderRadius: 12 }}
            resizeMode="cover"
            key={`preloaded-${image.id}-normal`}
            fadeDuration={0}
            onLoadStart={() => {
              if (DEBUG) logger.log(`[IMAGE FLOW] Normal Image ${index} loading STARTED: ${image.url}`);
            }}
            onLoad={() => {
              if (DEBUG) logger.log(`[IMAGE FLOW] SUCCESS! Normal Image ${index} LOADED: ${image.url}`);
              handleImageLoad(image.id);
            }}
            onError={(e) => {
              // Image load error - no fallback needed
              if (DEBUG) {
                logger.error(`[IMAGE FLOW] FAILED! Normal Image ${index} failed to load: ${e.nativeEvent.error}`);
                logger.error(`[IMAGE FLOW] Failed URL: ${image.url}`);
                logger.error(`[IMAGE FLOW] URL Host: ${image.url.split('/')[2]}`);
              }
            }}
          />
        </View>
      );
    }
  };

  // Add effect to track currentImageIndex changes
  useEffect(() => {
    // console.log(`[ProductCard ${id}] Current image index changed to: ${currentImageIndex}`);
  }, [currentImageIndex]);

  return (
    <View
      style={[
        styles.container, 
        dynamicStyles.container, 
        {
          width: cardWidth,
          backgroundColor: theme.background,
          shadowColor: isDarkMode ? colors.dark.elevation.light.shadowColor : baseElevationStyle.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: baseElevationStyle.shadowOpacity,
          shadowRadius: 0,
          elevation: baseElevationStyle.elevation,
        },
        cardStyle
      ]}
    >
      <View style={[styles.innerContainer, { backgroundColor: theme.background }]}>
        {/* Floating hearts animated overlay */}
        {heartAnimations.map((anim, index) => (
          <Animated.View
            key={`heart-${index}`}
            style={[
              styles.heartContainer,
              {
                transform: [
                  { translateY: anim.y },
                  { translateX: anim.x },
                  { rotate: anim.rotate.interpolate({
                      inputRange: [-60, 60],
                      outputRange: ['-60deg', '60deg']
                    })
                  },
                  { scale: anim.scale }
                ],
                opacity: anim.opacity,
              }
            ]}
          >
            {animationDirection === 'dislike' ? (
              <Icon
                name="heart-broken"
                size={24}
                color="white"
              />
            ) : (
              <Icon
                name="heart" 
                size={24}
                color={theme.primary}
              />
            )}
          </Animated.View>
        ))}
        
        {/* Image area with swipe and tap detection */}
        <View 
          style={[styles.imageContainer, dynamicStyles.imageContainer, { backgroundColor: theme.surface }]}
        >
          {images.length > 1 ? (
            <View style={{ flex: 1, backgroundColor: theme.surface }}>  
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBegin}
                onMomentumScrollEnd={handleScrollEnd}
                style={styles.scrollView}
                scrollEventThrottle={16}
                // Optimize scrolling performance
                removeClippedSubviews={false}
                // Disable clipping during transitions
                collapsable={false}
                // Add caching and optimization for images
                contentContainerStyle={{flexGrow: 1}}
                // Maintain scroll position
                // maintainVisibleContentPosition={{
                //   minIndexForVisible: 0,
                //   autoscrollToTopThreshold: 10,
                // }}
                decelerationRate="fast"
                // Performance optimizations
                keyboardShouldPersistTaps="handled"
              >
                {images.map((image, index) => (
                  <TouchableOpacity 
                    key={image.id}
                    activeOpacity={0.9}
                    onPress={handleImagePress}
                    onLongPress={onHidePress}
                    delayLongPress={300}
                    style={{width: cardWidth, height: '100%'}}
                  >
                    {renderImage(image, index, index === currentImageIndex)}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={[
                styles.pagination,
                { backgroundColor: 'transparent' }
              ]}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentImageIndex && styles.activeDot
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : images.length === 1 ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={handleImagePress}
              onLongPress={onHidePress}
              delayLongPress={300}
              style={{width: '100%', height: '100%'}}
            >
              <SharedElement 
                id={`item.${id}.image`}
                style={{
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%',
                  borderRadius: 12,
                  backgroundColor: theme.background
                }}
              >
                <Image
                  source={{ uri: images[0].url }}
                  style={{ borderRadius: 12, width: '100%', height: cardWidth * imageAspectRatio }}
                  resizeMode="cover"
                  fadeDuration={0} 
                  onLoadStart={() => {
                    if (DEBUG) {
                      logger.log(`[IMAGE FLOW] Single Image loading STARTED: ${images[0].url}`);
                      logger.log(`[IMAGE FLOW] URL host: ${images[0].url.split('/')[2]}`);
                      logger.log(`[IMAGE FLOW] URL path: ${images[0].url.split('/').slice(3).join('/')}`);
                    }
                  }}
                  onLoad={() => {
                    if (DEBUG) logger.log(`[IMAGE FLOW] SUCCESS! Single Image LOADED: ${images[0].url}`);
                    handleImageLoad(images[0].id);
                  }}
                  onError={(e) => {
                    // Image load error - no fallback needed
                    if (DEBUG) {
                      logger.error(`[IMAGE FLOW] FAILED! Single Image failed to load`);
                      logger.error(`[IMAGE FLOW] Error details: ${e.nativeEvent.error}`);
                      logger.error(`[IMAGE FLOW] Failed URL: ${images[0].url}`);
                      logger.error(`[IMAGE FLOW] URL length: ${images[0].url.length}`);
                      logger.error(`[IMAGE FLOW] URL host: ${images[0].url.split('/')[2]}`);
                      logger.error(`[IMAGE FLOW] Network state: ${typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'}`);
                    }
                  }}
                />
              </SharedElement>
            </TouchableOpacity>
          ) : (
            <View style={[styles.image, styles.placeholderImage, { backgroundColor: theme.surface }]} />
          )}
          
          <View style={[
            styles.cartButtonContainer,
            { backgroundColor: 'transparent' }
          ]}>
            <AddToCartButton
              size={30}
              onPress={handleAddToCart}
              productImageSource={images.length > 0 ? images[currentImageIndex].url : undefined}
              color={theme.primary}
              style={{ backgroundColor: 'white' }}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.infoContainer,
            { backgroundColor: theme.background }
          ]}
          activeOpacity={0.8}
          onPress={handleCardPress}
        >
          <Text 
            style={[
              styles.name, 
              { color: theme.text.secondary } 
            ]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {String(name)}
          </Text>
          
          <View style={[
            styles.priceActionRow,
            { backgroundColor: theme.background }
          ]}>
            <Text 
              style={[
                styles.price,
                { color: theme.text.primary } 
              ]}
            >
              {currencySymbol}{formattedPrice}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Overlay for active card */}
      {isContentActionActive && (
        <Animated.View 
          style={[
            styles.cardOverlay,
            { opacity: overlayOpacity }
          ]}
          pointerEvents="none"
        />
      )}
      
      {/* Content action component */}
      <View style={styles.contentActionContainer} pointerEvents="box-none">
        <ContentAction
          actions={contentActions}
          expansionMode="vertical"
          size={32}
          backgroundColor={isDarkMode ? '#333333' : '#FFFFFF'}
          iconColor={theme.text.primary}
          spacing={4}
          isActive={isContentActionActive}
          onExpandChange={onContentActionExpandChange}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    margin: 3, 
    overflow: 'visible', // Allow shadow to be visible
    position: 'relative',
  },
  innerContainer: { 
    borderRadius: 12,
    overflow: 'hidden', // Clip image and info content
    zIndex: 0, 
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    position: 'relative',
    zIndex: 1, 
  },
  cartButtonContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  heartContainer: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    zIndex: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
  },
  infoContainer: {
    paddingTop: 6,  
    paddingHorizontal: 6, 
    paddingBottom: 0, 
  },
  priceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', 
    marginTop: 0, 
  },
  name: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 0, 
  },
  price: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 5,
  },
  contentActionContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    zIndex: 9999,         // Extremely high zIndex to ensure it's above everything
    elevation: 9999,      // Extreme elevation for Android
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none', // Allow touch events to pass through to container but not to children
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 50,
    borderRadius: 12, // Match card border radius
  },
  pagination: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'white',
    marginHorizontal: 2,
  },
});

export default ProductCard; 