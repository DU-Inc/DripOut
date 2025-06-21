// src/screens/OverviewScreen.tsx
// Overview screen with masonry product grid layout

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  useColorScheme,
  ActivityIndicator,
  SectionList,
  InteractionManager,
  RefreshControl,
  ImageBackground,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useTheme } from "../styles/themeprovider";
import Icon from 'react-native-vector-icons/Ionicons';
import UnifiedProductCard, { UnifiedProductCardProps } from '../components/feed/UnifiedProductCard';
import OutfitGroupComponent from '../components/feed/OutfitGroupComponent';
import MasonryList from '@react-native-seoul/masonry-list';
import { colors } from '../styles/theme/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import { FeedStackParamList } from '../navigations/feedNavigator/FeedNavigator';
import { logger } from '../utils/logger';

// Add import for NewsCard component and news service
import NewsCard, { Article } from '../components/feed/NewsCard';
import { fetchFashionNews } from '../services/newsService';

// Import the feed data (commented out to use API instead)
// import feedData from '../data/feed.json';

// Import product service to fetch from API
import { fetchRandomProducts, Product } from '../services/productService';

// Create an extended Product interface with optional title field
interface ExtendedProduct extends Product {
  title?: string;
}

// Fix for setTimeout and clearTimeout
declare function setTimeout(callback: () => void, ms: number): number;
declare function clearTimeout(id: number): void;

// Define type for the navigation prop
type OverviewScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'Overview'>;

// Define a unified type for all product data using the new UnifiedProductCard
interface FormattedProduct extends Omit<UnifiedProductCardProps, 'cardWidth' | 'cardStyle' | 'isDarkMode'> {
  description?: string; // Keep for potential future use
  title?: string; // For backward compatibility
}

// Define types for outfit group components
interface OutfitGroup {
  id: string;
  title: string;
  type: 'full-only' | 'partial-only' | 'mixed';
  products: OutfitProduct[];
}

interface OutfitProduct {
  id: string;
  price: number;
  currency?: string;
  brand?: string;
  images: {
    id: string;
    url: string;
  }[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  letterSpacing: 0.1,
};

// Sample filter options - REMOVED FOR MVP
// const FILTER_OPTIONS = [
//   { id: 'all', label: 'All' },
//   { id: 'trending', label: 'Trending' },
//   { id: 'new', label: 'New Arrivals' },
//   { id: 'popular', label: 'Popular' },
//   { id: 'recommended', label: 'For You' },
//   { id: 'sale', label: 'On Sale' },
//   { id: 'news', label: 'Fashion News' }, // Add News filter
// ];

const NUM_COLUMNS = 2; // Number of columns in the grid
const ITEM_SPACING = 6; // Consistent spacing between items
const INITIAL_LOAD_COUNT = 10; // Number of items to load initially
const LOAD_MORE_COUNT = 10; // Number of items to load when scrolling

const OverviewScreen: React.FC = () => {
  const navigation = useNavigation<OverviewScreenNavigationProp>();
  const { isDarkMode } = useTheme();
  const systemColorScheme = useColorScheme(); // Get system color scheme as backup
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Timer refs to avoid callback accumulation
  const loadMoreTimerRef = useRef<number | null>(null);
  
  // Mounted ref to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  // Add ref to track if news has been loaded
  const hasLoadedNewsRef = useRef(false);
  
  // Add static session cache for news articles - persists across component re-renders
  const staticNewsCache = useRef<{
    articles: {
      id: string;
      sourceName: string;
      sourceLogoUrl?: string;
      headline: string;
      imageUrl: string;
      publishedAt: Date;
      author?: string;
    }[];
    lastFetchTime: number;
  }>({
    articles: [],
    lastFetchTime: 0
  });
  
  // Animation value refs to prevent memory leaks
  const headerHeightRef = useRef(scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [50, 0],
    extrapolate: 'clamp'
  }));
  
  const headerOpacityRef = useRef(scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  }));
  
  // Unified product state with different sections
  const [trendingProducts, setTrendingProducts] = useState<FormattedProduct[]>([]);
  const [newDropsProducts, setNewDropsProducts] = useState<FormattedProduct[]>([]);
  const [editorsPicksProducts, setEditorsPicksProducts] = useState<FormattedProduct[]>([]);
  
  // News state
  const [newsArticles, setNewsArticles] = useState<Article[]>([]); 
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  
  // Outfit groups state
  const [outfitGroups, setOutfitGroups] = useState<OutfitGroup[]>([]);
  const [displayedOutfitCount, setDisplayedOutfitCount] = useState(5); // Start with 5 outfit groups
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
  
  // Display counters for lazy loading
  const [displayedTrendingCount, setDisplayedTrendingCount] = useState(INITIAL_LOAD_COUNT);
  const [displayedNewDropsCount, setDisplayedNewDropsCount] = useState(0);
  const [displayedEditorsPicksCount, setDisplayedEditorsPicksCount] = useState(0);
  const [displayedNewsCount, setDisplayedNewsCount] = useState(10); 
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // const [currentFilter, setCurrentFilter] = useState('all'); // REMOVED FOR MVP
  
  // Track which card has an active state (simplified)
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeNewsCardId, setActiveNewsCardId] = useState<string | null>(null);
  const [activeOutfitActionCardId, setActiveOutfitActionCardId] = useState<string | null>(null);
  
  // Determine current theme
  const currentIsDarkMode = isDarkMode ?? systemColorScheme === 'dark';
  
  // Theme colors based on current mode
  const themeColors = currentIsDarkMode ? colors.dark : colors.light;
  const bgColor = themeColors.background;
  const subTextColor = themeColors.text.secondary;
  const accentColor = themeColors.primary;
  
  // Add a ref map to store references to each product card
  const productRefs = useRef<{ [key: string]: React.RefObject<View> }>({});
  
  // Clean up timers on unmount and set mounted state
  useEffect(() => {
    isMountedRef.current = true;
    
    // Create a proper cleanup function to avoid animation memory leaks
    return () => {
      // Mark component as unmounted to prevent setState after unmount
      isMountedRef.current = false;
      
      // Clear any pending timers when component unmounts
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
        loadMoreTimerRef.current = null;
      }
      
      // Clean up animation values to prevent memory leaks
      if (scrollY) {
        // Remove all listeners by passing empty callback
        scrollY.removeAllListeners();
      }
    };
  }, []);
  
  // Helper to format image array; returns null if no valid images
  function formatImages(images: any, productId: string): {id: string; url: string}[] | null {
    if (!Array.isArray(images) || images.length === 0) {
      logger.warn(`Skipping product ${productId} due to missing images`);
      return null;
    }
    return images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return { id: `${productId}-${idx}`, url: img };
      }
      if (img && img.url) {
        return { id: img.id || `${productId}-${idx}`, url: img.url };
      }
      return { id: `${productId}-${idx}`, url: '' };
    });
  }

  // Load products from API instead of feed.json
  useEffect(() => {
    const loadProductsFromAPI = async () => {
      try {
        // Fetch random products from API
        let apiProducts = await fetchRandomProducts(5); // Get a good number of products for various displays

        if (!isMountedRef.current) return; // Don't update state if unmounted

        // Log a sample product to debug the structure
        if (apiProducts.length > 0) {
          console.log('Sample product structure:', JSON.stringify(apiProducts[0], null, 2));
          // Log the image URLs for debugging
          if (Array.isArray(apiProducts[0].images)) {
            console.log('Image URLs from API:', apiProducts[0].images.map(img => img.url || img));
          }
        }

        // Helper function to format products for unified card
        const formatProductForUnifiedCard = (product: ExtendedProduct, idPrefix: string, cardType: 'full' | 'simple' | 'partial' = 'full'): FormattedProduct | null => {
          const imgs = formatImages(product.images, product.id);
          if (!imgs) return null;
          
          return {
            id: product.id || `${idPrefix}-${Math.random().toString(36).substring(2, 9)}`,
            name: product.name || 'Unnamed Product',
            brand: product.brand || 'Unknown Brand',
            price: typeof product.price === 'number' ? product.price : 0,
            currency: product.currency || '$',
            images: imgs,
            productUrl: product.productUrl || '',
            cardType,
            title: product.name || 'Unnamed Product', // For backward compatibility
            description: `${product.brand || 'Unknown Brand'}: ${product.name || 'Unnamed Product'}`,
          };
        };

        // Distribute products across different sections
        const trendingProducts: FormattedProduct[] = [];
        const newDropsProducts: FormattedProduct[] = [];
        const editorsPicksProducts: FormattedProduct[] = [];

        // Distribute products across sections (same API, different presentation)
        apiProducts.forEach((product, index) => {
          let formattedProduct: FormattedProduct | null = null;
          
          if (index < 10) {
            // First 10 go to trending (full cards)
            formattedProduct = formatProductForUnifiedCard(product, 'trending', 'full');
            if (formattedProduct) trendingProducts.push(formattedProduct);
          } else if (index < 20) {
            // Next 10 go to new drops (some with partial data)
            formattedProduct = formatProductForUnifiedCard(product, 'newdrops', 'partial');
            if (formattedProduct) newDropsProducts.push(formattedProduct);
          } else {
            // Rest go to editor's picks (simple cards)
            formattedProduct = formatProductForUnifiedCard(product, 'editors', 'simple');
            if (formattedProduct) editorsPicksProducts.push(formattedProduct);
          }
        });

        // Temporarily disable outfit group generation
        // const generatedOutfitGroups = generateOutfitGroups(formattedProducts, formattedPartialProducts);

        if (isMountedRef.current) {
          // Set the different product sections
          setTrendingProducts(trendingProducts);
          setNewDropsProducts(newDropsProducts);
          setEditorsPicksProducts(editorsPicksProducts);
          setOutfitGroups([]); // Set to empty array to indicate no outfit groups
          setIsLoadingOutfits(false);
        }
      } catch (error) {
        console.error('Error loading products from API:', error);
        setIsLoadingOutfits(false);
      }
    };

    loadProductsFromAPI();
  }, []);
  
  // Function to generate outfit groups with various combinations
  const generateOutfitGroups = (
    fullProducts: FormattedProduct[], 
    partialProducts: FormattedPartialProduct[]
  ): OutfitGroup[] => {
    // Shuffle the products to ensure randomness
    const shuffledFullProducts = [...fullProducts].sort(() => 0.5 - Math.random());
    const shuffledPartialProducts = [...partialProducts].sort(() => 0.5 - Math.random());
    
    const result: OutfitGroup[] = [];
    
    // Helper to convert product data to OutfitProduct format with unique ID
    const convertToOutfitProduct = (product: FormattedProduct | FormattedPartialProduct, outfitIndex: number, productIndex: number): OutfitProduct => {
      // Create a unique ID by combining the original product ID with outfit and product indices
      const uniqueProductId = `product-${outfitIndex}-${productIndex}-${Math.random().toString(36).substring(2, 7)}`;
      
      return {
        id: uniqueProductId, // Use unique ID to prevent duplicate keys
        price: typeof product.price === 'number' ? product.price : 0,
        currency: '$',
        brand: product.brand,
        images: product.images
      };
    };
    
    // Track used product sizes to ensure at least one of each
    const usedSizes = new Set<number>();
    
    // Create 20 outfit groups
    for (let i = 0; i < 3; i++) {
      // Determine type of outfit group
      // For variety, create 7 full-only, 7 partial-only, and 6 mixed
      let type: 'full-only' | 'partial-only' | 'mixed';
      
      if (i < 7) {
        type = 'full-only';
      } else if (i < 14) {
        type = 'partial-only';
      } else {
        type = 'mixed';
      }
      
      // Determine number of products (2-6)
      // Ensure we have at least one outfit of each size (2, 3, 4, 5, 6)
      let numProducts: number;
      
      if (i < 5) {
        // First 5 outfits: one of each size from 2 to 6
        numProducts = i + 2;
        usedSizes.add(numProducts);
      } else {
        // For the rest, ensure we have at least one of each size
        if (usedSizes.size < 5) {
          // Find a size we haven't used yet
          const availableSizes = [2, 3].filter(size => !usedSizes.has(size));
          numProducts = availableSizes[0];
          usedSizes.add(numProducts);
        } else {
          // We've used all sizes, now pick randomly
          numProducts = Math.floor(Math.random() * 5) + 2; // Random number between 2 and 6
        }
      }
      
      // Create products array based on type
      let outfitProducts: OutfitProduct[] = [];
      
      if (type === 'full-only') {
        // Use only full products
        outfitProducts = shuffledFullProducts
          .slice(i * numProducts, i * numProducts + numProducts)
          .map((product, index) => convertToOutfitProduct(product, i, index));
      } else if (type === 'partial-only') {
        // Use only partial products
        outfitProducts = shuffledPartialProducts
          .slice(i * numProducts, i * numProducts + numProducts)
          .map((product, index) => convertToOutfitProduct(product, i, index));
      } else {
        // Mix of full and partial products
        const fullCount = Math.ceil(numProducts / 2);
        const partialCount = numProducts - fullCount;
        
        const fullItems = shuffledFullProducts
          .slice(i * fullCount, i * fullCount + fullCount)
          .map((product, index) => convertToOutfitProduct(product, i, index));
          
        const partialItems = shuffledPartialProducts
          .slice(i * partialCount, i * partialCount + partialCount)
          .map((product, index) => convertToOutfitProduct(product, i, index + fullCount));
          
        outfitProducts = [...fullItems, ...partialItems];
      }
      
      // If we don't have enough products, reuse some with new unique IDs
      if (outfitProducts.length < numProducts) {
        const productsToUse = type === 'full-only' ? shuffledFullProducts : 
                              type === 'partial-only' ? shuffledPartialProducts :
                              [...shuffledFullProducts, ...shuffledPartialProducts];
        
        let currentIndex = outfitProducts.length;
        while (outfitProducts.length < numProducts) {
          const randomProduct = productsToUse[Math.floor(Math.random() * productsToUse.length)];
          outfitProducts.push(convertToOutfitProduct(randomProduct, i, currentIndex));
          currentIndex++;
        }
      }
      
      // Create the outfit group
      result.push({
        id: `outfit-group-${i + 1}`,
        title: getOutfitTitle(type, i + 1),
        type,
        products: outfitProducts
      });
    }
    
    return result;
  };
  
  // Generate outfit title based on type
  const getOutfitTitle = (type: 'full-only' | 'partial-only' | 'mixed', index: number): string => {
    const adjectives = ['Stylish', 'Modern', 'Trendy', 'Urban', 'Casual', 'Classic', 'Elegant', 'Contemporary'];
    const nouns = ['Collection', 'Ensemble', 'Outfit', 'Set', 'Look', 'Style', 'Combo', 'Attire'];
    
    // Pick a random adjective and noun
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective} ${noun} ${index}`;
  };
  
  // Fetch fashion news using a properly memoized callback to prevent excessive renders
  const fetchNews = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setIsLoadingNews(true);
    setNewsError(null);
    
    try {
      // Check static cache first - if it has data and was fetched less than 1 hour ago, use it
      const CACHE_TTL = 60 * 60 * 1000; // 1 hour
      const now = Date.now();
      
      if (staticNewsCache.current.articles.length > 0 && 
          (now - staticNewsCache.current.lastFetchTime) < CACHE_TTL) {
        // Use cached data
        // console.log('Using cached news articles from session cache');
        
        setNewsArticles(staticNewsCache.current.articles);
        setDisplayedNewsCount(staticNewsCache.current.articles.length);
        setIsLoadingNews(false);
        return;
      }
      
      // If no cache or cache expired, fetch from API
      // console.log('🔄 Fetching fashion news...');
      
      // Fetch fashion news from our service - increased to 50 and added Italy region
      const articles = await fetchFashionNews(10, 'latest', 'us,italy,france,uk');
      
      if (!isMountedRef.current) return;
      
      // Simulate fetched articles from cache
      // const articles: {
      //   id: string;
      //   source: string;
      //   title: string;
      //   imageUrl: string;
      //   publishedAt: Date;
      //   author?: string;
      // }[] = [];
      
      if (articles && articles.length > 0) {
        // console.log(`✅ Successfully loaded ${articles.length} fashion articles`);
        
        // Convert to the format expected by NewsCard component
        const formattedArticles = articles.map(article => ({
          id: article.id,
          sourceName: article.source,
          sourceLogoUrl: undefined, // We don't have logos in our data model yet
          headline: article.title,
          imageUrl: article.imageUrl,
          publishedAt: article.publishedAt,
          author: article.author
        }));
        
        // Store in static session cache
        staticNewsCache.current = {
          articles: formattedArticles,
          lastFetchTime: now
        };
        
        setNewsArticles(formattedArticles);
        // Always show all available news articles
        setDisplayedNewsCount(formattedArticles.length);
      } else {
        // console.log('⚠️ No fashion articles returned from API');
        setNewsError('No fashion articles available');
        setNewsArticles([]);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // console.error('❌ Error loading fashion news:', error);
      setNewsError(error instanceof Error ? error.message : 'Failed to load news');
      setNewsArticles([]);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingNews(false);
      }
    }
  }, []);
  
  // Fetch news on mount, but only once after splash screen animations
  useEffect(() => {
    // Wait for animations to complete before fetching news
    InteractionManager.runAfterInteractions(() => {
      if (isMountedRef.current && !hasLoadedNewsRef.current) {
        hasLoadedNewsRef.current = true; // Mark as loaded
        fetchNews();
      }
    });
  }, [fetchNews]);
  
  // Simplified action handlers for the new unified card design
  const handleSave = useCallback((id: string) => {
    handleAction('save', id);
  }, []);

  const handleAddToCart = useCallback((id: string) => {
    handleAction('cart', id);
  }, []);


  // Handle product card press - search across all product sections
  const handleProductPress = useCallback((productId: string, currentImageIndex = 0) => {
    // Find the product data across all sections
    const allProducts = [...trendingProducts, ...newDropsProducts, ...editorsPicksProducts];
    let rawProduct = allProducts.find(p => p.id === productId);
    
    // If not found by ID, try to find by other possible identifiers
    if (!rawProduct) {
      logger.warn(`Product with ID ${productId} not found directly - trying alternative methods`);
      
      // Try to find by partial ID match (in case of composite IDs)
      rawProduct = allProducts.find(p => p.id.includes(productId) || productId.includes(p.id));
      
      if (!rawProduct) {
        // Try to find by URL if available
        rawProduct = allProducts.find(p => 
          p.productUrl === productId || 
          (p.images && p.images.length > 0 && p.images[0].url === productId)
        );
        
        if (!rawProduct) {
          // Last resort: just use the first product as a fallback to avoid crashes
          logger.error(`Could not find product with ID or URL ${productId} - using fallback`);
          rawProduct = allProducts[0];
          
          if (!rawProduct) {
            logger.error('No products available to use as fallback');
            return; // Exit if no products are available
          }
        }
      }
    }
    
    // Format the product data to ensure it has all necessary fields
    // for the ExpandedProductScreen
    const productToPass = {
      id: rawProduct.id,
      productName: rawProduct.name || rawProduct.title || 'Unnamed Product',
      productImage: rawProduct.images && rawProduct.images.length > 0 ? rawProduct.images[0].url : '',
      additionalImages: rawProduct.images && rawProduct.images.length > 1 
        ? rawProduct.images.slice(1).map(img => img.url) 
        : [],
      price: typeof rawProduct.price === 'number' ? rawProduct.price : 0,
      brand: rawProduct.brand || '',
      description: rawProduct.description || '',
      images: rawProduct.images || [], // Keep original images array for flexibility
      productUrl: rawProduct.productUrl || '', // Include URL as it might be used as identifier
      // Add any other fields needed by ExpandedProductScreen
    };
    
    // Debug logging for URL mapping
    console.log('[OverviewScreen] Product navigation debug:');
    console.log('  Product ID:', productId);
    console.log('  Product URL available:', !!rawProduct.productUrl);
    if (!rawProduct.productUrl) {
      console.log('  Raw URL from server:', (rawProduct as any).url);
    }
    
    // Get the ref for this specific card
    const cardRef = productRefs.current[productId];
    
    if (cardRef?.current) {
      // Measure the position of the card on the screen
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        // Log the product we're passing to help with debugging
        logger.log(`Navigating to ExpandedProductScreen with product ID: ${productToPass.id}`);
        
        // Navigate with the position, product data, and current image index
        navigation.navigate('ExpandedProductScreen2', { 
          productId: productToPass.id, // Use the actual found product ID
          sourcePosition: {
            x: pageX,
            y: pageY,
            width,
            height
          },
          product: productToPass,
          initialImageIndex: currentImageIndex
        });
      });
    } else {
      // Fallback if ref isn't available
      logger.log(`Navigating to ExpandedProductScreen (fallback) with product ID: ${productToPass.id}`);
      
      navigation.navigate('ExpandedProductScreen2', { 
        productId: productToPass.id, // Use the actual found product ID
        product: productToPass,
        initialImageIndex: currentImageIndex
      });
    }
  }, [navigation, trendingProducts, newDropsProducts, editorsPicksProducts]);
  
  // Simplified card press handler
  const handleCardPress = useCallback((productId: string) => {
    // Close any open action menus
    setActiveCardId(null);
    setActiveNewsCardId(null);
    
    logger.log(`Card pressed for product: ${productId}`);
    handleProductPress(productId);
  }, [handleProductPress]);
  
  // Handle news card press
  const handleNewsCardPress = useCallback((articleId: string) => {
    // Close any open action menu
    setActiveCardId(null);
    setActiveNewsCardId(null);
    
    // Navigate to expanded news screen
    navigation.navigate('ExpandedNewsScreen', { articleId });
  }, [navigation]);
  
  // Consolidated action handlers to reduce callbacks
  const handleAction = useCallback((action: string, id: string) => {
    switch (action) {
      case 'cart':
        logger.log('Add to cart:', id);
        break;
      case 'save':
        logger.log('Save/Bookmark:', id);
        break;
      case 'like':
        logger.log('Like:', id);
        break;
      case 'dislike':
        logger.log('Dislike:', id);
        break;
      case 'share':
        logger.log('Share:', id);
        break;
      case 'bookmark':
        logger.log('Bookmark:', id);
        break;
    }
  }, []);

  // Handle content action expand/collapse for different card types
  const handleContentActionExpandChange = useCallback((cardType: string, cardId: string, isExpanded: boolean) => {
    switch (cardType) {
      case 'news':
        setActiveNewsCardId(isExpanded ? cardId : null);
        break;
      case 'outfit':
        setActiveOutfitActionCardId(isExpanded ? cardId : null);
        break;
      case 'product':
      default:
        setActiveCardId(isExpanded ? cardId : null);
        break;
    }
  }, []);

  
  // Render filter item - REMOVED FOR MVP
  // const renderFilterItem = useCallback((filter: typeof FILTER_OPTIONS[0]) => {
  //   const isActive = filter.id === currentFilter;
  //   return (
  //     <TouchableOpacity
  //       key={filter.id}
  //       style={[
  //         styles.filterItem,
  //         isActive && styles.activeFilterItem, { borderBottomColor: isActive ? accentColor : 'transparent' }
  //       ]}
  //       onPress={() => setCurrentFilter(filter.id)}
  //     >
  //       <Text style={[
  //         styles.filterText,
  //         { color: isActive ? themeColors.text.primary : subTextColor }
  //       ]}>
  //         {String(filter.label)}
  //       </Text>
  //     </TouchableOpacity>
  //   );
  // }, [currentFilter, accentColor, themeColors.text.primary, subTextColor]);

  // Calculate card width based on screen width, columns and spacing
  const calculatedItemWidth = (SCREEN_WIDTH - (ITEM_SPACING * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

  // Get pseudo-random aspect ratio for a product - simplified for performance
  const getAspectRatioForProduct = (product: any, index: number) => {
    // Simplified calculation to reduce processing
    const seed = (product.id.length + index * 7) % 20;
    return 1.0 + (seed * 0.03);
  };

  // Unified product item renderer
  const renderUnifiedProductItem = useCallback(({ item, i }: { item: any, i: number }) => {
    const product = item as FormattedProduct;
    
    // Double-check that product has valid images
    if (!product.images || product.images.length === 0 || !product.images[0].url) {
      logger.warn(`Skipping product ${product.id} - no images`);
      return null;
    }
    
    const aspectRatio = getAspectRatioForProduct(product, i);
    
    // Create a ref for this product card if it doesn't exist
    if (!productRefs.current[product.id]) {
      productRefs.current[product.id] = React.createRef<View>();
    }
    
    return (
      <View 
        key={`unified-product-${product.id}-${i}`}
        ref={productRefs.current[product.id]}
        style={{
          margin: ITEM_SPACING / 2,
          marginBottom: ITEM_SPACING,
        }}
      >
        <UnifiedProductCard
          id={product.id}
          name={product.name}
          brand={product.brand}
          price={product.price}
          currency={product.currency}
          images={product.images}
          productUrl={product.productUrl}
          onCardPress={() => handleCardPress(product.id)}
          onAddToCart={() => handleAddToCart(product.id)}
          onSave={() => handleSave(product.id)}
          isDarkMode={currentIsDarkMode}
          cardWidth={calculatedItemWidth}
          imageAspectRatio={aspectRatio}
          cardType={product.cardType}
          cardStyle={{ margin: 0 }}
        />
      </View>
    );
  }, [currentIsDarkMode, calculatedItemWidth, getAspectRatioForProduct, handleCardPress, handleAddToCart, handleSave]);


  
  // Render news items with proper grid layout and spacing
  const renderNewsItems = useCallback(() => {
    if (isLoadingNews) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.emptyText, { color: themeColors.text.secondary, marginTop: 8 }]}>
            Loading fashion news...
          </Text>
        </View>
      );
    }
    
    if (newsError) {
      return (
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
            {newsError}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchNews}
          >
            <Text style={[styles.retryText, { color: accentColor }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (newsArticles.length === 0) {
      return (
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
            No fashion news available
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchNews}
          >
            <Text style={[styles.retryText, { color: accentColor }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // console.log(`Rendering ${displayedNewsCount} out of ${newsArticles.length} news articles`);
    
    // Only show the number of news items that should be displayed
    const visibleNews = newsArticles.slice(0, displayedNewsCount);
    
    // Separate list and grid items
    const listItems = visibleNews.filter((_, i) => i % 2 === 0);
    const gridItems = visibleNews.filter((_, i) => i % 2 === 1);
    
    return (
      <View style={styles.newsContainer}>
        {/* List mode items (full width) */}
        {listItems.map((article, index) => {
          const isContentActionActive = activeNewsCardId === article.id;
          
          return (
            <View key={article.id} style={styles.newsListItemContainer}>
              <NewsCard
                article={article}
                mode="list"
                onLike={(id) => handleAction('like', id)}
                onDislike={(id) => handleAction('dislike', id)}
                onShare={(id) => handleAction('share', id)}
                onBookmark={(id) => handleAction('bookmark', id)}
                isDarkMode={currentIsDarkMode}
                isContentActionActive={isContentActionActive}
                onContentActionExpandChange={(isExpanded) => 
                  handleContentActionExpandChange('news', article.id, isExpanded)}
              />
            </View>
          );
        })}
        
        {/* Grid mode items (2 per row) */}
        <View style={styles.newsGridContainer}>
          {gridItems.map((article, index) => {
            const isContentActionActive = activeNewsCardId === article.id;
            
            return (
              <View key={article.id} style={styles.newsGridItemContainer}>
                <NewsCard
                  article={article}
                  mode="grid"
                  onLike={(id) => handleAction('like', id)}
                  onDislike={(id) => handleAction('dislike', id)}
                  onShare={(id) => handleAction('share', id)}
                  onBookmark={(id) => handleAction('bookmark', id)}
                  isDarkMode={currentIsDarkMode}
                  isContentActionActive={isContentActionActive}
                  onContentActionExpandChange={(isExpanded) => 
                    handleContentActionExpandChange('news', article.id, isExpanded)}
                />
              </View>
            );
          })}
        </View>
        
        {/* Show "Load More" button if there are more news articles to display */}
        {displayedNewsCount < newsArticles.length && (
          <TouchableOpacity 
            style={[styles.loadMoreButton, { borderColor: accentColor }]}
            onPress={() => setDisplayedNewsCount(newsArticles.length)}
          >
            <Text style={[styles.loadMoreText, { color: accentColor }]}>
              Show All News
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isLoadingNews, newsError, newsArticles, displayedNewsCount, activeNewsCardId, accentColor, themeColors.text.secondary, currentIsDarkMode, fetchNews, handleAction, handleContentActionExpandChange]);
  
  // Handle scrolling to dismiss active content action and implement infinite scroll
  const handleScroll = useCallback((event: any) => {
    // Clear active cards on scroll - simplified
    setActiveCardId(null);
    setActiveNewsCardId(null);
    
    // Process regular scroll event
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    )(event);
  }, [scrollY]);
  
  // Handle loading more items - updated for new sections
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !isMountedRef.current) return;
    
    setIsLoadingMore(true);
    
    // Progressive loading: Trending -> News -> New Drops -> Editor's Picks
    if (displayedTrendingCount < trendingProducts.length) {
      setDisplayedTrendingCount(prev => Math.min(prev + LOAD_MORE_COUNT, trendingProducts.length));
    }
    else if (displayedNewsCount < newsArticles.length) {
      setDisplayedNewsCount(prev => Math.min(prev + 5, newsArticles.length));
    }
    else if (displayedNewDropsCount < newDropsProducts.length) {
      setDisplayedNewDropsCount(prev => Math.min(prev + LOAD_MORE_COUNT, newDropsProducts.length));
    }
    else if (displayedEditorsPicksCount < editorsPicksProducts.length) {
      setDisplayedEditorsPicksCount(prev => Math.min(prev + LOAD_MORE_COUNT, editorsPicksProducts.length));
    }
    
    // Clear loading state after a slight delay
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
    }
    
    loadMoreTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
      loadMoreTimerRef.current = null;
    }, 500);
  }, [isLoadingMore, displayedTrendingCount, trendingProducts.length, displayedNewsCount, newsArticles.length, displayedNewDropsCount, newDropsProducts.length, displayedEditorsPicksCount, editorsPicksProducts.length]);
  
  
  // Always show all sections in MVP - no filtering
  const shouldShowNews = true;
  
  // Function to render section header
  const renderSectionHeader = useCallback((title: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
      <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
        {title}
      </Text>
    </View>
  ), [bgColor, themeColors.text.primary]);

  // Unified function to render any product section
  const renderProductSection = useCallback((products: FormattedProduct[], displayedCount: number) => {
    const visibleProducts = products.slice(0, displayedCount);
    
    return (
      <MasonryList
        data={visibleProducts}
        numColumns={NUM_COLUMNS}
        renderItem={renderUnifiedProductItem}
        keyExtractor={(item): string => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable scrolling - parent ScrollView handles scrolling
        contentContainerStyle={styles.masonryContentContainer}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
              Loading products...
            </Text>
          </View>
        }
      />
    );
  }, [renderUnifiedProductItem, themeColors.text.secondary]);

  // Render outfit groups section
  const renderOutfitGroups = useCallback(() => {
    // Show loading state
    if (isLoadingOutfits) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.emptyText, { color: themeColors.text.secondary, marginTop: 8 }]}>
            Loading outfit collections...
          </Text>
        </View>
      );
    }
    
    // Only render if we have outfit groups
    if (outfitGroups.length === 0) {
      return (
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
            No outfit collections available
          </Text>
        </View>
      );
    }

    // Only display the number of outfits specified by displayedOutfitCount
    const visibleOutfits = outfitGroups.slice(0, displayedOutfitCount);

    return (
      <View style={styles.outfitGroupsContainer}>
        {visibleOutfits.map((group) => (
          <OutfitGroupComponent
            key={group.id}
            products={group.products}
            title={group.title}
            onCartPress={(productId) => handleAction('cart', productId)}
            onCardPress={(productId) => handleCardPress(productId)}
            onLikePress={(id) => handleAction('like', id)}
            onDislikePress={(id) => handleAction('dislike', id)}
            onSharePress={(id) => handleAction('share', id)}
            onBookmarkPress={(id) => handleAction('bookmark', id)}
            isDarkMode={currentIsDarkMode}
            outfitId={group.id}
            isContentActionActive={activeOutfitActionCardId === group.id}
            onContentActionExpandChange={(isExpanded: boolean) => 
              handleContentActionExpandChange('outfit', group.id, isExpanded)}
          />
        ))}
        
        {/* Load more button */}
        {displayedOutfitCount < outfitGroups.length && (
          <TouchableOpacity 
            style={[styles.loadMoreButton, { borderColor: accentColor }]}
            onPress={() => setDisplayedOutfitCount(prev => Math.min(prev + 5, outfitGroups.length))}
          >
            <Text style={[styles.loadMoreText, { color: accentColor }]}>
              Load More Outfits
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [outfitGroups, displayedOutfitCount, isLoadingOutfits, themeColors.text.secondary, accentColor, currentIsDarkMode, handleAction, handleCardPress, handleContentActionExpandChange]);

  // Render loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }, [isLoadingMore, accentColor]);
  


  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={currentIsDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          height: headerHeightRef.current,
          opacity: headerOpacityRef.current,
          backgroundColor: bgColor,
        }
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
              DripOut
            </Text>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      { name: 'Auth', params: { screen: 'ResetAuth' } }
                    ],
                  })
                );
              }}
            >
              <Icon 
                name="refresh-circle-outline" 
                size={24} 
                color={themeColors.text.primary} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.rightSection}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => Alert.alert('Search', 'Coming soon!')}
            >
              <Icon 
                name="search-outline" 
                size={24} 
                color={themeColors.text.primary} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => Alert.alert('Notifications', 'Coming soon!')}
            >
              <Icon 
                name="notifications-outline" 
                size={24} 
                color={themeColors.text.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
      
      {/* Filter tabs - REMOVED FOR MVP */}
      {/* <View style={[styles.filterContainer, { borderBottomColor: themeColors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_OPTIONS.map(renderFilterItem)}
        </ScrollView>
      </View> */}
      
      {/* Main content with scrolling sections */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingOutfits}
            onRefresh={async () => {
          // Set loading state
          setIsLoadingOutfits(true);
          try {
            // Fetch new random products from API  
            const apiProducts = await fetchRandomProducts(30);
            if (apiProducts.length > 0) {
              // Helper function to format products for unified card (same as in initial load)
              const formatProductForUnifiedCard = (product: ExtendedProduct, idPrefix: string, cardType: 'full' | 'simple' | 'partial' = 'full'): FormattedProduct | null => {
                const imgs = formatImages(product.images, product.id);
                if (!imgs) return null;
                
                return {
                  id: product.id || `${idPrefix}-${Math.random().toString(36).substring(2, 9)}`,
                  name: product.name || 'Unnamed Product',
                  brand: product.brand || 'Unknown Brand',
                  price: typeof product.price === 'number' ? product.price : 0,
                  currency: product.currency || '$',
                  images: imgs,
                  productUrl: product.productUrl || '',
                  cardType,
                  title: product.name || 'Unnamed Product',
                  description: `${product.brand || 'Unknown Brand'}: ${product.name || 'Unnamed Product'}`,
                };
              };

              // Distribute products across different sections (same logic as initial load)
              const trendingProducts: FormattedProduct[] = [];
              const newDropsProducts: FormattedProduct[] = [];
              const editorsPicksProducts: FormattedProduct[] = [];

              apiProducts.forEach((product, index) => {
                let formattedProduct: FormattedProduct | null = null;
                
                if (index < 10) {
                  formattedProduct = formatProductForUnifiedCard(product, 'trending', 'full');
                  if (formattedProduct) trendingProducts.push(formattedProduct);
                } else if (index < 20) {
                  formattedProduct = formatProductForUnifiedCard(product, 'newdrops', 'partial');
                  if (formattedProduct) newDropsProducts.push(formattedProduct);
                } else {
                  formattedProduct = formatProductForUnifiedCard(product, 'editors', 'simple');
                  if (formattedProduct) editorsPicksProducts.push(formattedProduct);
                }
              });

              // Update the new product sections
              setTrendingProducts(trendingProducts);
              setNewDropsProducts(newDropsProducts);
              setEditorsPicksProducts(editorsPicksProducts);
              setOutfitGroups([]);
            }
          } catch (error) {
            console.error('Error refreshing products:', error);
          } finally {
            setIsLoadingOutfits(false);
          }
        }}
            colors={[accentColor]}
            tintColor={accentColor}
          />
        }
        onMomentumScrollEnd={({ nativeEvent }) => {
          const isCloseToBottom = (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y) 
            >= (nativeEvent.contentSize.height - 20);
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
      >
        {/* Trending Now Section */}
        {trendingProducts.length > 0 && (
          <>
            {renderSectionHeader('Trending Now')}
            {renderProductSection(trendingProducts, displayedTrendingCount)}
          </>
        )}

        {/* Fashion News Section - Integrated naturally */}
        {shouldShowNews && (
          <>
            {renderSectionHeader('Latest in Fashion')}
            {renderNewsItems()}
          </>
        )}

        {/* New Drops Section */}
        {newDropsProducts.length > 0 && displayedTrendingCount >= trendingProducts.length && (
          <>
            {renderSectionHeader('New Drops')}
            {renderProductSection(newDropsProducts, displayedNewDropsCount)}
          </>
        )}

        {/* Editor's Picks Section */}
        {editorsPicksProducts.length > 0 && displayedNewDropsCount >= newDropsProducts.length && (
          <>
            {renderSectionHeader("Editor's Picks")}
            {renderProductSection(editorsPicksProducts, displayedEditorsPicksCount)}
          </>
        )}
        
        {/* Removed duplicate product sections as they are now above */}
        
        {/* Loading footer */}
        {renderFooter()}
        
        {/* Bottom padding to ensure all content is visible */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  filterContainer: {
    borderBottomWidth: 0.5,
    paddingVertical: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderBottomWidth: 2,
  },
  activeFilterItem: {
    // Accent color applied dynamically
  },
  filterText: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  activeFilterText: {
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
  },
  masonryContainer: {
    paddingHorizontal: 0,
    paddingVertical: ITEM_SPACING / 2,
    paddingBottom: 5,
    alignSelf: 'stretch',
  },
  masonryContentContainer: {
    paddingHorizontal: ITEM_SPACING / 2,
    paddingVertical: ITEM_SPACING / 2,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between', // Space columns evenly
  },
  productCardContainer: {
    marginVertical: ITEM_SPACING / 2,
    marginHorizontal: ITEM_SPACING / 2,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 100,
    marginVertical: 20,
  },
  emptyText: {
    ...defaultTextStyle,
    fontSize: 16,
    opacity: 0.5,
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 50,
  },
  // News related styles
  newsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  newsListItemContainer: {
    marginBottom: 16,
    width: '100%',
  },
  newsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -5, // Compensate for the inner padding
  },
  newsGridItemContainer: {
    width: '50%', // Two cards per row
    paddingHorizontal: 5,
    marginBottom: 16,
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.3)',
  },
  retryText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  newsSection: {
    padding: 16,
  },
  featuredProductsSection: {
    padding: 16,
  },
  featuredProductsTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingIndicator: {
    padding: 16,
    alignItems: 'center',
  },
  partialProductsSection: {
    padding: 16,
  },
  partialProductsTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  simpleProductsSection: {
    padding: 16,
  },
  simpleProductsTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.3)',
    borderRadius: 4,
    alignItems: 'center',
  },
  loadMoreText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  outfitGroupsContainer: {
    paddingHorizontal: 1,
    paddingVertical: 0,
  },
});

export default OverviewScreen;