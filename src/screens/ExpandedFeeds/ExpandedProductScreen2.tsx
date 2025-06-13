import React, { useState, useRef, useEffect, ReactElement } from 'react';
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
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Share,
  Alert,
  LogBox,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import SimpleProductCard from '../../components/feed/SimpleProductCard';
import AddToCartButton from '../../components/common/CardButtons/AddToCartButton';
import ContentAction from '../../components/common/CardButtons/contentAction';
import MasonryList from '@react-native-seoul/masonry-list';
import { useTheme } from '../../styles/theme/ThemeContext';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';

// Import sample data
import feedData from '../../data/feed.json';
// Import API product fetcher to retrieve product by ID if initial data is missing
import { fetchRandomProducts, Product as ApiProduct } from '../../services/productService';
// Import save service for favorites functionality
import { toggleSavePost, hasUserSavedPost } from '../../services/saveService';
import { auth } from '../../Config/firebaseconfig';

// --- Constants ------------------
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEADER = SCREEN_HEIGHT * 0.65;
const MIN_HEADER = Platform.OS === 'ios' ? 90 : 70;
const TAB_BAR_HEIGHT = 50;
const NUM_COLUMNS = 2; // Number of columns in the masonry grid
const ITEM_SPACING = 8; // Spacing between masonry items
const LOAD_MORE_COUNT = 10; // Number of items to load when scrolling
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24); // iOS standard status bar is 44pt
const PRODUCT_IMAGE_HEIGHT = SCREEN_HEIGHT * 0.65;

// --- Interfaces ----------------------
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

// Product interface
interface Product {
  id: string;
  productName: string;
  brand?: string;
  productImage: string;
  additionalImages?: string[];
  price: number | string;
  description?: string;
  category?: string;
  colors?: string[];
  sizes?: string[];
  material?: string;
  rating?: number;
  reviews?: number;
  isFavorite?: boolean;
  isInCart?: boolean;
  images?: { id: string; url: string }[];
  productUrl?: string;
}

// Stack navigation type
type RootStackParamList = {
  ExpandedProductScreen2: RouteParams;
};

type ExpandedProductScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExpandedProductScreen2'>;
type ExpandedProductScreenRouteProp = RouteProp<RootStackParamList, 'ExpandedProductScreen2'>;

// Define interface to extend React.FC for shared elements
interface SharedElementsFC extends React.FC {
  sharedElements?: (route: any, otherRoute?: any, showing?: boolean) => any[];
}

// --- Helper Functions ---
// Properly declare setTimeout and clearTimeout for TypeScript
declare const setTimeout: (callback: () => void, timeout: number) => number;
declare const clearTimeout: (id: number | null) => void;

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

// Helper function for price formatting
const formatPrice = (price: number | string | undefined | null): string => {
  // Check if price is a valid number
  const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/[^\d.-]/g, '')) : price;

  if (typeof numericPrice === 'number' && !isNaN(numericPrice)) {
    return numericPrice.toFixed(2);
  }
  // Return a default value or empty string if price is not a valid number
  return 'N/A'; // Or return '', or '0.00' depending on desired fallback
};

// Currency symbol
const currencySymbol = '$';

// --- Main Screen Component ----------------
const ExpandedProductScreen2: SharedElementsFC = () => {
  const navigation = useNavigation<ExpandedProductScreenNavigationProp>();
  const route = useRoute<ExpandedProductScreenRouteProp>();
  const { width: windowWidth } = useWindowDimensions();
  
  // Get product from route
  const { productId, sourcePosition, product: initialProduct, initialImageIndex = 0 } = route.params;
  
  // Log the received product data for debugging
  console.log('[ExpandedProductScreen] Received product data:', 
    initialProduct ? JSON.stringify({
      id: initialProduct.id,
      name: initialProduct.name || initialProduct.title,
      brand: initialProduct.brand,
      imageCount: initialProduct.images?.length
    }) : 'No product data');
  console.log('[ExpandedProductScreen] Product ID:', productId);
  console.log('[ExpandedProductScreen] Initial Image Index:', initialImageIndex);
  
  // State for product data and UI - start with no loading if we have initial product
  const [isLoading, setIsLoading] = useState(false); // Always start as not loading for faster UI
  const [product, setProduct] = useState<Product | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);
  const [similarProducts, setSimilarProducts] = useState<FormattedSimpleProduct[]>([]);
  const [displayedSimilarCount, setDisplayedSimilarCount] = useState(LOAD_MORE_COUNT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sizeOptions] = useState<SizeOption[]>(() => generateSizeOptions());
  
  // Theme
  const { isDarkMode, theme } = useTheme();
  const themeColors = isDarkMode ? colors.dark : colors.light;
  
  // Animation values for transitions
  const [isTransitionActive, setIsTransitionActive] = useState(true);
  const sharedElementOpacity = useRef(new Animated.Value(1)).current;
  const mainContentOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation values for scrolling effects
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<number[]>([0, 0]); // Two sections: Product Details and Similar Products
  const [activeSection, setActiveSection] = useState(0);
  
  // Animation values for header and content
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const navButtonsOpacity = useRef(new Animated.Value(0)).current;
  const navButtonsTranslateY = useRef(new Animated.Value(-20)).current;
  
  // Keep track of active animations for cleanup
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);
  
  // Refs for carousel and carousel thumbs
  const mainCarouselRef = useRef<ScrollView>(null);
  const thumbnailCarouselRef = useRef<FlatList>(null);
  
  // Format product images into the expected format
  const productImages = product
    ? product.images && product.images.length > 0
      // If product already has an images array, use it
      ? product.images
      // Otherwise, create from productImage and additionalImages
      : [
          { id: `${product.id}_main`, url: product.productImage },
          ...(product.additionalImages?.map((url: string, index: number) => ({
            id: `${product.id}_${index}`,
            url,
          })) || []),
        ]
    : [];
  
  // Clean up animations on unmount
  useEffect(() => {
    return () => {
      // Stop all active animations to prevent memory leaks
      activeAnimations.current.forEach(animation => {
        if (animation) {
          animation.stop();
        }
      });
      activeAnimations.current = [];
    };
  }, []);
  
  // Process product data immediately on mount
  useEffect(() => {
    if (initialProduct) {
      // Process product data synchronously for immediate display
      console.log('Processing provided product data:', initialProduct);
      
      // Format the product data to match the expected structure
      const formattedProduct = {
        id: initialProduct.id,
        productName: initialProduct.title || initialProduct.name || initialProduct.productName || 'Product',
        brand: initialProduct.brand && initialProduct.brand !== 'Unknown Brand' ? initialProduct.brand : undefined,
        productImage: initialProduct.images?.[0]?.url || '',
        additionalImages: initialProduct.images?.slice(1).map((img: any) => img.url) || [],
        price: initialProduct.price ?? undefined,
        description: initialProduct.description || initialProduct.title || initialProduct.name || 'Product details',
        images: initialProduct.images || [],
        productUrl: initialProduct.productUrl || '',
        // Placeholder for missing fields
        category: initialProduct.category || 'Fashion',
        colors: initialProduct.colors || ['Default'],
        sizes: initialProduct.sizes || ['One Size'],
        material: initialProduct.material || 'Mixed Materials',
        rating: initialProduct.rating ?? undefined,
        reviews: initialProduct.reviews ?? undefined,
        isFavorite: initialProduct.isFavorite ?? false,
        isInCart: initialProduct.isInCart ?? false,
      };
      
      console.log('Formatted product data:', formattedProduct);
      console.log('Product URL in formatted product:', formattedProduct.productUrl);
      
      // Set product immediately for instant UI display
      setProduct(formattedProduct);
      return;
    }
    
    // Fallback: Load from API if no initial product
    const loadProduct = async () => {
      if (!productId) {
        console.error('No product ID or initial product provided');
        Alert.alert('Error', 'No product information provided.');
        navigation.goBack();
        return;
      }
      
      setIsLoading(true);
      console.log(`[ExpandedProductScreen] Fetching product ${productId} from API`);
      try {
        // Fetch a batch of products and find the matching one
        const apiProducts: ApiProduct[] = await fetchRandomProducts(50);
        const match = apiProducts.find(p => p.id === productId);
        if (match) {
          console.log(`[ExpandedProductScreen] Found product ${productId} in API response`);
          // Format the API product into our Product interface
          const formatted: Product = {
            id: match.id,
            productName: match.name || 'Product',
            brand: match.brand && match.brand !== 'Unknown Brand' ? match.brand : undefined,
            productImage: match.images?.[0]?.url || '',
            additionalImages: match.images?.slice(1).map(img => img.url) || [],
            price: match.price ?? undefined,
            description: match.name ? `${match.brand || ''}: ${match.name}` : 'Product details',
            images: match.images || [],
            productUrl: match.productUrl || '',
            category: 'Fashion',
            colors: match.brand ? [match.brand] : ['Default'],
            sizes: ['One Size'],
            material: 'Mixed Materials',
            rating: undefined,
            reviews: undefined,
            isFavorite: false,
            isInCart: false,
          };
          setProduct(formatted);
          setIsLoading(false);
          return;
        } else {
          console.warn(`[ExpandedProductScreen] Product ${productId} not found in API batch; using fallback data`);
        }
      } catch (err) {
        console.error(`[ExpandedProductScreen] Error fetching products for ${productId}:`, err);
      }
      
      // Fallback to sample feed data
      console.warn('Using fallback feed data for product details');
      await createDelay(500);
      const foundFeed = feedData.singleOutfitFullData.find(item => item.id === productId)
        || feedData.singleOutfitFullData[0];
      setProduct(foundFeed);
      setIsLoading(false);
    };
    
    loadProduct();
  }, [productId, initialProduct, navigation]);
  
  // Load similar products
  useEffect(() => {
    fetchSimilarProducts();
  }, []);
  
  // Complete transition immediately when product is available for seamless experience
  useEffect(() => {
    if (product && !isLoading) {
      // Complete transition immediately when product data is available
      completeTransition();
    }
  }, [product, isLoading]);
  
  // Run entrance animations when product loads - immediate for seamless transition
  useEffect(() => {
    if (product && !isLoading) {
      // Set all animation values immediately for seamless transition
      navButtonsOpacity.setValue(1);
      navButtonsTranslateY.setValue(0);
      contentOpacity.setValue(1);
      contentTranslateY.setValue(0);
    }
  }, [product, isLoading, contentOpacity, contentTranslateY, navButtonsOpacity, navButtonsTranslateY]);
  
  // Check if product is saved when product loads
  useEffect(() => {
    const checkSaveStatus = async () => {
      const currentUser = auth().currentUser;
      if (product && currentUser) {
        try {
          const savedStatus = await hasUserSavedPost(currentUser.uid, product.id);
          setIsSaved(savedStatus);
        } catch (error) {
          console.error('Error checking save status:', error);
        }
      }
    };
    
    checkSaveStatus();
  }, [product]);
  
  // Complete the shared element transition - immediate for seamless experience
  const completeTransition = () => {
    // Set values immediately for seamless transition
    sharedElementOpacity.setValue(0);
    mainContentOpacity.setValue(1);
    setIsTransitionActive(false);
  };
  
  // Handle section layout
  const onSectionLayout = (index: number) => (e: any) => {
    sectionOffsets.current[index] = e.nativeEvent.layout.y;
  };
  
  // Handle scrolling to specific section
  const scrollToSection = (index: number) => {
    setActiveSection(index);
    if (scrollRef.current && sectionOffsets.current[index] !== undefined) {
      // Account for header height
      const offsetY = sectionOffsets.current[index] - (MIN_HEADER + 10);
      scrollRef.current.scrollTo({ y: offsetY, animated: true });
    }
  };
  
  // Handle back button - improved exit animation
  const handleBack = () => {
    // Run exit animations with smoother timing
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 200, // Increased for smoother exit
        useNativeDriver: true,
      }),
      Animated.timing(navButtonsOpacity, {
        toValue: 0,
        duration: 150, // Increased for smoother exit
        useNativeDriver: true,
      }),
      // Add content slide down animation
      Animated.timing(contentTranslateY, {
        toValue: 30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then go back
      navigation.goBack();
    });
  };
  
  // Handle add to cart
  const handleAddToCart = () => {
    setIsInCart(!isInCart);
  };

  // Handle save to favorites
  const handleSave = async () => {
    const currentUser = auth().currentUser;
    if (!product || !currentUser) {
      console.log('No product or user available for saving');
      return;
    }

    try {
      const newSavedStatus = await toggleSavePost(currentUser.uid, product.id);
      setIsSaved(newSavedStatus);
    } catch (error) {
      console.error('Error toggling save status:', error);
    }
  };

  // Handle go to website
  const handleGoToWebsite = async () => {
    console.log('handleGoToWebsite called');
    console.log('product?.productUrl:', product?.productUrl);
    
    if (!product?.productUrl || product.productUrl.trim() === '') {
      console.log('No productUrl available');
      Alert.alert('Website Not Available', 'No website URL is available for this product.');
      return;
    }
    
    let urlToOpen = product.productUrl;
    
    // Ensure URL has protocol
    if (!urlToOpen.match(/^https?:\/\//)) {
      urlToOpen = 'https://' + urlToOpen;
    }
    
    console.log('Attempting to open URL:', urlToOpen);
    
    try {
      const canOpen = await Linking.canOpenURL(urlToOpen);
      console.log('Can open URL:', canOpen);
      
      if (canOpen) {
        await Linking.openURL(urlToOpen);
        console.log('URL opened successfully');
      } else {
        console.log('Cannot open URL');
        Alert.alert('Error', 'Unable to open website URL.');
      }
    } catch (error) {
      console.error('Error opening website:', error);
      Alert.alert('Error', 'Failed to open website.');
    }
  };
  
  // Handle size selection
  const handleSizeSelect = (sizeId: string) => {
    setSelectedSize(selectedSize === sizeId ? null : sizeId);
  };
  
  // Switch image
  const handleThumbnailPress = (index: number) => {
    setCurrentImageIndex(index);
    
    // Scroll the main carousel to the selected image
    if (mainCarouselRef.current) {
      mainCarouselRef.current.scrollTo({
        x: index * windowWidth,
        animated: true
      });
    }
  };
  
  // Handle image scroll
  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / windowWidth);
    
    if (currentImageIndex !== index) {
      setCurrentImageIndex(index);
      
      // Scroll the thumbnail carousel to keep the active thumbnail centered
      if (thumbnailCarouselRef.current) {
        thumbnailCarouselRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5 // Center the item
        });
      }
    }
  };
  
  // Fetch similar products with random height offsets
  const fetchSimilarProducts = async (isRefresh = false) => {
    if (isLoadingMore && !isRefresh) return;
    
    setIsLoadingMore(true);
    
    try {
      // Simulate API call with a delay
      await createDelay(500);
      
      // Get products from the dummy data - in a real app, this would fetch from the API
      // to get similar products based on the current product's category, brand, etc.
      const productsData = feedData.simpleCardComponent.slice(0, 50);
      
      // Format products with random height offsets for masonry
      const formattedProducts: FormattedSimpleProduct[] = productsData.map((item, index) => {
        // Generate a random height offset for masonry staggering
        const randomOffset = Math.floor(Math.random() * 50);
        
        return {
          id: `${item.id}_${Date.now()}_${index}`, // Make sure IDs are truly unique
          price: typeof item.price === 'string' 
            ? parseFloat(item.price.replace('$', '')) 
            : item.price,
          brand: item.brand,
          images: [{ id: `${item.id}_main_${index}`, url: item.productImage }],
          masonryHeightOffset: randomOffset
        };
      });
      
      // In a real implementation, you would fetch similar products based on product.id 
      // or other properties like product.category, product.brand, etc.
      // Example:
      // const similarProductsFromApi = await fetchSimilarProductsFromApi(product.id);
      
      if (isRefresh) {
        setSimilarProducts(formattedProducts);
        setDisplayedSimilarCount(LOAD_MORE_COUNT);
      } else {
        setSimilarProducts(prevProducts => [...prevProducts, ...formattedProducts]);
      }
    } catch (error) {
      console.error('Error fetching similar products:', error);
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
  
  // Removed old content actions - now using direct website button
  
  // Render a thumbnail for the image slider
  const renderThumbnail = ({ item, index }: { item: any; index: number }) => {
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
          source={item?.url ? { uri: item.url } : undefined}
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
  
  // Render a single similar product item for masonry
  const renderSimilarItem = ({ item, i }: { item: any; i: number }) => {
    const product = item as FormattedSimpleProduct;
    const aspectRatio = 1 + (Math.abs(hashCode(product.id)) % 6) / 10; // Value between 1.0 and 1.6
    
    return (
      <View 
        key={`product_${product.id}_${i}`}
        style={{
          margin: ITEM_SPACING / 2,
          marginBottom: 2,
          marginHorizontal: 4,
        }}
      >
        <SimpleProductCard 
          id={product.id}
          brand={product.brand || ''}
          images={product.images}
          price={product.price}
          onCartPress={() => console.log('Add to cart:', product.id)}
          onLikePress={() => console.log('Like:', product.id)}
          onDislikePress={() => console.log('Dislike:', product.id)}
          onSharePress={() => console.log('Share:', product.id)}
          isDarkMode={isDarkMode}
          onCardPress={() => scrollToSection(0)}
          cardWidth={calculatedItemWidth - 8}
          imageAspectRatio={aspectRatio}
        />
      </View>
    );
  };
  
  // Simple hash function for consistent aspect ratios
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
  
  // Render footer for masonry list
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <ActivityIndicator 
        size="large" 
        color={theme.primary} 
        style={{ marginVertical: 20 }} 
      />
    );
  };
  
  // Calculated card width for masonry layout
  const calculatedItemWidth = (windowWidth - (ITEM_SPACING * (NUM_COLUMNS + 1))) / NUM_COLUMNS;
  
  // Header animation interpolations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, MAX_HEADER - MIN_HEADER],
    outputRange: [MAX_HEADER, MIN_HEADER],
    extrapolate: 'clamp'
  });
  
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, MAX_HEADER - MIN_HEADER],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, MAX_HEADER - MIN_HEADER],
    outputRange: [0, -50],
    extrapolate: 'clamp'
  });
  
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, (MAX_HEADER - MIN_HEADER) * 0.5, MAX_HEADER - MIN_HEADER],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, MAX_HEADER - MIN_HEADER],
    outputRange: [1, 0.8],
    extrapolate: 'clamp'
  });
  
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, MAX_HEADER - MIN_HEADER],
    outputRange: [0, -40],
    extrapolate: 'clamp'
  });
  
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, (MAX_HEADER - MIN_HEADER) * 0.7, MAX_HEADER - MIN_HEADER],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });
  
  const fixedNavBarTitleOpacity = scrollY.interpolate({
    inputRange: [0, 200, 250],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });
  
  // MasonryList component with proper typing
  const MasonryListWithFooter = MasonryList as React.ComponentType<any>;
  
  // Render loading state
  if (isLoading || !product) {
    console.log('product.productUrl =>', product?.productUrl);
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {/* Transparent interaction blocker during transition */}
      {isTransitionActive && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 10000,
          }}
          pointerEvents="auto"
        />
      )}
      
      {/* Animated Header with parallax image */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        {/* Parallax Product Image */}
        <Animated.View 
          style={[
            styles.headerImageContainer, 
            { 
              opacity: imageOpacity,
              transform: [{ translateY: imageTranslateY }] 
            }
          ]}
        >
          <SharedElement 
            id={`item.${productId}.image`} 
            style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 25, borderBottomRightRadius: 25 }]}
          >
            <Animated.View style={{ 
              width: '100%', 
              height: '100%', 
              opacity: sharedElementOpacity 
            }}>
              <Image 
                source={{ uri: productImages[currentImageIndex]?.url }} 
                style={styles.headerImage}
                defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
                onError={(error) => {
                  const errorMessage = error.nativeEvent?.error || 'Unknown error';
                  const currentImage = productImages[currentImageIndex];
                  console.error(`[ExpandedProductScreen2] === HEADER IMAGE LOAD ERROR ===`);
                  console.error(`  Product ID: ${product?.id}`);
                  console.error(`  Product Name: ${product?.productName}`);
                  console.error(`  Header Image Index: ${currentImageIndex}`);
                  console.error(`  Header Image URL: ${currentImage?.url}`);
                  console.error(`  Error Message: ${errorMessage}`);
                  console.error(`  Full Error Object:`, error);
                  console.error(`  nativeEvent:`, error.nativeEvent);
                  console.error(`  URL Length: ${currentImage?.url?.length || 0}`);
                  try {
                    if (currentImage?.url && currentImage.url.startsWith('http')) {
                      // Extract domain manually since React Native doesn't support URL.hostname
                      const urlMatch = currentImage.url.match(/^https?:\/\/([^\/]+)/);
                      const domain = urlMatch ? urlMatch[1] : 'Could not extract domain';
                      const protocol = currentImage.url.startsWith('https') ? 'https:' : 'http:';
                      
                      console.error(`  URL Domain: ${domain}`);
                      console.error(`  URL Protocol: ${protocol}`);
                    } else {
                      console.error(`  URL Domain: Invalid URL - does not start with http or is undefined`);
                      console.error(`  URL Protocol: Invalid URL - does not start with http or is undefined`);
                    }
                  } catch (urlError) {
                    console.error(`  URL Domain: Error parsing URL - ${urlError}`);
                    console.error(`  URL Protocol: Error parsing URL - ${urlError}`);
                  }
                  console.error(`=== END HEADER IMAGE LOAD ERROR ===`);
                }}
              />
            </Animated.View>
          </SharedElement>
          
          {/* Image carousel - appears after shared element fades */}
          <Animated.View 
            style={{ 
              ...StyleSheet.absoluteFillObject,
              opacity: mainContentOpacity
            }}
          >
            <ScrollView
              ref={mainCarouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageScroll}
              style={styles.imageCarousel}
              contentContainerStyle={styles.imageCarouselContent}
              scrollEventThrottle={16}
              snapToInterval={windowWidth}
              decelerationRate="fast"
              scrollEnabled={!isTransitionActive}
            >
              {productImages.map((image, index) => (
                <View
                  key={image ? image.id : `fallback-${index}`}
                  style={styles.imageWrapper}
                >
                  <Image
                    source={image?.url ? { uri: image.url } : undefined}
                    style={styles.productImage}
                    resizeMode="cover"
                    defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
                    onError={(error) => {
                      const errorMessage = error.nativeEvent?.error || 'Unknown error';
                      console.error(`[ExpandedProductScreen2] === IMAGE LOAD ERROR ===`);
                      console.error(`  Product ID: ${product?.id}`);
                      console.error(`  Product Name: ${product?.productName}`);
                      console.error(`  Image Index: ${index}`);
                      console.error(`  Image URL: ${image?.url}`);
                      console.error(`  Error Message: ${errorMessage}`);
                      console.error(`  Full Error Object:`, error);
                      console.error(`  nativeEvent:`, error.nativeEvent);
                      console.error(`  URL Length: ${image?.url?.length || 0}`);
                      try {
                        if (image?.url && image.url.startsWith('http')) {
                          // Extract domain manually since React Native doesn't support URL.hostname
                          const urlMatch = image.url.match(/^https?:\/\/([^\/]+)/);
                          const domain = urlMatch ? urlMatch[1] : 'Could not extract domain';
                          const protocol = image.url.startsWith('https') ? 'https:' : 'http:';
                          
                          console.error(`  URL Domain: ${domain}`);
                          console.error(`  URL Protocol: ${protocol}`);
                        } else {
                          console.error(`  URL Domain: Invalid URL - does not start with http or is undefined`);
                          console.error(`  URL Protocol: Invalid URL - does not start with http or is undefined`);
                        }
                      } catch (urlError) {
                        console.error(`  URL Domain: Error parsing URL - ${urlError}`);
                        console.error(`  URL Protocol: Error parsing URL - ${urlError}`);
                      }
                      console.error(`=== END IMAGE LOAD ERROR ===`);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* Gradient overlay for better text readability */}
        <Animated.View style={[styles.gradientOverlay, { opacity: gradientOpacity }]}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={[StyleSheet.absoluteFillObject, { borderBottomLeftRadius: 25, borderBottomRightRadius: 25 }]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        {/* Navigation Bar - Always visible */}
        <View style={styles.navBar}>
          <Animated.View style={{
            opacity: navButtonsOpacity,
            transform: [{ translateY: navButtonsTranslateY }]
          }}>
            <TouchableOpacity 
              onPress={handleBack} 
              style={styles.navButton}
              disabled={isTransitionActive}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase tap area
              activeOpacity={0.7} // Visual feedback on press
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.Text 
            style={[styles.navBarTitle, { opacity: fixedNavBarTitleOpacity, color: '#FFFFFF' }]}
            numberOfLines={1}
          >
            {product.productName}
          </Animated.Text>
          
          {/* Empty View to maintain flex layout */}
          <View style={{ width: 42 }} />
        </View>

        {/* Title & Meta */}
        <Animated.View 
          style={[
            styles.titleContainer, 
            { 
              opacity: titleOpacity,
              transform: [
                { scale: titleScale },
                { translateY: titleTranslateY }
              ] 
            }
          ]}
        >
          {product.brand && (
            <View style={styles.brandRow}>
              <Text style={[styles.brand, { color: '#FFFFFF' }]}>  
                {product.brand}
              </Text>
            </View>
          )}
          
          <SharedElement id={`item.${productId}.title`}>
            <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={2}>
              {product.productName}
            </Text>
          </SharedElement>
          
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: '#FFFFFF' }]}>
              ${formatPrice(product.price)}
            </Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.websiteButton, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                onPress={handleGoToWebsite}
                disabled={!product?.productUrl}
              >
                <Icon name="open-in-new" size={20} color="#FFFFFF" />
                <Text style={styles.websiteButtonText}>Visit Website</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
      
      {/* Main scrollable content */}
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: MAX_HEADER }
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }]
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            enabled={!isTransitionActive}
          />
        }
      >
        {/* Thumbnail carousel below header */}
        <View style={styles.thumbnailsContainer}>
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
        
        {/* Product Details Section */}
        <View 
          onLayout={onSectionLayout(0)} 
          style={[styles.section, { backgroundColor: theme.background }]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>Product Details</Text>
            <TouchableOpacity 
              style={styles.sectionButton}
              onPress={() => scrollToSection(1)}
            >
              <Text style={{ color: theme.primary }}>See Similar</Text>
              <Icon name="chevron-down" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Price (only show when scrolled past header price) */}
          <View style={styles.detailsContainer}>
            {/* Sizes */}
            <View style={styles.sizesContainer}>
              <Text style={[styles.subSectionTitle, { color: theme.text.primary }]}>
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
                          ? theme.primary
                          : theme.surface,
                        borderColor: theme.border,
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
                            : theme.text.primary
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
              <Text style={[styles.subSectionTitle, { color: theme.text.primary }]}>
                Description
              </Text>
              <Text style={[styles.descriptionText, { color: theme.text.secondary }]}>  
                {product.description || 'Not Available'}
              </Text>
            </View>
            
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[styles.addToCartButton, { backgroundColor: theme.primary }]}
              onPress={handleAddToCart}
            >
              <Icon name={isInCart ? "check" : "cart"} size={20} color="#FFFFFF" />
              <Text style={styles.addToCartText}>
                {isInCart ? "Added to Cart" : "Add to Cart"}
              </Text>
            </TouchableOpacity>

            {/* Save to Favorites Button */}
            <TouchableOpacity
              style={[styles.saveToFavoritesButton, { 
                backgroundColor: isSaved ? theme.primary : 'transparent',
                borderColor: theme.primary 
              }]}
              onPress={handleSave}
            >
              <Icon 
                name={isSaved ? "heart" : "heart-outline"} 
                size={20} 
                color={isSaved ? "#FFFFFF" : theme.primary} 
              />
              <Text style={[styles.saveToFavoritesText, { 
                color: isSaved ? "#FFFFFF" : theme.primary 
              }]}>
                {isSaved ? "Saved to Closet" : "Save to Closet"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Similar Products Section */}
        <View 
          onLayout={onSectionLayout(1)} 
          style={[styles.section, styles.lastSection, { backgroundColor: theme.background }]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>Explore Similar</Text>
            <TouchableOpacity 
              style={styles.sectionButton}
              onPress={() => scrollToSection(0)}
            >
              <Text style={{ color: theme.primary }}>Back to Details</Text>
              <Icon name="chevron-up" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Masonry grid of similar products */}
          <View style={styles.similarProductsContainer}>
            <MasonryListWithFooter
              data={similarProducts.slice(0, displayedSimilarCount)}
              numColumns={NUM_COLUMNS}
              renderItem={renderSimilarItem}
              keyExtractor={(item: FormattedSimpleProduct, index: number) => `similar_product_${item.id}_${index}`}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.primary}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.masonryContentContainer}
              ListFooterComponent={renderFooter()}
            />
          </View>
        </View>
      </Animated.ScrollView>
      
      {/* Floating action button for adding to cart (visible on scroll) */}
      <Animated.View
        style={[
          styles.floatingActionButton,
          {
            opacity: scrollY.interpolate({
              inputRange: [50, 100],
              outputRange: [0, 1],
              extrapolate: 'clamp'
            }),
            backgroundColor: theme.primary
          }
        ]}
      >
        <TouchableOpacity
          onPress={handleAddToCart}
          style={styles.floatingActionTouchable}
        >
          <Icon name={isInCart ? "check" : "cart"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Define shared elements for transition
ExpandedProductScreen2.sharedElements = (route: any) => {
  const { productId } = route.params;
  
  return [
    {
      id: `item.${productId}.image`,
      animation: 'move',
      resize: 'clip',
      align: 'auto',
    },
    {
      id: `item.${productId}.title`,
      animation: 'fade',
      resize: 'clip',
    }
  ];
};

// --- Styles -----------------------
const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // Header styles
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 10, 
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerImageContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    overflow: 'hidden', // Prevent content from overflowing during transition
  },
  headerImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  gradientOverlay: { 
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  navBar: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 50, // Increased from 10 to 50 for better accessibility
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    paddingHorizontal: 16,
    zIndex: 10,
  },
  navButton: { 
    padding: 14, // Increased from 12 for easier tapping
    borderRadius: 44, // Adjusted for new padding
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker for better visibility
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)', // More visible border
    elevation: 8, // Increased shadow for better prominence
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Larger shadow
    shadowOpacity: 0.4,
    shadowRadius: 5,
    minWidth: 44, // Ensure minimum tap target size
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    maxWidth: SCREEN_WIDTH - 120,
    marginHorizontal: 10,
  },
  titleContainer: { 
    position: 'absolute', 
    left: 16, 
    right: 16, 
    bottom: 24,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: { 
    color: '#FFFFFF',
    fontSize: 14, 
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  title: { 
    color: '#FFFFFF',
    fontSize: 24, 
    fontWeight: '700',
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  meta: { 
    color: '#FFFFFF', 
    fontSize: 18,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  websiteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Thumbnail styles
  thumbnailsContainer: {
    width: '100%',
    paddingVertical: 10,
    marginBottom: 10,
  },
  thumbnailsContentContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginHorizontal: 5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
    opacity: 0.5,
  },
  thumbnailActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.light.primary,
  },
  // Content section styles
  section: { 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  lastSection: {
    paddingBottom: 70,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: { 
    fontSize: 22, 
    fontWeight: '700',
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Product details styles
  detailsContainer: {
    marginBottom: 20,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sizesContainer: {
    marginBottom: 20,
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
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  addToCartButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveToFavoritesButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
  },
  saveToFavoritesText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Similar products styles
  similarProductsContainer: {
    width: '100%',
  },
  masonryContentContainer: {
    paddingBottom: 80,
  },
  // Floating action button
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  floatingActionTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Image carousel styles
  imageCarousel: {
    width: '100%',
    height: '100%',
  },
  imageCarouselContent: {
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Add background to prevent flashing
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: '100%',
    resizeMode: 'cover',
  },
});

export default ExpandedProductScreen2; 