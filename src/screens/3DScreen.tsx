import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  Animated,
  View,
  StyleSheet,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  FlatList,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  ToastAndroid,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { 
  hasUserModel, 
  getUserModelUrl, 
  createUserModel, 
  tryOnProduct, 
  getRandomProducts,
  scrapeProductFromUrl,
  userTryOn,
  Product 
} from "../services/recommendationService";
import { takePhotoWithCamera, selectImageFromLibrary, ImageAsset } from "../services/imagePickerService";
import { uploadImageAndGetURL } from "../services/storageService";
import { db, auth } from "../Config/firebaseconfig";
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ThreeDBox from "../components/3DComponents/ThreeDBox"; 
import { useTheme } from "../styles/themeprovider";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { RootStackParamList, MainTabParamList } from "../types/NavigationTypes";
import { useShelf } from '../contexts/ShelfContext';
import ShelfIcon from '../components/common/ShelfIcon';

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get('window');

type ThreeDScreenRouteProp = RouteProp<MainTabParamList, '3DTab'>;

const ThreeDScreen: React.FC = () => {
  const scrollY = useRef(new Animated.Value(0)).current; // Track scrolling
  const navigation = useNavigation();
  const route = useRoute<ThreeDScreenRouteProp>();
  const { isDarkMode } = useTheme();
  
  // State variables for 3D model functionality
  const [hasModel, setHasModel] = useState<boolean>(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState<boolean>(true);
  const [selectedImages, setSelectedImages] = useState<ImageAsset[]>([]);
  const [showImageOptions, setShowImageOptions] = useState<boolean>(false);
  const [creatingModel, setCreatingModel] = useState<boolean>(false);
  const [modelProgress, setModelProgress] = useState<number>(0);
  
  // Try-on related states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryingOn, setTryingOn] = useState<boolean>(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnProgress, setTryOnProgress] = useState<number>(0);
  const [showTryOnModal, setShowTryOnModal] = useState<boolean>(false);
  
  // Try-on bucket states
  const [tryOnBucket, setTryOnBucket] = useState<Product[]>([]);
  const [showTryOnBucket, setShowTryOnBucket] = useState<boolean>(true);
  
  // Products related states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Tab system for products section
  const [activeTab, setActiveTab] = useState<'recommended' | 'shelf'>('recommended');
  
  // Shelf context
  const { products: shelfProducts, loading: shelfLoading, refreshShelf } = useShelf();
  
  // Product details modal states
  const [showProductDetails, setShowProductDetails] = useState<boolean>(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  
  // Custom product URL states
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [productUrls, setProductUrls] = useState<string[]>(['']);
  const [scrapingProduct, setScrapingProduct] = useState<boolean>(false);
  const [scrapeProgress, setScrapeProgress] = useState<number>(0);
  
  // Colors based on theme - Updated to match app branding
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const mainColor = isDarkMode ? '#FF6B6B' : '#EF3D47'; // App brand red
  const accentColor = isDarkMode ? '#FF375F' : '#FF3B5C'; // App accent pink/red
  const successColor = isDarkMode ? '#32D74B' : '#34C759'; // iOS green
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF'; // iOS card background
  const modalBgColor = isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)';
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7'; // iOS system background
  
  // Flag to track if we're currently trying to load products
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  
  // Load products from API or cache
  const loadProducts = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent multiple simultaneous loading attempts
    if (productsLoading) {
      console.log('🛑 Product loading already in progress, skipping request');
      return;
    }
    
    setProductsLoading(true);
    
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoadingProducts(true);
    }
    
    try {
      console.log('🔄 Starting product load, forceRefresh:', forceRefresh);
      const randomProducts = await getRandomProducts(forceRefresh);
      
      if (randomProducts && randomProducts.length > 0) {
        console.log(`✅ Successfully loaded ${randomProducts.length} products`);
        setProducts(randomProducts);
      } else {
        console.log('⚠️ No products found or empty response');
        
        // If we didn't get products and forceRefresh is true, 
        // display an error message to the user
        if (forceRefresh) {
          Alert.alert(
            'No Products Found',
            'Could not retrieve product data. Please check your connection and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      
      // Only show the error alert on user-initiated refreshes
      // to avoid repeated alert dialogs
      if (forceRefresh) {
        Alert.alert(
          'Network Error',
          'Failed to load products. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoadingProducts(false);
      setRefreshing(false);
      setProductsLoading(false);
    }
  }, []);
  
  // Handle preloaded outfit from route parameters
  useEffect(() => {
    const preloadedOutfit = route.params?.preloadedOutfit;
    
    if (preloadedOutfit && preloadedOutfit.products && preloadedOutfit.products.length > 0) {
      console.log('🎯 Processing preloaded outfit:', preloadedOutfit.name);
      
      // Convert outfit products to the Product format expected by the try-on system
      const convertedProducts: Product[] = preloadedOutfit.products.map((product: any, index: number) => ({
        id: product.id || `preloaded_${index}`,
        name: product.name || 'Unknown Item',
        brand: product.brand || 'Unknown Brand',
        price: product.price || 0,
        currency: 'USD',
        images: product.images || [],
        url: product.url || product.affiliateLink || '',
        description: product.description || '',
        color: product.color || '',
        size: product.size || '',
        availability: product.availability || 'in_stock'
      }));
      
      // Add all converted products to the try-on bucket
      setTryOnBucket(convertedProducts);
      
      // Show a toast/alert to let the user know the outfit was loaded
      const message = `"${preloadedOutfit.name}" outfit loaded with ${convertedProducts.length} item(s)`;
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.LONG);
      } else {
        // For iOS, we could show a temporary alert or use a custom toast
        setTimeout(() => {
          Alert.alert('Outfit Loaded', message, [{ text: 'OK' }]);
        }, 500); // Slight delay to let the screen load first
      }
      
      console.log(`✅ Added ${convertedProducts.length} products to try-on bucket`);
    }
  }, [route.params]);
  
  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    loadProducts(true);
  }, [loadProducts]);
  
  // Monitor URL modal state for debugging
  useEffect(() => {
    console.log('URL modal visibility changed:', showUrlModal);
    
    // Reset URL input when modal is closed
    if (!showUrlModal) {
      setProductUrls(['']);
      setScrapingProduct(false);
      setScrapeProgress(0);
    }
  }, [showUrlModal]);
  
  // Cache keys will be generated per user to prevent cross-account contamination
  
  // Check if user has an avatar image saved in Firebase/local cache
  useEffect(() => {
    let isMounted = true; // Used to prevent state updates if component unmounts
    
    const initializeScreen = async () => {
      if (!isMounted) return;
      setLoadingModel(true);
      
      try {
        const currentUser = auth().currentUser;
        if (!currentUser) {
          console.log('No authenticated user found');
          if (isMounted) setLoadingModel(false);
          return;
        }
        
        // Generate user-specific cache keys to prevent cross-account issues
        const USER_AVATAR_CACHE_KEY = `user_avatar_image_url_${currentUser.uid}`;
        const USER_AVATAR_TIMESTAMP_KEY = `user_avatar_image_timestamp_${currentUser.uid}`;
        
        console.log(`🔑 Using user-specific cache keys for user: ${currentUser.uid}`);
        
        let avatarFound = false;
        
        // Check for cached avatar image URL first (fastest retrieval)
        const cachedAvatarUrl = await AsyncStorage.getItem(USER_AVATAR_CACHE_KEY);
        const cachedTimestamp = await AsyncStorage.getItem(USER_AVATAR_TIMESTAMP_KEY);
        
        if (cachedAvatarUrl && cachedTimestamp) {
          console.log('Found cached avatar image');
          
          // Verify the cached image is still accessible
          try {
            // Set avatar data from cache immediately
            if (isMounted) {
              setHasModel(true);
              setModelUrl(cachedAvatarUrl);
              avatarFound = true;
            }
            console.log('✅ Successfully set cached avatar URL');
          } catch (imageError) {
            console.warn('⚠️ Cached avatar URL is invalid, will look for avatar in Firebase');
            // Continue to check Firebase directly
            if (isMounted) {
              setHasModel(false);
              setModelUrl(null);
            }
          }
        } else {
          console.log('No cached avatar URL found');
        }
        
        // If we haven't set a valid avatar yet, query Firebase Storage directly
        if (!avatarFound && isMounted) {
          console.log('Checking Firebase Storage for user avatar');
          
          try {
            // Check if user has avatar in Firebase (format matches our saving pattern)
            const storageRef = storage().ref(`avatars/${currentUser.uid}`);
            const result = await storageRef.list({ maxResults: 1 });
            
            if (result.items.length > 0) {
              console.log('Found avatar in Firebase Storage');
              
              // Get download URL for the most recent avatar
              const avatarUrl = await result.items[0].getDownloadURL();
              
              // Save to cache for future use
              await AsyncStorage.setItem(USER_AVATAR_CACHE_KEY, avatarUrl);
              await AsyncStorage.setItem(USER_AVATAR_TIMESTAMP_KEY, Date.now().toString());
              
              if (isMounted) {
                setHasModel(true);
                setModelUrl(avatarUrl);
              }
              console.log('✅ Successfully retrieved avatar from Firebase Storage');
            } else {
              console.log('No avatar found in Firebase Storage');
              if (isMounted) {
                setHasModel(false);
                setModelUrl(null);
              }
            }
          } catch (storageError) {
            console.error('Error checking Firebase Storage:', storageError);
            if (isMounted) {
              setHasModel(false);
              setModelUrl(null);
            }
          }
        }
        
        // Load products regardless of avatar status
        if (isMounted) {
          loadProducts(false);
        }
      } catch (error) {
        console.error('Error initializing screen:', error);
        if (isMounted) {
          setHasModel(false);
          setModelUrl(null);
        }
      } finally {
        if (isMounted) {
          setLoadingModel(false);
        }
      }
    };
    
    initializeScreen();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [loadProducts]); // Remove hasModel from dependencies to prevent infinite loop
  
  // Handle taking a photo
  const handleTakePhoto = async () => {
    // First close the modal to prevent UI issues
    setShowImageOptions(false);
    
    // Wait a moment for modal animation to complete 
    setTimeout(async () => {
      try {
        console.log('Attempting to take photo with camera');
        // Use our image picker service with improved settings
        const result = await takePhotoWithCamera({
          maxHeight: 2400,
          maxWidth: 2400,
          quality: 0.95,
          includeBase64: false,
          saveToPhotos: false
        });
        
        if (result) {
          console.log('Photo captured successfully');
          setSelectedImages([...selectedImages, result]);
        }
      } catch (error) {
        console.error('Camera error:', error);
        Alert.alert(
          'Camera Error', 
          `Failed to take photo: ${error.message || 'Unknown error'}. Please try again.`
        );
      }
    }, 300);
  };
  
  // Handle selecting from gallery
  const handleSelectFromGallery = async () => {
    // First close the modal to prevent UI issues
    setShowImageOptions(false);
    
    // Wait a moment for modal animation to complete
    setTimeout(async () => {
      try {
        console.log('Attempting to select image from library');
        // Use our image picker service with improved settings
        const result = await selectImageFromLibrary({
          maxHeight: 2400,
          maxWidth: 2400,
          quality: 0.95,
          selectionLimit: 1,
          includeBase64: false
        });
        
        if (result) {
          console.log('Image selected successfully');
          setSelectedImages([...selectedImages, result]);
        }
      } catch (error) {
        console.error('Gallery error:', error);
        Alert.alert(
          'Gallery Error', 
          `Failed to select image: ${error.message || 'Unknown error'}. Please try again.`
        );
      }
    }, 300);
  };
  
  // Create and save avatar image to Firebase and local cache
  const handleCreateModel = async (isUpdate = false) => {
    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one image first.');
      return;
    }
    
    try {
      setCreatingModel(true);
      setModelProgress(0);
      
      // Check if user is authenticated
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Generate user-specific cache keys
      const USER_AVATAR_CACHE_KEY = `user_avatar_image_url_${currentUser.uid}`;
      const USER_AVATAR_TIMESTAMP_KEY = `user_avatar_image_timestamp_${currentUser.uid}`;
      
      // Upload image to Firebase Storage
      console.log(`📤 ${isUpdate ? 'Updating' : 'Creating'} avatar image in Firebase Storage`);
      
      // Since we're only using one image for the avatar, take the first one
      const mainImage = selectedImages[0];
      
      // Create a timestamp for consistent naming
      const timestamp = Date.now();
      
      // Create a user-specific path that matches our lookup pattern
      const avatarFilename = `avatar_${timestamp}.jpg`;
      const avatarFolder = `avatars/${currentUser.uid}`;
      
      // Upload the image to Firebase Storage
      const uploadedImageUrl = await uploadImageAndGetURL(
        mainImage.uri,
        avatarFolder,
        avatarFilename,
        (progress) => {
          // Update progress state - we're showing this as 80% of the total process
          setModelProgress(progress * 0.8);
        }
      );
      
      console.log('✅ Avatar image uploaded successfully:', uploadedImageUrl);
      
      // Save the URL to user-specific cache (AsyncStorage)
      await AsyncStorage.setItem(USER_AVATAR_CACHE_KEY, uploadedImageUrl);
      await AsyncStorage.setItem(USER_AVATAR_TIMESTAMP_KEY, timestamp.toString());
      
      console.log('✅ Avatar URL cached locally for faster loading');
      
      // Complete the remaining 20% of the progress
      setModelProgress(0.9);
      
      // Update state when complete
      setModelUrl(uploadedImageUrl);
      setHasModel(true);
      setSelectedImages([]);
      setModelProgress(1.0);
      
      Alert.alert('Success', `Your avatar has been ${isUpdate ? 'updated' : 'created'} and saved successfully!`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${isUpdate ? 'update' : 'create'} and save your avatar. Please try again.`);
      console.error(`Error ${isUpdate ? 'updating' : 'creating'} avatar:`, error);
    } finally {
      setCreatingModel(false);
    }
  };
  
  // Handle updating the avatar
  const handleUpdateAvatar = () => {
    // Reset selected images
    setSelectedImages([]);
    
    // Show the image options modal
    setShowImageOptions(true);
  };
  
  // Enhanced fitting room states with better performance  
  const translateY = useRef(new Animated.Value(400)).current; // Start hidden (use dynamic height)
  const opacity = useRef(new Animated.Value(0)).current;
  const [panelState, setPanelState] = useState<'hidden' | 'peek' | 'expanded'>('hidden');
  
  // Panel heights for different states
  const PANEL_HEIGHTS = {
    hidden: 0,
    peek: 120,
    expanded: Math.min(420, Dimensions.get('window').height * 0.65)
  };

  // Add a product to the try-on bucket
  const handleAddToTryOnBucket = (product: Product) => {
    if (!hasModel || !modelUrl) {
      Alert.alert('Error', 'Please create your avatar first.');
      return;
    }
    
    // Check if product is already in bucket
    const isProductInBucket = tryOnBucket.some(item => item.id === product.id);
    
    if (isProductInBucket) {
      // Show message that product is already in bucket
      if (Platform.OS === 'android') {
        ToastAndroid.show('This item is already in your fitting room', ToastAndroid.SHORT);
      } else {
        Alert.alert('Already Added', 'This item is already in your fitting room.');
      }
      return;
    }
    
    // Prepare product for the bucket (ensuring required fields are present)
    const preparedProduct: Product = {
      id: product.id || `product_${Date.now()}`,
      name: product.name || 'Unnamed Product',
      brand: product.brand || '',
      color: product.color || '',
      images: product.images || [product.url || ''],
      price: product.price || '',
      url: product.url || ''
    };
    
    // Add to bucket
    setTryOnBucket(prevBucket => [...prevBucket, preparedProduct]);
    
    // Show message that product was added
    if (Platform.OS === 'android') {
      ToastAndroid.show('Added to fitting room', ToastAndroid.SHORT);
    } else {
      // For iOS we'll use the visual indicator on the bucket icon
      // We'll just console log for now
      console.log('Added to fitting room:', preparedProduct.name);
    }
  };
  
  // Remove a product from the try-on bucket
  const handleRemoveFromBucket = (productId: string) => {
    setTryOnBucket(prevBucket => {
      const newBucket = prevBucket.filter(item => item.id !== productId);
      
      // Hide panel if no items left
      if (newBucket.length === 0) {
        setTimeout(() => animateToState('hidden'), 300);
      }
      
      return newBucket;
    });
  };
  
  // Clear the entire try-on bucket
  const handleClearBucket = () => {
    Alert.alert(
      'Clear Fitting Room',
      'Are you sure you want to remove all items from your fitting room?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setTryOnBucket([]);
            animateToState('hidden');
          }
        }
      ]
    );
  };
  
  // Try on products using the new API endpoint
  const handleTryOn = async () => {
    if (!hasModel || !modelUrl) {
      Alert.alert('Error', 'Please create your avatar first.');
      return;
    }
    
    if (tryOnBucket.length === 0) {
      Alert.alert('Empty Fitting Room', 'Please add at least one item to your fitting room first.');
      return;
    }
    
    try {
      setTryingOn(true);
      setTryOnProgress(0);
      setShowTryOnModal(true);
      
      // Get the current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Call the new user try-on API with our avatar image
      console.log('📲 Calling user try-on API with avatar and', tryOnBucket.length, 'products');
      
      const resultUrl = await userTryOn(
        [modelUrl], // Pass our avatar image URL in an array
        tryOnBucket, // Pass all products in the bucket
        undefined, // Let the API fetch the user profile
        (progress) => {
          // Update progress state
          setTryOnProgress(progress);
        }
      );
      
      console.log('✅ Try-on image generated successfully');
      
      // Update state when complete
      setTryOnImage(resultUrl);
      
      // After successful try-on, we can clear the bucket if desired
      // Uncomment the following line if you want to clear the bucket after try-on
      // setTryOnBucket([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        error.message : 
        'Failed to generate try-on image. Please try again.';
      
      Alert.alert('Error', errorMessage);
      console.error('Error trying on product:', error);
      setShowTryOnModal(false);
    } finally {
      setTryingOn(false);
    }
  };
  
  // Handle opening product details modal
  const handleShowProductDetails = (product: Product) => {
    setSelectedProductForDetails(product);
    setCurrentImageIndex(0); // Reset to first image
    setShowProductDetails(true);
  };

  // Handle closing product details modal
  const handleCloseProductDetails = () => {
    setShowProductDetails(false);
    setSelectedProductForDetails(null);
    setCurrentImageIndex(0);
  };

  // Extract store name from URL
  const getStoreName = (url: string): string | null => {
    try {
      const domain = new URL(url).hostname;
      // Remove 'www.' and get the main domain
      const cleanDomain = domain.replace(/^www\./, '');
      // Extract the store name (e.g., "nike.com" -> "Nike")
      const storeName = cleanDomain.split('.')[0];
      return storeName.charAt(0).toUpperCase() + storeName.slice(1);
    } catch {
      return null;
    }
  };

  // Handle opening website URL
  const handleOpenWebsite = async (url: string) => {
    try {
      console.log('🌐 Attempting to open website:', url);
      
      // Check if the URL can be opened
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        console.log('✅ Successfully opened website');
        
        // Close the modal after opening the website
        handleCloseProductDetails();
      } else {
        console.warn('⚠️ Cannot open URL:', url);
        Alert.alert(
          'Unable to Open Website',
          'Sorry, we could not open this website. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error opening website:', error);
      Alert.alert(
        'Error Opening Website',
        'An error occurred while trying to open the website. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Save try-on outfit to user's collection
  const handleSaveLook = async () => {
    // Get the current user
    const currentUser = auth().currentUser;
    
    if (!tryOnImage || !currentUser) {
      Alert.alert('Error', 'No outfit to save or user not logged in');
      return;
    }
    
    try {
      console.log('Starting to save outfit...');
      // Create an outfit name with date
      const date = new Date();
      const outfitName = `Outfit ${date.toLocaleDateString()}`;
      
      // Create a document in the saved_outfits collection
      console.log('Creating document with data:', {
        userId: currentUser.uid,
        name: outfitName,
        // Store only a snippet of the image URL for logging
        imageUrl: tryOnImage ? tryOnImage.substring(0, 50) + '...' : null,
        products: tryOnBucket.length,
      });
      
      await db.collection("saved_outfits").add({
        userId: currentUser.uid,
        name: outfitName,
        imageUrl: tryOnImage,
        products: tryOnBucket,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Outfit saved successfully!');
      Alert.alert('Success', 'This outfit has been saved to your closet!');
      setShowTryOnModal(false);
      
      // Optionally, clear the try-on bucket after saving
      // setTryOnBucket([]);
    } catch (error) {
      console.error('Error saving outfit:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      Alert.alert('Error', 'Failed to save the outfit. Please try again.');
    }
  };
  
  // Handle scraping multiple products from URLs
  const handleScrapeProduct = async () => {
    console.log('handleScrapeProduct called with URLs:', productUrls);
    
    // Filter out empty URLs
    const validUrls = productUrls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      Alert.alert('Error', 'Please enter at least one product URL');
      return;
    }
    
    if (!hasModel || !modelUrl) {
      Alert.alert('Error', 'Please create your avatar first.');
      setShowUrlModal(false);
      return;
    }
    
    try {
      console.log('Starting product scraping for', validUrls.length, 'URLs');
      setScrapingProduct(true);
      setScrapeProgress(0);
      
      // Array to store scraped products
      const scrapedProducts: Product[] = [];
      
      try {
        // Process all URLs in a single API call
        console.log(`Scraping ${validUrls.length} URLs in a batch`);
        
        // Call the enhanced scrapeProductFromUrl with an array of URLs
        const scrapedProductsResult = await scrapeProductFromUrl(
          validUrls,
          (progress) => {
            console.log('Scrape progress:', progress);
            setScrapeProgress(progress);
          }
        ) as Product[];
        
        if (scrapedProductsResult && scrapedProductsResult.length > 0) {
          console.log(`Successfully scraped ${scrapedProductsResult.length} products`);
          scrapedProducts.push(...scrapedProductsResult);
        }
      } catch (error) {
        // Handle errors from the batch scraping operation
        console.error(`Error scraping URLs:`, error);
        Alert.alert(
          'Error with URLs',
          `Could not process one or more URLs: ${error instanceof Error ? error.message : 'Unknown error'}.`,
          [{ text: 'OK' }]
        );
      }
      
      // Close the modal and reset states
      setShowUrlModal(false);
      setProductUrls(['']);
      setScrapeProgress(0);
      
      if (scrapedProducts.length > 0) {
        // Wait a moment to ensure the modal is closed before adding products to bucket
        setTimeout(() => {
          console.log('Adding', scrapedProducts.length, 'scraped products to bucket');
          
          // Add each product to the bucket
          scrapedProducts.forEach(product => {
            handleAddToTryOnBucket(product);
          });
          
          // Show success message with instructions
          if (scrapedProducts.length === 1) {
            Alert.alert(
              'Product Added', 
              'Product added to your fitting room. You can now select other products to try on together, or tap "Try On All Items" when ready.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Products Added', 
              `${scrapedProducts.length} products added to your fitting room. You can now select other products to try on together, or tap "Try On All Items" when ready.`,
              [{ text: 'OK' }]
            );
          }
        }, 300);
      } else {
        Alert.alert('No Products Found', 'Could not find any valid products from the provided URLs.');
      }
    } catch (error) {
      console.error('Error in scrape product process:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to scrape products. Please try again with different URLs.');
    } finally {
      setScrapingProduct(false);
    }
  };

  // Enhanced panel animations with better performance
  const animateToState = useCallback((newState: 'hidden' | 'peek' | 'expanded') => {
    const targetHeight = PANEL_HEIGHTS[newState];
    const targetOpacity = newState === 'hidden' ? 0 : 1;
    const targetTranslateY = newState === 'hidden' ? PANEL_HEIGHTS.expanded : 0;

    setPanelState(newState);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: targetTranslateY,
        useNativeDriver: true,
        tension: 150,
        friction: 12,
      }),
      Animated.timing(opacity, {
        toValue: targetOpacity,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity, PANEL_HEIGHTS]);


  const showFittingRoom = useCallback(() => {
    animateToState('peek');
  }, [animateToState]);

  const toggleFittingRoom = useCallback(() => {
    if (panelState === 'hidden') {
      animateToState('peek');
    } else if (panelState === 'peek') {
      animateToState('expanded');
    } else {
      animateToState('peek');
    }
  }, [panelState, animateToState]);

  // Effect to show fitting room when items are added
  useEffect(() => {
    if (tryOnBucket.length > 0 && panelState === 'hidden') {
      console.log('🎯 Showing fitting room for', tryOnBucket.length, 'items');
      animateToState('peek');
    } else if (tryOnBucket.length === 0 && panelState !== 'hidden') {
      console.log('🙈 Hiding fitting room - no items');
      animateToState('hidden');
    }
  }, [tryOnBucket.length, panelState, animateToState]);

  // Convert shelf products to 3D screen format
  const convertShelfToProduct = (shelfProduct: any): Product => {
    return {
      id: shelfProduct.id,
      name: shelfProduct.name,
      brand: shelfProduct.brand,
      price: shelfProduct.price,
      currency: shelfProduct.currency || '$',
      images: shelfProduct.images?.map((img: any) => img.url) || [],
      url: shelfProduct.productUrl || '',
      type: 'clothing', // Default type
      category: 'general', // Default category
      description: `${shelfProduct.brand || ''} ${shelfProduct.name || ''}`.trim(),
    };
  };

  // Get current products based on active tab
  const getCurrentProducts = () => {
    if (activeTab === 'shelf') {
      return shelfProducts.map(convertShelfToProduct);
    }
    return products;
  };

  // Category filtering for current tab products
  const filteredProducts = selectedCategory === 'All'
    ? getCurrentProducts()
    : getCurrentProducts().filter(product => 
        // Filter by category - try to match by type, category, or keywords in name or description
        product.type === selectedCategory || 
        (product.category && product.category === selectedCategory) ||
        (product.name && product.name.toLowerCase().includes(selectedCategory.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(selectedCategory.toLowerCase()))
      );

  // Format price for display
  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return '';
    
    // If price is already a string with currency symbol, return it
    if (typeof price === 'string' && (price.startsWith('$') || price.startsWith('£') || price.startsWith('€'))) {
      return price;
    }
    
    // Convert to number if string without currency symbol
    let numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Format with $ symbol and 2 decimal places
    return `$${numPrice.toFixed(2)}`;
  };
  
  // Render product item for the horizontal list
  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUrl = item.images && item.images.length > 0 
      ? item.images[0] 
      : item.url || 'https://via.placeholder.com/150';
    
    // Check if this product is already in the try-on bucket
    const isInBucket = tryOnBucket.some(product => product.id === item.id);
      
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          { backgroundColor: cardBgColor },
          isInBucket && styles.productCardSelected
        ]}
        onPress={() => handleAddToTryOnBucket(item)}
        disabled={!hasModel}
      >
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.productImage}
            resizeMode="cover"
          />
          {!hasModel && (
            <View style={styles.disabledOverlay}>
              <Icon name="lock-closed" size={20} color="#FFFFFF" />
            </View>
          )}
          {isInBucket && (
            <View style={styles.inBucketIndicator}>
              <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View style={styles.productDetails}>
          <Text numberOfLines={1} style={[styles.productName, { color: textColor }]}>
            {item.name || 'Unnamed Product'}
          </Text>
          <Text numberOfLines={1} style={[styles.productBrand, { color: subTextColor }]}>
            {item.brand || 'Unknown Brand'}
          </Text>
          <View style={styles.productFooter}>
            <Text style={[styles.productPrice, { color: accentColor }]}>
              {formatPrice(item.price)}
            </Text>
            {isInBucket && (
              <View style={[styles.addedIndicator, { backgroundColor: successColor }]}>
                <Icon name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Get safe area insets for proper positioning
  const insets = useSafeAreaInsets();
  
  // Render an item in the try-on bucket
  const renderBucketItem = ({ item }: { item: Product }) => {
    const imageUrl = item.images && item.images.length > 0 
      ? item.images[0] 
      : item.url || 'https://via.placeholder.com/150';
    
    // Check if this is a scraped URL product (typically has a full URL)
    const isScrapedProduct = item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'));
    
    return (
      <View style={styles.bucketItem}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.bucketItemImage}
          resizeMode="cover"
        />
        {isScrapedProduct && (
          <View style={[styles.scrapedIndicator, { backgroundColor: accentColor }]}>
            <Icon name="link" size={10} color="#FFFFFF" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.bucketItemRemove}
          onPress={() => handleRemoveFromBucket(item.id || '')}
        >
          <Icon name="close-circle" size={18} color={accentColor} />
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bgColor },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Try On a Fit</Text>
        <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
          See Yourself in Style
        </Text>
        <Text style={[styles.experimentalWarning, { color: subTextColor }]}>
          Feature in development - results may be inconsistent
        </Text>
      </View>

      <Animated.ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={mainColor}
            colors={[mainColor, accentColor]}
          />
        }
      >
        {/* 3D Model Container */}
        <View style={[
          styles.threeDContainer,
          { 
            backgroundColor: cardBgColor,
            shadowColor: isDarkMode ? 'rgba(255, 107, 107, 0.3)' : 'rgba(0,0,0,0.1)'
          }
        ]}>
          {loadingModel ? (
            // Loading state
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={mainColor} />
              <Text style={[styles.loadingText, { color: textColor }]}>
                Checking for existing models...
              </Text>
            </View>
          ) : hasModel && modelUrl ? (
            // User HAS a model
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Your Avatar</Text>
              {selectedImages.length === 0 ? (
                  // ===> No new images selected, show current avatar
                  <View style={styles.avatarImageContainer}>
                    <TouchableOpacity
                      activeOpacity={0.95}
                      onPress={handleUpdateAvatar}
                    >
                      <Image
                        source={{ uri: modelUrl }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                      {/* Professional overlay with camera icon */}
                      <View style={styles.avatarUpdateOverlay}>
                        <View style={styles.avatarUpdateIconContainer}>
                          <Icon name="camera" size={20} color="#FFFFFF" />
                        </View>
                        <Text style={styles.avatarUpdateText}>Update Photo</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
              ) : (
                  // ===> New images ARE selected, show them and the Update button
                  <View style={styles.createModelContainer}>
                    <Text style={[styles.createModelTitle, { color: textColor }]}>
                      Ready to update with this photo?
                    </Text>
                    {/* Display selected images (copied from create flow) */}
                    <View style={styles.selectedImagesContainer}>
                      {selectedImages.map((image, index) => (
                        <View key={index} style={styles.selectedImageWrapper}>
                          <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => {
                              const newImages = [...selectedImages];
                              newImages.splice(index, 1);
                              setSelectedImages(newImages); // Allow removing the newly selected image
                            }}
                          >
                            <Icon name="close-circle" size={24} color={accentColor} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {/* Optionally allow adding more up to a limit if needed */}
                      {/* {selectedImages.length < 3 && (
                        <TouchableOpacity
                          style={[styles.addMoreButton, { borderColor: mainColor }]}
                          onPress={() => setShowImageOptions(true)}
                        >
                          <Icon name="add" size={30} color={mainColor} />
                        </TouchableOpacity>
                      )} */}
                    </View>

                    {/* Display Update button (copied from create flow, but action is fixed to update) */}
                    <TouchableOpacity
                      style={[styles.createButton, { backgroundColor: mainColor }]}
                      onPress={() => handleCreateModel(true)} // Pass true for isUpdate
                      disabled={creatingModel}
                    >
                      {creatingModel ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.buttonText}>
                            {modelProgress < 0.5 ? 'Uploading...' : 'Processing...'}
                            {` (${Math.round(modelProgress * 100)}%)`}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.buttonText}>Update My Avatar</Text> // Fixed text
                      )}
                    </TouchableOpacity>
                  </View>
              )}
            </>
          ) : (
            // User needs to CREATE a model
            <View style={styles.createModelContainer}>
              <Text style={[styles.createModelTitle, { color: textColor }]}>
                We need a picture of you to create your avatar!
              </Text>
              
              {selectedImages.length > 0 ? (
                // Show selected images and create button
                <>
                  <View style={styles.selectedImagesContainer}>
                    {selectedImages.map((image, index) => (
                      <View key={index} style={styles.selectedImageWrapper}>
                        <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => {
                            const newImages = [...selectedImages];
                            newImages.splice(index, 1);
                            setSelectedImages(newImages);
                          }}
                        >
                          <Icon name="close-circle" size={24} color={accentColor} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedImages.length < 3 && (
                      <TouchableOpacity 
                        style={[styles.addMoreButton, { borderColor: mainColor }]}
                        onPress={() => {
                          console.log('Opening image options modal from Add More button');
                          setShowImageOptions(true);
                        }}
                      >
                        <Icon name="add" size={30} color={mainColor} />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: mainColor }]}
                    onPress={() => handleCreateModel(hasModel)}
                    disabled={creatingModel}
                  >
                    {creatingModel ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.buttonText}>
                          {modelProgress < 0.5 ? 'Uploading...' : 'Processing...'}
                          {` (${Math.round(modelProgress * 100)}%)`}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.buttonText}>{hasModel ? 'Update My Avatar' : 'Create My Avatar'}</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                // Single button to get started
                <View style={styles.imageButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.getStartedButton, { backgroundColor: mainColor }]}
                    onPress={() => {
                      console.log('Opening image options modal from Get Started button');
                      setShowImageOptions(true);
                    }}
                  >
                    <Icon name="body-outline" size={28} color="#FFFFFF" />
                    <Text style={styles.getStartedButtonText}>Get Started with Your Avatar</Text>
                  </TouchableOpacity>
                  
                  <Text style={[styles.helperText, { color: subTextColor }]}>
                    Take or upload a photo to create your avatar to unlock the try on feature
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Products Section with tab system */}
        <View style={styles.productsSection}>
          {/* Tab Header */}
          <View style={styles.tabContainer}>
            <View style={[styles.tabBackground, { backgroundColor: surfaceColor }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'recommended' && styles.activeTab,
                  activeTab === 'recommended' && { backgroundColor: mainColor }
                ]}
                onPress={() => setActiveTab('recommended')}
              >
                <Icon 
                  name="sparkles" 
                  size={16} 
                  color={activeTab === 'recommended' ? '#FFFFFF' : subTextColor} 
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'recommended' ? '#FFFFFF' : subTextColor }
                ]}>
                  Recommended
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'shelf' && styles.activeTab,
                  activeTab === 'shelf' && { backgroundColor: '#FF6347' }
                ]}
                onPress={() => setActiveTab('shelf')}
              >
                <ShelfIcon 
                  variant="hanger"
                  size={16}
                  color={activeTab === 'shelf' ? '#FFFFFF' : subTextColor}
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'shelf' ? '#FFFFFF' : subTextColor }
                ]}>
                  Your Shelf ({shelfProducts.length})
                </Text>
              </TouchableOpacity>
            </View>
            
          </View>
          
          {/* "Try a different product" button */}
          <TouchableOpacity
            style={[
              styles.tryDifferentButton,
              { 
                backgroundColor: hasModel ? 'rgba(239, 61, 71, 0.1)' : surfaceColor,
                borderColor: hasModel ? mainColor : surfaceColor
              }
            ]}
            onPress={() => {
              console.log('Try different button pressed, hasModel:', hasModel, 'current modal state:', showUrlModal);
              setShowUrlModal(prevState => {
                console.log('Setting modal visibility to:', !prevState);
                return true;
              });
            }}
            disabled={!hasModel}
          >
            <Icon 
              name="link-outline" 
              size={16} 
              color={hasModel ? mainColor : subTextColor} 
            />
            <Text 
              style={[
                styles.tryDifferentButtonText, 
                { color: hasModel ? mainColor : subTextColor }
              ]}
            >
              Paste product links to try on
            </Text>
          </TouchableOpacity>
          
          {/* Categories ScrollView */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {['All', 'Shirts', 'Pants', 'Jackets', 'Shoes', 'Accessories'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.selectedCategory,
                  { 
                    backgroundColor: selectedCategory === category 
                      ? (isDarkMode ? 'rgba(255, 107, 107, 0.2)' : 'rgba(239, 61, 71, 0.1)')
                      : 'transparent',
                    borderColor: selectedCategory === category ? mainColor : surfaceColor,
                  }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    { 
                      color: selectedCategory === category 
                        ? mainColor 
                        : subTextColor 
                    }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Products Grid */}
          {activeTab === 'recommended' ? (
            // Recommended tab content
            loadingProducts && products.length === 0 ? (
              <View style={styles.loadingProductsContainer}>
                <ActivityIndicator size="large" color={mainColor} />
                <Text style={[styles.loadingText, { color: textColor }]}>
                  Loading products...
                </Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <Icon name="search-outline" size={48} color={subTextColor} />
                <Text style={[styles.noProductsText, { color: textColor }]}>
                  No products found in this category
                </Text>
                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: mainColor }]}
                  onPress={handleRefresh}
                >
                  <Icon name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.refreshButtonText}>Refresh Products</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id || Math.random().toString()}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false} // Disable scrolling since it's inside a ScrollView
                ListFooterComponent={<View style={{ height: 20 }} />}
              />
            )
          ) : (
            // Shelf tab content
            shelfLoading ? (
              <View style={styles.loadingProductsContainer}>
                <ActivityIndicator size="large" color="#FF6347" />
                <Text style={[styles.loadingText, { color: textColor }]}>
                  Loading your shelf...
                </Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <Icon name="hanger" size={48} color={subTextColor} />
                <Text style={[styles.noProductsText, { color: textColor }]}>
                  {shelfProducts.length === 0 
                    ? "Your shelf is empty"
                    : "No products found in this category"
                  }
                </Text>
                <Text style={[styles.noProductsSubtext, { color: subTextColor }]}>
                  {shelfProducts.length === 0 
                    ? "Browse products and tap the hanger icon to add them to your shelf"
                    : "Try a different category filter"
                  }
                </Text>
                {shelfProducts.length === 0 && (
                  <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: '#FF6347' }]}
                    onPress={() => setActiveTab('recommended')}
                  >
                    <Icon name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.refreshButtonText}>Browse Products</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id || Math.random().toString()}
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false} // Disable scrolling since it's inside a ScrollView
                ListFooterComponent={<View style={{ height: 20 }} />}
              />
            )
          )}
        </View>
      </Animated.ScrollView>
      
      {/* Modern Fitting Room Panel */}
      {hasModel && tryOnBucket.length > 0 && (
        <Animated.View 
          style={[
            styles.modernFittingRoom, 
            { 
              backgroundColor: cardBgColor,
              transform: [{ translateY }],
              opacity,
              height: PANEL_HEIGHTS[panelState],
            }
          ]}
        >
          {/* Fitting Room Header with Expand/Collapse Button */}
          <TouchableOpacity 
            onPress={toggleFittingRoom}
            style={styles.fittingRoomHeader}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.fittingRoomTitle}>
                <Icon name="shirt-outline" size={20} color={mainColor} />
                <Text style={[styles.fittingRoomText, { color: textColor }]}>
                  Fitting Room
                </Text>
                <View style={[styles.itemCountBadge, { backgroundColor: mainColor }]}>
                  <Text style={styles.itemCountText}>
                    {tryOnBucket.length}
                  </Text>
                </View>
              </View>
              
              <View style={styles.headerActions}>
                <Icon 
                  name={panelState === 'expanded' ? 'chevron-down' : 'chevron-up'} 
                  size={20} 
                  color={textColor} 
                />
              </View>
            </View>
          </TouchableOpacity>
          
          
          {/* Items Preview */}
          <View style={styles.itemsPreview}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.itemsContainer}
              contentContainerStyle={styles.itemsContent}
            >
              {tryOnBucket.map((item, index) => {
                const imageUrl = item.images?.[0] || item.url || 'https://via.placeholder.com/150';
                
                return (
                  <View key={item.id || index} style={styles.itemCard}>
                    <TouchableOpacity
                      onPress={() => handleRemoveFromBucket(item.id || '')}
                      style={styles.removeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => handleShowProductDetails(item)}
                      style={styles.itemImageContainer}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    
                    {panelState === 'expanded' && (
                      <View style={styles.itemDetails}>
                        <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={2}>
                          {item.name || 'Item'}
                        </Text>
                        <Text style={[styles.itemPriceText, { color: subTextColor }]} numberOfLines={1}>
                          {formatPrice(item.price)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
          
          {/* Primary Action */}
          <View style={styles.primaryAction}>
            <TouchableOpacity
              style={[styles.tryOnBtn, { backgroundColor: mainColor }]}
              onPress={handleTryOn}
              activeOpacity={0.8}
            >
              <Icon name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.tryOnText}>
                Try On {tryOnBucket.length > 1 ? 'All' : 'Item'}
              </Text>
            </TouchableOpacity>
            
            {panelState === 'expanded' && (
              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                  style={[styles.secondaryBtn, { borderColor: successColor }]}
                  onPress={() => Alert.alert('Save Collection', 'Feature coming soon!')}
                >
                  <Icon name="bookmark-outline" size={16} color={successColor} />
                  <Text style={[styles.secondaryBtnText, { color: successColor }]}>Save</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.secondaryBtn, { borderColor: accentColor }]}
                  onPress={handleClearBucket}
                >
                  <Icon name="trash-outline" size={16} color={accentColor} />
                  <Text style={[styles.secondaryBtnText, { color: accentColor }]}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}
      
      {/* Floating Fab when hidden */}
      {hasModel && tryOnBucket.length > 0 && panelState === 'hidden' && (
        <Animated.View
          style={[
            styles.floatingFab,
            { 
              backgroundColor: mainColor,
              bottom: Math.max(insets.bottom, 20) + 20,
              transform: [{ scale: opacity }]
            }
          ]}
        >
          <TouchableOpacity
            onPress={showFittingRoom}
            style={styles.fabButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="bag" size={24} color="#FFFFFF" />
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{tryOnBucket.length}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* Image Options Modal with modern design */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onShow={() => console.log('Image options modal shown, visibility state:', showImageOptions)}
        onRequestClose={() => {
          console.log('Image options modal requested to close');
          setShowImageOptions(false);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {hasModel ? 'Update Avatar' : 'Add Photo'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  console.log('Closing image options modal');
                  setShowImageOptions(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            <View style={[
                        styles.photoTipContainer, 
          { 
            backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(239, 61, 71, 0.05)',
            borderColor: isDarkMode ? 'rgba(255, 107, 107, 0.2)' : 'rgba(239, 61, 71, 0.1)'
          }
            ]}>
              <Icon name="information-circle-outline" size={16} color={mainColor} />
              <Text style={[styles.photoTipText, { color: subTextColor }]}>
                For best results, use full-body photos with good lighting
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: isDarkMode ? '#333' : '#EEE' }]}
              onPress={() => {
                console.log('Take photo option selected');
                handleTakePhoto();
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(239, 61, 71, 0.1)' }]}>
                <Icon name="camera" size={24} color={mainColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColor }]}>
                  Take Photo
                </Text>
                <Text style={[styles.optionSubtitle, { color: subTextColor }]}>
                  Use your camera to take a new photo
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                console.log('Choose from library option selected');
                handleSelectFromGallery();
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(239, 61, 71, 0.1)' }]}>
                <Icon name="images" size={24} color={mainColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColor }]}>
                  Choose from Library
                </Text>
                <Text style={[styles.optionSubtitle, { color: subTextColor }]}>
                  Select from your existing photos
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Try On Result Modal */}
      <Modal
        visible={showTryOnModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTryOnModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <View style={[styles.tryOnModalContent, { backgroundColor: cardBgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {tryingOn ? 'Dressing you up...' : 'Try On Result'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTryOnModal(false)}
                disabled={tryingOn}
              >
                <Icon name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            {tryingOn ? (
              <View style={styles.tryOnLoadingContainer}>
                <ActivityIndicator size="large" color={mainColor} />
                <Text style={[styles.tryOnLoadingText, { color: textColor }]}>
                  Creating your look...
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarBackground, { backgroundColor: surfaceColor }]} />
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        backgroundColor: mainColor,
                        width: `${tryOnProgress * 100}%` 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: subTextColor }]}>
                  {Math.round(tryOnProgress * 100)}%
                </Text>
              </View>
            ) : tryOnImage ? (
              <View style={styles.tryOnResultContainer}>
                <Image source={{ uri: tryOnImage }} style={styles.tryOnImage} />
                <View style={styles.tryOnActions}>
                  <TouchableOpacity
                    style={[styles.saveLookButton, { backgroundColor: successColor }]}
                    onPress={handleSaveLook}
                  >
                    <Icon name="bookmark" size={20} color="#FFFFFF" />
                    <Text style={styles.saveLookButtonText}>Save This Look</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.view3DButton, { borderColor: mainColor }]}
                    onPress={() => {
                      Alert.alert('Coming Soon', 'View in 3D feature will be available soon!');
                    }}
                  >
                    <Icon name="cube-outline" size={20} color={mainColor} />
                    <Text style={[styles.view3DButtonText, { color: mainColor }]}>
                      View in 3D
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.tryOnErrorContainer}>
                <Icon name="alert-circle-outline" size={64} color={accentColor} />
                <Text style={[styles.tryOnErrorText, { color: textColor }]}>
                  Failed to generate try-on image. Please try again.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Product URL Modal */}
      <Modal
        visible={showUrlModal}
        transparent={true}
        animationType="slide"
        onShow={() => console.log('URL Modal shown, visibility state:', showUrlModal)}
        onRequestClose={() => {
          console.log('Modal requested to close');
          if (!scrapingProduct) {
            setShowUrlModal(false);
            setProductUrls(['']);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
            <View style={[styles.urlModalContent, { backgroundColor: cardBgColor }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {scrapingProduct ? 'Searching Products...' : 'Try On with URLs'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    if (!scrapingProduct) {
                      setShowUrlModal(false);
                      setProductUrls(['']);
                    }
                  }}
                  disabled={scrapingProduct}
                >
                  <Icon name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              
              {scrapingProduct ? (
                <View style={styles.scrapeLoadingContainer}>
                  <ActivityIndicator size="large" color={mainColor} />
                  <Text style={[styles.scrapeLoadingText, { color: textColor }]}>
                    Finding and processing your product...
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarBackground, { backgroundColor: surfaceColor }]} />
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          backgroundColor: mainColor,
                          width: `${scrapeProgress * 100}%` 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.progressText, { color: subTextColor }]}>
                    {Math.round(scrapeProgress * 100)}%
                  </Text>
                </View>
              ) : (
                <View style={styles.urlInputContainer}>
                  <Text style={[styles.urlInputLabel, { color: textColor }]}>
                    Enter one or more product URLs to try on:
                  </Text>
                  
                  {/* Dynamically render TextInput fields for each URL */}
                  {productUrls.map((url, index) => (
                    <View key={index} style={styles.urlInputRow}>
                      <TextInput
                        style={[
                          styles.urlInput,
                          { 
                            color: textColor,
                            backgroundColor: surfaceColor,
                            borderColor: isDarkMode ? '#333' : '#DDD',
                            flex: 1
                          }
                        ]}
                        placeholder="https://store.com/product/item123"
                        placeholderTextColor={subTextColor}
                        value={url}
                        onChangeText={(text) => {
                          const newUrls = [...productUrls];
                          newUrls[index] = text;
                          setProductUrls(newUrls);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                      
                      {/* Remove button for all but the first URL field */}
                      {index > 0 && (
                        <TouchableOpacity
                          style={[styles.removeUrlButton, { backgroundColor: accentColor }]}
                          onPress={() => {
                            const newUrls = [...productUrls];
                            newUrls.splice(index, 1);
                            setProductUrls(newUrls);
                          }}
                        >
                          <Icon name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  
                  {/* Add another URL button */}
                  <TouchableOpacity
                    style={[
                      styles.addUrlButton, 
                      { 
                        borderColor: mainColor,
                        backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(239, 61, 71, 0.05)'
                      }
                    ]}
                    onPress={() => {
                      setProductUrls([...productUrls, '']);
                    }}
                  >
                    <Icon name="add" size={16} color={mainColor} />
                    <Text style={[styles.addUrlButtonText, { color: mainColor }]}>
                      Add Another URL
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={[styles.urlInputHelper, { color: subTextColor }]}>
                    Paste links to any clothing items from supported stores
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.scrapeButton,
                      { 
                        backgroundColor: productUrls.some(url => url.trim() !== '') ? accentColor : surfaceColor,
                        opacity: productUrls.some(url => url.trim() !== '') ? 1 : 0.5,
                        borderWidth: productUrls.some(url => url.trim() !== '') ? 0 : 1,
                        borderColor: isDarkMode ? '#444' : '#DDD'
                      }
                    ]}
                    onPress={() => {
                      console.log('Search button pressed with URLs:', productUrls);
                      handleScrapeProduct();
                    }}
                    disabled={!productUrls.some(url => url.trim() !== '')}
                  >
                    <Icon 
                      name="search" 
                      size={20} 
                      color={productUrls.some(url => url.trim() !== '') ? "#FFFFFF" : subTextColor} 
                    />
                    <Text 
                      style={[
                        styles.scrapeButtonText, 
                        { color: productUrls.some(url => url.trim() !== '') ? "#FFFFFF" : textColor }
                      ]}
                    >
                      Find & Try On Products
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.supportedStoresContainer}>
                    <Text style={[styles.supportedStoresTitle, { color: textColor }]}>
                      Supported stores include:
                    </Text>
                    <View style={styles.storesList}>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• Nike</Text>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• Adidas</Text>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• H&M</Text>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• Zara</Text>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• ASOS</Text>
                      <Text style={[styles.storeItem, { color: subTextColor }]}>• and many more...</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Product Details Modal */}
      <Modal
        visible={showProductDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseProductDetails}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <View style={[styles.productDetailsModalContent, { backgroundColor: cardBgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Product Details
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseProductDetails}
              >
                <Icon name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            {selectedProductForDetails && (
              <View style={styles.productDetailsContent}>
                {/* Product Image Carousel */}
                <View style={styles.productDetailsImageContainer}>
                  {selectedProductForDetails.images && selectedProductForDetails.images.length > 0 ? (
                    <>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) => {
                          const imageIndex = Math.round(
                            event.nativeEvent.contentOffset.x / 
                            event.nativeEvent.layoutMeasurement.width
                          );
                          setCurrentImageIndex(imageIndex);
                        }}
                        style={styles.imageCarousel}
                      >
                        {selectedProductForDetails.images.map((imageUrl, index) => (
                          <Image
                            key={index}
                            source={{ uri: imageUrl }}
                            style={[styles.productDetailsImage, { width: screenWidth * 0.9 - 40 }]}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                      
                      {/* Image indicator dots */}
                      {selectedProductForDetails.images.length > 1 && (
                        <View style={styles.imageIndicators}>
                          {selectedProductForDetails.images.map((_, index) => (
                            <View
                              key={index}
                              style={[
                                styles.imageIndicatorDot,
                                {
                                  backgroundColor: 
                                    index === currentImageIndex ? mainColor : subTextColor,
                                  opacity: index === currentImageIndex ? 1 : 0.3,
                                }
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <Image
                      source={{ 
                        uri: selectedProductForDetails.url || 'https://via.placeholder.com/300'
                      }}
                      style={styles.productDetailsImage}
                      resizeMode="cover"
                    />
                  )}
                </View>
                
                {/* Product Info */}
                <View style={styles.productDetailsInfo}>
                  <Text style={[styles.productDetailsName, { color: textColor }]}>
                    {selectedProductForDetails.name || 'Unnamed Product'}
                  </Text>
                  
                  {selectedProductForDetails.brand && (
                    <Text style={[styles.productDetailsBrand, { color: subTextColor }]}>
                      {selectedProductForDetails.brand}
                    </Text>
                  )}
                  
                  {selectedProductForDetails.price && (
                    <Text style={[styles.productDetailsPrice, { color: mainColor }]}>
                      {formatPrice(selectedProductForDetails.price)}
                    </Text>
                  )}
                  
                  {/* Store Information */}
                  {selectedProductForDetails.url && 
                   (selectedProductForDetails.url.startsWith('http://') || 
                    selectedProductForDetails.url.startsWith('https://')) && (
                    <View style={styles.productDetailsRow}>
                      <Text style={[styles.productDetailsLabel, { color: subTextColor }]}>
                        Store:
                      </Text>
                      <Text style={[styles.productDetailsValue, { color: textColor }]}>
                        {getStoreName(selectedProductForDetails.url) || 'External Store'}
                      </Text>
                    </View>
                  )}
                  
                  {selectedProductForDetails.color && (
                    <View style={styles.productDetailsRow}>
                      <Text style={[styles.productDetailsLabel, { color: subTextColor }]}>
                        Color:
                      </Text>
                      <Text style={[styles.productDetailsValue, { color: textColor }]}>
                        {selectedProductForDetails.color}
                      </Text>
                    </View>
                  )}
                  
                  {/* Product Description */}
                  {selectedProductForDetails.description && (
                    <View style={styles.productDescriptionContainer}>
                      <Text style={[styles.productDescriptionTitle, { color: textColor }]}>
                        Description
                      </Text>
                      <Text style={[styles.productDescriptionText, { color: subTextColor }]}>
                        {selectedProductForDetails.description}
                      </Text>
                    </View>
                  )}
                  
                  {/* Action Buttons */}
                  <View style={styles.productDetailsActions}>
                    {selectedProductForDetails.url && 
                     (selectedProductForDetails.url.startsWith('http://') || 
                      selectedProductForDetails.url.startsWith('https://')) && (
                      <TouchableOpacity
                        style={[styles.visitWebsiteButton, { backgroundColor: mainColor }]}
                        onPress={() => handleOpenWebsite(selectedProductForDetails.url || '')}
                      >
                        <Icon name="open-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.visitWebsiteButtonText}>Visit Website</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.removeFromBucketButton, { borderColor: accentColor }]}
                      onPress={() => {
                        handleRemoveFromBucket(selectedProductForDetails.id || '');
                        handleCloseProductDetails();
                      }}
                    >
                      <Icon name="trash-outline" size={16} color={accentColor} />
                      <Text style={[styles.removeFromBucketButtonText, { color: accentColor }]}>
                        Remove from Fitting Room
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // General container styles
  container: {
    flex: 1,
  },
  // Avatar image styles
  avatarImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
    position: 'relative', // For positioning the overlay
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  avatarUpdateOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '35%', // Only cover a portion from the right
    height: 80, // Fixed height instead of percentage
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Semi-transparent overlay
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,  // Rounded corners for the overlay
    marginBottom: 16, // Add space from the bottom
    marginRight: 16, // Add space from the right
  },
  avatarUpdateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarUpdateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 4,
  },
  // Try-on bucket styles
  bucketContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  bucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bucketTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  bucketClearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bucketClearText: {
    fontSize: 14,
  },
  bucketContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bucketItemsContainer: {
    paddingRight: 12,
  },
  bucketItem: {
    position: 'relative',
    width: 60,
    height: 80,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bucketItemImage: {
    width: '100%',
    height: '100%',
  },
  bucketItemRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
  },
  scrapedIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  tryOnBucketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  tryOnBucketButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  floatingBucketButton: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  bucketCount: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: '#34C759',
  },
  inBucketIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.35, // iOS font tracking
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
  },
  experimentalWarning: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
    marginTop: 8,
    opacity: 0.8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  
  // 3D model container styles
  threeDContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8, 
    elevation: 5, // Android shadow
  },
  loadingContainer: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  
  // Section and title styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
    alignSelf: "flex-start",
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  // Create model related styles
  createModelContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  createModelTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  imageButtonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '90%',
    marginBottom: 12,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '90%',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: '90%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orText: {
    marginVertical: 8,
    fontSize: 16,
  },
  selectedImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  selectedImageWrapper: {
    position: 'relative',
    margin: 6,
  },
  selectedImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addMoreButton: {
    width: 80,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '90%',
  },
  
  // Products section styles
  productsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  
  // Tab system styles
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabBackground: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    flex: 1,
    marginRight: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  selectedCategory: {
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingProductsContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProductsContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProductsText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  noProductsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '500',
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  
  // New product card styles
  productCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
  },
  productBrand: {
    fontSize: 12,
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  addedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryOnButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  photoTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoTipText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  
  // Try-on modal styles
  tryOnModalContent: {
    width: '90%',
    height: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tryOnLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tryOnLoadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
  },
  tryOnResultContainer: {
    flex: 1,
    padding: 16,
  },
  tryOnImage: {
    flex: 1,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  tryOnActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  saveLookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  saveLookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  view3DButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    marginLeft: 8,
  },
  view3DButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tryOnErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tryOnErrorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  
  // Try a different product button styles
  tryDifferentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  tryDifferentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // URL modal styles
  urlModalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 24,
    maxHeight: '80%',
  },
  urlInputContainer: {
    padding: 20,
  },
  urlInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeUrlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addUrlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  urlInputHelper: {
    fontSize: 12,
    marginBottom: 24,
  },
  scrapeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  scrapeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  supportedStoresContainer: {
    marginTop: 12,
  },
  supportedStoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  storesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  storeItem: {
    width: '50%',
    fontSize: 14,
    marginBottom: 6,
  },
  scrapeLoadingContainer: {
    padding: 24,
    alignItems: 'center',
    minHeight: 250,
    justifyContent: 'center',
  },
  scrapeLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  
  // Modern fitting room styles - optimized for performance
  modernFittingRoom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  
  fittingRoomHeader: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  fittingRoomTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  fittingRoomText: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  itemCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  
  itemCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  headerActions: {
    padding: 4,
  },
  
  
  itemsPreview: {
    marginBottom: 16,
  },
  
  itemsContainer: {
    maxHeight: 180,
  },
  
  itemsContent: {
    paddingRight: 16,
  },
  
  itemCard: {
    width: 120,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  itemImageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  
  itemImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  
  itemDetails: {
    paddingTop: 8,
    paddingHorizontal: 2,
  },
  
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  
  itemPriceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  primaryAction: {
    gap: 8,
  },
  
  tryOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  
  tryOnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  floatingFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  fabButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Product Details Modal styles
  productDetailsModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  productDetailsContent: {
    padding: 20,
  },
  
  productDetailsImageContainer: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  
  imageCarousel: {
    width: '100%',
    height: '100%',
  },
  
  productDetailsImage: {
    width: '100%',
    height: '100%',
  },
  
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  
  imageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  
  productDetailsInfo: {
    gap: 8,
  },
  
  productDetailsName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  productDetailsBrand: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  
  productDetailsPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  
  productDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  productDetailsLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
  },
  
  productDetailsValue: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  
  productDetailsActions: {
    marginTop: 24,
    gap: 12,
  },
  
  visitWebsiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  
  visitWebsiteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  removeFromBucketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  
  removeFromBucketButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  productDescriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  
  productDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  
  productDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
});

export default ThreeDScreen;