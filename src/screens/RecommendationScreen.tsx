import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView,
  Easing,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from '../styles/themeprovider';
import { searchProducts, Product, checkApiHealth } from '../services/recommendationService';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../Config/firebaseconfig';
// No longer need custom bottom navigation bar with tab navigator

// Get screen dimensions
const { width } = Dimensions.get('window');

// Fashion themed loading animation component
const FashionLoadingAnimation: React.FC<{mainColor: string}> = ({ mainColor }) => {
  // Animation values
  const clothesHanger = useRef(new Animated.Value(0)).current;
  const clothesRack = useRef(new Animated.Value(0)).current;
  const fashionIcon1 = useRef(new Animated.Value(0)).current;
  const fashionIcon2 = useRef(new Animated.Value(0)).current;
  const fashionIcon3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Create hanger animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(clothesHanger, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(clothesHanger, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Create rack sliding animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(clothesRack, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(clothesRack, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Create fashion icons animations with different timings
    const startIconAnimation = (iconRef: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconRef, {
            toValue: 1,
            duration: 800,
            delay,
            easing: Easing.bounce,
            useNativeDriver: true
          }),
          Animated.timing(iconRef, {
            toValue: 0,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true
          })
        ])
      ).start();
    };
    
    startIconAnimation(fashionIcon1, 0);
    startIconAnimation(fashionIcon2, 300);
    startIconAnimation(fashionIcon3, 600);
  }, []);
  
  // Interpolate animations
  const hangerRotation = clothesHanger.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg']
  });
  
  const rackTranslate = clothesRack.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20]
  });
  
  const icon1Scale = fashionIcon1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  const icon2Scale = fashionIcon2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  const icon3Scale = fashionIcon3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  return (
    <View style={styles.loadingAnimationContainer}>
      {/* Clothes rack with hangers */}
      <Animated.View style={[styles.clothesRack, { transform: [{ translateX: rackTranslate }] }]}>
        <View style={[styles.rackBar, { backgroundColor: mainColor }]} />
        
        {/* Hanger 1 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { left: 0, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="shirt-outline" size={30} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 2 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { left: 50, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="glasses-outline" size={28} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 3 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { right: 50, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="watch-outline" size={30} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 4 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { right: 0, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="bag-outline" size={30} color={mainColor} />
        </Animated.View>
      </Animated.View>
      
      {/* Fashion icons bouncing around */}
      <View style={styles.fashionIconsContainer}>
        <Animated.View style={{ transform: [{ scale: icon1Scale }] }}>
          <Icon name="star" size={24} color={mainColor} />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: icon2Scale }] }}>
          <Icon name="sparkles-outline" size={24} color={mainColor} />
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: icon3Scale }] }}>
          <Icon name="heart" size={24} color={mainColor} />
        </Animated.View>
      </View>
    </View>
  );
};

const height = Dimensions.get('window').height;
const ITEM_WIDTH = width - 48;
const ITEM_HEIGHT = 180;

// Product Item component - defined outside to follow hooks rules
// Define ProductDetails Modal component
const ProductDetailsModal = React.memo(({ 
  visible, 
  item, 
  onClose, 
  onOpenProduct,
  mainColor, 
  cardBgColor,
  textColor, 
  subTextColor 
}: { 
  visible: boolean, 
  item: Product | null, 
  onClose: () => void,
  onOpenProduct: (url: string) => void,
  mainColor: string,
  cardBgColor: string,
  textColor: string,
  subTextColor: string
}) => {
  const modalAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible, modalAnim, slideAnim]);

  if (!item) return null;
  
  return (
    visible && (
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <Animated.View 
          style={[
            styles.modalContent,
            { 
              backgroundColor: cardBgColor,
              opacity: modalAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
          
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }}
              style={styles.modalImage}
            />
          ) : (
            <View style={[styles.modalImage, { backgroundColor: '#f0f0f0' }]}>
              <Icon name="image-outline" size={40} color="#bbb" />
            </View>
          )}
          
          <View style={styles.modalDetails}>
            <Text style={[styles.modalProductName, { color: textColor }]}>
              {item.name}
            </Text>
            
            <View style={styles.modalSiteContainer}>
              <Icon name="globe-outline" size={16} color={subTextColor} />
              <Text style={[styles.modalSiteText, { color: subTextColor }]}>
                {item.site || 'Unknown Store'}
              </Text>
            </View>
            
            {item.price !== undefined && (
              <Text style={[styles.modalPrice, { color: mainColor }]}>
                ${(typeof item.price === 'number' ? item.price.toFixed(2) : '0.00')}
              </Text>
            )}
            
            {item.description && (
              <Text style={[styles.modalDescription, { color: textColor }]} numberOfLines={3}>
                {item.description}
              </Text>
            )}
            
            <TouchableOpacity 
              style={[styles.buyButton, { backgroundColor: mainColor }]}
              onPress={() => onOpenProduct(item.url)}
            >
              <Text style={styles.buyButtonText}>Shop Now</Text>
              <Icon name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="heart-outline" size={22} color={mainColor} />
                <Text style={[styles.actionText, { color: subTextColor }]}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="share-social-outline" size={22} color={mainColor} />
                <Text style={[styles.actionText, { color: subTextColor }]}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionItem}>
                <Icon name="add-circle-outline" size={22} color={mainColor} />
                <Text style={[styles.actionText, { color: subTextColor }]}>Closet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    )
  );
});

const ProductItem = React.memo(({ 
  item, 
  index, 
  onPress, 
  onLongPress,
  borderColor, 
  cardBgColor, 
  textColor, 
  subTextColor,
  mainColor 
}: { 
  item: Product, 
  index: number,
  onPress: (url: string) => void,
  onLongPress: (product: Product) => void,
  borderColor: string,
  cardBgColor: string,
  textColor: string,
  subTextColor: string,
  mainColor: string
}) => {
  // Now hooks are at the top level of a component
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(25)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Effect to run animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 80, // Slightly faster appearance
        useNativeDriver: true
      }),
      Animated.timing(translateXAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true
      })
    ]).start();
  }, [index, opacityAnim, translateXAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 7,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View 
      style={[
        styles.productItem, 
        { 
          backgroundColor: cardBgColor,
          borderColor: borderColor,
          opacity: opacityAnim,
          transform: [
            { translateX: translateXAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.itemContent}
        activeOpacity={0.7}
        onPress={() => onPress(item.url)}
        onLongPress={() => onLongPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={200}
      >
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.productImage} 
            />
          ) : (
            <View style={[styles.productImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="image-outline" size={40} color="#bbb" />
            </View>
          )}
          {item.price !== undefined && (
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>
                ${(typeof item.price === 'number' ? item.price.toFixed(0) : '0')}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.productTop}>
            <Text style={[styles.productName, { color: textColor }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={[styles.productSite, { color: subTextColor }]}>
              {item.site || 'Unknown Store'}
            </Text>
          </View>
          
          <View style={styles.productBottom}>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(117, 98, 250, 0.15)' }]}
              >
                <Icon name="heart-outline" size={20} color={mainColor} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewButton, { backgroundColor: mainColor }]}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Mock Products data - for testing when API is unavailable
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Striped Cotton T-Shirt',
    price: 39.99,
    images: ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format'],
    url: 'https://example.com/product1',
    site: 'H&M'
  },
  {
    id: '2',
    name: 'Slim-Fit Jeans',
    price: 59.99,
    images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format'],
    url: 'https://example.com/product2',
    site: 'Zara'
  },
  {
    id: '3',
    name: 'Leather Jacket',
    price: 199.99,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format'],
    url: 'https://example.com/product3',
    site: 'Mango'
  },
  {
    id: '4',
    name: 'White Sneakers',
    price: 89.99,
    images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format'],
    url: 'https://example.com/product4',
    site: 'Nike'
  },
  {
    id: '5',
    name: 'Wool Coat',
    price: 149.99,
    images: ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600&auto=format'],
    url: 'https://example.com/product5',
    site: 'ASOS'
  },
  {
    id: '6',
    name: 'Floral Summer Dress',
    price: 79.99,
    images: ['https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=600&auto=format'],
    url: 'https://example.com/product6',
    site: 'Nordstrom'
  },
  {
    id: '7',
    name: 'Classic Watch',
    price: 129.99,
    images: ['https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=600&auto=format'],
    url: 'https://example.com/product7',
    site: 'Fossil'
  },
  {
    id: '8',
    name: 'Trendy Sunglasses',
    price: 49.99,
    images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=600&auto=format'],
    url: 'https://example.com/product8',
    site: 'Ray-Ban'
  }
];

const RecommendationScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]); // Initialize with empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // More luxurious, premium iOS-native color palette
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const secondaryColor = isDarkMode ? '#64D2FF' : '#5AC8FA'; // iOS light blue
  const accentColor = isDarkMode ? '#BF5AF2' : '#AF52DE'; // iOS purple for accents
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#38383A' : '#F2F2F7'; // iOS system gray 5
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7'; // iOS surface color
  
  // Animation references - for search bar animation and bottom navigation scroll tracking
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  // Using the same scrollY value for FlatList and bottom navigation
  const scrollY = useRef(new Animated.Value(0)).current;

  // Sample filters for fashion items
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'shirts', label: 'Shirts' },
    { id: 'pants', label: 'Pants' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' }
  ];

  // Check API connection on component mount and fetch user profile
  useEffect(() => {
    const checkConnection = async () => {
      console.log('🔄 RecommendationScreen: Checking API connection on component mount');
      try {
        const isConnected = await checkApiHealth();
        console.log('🚦 RecommendationScreen: API connection result:', isConnected ? 'Connected' : 'Not connected');
        setApiConnected(isConnected);
        // Don't set error message here, only check and store API status
      } catch (err) {
        console.error('❌ RecommendationScreen: Error when checking API connection:', err);
        setApiConnected(false);
        // Don't set error message here, only check and store API status
      }
    };
    
    console.log('🏁 RecommendationScreen: Component mounted, starting initialization');
    checkConnection();
    fetchUserProfile();
    
    // Initialize with empty products rather than mock data
    setProducts([]);
  }, []);

  // Fetch the user's profile and preferences
  const fetchUserProfile = async () => {
    console.log('👤 RecommendationScreen: Fetching user profile');
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log('ℹ️ RecommendationScreen: No authenticated user found, skipping profile fetch');
      return;
    }
    console.log('🔑 RecommendationScreen: Fetching profile for user ID:', userId);

    try {
      // Fetch user profile
      console.log('📄 RecommendationScreen: Fetching from users collection');
      const profileDoc = await getDoc(doc(db, 'users', userId));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;
      console.log('📋 RecommendationScreen: User profile data found:', profileData ? 'Yes' : 'No');
      
      // Fetch user preferences
      console.log('⚙️ RecommendationScreen: Fetching from user_preferences collection');
      const preferencesDoc = await getDoc(doc(db, 'user_preferences', userId));
      const preferencesData = preferencesDoc.exists() ? preferencesDoc.data() : null;
      console.log('🔧 RecommendationScreen: User preferences data found:', preferencesData ? 'Yes' : 'No');
      
      // Combine profile and preferences
      const combinedProfile = {
        ...profileData,
        ...preferencesData
      };
      console.log('🔄 RecommendationScreen: Combined user profile keys:', 
        combinedProfile ? Object.keys(combinedProfile).join(', ') : 'No profile data');
      setUserProfile(combinedProfile);
    } catch (error) {
      console.error('❌ RecommendationScreen: Error fetching user profile:', error);
    }
  };

  // Handle search input focus animation
  const handleFocus = () => {
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(searchBarAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  const handleSearch = async () => {
    console.log('🔍 RecommendationScreen: Search initiated with query:', query);
    if (!query.trim()) {
      console.log('⚠️ RecommendationScreen: Empty search query, alerting user');
      Alert.alert('Please enter a search term');
      return;
    }

    // Clear any existing errors and start loading
    console.log('🔄 RecommendationScreen: Starting search process, clearing previous state');
    setError(null);
    setLoading(true);
    
    try {
      // First check API connection if needed
      let isConnected = apiConnected;
      if (apiConnected === false || apiConnected === null) {
        console.log('🔌 RecommendationScreen: API connection status is', 
          apiConnected === false ? 'disconnected' : 'unknown', 
          '- checking connection');
        
        isConnected = await checkApiHealth();
        console.log('🚦 RecommendationScreen: API check result:', isConnected ? 'connected' : 'disconnected');
        setApiConnected(isConnected);
        
        if (!isConnected) {
          console.log('❌ RecommendationScreen: API disconnected, aborting search');
          setError('Cannot connect to recommendation service. Please check your network or try again later.');
          setLoading(false);
          return;
        }
      } else {
        console.log('✅ RecommendationScreen: API already confirmed connected, proceeding with search');
      }
      
      // Now that we've confirmed API is connected, proceed with search
      console.log('🚀 RecommendationScreen: Sending search request with query:', query);
      const results = await searchProducts(query, [0, 1000], 10, userProfile);
      console.log('📊 RecommendationScreen: Search complete, received', results?.length || 0, 'results');
      
      setProducts(results || []);
      if (!results || results.length === 0) {
        console.log('ℹ️ RecommendationScreen: No products found for query');
        setError('No products found matching your search. Try different keywords.');
      }
    } catch (err) {
      console.error('❌ RecommendationScreen: Search error:', err);
      setError('Failed to fetch recommendations. Please try again.');
    } finally {
      console.log('🏁 RecommendationScreen: Search process complete');
      setLoading(false);
    }
  };

  const openProductUrl = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Cannot open product page');
    });
  };
  
  const showProductPreview = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };
  
  const closeProductPreview = () => {
    setModalVisible(false);
    // Delay clearing the selected product to allow the animation to complete
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300);
  };

  // Animated search bar styles
  const searchBarWidth = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '100%']
  });

  const searchBarHeight = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 54]
  });

  const searchBarOpacity = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1]
  });

  // Replace the renderProduct function with a simpler version that uses our new component
  const renderProduct = ({ item, index }: { item: Product, index: number }) => (
    <ProductItem
      item={item}
      index={index}
      onPress={openProductUrl}
      onLongPress={showProductPreview}
      borderColor={borderColor}
      cardBgColor={cardBgColor}
      textColor={textColor}
      subTextColor={subTextColor}
      mainColor={mainColor}
    />
  );

  // Render trending searches - reusable section
  // Handle filter change by triggering a new search with category
  const handleFilterChange = async (filterId: string) => {
    setActiveFilter(filterId);
    
    // If we have no products loaded yet or we're just switching back to "all",
    // don't do anything - wait for user to search
    if (products.length === 0 || filterId === 'all') {
      return;
    }
    
    // Otherwise, if we have products loaded, filter them client-side
    const mappings: Record<string, string[]> = {
      'shirts': ['shirt', 't-shirt', 'top', 'tee'],
      'pants': ['jeans', 'pants', 'trousers', 'slacks', 'chinos'],
      'dresses': ['dress', 'gown', 'skirt'],
      'shoes': ['sneakers', 'shoes', 'boots', 'sandals'],
      'accessories': ['watch', 'sunglasses', 'jewelry', 'hat', 'belt', 'bag', 'purse']
    };
    
    const keywords = mappings[filterId] || [filterId];
    
    // Apply filtering to products based on product name or description
    const filtered = products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const desc = product.description?.toLowerCase() || '';
      
      return keywords.some(keyword => 
        name.includes(keyword.toLowerCase()) || 
        desc.includes(keyword.toLowerCase())
      );
    });
    
    setProducts(filtered);
    
    // If no products match the filter, show an appropriate message
    if (filtered.length === 0) {
      setError(`No ${filterId} found in your search results. Try a different filter or search term.`);
    } else {
      setError(null);
    }
  };

  const renderTrendingSearches = () => {
    const trendingSearches = ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Watch'];
    
    return (
      <View style={styles.trendingSection}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Trending Searches</Text>
        <View style={styles.trendingTags}>
          {trendingSearches.map((tag, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.trendingTag, { borderColor: borderColor }]}
              onPress={() => {
                setQuery(tag);
                handleSearch();
              }}
            >
              <Text style={[styles.trendingTagText, { color: subTextColor }]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Modern iOS-style header with back button */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.title, { color: textColor }]}>Discover</Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>Find your unique style</Text>
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: surfaceColor }]}
            >
              <FeatherIcon name="sliders" size={18} color={mainColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: surfaceColor }]}
            >
              <Icon name="notifications-outline" size={18} color={mainColor} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Enhanced iOS-style search bar */}
        <Animated.View style={[
          styles.searchContainer,
          { 
            width: searchBarWidth,
            height: searchBarHeight,
            opacity: searchBarOpacity,
          }
        ]}>
          <Icon name="search" size={16} color={subTextColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search styles, items, or brands"
            placeholderTextColor={subTextColor}
            value={query}
            onChangeText={setQuery}
            onFocus={handleFocus}
            onBlur={handleBlur}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setQuery('')}
            >
              <Icon name="close-circle" size={16} color={subTextColor} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      
      {/* Premium filter chips with smooth scroll */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
          bounces={true}
          decelerationRate="fast"
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && { 
                  backgroundColor: mainColor,
                  shadowColor: mainColor,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 3
                }
              ]}
              onPress={() => handleFilterChange(filter.id)}
            >
              <Text 
                style={[
                  styles.filterText, 
                  { color: activeFilter === filter.id ? '#FFFFFF' : subTextColor }
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <View style={[styles.loadingIndicator, { backgroundColor: cardBgColor }]}>
            <FashionLoadingAnimation mainColor={mainColor} />
            <Text style={[styles.loadingText, { color: textColor }]}>
              Finding your perfect style...
            </Text>
          </View>
        </View>
      ) : (error && query.trim() !== '') ? (
        <View style={styles.centerContainer}>
          <View style={[styles.errorContainer, { backgroundColor: cardBgColor }]}>
            <Icon name="alert-circle-outline" size={40} color="#e74c3c" />
            <Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: mainColor }]}
              onPress={handleSearch}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.productsList}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } }}],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          ListHeaderComponent={
            <View style={styles.featuredSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Trending Now
              </Text>
              <View style={styles.featuredCardsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={width * 0.85 + 15}
                  snapToAlignment="center"
                  contentContainerStyle={styles.featuredCardsScroll}
                >
                  {/* Featured trending cards */}
                  <TouchableOpacity style={[styles.featuredCard, { backgroundColor: surfaceColor }]}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?q=80&w=800&auto=format' }}
                      style={styles.featuredImage}
                    />
                    <View style={styles.featuredContent}>
                      <Text style={[styles.featuredTitle, { color: textColor }]}>Summer Essentials</Text>
                      <Text style={[styles.featuredSubtitle, { color: subTextColor }]}>Lightweight pieces for the season</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.featuredCard, { backgroundColor: surfaceColor }]}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1548624313-0fb08aeadcb1?q=80&w=800&auto=format' }}
                      style={styles.featuredImage}
                    />
                    <View style={styles.featuredContent}>
                      <Text style={[styles.featuredTitle, { color: textColor }]}>Sustainable Style</Text>
                      <Text style={[styles.featuredSubtitle, { color: subTextColor }]}>Eco-friendly fashion finds</Text>
                    </View>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          }
          ListEmptyComponent={
            <>
              {renderTrendingSearches()}
              
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Suggestions</Text>
                
                <View style={styles.emptyStateContainer}>
                  <Icon 
                    name="search-outline" 
                    size={60} 
                    color={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                  />
                  <Text style={[styles.emptyText, { color: subTextColor }]}>
                    {query.trim() 
                      ? 'No products found. Try a different search term.' 
                      : 'Search for items to find your style.'}
                  </Text>
                </View>
              </View>
            </>
          }
          ListFooterComponent={<View style={{ height: 140 }} />}
        />
      )}
      
      {/* Product Details Modal */}
      <ProductDetailsModal 
        visible={modalVisible}
        item={selectedProduct}
        onClose={closeProductPreview}
        onOpenProduct={openProductUrl}
        mainColor={mainColor}
        cardBgColor={cardBgColor}
        textColor={textColor}
        subTextColor={subTextColor}
      />
      
      {/* No longer need custom bottom navigation bar - using Tab Navigator */}
    </SafeAreaView>
  );
};

// Using the same width value from earlier in the file
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Enhanced Header Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  title: {
    fontSize: 28, // iOS Large Title size - slightly smaller for more elegance
    fontWeight: '700',
    letterSpacing: 0.35, // iOS font tracking
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
    borderRadius: 10, // iOS standard rounded corner
    paddingHorizontal: 12,
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS search bar background
    height: 38, // iOS standard search bar height
  },
  searchInput: {
    flex: 1,
    fontSize: 17, // iOS body text size
    fontWeight: '400',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  clearButton: {
    padding: 4,
  },
  // Enhanced filter styles
  filtersContainer: {
    marginBottom: 20,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18, // More iOS-like pill shape
    marginRight: 10,
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS standard gray
  },
  filterText: {
    fontSize: 15, // iOS subhead
    fontWeight: '500',
  },
  // Featured cards section
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuredCardsContainer: {
    marginTop: 12,
  },
  featuredCardsScroll: {
    paddingRight: 20,
    paddingBottom: 6,
  },
  featuredCard: {
    width: width * 0.85,
    height: 180,
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
  },
  // Product list styles
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  productItem: {
    flex: 1,
    margin: 6,
    borderRadius: 16, // iOS standard card corner radius
    overflow: 'hidden',
    borderWidth: 0, // iOS typically doesn't have visible borders
    height: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  itemContent: {
    height: '100%',
    flexDirection: 'column',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
    width: '100%',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Slightly more opaque
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15, // More rounded for iOS feel
  },
  priceTagText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  productDetails: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  productTop: {
    flex: 1,
  },
  productBottom: {
    justifyContent: 'flex-end',
  },
  productName: {
    fontSize: 15, // iOS callout size
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  productSite: {
    fontSize: 13, // iOS caption size
    opacity: 0.7,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 17, // iOS body text size
    fontWeight: '600',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // iOS blue with opacity
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18, // iOS pill-shaped button
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Loading and error states
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingIndicator: {
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17, // iOS body text
    fontWeight: '500',
  },
  errorContainer: {
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
    fontSize: 17, // iOS body text
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20, // More iOS-like pill shape
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Trending & suggestion sections
  trendingSection: {
    marginVertical: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20, // iOS headline size
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  trendingTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18, // iOS pill shape
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 0, // Remove border
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS standard gray
  },
  trendingTagText: {
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 60, // More space for iOS feel
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 17, // iOS body text
    lineHeight: 24,
    maxWidth: '80%',
    opacity: 0.7, // Better text contrast for iOS
  },
  // Loading animation styles
  loadingAnimationContainer: {
    height: 150,
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  clothesRack: {
    width: 200,
    height: 100,
    position: 'relative',
    alignItems: 'center',
  },
  rackBar: {
    width: '100%',
    height: 4, // Slightly thinner for iOS
    borderRadius: 2,
    marginTop: 20,
  },
  hangerContainer: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fashionIconsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    maxHeight: '75%', // Slightly less height for iOS proportion
    borderRadius: 14, // iOS card standard
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12, // Softer shadow for iOS feel
  },
  modalHeader: {
    paddingHorizontal: 15,
    paddingTop: 15,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)', // iOS standard gray
  },
  modalImage: {
    width: '100%',
    height: 240, // Slightly taller image
    resizeMode: 'cover',
  },
  modalDetails: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 19, // iOS headline
    fontWeight: '600',
    marginBottom: 10,
    lineHeight: 24,
  },
  modalSiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSiteText: {
    marginLeft: 6,
    fontSize: 15, // iOS subhead
    opacity: 0.7, // Better contrast for iOS
  },
  modalPrice: {
    fontSize: 24, // iOS large title
    fontWeight: '700',
    marginBottom: 12, // Reduced margin to accommodate description
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14, // iOS standard button height
    borderRadius: 20, // iOS rounded button
    marginBottom: 24,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 17, // iOS button text
    marginRight: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around', // More evenly spaced
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(60, 60, 67, 0.1)', // iOS standard separator
  },
  actionItem: {
    alignItems: 'center',
    padding: 12, // More touchable area
  },
  actionText: {
    fontSize: 13, // iOS caption
    marginTop: 6,
    fontWeight: '500',
  },
});

export default RecommendationScreen;
