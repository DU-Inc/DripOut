import React, { useState, useRef, useEffect, ReactElement, useMemo, useCallback } from 'react';
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
import UnifiedProductCard from '../../components/feed/UnifiedProductCard';
import AddToCartButton from '../../components/common/CardButtons/AddToCartButton';
import ContentAction from '../../components/common/CardButtons/contentAction';
import MasonryList from '@react-native-seoul/masonry-list';
import { useTheme } from '../../styles/themeprovider';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';
import MediaComponent from '../../components/common/MediaComponent';
import ShelfIcon from '../../components/common/ShelfIcon';
import CollapsibleProductSection from '../../components/common/CollapsibleProductSection';
import { useShelf } from '../../contexts/ShelfContext';
import { processSizeData, getDisplaySize, SizeOption } from '../../utils/sizeUtils';
import FormattedDescription from '../../components/common/FormattedDescription';
import { processProductDescription } from '../../utils/htmlUtils';

// Import API product fetcher for real products
import { fetchRandomProducts, Product as ApiProduct } from '../../services/productService';
import { getPostsByProduct, Post } from '../../services/postService';
import { auth } from '../../Config/firebaseconfig';
import { db } from '../../Config/firebaseconfig';

// --- Constants ------------------
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HEADER = SCREEN_HEIGHT * 0.65;
const MIN_HEADER = Platform.OS === 'ios' ? 90 : 70;
const TAB_BAR_HEIGHT = 50;
const NUM_COLUMNS = 2; // Number of columns in the grid (same as OverviewScreen)
const ITEM_SPACING = 6; // Consistent spacing between items (same as OverviewScreen)
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
  sourceScreen?: string; // Source screen for analytics/context (not used for navigation)
}

// Note: SizeOption interface is now imported from sizeUtils

// Interface for formatted similar product (matching UnifiedProductCard requirements)
interface FormattedSimpleProduct {
  id: string;
  name: string;
  price: number;
  currency?: string;
  brand?: string;
  images: {
    id: string;
    url: string;
  }[];
  productUrl?: string;
  cardType?: 'full' | 'simple' | 'partial';
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

// Note: Size generation is now handled by sizeUtils processSizeData function

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

// Helper function to detect "Brand: Title" pattern in descriptions
const isBrandTitleFormat = (description: string, brand?: string, title?: string): boolean => {
  if (!description || !brand || !title) return false;
  
  const desc = description.toLowerCase().trim();
  const brandLower = brand.toLowerCase().trim();
  const titleLower = title.toLowerCase().trim();
  
  // Check if description follows "Brand: Title" pattern - more precise matching
  const exactPattern = `${brandLower}: ${titleLower}`;
  const startsWith = desc.startsWith(exactPattern);
  
  // Only match if it starts with the exact pattern, not just contains both words
  return startsWith;
};

// Enhanced description formatting function
const formatProductDescription = (
  description?: string, 
  brand?: string, 
  title?: string, 
  name?: string
): string => {
  console.log('[Description Formatting] Input:', { description, brand, title, name });
  
  // If we have a description, check if it's useful
  if (description && description.trim() !== '') {
    // Check if it's just a "Brand: Title" format
    if (isBrandTitleFormat(description, brand, title || name)) {
      console.log('[Description Formatting] Detected Brand: Title pattern, using fallback');
      return title || name || 'Product details';
    }
    
    console.log('[Description Formatting] Using provided description with HTML processing');
    // Process HTML content to clean it up
    return processProductDescription(description);
  }
  
  // Fallback to title or name
  const fallback = title || name || 'Product details';
  console.log('[Description Formatting] No description, using fallback:', fallback);
  return fallback;
};

// Currency symbol
const currencySymbol = '$';

// --- Main Screen Component ----------------
const ExpandedProductScreen2: SharedElementsFC = () => {
  const navigation = useNavigation<ExpandedProductScreenNavigationProp>();
  const route = useRoute<ExpandedProductScreenRouteProp>();
  const { width: windowWidth } = useWindowDimensions();
  
  // Get product from route with useMemo to prevent re-renders
  const routeParams = useMemo(() => {
    const { productId, sourcePosition, product: initialProduct, initialImageIndex = 0, sourceScreen } = route.params;
    return { productId, sourcePosition, initialProduct, initialImageIndex, sourceScreen };
  }, [route.params]);
  
  const { productId, sourcePosition, initialProduct, initialImageIndex, sourceScreen } = routeParams;
  
  // Component initialization (removed logging for performance)
  
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
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [inspirationPosts, setInspirationPosts] = useState<Post[]>([]);
  const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);
  
  // Shelf context
  const { checkIsInShelf, addProductToShelf, removeProductFromShelf } = useShelf();
  const [isInShelf, setIsInShelf] = useState(false);
  
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

  // Complete the shared element transition - immediate for seamless experience
  const completeTransition = useCallback(() => {
    // Set values immediately for seamless transition
    sharedElementOpacity.setValue(0);
    mainContentOpacity.setValue(1);
    setIsTransitionActive(false);
  }, [sharedElementOpacity, mainContentOpacity]);

  // Fetch similar products with random height offsets
  const fetchSimilarProducts = useCallback(async (isRefresh = false) => {
    if (isLoadingMore && !isRefresh) return;
    
    setIsLoadingMore(true);
    
    try {
      console.log('🔄 Fetching similar products from API...');
      
      // Fetch real products from the API
      const apiProducts = await fetchRandomProducts(50);
      
      if (!apiProducts || apiProducts.length === 0) {
        console.warn('⚠️ No products returned from API');
        return;
      }
      
      console.log(`✅ Successfully fetched ${apiProducts.length} similar products`);
      
      // Format products with random height offsets for masonry
      const formattedProducts: FormattedSimpleProduct[] = apiProducts.map((item, index) => {
        // Generate a random height offset for masonry staggering
        const randomOffset = Math.floor(Math.random() * 50);
        
        return {
          id: `${item.id}_${Date.now()}_${index}`, // Make sure IDs are truly unique
          name: item.name || 'Product',
          price: typeof item.price === 'string' 
            ? parseFloat(String(item.price).replace(/[^\d.-]/g, '')) || 0 
            : (Number(item.price) || 0),
          currency: item.currency || '$',
          brand: item.brand || 'Unknown Brand',
          images: item.images || [],
          productUrl: item.productUrl || '',
          cardType: 'simple',
          masonryHeightOffset: randomOffset,
        };
      });
      
      // Update state
      if (isRefresh) {
        setSimilarProducts(formattedProducts); // Replace for refresh
      } else {
        setSimilarProducts(prev => [...prev, ...formattedProducts]); // Append for load more
      }
    } catch (error) {
      console.error('❌ Error fetching similar products:', error);
    } finally {
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  }, [isLoadingMore]);

  // Fetch inspiration posts that feature this product
  const fetchInspirationPosts = useCallback(async () => {
    if (!product) return;
    
    setIsLoadingInspiration(true);
    
    try {
      console.log(`🔍 Fetching inspiration posts for product: "${product.productName}", brand: "${product.brand}"`);
      
      // Search for posts that feature this product
      const posts = await getPostsByProduct(product.productName, product.brand, 10);
      
      console.log(`✅ Found ${posts.length} inspiration posts`);
      setInspirationPosts(posts);
    } catch (error) {
      console.error('❌ Error fetching inspiration posts:', error);
      setInspirationPosts([]);
    } finally {
      setIsLoadingInspiration(false);
    }
  }, [product]);
  
  // Memoize product images formatting to prevent repeated calculation
  const productImages = useMemo(() => {
    if (!product) return [];
    
    return product.images && product.images.length > 0
      // If product already has an images array, use it
      ? product.images
      // Otherwise, create from productImage and additionalImages
      : [
          { id: `${product.id}_main`, url: product.productImage },
          ...(product.additionalImages?.map((url: string, index: number) => ({
            id: `${product.id}_${index}`,
            url,
          })) || []),
        ];
  }, [product]);
  
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
  
  // Update size options when product changes
  useEffect(() => {
    if (product) {
      const processedSizes = processSizeData(product.sizes);
      setSizeOptions(processedSizes);
    }
  }, [product]);

  // Process product data immediately on mount
  useEffect(() => {
    if (initialProduct) {
      // Processing initial product
      console.log('[ExpandedProductScreen] Processing initial product:', initialProduct.id);
      
      // Format the product data to match the expected structure
      const formattedProduct = {
        id: initialProduct.id,
        productName: initialProduct.title || initialProduct.name || initialProduct.productName || 'Product',
        brand: initialProduct.brand && initialProduct.brand !== 'Unknown Brand' ? initialProduct.brand : undefined,
        productImage: initialProduct.images?.[0]?.url || '',
        additionalImages: initialProduct.images?.slice(1).map((img: any) => img.url) || [],
        price: initialProduct.price ?? undefined,
        description: formatProductDescription(
          initialProduct.description,
          initialProduct.brand,
          initialProduct.title || initialProduct.name,
          initialProduct.name
        ),
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
        const apiProducts: ApiProduct[] = await fetchRandomProducts(80);
        const match = apiProducts.find(p => p.id === productId);
        if (match) {
          console.log(`[ExpandedProductScreen] Found product ${productId} in API response`);
          
          // API product found
          console.log('[ExpandedProductScreen] Found API product:', match.id);
          
          // Format the API product into our Product interface
          const formatted: Product = {
            id: match.id,
            productName: match.name || 'Product',
            brand: match.brand && match.brand !== 'Unknown Brand' ? match.brand : undefined,
            productImage: match.images?.[0]?.url || '',
            additionalImages: match.images?.slice(1).map(img => img.url) || [],
            price: match.price ?? undefined,
            description: formatProductDescription(
              match.description,
              match.brand,
              match.name,
              match.name
            ),
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
      
      // No fallback data available
      console.warn('No product data available');
      setIsLoading(false);
    };
    
    loadProduct();
  }, [productId, initialProduct, navigation]);
  
  // Load similar products and inspiration posts
  useEffect(() => {
    fetchSimilarProducts();
  }, []); // Empty dependency array for initial load only

  // Load inspiration posts when product data is available
  useEffect(() => {
    if (product) {
      fetchInspirationPosts();
    }
  }, [product]); // Only depend on product, not the function
  
  // Complete transition immediately when product is available for seamless experience
  useEffect(() => {
    if (product && !isLoading) {
      // Complete transition immediately when product data is available
      completeTransition();
    }
  }, [product, isLoading]); // Don't depend on the function
  
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
          const savedStatus = await checkIfProductIsSaved(currentUser.uid, product.id);
          setIsSaved(savedStatus);
        } catch (error) {
          console.error('Error checking save status:', error);
        }
      }
    };
    
    checkSaveStatus();
  }, [product]);
  
  // Check if product is in shelf when product loads
  useEffect(() => {
    const checkShelfStatus = () => {
      if (product) {
        const inShelf = checkIsInShelf(product.id);
        setIsInShelf(inShelf);
      }
    };
    
    checkShelfStatus();
  }, [product, checkIsInShelf]);
  
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
      // Always use goBack() to return to the previous screen instance
      // This preserves the existing chat state and context
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
      // Check current save status first
      const isCurrentlySaved = await checkIfProductIsSaved(currentUser.uid, product.id);
      
      if (isCurrentlySaved) {
        // Remove from favorites
        await removeProductFromFavorites(currentUser.uid, product.id);
        setIsSaved(false);
        console.log('Product removed from favorites successfully');
      } else {
        // Add to favorites using the same format as RecommendationScreen
        const favoriteData = {
          userId: currentUser.uid,
          productId: product.id,
          name: product.productName || 'Unnamed Product',
          brand: product.brand || 'Unknown Brand',
          price: typeof product.price === 'number' ? product.price : 0,
          imageUrl: product.images && product.images.length > 0 ? product.images[0].url : product.productImage || '',
          url: product.productUrl || '',
          favorited: new Date().toISOString(),
          description: product.description || '',
        };
        
        // Save to the same collection that ClosetScreen reads from
        await db.collection('user_favorite_products').add(favoriteData);
        setIsSaved(true);
        console.log('Product saved to favorites successfully');
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
    }
  };

  // Helper function to check if product is saved
  const checkIfProductIsSaved = async (userId: string, productId: string): Promise<boolean> => {
    try {
      const snapshot = await db
        .collection('user_favorite_products')
        .where('userId', '==', userId)
        .where('productId', '==', productId)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking if product is saved:', error);
      return false;
    }
  };

  // Helper function to remove product from favorites
  const removeProductFromFavorites = async (userId: string, productId: string): Promise<void> => {
    try {
      const snapshot = await db
        .collection('user_favorite_products')
        .where('userId', '==', userId)
        .where('productId', '==', productId)
        .get();
      
             const deletePromises = snapshot.docs.map((doc: any) => doc.ref.delete());
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error removing product from favorites:', error);
      throw error;
    }
  };

  // Handle shelf toggle
  const handleShelfToggle = async (newIsInShelf: boolean) => {
    if (!product) {
      console.log('No product available for shelf toggle');
      return;
    }

    try {
      setIsInShelf(newIsInShelf); // Optimistic update
      
      if (newIsInShelf) {
        // Add to shelf
        const shelfProduct = {
          id: product.id,
          name: product.productName || 'Unnamed Product',
          brand: product.brand,
          price: typeof product.price === 'number' ? product.price : 0,
          currency: '$',
          images: product.images || [],
          productUrl: product.productUrl,
        };
        
        const success = await addProductToShelf(shelfProduct, 'product_detail');
        
        if (!success) {
          // Revert optimistic update on failure
          setIsInShelf(false);
          Alert.alert('Error', 'Failed to add to shelf');
        }
      } else {
        // Remove from shelf
        const success = await removeProductFromShelf(product.id);
        
        if (!success) {
          // Revert optimistic update on failure
          setIsInShelf(true);
          Alert.alert('Error', 'Failed to remove from shelf');
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsInShelf(!newIsInShelf);
      Alert.alert('Error', 'Something went wrong');
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
  

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchSimilarProducts(true);
    if (product) {
      fetchInspirationPosts();
    }
  };
  
  // Handle loading more items
  const handleLoadMore = () => {
    if (isLoadingMore) return;
    
    setDisplayedSimilarCount(prev => prev + LOAD_MORE_COUNT);
    fetchSimilarProducts();
  };
  
  // Handle product press from similar products
  const handleSimilarProductPress = (product: FormattedSimpleProduct) => {
    console.log(`[ExpandedProductScreen2] Navigating to similar product: ${product.id}`);
    console.log(`[ExpandedProductScreen2] Product data:`, {
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      images: product.images?.length || 0
    });
    
    // Navigate to the same screen with the new product
    navigation.navigate('ExpandedProductScreen2', {
      productId: product.id,
      sourcePosition: { x: 0, y: 0, width: 100, height: 100 },
      product: product,
      initialImageIndex: 0, // Start with first image
    });
    
    // Scroll to top to show the new product content immediately
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: true });
      }
    }, 150); // Small delay to ensure navigation completes
  };
  
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
  
  // Calculate optimal card dimensions for the available space in "explore similar" section
  const SECTION_HORIZONTAL_PADDING = 40; // 20px on each side from section style
  const SIMILAR_ITEM_SPACING = 12; // Optimal spacing for this section
  const SIMILAR_NUM_COLUMNS = 2;
  
  // Memoize sizing calculations to prevent repeated execution
  const sizingCalculations = useMemo(() => {
    // Available width calculation: screen width minus section padding
    const availableWidth = SCREEN_WIDTH - SECTION_HORIZONTAL_PADDING;
    
    // Calculate card width: (available width - total spacing) / number of columns
    // Total spacing = (columns + 1) * spacing for proper edge spacing
    const totalSpacing = (SIMILAR_NUM_COLUMNS + 1) * SIMILAR_ITEM_SPACING;
    const similarProductCardWidth = (availableWidth - totalSpacing) / SIMILAR_NUM_COLUMNS;
    
    // Optimal image aspect ratio for mobile cards (not too tall, not too wide)
    const SIMILAR_IMAGE_ASPECT_RATIO = 1.25; // Slightly taller than square for clothing items
    
    return {
      availableWidth,
      totalSpacing,
      similarProductCardWidth,
      SIMILAR_IMAGE_ASPECT_RATIO
    };
  }, []);

  // Custom compact product card for similar products section
  const renderCompactProductCard = (product: FormattedSimpleProduct) => {
    // Validate price (removed excessive logging for performance)
    if (product.price === null || product.price === undefined) {
      console.warn('Invalid price for product:', product.id);
    }
    
    const imageHeight = sizingCalculations.similarProductCardWidth / sizingCalculations.SIMILAR_IMAGE_ASPECT_RATIO;
    const themeColors = isDarkMode ? colors.dark : colors.light;
    
    return (
      <TouchableOpacity
        style={[
          {
            width: sizingCalculations.similarProductCardWidth,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333' : '#E5E5E5',
            backgroundColor: themeColors.background,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }
        ]}
        onPress={() => handleSimilarProductPress(product)}
        activeOpacity={0.9}
      >
        {/* Image */}
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: product.images[0]?.url }}
            style={{
              width: '100%',
              height: imageHeight,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
            resizeMode="cover"
          />
          
          {/* Save button */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 12,
              padding: 6,
            }}
            onPress={() => console.log('Save product:', product.id)}
          >
            <Icon name="heart-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={{ padding: 8 }}>
          {/* Brand */}
          {product.brand && (
            <Text
              style={{
                fontSize: 10,
                fontWeight: '500',
                color: themeColors.text.secondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {product.brand}
            </Text>
          )}
          
          {/* Product Name */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: themeColors.text.primary,
              lineHeight: 16,
              marginBottom: 6,
            }}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          
          {/* Price and Add Button Row */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: themeColors.text.primary,
                flex: 1,
              }}
            >
              {product.currency}{product.price.toFixed(2)}
            </Text>
            
            <TouchableOpacity
              style={{
                backgroundColor: themeColors.primary,
                borderRadius: 6,
                padding: 6,
                minWidth: 28,
                minHeight: 28,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => console.log('Add to cart:', product.id)}
            >
              <Icon name="plus" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Fallback FlatList renderer for when MasonryList fails
  const renderFallbackSimilarProducts = () => {
    const itemsPerRow = SIMILAR_NUM_COLUMNS;
    const rows = [];
    
    for (let i = 0; i < similarProducts.slice(0, displayedSimilarCount).length; i += itemsPerRow) {
      const rowItems = similarProducts.slice(0, displayedSimilarCount).slice(i, i + itemsPerRow);
      rows.push(
        <View key={`row-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {rowItems.map((product, index) => (
            <View key={`fallback-${product.id}-${index}`} style={{ flex: 1, marginHorizontal: SIMILAR_ITEM_SPACING / 2 }}>
              {renderCompactProductCard(product)}
            </View>
          ))}
          {/* Fill empty spaces if needed */}
          {rowItems.length < itemsPerRow && 
            Array(itemsPerRow - rowItems.length).fill(0).map((_, index) => (
              <View key={`empty-${i}-${index}`} style={{ flex: 1 }} />
            ))
          }
        </View>
      );
    }
    
    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.masonryContentContainer, 
          { 
            paddingHorizontal: SIMILAR_ITEM_SPACING / 2,
            paddingTop: SIMILAR_ITEM_SPACING / 2,
            paddingBottom: 5,
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {rows}
        {isLoadingMore && renderFooter()}
      </ScrollView>
    );
  };

  // Render inspiration post item
  const renderInspirationPost = (post: Post) => {
    const themeColors = isDarkMode ? colors.dark : colors.light;
    
    return (
      <TouchableOpacity
        key={post.id}
        style={[
          styles.inspirationPostCard,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }
        ]}
        onPress={() => {
          // Navigate to post detail screen
          console.log('Navigate to post:', post.id);
        }}
        activeOpacity={0.9}
      >
        {/* Post Image */}
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.inspirationPostImage}
          resizeMode="cover"
        />
        
        {/* Post Info */}
        <View style={styles.inspirationPostInfo}>
          <View style={styles.inspirationPostHeader}>
            {post.userAvatar ? (
              <Image
                source={{ uri: post.userAvatar }}
                style={styles.inspirationUserAvatar}
              />
            ) : (
              <View style={[styles.inspirationUserAvatar, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.inspirationUserInitial}>
                  {post.username?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={[styles.inspirationUsername, { color: themeColors.text.primary }]}>
              {post.username || 'Anonymous'}
            </Text>
          </View>
          
          {post.caption && (
            <Text
              style={[styles.inspirationCaption, { color: themeColors.text.secondary }]}
              numberOfLines={2}
            >
              {post.caption}
            </Text>
          )}
          
          <View style={styles.inspirationStats}>
            <View style={styles.inspirationStatItem}>
              <Icon name="heart" size={14} color={themeColors.primary} />
              <Text style={[styles.inspirationStatText, { color: themeColors.text.secondary }]}>
                {post.likes || 0}
              </Text>
            </View>
            <View style={styles.inspirationStatItem}>
              <Icon name="comment" size={14} color={themeColors.primary} />
              <Text style={[styles.inspirationStatText, { color: themeColors.text.secondary }]}>
                {post.comments || 0}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
              <MediaComponent 
                uri={productImages[currentImageIndex]?.url} 
                style={styles.headerImage}
                resizeMode="cover"
                onError={(error) => {
                  const currentImage = productImages[currentImageIndex];
                  console.error(`[ExpandedProductScreen2] === HEADER MEDIA LOAD ERROR ===`);
                  console.error(`  Product ID: ${product?.id}`);
                  console.error(`  Product Name: ${product?.productName}`);
                  console.error(`  Header Image Index: ${currentImageIndex}`);
                  console.error(`  Header Media URL: ${currentImage?.url}`);
                  console.error(`  Error:`, error);
                  console.error(`=== END HEADER MEDIA LOAD ERROR ===`);
                }}
                muted={true}
                loop={true}
                autoPlay={true}
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
                  <MediaComponent
                    uri={image?.url}
                    style={styles.productImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error(`[ExpandedProductScreen2] === MEDIA LOAD ERROR ===`);
                      console.error(`  Product ID: ${product?.id}`);
                      console.error(`  Product Name: ${product?.productName}`);
                      console.error(`  Image Index: ${index}`);
                      console.error(`  Media URL: ${image?.url}`);
                      console.error(`  Error:`, error);
                      console.error(`=== END MEDIA LOAD ERROR ===`);
                    }}
                    muted={true}
                    loop={true}
                    autoPlay={true}
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

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={[styles.subSectionTitle, { color: theme.text.primary }]}>
                Description
              </Text>
              <FormattedDescription
                html={product.description || ''}
                useSimpleFormatting={false}
                style={styles.descriptionText}
              />
            </View>
            
            {/* Add to Shelf Button */}
            <TouchableOpacity
              style={[styles.addToShelfButton, { 
                backgroundColor: isInShelf ? '#FF6347' : 'transparent',
                borderColor: '#FF6347'
              }]}
              onPress={() => handleShelfToggle(!isInShelf)}
            >
              <ShelfIcon
                isInShelf={isInShelf}
                onToggle={handleShelfToggle}
                size={20}
                activeColor="#FFFFFF"
                inactiveColor="#FF6347"
                showBackground={false}
                variant="hanger"
                showAnimation={false}
              />
              <Text style={[styles.addToShelfText, { 
                color: isInShelf ? "#FFFFFF" : '#FF6347'
              }]}>
                {isInShelf ? "Added to Shelf" : "Add to Shelf"}
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
          style={[styles.section, { backgroundColor: theme.background }]}
        >
          <CollapsibleProductSection
            title="Explore Similar"
            defaultCollapsed={false}
            collapsedSummary="View similar products"
            style={{ backgroundColor: theme.background }}
            removeContentPadding={true}
          >
            {/* Masonry grid of similar products */}
            <View style={styles.similarProductsContainer}>
              {similarProducts.length === 0 ? (
                <View style={styles.similarProductsLoading}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.similarProductsLoadingText, { color: theme.text.secondary }]}>
                    Loading similar products...
                  </Text>
                </View>
              ) : (
                renderFallbackSimilarProducts()
              )}
            </View>
          </CollapsibleProductSection>
        </View>

        {/* Find Inspiration Section - Only show if there are posts or loading */}
        {(inspirationPosts.length > 0 || isLoadingInspiration) && (
          <View style={[styles.section, styles.lastSection, { backgroundColor: theme.background }]}>
            <CollapsibleProductSection
              title="Find Inspiration"
              defaultCollapsed={false}
              collapsedSummary={`${inspirationPosts.length} posts featuring this product`}
              style={{ backgroundColor: theme.background }}
            >
            {isLoadingInspiration ? (
              <View style={styles.inspirationLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.inspirationLoadingText, { color: theme.text.secondary }]}>
                  Finding posts with this product...
                </Text>
              </View>
            ) : inspirationPosts.length > 0 ? (
              <View style={styles.inspirationContainer}>
                <Text style={[styles.inspirationSubtitle, { color: theme.text.secondary }]}>
                  See how others styled this product
                </Text>
                <View style={styles.inspirationGrid}>
                  {inspirationPosts.map(renderInspirationPost)}
                </View>
              </View>
            ) : (
              <View style={styles.inspirationEmpty}>
                <Icon name="camera-outline" size={48} color={theme.text.secondary} />
                <Text style={[styles.inspirationEmptyTitle, { color: theme.text.primary }]}>
                  No inspiration posts yet
                </Text>
                <Text style={[styles.inspirationEmptyText, { color: theme.text.secondary }]}>
                  Be the first to share an outfit featuring this product!
                </Text>
              </View>
            )}
            </CollapsibleProductSection>
          </View>
        )}
      </Animated.ScrollView>
      
      {/* Floating action button for adding to cart (visible on scroll) - Commented out for closet functionality
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
      */}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF', // Add background color for shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
    paddingVertical: 3,
    borderRadius: 25,
    marginTop: 0,
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
  addToShelfButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
  },
  addToShelfText: {
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
    paddingBottom: 10,
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
  miniProductContainer: {
    position: 'relative',
    width: 46,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF', // Already has background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Add background color for shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  contentActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Add background color for shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  // Inspiration section styles
  inspirationContainer: {
    marginTop: 8,
  },
  inspirationSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  inspirationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inspirationPostCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inspirationPostImage: {
    width: '100%',
    height: 120,
  },
  inspirationPostInfo: {
    padding: 12,
  },
  inspirationPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspirationUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspirationUserInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inspirationUsername: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  inspirationCaption: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  inspirationStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspirationStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  inspirationStatText: {
    fontSize: 11,
    marginLeft: 4,
  },
  inspirationLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  inspirationLoadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  inspirationEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  inspirationEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  inspirationEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  similarProductsLoading: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  similarProductsLoadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default ExpandedProductScreen2; 