import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  KeyboardAvoidingView,
  RefreshControl,
  InteractionManager
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../styles/themeprovider';
import { searchProducts, Product, checkApiHealth } from '../services/recommendationService';
import firestore from '@react-native-firebase/firestore';
import { db, auth } from '../Config/firebaseconfig';
import { useOptimizedProfile } from '../hooks/useOptimizedProfile';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { 
  getFashionAdvisorSessions, 
  FashionAdvisorSessionWithDetails 
} from '../services/fashionAdvisorChatService';
import LockOverlay from '../components/common/LockOverlay';
import { useGuestLock } from '../hooks/useGuestLock';

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const CATEGORY_CARD_WIDTH = width * 0.45;

// For TypeScript to recognize setTimeout as a global
declare const setTimeout: (callback: () => void, ms: number) => number;

// Measuring Tape Refresh Animation Component
const MeasuringTapeRefreshAnimation: React.FC<{
  mainColor: string;
  refreshing: boolean;
}> = ({ mainColor, refreshing }) => {
  const tapeAnim = useRef(new Animated.Value(0)).current;
  const numbersAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      // Start tape animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(tapeAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(tapeAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();

      // Numbers counting animation
      Animated.loop(
        Animated.timing(numbersAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: false
        })
      ).start();
    } else {
      tapeAnim.setValue(0);
      numbersAnim.setValue(0);
    }
  }, [refreshing, tapeAnim, numbersAnim]);

  const tapeTranslateX = tapeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100]
  });

  const currentMeasurement = numbersAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 99]
  });

  if (!refreshing) return null;

  return (
    <View style={styles.measuringTapeContainer}>
      <View style={[styles.tapeBody, { backgroundColor: mainColor + '20' }]}>
        <Animated.View 
          style={[
            styles.tapeMarker,
            { 
              backgroundColor: mainColor,
              transform: [{ translateX: tapeTranslateX }]
            }
          ]}
        />
        <View style={styles.tapeNumbers}>
          {[...Array(10)].map((_, i) => (
            <Text key={i} style={[styles.tapeNumber, { color: mainColor }]}>
              {i * 10}
            </Text>
          ))}
        </View>
      </View>
      <Text style={[styles.measurementText, { color: mainColor }]}>
        Measuring...
      </Text>
    </View>
  );
};

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
                onPress={() => navigation.navigate('ClosetTab' as never)}
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

// Professional greeting utilities
const getProfessionalGreeting = (userProfile?: any) => {
  const hour = new Date().getHours();
  const date = new Date();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  let timeOfDay = 'day';
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 17) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }
  
  // Extract first name from fullName or use userDisplayName
  let firstName: string | undefined;
  if (userProfile?.fullName) {
    firstName = userProfile.fullName.split(' ')[0];
  } else if (userProfile?.userDisplayName) {
    firstName = userProfile.userDisplayName;
  }
  
  if (firstName) {
    return {
      primary: `Good ${timeOfDay}, ${firstName}`,
      secondary: `${dayName} • Discover new styles`
    };
  }
  
  return {
    primary: 'Discover Fashion',
    secondary: `${dayName} • Explore trending styles`
  };
};



// Generate sophisticated personalized recommendations
const getPersonalizedRecommendations = (userProfile: any) => {
  if (!userProfile) return [];
  
  const recommendations = [];
  
  // Based on body type
  if (userProfile.bodyType === 'athletic') {
    recommendations.push({ 
      title: 'Tailored Athletic',
      description: 'Performance fits for your build',
      confidence: 94
    });
  }
  
  // Based on preferred brands
  if (userProfile.preferredBrands?.includes('nike')) {
    recommendations.push({ 
      title: 'Nike Innovation',
      description: 'Latest from your preferred brand',
      confidence: 88
    });
  }
  
  // Based on style preferences
  if (userProfile.stylePreferences?.includes('minimalist')) {
    recommendations.push({ 
      title: 'Minimalist Curation',
      description: 'Clean, essential designs',
      confidence: 91
    });
  }
  
  // Default sophisticated suggestions
  recommendations.push(
    { 
      title: 'Size Optimized',
      description: 'Perfect fit recommendations',
      confidence: 96
    },
    { 
      title: 'Trending Match',
      description: 'Popular items in your style',
      confidence: 85
    }
  );
  
  return recommendations.slice(0, 3);
};

// Smart assistant suggestions for enhanced search
const ASSISTANT_SUGGESTIONS = [
  {
    icon: 'person-outline',
    title: 'Style Consultation',
    description: 'Get personalized recommendations',
    query: 'personal styling consultation'
  },
  {
    icon: 'resize-outline',
    title: 'Size & Fit Guide',
    description: 'Find your perfect fit',
    query: 'sizing guide and fit recommendations'
  },
  {
    icon: 'trending-up-outline',
    title: 'Trend Analysis',
    description: 'Latest fashion insights',
    query: 'current fashion trends and analysis'
  },
  {
    icon: 'color-palette-outline',
    title: 'Color Matching',
    description: 'Colors that complement you',
    query: 'color coordination and matching'
  }
];

const RecommendationScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  // Search and API state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  // Use optimized profile with caching
  const { profile: userProfile, isInitialLoading: profileLoading, refresh: refreshProfile } = useOptimizedProfile();
  const [refreshing, setRefreshing] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [searchMode, setSearchMode] = useState<'input' | 'chat'>('input');
  
  // Chat history state
  const [recentSessions, setRecentSessions] = useState<FashionAdvisorSessionWithDetails[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Guest lock functionality
  const recommendationLock = useGuestLock({ 
    feature: 'personalized recommendations', 
    title: 'Get Personal Recommendations!',
    message: 'Sign in to get AI-powered style recommendations tailored just for you.'
  });
  
  // Product modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Enhanced search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAssistantSuggestions, setShowAssistantSuggestions] = useState(false);
  const [searchContainerExpanded, setSearchContainerExpanded] = useState(false);
  
  // Premium animation refs
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const searchContainerAnim = useRef(new Animated.Value(0)).current;
  const suggestionsAnim = useRef(new Animated.Value(0)).current;
  const cancelButtonAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const headerGradientAnim = useRef(new Animated.Value(0)).current;

  // Ref for scrolling to bottom of chat
  const chatScrollRef = useRef<ScrollView>(null);
  // Ref for search input
  const searchInputRef = useRef<TextInput>(null);
  
  // Enhanced colors with premium glassmorphism and gradients
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
  
  // Premium glassmorphism colors
  const { theme } = useTheme();
  const glassBgColor = theme.glassmorphism.background;
  const glassBorderColor = theme.glassmorphism.border;
  const dimOverlayColor = isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)';
  
  // Fabric texture gradient colors
  const fabricTextureColors = isDarkMode 
    ? ['rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.02)']
    : ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.01)', 'rgba(0, 0, 0, 0.02)'];
  
  // Load recent chat sessions
  const loadRecentSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessions = await getFashionAdvisorSessions();
      // Only show last 2 sessions for the recommendation screen
      setRecentSessions(sessions.slice(0, 2));
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Check API connection on component mount and fetch user profile
  // Load data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🟢 RecommendationScreen focused - loading critical data');
      
      // Load critical data immediately
      const checkConnection = async () => {
        try {
          const isConnected = await checkApiHealth();
          setApiConnected(isConnected);
        } catch (err) {
          setApiConnected(false);
        }
      };
      
      checkConnection();
      
      // Load non-critical data after interactions complete
      const interactionPromise = InteractionManager.runAfterInteractions(() => {
        console.log('🔄 Loading non-critical data after interactions complete');
        loadRecentSessions(); // Load recent chat sessions - non-critical
        startPremiumAnimations(); // Start animations - non-critical
      });

      return () => {
        // Cleanup if user navigates away before interactions complete
        interactionPromise.cancel();
      };
    }, [])
  );

  // Premium animations on mount
  const startPremiumAnimations = () => {
    // Header gradient animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(headerGradientAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(headerGradientAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    ).start();
  };



  // Perform product search and add to chat
  const handleSearch = async (searchTerm?: string) => {
    const searchQuery = searchTerm || query;
    if (!searchQuery.trim()) {
      Alert.alert('Please enter a search term');
      return;
    }

    // Wait for profile to load before searching
    if (profileLoading) {
      console.log('⏳ DEBUG: Profile still loading, please wait...');
      Alert.alert('Loading Profile', 'Please wait while we load your preferences...');
      return;
    }

    // Clear errors and start loading
    setError(null);
    setLoading(true);
    
    // Add user query to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: searchQuery,
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
      let advisorMessage: string | undefined;
      

      
      try {
        const searchResponse = await searchProducts(searchQuery, [0, 1000], 10, userProfile);
        results = searchResponse.products;
        advisorMessage = searchResponse.advisorMessage;
      } catch (apiError) {
        // Check if this is a rate limit error
        const isRateLimit = (apiError as any)?.isRateLimit === true;
        const resetTime = (apiError as any)?.resetTime || 'midnight UTC';
        
        if (isRateLimit) {
          const errorMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            type: 'system',
            text: `${apiError instanceof Error ? apiError.message : 'Daily limit reached'}\n\nYour limits will reset at ${resetTime}.`,
            timestamp: Date.now()
          };
          setChatMessages(prev => [...prev, errorMessage]);
          setLoading(false);
          setError('Rate limit reached. Please try again later.');
          setTimeout(() => {
            chatScrollRef.current?.scrollToEnd({ animated: true });
          }, 100);
          return;
        } else if (apiError instanceof Error && apiError.message.includes('Authentication failed')) {
          const errorMessage: ChatMessage = {
            id: `system-${Date.now()}`,
            type: 'system',
            text: 'Please sign in to get personalized recommendations.',
            timestamp: Date.now()
          };
          setChatMessages(prev => [...prev, errorMessage]);
          setLoading(false);
          setError('Authentication required.');
          setTimeout(() => {
            chatScrollRef.current?.scrollToEnd({ animated: true });
          }, 100);
          return;
        }
        
        // If the API fails for other reasons, use mock data for demo purposes
        console.log('Using mock data due to API error:', apiError);
        results = MOCK_PRODUCTS;
      }
      
      // Create system response with products
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: results && results.length > 0 
          ? (advisorMessage || `Here are some ${searchQuery.toLowerCase()} options I found for you:`)
          : `I couldn't find any ${searchQuery.toLowerCase()} that match your style. Maybe try a different search?`,
        timestamp: Date.now(),
        products: results && results.length > 0 ? results : undefined
      };
      
      // Add system message to chat
      setChatMessages(prev => [...prev, systemMessage]);
      
      // Clear query field for next search (only if no searchTerm was provided)
      if (!searchTerm) {
        setQuery('');
      } else {
        setQuery(searchTerm);
      }
      
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
    handleSearch(searchTerm);
  };

  // Enhanced search focus handlers with smooth professional animations
  const handleSearchFocus = () => {
    setSearchFocused(true);
    setSearchContainerExpanded(true);
    
    if (!query.trim()) {
      setShowAssistantSuggestions(true);
    }
    
    // Smooth coordinated animations
    Animated.parallel([
      // Search container expansion
      Animated.timing(searchContainerAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: false
      }),
      // Focus state animation
      Animated.timing(searchFocusAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false
      }),
      // Cancel button slide in
      Animated.spring(cancelButtonAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100
      }),
      // Overlay fade in
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start();
    
    // Suggestions appear with delay
    if (!query.trim()) {
      setTimeout(() => {
        Animated.spring(suggestionsAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100
        }).start();
      }, 150);
    }
  };

  const handleSearchBlur = () => {
    // Don't blur if user is interacting with suggestions
    if (showAssistantSuggestions) {
      return;
    }
    
    setSearchFocused(false);
    setSearchContainerExpanded(false);
    setShowAssistantSuggestions(false);
    
    // Smooth coordinated exit animations
    Animated.parallel([
      Animated.timing(searchContainerAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: false
      }),
      Animated.timing(searchFocusAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false
      }),
      Animated.timing(cancelButtonAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleAssistantSuggestion = (suggestion: any) => {
    setQuery(suggestion.query);
    setShowAssistantSuggestions(false);
    
    // Smooth collapse and then search
    Animated.parallel([
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(searchContainerAnim, {
        toValue: 0.3, // Partial collapse during search
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false
      })
    ]).start(() => {
      handleSearch(suggestion.query);
    });
  };

  // Smooth cancel animation
  const handleSearchCancel = () => {
    searchInputRef.current?.blur();
    setQuery('');
    setSearchFocused(false);
    setSearchContainerExpanded(false);
    setShowAssistantSuggestions(false);
    
    // Smooth exit animations
    Animated.parallel([
      Animated.timing(searchContainerAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: false
      }),
      Animated.timing(cancelButtonAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(suggestionsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  // Premium pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-fetch user profile using optimized hook
      await refreshProfile();
      // Reload recent chat sessions
      await loadRecentSessions();
      // Simulate refresh delay for premium feel
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
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
  
  // Handle session click to continue conversation
  const handleSessionPress = (session: FashionAdvisorSessionWithDetails) => {
    recommendationLock.lockAction(() => {
      navigation.navigate('FashionAdvisorChat' as never, {
        sessionId: session.id
      } as never);
    });
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
      await db.collection('user_favorite_products').add(favoriteData);
      
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

  // Recent chat history with sophisticated design
  const renderRecentChatHistory = () => {
    return (
      <View style={styles.categoriesContainer}>
        {/* Recent Conversations */}
        {recentSessions.length > 0 && (
          <View style={styles.personalizedSection}>
            <View style={styles.professionalSectionHeader}>
              <Text style={[styles.sectionTitleProfessional, { color: textColor }]}>
                Recent Conversations
              </Text>
              <Text style={[styles.sectionSubtitle, { color: subTextColor }]}>
                Continue your fashion advisor chats
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {recentSessions.map((session, index) => (
                <TouchableOpacity 
                  key={`session-${session.id}`}
                  style={[styles.recommendationCard, { backgroundColor: cardBgColor, borderColor }]}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: textColor }]}>
                        {session.title}
                      </Text>
                      <View style={[styles.chatBadge, { backgroundColor: mainColor + '20' }]}>
                        <Icon name="chatbubbles" size={14} color={mainColor} />
                      </View>
                    </View>
                    <Text style={[styles.cardDescription, { color: subTextColor }]}>
                      {session.preview}
                    </Text>
                    <Text style={[styles.sessionTime, { color: subTextColor }]}>
                      {session.lastMessageTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Fabric texture background */}
      <LinearGradient
        colors={fabricTextureColors}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      />
      
      {/* Professional Header - Only visible when no chat is active */}
      {chatMessages.length === 0 ? (
        <View style={[styles.professionalHeader, { borderBottomColor: borderColor }]}>
          <View style={styles.headerContent}>
            <View style={styles.professionalHeaderContainer}>
              {(() => {
                const greeting = getProfessionalGreeting(userProfile);
                return (
                  <>
                    <Text style={[styles.professionalHeaderTitle, { color: textColor }]}>
                      {greeting.primary}
                    </Text>
                    <Text style={[styles.professionalHeaderSubtitle, { color: subTextColor }]}>
                      {greeting.secondary}
                    </Text>
                  </>
                );
              })()}
              <Animated.View
                style={[
                  styles.professionalHeaderAccent,
                  {
                    opacity: headerGradientAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.0]
                    })
                  }
                ]}
              >
                <LinearGradient
                  colors={[mainColor, accentColor]}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="transparent"
              colors={["transparent"]}
              progressBackgroundColor="transparent"
            />
          }
        >
          {/* Custom Measuring Tape Refresh Animation */}
          <MeasuringTapeRefreshAnimation 
            mainColor={mainColor} 
            refreshing={refreshing} 
          />
          
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
            // Professional initial state
            <View style={styles.professionalEmptyState}>
              <View style={styles.professionalWelcome}>
                <View style={styles.searchIconContainer}>
                  <Icon name="search" size={32} color={mainColor} />
                </View>
                <Text style={[styles.professionalWelcomeTitle, { color: textColor }]}>
                  Discover Your Style
                </Text>
                <Text style={[styles.professionalWelcomeSubtitle, { color: subTextColor }]}>
                  Search through thousands of curated fashion items
                </Text>
              </View>
              
              {renderRecentChatHistory()}
              
              <View style={styles.professionalTipsContainer}>
                <Text style={[styles.professionalTipsTitle, { color: textColor }]}>
                  Try Natural Conversations
                </Text>
                <View style={styles.professionalTipsList}>
                  <View style={styles.professionalTipItem}>
                    <View style={[styles.tipDot, { backgroundColor: mainColor }]} />
                    <Text style={[styles.professionalTipText, { color: subTextColor }]}>
                      "I need a bohemian outfit for a music festival"
                    </Text>
                  </View>
                  <View style={styles.professionalTipItem}>
                    <View style={[styles.tipDot, { backgroundColor: mainColor }]} />
                    <Text style={[styles.professionalTipText, { color: subTextColor }]}>
                      "What should I wear to impress at a job interview?"
                    </Text>
                  </View>
                  <View style={styles.professionalTipItem}>
                    <View style={[styles.tipDot, { backgroundColor: mainColor }]} />
                    <Text style={[styles.professionalTipText, { color: subTextColor }]}>
                      "Show me cozy fall outfits under $200"
                    </Text>
                  </View>
                  <View style={styles.professionalTipItem}>
                    <View style={[styles.tipDot, { backgroundColor: mainColor }]} />
                    <Text style={[styles.professionalTipText, { color: subTextColor }]}>
                      "I want to look trendy but professional"
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Enhanced Search with Integrated Assistant */}
        {/* Simple Search Bar that navigates to Chat */}
        <View style={[styles.searchNavigationContainer, { backgroundColor: bgColor }]}>
          <TouchableOpacity 
            style={[
              styles.searchNavigationButton,
              {
                backgroundColor: glassBgColor,
                borderColor: glassBorderColor,
                ...theme.elevation.medium,
              }
            ]}
            onPress={() => {
              recommendationLock.lockAction(() => {
                navigation.navigate('FashionAdvisorChat' as never, { initialQuery: query });
              });
            }}
            activeOpacity={0.8}
          >
            <Icon name="search" size={20} color={subTextColor} style={styles.searchIcon} />
            <Text style={[styles.searchPlaceholder, { color: subTextColor }]}>
              "I need an outfit for a dinner date..."
            </Text>
            <View style={[styles.chatIconContainer, { backgroundColor: mainColor + '15' }]}>
              <Icon name="chatbubbles" size={18} color={mainColor} />
            </View>
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
      
      {/* Guest Lock Overlay */}
      <LockOverlay {...recommendationLock.lockProps} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Professional Header Styles
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  premiumHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  professionalHeader: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 0.5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dynamicHeaderContainer: {
    flex: 1,
  },
  professionalHeaderContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  dynamicHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  professionalHeaderTitle: {
    fontSize: 32,
    fontWeight: '300',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  professionalHeaderSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.8,
    marginBottom: 16,
  },
  headerUnderline: {
    height: 3,
    width: '60%',
    borderRadius: 2,
    marginTop: 4,
  },
  professionalHeaderAccent: {
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  // Section Title with Color Bar
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
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
    width: width * 0.72,
    height: 300,
    marginRight: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  productCardContent: {
    flex: 1,
  },
  productImageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    margin: 8,
    marginBottom: 4,
  },
  productCardImage: {
    width: '85%',
    height: '85%',
    borderRadius: 16,
  },
  productCardDetails: {
    padding: 20,
    flex: 1,
    justifyContent: 'space-between',
  },
  productCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productCardPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  productCardSite: {
    fontSize: 14,
    opacity: 0.7,
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
  // Simple Search Navigation Styles
  searchNavigationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchNavigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  chatIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Professional Empty State and Welcome
  emptyStateContainer: {
    flex: 1,
    paddingVertical: 30,
  },
  professionalEmptyState: {
    flex: 1,
    paddingVertical: 32,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  professionalWelcome: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 24,
  },
  searchIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 61, 71, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#EF3D47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 8,
  },
  professionalWelcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  professionalWelcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 24,
    opacity: 0.8,
  },
  // Professional Categories and Sections
  popularSearchesContainer: {
    marginVertical: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
  },
  personalizedSection: {
    marginBottom: 32,
  },
  trendingSection: {
    marginBottom: 24,
  },
  professionalSectionHeader: {
    marginBottom: 20,
  },
  sectionTitleProfessional: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: '400',
  },
  personalizedTrendsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  // Professional Recommendation Cards
  horizontalScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  recommendationCard: {
    width: 320,
    minHeight: 160,
    marginRight: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 26,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionTime: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.7,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.75,
  },
  trendingTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Professional Category Grid
  // categoriesGrid: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   justifyContent: 'space-between',
  // },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    minHeight: 180,
    // marginBottom: 20, // removed for horizontal ScrollView
    marginRight: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  trendIndicator: {
    alignItems: 'flex-end',
  },
  risingTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 61, 71, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stableTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(117, 117, 117, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  categoryDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.75,
    flex: 1,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.6,
    textTransform: 'uppercase',
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
  // Premium Trending Pill Styles
  premiumTrendingTag: {
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trendingTagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  trendingTagGlyph: {
    fontSize: 16,
    marginRight: 8,
  },
  premiumTrendingTagText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  liveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Personalized Trends Styles
  personalizedTrendingTag: {
    borderRadius: 24,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  personalizedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  personalizedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Professional Tips
  tipsContainer: {
    marginVertical: 20,
  },
  professionalTipsContainer: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  professionalTipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tipsList: {
    marginTop: 10,
  },
  professionalTipsList: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  professionalTipItem: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  tipIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    marginTop: 7,
  },
  tipText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  professionalTipText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
    opacity: 0.8,
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
  // Measuring Tape Refresh Animation Styles
  measuringTapeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  tapeBody: {
    width: 200,
    height: 30,
    borderRadius: 15,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tapeMarker: {
    position: 'absolute',
    width: 4,
    height: '100%',
    top: 0,
    left: '50%',
    marginLeft: -2,
  },
  tapeNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tapeNumber: {
    fontSize: 8,
    fontWeight: '600',
    opacity: 0.7,
  },
  measurementText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
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
    width: '92%',
    height: '85%', // Fixed height instead of maxHeight
    minHeight: 600, // Ensure minimum height on smaller screens
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    padding: 24, // Increased padding
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
  // Cancel button styles
  cancelButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RecommendationScreen;