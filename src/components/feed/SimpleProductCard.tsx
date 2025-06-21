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
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import AddToCartButton from '../common/CardButtons/AddToCartButton';
import ContentAction from '../common/CardButtons/contentAction';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import { logger } from '../../utils/logger';
import { FadeIn } from 'react-native-reanimated';

interface ProductImage {
  id: string;
  url: string;
  fallbackUrl?: string;
}

export interface SimpleProductCardProps {
  id: string;
  price: number;
  currency?: string;
  brand?: string;
  images: ProductImage[];
  onCartPress?: () => void;
  onCardPress?: () => void;
  onLikePress?: () => void;
  onDislikePress?: () => void;
  onSharePress?: () => void;
  onHidePress?: () => void;
  cardWidth?: number;
  cardStyle?: object;
  isDarkMode?: boolean;
  imageAspectRatio?: number;
  isContentActionActive?: boolean;
  onContentActionExpandChange?: (isExpanded: boolean) => void;
}

// Define StyleSheet types
interface Styles {
  container: ViewStyle;
  innerContainer: ViewStyle;
  imageContainer: ViewStyle;
  cartButtonContainer: ViewStyle;
  heartContainer: ViewStyle;
  scrollView: ViewStyle;
  image: ImageStyle;
  placeholderImage: ViewStyle;
  brandContainer: ViewStyle;
  infoContainer: ViewStyle;
  price: TextStyle;
  brandText: TextStyle;
  contentActionContainer: ViewStyle;
  cardOverlay: ViewStyle;
  pagination: ViewStyle;
  dot: ViewStyle;
  activeDot: ViewStyle;
  noImageContainer: ViewStyle;
  noImageText: TextStyle;
  imageWrapper: ViewStyle;
  productImage: ImageStyle;
}

const { width } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (width / 2) - 10;
const CARD_MIN_HEIGHT = 200; // Reduced minimum height since we don't have text elements
const NUM_HEARTS = 10;

const SimpleProductCard: React.FC<SimpleProductCardProps> = ({
  id,
  price,
  currency = '$',
  brand,
  images,
  onCartPress,
  onCardPress,
  onLikePress,
  onDislikePress,
  onSharePress,
  onHidePress,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardStyle = {},
  isDarkMode = true,
  imageAspectRatio = 1.33,
  isContentActionActive = false,
  onContentActionExpandChange,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimatingHearts, setIsAnimatingHearts] = useState(false);
  const lastTapRef = useRef(0);
  
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
  
  // Store animation references to clean up later
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);
  
  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      // Stop all running animations when component unmounts
      animationRefs.current.forEach(anim => {
        if (anim) anim.stop();
      });
      animationRefs.current = [];
    };
  }, []);
  
  // Get theme colors based on dark/light mode
  const theme = isDarkMode ? colors.dark : colors.light;
  // Correctly access elevation style - assuming light is the base for structure
  const baseElevationStyle = theme.elevation.light;

  // Animate overlay when content action changes
  useEffect(() => {
    if (isContentActionActive) {
      Animated.timing(overlayOpacity, {
        toValue: 0.85,
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

  const handleAddToCart = () => {
    if (onCartPress) {
      onCartPress();
    }
  };

  // Double tap handler
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms for double tap
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!isAnimatingHearts) {
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
      }
    }
    
    // Update the last tap timestamp
    lastTapRef.current = now;
  };
  
  // Heart floating out animation (like)
  const animateHeartsOut = () => {
    setIsAnimatingHearts(true);
    
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
    
    // Clear previous animations
    animationRefs.current.forEach(anim => {
      if (anim) anim.stop();
    });
    animationRefs.current = [];
    
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
    animationRefs.current.push(staggerAnim);
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      
      // Remove from refs when complete
      const index = animationRefs.current.indexOf(staggerAnim);
      if (index > -1) {
        animationRefs.current.splice(index, 1);
      }
    });
  };
  
  // Heart floating in animation (dislike)
  const animateHeartsIn = () => {
    setIsAnimatingHearts(true);
    
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
    
    // Clear previous animations
    animationRefs.current.forEach(anim => {
      if (anim) anim.stop();
    });
    animationRefs.current = [];
    
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
    animationRefs.current.push(staggerAnim);
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      
      // Remove from refs when complete
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
      marginBottom: 3,
    },
    imageContainer: {
      height: cardWidth * imageAspectRatio, 
    },
  };

  // Handle image scroll
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const imageWidth = event.nativeEvent.layoutMeasurement.width;
    const newIndex = Math.round(contentOffsetX / imageWidth);
    
    if (newIndex !== currentImageIndex) {
      setCurrentImageIndex(newIndex);
    }
  };

  const formatPrice = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Create the formatted price string for display
  const formattedPrice = formatPrice(price);
  // Ensure currency is a string
  const currencySymbol = String(currency);

  // No need for URL validation - products are pre-validated

  return (
    <View
      style={[
        styles.container, 
        dynamicStyles.container, 
        {
          backgroundColor: theme.background,
          shadowColor: isDarkMode ? colors.dark.elevation.light.shadowColor : baseElevationStyle.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: baseElevationStyle.shadowOpacity,
          shadowRadius: 0,
          elevation: baseElevationStyle.elevation,
          borderBottomRightRadius: 0,
        },
        cardStyle
      ]}
    >
      <View 
        style={[
          styles.innerContainer,
          { 
            backgroundColor: theme.background,
            borderBottomRightRadius: 0,
          }
        ]}
      >
        <View 
          style={[
            styles.imageContainer, 
            dynamicStyles.imageContainer,
            { backgroundColor: theme.surface }
          ]}
          onTouchStart={(e: GestureResponderEvent) => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              handleDoubleTap();
            }
            lastTapRef.current = now;
          }}
        >
          {/* Floating hearts for like/dislike animations */}
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
                        inputRange: [-30, 30],
                        outputRange: ['-30deg', '30deg']
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
                  color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(244, 67, 54, 0.7)'}
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
          
          {images && images.length > 1 ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              ref={scrollViewRef}
              style={{width: '100%'}}
            >
              {images.map((image, index) => (
                <View
                  key={index}
                  style={styles.imageWrapper}
                >
                  <Image
                    style={[styles.productImage, { width: cardWidth, height: cardWidth * imageAspectRatio }]}
                    source={{
                      uri: image?.url || ''
                    }}
                    onError={(e) => {
                      logger.error(`[SimpleProductCard] Image failed to load: ${e.nativeEvent.error}, URL: ${image?.url || 'undefined'}`);
                    }}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          ) : images && images.length === 1 ? (
            <Image
              style={[styles.productImage, { width: cardWidth, height: cardWidth * imageAspectRatio }]}
              source={{
                uri: images[0]?.url || ''
              }}
              onError={(e) => {
                logger.error(`[SimpleProductCard] Single image failed to load: ${e.nativeEvent.error}, URL: ${images[0]?.url || 'undefined'}`);
              }}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.noImageContainer]}>
              <Icon name="image-off" size={50} color="#cccccc" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          
          {/* Only show cart button if onCartPress is provided */}
          {onCartPress && (
            <View style={[
              styles.cartButtonContainer,
              { backgroundColor: 'transparent' }
            ]}>
              <AddToCartButton
                size={30}
                onPress={handleAddToCart}
                productImageSource={images && images.length > 0 && currentImageIndex < images.length 
                  ? images[currentImageIndex].url 
                  : undefined}
                color={theme.primary}
                style={{ backgroundColor: 'white' }}
              />
            </View>
          )}
        </View>
        
        {/* Show brand first then price */}
        <TouchableOpacity 
          style={[
            styles.infoContainer,
            { backgroundColor: theme.background }
          ]}
          activeOpacity={0.8}
          onPress={onCardPress}
        >
          {brand && (
            <Text 
              style={[
                styles.brandText, 
                { color: theme.text.secondary } 
              ]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {brand}
            </Text>
          )}
          
          <Text 
            style={[
              styles.price, 
              { color: theme.text.primary } 
            ]}
          >
            {currencySymbol}{formattedPrice}
          </Text>
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
      
      <View style={[
        styles.contentActionContainer,
        { backgroundColor: 'transparent' }
      ]}>
        <ContentAction
          actions={contentActions}
          expansionMode="vertical"
          reverseDirection={false}
          showLabels={false}
          size={38} 
          subActionSize={40} 
          backgroundColor={isDarkMode ? '#333333' : '#FFFFFF'}
          iconColor={theme.text.primary} 
          spacing={18} 
          archCurvature={0}
          isActive={isContentActionActive}
          onExpandChange={onContentActionExpandChange}
          isDarkMode={isDarkMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    borderRadius: 12,
    margin: 3,
    overflow: 'visible',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  innerContainer: { 
    borderRadius: 12,
    overflow: 'hidden',
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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
  scrollView: {
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    // Placeholder image styles
  },
  brandContainer: {
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  infoContainer: {
    paddingTop: 6,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  price: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentActionContainer: {
    position: 'absolute',
    bottom: -5,
    right: 4,
    zIndex: 9999,
    elevation: 9999,
    width: 40,
    height: 40,
    marginTop: 10, // Add top margin
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 50,
    borderRadius: 12,
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
  noImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noImageText: {
    marginTop: 10,
    color: '#888888',
    fontSize: 14,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default SimpleProductCard; 