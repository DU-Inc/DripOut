import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  ViewStyle,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import SimpleProductCard from './SimpleProductCard';
import { Swipeable } from 'react-native-gesture-handler';
import ContentAction from '../common/CardButtons/contentAction';
import { SharedElement } from 'react-navigation-shared-element';
import { FeedStackParamList } from '../../navigations/feedNavigator/FeedNavigator';
import AddToCartButton from '../common/CardButtons/AddToCartButton';

// Get device width for responsive layout
const { width } = Dimensions.get('window');
const CARD_MARGIN = 1; // Reduced margin around cards
const DEFAULT_GROUP_WIDTH = width - 24; // Increased side margins to prevent overflow
const CARD_WIDTH = (DEFAULT_GROUP_WIDTH - CARD_MARGIN * 4) / 2; // For 2-column grid
const MAX_HEIGHT = 400; // Reduced maximum height for a more compact look
const REDUCED_HEIGHT = 320; // Smaller height for 2 products
const HEADER_HEIGHT = 50; // Reduced header height

// Common types from SimpleProductCard
interface ProductImage {
  id: string;
  url: string;
}

interface Product {
  id: string;
  price: number;
  currency?: string;
  brand?: string;
  images: ProductImage[];
}

interface OutfitGroupComponentProps {
  products: Product[];
  title?: string;
  onCartPress?: (productId: string) => void;
  onCardPress?: (productId: string) => void;
  onGroupCartPress?: () => void;
  onLikePress?: (id: string) => void;
  onDislikePress?: (id: string) => void;
  onSharePress?: (id: string) => void;
  onBookmarkPress?: (id: string) => void;
  onHidePress?: (id: string) => void;
  isDarkMode?: boolean;
  isContentActionActive?: boolean;
  onContentActionExpandChange?: (isExpanded: boolean) => void;
  outfitId?: string;
}

const SWIPE_THRESHOLD_PERCENTAGE = 0.30; // 30% of card width
const SNAP_POINT_PERCENTAGE = 0.60; // Card will snap to 60% open
const FULL_SWIPE_THRESHOLD_PERCENTAGE = 0.6; // 60% of width for full-swipe

const OutfitGroupComponent: React.FC<OutfitGroupComponentProps> = ({
  products,
  title = 'Outfit Collection',
  onCartPress,
  onCardPress,
  onGroupCartPress,
  onLikePress,
  onDislikePress,
  onSharePress,
  onBookmarkPress,
  onHidePress,
  isDarkMode = true,
  isContentActionActive = false,
  onContentActionExpandChange,
  outfitId = 'outfit-' + Date.now(), // Generate random ID if not provided
}) => {
  // Return empty if less than 2 products
  if (!products || products.length < 2) {
    return null;
  }

  // Get navigation
  const navigation = useNavigation<StackNavigationProp<FeedStackParamList>>();

  // Calculate number of products to display (max 6)
  const numProducts = Math.min(products.length, 6);
  
  // State
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [groupWidth, setGroupWidth] = useState(DEFAULT_GROUP_WIDTH);
  
  // Ref to measure positions for shared element transitions
  const productRefs = useRef<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});
  
  // Animation value for cart animation - ensure we have enough values for all possible products (max 6)
  const cartAnimations = useRef(Array(6).fill(0).map(() => new Animated.Value(0))).current;
  
  // Animation value for overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Swipeable ref
  const swipeableRef = useRef<Swipeable>(null);
  
  // State for multi-image cart animation
  const [currentCartImageIndex, setCurrentCartImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Reference to all product images for cart animation
  const productImageUrls = useMemo(() => 
    products
      .map(p => p.images && p.images.length > 0 ? p.images[0].url : null)
      .filter(Boolean) as string[],
  [products]);
  
  // Computed thresholds based on group width
  const SWIPE_THRESHOLD = SWIPE_THRESHOLD_PERCENTAGE * groupWidth;
  const SNAP_POINT = SNAP_POINT_PERCENTAGE * groupWidth;
  const FULL_SWIPE_THRESHOLD = FULL_SWIPE_THRESHOLD_PERCENTAGE * groupWidth;
  
  // Get theme colors
  const theme = isDarkMode ? colors.dark : colors.light;
  
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
  
  // Handle group add to cart animation
  const handleGroupCartPress = () => {
    if (isAddingToCart) return; // Prevent multiple simultaneous animations
    
    setIsAddingToCart(true);
    setCurrentCartImageIndex(0);
    
    // Recursively animate adding each product to cart
    const animateNextProduct = (index: number) => {
      if (index >= productImageUrls.length) {
        // All products animated, call the callback
        setIsAddingToCart(false);
        if (onGroupCartPress) {
          onGroupCartPress();
        }
        return;
      }
      
      // Update the current image index
      setCurrentCartImageIndex(index);
      
      // Use Animated.timing with a zero-duration callback to act as a timeout
      Animated.timing(new Animated.Value(0), {
        toValue: 0,
        duration: 250, // 250ms between each product animation
        useNativeDriver: true,
      }).start(() => animateNextProduct(index + 1));
    };
    
    // Start the animation sequence
    animateNextProduct(0);
  };
  
  // Navigate to expanded outfit screen
  const handleGroupPress = () => {
    // Format products for navigation
    const navigationProducts = products.map(product => ({
      id: product.id,
      type: 'full' as const, // Default to full
      productName: product.brand ? `${product.brand} Product` : 'Product',
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      productImage: product.images[0]?.url,
      additionalImages: product.images.slice(1).map(img => img.url),
      sourcePosition: productRefs.current[product.id],
    }));

    // Navigate to expanded outfit screen
    navigation.navigate('ExpandedOutfitScreen', {
      products: navigationProducts,
      initialIndex: 0,
      outfitId,
      outfitName: title,
    });
  };
  
  // Handle individual card press
  const handleCardPress = (productId: string, index: number) => {
    if (onCardPress) {
      onCardPress(productId);
    } else {
      // Get the source position for transition animation
      const sourcePosition = productRefs.current[productId];
      
      // Navigate to expanded product screen with just the ID
      // Let the screen fetch the product data from feed.json
      navigation.navigate('ExpandedProductScreen', {
        productId: productId,
        sourcePosition: sourcePosition
      });
    }
  };
  
  // Handle like action
  const handleLike = () => {
    // Toggle like/dislike states
    if (isDisliked) setIsDisliked(false);
    setIsLiked(!isLiked);
    if (onLikePress) onLikePress('outfit');
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle dislike action
  const handleDislike = () => {
    // Toggle like/dislike states
    if (isLiked) setIsLiked(false);
    setIsDisliked(!isDisliked);
    if (onDislikePress) onDislikePress('outfit');
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle bookmark action
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    if (onBookmarkPress) onBookmarkPress('outfit');
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle share action
  const handleShare = () => {
    if (onSharePress) onSharePress('outfit');
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };
  
  // Track swipe progress to determine half-swipe vs full-swipe
  const handleSwipeableWillOpen = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
  };

  // Handle swipe drag - track swipe progress
  const onSwipeProgress = (event: any, gestureState: any) => {
    // Track the progress
    const dragDistance = Math.abs(gestureState.dx);
    setSwipeProgress(dragDistance);
    
    // If we passed the threshold, don't auto-close
    if (dragDistance > SWIPE_THRESHOLD) {
      return false; // Don't terminate gesture
    }
    
    // For smaller drags, follow default behavior
    return undefined;
  };
  
  // Handle swipe completion
  const handleSwipeableOpen = (direction: 'left' | 'right', swipeDistance: number) => {
    // If swiped more than 30% but less than 60%, stop at 60%
    if (swipeDistance > SWIPE_THRESHOLD && swipeDistance < FULL_SWIPE_THRESHOLD) {
      // Let it stay open at current position - do not close
      return;
    }
    
    // If this is a full swipe (over 60%), trigger the primary action
    if (swipeDistance > FULL_SWIPE_THRESHOLD) {
      if (direction === 'right') {
        // Full swipe right - Like
        handleLike();
      } else {
        // Full swipe left - Share
        handleShare();
      }
    }
  };
  
  // Content action sub-actions
  const contentActions = [
    {
      id: 'share',
      icon: <Icon name="share-variant" size={22} color={isDarkMode ? "#FFFFFF" : theme.text.primary} />,
      label: 'Share',
      backgroundColor: 'transparent',
      onClick: handleShare,
      accessibilityLabel: 'Share outfit',
    },
    {
      id: 'bookmark',
      icon: <Icon name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? "#FFCC00" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Bookmark',
      backgroundColor: 'transparent',
      onClick: handleBookmark,
      accessibilityLabel: 'Bookmark outfit',
    },
    {
      id: 'like',
      icon: <Icon name={isLiked ? "thumb-up" : "thumb-up-outline"} size={22} color={isLiked ? "#4CAF50" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Like',
      backgroundColor: 'transparent',
      onClick: handleLike,
      accessibilityLabel: 'Like outfit',
    },
    {
      id: 'dislike',
      icon: <Icon name={isDisliked ? "thumb-down" : "thumb-down-outline"} size={22} color={isDisliked ? "#FF3B30" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Dislike',
      backgroundColor: 'transparent',
      onClick: handleDislike,
      accessibilityLabel: 'Dislike outfit',
    },
  ];
  
  // Render swipe actions with half-swipe menu (swipe right)
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    // Swipe Right reveals actions on the RIGHT side: Dislike, Like
    const dislikeColor = isDisliked ? '#FF3B30' : theme.text.primary; // Red when active
    const likeColor = isLiked ? '#4CAF50' : theme.text.primary;     // Green when active

    return (
      <View style={styles.swipeActionsContainer}>
        {/* Empty View on the Left to push content Right */}
        <View style={{ flex: 1 }} />
        {/* Actions on the RIGHT edge */}
        <Animated.View
          style={[
            styles.swipeActionGroup,
            styles.rightSwipeActions, // Position group to the right
          ]}
        >
          {/* Dislike Action (Appears first on the right)*/}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isDisliked && styles.activeSwipeAction,
            ]}
            onPress={handleDislike}
          >
            <Icon name={isDisliked ? "thumb-down" : "thumb-down-outline"} size={32} color={dislikeColor} />
            <Text style={[styles.swipeActionText, { color: dislikeColor }]}>Dislike</Text>
          </TouchableOpacity>

          {/* Like Action (Appears second on the right) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isLiked && styles.activeSwipeAction,
            ]}
            onPress={handleLike}
          >
            <Icon name={isLiked ? "thumb-up" : "thumb-up-outline"} size={32} color={likeColor} />
            <Text style={[styles.swipeActionText, { color: likeColor }]}>Like</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Render swipe actions with half-swipe menu (swipe left)
  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    // Swipe Left reveals actions on the LEFT side: Bookmark, Share
    const bookmarkColor = isBookmarked ? '#FFCC00' : theme.text.primary; // Yellow when active
    const shareColor = theme.text.primary; // Default color

    return (
      <View style={styles.swipeActionsContainer}>
        {/* Actions on the LEFT edge */}
        <Animated.View
          style={[
            styles.swipeActionGroup,
            styles.leftSwipeActions, // Position group to the left
          ]}
        >
          {/* Bookmark Action (Appears first on the left) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isBookmarked && styles.activeSwipeAction,
            ]}
            onPress={handleBookmark}
          >
            <Icon name={isBookmarked ? "bookmark" : "bookmark-outline"} size={32} color={bookmarkColor} />
            <Text style={[styles.swipeActionText, { color: bookmarkColor }]}>Bookmark</Text>
          </TouchableOpacity>

          {/* Share Action (Appears second on the left) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
            ]}
            onPress={handleShare}
          >
            <Icon name="share-variant" size={32} color={shareColor} />
            <Text style={[styles.swipeActionText, { color: shareColor }]}>Share</Text>
          </TouchableOpacity>
        </Animated.View>
        {/* Empty View on the Right to push content Left */}
        <View style={{ flex: 1 }} />
      </View>
    );
  };
  
  // Create the grid layout based on the number of products
  const renderProductGrid = () => {
    // Slice to maximum 6 products
    const displayProducts = products.slice(0, 6);
    
    // Special layouts based on number of products
    if (displayProducts.length === 2) {
      // For 2 products, display them side by side in a smaller container
      return (
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {displayProducts.map((product, index) => renderProductCard(product, index, { flex: 1 }))}
          </View>
        </View>
      );
    } else if (displayProducts.length === 3) {
      // For 3 products: 2 on top, 1 takes full bottom row
      return (
        <View style={styles.collageContainer}>
          <View style={[styles.gridRow, { flex: 0.6 }]}>
            {renderProductCard(displayProducts[0], 0, { flex: 1 })}
            {renderProductCard(displayProducts[1], 1, { flex: 1 })}
          </View>
          <View style={[styles.gridRow, { flex: 0.4 }]}>
            {renderProductCard(displayProducts[2], 2, { flex: 1 })}
          </View>
        </View>
      );
    } else if (displayProducts.length === 4) {
      // For 4 products: 2x2 grid
      return (
        <View style={styles.gridContainer}>
          <View style={[styles.gridRow, { flex: 0.5 }]}>
            {renderProductCard(displayProducts[0], 0, { flex: 1 })}
            {renderProductCard(displayProducts[1], 1, { flex: 1 })}
          </View>
          <View style={[styles.gridRow, { flex: 0.5 }]}>
            {renderProductCard(displayProducts[2], 2, { flex: 1 })}
            {renderProductCard(displayProducts[3], 3, { flex: 1 })}
          </View>
        </View>
      );
    } else if (displayProducts.length === 5) {
      // For 5 products: First row 2, second row 3
      return (
        <View style={styles.gridContainer}>
          <View style={[styles.gridRow, { flex: 0.5 }]}>
            {renderProductCard(displayProducts[0], 0, { flex: 1 })}
            {renderProductCard(displayProducts[1], 1, { flex: 1 })}
          </View>
          <View style={[styles.gridRow, { flex: 0.5 }]}>
            {renderProductCard(displayProducts[2], 2, { flex: 0.33 })}
            {renderProductCard(displayProducts[3], 3, { flex: 0.33 })}
            {renderProductCard(displayProducts[4], 4, { flex: 0.33 })}
          </View>
        </View>
      );
    } else if (displayProducts.length === 6) {
      // For 6 products: 2x3 grid (slightly larger)
      return (
        <View style={[styles.gridContainer, { height: MAX_HEIGHT - HEADER_HEIGHT + 20 }]}>
          <View style={[styles.gridRow, { flex: 0.33 }]}>
            {renderProductCard(displayProducts[0], 0, { flex: 1 })}
            {renderProductCard(displayProducts[1], 1, { flex: 1 })}
          </View>
          <View style={[styles.gridRow, { flex: 0.33 }]}>
            {renderProductCard(displayProducts[2], 2, { flex: 1 })}
            {renderProductCard(displayProducts[3], 3, { flex: 1 })}
          </View>
          <View style={[styles.gridRow, { flex: 0.33 }]}>
            {renderProductCard(displayProducts[4], 4, { flex: 1 })}
            {renderProductCard(displayProducts[5], 5, { flex: 1 })}
          </View>
        </View>
      );
    }
    
    // Default for any other number (shouldn't happen with our min 2, max 6)
    return (
      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          {displayProducts.map((product, index) => renderProductCard(product, index, { flex: 1 }))}
        </View>
      </View>
    );
  };

  // Helper to render a product card with custom style
  const renderProductCard = (product: Product, productIndex: number, customStyle: ViewStyle = {}) => {
    // Create a ref for this product's AddToCartButton
    const cartButtonRef = useRef(null);
    
    return (
      <Animated.View
        key={product.id}
        style={[
          styles.cardContainer,
          customStyle,
          {
            transform: [
              {
                scale: cartAnimations[productIndex]?.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.9, 0],
                }) || 1,
              },
              {
                translateY: cartAnimations[productIndex]?.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -20, -100],
                }) || 0,
              },
              {
                translateX: cartAnimations[productIndex]?.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, productIndex % 2 === 0 ? 30 : -30, productIndex % 2 === 0 ? 100 : -100],
                }) || 0,
              },
            ],
            opacity: cartAnimations[productIndex]?.interpolate({
              inputRange: [0, 0.8, 1],
              outputRange: [1, 0.5, 0],
            }) || 1,
          },
        ]}
        onLayout={(event) => {
          // Measure and store the position for shared element transition
          event.target.measure((x, y, width, height, pageX, pageY) => {
            productRefs.current[product.id] = {
              x: pageX,
              y: pageY,
              width,
              height
            };
          });
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleCardPress(product.id, productIndex)}
          style={styles.productCardTouch}
        >
          <SharedElement id={`outfit.${product.id}.image`}>
            <View style={styles.imageOnlyContainer}>
              {product.images && product.images.length > 0 ? (
                <Image
                  source={{ uri: product.images[0].url }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.productImage, { backgroundColor: '#333' }]} />
              )}
              <View style={styles.cartButtonContainer}>
                <AddToCartButton
                  size={28}
                  onPress={() => onCartPress && onCartPress(product.id)}
                  productImageSource={product.images && product.images.length > 0 ? product.images[0].url : undefined}
                  color={theme.primary}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                />
              </View>
            </View>
          </SharedElement>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Create the shadow style for the wrapper
  const shadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  };
  
  return (
    <View style={[styles.swipeableWrapper, shadowStyle]}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        onSwipeableOpen={(direction: any, swipeDistance: any) => 
          handleSwipeableOpen(direction as 'left' | 'right', swipeDistance as number)
        }
        overshootLeft={false}
        overshootRight={false}
        friction={2} // Increased friction for better control
        rightThreshold={SWIPE_THRESHOLD} // Use threshold to determine when to stay open
        leftThreshold={SWIPE_THRESHOLD}
        useNativeAnimations // Use native animations for better performance
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleGroupPress}
        >
          <View 
            style={[
              styles.container, 
              {
                backgroundColor: theme.surface, // Same color as header
                width: groupWidth,
                borderWidth: 1,
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: 14,
                height: products.length === 2 ? REDUCED_HEIGHT : MAX_HEIGHT, // Use smaller height for 2 products
                margin: 0, // No margins on the card itself
              }
            ]}
          >
            {/* Header with title and cart icon */}
            <View 
              style={[
                styles.header, 
                { 
                  backgroundColor: theme.surface,
                  borderColor: 'transparent', // Make border invisible
                  borderBottomWidth: 0, // Remove border
                }
              ]}
            >
              <Text style={[styles.title, { color: theme.text.primary }]}>
                {title}
              </Text>
              <View style={styles.headerActions}>
                {/* Content action moved to header */}
                <View style={styles.contentActionInHeader}>
                  <ContentAction
                    actions={contentActions}
                    expansionMode="vertical"
                    size={32}
                    backgroundColor={isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(240, 240, 242, 0.9)'}
                    iconColor={theme.text.primary}
                    spacing={4}
                    isActive={isContentActionActive}
                    onExpandChange={onContentActionExpandChange}
                    isDarkMode={isDarkMode}
                  />
                </View>
                <View style={styles.groupCartButtonContainer}>
                  <AddToCartButton
                    size={38}
                    onPress={handleGroupCartPress}
                    productImageSource={isAddingToCart && productImageUrls.length > currentCartImageIndex 
                      ? productImageUrls[currentCartImageIndex]
                      : productImageUrls.length > 0 ? productImageUrls[0] : undefined}
                    color={theme.primary}
                    style={{ backgroundColor: 'white' }}
                  />
                </View>
              </View>
            </View>
            
            {/* Product grid */}
            {renderProductGrid()}
            
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
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeableWrapper: {
    overflow: 'visible', // Allow shadow to be visible
    borderRadius: 14,
    marginVertical: 12, // Increased vertical margin for shadow visibility
    marginHorizontal: 1, // Increased horizontal margin for shadow visibility
    backgroundColor: 'transparent', // Required for shadow on iOS
    alignSelf: 'center', // Center in parent container
    width: DEFAULT_GROUP_WIDTH,
  },
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    height: MAX_HEIGHT,
    alignSelf: 'center', // Fill the wrapper width
    width: '100%', // Ensure it fills the wrapper width
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0,
    marginBottom: 0,
    height: HEADER_HEIGHT,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentActionInHeader: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  cartButtonContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
  },
  collageContainer: {
    flex: 1,
    padding: CARD_MARGIN,
    height: MAX_HEIGHT - HEADER_HEIGHT,
  },
  collageMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 0.7,
    marginBottom: CARD_MARGIN,
  },
  collageTopRow: {
    marginBottom: CARD_MARGIN,
  },
  collageRight: {
    width: '50%',
    justifyContent: 'space-between',
  },
  gridContainer: {
    padding: CARD_MARGIN,
    flex: 1,
    height: MAX_HEIGHT - HEADER_HEIGHT,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN,
  },
  cardContainer: {
    margin: CARD_MARGIN,
    overflow: 'hidden',
    borderRadius: 12,
  },
  productCardTouch: {
    width: '100%',
    height: '100%',
  },
  emptySlot: {
    opacity: 0,
  },
  swipeActionsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  swipeActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  leftSwipeActions: {
    justifyContent: 'flex-start',
    paddingLeft: 0,
    marginRight: -15,
  },
  rightSwipeActions: {
    justifyContent: 'flex-end',
    paddingRight: 0,
    marginRight: -15,
  },
  swipeAction: {
    height: '100%',
    minWidth: 60,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 0,
  },
  activeSwipeAction: {
    transform: [{scale: 1.1}],
  },
  swipeActionText: {
    fontWeight: '600',
    marginTop: 4,
    fontSize: 11,
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
  contentActionContainer: {
    display: 'none',
  },
  imageOnlyContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    position: 'relative',
    backgroundColor: '#333',
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  groupCartButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OutfitGroupComponent; 