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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from "../styles/theme/ThemeContext";
import Icon from 'react-native-vector-icons/Ionicons';
import ProductCard, { ProductCardProps } from '../components/feed/ProductCard';
import SimpleProductCard, { SimpleProductCardProps } from '../components/feed/SimpleProductCard';
import PartialDataProductCard, { PartialDataProductCardProps } from '../components/feed/PartialDataProductCard';
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

// Define a type for the formatted product data
interface FormattedProduct extends Omit<ProductCardProps, 'cardWidth' | 'cardStyle' | 'isDarkMode'> {
  brand?: string; // Add optional fields if they exist in feedData
  description?: string;
  title?: string; // Add title property to fix type errors
  productUrl?: string; // Add productUrl for alternative identification
}

// Define a type for the formatted simple product data
interface FormattedSimpleProduct extends Omit<SimpleProductCardProps, 'cardWidth' | 'cardStyle' | 'isDarkMode'> {
}

// Define a type for the formatted partial data product
interface FormattedPartialProduct extends Omit<PartialDataProductCardProps, 'cardWidth' | 'cardStyle' | 'isDarkMode'> {
  productUrl: string;
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

// Sample filter options
const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'popular', label: 'Popular' },
  { id: 'recommended', label: 'For You' },
  { id: 'sale', label: 'On Sale' },
  { id: 'news', label: 'Fashion News' }, // Add News filter
];

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
  
  // Product state arrays
  const [products, setProducts] = useState<FormattedProduct[]>([]); // Full products
  const [partialProducts, setPartialProducts] = useState<FormattedPartialProduct[]>([]); // Partial data products
  const [simpleProducts, setSimpleProducts] = useState<FormattedSimpleProduct[]>([]); // Simple products
  
  // News state
  const [newsArticles, setNewsArticles] = useState<Article[]>([]); 
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  
  // Outfit groups state
  const [outfitGroups, setOutfitGroups] = useState<OutfitGroup[]>([]);
  const [displayedOutfitCount, setDisplayedOutfitCount] = useState(5); // Start with 5 outfit groups
  const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
  
  // Display counters for lazy loading
  const [displayedProductCount, setDisplayedProductCount] = useState(INITIAL_LOAD_COUNT);
  const [displayedPartialProductCount, setDisplayedPartialProductCount] = useState(0); // Start at 0
  const [displayedSimpleProductCount, setDisplayedSimpleProductCount] = useState(0); // Start at 0
  const [displayedNewsCount, setDisplayedNewsCount] = useState(10); 
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  
  // Track which product card has an active/expanded content action menu
  const [activeActionCardId, setActiveActionCardId] = useState<string | null>(null);
  const [activeSimpleActionCardId, setActiveSimpleActionCardId] = useState<string | null>(null);
  const [activePartialActionCardId, setActivePartialActionCardId] = useState<string | null>(null);
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

        // Format API products as FormattedProduct, skipping any without images
        const formattedProducts: FormattedProduct[] = apiProducts.slice(0, 10).reduce<FormattedProduct[]>((acc, product: ExtendedProduct) => {
          const imgs = formatImages(product.images, product.id);
          if (!imgs) return acc;
          acc.push({
            id: product.id || `product-${Math.random().toString(36).substring(2, 9)}`,
            title: product.name || 'Unnamed Product',
            name: product.name || 'Unnamed Product',
            price: typeof product.price === 'number' ? product.price : 0,
            images: imgs,
            brand: product.brand || 'Unknown Brand',
            description: `${product.brand || 'Unknown Brand'}: ${product.name || 'Unnamed Product'} - ${product.currency || '$'}${typeof product.price === 'number' ? product.price : 0}`,
            productUrl: product.productUrl || '',
          });
          return acc;
        }, []);

        // Format API products as FormattedPartialProduct, skipping any without images
        const formattedPartialProducts: FormattedPartialProduct[] = apiProducts.slice(10, 20).reduce<FormattedPartialProduct[]>((acc, product: ExtendedProduct) => {
          const imgs = formatImages(product.images, product.id);
          if (!imgs) return acc;
          acc.push({
            id: product.id || `partial-${Math.random().toString(36).substring(2, 9)}`,
            title: product.name || 'Unnamed Product',
            name: product.name || 'Unnamed Product',
            brand: product.brand || 'Unknown Brand',
            price: typeof product.price === 'number' ? product.price : 0,
            images: imgs,
            productUrl: product.productUrl || `https://example.com/product/${product.id || 'unknown'}`
          });
          return acc;
        }, []);

        // Format API products as FormattedSimpleProduct, skipping any without images
        const formattedSimpleProducts: FormattedSimpleProduct[] = apiProducts.slice(20).reduce<FormattedSimpleProduct[]>((acc, product: ExtendedProduct) => {
          const imgs = formatImages(product.images, product.id);
          if (!imgs) return acc;
          acc.push({
            id: product.id || `simple-${Math.random().toString(36).substring(2, 9)}`,
            title: product.name || 'Unnamed Product',
            price: typeof product.price === 'number' ? product.price : 0,
            brand: product.brand || 'Unknown Brand',
            images: imgs
          });
          return acc;
        }, []);

        // Generate outfit groups
        const generatedOutfitGroups = generateOutfitGroups(formattedProducts, formattedPartialProducts);

        if (isMountedRef.current) {
          setProducts(formattedProducts);
          setPartialProducts(formattedPartialProducts);
          setSimpleProducts(formattedSimpleProducts);
          setOutfitGroups(generatedOutfitGroups);
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
  
  // Handle action button expand/collapse for regular products - memoized to reduce rerenders
  const handleContentActionExpandChange = useCallback((productId: string, isExpanded: boolean) => {
    if (isExpanded) {
      // If expanding, set this card as active
      setActiveActionCardId(productId);
      // Close any active simple or partial card
      setActiveSimpleActionCardId(null);
      setActivePartialActionCardId(null);
      setActiveNewsCardId(null);
    } else {
      // If collapsing, clear active card
      setActiveActionCardId(null);
    }
  }, []);

  // Handle action button expand/collapse for simple products
  const handleSimpleContentActionExpandChange = useCallback((productId: string, isExpanded: boolean) => {
    if (isExpanded) {
      // If expanding, set this card as active
      setActiveSimpleActionCardId(productId);
      // Close any active regular or partial card
      setActiveActionCardId(null);
      setActivePartialActionCardId(null);
      setActiveNewsCardId(null);
    } else {
      // If collapsing, clear active card
      setActiveSimpleActionCardId(null);
    }
  }, []);

  // Handle action button expand/collapse for partial data products
  const handlePartialContentActionExpandChange = useCallback((productId: string, isExpanded: boolean) => {
    if (isExpanded) {
      // If expanding, set this card as active
      setActivePartialActionCardId(productId);
      // Close any active regular or simple card
      setActiveActionCardId(null);
      setActiveSimpleActionCardId(null);
      setActiveNewsCardId(null);
    } else {
      // If collapsing, clear active card
      setActivePartialActionCardId(null);
    }
  }, []);

  // Handle action button expand/collapse for news articles
  const handleNewsContentActionExpandChange = useCallback((articleId: string, isExpanded: boolean) => {
    if (isExpanded) {
      // If expanding, set this card as active
      setActiveNewsCardId(articleId);
      // Close any other active cards
      setActiveActionCardId(null);
      setActiveSimpleActionCardId(null);
      setActivePartialActionCardId(null);
      setActiveOutfitActionCardId(null);
    } else {
      // If collapsing, clear active card
      setActiveNewsCardId(null);
    }
  }, []);

  // Handle action button expand/collapse for outfit groups
  const handleOutfitContentActionExpandChange = useCallback((outfitId: string, isExpanded: boolean) => {
    if (isExpanded) {
      // If expanding, set this outfit as active
      setActiveOutfitActionCardId(outfitId);
      // Close any other active cards
      setActiveActionCardId(null);
      setActiveSimpleActionCardId(null);
      setActivePartialActionCardId(null);
      setActiveNewsCardId(null);
    } else {
      // If collapsing, clear active outfit
      setActiveOutfitActionCardId(null);
    }
  }, []);

  // Handle product card press - update to use URL as an alternative identifier if ID not found
  const handleProductPress = useCallback((productId: string, currentImageIndex = 0) => {
    // Find the product data to pass - first try by ID
    let rawProduct = products.find(p => p.id === productId);
    
    // If not found by ID, try to find by other possible identifiers
    if (!rawProduct) {
      logger.warn(`Product with ID ${productId} not found directly - trying alternative methods`);
      
      // Try to find by partial ID match (in case of composite IDs)
      rawProduct = products.find(p => p.id.includes(productId) || productId.includes(p.id));
      
      if (!rawProduct) {
        // Try to find by URL if available
        rawProduct = products.find(p => 
          p.productUrl === productId || 
          (p.images && p.images.length > 0 && p.images[0].url === productId)
        );
        
        if (!rawProduct) {
          // Last resort: just use the first product as a fallback to avoid crashes
          logger.error(`Could not find product with ID or URL ${productId} - using fallback`);
          rawProduct = products[0];
          
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
  }, [navigation, products]);
  
  // More efficient way to close expanded menus without interfering with scrolling
  const handleCardPress = useCallback((productId: string, isSimple: boolean = false, isPartial: boolean = false) => {
    // Close any open action menu
    if (activeActionCardId) setActiveActionCardId(null);
    if (activeSimpleActionCardId) setActiveSimpleActionCardId(null);
    if (activePartialActionCardId) setActivePartialActionCardId(null);
    if (activeNewsCardId) setActiveNewsCardId(null);
    
    // Only navigate for regular product cards
    if (!isSimple && !isPartial) {
      logger.log(`Card pressed for product: ${productId}`);
      handleProductPress(productId);
    }
  }, [activeActionCardId, activeSimpleActionCardId, activePartialActionCardId, activeNewsCardId, handleProductPress]);
  
  // Handle news card press
  const handleNewsCardPress = useCallback((articleId: string) => {
    // Close any open action menu
    if (activeActionCardId) setActiveActionCardId(null);
    if (activeSimpleActionCardId) setActiveSimpleActionCardId(null);
    if (activePartialActionCardId) setActivePartialActionCardId(null);
    if (activeNewsCardId) setActiveNewsCardId(null);
    
    // Navigate to expanded news screen
    navigation.navigate('ExpandedNewsScreen', { articleId });
  }, [navigation, activeActionCardId, activeSimpleActionCardId, activePartialActionCardId, activeNewsCardId]);
  
  // Handle add to cart
  const handleAddToCart = useCallback((productId: string) => {
    // Add to cart logic
    logger.log('Add to cart:', productId);
  }, []);
  
  // Handle like, dislike, share actions
  const handleLike = useCallback((id: string) => {
    // Like logic
    logger.log('Like:', id);
  }, []);
  
  const handleDislike = useCallback((id: string) => {
    // Dislike logic
    logger.log('Dislike:', id);
  }, []);
  
  const handleShare = useCallback((id: string) => {
    // Share logic
    logger.log('Share:', id);
  }, []);
  
  const handleBookmark = useCallback((id: string) => {
    // Bookmark logic
    logger.log('Bookmark:', id);
  }, []);
  
  // Render filter item
  const renderFilterItem = useCallback((filter: typeof FILTER_OPTIONS[0]) => {
    const isActive = filter.id === currentFilter;
    return (
      <TouchableOpacity
        key={filter.id}
        style={[
          styles.filterItem,
          isActive && styles.activeFilterItem, { borderBottomColor: isActive ? accentColor : 'transparent' }
        ]}
        onPress={() => setCurrentFilter(filter.id)}
      >
        <Text style={[
          styles.filterText,
          { color: isActive ? themeColors.text.primary : subTextColor }
        ]}>
          {String(filter.label)}
        </Text>
      </TouchableOpacity>
    );
  }, [currentFilter, accentColor, themeColors.text.primary, subTextColor]);

  // Calculate card width based on screen width, columns and spacing
  const calculatedItemWidth = (SCREEN_WIDTH - (ITEM_SPACING * (NUM_COLUMNS + 1))) / NUM_COLUMNS;

  // Get pseudo-random aspect ratio for a product
  const getAspectRatioForProduct = useCallback((product: any, index: number) => {
    // Generate a pseudo-random variation based on multiple factors
    const charSum = product.id.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
    const nameLengthFactor = product.name ? product.name.length % 5 : 0;
    const priceFactor = Math.floor(product.price) % 3;
    
    // Complex seed that uses multiple properties to create seemingly random but reproducible variation
    const seed = (index * 13) + charSum + (nameLengthFactor * 7) + (priceFactor * 11);
    
    // Using modulo 20 to select one of 20 variations
    const variationIndex = seed % 20;
    
    // Generate aspect ratio between 1.0 and 1.6 with 20 even steps
    return 1.0 + (variationIndex * 0.03);
  }, []);

  // Render product item for MasonryList
  const renderProductItem = useCallback(({ item, i }: { item: any, i: number }) => {
    const product = item as FormattedProduct;
    
    // Log detailed rendering information
    logger.log(`[RENDER FLOW] Preparing to render product ${i} (${product.id})`);
    logger.log(`[RENDER FLOW] product.name: ${product.name !== undefined ? product.name : 'undefined'}`);
    logger.log(`[RENDER FLOW] product.images: ${product.images !== undefined ? JSON.stringify(product.images) : 'undefined'}`);
    logger.log(`[RENDER FLOW] images count: ${product.images ? product.images.length : 0}`);
    if (product.images && product.images.length > 0) {
      logger.log(`[RENDER FLOW] First image URL: ${product.images[0].url}`);
      logger.log(`[RENDER FLOW] URL starts with http? ${product.images[0].url.startsWith('http')}`);
      logger.log(`[RENDER FLOW] URL length: ${product.images[0].url.length}`);
    }
    
    const aspectRatio = getAspectRatioForProduct(product, i);
    
    // Check if this card's content action is active
    const isContentActionActive = activeActionCardId === product.id;
    
    // Create a ref for this product card if it doesn't exist
    if (!productRefs.current[product.id]) {
      productRefs.current[product.id] = React.createRef<View>();
    }
    
    // Ensure name is a string
    const productName = product.name ? String(product.name) : "";
    
    // Log right before rendering
    logger.log(`[RENDER FLOW] About to render ProductCard for ${product.id}`);
    if (product.images && product.images.length > 0) {
      logger.log(`[RENDER FLOW] Final image URL check: ${product.images[0].url}`);
    }
    
    return (
      <View 
        key={`product-item-${product.id}-${i}`}
        ref={productRefs.current[product.id]}
        style={{
          margin: ITEM_SPACING / 2,
          marginBottom: ITEM_SPACING,
          position: 'relative', // Position relative for overlay
        }}
      >
        <ProductCard
          id={product.id}
          name={productName}
          price={product.price}
          images={product.images}
          onCardPress={() => handleCardPress(product.id)}
          onCartPress={() => handleAddToCart(product.id)}
          onLikePress={() => handleLike(product.id)}
          onDislikePress={() => handleDislike(product.id)}
          onSharePress={() => handleShare(product.id)}
          isDarkMode={currentIsDarkMode}
          cardWidth={calculatedItemWidth}
          imageAspectRatio={aspectRatio} // Pass the calculated aspect ratio
          cardStyle={{ margin: 0 }}
          // Pass props to control action menu state
          isContentActionActive={isContentActionActive}
          onContentActionExpandChange={(isExpanded) => 
            handleContentActionExpandChange(product.id, isExpanded)}
        />
      </View>
    );
  }, [activeActionCardId, currentIsDarkMode, calculatedItemWidth, getAspectRatioForProduct, handleCardPress, handleAddToCart, handleLike, handleDislike, handleShare, handleContentActionExpandChange]);

  // Render partial data product item for MasonryList
  const renderPartialProductItem = useCallback(({ item, i }: { item: any, i: number }) => {
    const product = item as FormattedPartialProduct;
    const aspectRatio = getAspectRatioForProduct(product, i);
    
    // Check if this card's content action is active
    const isContentActionActive = activePartialActionCardId === product.id;
    
    return (
      <View 
        key={`partial-product-${product.id}-${i}`}
        style={{
        margin: ITEM_SPACING / 2,
        marginBottom: ITEM_SPACING,
        position: 'relative', // Position relative for overlay
      }}>
        <PartialDataProductCard
          id={product.id}
          name={product.name}
          brand={product.brand}
          price={product.price}
          images={product.images}
          productUrl={product.productUrl}
          onCardPress={() => handleCardPress(product.id, false, true)}
          onCartPress={() => handleAddToCart(product.id)}
          onLikePress={() => handleLike(product.id)}
          onDislikePress={() => handleDislike(product.id)}
          onSharePress={() => handleShare(product.id)}
          isDarkMode={currentIsDarkMode}
          cardWidth={calculatedItemWidth}
          imageAspectRatio={aspectRatio} // Pass the calculated aspect ratio
          cardStyle={{ margin: 0 }}
          // Pass props to control action menu state
          isContentActionActive={isContentActionActive}
          onContentActionExpandChange={(isExpanded) => 
            handlePartialContentActionExpandChange(product.id, isExpanded)}
        />
      </View>
    );
  }, [activePartialActionCardId, currentIsDarkMode, calculatedItemWidth, getAspectRatioForProduct, handleCardPress, handleAddToCart, handleLike, handleDislike, handleShare, handlePartialContentActionExpandChange]);

  // Render simple product item for MasonryList
  const renderSimpleProductItem = useCallback(({ item, i }: { item: any, i: number }) => {
    const product = item as FormattedSimpleProduct;
    const aspectRatio = getAspectRatioForProduct(product, i);
    
    // Check if this card's content action is active
    const isContentActionActive = activeSimpleActionCardId === product.id;
    
    return (
      <View 
        key={`simple-product-${product.id}-${i}`}
        style={{
        margin: ITEM_SPACING / 2,
        marginBottom: ITEM_SPACING,
        position: 'relative', // Position relative for overlay
      }}>
        <SimpleProductCard
          id={product.id}
          price={product.price}
          brand={product.brand}
          images={product.images}
          onCardPress={() => handleCardPress(product.id, true)}
          onCartPress={() => handleAddToCart(product.id)}
          onLikePress={() => handleLike(product.id)}
          onDislikePress={() => handleDislike(product.id)}
          onSharePress={() => handleShare(product.id)}
          isDarkMode={currentIsDarkMode}
          cardWidth={calculatedItemWidth}
          imageAspectRatio={aspectRatio} // Pass the calculated aspect ratio
          cardStyle={{ margin: 0 }}
          // Pass props to control action menu state
          isContentActionActive={isContentActionActive}
          onContentActionExpandChange={(isExpanded) => 
            handleSimpleContentActionExpandChange(product.id, isExpanded)}
        />
      </View>
    );
  }, [activeSimpleActionCardId, currentIsDarkMode, calculatedItemWidth, getAspectRatioForProduct, handleCardPress, handleAddToCart, handleLike, handleDislike, handleShare, handleSimpleContentActionExpandChange]);
  
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
                onLike={handleLike}
                onDislike={handleDislike}
                onShare={handleShare}
                onBookmark={handleBookmark}
                isDarkMode={currentIsDarkMode}
                isContentActionActive={isContentActionActive}
                onContentActionExpandChange={(isExpanded) => 
                  handleNewsContentActionExpandChange(article.id, isExpanded)}
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
                  onLike={handleLike}
                  onDislike={handleDislike}
                  onShare={handleShare}
                  onBookmark={handleBookmark}
                  isDarkMode={currentIsDarkMode}
                  isContentActionActive={isContentActionActive}
                  onContentActionExpandChange={(isExpanded) => 
                    handleNewsContentActionExpandChange(article.id, isExpanded)}
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
  }, [isLoadingNews, newsError, newsArticles, displayedNewsCount, activeNewsCardId, accentColor, themeColors.text.secondary, currentIsDarkMode, fetchNews, handleLike, handleDislike, handleShare, handleBookmark, handleNewsContentActionExpandChange]);
  
  // Handle scrolling to dismiss active content action and implement infinite scroll
  const handleScroll = useCallback((event: any) => {
    // Clear active cards on scroll
    if (activeActionCardId) setActiveActionCardId(null);
    if (activeSimpleActionCardId) setActiveSimpleActionCardId(null);
    if (activePartialActionCardId) setActivePartialActionCardId(null);
    if (activeNewsCardId) setActiveNewsCardId(null);
    if (activeOutfitActionCardId) setActiveOutfitActionCardId(null);
    
    // Process regular scroll event
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: false }
    )(event);
  }, [scrollY, activeActionCardId, activeSimpleActionCardId, activePartialActionCardId, activeNewsCardId, activeOutfitActionCardId]);
  
  // Handle loading more items
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !isMountedRef.current) return;
    
    setIsLoadingMore(true);
    
    // First, load more outfit groups if there are more to show
    if (displayedOutfitCount < outfitGroups.length) {
      setDisplayedOutfitCount(prev => Math.min(
        prev + 3, // Load 3 outfits at a time
        outfitGroups.length
      ));
    }
    // Then load news if there are more news articles to show
    else if (displayedNewsCount < newsArticles.length) {
      // Load news first
      setDisplayedNewsCount(prev => Math.min(
        prev + 2, // Load 2 news at a time
        newsArticles.length
      ));
    }
    else if (displayedProductCount < products.length) {
      // All news is loaded, now load full products
      setDisplayedProductCount(prev => Math.min(
        prev + LOAD_MORE_COUNT,
        products.length
      ));
    } 
    else if (displayedPartialProductCount < partialProducts.length) {
      // All full products are loaded, now load partial products
      setDisplayedPartialProductCount(prev => Math.min(
        prev + LOAD_MORE_COUNT,
        partialProducts.length
      ));
    }
    else if (displayedSimpleProductCount < simpleProducts.length) {
      // All news, full and partial products are loaded, finally load simple products
      setDisplayedSimpleProductCount(prev => Math.min(
        prev + LOAD_MORE_COUNT,
        simpleProducts.length
      ));
    }
    
    // Clear loading state after a slight delay to prevent rapid loading
    // Use timer ref to avoid callback accumulation
    if (loadMoreTimerRef.current) {
      clearTimeout(loadMoreTimerRef.current);
    }
    
    loadMoreTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
      loadMoreTimerRef.current = null;
    }, 500);
  }, [isLoadingMore, displayedOutfitCount, outfitGroups.length, displayedNewsCount, newsArticles.length, displayedProductCount, products.length, displayedPartialProductCount, partialProducts.length, displayedSimpleProductCount, simpleProducts.length]);
  
  // Slice the data arrays to only show the currently loaded items
  const visibleProducts = products.slice(0, displayedProductCount);
  const visiblePartialProducts = partialProducts.slice(0, displayedPartialProductCount);
  const visibleSimpleProducts = simpleProducts.slice(0, displayedSimpleProductCount);
  
  // Determine if we should show Fashion News section
  const shouldShowNews = currentFilter === 'all' || currentFilter === 'news';
  
  // Determine if we should show Featured Products section
  // Only show if we're not in news-only filter mode
  const shouldShowFeaturedProducts = currentFilter === 'all' || currentFilter !== 'news';
  
  // Determine if we should show Partial Products section
  // Only show it if we've loaded ALL featured products
  const shouldShowPartialProducts = displayedProductCount >= products.length;
  
  // Determine if we should show Simple Products section
  // Only show it if we've loaded ALL partial products
  const shouldShowSimpleProducts = 
    displayedProductCount >= products.length && 
    displayedPartialProductCount >= partialProducts.length;
  
  // Function to render section header
  const renderSectionHeader = useCallback((title: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
      <Text style={[styles.sectionTitle, { color: themeColors.text.primary }]}>
        {title}
      </Text>
    </View>
  ), [bgColor, themeColors.text.primary]);

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
            onCartPress={(productId) => handleAddToCart(productId)}
            onCardPress={(productId) => handleCardPress(productId)}
            onLikePress={(id) => handleLike(id)}
            onDislikePress={(id) => handleDislike(id)}
            onSharePress={(id) => handleShare(id)}
            onBookmarkPress={(id) => handleBookmark(id)}
            isDarkMode={currentIsDarkMode}
            outfitId={group.id}
            isContentActionActive={activeOutfitActionCardId === group.id}
            onContentActionExpandChange={(isExpanded: boolean) => 
              handleOutfitContentActionExpandChange(group.id, isExpanded)}
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
  }, [outfitGroups, displayedOutfitCount, isLoadingOutfits, themeColors.text.secondary, accentColor, currentIsDarkMode, handleAddToCart, handleCardPress, handleLike, handleDislike, handleShare, handleBookmark, handleOutfitContentActionExpandChange]);

  // Render loading indicator
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }, [isLoadingMore, accentColor]);
  
  // Render featured products list
  const renderFeaturedProducts = useCallback(() => {
    // Only show the number of products that should be displayed
    const visibleProducts = products.slice(0, displayedProductCount);
    
    return (
      <MasonryList
        data={visibleProducts}
        numColumns={NUM_COLUMNS}
        renderItem={renderProductItem}
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
  }, [displayedProductCount, products, renderProductItem, themeColors.text.secondary]);

  // Render partial products list
  const renderPartialProducts = useCallback(() => {
    // Only show the number of partial products that should be displayed
    const visiblePartialProducts = partialProducts.slice(0, displayedPartialProductCount);
    
    return (
      <MasonryList
        data={visiblePartialProducts}
        numColumns={NUM_COLUMNS}
        renderItem={renderPartialProductItem}
        keyExtractor={(item): string => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable scrolling - parent ScrollView handles scrolling
        contentContainerStyle={styles.masonryContentContainer}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
              Loading partner products...
            </Text>
          </View>
        }
      />
    );
  }, [displayedPartialProductCount, partialProducts, renderPartialProductItem, themeColors.text.secondary]);

  // Render simple products list
  const renderSimpleProducts = useCallback(() => {
    // Only show the number of simple products that should be displayed
    const visibleSimpleProducts = simpleProducts.slice(0, displayedSimpleProductCount);
    
    return (
      <MasonryList
        data={visibleSimpleProducts}
        numColumns={NUM_COLUMNS}
        renderItem={renderSimpleProductItem}
        keyExtractor={(item): string => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable scrolling - parent ScrollView handles scrolling
        contentContainerStyle={styles.masonryContentContainer}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={[styles.emptyText, { color: themeColors.text.secondary }]}>
              Loading suggestions...
            </Text>
          </View>
        }
      />
    );
  }, [displayedSimpleProductCount, simpleProducts, renderSimpleProductItem, themeColors.text.secondary]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={currentIsDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header with app title */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            height: headerHeightRef.current,
            opacity: headerOpacityRef.current,
            backgroundColor: bgColor // Ensure header background matches
          }
        ]}
      >
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>DripOut</Text>
      </Animated.View>
      
      {/* Filter tabs */}
      <View style={[styles.filterContainer, { borderBottomColor: themeColors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_OPTIONS.map(renderFilterItem)}
        </ScrollView>
      </View>
      
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
              // Format API products as FormattedProduct, skipping any without images
              const formattedProducts: FormattedProduct[] = apiProducts.slice(0, 10).reduce<FormattedProduct[]>((acc, product: ExtendedProduct) => {
                const imgs = formatImages(product.images, product.id);
                if (!imgs) return acc;
                acc.push({
                  id: product.id || `product-${Math.random().toString(36).substring(2, 9)}`,
                  title: product.name || 'Unnamed Product',
                  name: product.name || 'Unnamed Product',
                  price: typeof product.price === 'number' ? product.price : 0,
                  images: imgs,
                  brand: product.brand || 'Unknown Brand',
                  description: `${product.brand || 'Unknown Brand'}: ${product.name || 'Unnamed Product'} - ${product.currency || '$'}${typeof product.price === 'number' ? product.price : 0}`,
                  productUrl: product.productUrl || '',
                });
                return acc;
              }, []);
              // Format API products as FormattedPartialProduct, skipping any without images
              const formattedPartialProducts: FormattedPartialProduct[] = apiProducts.slice(10, 20).reduce<FormattedPartialProduct[]>((acc, product: ExtendedProduct) => {
                const imgs = formatImages(product.images, product.id);
                if (!imgs) return acc;
                acc.push({
                  id: product.id || `partial-${Math.random().toString(36).substring(2, 9)}`,
                  title: product.name || 'Unnamed Product',
                  name: product.name || 'Unnamed Product',
                  brand: product.brand || 'Unknown Brand',
                  price: typeof product.price === 'number' ? product.price : 0,
                  images: imgs,
                  productUrl: product.productUrl || `https://example.com/product/${product.id || 'unknown'}`
                });
                return acc;
              }, []);
              // Format API products as FormattedSimpleProduct, skipping any without images
              const formattedSimpleProducts: FormattedSimpleProduct[] = apiProducts.slice(20).reduce<FormattedSimpleProduct[]>((acc, product: ExtendedProduct) => {
                const imgs = formatImages(product.images, product.id);
                if (!imgs) return acc;
                acc.push({
                  id: product.id || `simple-${Math.random().toString(36).substring(2, 9)}`,
                  title: product.name || 'Unnamed Product',
                  price: typeof product.price === 'number' ? product.price : 0,
                  brand: product.brand || 'Unknown Brand',
                  images: imgs
                });
                return acc;
              }, []);
              // Generate outfit groups
              const generatedOutfitGroups = generateOutfitGroups(formattedProducts, formattedPartialProducts);
              setProducts(formattedProducts);
              setPartialProducts(formattedPartialProducts);
              setSimpleProducts(formattedSimpleProducts);
              setOutfitGroups(generatedOutfitGroups);
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
        {/* Outfit Groups */}
        {renderSectionHeader('Outfit Collections')}
        {renderOutfitGroups()}
        
        {/* News Section */}
        {shouldShowNews && (
          <>
            {renderSectionHeader('Fashion News')}
            {renderNewsItems()}
          </>
        )}
        
        {/* Featured Products */}
        {shouldShowFeaturedProducts && (
          <>
            {renderSectionHeader('Featured Products')}
            {renderFeaturedProducts()}
            {isLoadingMore && displayedProductCount < products.length && (
              <ActivityIndicator style={styles.loadingIndicator} />
            )}
          </>
        )}
        
        {/* Partial Products */}
        {shouldShowPartialProducts && currentFilter !== 'news' && (
          <>
            {renderSectionHeader('Partner Products')}
            {renderPartialProducts()}
            {displayedPartialProductCount < partialProducts.length && (
              <ActivityIndicator style={styles.loadingIndicator} />
            )}
          </>
        )}
        
        {/* Simple Products */}
        {shouldShowSimpleProducts && currentFilter !== 'news' && (
          <>
            {renderSectionHeader('You Might Also Like')}
            {renderSimpleProducts()}
            {displayedSimpleProductCount < simpleProducts.length && (
              <ActivityIndicator style={styles.loadingIndicator} />
            )}
          </>
        )}
        
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
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
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