import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AddToCartButton from '../common/CardButtons/AddToCartButton';
import ContentAction from '../common/CardButtons/contentAction';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import { FeedStackParamList } from '../../navigations/feedNavigator/FeedNavigator';
import ExpandedPartialProductFeed from '../ExpandedFeed/ExpandedPartialProductFeed';

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

export interface PartialDataProductCardProps {
  id: string;
  name?: string;
  brand?: string;
  price?: number;
  currency?: string;
  images: ProductImage[];
  productUrl?: string;
  onCartPress?: () => void;
  onCardPress?: () => void;
  onLikePress?: () => void;
  onDislikePress?: () => void;
  onSharePress?: () => void;
  onHidePress?: () => void;
  onLinkPress?: () => void;
  cardWidth?: number;
  cardStyle?: object;
  isDarkMode?: boolean;
  imageAspectRatio?: number;
  isContentActionActive?: boolean;
  onContentActionExpandChange?: (isExpanded: boolean) => void;
}

const { width } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (width / 2) - 10; // Default: 2 cards per row with minimal spacing
const CARD_MIN_HEIGHT = 230; // Minimum card height to prevent overlap
const NUM_HEARTS = 10; // Number of hearts in the animation
const DOUBLE_TAP_DELAY = 450; // Increased from 300ms to 600ms for easier double tapping

const PartialDataProductCard: React.FC<PartialDataProductCardProps> = ({
  id,
  name,
  brand,
  price,
  currency = '$',
  images,
  productUrl = 'https://example.com', // Fallback URL
  onCartPress,
  onCardPress,
  onLikePress,
  onDislikePress,
  onSharePress,
  onHidePress,
  onLinkPress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardStyle = {},
  isDarkMode = true, // Default to dark mode
  imageAspectRatio = 1.33, // Default to 4:3 ratio
  isContentActionActive = false,
  onContentActionExpandChange,
}) => {
  // Get navigation
  const navigation = useNavigation<StackNavigationProp<FeedStackParamList>>();

  const [isLiked, setIsLiked] = useState(false);
  const [isAnimatingHearts, setIsAnimatingHearts] = useState(false);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<number | null>(null);
  
  // Add state to track loaded images
  const [loadedImages, setLoadedImages] = useState<ImageLoadState>({});
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
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

  // State for popup visibility
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  // Determine which image to use - always use the first one
  const mainImage = images.length > 0 ? images[0] : null;

  // Determine link text
  const linkText = brand ? `Shop ${brand}` : name ? name : 'Shop now';

  // Add state to store the card position for the popup animation
  const [cardPosition, setCardPosition] = useState({
    x: 0,
    y: 0,
    width: cardWidth,
    height: cardWidth * imageAspectRatio
  });
  
  // Ref for the card component to measure its position
  const cardRef = useRef<View>(null);
  
  // Measure card position when needed
  const measureCardPosition = () => {
    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        setCardPosition({ x, y, width, height });
      });
    }
  };

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

  // Update measureCardPosition to run on mount and when needed
  useEffect(() => {
    // Measure card position on first render
    const timeoutId = window.setTimeout(() => {
      measureCardPosition();
    }, 500); // Delay to ensure layout is complete
    
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleAddToCart = () => {
    if (onCartPress) {
      onCartPress();
    }
  };

  // Handle image load
  const handleImageLoad = (imageId: string) => {
    // console.log(`[PartialDataProductCard ${id}] handleImageLoad called for image id:${imageId}`);
    setLoadedImages(prev => ({
      ...prev,
      [imageId]: true
    }));
    setIsImageLoaded(true);
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

  // Handle image press - combines tap, double-tap, and navigation
  const handleImagePress = () => {
    const now = Date.now();
    
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
      // If no second tap occurred within double tap window, treat as a single tap
      if (now === lastTapRef.current) {
        handleCardPress();
      }
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY + 20); // Wait slightly longer than double tap delay
  };

  // Handle card press - open popup
  const handleCardPress = () => {
    // Measure card position before showing popup
    measureCardPosition();
    
    // Wait a tiny bit to allow measure to complete
    window.setTimeout(() => {
      // Show the popup
      // console.log(`[PartialDataProductCard ${id}] Opening popup with URL: ${productUrl}, position:`, cardPosition);
      setIsPopupVisible(true);
    }, 50);
  };

  // Handle link icon press - prompt for external browser
  const handleLinkIconPress = (e: any) => {
    e.stopPropagation(); // Prevent card press
    
    Alert.alert(
      "Open in browser",
      `Would you like to open this link in your external browser?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Open", 
          onPress: () => {
            // First try custom handler if provided
            if (onLinkPress) {
              onLinkPress();
              return;
            }
            
            // Open in external browser
            if (productUrl) {
              // Add mobile parameters to the URL if they don't exist
              let urlToOpen = productUrl;
              
              try {
                // Use string manipulation instead of URL object
                // Check if URL has query parameters
                if (urlToOpen.includes('?')) {
                  // URL already has parameters, append mobile parameters
                  if (!urlToOpen.includes('mobile=')) {
                    urlToOpen += '&mobile=1';
                  }
                  if (!urlToOpen.includes('view=')) {
                    urlToOpen += '&view=mobile';
                  }
                } else {
                  // URL has no parameters, add them
                  urlToOpen += '?mobile=1&view=mobile';
                }
              } catch (error) {
                // If string manipulation fails, use the original URL
                console.log(`[PartialDataProductCard ${id}] Error modifying URL: ${error}`);
                urlToOpen = productUrl;
              }
              
              // Now open the URL with mobile parameters
              Linking.canOpenURL(urlToOpen).then(supported => {
                if (supported) {
                  Linking.openURL(urlToOpen);
                } else {
                  console.log(`[PartialDataProductCard ${id}] Cannot open URL: ${urlToOpen}`);
                }
              });
            }
          } 
        }
      ]
    );
  };

  // Handle popup close
  const handlePopupClose = () => {
    setIsPopupVisible(false);
  };

  // Handle long press to toggle content action
  const handleLongPress = () => {
    // console.log(`[PartialDataProductCard ${id}] Long press detected, toggling content action`);
    if (onContentActionExpandChange) {
      // Toggle content action state
      onContentActionExpandChange(!isContentActionActive);
    }
  };

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
    innerContainer: {
      // Add shadow based on theme
      shadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.8 : 0.4,
      shadowRadius: 4,
      elevation: 3,
      borderRadius: 12,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    }
  };

  return (
    <>
      <TouchableOpacity
        ref={cardRef}
        style={[
          styles.container, 
          dynamicStyles.container, 
          {
            width: cardWidth,
            backgroundColor: theme.background,
          },
          cardStyle
        ]}
        activeOpacity={0.9}
        delayLongPress={500}
        onLongPress={handleLongPress}
        onPress={handleCardPress}
      >
        <View 
          style={[
            styles.innerContainer, 
            dynamicStyles.innerContainer,
            { 
              backgroundColor: theme.background,
            }
          ]}
        >
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
          
          {/* Image area with tap detection */}
          <View 
            style={[styles.imageContainer, dynamicStyles.imageContainer, { backgroundColor: theme.surface }]}
          >
            {mainImage ? (
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={handleImagePress}
                onLongPress={onHidePress}
                delayLongPress={300}
                style={{width: '100%', height: '100%'}}
              >
                <Image
                  source={{ uri: mainImage.url }}
                  style={[styles.image, { width: cardWidth, height: cardWidth * imageAspectRatio }]}
                  resizeMode="cover"
                  // Disable fade-in animation for smoother experience
                  fadeDuration={0} 
                  onLoad={() => handleImageLoad(mainImage.id)}
                  onError={(e) => console.error(`[PartialDataProductCard ${id}] Image failed to load: ${e.nativeEvent.error}, URL: ${mainImage.url}`)}
                />
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
                productImageSource={mainImage?.url}
                color={theme.primary}
                style={{ backgroundColor: 'white' }}
              />
            </View>
          </View>

          {/* Link Button Container */}
          <View style={styles.linkContainer}>
            <TouchableOpacity
              style={[
                styles.linkButton, 
                { 
                  backgroundColor: theme.background,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }
              ]}
              onPress={handleCardPress}
              activeOpacity={0.8}
            >
              <Text 
                style={[styles.linkText, { color: theme.text.primary }]} 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {linkText}
              </Text>
              <TouchableOpacity
                onPress={handleLinkIconPress}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Icon name="arrow-top-right" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
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
        
        {/* Content action component - positioned OUTSIDE the main card */}
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
      </TouchableOpacity>
      
      {/* Popup for expanded content - pass the sourcePosition */}
      <ExpandedPartialProductFeed
        isVisible={isPopupVisible}
        onClose={handlePopupClose}
        productId={id}
        productName={name}
        brandName={brand}
        productUrl={productUrl}
        imageUrl={mainImage?.url}
        sourcePosition={cardPosition}
      />
    </>
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
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden', // Clip image and info content
    zIndex: 0,
    marginBottom: 10,
    // Shadow properties applied dynamically
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 0, // Remove border radius from image container
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
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 0, // Remove border radius from image
  },
  placeholderImage: {
    // Styling for placeholder when image is not available
  },
  linkContainer: {
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 8,
    paddingTop: 0, // Remove padding between image and link
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0, // No border radius on top
    borderBottomLeftRadius: 12, // Add curve to bottom corners
    borderBottomRightRadius: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  linkText: {
    fontSize: 12, // Reduced from 13
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  contentActionContainer: {
    position: 'absolute',
    bottom: -18, // Increased from -18 to -28 for more margin
    right: 1,
    zIndex: 9999,
    elevation: 9999,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',// Add more margin on top
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
});

export default PartialDataProductCard; 