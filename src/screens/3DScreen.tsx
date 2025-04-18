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
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import storage from '@react-native-firebase/storage';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ThreeDBox from "../components/3DComponents/ThreeDBox"; 
import { useTheme } from "../styles/themeprovider";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";

// Get screen dimensions for responsive design
const { width: screenWidth } = Dimensions.get('window');

const ThreeDScreen: React.FC = () => {
  const scrollY = useRef(new Animated.Value(0)).current; // Track scrolling
  const navigation = useNavigation();
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
  const [showTryOnBucket, setShowTryOnBucket] = useState<boolean>(false);
  
  // Products related states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Custom product URL states
  const [showUrlModal, setShowUrlModal] = useState<boolean>(false);
  const [productUrls, setProductUrls] = useState<string[]>(['']);
  const [scrapingProduct, setScrapingProduct] = useState<boolean>(false);
  const [scrapeProgress, setScrapeProgress] = useState<number>(0);
  
  // Colors based on theme
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const accentColor = isDarkMode ? '#FF375F' : '#FF2D55'; // iOS pink/red
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
  
  // Cache keys for the avatar image (moved to top level for reuse)
  const USER_AVATAR_CACHE_KEY = 'user_avatar_image_url';
  const USER_AVATAR_TIMESTAMP_KEY = 'user_avatar_image_timestamp';
  
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
      
      // Save the URL to local cache (AsyncStorage)
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
  
  // State to track bucket highlighting
  const [highlightBucket, setHighlightBucket] = useState<boolean>(false);

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
    
    // Highlight the bucket to draw attention to it
    setHighlightBucket(true);
    setTimeout(() => {
      setHighlightBucket(false);
    }, 1500); // Reset the highlight after 1.5 seconds
    
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
    setTryOnBucket(prevBucket => prevBucket.filter(item => item.id !== productId));
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
          onPress: () => setTryOnBucket([]) 
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
      const outfitRef = collection(db, "saved_outfits");
      console.log('Creating document with data:', {
        userId: currentUser.uid,
        name: outfitName,
        // Store only a snippet of the image URL for logging
        imageUrl: tryOnImage ? tryOnImage.substring(0, 50) + '...' : null,
        products: tryOnBucket.length,
      });
      
      await addDoc(outfitRef, {
        userId: currentUser.uid,
        name: outfitName,
        imageUrl: tryOnImage,
        products: tryOnBucket,
        createdAt: serverTimestamp()
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

  // Category filtering
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => 
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
            shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
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
            // User has a model, show it with an elegant overlay for updates
            <>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Your Avatar</Text>
              <View style={styles.avatarImageContainer}>
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={handleUpdateAvatar}
                  style={styles.avatarTouchable}
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
            </>
          ) : (
            // User needs to create a model
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
                    Take or upload a photo to create your avatar
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Products Section with categories */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Try On These Products
            </Text>
            
            {!hasModel && (
              <View style={[styles.lockBadge, { backgroundColor: surfaceColor }]}>
                <Icon name="lock-closed" size={12} color={subTextColor} />
                <Text style={[styles.lockText, { color: subTextColor }]}>Create model first</Text>
              </View>
            )}
          </View>
          
          {/* "Try a different product" button */}
          <TouchableOpacity
            style={[
              styles.tryDifferentButton,
              { 
                backgroundColor: hasModel ? 'rgba(255, 45, 85, 0.1)' : surfaceColor,
                borderColor: hasModel ? accentColor : surfaceColor
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
              color={hasModel ? accentColor : subTextColor} 
            />
            <Text 
              style={[
                styles.tryDifferentButtonText, 
                { color: hasModel ? accentColor : subTextColor }
              ]}
            >
              Add products from external websites
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
                      ? (isDarkMode ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)')
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
          {loadingProducts && products.length === 0 ? (
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
          )}
        </View>
      </Animated.ScrollView>
      
      {/* Fitting Room (Try-On Bucket) UI at bottom of screen */}
      {hasModel && tryOnBucket.length > 0 && (
        <Animated.View 
          style={[
            styles.bucketContainer, 
            { 
              backgroundColor: cardBgColor,
              paddingBottom: Math.max(insets.bottom, 16),
              borderColor: highlightBucket ? accentColor : 'transparent',
              borderWidth: highlightBucket ? 2 : 0,
            }
          ]}
        >
          <View style={styles.bucketHeader}>
            <Text style={[styles.bucketTitle, { color: textColor }]}>
              Fitting Room ({tryOnBucket.length})
            </Text>
            <TouchableOpacity
              style={styles.bucketClearButton}
              onPress={handleClearBucket}
            >
              <Text style={[styles.bucketClearText, { color: subTextColor }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bucketContent}>
            <FlatList
              data={tryOnBucket}
              renderItem={renderBucketItem}
              keyExtractor={(item) => item.id || Math.random().toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bucketItemsContainer}
            />
            
            <TouchableOpacity
              style={[styles.tryOnBucketButton, { backgroundColor: mainColor }]}
              onPress={handleTryOn}
            >
              <Icon name="shirt" size={18} color="#FFFFFF" />
              <Text style={styles.tryOnBucketButtonText}>
                Try On {tryOnBucket.length === 1 ? 'Item' : 'All Items'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
      
      {/* Floating Try-On Button when bucket has items but is collapsed */}
      {hasModel && tryOnBucket.length > 0 && !showTryOnBucket && (
        <TouchableOpacity
          style={[
            styles.floatingBucketButton,
            { 
              backgroundColor: mainColor,
              bottom: Math.max(insets.bottom, 16) + 16
            }
          ]}
          onPress={() => setShowTryOnBucket(true)}
        >
          <Icon name="shirt" size={24} color="#FFFFFF" />
          <View style={styles.bucketCount}>
            <Text style={styles.bucketCountText}>
              {tryOnBucket.length}
            </Text>
          </View>
        </TouchableOpacity>
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
            
            <TouchableOpacity 
              style={[styles.modalOption, { borderBottomColor: isDarkMode ? '#333' : '#EEE' }]}
              onPress={() => {
                console.log('Take photo option selected');
                handleTakePhoto();
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(10, 132, 255, 0.1)' }]}>
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
              <View style={[styles.optionIcon, { backgroundColor: 'rgba(10, 132, 255, 0.1)' }]}>
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
            setProductUrl('');
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
                      setProductUrl('');
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
                        backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)'
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
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockText: {
    fontSize: 12,
    marginLeft: 4,
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
    backgroundColor: '#FFFFFF', // Add explicit background color for light mode
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
});

export default ThreeDScreen;