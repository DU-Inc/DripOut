import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
  SafeAreaView,
  ImageBackground,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  NativeTouchEvent,
  PanResponder,
  GestureResponderEvent,
  InteractionManager,
  LogBox,
  PanResponderGestureState,
  Easing,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SimpleProductCard from '../../components/feed/SimpleProductCard';
// import AddToCartButton from '../../components/common/CardButtons/AddToCartButton'; // Commented out for closet functionality
import ContentAction from '../../components/common/CardButtons/contentAction';
import MasonryList from '@react-native-seoul/masonry-list';
import { useTheme } from '../../styles/themeprovider';
import { colors } from '../../styles/theme/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import { SharedElement } from 'react-navigation-shared-element';
import { logger } from '../../utils/logger';
import { toggleSaveProductToCloset, hasUserSavedProduct } from '../../services/closetService';
import { auth } from '../../Config/firebaseconfig';

// Import sample data
// import feedData from '../../data/feed.json';

// For strongly typed route params
interface RouteParams {
  productId?: string;
  sourcePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  product?: any;
  initialImageIndex?: number;
}

// Interface for the mini-header product
interface MiniProductData {
  id: string;
  name: string;
  price: number;
  brand?: string;
  imageUrl: string;
}

// Interface for available sizes
interface SizeOption {
  id: string;
  label: string;
  isAvailable: boolean;
}

// Interface for formatted similar product
interface FormattedSimpleProduct {
  id: string;
  price: number;
  brand?: string;
  images: {
    id: string;
    url: string;
  }[];
  masonryHeightOffset?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRODUCT_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.6; // Increase image height even more (was 0.5)
const NUM_COLUMNS = 2; // Number of columns in the masonry grid
const ITEM_SPACING = 8; // Spacing between masonry items
const LOAD_MORE_COUNT = 10; // Number of items to load when scrolling
const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0; // Get status bar height

// Add Date.now() at the component start as reference point
const APP_START_TIME = Date.now();

// TypeScript-friendly delay function
const createDelay = (ms: number): Promise<void> => {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

// Helper for generating dummy size options
const generateSizeOptions = (): SizeOption[] => {
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  return sizes.map((size, index) => ({
    id: `size-${index}`,
    label: size,
    isAvailable: Math.random() > 0.3, // Random availability
  }));
};

// Add proper type for setTimeout
declare const setTimeout: (callback: () => void, timeout: number) => number;
// Add proper type for clearTimeout
declare const clearTimeout: (id: number | null) => void;

// Define navigation type
type RootStackParamList = {
  ExpandedProductScreen: {
    productId: string;
    sourcePosition?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    product?: any;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Define interface to extend React.FC for shared elements
interface SharedElementsFC extends React.FC {
  sharedElements?: (route: any, otherRoute?: any, showing?: boolean) => any[];
}

const ExpandedProductScreen: SharedElementsFC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { productId, sourcePosition, product: initialProduct, initialImageIndex = 0 } = route.params as RouteParams || {};
  const { isDarkMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation references for cleanup
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
  
  // Content states
  const [product, setProduct] = useState<any>(initialProduct || null);
  const [isLoadingAdditionalData, setIsLoadingAdditionalData] = useState(!initialProduct);
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [similarProducts, setSimilarProducts] = useState<FormattedSimpleProduct[]>([]);
  const [displayedSimilarCount, setDisplayedSimilarCount] = useState(LOAD_MORE_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isContentActionActive, setIsContentActionActive] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isAnimatingHearts, setIsAnimatingHearts] = useState(false);
  const lastTapRef = useRef(0);
  
  // Get theme colors for styling
  const themeColors = isDarkMode ? colors.dark : colors.light;
  
  // Double tap animation constants
  const NUM_HEARTS = 10; // Number of hearts in the animation
  
  // Size options for this product
  const [sizeOptions] = useState<SizeOption[]>(() => generateSizeOptions());
  
  // Calculated card width for masonry layout
  const calculatedItemWidth = (windowWidth - (ITEM_SPACING * (NUM_COLUMNS + 1))) / NUM_COLUMNS;
  
  // Track header position and height for precise calculations
  const [headerPosition, setHeaderPosition] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [safeAreaTopPosition, setSafeAreaTopPosition] = useState(0);
  const headerRef = useRef<View | null>(null);
  const safeAreaRef = useRef<SafeAreaView | null>(null);

  // Near line ~240 add new refs and state for precise measurements
  const similarProductsContainerRef = useRef<View | null>(null);
  const [similarProductsPosition, setSimilarProductsPosition] = useState(0);
  const [similarHeaderHeight, setSimilarHeaderHeight] = useState(0);

  // Add this debug function to log positions when they change
  const logPositions = () => {
    console.log(`[POSITIONS] safeAreaTop: ${safeAreaTopPosition}, headerPos: ${headerPosition}, similarPos: ${similarProductsPosition}, headerHeight: ${similarHeaderHeight}`);
  };

  // Modify the stickyHeaderTriggerPosition calculation with a significant offset
  // to make the header appear much later
  const stickyHeaderTriggerPosition = 
    similarProductsPosition > 0 ? 
    // Use a much larger offset to ensure header only appears when first products are at the top
    similarProductsPosition - safeAreaTopPosition + similarHeaderHeight + 300 : 
    SCREEN_HEIGHT * 1.3; // Higher fallback value

  // Add explicit offset to account for the header's own height + status bar
  const statusBarOffset = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
  const stickyHeaderOffset = statusBarOffset + 12; // Matches paddingTop in stickyHeader style

  // Also modify the headerOpacity interpolation for a more abrupt transition
  const headerOpacity = scrollY.interpolate({
    inputRange: [
      stickyHeaderTriggerPosition - 10, // Just before trigger point
      stickyHeaderTriggerPosition + 10, // Very short transition distance
    ],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Update measurement logic to focus on similar products section
  const measurePositions = () => {
    // Ensure SafeAreaView position is measured first
    if (safeAreaRef.current) {
      safeAreaRef.current.measure((x, y, width, height, pageX, pageY) => {
        setSafeAreaTopPosition(pageY);
        
        // Measure the similar products container position
        if (similarProductsContainerRef.current) {
          similarProductsContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
            setSimilarProductsPosition(pageY);
            logPositions();
          });
        }
        
        // Measure the header height
        if (headerRef.current) {
          headerRef.current.measure((x, y, width, height, pageX, pageY) => {
            setSimilarHeaderHeight(height);
            setHeaderHeight(height);
            logPositions();
          });
        }
      });
    }
  };

  // Replace the useEffect for measurements
  useEffect(() => {
    // Initial delay for component mounting
    const initialTimer = setTimeout(() => {
      measurePositions();
    }, 500);
    
    // Second measurement after a longer delay to ensure everything is rendered
    const secondTimer = setTimeout(() => {
      measurePositions();
    }, 1500);
    
    return () => {
      clearTimeout(initialTimer);
      clearTimeout(secondTimer);
    };
  }, []);

  // Update the onHeaderLayout function to trigger measurements
  const onHeaderLayout = () => {
    // Wait a small delay to ensure layout is complete
    setTimeout(() => {
      measurePositions();
    }, 50);
  };

  // Add a dedicated function for similar products container layout
  const onSimilarProductsLayout = () => {
    setTimeout(() => {
      measurePositions();
    }, 50);
  };
  
  // Animation values for scroll effects - only shrink when sliding panel is visible
  const productContainerScale = scrollY.interpolate({
    inputRange: [0, 450, 550],  // Increase the range to make it happen later
    outputRange: [1, 1, 0.92],  // Make the scaling a bit more subtle
    extrapolate: 'clamp',
  });
  
  // Similar products container animations - make it appear later
  const similarContainerTranslateY = scrollY.interpolate({
    inputRange: [300, 500], // Increase the range to make it happen later
    outputRange: [SCREEN_HEIGHT * 0.6, 50],
    extrapolate: 'clamp',
  });
  
  // Scroll to top button animations - appear later
  const scrollToTopButtonOpacity = scrollY.interpolate({
    inputRange: [450, 500],  // Increase to match other changes
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Mini product image animations - slide in from the top immediately after header is in place
  const miniProductTranslateY = scrollY.interpolate({
    inputRange: [stickyHeaderTriggerPosition - 60, stickyHeaderTriggerPosition - 10], // Adjust to match header
    outputRange: [-50, 0],
    extrapolate: 'clamp',
  });
  
  const miniProductOpacity = scrollY.interpolate({
    inputRange: [stickyHeaderTriggerPosition - 60, stickyHeaderTriggerPosition - 10], // Adjust to match header
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Fetch product data when the screen loads
  useEffect(() => {
    const fetchProduct = async () => {
      if (!initialProduct) {
        setIsLoadingAdditionalData(true);
        
        try {
          // Here you would fetch the product by ID from your API if it wasn't passed
          // For now, we'll just show an error since we want to use passed data
          logger.error("No product data passed from previous screen");
          setIsLoadingAdditionalData(false);
        } catch (error) {
          logger.error("Error fetching product:", error);
          setIsLoadingAdditionalData(false);
        }
      } else {
        // Use the product data passed from OverviewScreen
        logger.log("Using product data passed from OverviewScreen:", initialProduct.id);
        setProduct(initialProduct);
        setIsLoadingAdditionalData(false);
      }
    };
    
    fetchProduct();
  }, [productId, initialProduct]);
  
  // Load similar products on component mount
  useEffect(() => {
    fetchSimilarProducts();
  }, []);

  // Check if product is saved when component mounts or product changes
  useEffect(() => {
    const checkIfProductIsSaved = async () => {
      if (product && auth().currentUser) {
        try {
          const isSaved = await hasUserSavedProduct(auth().currentUser!.uid, product.id);
          setIsSaved(isSaved);
        } catch (error) {
          console.error('Error checking if product is saved:', error);
        }
      }
    };

    checkIfProductIsSaved();
  }, [product]);
  
  // Format product images into the expected format - update to handle more possible formats
  const productImages = product
    ? [
        { id: `${product.id}_main`, url: product.productImage || (product.images && product.images[0]?.url) },
        ...(product.additionalImages?.map((url: string, index: number) => ({
          id: `${product.id}_${index}`,
          url,
        })) || []),
        // Include images array if present (for products from API)
        ...(product.images?.slice(1).map((img: any, index: number) => ({
          id: `${product.id}_img_${index}`,
          url: typeof img === 'string' ? img : img.url,
        })) || []),
      ].filter(img => img.url) // Filter out items with no URL
    : [];
  
  // Handle scroll to top
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  // Handle size selection
  const handleSizeSelect = (sizeId: string) => {
    setSelectedSize(selectedSize === sizeId ? null : sizeId);
  };
  
  // Animation direction state to track current animation type
  const [animationDirection, setAnimationDirection] = useState<'like' | 'dislike' | null>(null);

  // Heart animations (using the same logic from ProductCard)
  const heartAnimations = useRef<{
    y: Animated.Value,
    x: Animated.Value,
    rotate: Animated.Value,
    scale: Animated.Value,
    opacity: Animated.Value
  }[]>(Array(NUM_HEARTS).fill(0).map(() => ({
    y: new Animated.Value(SCREEN_WIDTH / 2),
    x: new Animated.Value(0),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0)
  }))).current;
  
  // Store current animation for cancellation
  const currentAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Handle save/unsave to closet with heart animation
  const handleSaveToggle = async () => {
    if (!auth().currentUser || !product) {
      console.log('User not authenticated or no product data');
      return;
    }

    // Always clear existing animations when toggling
    if (currentAnimation.current) {
      currentAnimation.current.stop();
      currentAnimation.current = null;
    }

    try {
      // Prepare product data for saving
      const productData = {
        name: product.productName || product.name || 'Unnamed Product',
        brand: product.brand || '',
        price: product.price || 0,
        image: productImages.length > 0 ? productImages[0]?.url : '',
        url: product.productUrl || product.url || ''
      };

      // Toggle save status in Firebase
      const newSaveStatus = await toggleSaveProductToCloset(
        auth().currentUser!.uid,
        product.id,
        productData
      );

      // Update local state
      setIsSaved(newSaveStatus);

      // Show appropriate animation
      if (newSaveStatus) {
        // Show like animation (saved to closet)
        setAnimationDirection('like');
        animateHeartsOut();
        console.log('Product saved to closet');
      } else {
        // Show dislike animation (removed from closet)
        setAnimationDirection('dislike');
        animateHeartsIn();
        console.log('Product removed from closet');
      }
    } catch (error) {
      console.error('Error toggling save to closet:', error);
      // Don't update UI state if the operation failed
    }
  };
  
  // Double tap handler for saving/removing from closet
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // 300ms for double tap
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - trigger save to closet
      handleSaveToggle();
    }
    
    // Update the last tap timestamp
    lastTapRef.current = now;
  };
  
  // Heart floating out animation (like)
  const animateHeartsOut = () => {
    // First set animating flag
    setIsAnimatingHearts(true);
    
    // Reset all heart animations
    heartAnimations.forEach((anim, i) => {
      anim.y.setValue(SCREEN_WIDTH * 0.4); // Start from middle
      anim.opacity.setValue(0);
      anim.scale.setValue(0.3);
      
      // Start with tighter cluster at bottom
      const randomX = (Math.random() * SCREEN_WIDTH * 0.4) - (SCREEN_WIDTH * 0.2);
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
            toValue: -(SCREEN_WIDTH * 0.3), // Float up higher for more dramatic effect
            duration: 1800,
            useNativeDriver: true,
          }),
          // Expand outward
          Animated.timing(anim.x, {
            toValue: randomOutwardValue(SCREEN_WIDTH), 
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
    
    // Store the animation for potential cancellation
    currentAnimation.current = staggerAnim;
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      currentAnimation.current = null;
    });
  };
  
  // Heart floating in animation (dislike)
  const animateHeartsIn = () => {
    // First set animating flag
    setIsAnimatingHearts(true);
    
    // Reset all heart animations
    heartAnimations.forEach((anim, i) => {
      anim.y.setValue(-(SCREEN_WIDTH * 0.2)); // Start from above
      anim.opacity.setValue(0);
      anim.scale.setValue(0.5);
      
      // Wide scattered positions
      const randomX = (Math.random() * SCREEN_WIDTH * 1.2) - (SCREEN_WIDTH * 0.6);
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
            toValue: SCREEN_WIDTH * 0.8, // Fall to bottom
            duration: 1500,
            useNativeDriver: true,
          }),
          // Contract inward (genie effect)
          Animated.timing(anim.x, {
            toValue: randomInwardValue(SCREEN_WIDTH), // Use function instead of direct _value access
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
    
    // Store the animation for potential cancellation
    currentAnimation.current = staggerAnim;
    
    staggerAnim.start(() => {
      setIsAnimatingHearts(false);
      setAnimationDirection(null);
      currentAnimation.current = null;
    });
  };
  
  // Helper functions to avoid direct _value access
  const randomInwardValue = (width: number) => {
    // Generate a value close to center
    return (Math.random() * width * 0.2) - (width * 0.1);
  };
  
  // Helper functions for animations
  const randomOutwardValue = (width: number) => {
    // Generate much more dramatic outward dispersion for genie effect
    return (Math.random() * width * 1.6) - (width * 0.8);
  };
  
  const randomRotationValue = () => {
    // Generate more dramatic random rotation between -60 and 60 degrees
    return (Math.random() * 120) - 60;
  };
  
  // Timer ref for cleanup
  const animationTimerRef = useRef<number | null>(null);
  
  // Clean up timer on unmount (add to existing useEffect)
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);
  
  // Handle ContentAction toggle
  const handleContentActionToggle = (isExpanded: boolean) => {
    setIsContentActionActive(isExpanded);
  };
  
  // Fetch similar products from API instead of dummy data
  const fetchSimilarProducts = async (isRefresh = false) => {
    if (isLoadingMore && !isRefresh) return;
    
    setIsLoadingMore(true);
    
    try {
      // Simulate API call with a delay - in real implementation, fetch from your API
      await createDelay(500);
      
      try {
        // You should replace this with actual API call to get similar products
        // For example: const similarProductsData = await fetchSimilarProductsFromApi(productId);
        
        // For now, create some mock data based on the current product's properties
        // In a real implementation, you would call your API here
        const mockSimilarProducts = Array(12).fill(0).map((_, index) => {
          const randomPrice = Math.floor(Math.random() * 100) + 50;
          
          return {
            id: `similar-${product?.id || 'product'}-${index}`,
            price: randomPrice,
            brand: product?.brand || 'Similar Brand',
            images: [{ 
              id: `img-${index}`, 
              url: product?.productImage || `https://via.placeholder.com/400x600?text=Similar+${index}` 
            }],
            masonryHeightOffset: Math.floor(Math.random() * 50)
          };
        });
        
        if (isRefresh) {
          setSimilarProducts(mockSimilarProducts);
          setDisplayedSimilarCount(LOAD_MORE_COUNT);
        } else {
          setSimilarProducts(prevProducts => [...prevProducts, ...mockSimilarProducts]);
        }
      } catch (apiError) {
        logger.error('Error fetching similar products from API:', apiError);
        // Create fallback similar products if API fails
        const fallbackProducts = Array(6).fill(0).map((_, index) => ({
          id: `fallback-${index}`,
          price: 99.99,
          brand: 'Fallback Brand',
          images: [{ id: `fallback-img-${index}`, url: `https://via.placeholder.com/400x600?text=Fallback+${index}` }],
          masonryHeightOffset: Math.floor(Math.random() * 50)
        }));
        
        if (isRefresh) {
          setSimilarProducts(fallbackProducts);
          setDisplayedSimilarCount(LOAD_MORE_COUNT);
        } else {
          setSimilarProducts(prevProducts => [...prevProducts, ...fallbackProducts]);
        }
      }
    } catch (error) {
      logger.error('Error in fetchSimilarProducts:', error);
    } finally {
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchSimilarProducts(true);
  };
  
  // Handle loading more items
  const handleLoadMore = () => {
    if (isLoadingMore) return;
    
    setDisplayedSimilarCount(prev => prev + LOAD_MORE_COUNT);
    fetchSimilarProducts();
  };
  
  // Content action buttons
  const contentActions = [
    {
      id: 'like',
      icon: <Icon name="thumb-up-outline" size={28} color={isDarkMode ? "#FFFFFF" : "#4CAF50"} />,
      label: 'Like',
      backgroundColor: 'transparent',
      onClick: () => console.log("Like"),
    },
    {
      id: 'dislike',
      icon: <Icon name="thumb-down-outline" size={28} color={isDarkMode ? "#FFFFFF" : "#F44336"} />,
      label: 'Dislike',
      backgroundColor: 'transparent',
      onClick: () => console.log("Dislike"),
    },
    {
      id: 'hide',
      icon: <Icon name="eye-off-outline" size={28} color={isDarkMode ? "#FFFFFF" : "#FF9800"} />,
      label: 'Hide',
      backgroundColor: 'transparent',
      onClick: () => console.log("Hide"),
    },
  ];
  
  // Render a single similar product item for masonry
  const renderSimilarItem = ({ item, i }: { item: any, i: number }) => {
    const product = item as FormattedSimpleProduct;
    const aspectRatio = getAspectRatioForProduct(product, i);
    
    return (
      <View 
        key={`product_${product.id}_${i}`}
        style={{
        margin: ITEM_SPACING / 2,
        marginBottom: 2, // Reduced bottom margin for tighter vertical spacing
        marginHorizontal: 4, // Added horizontal margin between cards
        }}
      >
        <SimpleProductCard 
          id={product.id}
          brand={product.brand || ''}
          images={product.images}
          price={product.price}
          // onCartPress={() => console.log('Add to cart:', product.id)} // Commented out for closet functionality
          onLikePress={() => console.log('Like:', product.id)}
          onDislikePress={() => console.log('Dislike:', product.id)}
          onSharePress={() => console.log('Share:', product.id)}
          isDarkMode={isDarkMode}
          onCardPress={() => scrollToTop()}
          cardWidth={calculatedItemWidth - 8} // Slightly smaller to accommodate horizontal margins
          imageAspectRatio={aspectRatio}
        />
      </View>
    );
  };
  
  // Setup refs for image carousel and thumbnail carousel
  const mainCarouselRef = useRef<ScrollView>(null);
  const thumbnailCarouselRef = useRef<FlatList>(null);
  
  // State to track if user is actively scrolling the main carousel
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Switch back to scroll-based image navigation
  const handleImageScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / windowWidth);
    
    if (currentImageIndex !== index) {
      setCurrentImageIndex(index);
      
      // Scroll the thumbnail carousel to keep the active thumbnail centered
      if (thumbnailCarouselRef.current && !isUserScrolling) {
        thumbnailCarouselRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5 // Center the item
        });
      }
    }
  };

  // Update thumbnail press handler to use scrollView
  const handleThumbnailPress = (index: number) => {
    setCurrentImageIndex(index);
    
    // Set a flag to prevent loops with the scroll synchronization
    setIsUserScrolling(true);
    
    // Clear any existing timeout
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    
    // Scroll the main carousel to the selected image
    if (mainCarouselRef.current) {
      mainCarouselRef.current.scrollTo({
        x: index * windowWidth,
        animated: true
      });
    }
    
    // Reset the scrolling flag after animation completes
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 500);
  };
  
  // Effect to update thumbnail carousel when current image changes
  useEffect(() => {
    // Center the active thumbnail when image changes
    if (thumbnailCarouselRef.current && !isUserScrolling) {
      thumbnailCarouselRef.current.scrollToIndex({
        index: currentImageIndex,
        animated: true,
        viewPosition: 0.5 // Center the item
      });
    }
  }, [currentImageIndex]);
  
  // Render a thumbnail for the image slider
  const renderThumbnail = ({ item, index }: { item: any, index: number }) => {
    const isActive = index === currentImageIndex;
    
    return (
      <TouchableOpacity
        style={[
          styles.thumbnailContainer,
          isActive && styles.activeThumbnailContainer
        ]}
        onPress={() => handleThumbnailPress(index)}
        activeOpacity={0.7}
        key={item ? item.id : `thumb-fallback-${index}`}
      >
        <Image 
          source={getValidImageUrl(item, index) ? { uri: getValidImageUrl(item, index) } : undefined}
          style={[
            styles.thumbnailImage,
            !isActive && styles.blurredThumbnail
          ]}
          resizeMode="cover"
        />
        {isActive && <View style={styles.thumbnailActiveIndicator} />}
      </TouchableOpacity>
    );
  };
  
  // Render footer component for masonry list
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <ActivityIndicator 
        size="large" 
        color={themeColors.primary} 
        style={{ marginVertical: 20 }} 
      />
    );
  };
  
  // MasonryList component with proper props
  const MasonryListWithFooter = MasonryList as React.ComponentType<any>;
  
  // Handle main scroll events with header sticking logic - update to check transition state
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Don't process scroll events while transition is active
        if (isTransitionActive) return;
        
        const offsetY = event.nativeEvent.contentOffset.y;
        
        // If content action is open, close it on scroll
        if (isContentActionActive) {
          setIsContentActionActive(false);
        }
        
        // When near bottom, load more similar products
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
        
        if (isCloseToBottom && !isLoadingMore) {
          handleLoadMore();
        }
      }
    }
  );
  
  // Calculate image aspect ratio for similar products
  const getAspectRatioForProduct = (product: any, index: number) => {
    // Similar to OverviewScreen logic, create staggered heights
    const charSum = product.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
    const seed = (index * 13) + charSum;
    const variationIndex = seed % 20;
    
    // Return a value between 1.0 and 1.6
    return 1.0 + (variationIndex * 0.03);
  };
  
  // Add animated value for manual panel dragging
  const panelDragY = useRef(new Animated.Value(0)).current;
  
  // Combine scroll and drag animations for panel position
  const combinedPanelY = Animated.add(
    similarContainerTranslateY,
    panelDragY
  );
  
  // Threshold to determine snap direction
  const SNAP_THRESHOLD = 50; // Reduce threshold for easier snapping
  
  // Track velocity for better snap decisions
  const [panelVelocity, setPanelVelocity] = useState(0);
  
  // Create pan responder for panel dragging
  const panelPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only handle vertical drags with some minimum distance
        return Math.abs(gestureState.dy) > 5 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        // When the user starts dragging, stop any momentum scrolling
        scrollY.stopAnimation();
        // Use setValue(0) after extractOffset() for type safety
        panelDragY.extractOffset();
        setPanelVelocity(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: panelDragY }],
        { 
          useNativeDriver: false,
          listener: (event: NativeSyntheticEvent<NativeTouchEvent>) => {
            const gestureState = event.nativeEvent as unknown as { dy: number; vy: number };
            // Track the velocity for use in release logic
            setPanelVelocity(gestureState.vy);
          }
        }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        // Flatten any offset that might have accumulated
        panelDragY.flattenOffset();
        
        // Get the current position in a type-safe way
        let currPosition = 0;
        combinedPanelY.addListener(state => {
          currPosition = state.value;
        });
        
        // Determine if we should snap up or down based on velocity and displacement
        const snapUp = 
          (panelVelocity < -0.3) || // More sensitive to upward velocity
          (panelVelocity >= -0.3 && panelVelocity <= 0.3 && gestureState.dy < -SNAP_THRESHOLD); // Small displacement up
          
        const snapDown = 
          (panelVelocity > 0.3) || // More sensitive to downward velocity
          (panelVelocity >= -0.3 && panelVelocity <= 0.3 && gestureState.dy > SNAP_THRESHOLD); // Small displacement down
        
        // Snap to the appropriate position with more responsive spring animation
        if (snapUp) {
          // Snap to top position
          Animated.spring(panelDragY, {
            toValue: -currPosition + 50, // Snap to the upper position (50)
            useNativeDriver: false,
            tension: 60, // Increased tension for more responsive feel
            friction: 8  // Reduced friction for more responsive feel
          }).start();
        } else if (snapDown) {
          // Snap to bottom position
          Animated.spring(panelDragY, {
            toValue: -currPosition + SCREEN_HEIGHT * 0.6, // Snap to the lower position
            useNativeDriver: false,
            tension: 60,
            friction: 8
          }).start();
        } else {
          // Return to current position if no significant movement
          Animated.spring(panelDragY, {
            toValue: 0,
            useNativeDriver: false,
            tension: 60,
            friction: 8
          }).start();
        }
        
        // Remove listener to avoid memory leaks
        combinedPanelY.removeAllListeners();
      }
    })
  ).current;
  
  // Action buttons container opacity - fade out when "You May Also Like" appears
  const actionButtonsOpacity = scrollY.interpolate({
    inputRange: [350, 400],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  // Use the initialImageIndex to scroll to the correct image when the component mounts
  useEffect(() => {
    // Set a small delay to ensure the FlatList has rendered
    const timer = setTimeout(() => {
      if (mainCarouselRef.current && initialImageIndex > 0 && initialImageIndex < productImages.length) {
        mainCarouselRef.current.scrollTo({
          x: initialImageIndex * windowWidth,
          animated: false
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [productImages.length, initialImageIndex]);
  
  // LOGGING START (on mount)
  useEffect(() => {
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Component mounted`);
    return () => {
      console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Component unmounted`);
    };
  }, []);

  // LOGGING START (when product is set)
  useEffect(() => {
    if (product) {
      console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Product data set`);
    }
  }, [product]);

  // Log derived productImages state separately if needed
  useEffect(() => {
     if (product) {
         console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Derived productImages updated. Count: ${productImages.length}`);
         
         // Log all image URLs
         if (productImages.length > 0) {
           console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] All image URLs:`);
           productImages.forEach((image, index) => {
             console.log(`  [${index}] ${image.id}: ${image.url}`);
           });
         }
     }
  }, [productImages]); // Log when the derived array changes

  // Near the useEffect section, add these refs and measurement code
  // Add new refs to measure positions
  const imageContainerRef = useRef<View>(null);

  // Add this useEffect for position measurement
  useEffect(() => {
    // Delay measurement until after rendering is complete
    const timer = setTimeout(() => {
      if (product && imageContainerRef.current) {
        imageContainerRef.current.measure(
          (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            console.log('IMAGE CAROUSEL POSITION:', {
              x, y, width, height, pageX, pageY
            });
          }
        );
      }
    }, 500); // Measure after 500ms to ensure components are rendered
    
    return () => clearTimeout(timer);
  }, [product]);

  // Use effect to rearrange images when currentImageIndex changes
  useEffect(() => {
    if (product && productImages.length > 1 && currentImageIndex > 0) {
      // Create a new array with the current image first
      const newImages = [...productImages];
      // Move the current image to the first position
      const currentImage = newImages.splice(currentImageIndex, 1)[0];
      newImages.unshift(currentImage);
      
      // This is just for logging, we're not actually changing the array
      console.log(`Shared image is now first: ${currentImage.url}`);
    }
  }, [currentImageIndex, product]);

  // Track component states
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const [isSliderReady, setIsSliderReady] = useState(false);
  const [areImagesPreloaded, setAreImagesPreloaded] = useState(false);
  const [isFirstImageLoaded, setIsFirstImageLoaded] = useState(false);
  
  // Add refs for critical rendering
  const isInitialRender = useRef(true);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  
  // Create opacity animation values
  const sharedElementOpacity = useRef(new Animated.Value(1)).current;
  const sliderOpacity = useRef(new Animated.Value(1)).current;

  // Near the beginning of the component, add a reference to track transition complete status
  
  const forcedRenderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add a new state to track when transition is active
  const [isTransitionActive, setIsTransitionActive] = useState(true);

  // Add timestamp logging helper
  const getTimestamp = () => {
    const now = new Date();
    // Format time with leading zeros and include milliseconds
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  // Update the transition completion by optimizing the shared element visibility handling
  const completeTransition = () => {
    if (!transitionCompleteRef.current) {
      logger.log(`[${getTimestamp()}] [TRANSITION] EXPLICITLY completing transition`);
      transitionCompleteRef.current = true;
      
      // Apply sequential visibility changes for more natural transitions
      Animated.sequence([
        // First make slider completely visible
        Animated.timing(sliderOpacity, {
          toValue: 1,
          duration: 200, // Slightly faster
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic) // Add easing for smoother animation
        }),
        
        // Then hide shared element
        Animated.timing(sharedElementOpacity, {
          toValue: 0,
          duration: 150, // Faster fade out
          useNativeDriver: true,
          easing: Easing.out(Easing.quad) // Smoother easing
        })
      ]).start(() => {
        // Mark transition as complete to enable interactions
        setTimeout(() => {
          logger.log(`[${getTimestamp()}] [TRANSITION] Transition complete, enabling scrolling and interactions`);
          setIsTransitionActive(false);
        }, 50); // Very short delay - just enough to ensure animation completes
      });
    }
  };

  // Override the transition completion by always keeping shared element visible initially
  useEffect(() => {
    // Force the shared element to stay visible
    sharedElementOpacity.setValue(1);
    
    // Force the slider to be invisible
    sliderOpacity.setValue(1);
    
    return () => {
      // Clean up any pending timeouts
      if (forcedRenderTimeoutRef.current) {
        clearTimeout(forcedRenderTimeoutRef.current);
      }
    };
  }, []);

  // Immediately process product data when available to avoid delays
  useEffect(() => {
    if (product && isInitialRender.current) {
      // Process product data immediately on first render
      isInitialRender.current = false;
      
      // Set transition complete after a very short delay to allow for initial render
      setTimeout(() => {
        if (isMounted.current) {
          setIsTransitionComplete(true);
        }
      }, 50); // Minimal delay
    }
  }, [product]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Add states to track rendering of all required components
  const [mainImageRendered, setMainImageRendered] = useState(false);
  const [sliderContainerRendered, setSliderContainerRendered] = useState(false);
  const [thumbnailsRendered, setThumbnailsRendered] = useState(false);
  const [sliderScrollViewRendered, setSliderScrollViewRendered] = useState(false);

  // Ref to track image dimensions to ensure proper rendering
  const imageDimensionsRef = useRef<{width: number, height: number} | null>(null);

  // Add a more comprehensive tracking system for all required images
  const [loadedImages, setLoadedImages] = useState<{[key: number]: boolean}>({});
  const allImagesLoadedRef = useRef(false);
  const transitionCompleteRef = useRef(false);

  // Compute how many images we expect to load
  const calculateExpectedImageCount = () => {
    // We need at minimum the current image and potentially its neighbors
    return Math.min(3, productImages.length);
  };

  // Check if all critical images are loaded
  const areAllImagesLoaded = () => {
    const expectedCount = calculateExpectedImageCount();
    let loadedCount = 0;
    
    // Count loaded images (focusing on the first few)
    for (let i = 0; i < expectedCount; i++) {
      if (loadedImages[i]) {
        loadedCount++;
      }
    }
    
    return loadedCount >= expectedCount;
  };

  // Safety net for transition
  useEffect(() => {
    // If all rendering conditions are met, add a small safety delay before transition
    if (mainImageRendered && sliderContainerRendered && thumbnailsRendered && sliderScrollViewRendered && isSliderReady) {
      // Check if all images are loaded too
      if (areAllImagesLoaded() && !transitionCompleteRef.current) {
        console.log(`[${getTimestamp()}] [TRANSITION] ALL IMAGES AND RENDERING CONFIRMED - transitioning now`);
        
        // Mark as completed to prevent duplicate transitions
        transitionCompleteRef.current = true;
        
        // Add a small delay to ensure full paint cycle has completed
        setTimeout(() => {
          // REVERSED ORDER! Make slider visible FIRST
          console.log(`[${getTimestamp()}] [TRANSITION] NOW CHANGING Slider opacity to 1`);
          sliderOpacity.setValue(1);
          
          // Small delay to ensure slider is visible before hiding shared element
          setTimeout(() => {
            console.log(`[${getTimestamp()}] [TRANSITION] NOW CHANGING SharedElement opacity to 0`);
            sharedElementOpacity.setValue(0);
            
            // Allow a small delay for the opacity change to complete before enabling interactions
            setTimeout(() => {
              setIsTransitionActive(false);
              console.log(`[${getTimestamp()}] [TRANSITION] Enabling interactions after opacity change`);
            }, 200);
          }, 30); // Give slider time to be fully visible
        }, 16);
      } else {
        console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Rendering confirmed but waiting for all images`);
        console.log(`   Images loaded: ${Object.keys(loadedImages).length}/${calculateExpectedImageCount()}`);
      }
    }
  }, [mainImageRendered, sliderContainerRendered, thumbnailsRendered, sliderScrollViewRendered, isSliderReady, loadedImages]);

  // Enhanced image load handler with complete tracking
  const handleImageLoad = (index: number, event: any) => {
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${index} loaded`);
    
    // Track ALL images as they load
    setLoadedImages(prev => ({
      ...prev,
      [index]: true
    }));
    
    // Special handling for the current/main image
    if (index === currentImageIndex) {
      // Store image dimensions to confirm proper loading
      if (event.nativeEvent?.source) {
        const { width, height } = event.nativeEvent.source;
        imageDimensionsRef.current = { width, height };
        
        // Only mark as rendered if dimensions are valid
        if (width > 0 && height > 0) {
          console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Current image has valid dimensions: ${width}x${height}`);
          setMainImageRendered(true);
        }
      }
    }
    
    // Check if we've loaded all expected images
    if (areAllImagesLoaded()) {
      allImagesLoadedRef.current = true;
      console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] All expected images are now loaded`);
    }

    // Attempt transition only when conditions are met and not already completed
    checkAndStartTransition();
  };

  // Replace the existing checkAndStartTransition function with this more direct version
  const checkAndStartTransition = () => {
    if (transitionCompleteRef.current) return;

    const allConditionsMet = 
      mainImageRendered && 
      sliderContainerRendered && 
      thumbnailsRendered && 
      sliderScrollViewRendered && 
      isSliderReady &&
      areAllImagesLoaded();
    
    if (allConditionsMet) {
      console.log(`[${getTimestamp()}] [TRANSITION] ALL CONDITIONS MET - Initiating explicit transition completion`);
      // Small delay to ensure render cycle completes
      setTimeout(() => completeTransition(), 50);
    } else {
      // Log what conditions are missing for debugging
      console.log(`[${getTimestamp()}] [TRANSITION] Waiting for conditions: mainImg=${mainImageRendered}, sliderCont=${sliderContainerRendered}, thumbs=${thumbnailsRendered}, scrollView=${sliderScrollViewRendered}, sliderReady=${isSliderReady}, allImgsLoaded=${areAllImagesLoaded()}`);
    }
  };

  // Update other functions to use the centralized transition check
  const handleSliderLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Slider layout completed: ${width}x${height}`);
    
    // Only set as rendered if dimensions are valid
    if (width > 0 && height > 0) {
      setSliderContainerRendered(true);
      setIsSliderReady(true);
      // Check if we can start transition
      checkAndStartTransition();
    }
  };

  // Handle thumbnails onLayout
  const handleThumbnailsLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Thumbnails layout completed: ${width}x${height}`);
    
    // Only set as rendered if dimensions are valid
    if (width > 0 && height > 0) {
      setThumbnailsRendered(true);
      // Check if we can start transition
      checkAndStartTransition();
    }
  };

  // Handle ScrollView onLayout
  const handleScrollViewLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] ScrollView layout completed: ${width}x${height}`);
    
    // Only set as rendered if dimensions are valid
    if (width > 0 && height > 0) {
      setSliderScrollViewRendered(true);
      // Check if we can start transition
      checkAndStartTransition();
    }
  };

  // Remove the old logic that's no longer needed
  useEffect(() => {
    if (isFirstImageLoaded && isSliderReady) {
      // Not using this anymore - keeping for reference only
      console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] OLD CONDITIONS - Not using anymore`);
    }
  }, [isFirstImageLoaded, isSliderReady]);

  // Modify getValidImageUrl to return undefined instead of empty string
  const getValidImageUrl = (image: any, index: number): string | undefined => {
    // Return undefined instead of empty string to avoid RN warnings
    if (!image || !image.url) {
      return undefined;
    }
    return image.url;
  }

  // Loading state check
  if (!product && isLoadingAdditionalData) {
    // LOGGING START (loading state)
    console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Rendering loading state (product null, isLoadingAdditionalData true).`);
    // LOGGING END
    return (
      <SafeAreaView
        ref={safeAreaRef}
        style={[
          styles.container, 
          { 
            backgroundColor: themeColors.background,
            paddingTop: Platform.OS === 'ios' ? 20 : 0, // Add padding for status bar on iOS
          }
        ]}
        pointerEvents="box-none"
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />
        {/* Basic Loading UI */}
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={{ color: themeColors.text.secondary, marginTop: 10 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If !product but *not* loading (e.g., fetch failed or initialProduct was null and fetch hasn't started/finished)
  if (!product) {
      // LOGGING START (product null, not loading state)
      console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Rendering empty state (product null, isLoadingAdditionalData false).`);
      // LOGGING END
      // Render an error or different empty state
      return (
           <SafeAreaView
             ref={safeAreaRef} // Keep ref if needed by parent logic
             style={[
               styles.container, 
               { 
                 backgroundColor: themeColors.background,
                 paddingTop: Platform.OS === 'ios' ? 20 : 0, // Add padding for status bar on iOS
               }
             ]}
           >
             <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor="transparent"
                translucent
             />
             {/* Simple Error/Empty Message */}
             <View style={styles.errorContainer}>
                <Text style={{ color: themeColors.text.primary, textAlign: 'center' }}>Product not found or failed to load.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 10 }}>
                    <Text style={{ color: themeColors.primary }}>Go Back</Text>
                </TouchableOpacity>
             </View>
           </SafeAreaView>
         );
  }

  // Immediately after sharedElementOpacity and sliderOpacity are defined, add listeners to track changes
  useEffect(() => {
    // Track when shared element opacity changes
    const sharedElementListener = sharedElementOpacity.addListener(({ value }) => {
      console.log(`[${getTimestamp()}] [CRITICAL] SharedElement opacity changed: ${value}`);
      animatedValues.current.shared = value;
    });
    
    // Track when slider opacity changes
    const sliderListener = sliderOpacity.addListener(({ value }) => {
      console.log(`[${getTimestamp()}] [CRITICAL] Slider opacity changed: ${value}`);
      animatedValues.current.slider = value;
    });
    
    // Log initial values
    console.log(`[${getTimestamp()}] [TRANSITION] Initial opacities - SharedElement: 1, Slider: 0`);
    
    return () => {
      // Clean up listeners
      sharedElementOpacity.removeListener(sharedElementListener);
      sliderOpacity.removeListener(sliderListener);
    };
  }, []);

  // Fix the unsafe _value property access by removing all problematic lines
  const animatedValues = useRef({ shared: 1, slider: 0 });
  
  // Clean up all the old debug logs and safety timer
  // Replace with a single simple log
  console.log(`[${getTimestamp()}] [TRANSITION] Monitoring transition opacity values`);

  // Fix the safety timeout effect to be cleaner
  useEffect(() => {
    // Primary safety timeout - ensures transition completes
    forcedRenderTimeoutRef.current = setTimeout(() => {
      if (!transitionCompleteRef.current) {
        console.log(`[${getTimestamp()}] [TRANSITION] Safety timeout - completing transition`);
        completeTransition();
      }
    }, 800);
    
    // Secondary safety timeout - ensures interaction blocking is removed
    // This runs regardless of the first timeout's outcome
    const safetyInteractionTimer = setTimeout(() => {
      if (isTransitionActive) {
        console.log(`[${getTimestamp()}] [TRANSITION] FORCED enabling of scrolling and interactions (safety)`);
        setIsTransitionActive(false);
      }
    }, 1300); // 800ms (primary timeout) + 500ms (grace period)
    
    return () => {
      if (forcedRenderTimeoutRef.current) {
        clearTimeout(forcedRenderTimeoutRef.current);
      }
      clearTimeout(safetyInteractionTimer);
    };
  }, [isTransitionActive]); // Add isTransitionActive as a dependency

  // Add a new Animated value for the back button opacity
  const backButtonOpacity = useRef(new Animated.Value(0)).current;

  // Add interpolation for the back button - it should be visible when scrolled down,
  // but disappear when the "You May Also Like" header appears
  // Update the interpolation range to make it appear sooner and disappear later
  const backButtonInterpolation = Animated.multiply(
    scrollY.interpolate({
      inputRange: [80, 120],
      outputRange: [0, 1],
      extrapolate: 'clamp'
    }),
    Animated.subtract(
      new Animated.Value(1),
      headerOpacity
    )
  );

  // Original return statement for when product exists
  return (
    <View
      style={[
        styles.container, 
        { 
          backgroundColor: themeColors.background,
        }
      ]}
      pointerEvents="box-none"
    >
      {/* Using View instead of SafeAreaView to avoid extra padding/margin */}
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      
      {/* Transparent interaction blocker - put at the top level but with improved positioning */}
      {isTransitionActive ? (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: isTransitionActive ? 10000 : -1, // Very high z-index during transition, negative after
          }}
          pointerEvents={isTransitionActive ? "auto" : "none"} // Only block touches during transition
        />
      ) : null}

      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isTransitionActive} // Only disable during transition
        contentContainerStyle={{ 
          paddingBottom: 40, 
          paddingTop: statusBarHeight,
          backgroundColor: themeColors.background
        }}
        style={{backgroundColor: themeColors.background}}
        pointerEvents="box-none" // Always use box-none here to allow children to handle touches
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
            enabled={!isTransitionActive}
          />
        }
      >
        {/* Combined product image and details container */}
        <Animated.View
          style={[
            styles.productContainer,
            {
              backgroundColor: themeColors.background,
              transform: [{ scale: productContainerScale }],
              marginTop: 10, // Add a small top margin
            }
          ]}
        >
          {/* Image container - matched with ProductCard styling for transition */}
          <View 
            style={[styles.imageContainer, {backgroundColor: themeColors.background}]}
            ref={imageContainerRef}
            pointerEvents="box-none" // Allow touches to pass through to children
          >
            {/* Match the slider container structure exactly for the shared element */}
            <Animated.View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 10,
                opacity: sharedElementOpacity,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: themeColors.background
              }}
            >
              <SharedElement 
                id={`item.${productId}.image`}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: themeColors.background,
                  opacity: 1 // Force initial opacity to ensure visibility
                }}
              >
                <View 
                  style={{
                    width: SCREEN_WIDTH - 16,
                    height: PRODUCT_IMAGE_HEIGHT + 100,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    borderRadius: 20,
                    backgroundColor: themeColors.background
                  }}
                >
                  <Image
                    source={productImages[currentImageIndex] ? { uri: getValidImageUrl(productImages[currentImageIndex], currentImageIndex) } : undefined}
                    style={{
                      width: SCREEN_WIDTH - 16,
                      height: PRODUCT_IMAGE_HEIGHT +100,
                      resizeMode: 'cover',
                      borderRadius: 20,
                      backgroundColor: themeColors.background
                    }}
                    onLoadStart={() => console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] SharedElement image loading started`)}
                    onLoad={(event) => {
                      // Verify the image actually loaded successfully
                      if (event.nativeEvent?.source?.width > 0 && event.nativeEvent?.source?.height > 0) {
                        console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${currentImageIndex} verified loaded: ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`);
                        handleImageLoad(currentImageIndex, event);
                      } else {
                        console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${currentImageIndex} load event but dimensions missing`);
                      }
                    }}
                    onError={(e) => console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${currentImageIndex} error: ${e.nativeEvent.error}`)}
                  />
                </View>
              </SharedElement>
            </Animated.View>
              
            {/* Keep ScrollView for swiping functionality, but it's not shared */}
            <Animated.View 
              style={{
                position: 'absolute',
                width: '100%', 
                height: '100%',
                opacity: sliderOpacity,
                borderRadius: 16,
                overflow: 'hidden',
                zIndex: 20, // Increase z-index to be above any potential blockers
                backgroundColor: themeColors.background
              }}
              onLayout={handleSliderLayout}
              pointerEvents="box-none" // Allow touches to pass through to the ScrollView
            >
              <ScrollView
                ref={mainCarouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScroll}
                style={[styles.imageCarousel, {backgroundColor: themeColors.background}]}
                contentContainerStyle={[styles.imageCarouselContent, {backgroundColor: themeColors.background}]}
                scrollEventThrottle={16}
                snapToInterval={windowWidth - 16}
                decelerationRate="fast"
                onLayout={handleScrollViewLayout}
                scrollEnabled={!isTransitionActive} // Only disable during transition
                pointerEvents="auto" // Ensure this ScrollView receives touch events
              >
                {productImages.map((image, index) => (
                  <TouchableOpacity
                    key={image ? image.id : `fallback-${index}`}
                    style={[styles.imageWrapper, {backgroundColor: themeColors.background}]}
                    activeOpacity={0.9}
                    disabled={isTransitionActive} // Disable touch during transition
                    onPress={() => {
                      if (isTransitionActive) return; // Skip if transition active
                      
                      const now = Date.now();
                      if (now - lastTapRef.current < 300) {
                        handleDoubleTap();
                      }
                      lastTapRef.current = now;
                    }}
                  >
                    <Image
                      source={getValidImageUrl(image, index) ? { uri: getValidImageUrl(image, index) } : undefined}
                      style={[styles.productImage, {backgroundColor: themeColors.background}]}
                      resizeMode="cover"
                      onLoadStart={() => console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${index} loading started`)}
                      onLoad={(event) => handleImageLoad(index, event)}
                      onError={(e) => console.log(`[${getTimestamp()}] [ExpandedProductScreen ${productId}] Image ${index} error: ${e.nativeEvent.error}`)}
                      key={image?.url || `image-${index}`}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          </View>

          {/* Floating hearts for double-tap animation */}
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
                  zIndex: 200
                }
              ]}
            >
              {animationDirection === 'dislike' ? (
                <Icon
                  name="heart-broken"
                  size={32}
                  color="rgba(255, 255, 255, 0.9)"
                />
              ) : (
                <Icon
                  name="heart"
                  size={32}
                  color={themeColors.primary}
                />
              )}
            </Animated.View>
          ))}

          {/* Top action buttons - positioned absolute inside the image container */}
          <View style={styles.topActionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.actionButtonsRight}>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveToClosetButton]}
                onPress={handleSaveToggle}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={isSaved ? "heart" : "heart-outline"}
                  size={20}
                  color={isSaved ? themeColors.primary : "#FFFFFF"}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.saveToClosetText, { color: isSaved ? themeColors.primary : "#FFFFFF" }]}>
                  {isSaved ? 'In Closet' : 'Save to Closet'}
                </Text>
              </TouchableOpacity>

              {/* Commented out for closet functionality
              <View style={styles.actionButton}>
                <AddToCartButton
                  size={24}
                  onPress={() => console.log('Add to cart pressed in top actions')}
                  productImageSource={productImages.length > 0 ? productImages[currentImageIndex]?.url : undefined}
                  color="#FFFFFF"
                  style={{ backgroundColor: 'transparent' }}
                />
              </View>
              */}
            </View>
          </View>
        </Animated.View>

        {/* Thumbnail carousel below image */}
        <View style={styles.thumbnailsContainer} onLayout={handleThumbnailsLayout}>
          <FlatList
            ref={thumbnailCarouselRef}
            data={productImages}
            renderItem={renderThumbnail}
            keyExtractor={(item) => `thumb-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsContentContainer}
          />
        </View>

        {/* Product details section (now part of the same component as the image) */}
        <View style={[styles.detailsContainer, { backgroundColor: themeColors.background }]}>
          {/* Product title and action icon */}
          <View style={styles.titleContainer}>
            <View style={styles.titleTextContainer}>
              {product.brand && (
                <Text style={[styles.brandText, { color: themeColors.text.secondary }]}>
                  {product.brand}
                </Text>
              )}
              <Text style={[styles.productName, { color: themeColors.text.primary }]}>
                {product.productName}
              </Text>
            </View>

            <View style={styles.actionContainer}>
              <ContentAction
                actions={contentActions}
                expansionMode="vertical"
                size={40}
                backgroundColor={isDarkMode ? '#333333' : '#FFFFFF'}
                iconColor={themeColors.text.primary}
                spacing={16}
                isActive={isContentActionActive}
                onExpandChange={handleContentActionToggle}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>

          {/* Price */}
          <Text style={[styles.priceText, { color: themeColors.text.primary }]}>
            {/* Ensure product.price is defined before formatting */}
            {product.price ? `${currencySymbol || '$'}${formatPrice(product.price)}` : 'Price unavailable'}
          </Text>

          {/* Sizes */}
          <View style={styles.sizesContainer}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              Available Sizes
            </Text>
            <View style={styles.sizeOptions}>
              {sizeOptions.map((size) => (
                <TouchableOpacity
                  key={size.id}
                  style={[
                    styles.sizeOption,
                    {
                      backgroundColor: selectedSize === size.id
                        ? themeColors.primary
                        : themeColors.surface,
                      borderColor: themeColors.border,
                      opacity: size.isAvailable ? 1 : 0.4,
                    }
                  ]}
                  onPress={() => size.isAvailable && handleSizeSelect(size.id)}
                  disabled={!size.isAvailable}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      {
                        color: selectedSize === size.id
                          ? 'white'
                          : themeColors.text.primary
                      }
                    ]}
                  >
                    {size.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
              Description
            </Text>
            <Text style={[styles.descriptionText, { color: themeColors.text.secondary }]}>  
              {product.description || 'Not Available'}
            </Text>
          </View>

          {/* Add to Cart Button - Commented out for closet functionality
          <TouchableOpacity
            style={[styles.addToCartButton, { backgroundColor: theme.primary }]}
            onPress={handleAddToCart}
          >
            <Icon name={isInCart ? "check" : "cart"} size={20} color="#FFFFFF" />
            <Text style={styles.addToCartText}>
              {isInCart ? "Added to Cart" : "Add to Cart"}
            </Text>
          </TouchableOpacity>
          */}

          {/* Save to Favorites Button */}
          {/* Commented out for closet functionality
          <TouchableOpacity
            style={[styles.addToCartButton, { backgroundColor: theme.primary }]}
            onPress={handleAddToCart}
          >
            <Icon name={isInCart ? "check" : "heart"} size={20} color="#FFFFFF" />
            <Text style={styles.addToCartText}>
              {isInCart ? "Saved to Favorites" : "Save to Favorites"}
            </Text>
          </TouchableOpacity>
          */}
        </View>

        {/* Similar Products Section (modal overlay) */}
        <View
          ref={similarProductsContainerRef}
          style={[
            styles.similarProductsContainer,
            {
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              marginTop: 15, // Positive margin to space it from description
              paddingTop: 16, // Reduced padding since no drag handle
            }
          ]}
          onLayout={onSimilarProductsLayout}
        >
          {/* Header for similar products */}
          <View
            ref={headerRef}
            style={styles.similarProductsHeader}
            onLayout={onHeaderLayout}
          >
            <Text style={[styles.similarProductsTitle, { color: themeColors.text.primary }]}>
              Exploring Similar to:
            </Text>
          </View>

          {/* Similar Products Masonry Grid */}
          <MasonryListWithFooter
            data={similarProducts.slice(0, displayedSimilarCount)}
            numColumns={NUM_COLUMNS}
            renderItem={renderSimilarItem}
            keyExtractor={(item: FormattedSimpleProduct, index: number): string => `similar_product_${item.id}_${index}`}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={themeColors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.masonryContentContainer}
            ListFooterComponent={renderFooter()}
            // Add this line to potentially help performance if list is very long
            // initialNumToRender={10}
          />
        </View>
      </Animated.ScrollView>

      {/* Sticky header that appears at the top */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: themeColors.background,
            opacity: headerOpacity,
            top: 0,
            paddingTop: statusBarHeight + 12,
            paddingBottom: 12,
            paddingHorizontal: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.border,
          }
        ]}
      >
        <Text style={[styles.similarProductsTitle, { color: themeColors.text.primary }]}>
         Exploring Similar to:
        </Text>

        {/* Mini product image */}
            <Animated.View
              style={[
                styles.miniProductContainer,
                {
                  opacity: miniProductOpacity,
                  transform: [{ translateY: miniProductTranslateY }],
                  backgroundColor: themeColors.surface,
                }
              ]}
            >
              <TouchableOpacity onPress={scrollToTop} style={styles.miniProductTouchable}>
                {productImages.length > 0 && (
                  <Image
                    source={{ uri: productImages[0].url }}
                    style={styles.miniProductImage}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
      </Animated.View>

      {/* Scroll to top button (appears when scrolled) */}
      <Animated.View
        style={[
          styles.scrollToTopButton,
          {
            opacity: scrollToTopButtonOpacity,
            backgroundColor: themeColors.surface
          }
        ]}
      >
        <TouchableOpacity
          onPress={scrollToTop}
          style={styles.scrollToTopTouchable}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-up" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Sticky back button - appears when scrolling */}
      <Animated.View
        style={{
          position: 'absolute',
          top: statusBarHeight + 10, // Place below status bar
          left: 16,
          opacity: backButtonInterpolation,
          zIndex: 10001, // Just below the sticky header
          backgroundColor: '#000000', // Use solid color for shadow efficiency
          borderRadius: 12,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Helper function for price formatting (assuming it exists)
const formatPrice = (price: number | string | undefined | null): string => {
  // Check if price is a valid number
  const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d.-]/g, '')) : price;

  if (typeof numericPrice === 'number' && !isNaN(numericPrice)) {
    return numericPrice.toFixed(2);
  }
  // Return a default value or empty string if price is not a valid number
  return 'N/A'; // Or return '', or '0.00' depending on desired fallback
};
// Add missing currencySymbol variable if needed globally or pass via props
const currencySymbol = '$';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 0,
    margin: 0,
  },
  productContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    margin: 0,
    marginHorizontal: 8, // Add horizontal margin for visible rounded edges
    padding: 0,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProductContainer: {
    position: 'relative',
    width: 46,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Ensure solid background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  miniProductTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniProductImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageContainer: {
    position: 'relative',
    height: PRODUCT_IMAGE_HEIGHT + 100,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    margin: 0,
    padding: 0,
    zIndex: 10, // Add z-index to ensure touch events reach it
  },
  imageWrapper: {
    width: SCREEN_WIDTH - 16,
    height: PRODUCT_IMAGE_HEIGHT + 100,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
  },
  productImage: {
    width: SCREEN_WIDTH - 16,
    height: PRODUCT_IMAGE_HEIGHT + 100,
    resizeMode: 'cover',
    borderRadius: 16,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 999,
  },
  actionButtonsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#000000', // Use solid color for shadow efficiency
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
  },
  saveToClosetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
    paddingHorizontal: 16,
    minWidth: 120,
  },
  saveToClosetText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
    margin: 0,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  brandText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 24,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 5,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 12,
  },
  sizesContainer: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginVertical: 1,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  similarProductsContainer: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 8,
    minHeight: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF', // Use a solid color instead of themeColors
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginTop: -100,
  },
  similarProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  similarProductsTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  masonryContentContainer: {
    paddingHorizontal: 0,
    paddingBottom: 100,
    marginHorizontal: 1,
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 4,
    right: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Ensure solid background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  scrollToTopTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dynamicIslandContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    margin: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 0,
    paddingTop: 0,
    position: 'relative',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  titlePlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  panelDragHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  
  dragHandleBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  
  thumbnailSliderContainer: {
    height: 80,
    marginTop: 12,
    marginBottom: 8,
  },
  
  thumbnailSliderContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  
  thumbnailsContainer: {
    width: '100%',
    paddingVertical: 5,
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
  
  thumbnailsContentContainer: {
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginHorizontal: 5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Add solid background for shadow efficiency
    ...colors.light.elevation.light,
  },
  
  activeThumbnailContainer: {
    transform: [{ scale: 1.05 }],
  },
  
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  
  blurredThumbnail: {
    opacity: 0.3,
  },
  
  thumbnailActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.light.primary,
  },
  
  heartContainer: {
    position: 'absolute',
    width: 32,
    height: 32,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    left: '50%',
    top: '50%',
    marginLeft: -16,
    marginTop: -16,
  },
  
  sharedElementContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
  
  imageAspectRatioWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },

  navigation: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    zIndex: 9999,
  },
  
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000', // Use solid color for shadow efficiency
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  topActionButtons: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
    height: 50,
  },

  imageNavigationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 100,
  },
  
  previousImageArea: {
    width: '30%',
    height: '100%',
  },
  
  nextImageArea: {
    width: '30%',
    height: '100%',
    position: 'absolute',
    top: 0,
    right: 0,
  },

  imageNavigation: {
    display: 'none',
  },

  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },

  activeImageDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  imageCarousel: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 25, // Ensure high z-index for touch events
  },
  
  imageCarouselContent: {
    alignItems: 'center',
    margin: 0,
    padding: 0,
  },
});

export default ExpandedProductScreen;

// Define shared elements for transition
ExpandedProductScreen.sharedElements = (route: any) => {
  const { productId, initialImageIndex = 0, product } = route.params;
  
  // Attempt to find the specific image ID based on initialImageIndex
  let sharedImageId = `item.${productId}.image`; // Default ID

  if (product) {
      const images = [
        { id: `${product.id}_main`, url: product.productImage },
        ...(product.additionalImages?.map((url: string, index: number) => ({
          id: `${product.id}_${index}`,
          url,
        })) || []),
      ];
      if (images.length > initialImageIndex && images[initialImageIndex]) {
          // Use the specific image ID if available
          sharedImageId = `item.${productId}.image.${images[initialImageIndex].id}`;
          console.log(`[SharedElements] Using specific image ID for transition: ${sharedImageId}`);
      } else {
          console.log(`[SharedElements] Using default image ID for transition: ${sharedImageId}`);
      }
  }


  return [
    {
      id: sharedImageId, // Use the determined ID
      animation: 'move',
      resize: 'clip', // 'clip' or 'stretch' can impact visuals
      align: 'auto',
    }
  ];
}; 
 
 