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
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from '../styles/theme/ThemeContext';
import { searchProducts, Product, checkApiHealth } from '../services/recommendationService';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../Config/firebaseconfig';
import { useNavigation } from '@react-navigation/native';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// For TypeScript to recognize setTimeout as a global
declare const setTimeout: (callback: () => void, ms: number) => number;

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

// Product Item component for horizontal scrolling in chat
const ProductItem = React.memo(({ 
  item, 
  index, 
  onPress, 
  onLongPress,
  cardBgColor, 
  textColor, 
  subTextColor,
  mainColor 
}: { 
  item: Product, 
  index: number,
  onPress: (url: string) => void,
  onLongPress: (product: Product) => void,
  cardBgColor: string,
  textColor: string,
  subTextColor: string,
  mainColor: string
}) => {
  // Animation refs
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Effect to run animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true
      })
    ]).start();
  }, []);

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
        styles.productCard, 
        { 
          backgroundColor: cardBgColor,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.productCardContent}
        activeOpacity={0.9}
        onPress={() => onLongPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.productImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.productCardImage} 
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.productCardImage, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="image-outline" size={28} color="#bbb" />
            </View>
          )}
        </View>
        
        <View style={styles.productCardDetails}>
          <Text style={[styles.productCardName, { color: textColor }]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.productPriceRow}>
            {item.price !== undefined && (
              <Text style={[styles.productCardPrice, { color: mainColor }]}>
                ${(typeof item.price === 'number' ? item.price.toFixed(0) : '0')}
              </Text>
            )}
            <Text style={[styles.productCardSite, { color: subTextColor }]}>
              {item.site || 'Unknown Store'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Define message types for chat
interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  text: string;
  timestamp: number;
  products?: Product[];
}

// Product details modal
const ProductDetailsModal = React.memo(({ 
  visible, 
  item, 
  onClose, 
  onOpenProduct,
  onFavorite,
  mainColor, 
  cardBgColor,
  textColor, 
  subTextColor,
  borderColor
}: { 
  visible: boolean, 
  item: Product | null, 
  onClose: () => void,
  onOpenProduct: (url: string) => void,
  onFavorite: (product: Product) => void,
  mainColor: string,
  cardBgColor: string,
  textColor: string,
  subTextColor: string,
  borderColor: string
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
          
          <ScrollView 
            style={styles.modalScrollContainer}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {item.images && item.images.length > 0 ? (
              <Image 
                source={{ uri: item.images[0] }}
                style={styles.modalImage}
                resizeMode="cover"
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
              
              {/* Description section */}
              {item.description ? (
                <Text style={[styles.modalDescription, { color: textColor }]}>
                  {item.description}
                </Text>
              ) : (
                <Text style={[styles.modalDescription, { color: subTextColor, fontStyle: 'italic' }]}>
                  No description available. Check retailer's website for details.
                </Text>
              )}
              
              {/* Additional details section */}
              <View style={styles.additionalDetailsSection}>
                <Text style={[styles.detailsSectionTitle, { color: textColor }]}>
                  Product Details
                </Text>
                
                <View style={styles.detailsRow}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>Brand:</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{item.site || 'Unknown'}</Text>
                </View>
                
                {item.price !== undefined && (
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailLabel, { color: subTextColor }]}>Price:</Text>
                    <Text style={[styles.detailValue, { color: textColor }]}>
                      ${(typeof item.price === 'number' ? item.price.toFixed(2) : '0.00')}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailsRow}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>Item ID:</Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>{item.id}</Text>
                </View>
              </View>
              
              {/* Action buttons */}
              <TouchableOpacity 
                style={[styles.purchaseButton, { backgroundColor: mainColor }]}
                onPress={() => onOpenProduct(item.url)}
              >
                <Text style={styles.purchaseButtonText}>Buy Now</Text>
                <Icon name="bag-check-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.favoriteButton, { borderColor: mainColor }]}
                onPress={() => onFavorite(item)}
              >
                <Icon name="heart" size={20} color={mainColor} style={{ marginRight: 8 }} />
                <Text style={[styles.favoriteButtonText, { color: mainColor }]}>Add to Favorites</Text>
              </TouchableOpacity>
              
              {/* View in Closet button */}
              <TouchableOpacity 
                style={[styles.viewClosetButton, { borderColor: subTextColor }]}
                onPress={() => navigation.navigate('ClosetTab')}
              >
                <Icon name="shirt-outline" size={20} color={subTextColor} style={{ marginRight: 8 }} />
                <Text style={[styles.viewClosetButtonText, { color: subTextColor }]}>View in Closet</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    )
  );
});

// Mock Products data - for testing
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
  }
];

// Trendy search suggestions
const TRENDY_SEARCHES = [
  'Summer Dress',
  'Athletic Wear',
  'Casual Sneakers',
  'Vintage Denim',
  'Statement Accessories',
  'Minimalist Wardrobe',
  'Sustainable Fashion'
];

const RecommendationScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  // Search and API state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [searchMode, setSearchMode] = useState<'input' | 'chat'>('input');
  
  // Product modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Ref for scrolling to bottom of chat
  const chatScrollRef = useRef<ScrollView>(null);
  
  // Colors based on theme - using app's red theme
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const accentColor = isDarkMode ? '#FF6D8E' : '#FF3B5C'; // Red accent
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const bubbleBgUser = isDarkMode ? '#FF4870' : '#EF3D47'; // User bubble - primary red
  const bubbleBgSystem = isDarkMode ? '#222232' : '#F2F2F7'; // System bubble - gray
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const inputBgColor = isDarkMode ? '#222232' : '#F5F5F5';
  
  // Check API connection on component mount and fetch user profile
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = await checkApiHealth();
        setApiConnected(isConnected);
      } catch (err) {
        setApiConnected(false);
      }
    };
    
    checkConnection();
    fetchUserProfile();
  }, []);

  // Fetch the user's profile and preferences
  const fetchUserProfile = async () => {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      return;
    }

    try {
      // Fetch user profile
      const profileDoc = await getDoc(doc(db, 'users', userId));
      const profileData = profileDoc.exists() ? profileDoc.data() : null;
      
      // Fetch user preferences
      const preferencesDoc = await getDoc(doc(db, 'user_preferences', userId));
      const preferencesData = preferencesDoc.exists() ? preferencesDoc.data() : null;
      
      // Combine profile and preferences
      const combinedProfile = {
        ...profileData,
        ...preferencesData
      };
      setUserProfile(combinedProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Perform product search and add to chat
  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Please enter a search term');
      return;
    }

    // Clear errors and start loading
    setError(null);
    setLoading(true);
    
    // Add user query to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: query,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => 
      // Limit to 5 messages (2 back-and-forth conversations plus current) 
      [...prev.slice(Math.max(0, prev.length - 4)), userMessage]
    );
    
    // Switch to chat mode
    setSearchMode('chat');
    
    // Scroll to bottom after a short delay to ensure the new message is rendered
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Check API connection if needed
      let isConnected = apiConnected;
      if (apiConnected === false || apiConnected === null) {
        isConnected = await checkApiHealth();
        setApiConnected(isConnected);
        
        if (!isConnected) {
          const errorMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            type: 'system',
            text: 'Sorry, I cannot connect to the fashion database right now. Please check your network connection and try again later.',
            timestamp: Date.now()
          };
          
          setChatMessages(prev => [...prev, errorMessage]);
          setLoading(false);
          setError('Cannot connect to recommendation service.');
          
          setTimeout(() => {
            chatScrollRef.current?.scrollToEnd({ animated: true });
          }, 100);
          
          return;
        }
      }
      
      // Proceed with search
      let results;
      
      try {
        results = await searchProducts(query, [0, 1000], 10, userProfile);
      } catch (apiError) {
        // If the API fails, use mock data for demo purposes
        console.log('Using mock data due to API error:', apiError);
        results = MOCK_PRODUCTS;
      }
      
      // Create system response with products
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: results && results.length > 0 
          ? `Here are some ${query.toLowerCase()} options I found for you:` 
          : `I couldn't find any ${query.toLowerCase()} that match your style. Maybe try a different search?`,
        timestamp: Date.now(),
        products: results && results.length > 0 ? results : undefined
      };
      
      // Add system message to chat
      setChatMessages(prev => [...prev, systemMessage]);
      
      // Clear query field for next search
      setQuery('');
      
    } catch (err) {
      // Handle errors with a system message
      const errorMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: 'Sorry, something went wrong with your search. Please try again with different keywords.',
        timestamp: Date.now()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      setError('Failed to fetch recommendations.');
    } finally {
      setLoading(false);
      
      // Scroll to bottom after a short delay to ensure the new message is rendered
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Handle suggested search
  const handleSuggestedSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setTimeout(() => handleSearch(), 100);
  };

  // Open product URL
  const openProductUrl = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Cannot open product page');
    });
  };
  
  // Show product preview modal
  const showProductPreview = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };
  
  // Close product preview modal
  const closeProductPreview = () => {
    setModalVisible(false);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300);
  };
  
  // Handle favoriting a product
  const handleFavoriteProduct = async (product: Product) => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        Alert.alert("Sign In Required", "Please sign in to favorite items");
        return;
      }
      
      console.log("Favoriting product:", JSON.stringify(product, null, 2));
      
      // Create a data object for saving to Firestore with guaranteed values
      const favoriteData = {
        userId: userId,
        productId: product.id || `product-${Date.now()}`, // Generate an ID if none exists
        name: product.name || "Unnamed Product",
        brand: product.site || 'Unknown Brand',
        price: typeof product.price === 'number' ? product.price : 0,
        imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
        url: product.url || '',
        favorited: new Date().toISOString(),
        description: product.description || '',
      };
      
      console.log("Saving favorite data:", JSON.stringify(favoriteData, null, 2));
      
      // Add to Firebase collection
      const collectionRef = collection(db, 'user_favorite_products');
      await addDoc(collectionRef, favoriteData);
      
      Alert.alert(
        "Added to Favorites", 
        "This item has been added to your favorites. You can view it in your closet.",
        [{ text: "View in Closet", onPress: () => navigation.navigate('ClosetTab') },
         { text: "OK", style: "cancel" }]
      );
    } catch (error) {
      console.error('Error saving favorite:', error);
      Alert.alert("Error", "Could not save to favorites. Please try again.");
    }
  };

  // Render a chat message
  const renderChatMessage = (message: ChatMessage, index: number) => {
    const isUser = message.type === 'user';
    const hasProducts = message.products && message.products.length > 0;
    
    return (
      <View 
        key={message.id} 
        style={[
          styles.chatMessageContainer,
          isUser ? styles.userMessageContainer : styles.systemMessageContainer
        ]}
      >
        {/* Message bubble */}
        <View 
          style={[
            styles.chatBubble,
            isUser 
              ? [styles.userBubble, { backgroundColor: bubbleBgUser }] 
              : [styles.systemBubble, { backgroundColor: bubbleBgSystem }]
          ]}
        >
          <Text 
            style={[
              styles.chatBubbleText,
              isUser 
                ? styles.userBubbleText 
                : [styles.systemBubbleText, { color: textColor }]
            ]}
          >
            {message.text}
          </Text>
        </View>
        
        {/* Product grid for system messages with products */}
        {hasProducts && (
          <View style={styles.productsGrid}>
            <Text style={[styles.productsGridTitle, { color: textColor }]}>
              {message.products && message.products.length} items found
            </Text>
            <FlatList
              data={message.products}
              renderItem={({ item, index }) => (
                <ProductItem
                  item={item}
                  index={index}
                  onPress={openProductUrl}
                  onLongPress={showProductPreview}
                  cardBgColor={cardBgColor}
                  textColor={textColor}
                  subTextColor={subTextColor}
                  mainColor={mainColor}
                />
              )}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToAlignment="center"
              snapToInterval={width * 0.75 + 20}
              contentContainerStyle={styles.productsCarouselContent}
              snapToOffsets={message.products.map((_, i) => i * (width * 0.75 + 20))}
              initialNumToRender={2}
            />
          </View>
        )}
      </View>
    );
  };

  // Render popular searches
  const renderPopularSearches = () => (
    <View style={styles.popularSearchesContainer}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Trending Searches
      </Text>
      <View style={styles.trendingTagsContainer}>
        {TRENDY_SEARCHES.map((search, index) => (
          <TouchableOpacity 
            key={index}
            style={[styles.trendingTag, { backgroundColor: inputBgColor, borderColor }]}
            onPress={() => handleSuggestedSearch(search)}
          >
            <Icon name="search-outline" size={14} color={subTextColor} style={styles.trendingTagIcon} />
            <Text style={[styles.trendingTagText, { color: textColor }]}>
              {search}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header - Only visible when no chat is active */}
      {chatMessages.length === 0 ? (
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Discover
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.chatHeaderContainer}>
          <TouchableOpacity 
            style={[styles.newChatButton, { backgroundColor: inputBgColor }]}
            onPress={() => {
              setChatMessages([]);
              setSearchMode('input');
              setQuery('');
            }}
          >
            <Icon name="arrow-back" size={20} color={mainColor} />
            <Text style={[styles.newChatButtonText, { color: mainColor }]}>
              New Search
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <KeyboardAvoidingView 
        style={styles.mainContent}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Chat content */}
        <ScrollView
          ref={chatScrollRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length > 0 ? (
            <>
              {/* Welcome message removed when chat starts */}
              
              {/* Chat messages */}
              {chatMessages.map(renderChatMessage)}
              
              {/* Loading indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={mainColor} size="large" />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>
                    Finding the perfect style...
                  </Text>
                </View>
              )}
            </>
          ) : (
            // Initial state - show popular searches
            <View style={styles.emptyStateContainer}>
              <View style={styles.welcomeContainer}>
                <Icon name="search-circle" size={80} color={mainColor} />
                <Text style={[styles.welcomeTitle, { color: textColor }]}>
                  Fashion Finder
                </Text>
                <Text style={[styles.welcomeText, { color: subTextColor }]}>
                  What are you looking for today?
                </Text>
              </View>
              
              {renderPopularSearches()}
              
              <View style={styles.tipsContainer}>
                <Text style={[styles.tipsTitle, { color: textColor }]}>
                  Try searching for:
                </Text>
                <View style={styles.tipsList}>
                  <View style={styles.tipItem}>
                    <Icon name="shirt-outline" size={18} color={mainColor} style={styles.tipIcon} />
                    <Text style={[styles.tipText, { color: subTextColor }]}>
                      Specific items like "summer dress" or "leather jacket"
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="color-palette-outline" size={18} color={mainColor} style={styles.tipIcon} />
                    <Text style={[styles.tipText, { color: subTextColor }]}>
                      Styles like "minimalist", "vintage" or "street style"
                    </Text>
                  </View>
                  <View style={styles.tipItem}>
                    <Icon name="albums-outline" size={18} color={mainColor} style={styles.tipIcon} />
                    <Text style={[styles.tipText, { color: subTextColor }]}>
                      Occasions like "office wear" or "date night outfit"
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Search input */}
        <View style={[styles.searchInputContainer, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: inputBgColor }]}>
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search for clothes, styles, trends..."
              placeholderTextColor={subTextColor}
              value={query}
              onChangeText={setQuery}
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
          </View>
          <TouchableOpacity 
            style={[
              styles.searchButton, 
              { backgroundColor: mainColor },
              !query.trim() && { opacity: 0.7 }
            ]}
            onPress={handleSearch}
            disabled={!query.trim() || loading}
          >
            <Icon name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {/* Product Details Modal */}
      <ProductDetailsModal 
        visible={modalVisible}
        item={selectedProduct}
        onClose={closeProductPreview}
        onOpenProduct={openProductUrl}
        onFavorite={handleFavoriteProduct}
        mainColor={mainColor}
        cardBgColor={cardBgColor}
        textColor={textColor}
        subTextColor={subTextColor}
        borderColor={borderColor}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  chatHeaderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  // Chat styles
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 30,
  },
  chatMessageContainer: {
    marginBottom: 24,
    maxWidth: '100%',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    marginLeft: 50,
  },
  systemMessageContainer: {
    alignItems: 'flex-start',
    marginRight: 10, // Reduced right margin to use more space
  },
  chatBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  userBubble: {
    borderBottomRightRadius: 4, // iMessage style
  },
  systemBubble: {
    borderBottomLeftRadius: 4, // iMessage style
  },
  chatBubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  systemBubbleText: {
    fontWeight: '400',
  },
  // Products grid styles
  productsGrid: {
    marginTop: 16,
    marginBottom: 12,
    width: '100%',
  },
  productsGridTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  productsCarouselContent: {
    paddingRight: 16,
    paddingBottom: 12,
  },
  productCard: {
    width: width * 0.75,
    height: 240,
    marginRight: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  productCardContent: {
    flex: 1,
  },
  productImageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCardImage: {
    width: '90%',
    height: '90%',
  },
  productCardDetails: {
    padding: 12,
    flex: 1,
  },
  productCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  productCardSite: {
    fontSize: 13,
  },
  priceTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Search input styles
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
  },
  clearButton: {
    padding: 6,
  },
  searchButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state and welcome
  emptyStateContainer: {
    flex: 1,
    paddingVertical: 30,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  // Popular searches
  popularSearchesContainer: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  trendingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  trendingTagIcon: {
    marginRight: 6,
  },
  trendingTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Tips
  tipsContainer: {
    marginVertical: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  tipsList: {
    marginTop: 10,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tipIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  tipText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  // Animation styles
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
    height: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    height: '85%', // Fixed height instead of maxHeight
    minHeight: 600, // Ensure minimum height on smaller screens
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalScrollContainer: {
    flex: 1,
    height: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
  },
  modalImage: {
    width: '100%',
    height: 200, // Increased height
  },
  modalDetails: {
    padding: 20, // Increased padding
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 30,
  },
  modalSiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSiteText: {
    marginLeft: 6,
    fontSize: 16,
    opacity: 0.7,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.85,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  favoriteButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  viewClosetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  viewClosetButtonText: {
    fontWeight: '500',
    fontSize: 15,
  },
  modalDivider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  // Additional details section
  additionalDetailsSection: {
    marginTop: 16,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  actionItem: {
    alignItems: 'center',
    padding: 12,
  },
  actionText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default RecommendationScreen;