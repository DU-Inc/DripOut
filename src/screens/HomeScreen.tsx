import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  Animated,
  View,
  StatusBar,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TextInput,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  PanResponder,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/NavigationTypes';
// import { useNavigation } from '@react-navigation/native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
// import { auth } from '../Config/firebaseconfig';
// Using View with background color instead of LinearGradient
import { fetchRandomProducts, Product } from '../services/productService';
import PartialDataProductCard from '../components/feed/PartialDataProductCard';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Set default text styles
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  letterSpacing: 0.1,
};

import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../styles/theme/ThemeContext';

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const swipeThreshold = width * 0.3; // 30% of screen width

// Mock stories data for the stories carousel
const STORIES = [
  {
    id: '1',
    username: 'minimalist_me',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format',
    image: 'https://images.unsplash.com/photo-1535576434247-0d7e8411daa3?q=80&w=400&auto=format',
    viewed: false
  },
  {
    id: '2',
    username: 'vintage_vibes',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=120&auto=format',
    image: 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?q=80&w=400&auto=format',
    viewed: true
  },
  {
    id: '3',
    username: 'streetwear_daily',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format',
    image: 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?q=80&w=400&auto=format',
    viewed: false
  },
  {
    id: '4',
    username: 'fashion_forward',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format',
    image: 'https://images.unsplash.com/photo-1491349174775-aaafddd81942?q=80&w=400&auto=format',
    viewed: false
  },
  {
    id: '5',
    username: 'your_story',
    avatar: 'https://images.unsplash.com/photo-1553514029-1318c9127859?q=80&w=120&auto=format',
    image: '',
    isAdd: true,
    viewed: false
  }
];

// Initial empty fashion posts (will be populated from API)
const FASHION_POSTS = Array.from({ length: 4 }).map((_, i) => {
  // Generate fake comments for fallback data
  const commentUsernames = ['grace_style', 'fashion_guru', 'trend_watcher', 'clothescritic'];
  const commentTexts = [
    'Love this aesthetic! Would definitely try combining these pieces.',
    'The color palette is perfect for this season.',
    'Where can I find something similar to that key piece?',
    'Been looking for this exact style inspiration, thanks for sharing!'
  ];
  
  const comments = Array.from({ length: 4 }).map((_, j) => ({
    id: `${i}-${j}`,
    username: commentUsernames[j % commentUsernames.length],
    text: commentTexts[j % commentTexts.length],
    timeAgo: `${j + 1}h ago`,
    likes: Math.floor(Math.random() * 20)
  }));
  
  // These will be replaced with API data
  return {
    id: `placeholder-${i}`,
    title: `Loading Product ${i + 1}...`,
    gallery: [
      `https://picsum.photos/800/1000?random=${i * 3 + 51}`
    ],
    aesthetic: 'Loading...',
    caption: 'Loading product information...',
    tags: ['#loading'],
    outfitItems: [
      {name: 'Loading...', brand: 'Loading...'}
    ],
    publishedDate: 'Today',
    comments,
    commentCount: comments.length,
    upvotes: 0,
    saves: 0,
    isSaved: false,
    isUpvoted: false,
    author: {
      username: 'loading_user',
      avatar: `https://i.pravatar.cc/150?img=${i + 10}`,
      isVerified: false
    }
  };
});

// Trending topics for the filter chips
const TRENDING_TOPICS = [
  'For You', 'Trending', 'Summer', 'Minimal', 'Vintage', 'Sustainable', 'Streetwear', 'Luxury'
];

// Data types
interface Author {
  username: string;
  avatar: string;
  isVerified: boolean;
}

interface FashionPost {
  id: string;
  title: string;
  gallery: string[];
  aesthetic: string;
  caption: string;
  tags: string[];
  outfitItems: Array<{name: string; brand: string}>;
  publishedDate: string;
  comments: Array<{id: string; username: string; text: string; timeAgo: string; likes: number}>;
  commentCount: number;
  upvotes: number;
  saves: number;
  isSaved: boolean;
  isUpvoted: boolean;
  author: Author;
}

interface Story {
  id: string;
  username: string;
  avatar: string;
  image: string;
  viewed: boolean;
  isAdd?: boolean;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isDarkMode } = useTheme();
  // const navigation = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('For You');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [randomProducts, setRandomProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [expandedContentAction, setExpandedContentAction] = useState<string | null>(null);
  const [fashionPosts, setFashionPosts] = useState<FashionPost[]>(FASHION_POSTS);
  
  // Animation values
  const commentAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  
  // Create refs for post animations
  const postAnimations = useRef<Record<string, Animated.Value>>({});
  const panXValues = useRef<Record<string, Animated.Value>>({});
  const panResponders = useRef<Record<string, any>>({});

  // Fetch random products from API
  const getRandomProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const products = await fetchRandomProducts(10); // Fetch 10 random products
      if (products.length > 0) {
        setRandomProducts(products);
        
        // Convert products to fashion posts format
        const newPosts = products.map((product, index) => {
          // Generate comments for this product
          const commentUsernames = ['grace_style', 'fashion_guru', 'trend_watcher', 'clothescritic'];
          const commentTexts = [
            'Love this style! Would definitely try this.',
            'The color is perfect for this season.',
            'Where can I find something similar to this?',
            'Been looking for something like this, thanks!'
          ];
          
          const comments = Array.from({ length: 4 }).map((_, j) => ({
            id: `${product.id}-${j}`,
            username: commentUsernames[j % commentUsernames.length],
            text: commentTexts[j % commentTexts.length],
            timeAgo: `${j + 1}h ago`,
            likes: Math.floor(Math.random() * 20)
          }));
          
          // Generate tags based on product details
          const tags = [];
          if (product.brand) tags.push(`#${product.brand.toLowerCase().replace(/\s+/g, '')}`);
          tags.push('#trending', '#newproduct', '#popular');
          
          // Create outfit items from the product
          const outfitItems = [
            {name: product.name || 'Product', brand: product.brand || 'Brand'}
          ];
          
          // Generate a random author
          const author = {
            username: 'dripout_official',
            avatar: `https://i.pravatar.cc/150?img=${index + 10}`,
            isVerified: true
          };
          
          return {
            id: product.id,
            title: product.name || `Fashion Item ${index + 1}`,
            gallery: product.images.map(img => img.url),
            aesthetic: product.brand || 'Trending',
            caption: `${product.brand}: ${product.name} - ${product.currency}${product.price}`,
            tags: tags,
            outfitItems: outfitItems,
            publishedDate: 'Today',
            comments: comments,
            commentCount: comments.length,
            upvotes: Math.floor(Math.random() * 500) + 100,
            saves: Math.floor(Math.random() * 200) + 50,
            isSaved: Math.random() > 0.5,
            isUpvoted: Math.random() > 0.6,
            author: author
          };
        });
        
        // Update the fashion posts state with the new product-based posts
        setFashionPosts(newPosts);
      }
    } catch (error) {
      console.error('Error fetching random products:', error);
      // If error, keep using default posts
      setFashionPosts(DEFAULT_FASHION_POSTS);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Fetch products on component mount
  useEffect(() => {
    getRandomProducts();
  }, [getRandomProducts]);

  // Refresh handler - refreshes fashion posts and random products
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Show loading state while refreshing
    setFashionPosts(DEFAULT_FASHION_POSTS);
    // Fetch new random products
    getRandomProducts().finally(() => {
      setRefreshing(false);
    });
  }, [getRandomProducts]);

  // Colors based on theme - using red theme
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const inputBgColor = isDarkMode ? '#222232' : '#F5F5F5';
  const iconColor = isDarkMode ? '#B8B8CC' : '#757575';
  const accentColor = isDarkMode ? '#FF6D8E' : '#FF3B5C'; // Red accent
  const saveColor = isDarkMode ? '#FFBA0D' : '#FFB100';
  const gradientStart = isDarkMode ? '#FF4870' : '#EF3D47';
  const gradientEnd = isDarkMode ? '#FF6D8E' : '#FF5B66';

  // Toggle post expansion
  const toggleExpandPost = (postId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPost(expandedPost === postId ? null : postId);
  };
  
  // Toggle comments section
  const toggleComments = (postId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedComments(expandedComments === postId ? null : postId);
  };

  // Cycle through gallery images
  const cycleGalleryImage = (postId: string, direction: 'next' | 'prev') => {
    const post = FASHION_POSTS.find(p => p.id === postId);
    if (!post) return;
    
    const currentIndex = activeGalleryIndex[postId] || 0;
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % post.gallery.length;
    } else {
      newIndex = (currentIndex - 1 + post.gallery.length) % post.gallery.length;
    }
    
    setActiveGalleryIndex({
      ...activeGalleryIndex,
      [postId]: newIndex
    });
  };
  
  // Initialize animations and pan responders for posts
  React.useEffect(() => {
    // Create animations for each post
    FASHION_POSTS.forEach((post, index) => {
      if (!postAnimations.current[post.id]) {
        const animatedValue = new Animated.Value(0);
        animatedValue.addListener(() => {});
        postAnimations.current[post.id] = animatedValue;
        
        // Start animation
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 400,
          delay: index * 80,
          useNativeDriver: true,
        }).start();
      }
      
      if (!panXValues.current[post.id]) {
        const panX = new Animated.Value(0);
        panX.addListener(() => {});
        panXValues.current[post.id] = panX;
      }
      
      if (!panResponders.current[post.id]) {
        panResponders.current[post.id] = createPanResponderForPost(post.id);
      }
    });
    
    // Configure header animation on scroll
    scrollY.addListener(({ value }) => {
      const headerOpacity = value > 50 ? Math.min((value - 50) / 30, 1) : 0;
      headerAnimation.setValue(headerOpacity);
    });
    
    // Clean up animations and listeners on unmount
    return () => {
      Object.keys(postAnimations.current).forEach(key => {
        if (postAnimations.current[key]) {
          postAnimations.current[key].removeAllListeners();
        }
      });
      
      Object.keys(panXValues.current).forEach(key => {
        if (panXValues.current[key]) {
          panXValues.current[key].removeAllListeners();
        }
      });
      
      scrollY.removeAllListeners();
    };
  }, []);
  
  // Create pan responder for post
  const createPanResponderForPost = (postId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panXValues.current[postId].setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        panXValues.current[postId].setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => handleSwipeEnd(postId, gestureState),
      onPanResponderTerminate: (_, gestureState) => handleSwipeEnd(postId, gestureState),
    });
  };
  
  // Handle swipe end
  const handleSwipeEnd = (postId: string, gestureState: { dx: number }) => {
    const { dx } = gestureState;
    const currentImageIndex = activeGalleryIndex[postId] || 0;
    const post = FASHION_POSTS.find(p => p.id === postId);
    
    if (!post) return;
    
    if (dx < -swipeThreshold && currentImageIndex < post.gallery.length - 1) {
      // Swipe left - go to next image
      cycleGalleryImage(postId, 'next');
    } else if (dx > swipeThreshold && currentImageIndex > 0) {
      // Swipe right - go to previous image
      cycleGalleryImage(postId, 'prev');
    }
    
    // Reset pan position
    Animated.spring(panXValues.current[postId], {
      toValue: 0,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Render a story item
  const renderStoryItem = ({ item }: { item: Story }) => {
    // Add story or normal story
    if (item.isAdd) {
      return (
        <TouchableOpacity style={styles.storyContainer}>
          <View style={[styles.storyAdd, { borderColor: mainColor }]}>
            <Icon name="add" size={24} color={mainColor} />
          </View>
          <Text style={[styles.storyUsername, { color: textColor }]} numberOfLines={1}>
            Add Story
          </Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity style={styles.storyContainer}>
        <View style={[
          styles.storyRing, 
          item.viewed 
            ? { borderColor: 'rgba(150, 150, 150, 0.3)' } 
            : { borderColor: mainColor }
        ]}>
          <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
        </View>
        <Text style={[styles.storyUsername, { color: textColor }]} numberOfLines={1}>
          {item.username}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render fashion inspiration post
  const renderFashionPost = ({ item, index }: { item: FashionPost; index: number }) => {
    // Use the pre-created animation value
    const animatedValue = postAnimations.current[item.id] || new Animated.Value(1);
    
    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    });

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    // Show loading state when refreshing or initial loading
    if ((refreshing || loadingProducts) && item.id.startsWith('placeholder-')) {
      return (
        <View style={[styles.postCard, { 
          backgroundColor: isDarkMode ? '#222232' : '#f5f5f5',
          height: 400,
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={{ color: textColor, marginTop: 10 }}>Loading products...</Text>
        </View>
      );
    }

    // Get current gallery image index for this post
    const currentImageIndex = activeGalleryIndex[item.id] || 0;
    const isExpanded = expandedPost === item.id;
    
    // Get the panX value for this post
    const panX = panXValues.current[item.id] || new Animated.Value(0);
    
    // Get the pan responder for this post
    const panResponder = panResponders.current[item.id];

    return (
      <Animated.View 
        style={[
          styles.postCard, 
          { 
            backgroundColor: cardBgColor,
            borderColor: borderColor,
            opacity,
            transform: [{ translateY }],
          }
        ]}
      >
        {/* Post Header with Author Info */}
        <View style={styles.postHeader}>
          <View style={styles.postAuthor}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                // Generate a stable user ID for the author
                const userId = `author_${item.id}`;
                
                // Check if this matches the current user
                const currentUser = auth().currentUser;
                const isCurrentUser = currentUser && 
                  (currentUser.displayName === item.author.username || 
                   currentUser.email?.split('@')[0] === item.author.username);
                
                if (isCurrentUser) {
                  // If it's the current user, navigate to ProfileTab
                  console.log('This is the current user, navigating to ProfileTab');
                  navigation.navigate('ProfileTab');
                } else {
                  // If it's another user, navigate to UserDetailScreen
                  console.log('This is another user, navigating to UserDetailScreen');
                  navigation.navigate('UserDetailScreen', { 
                    userId, 
                    username: item.author.username 
                  });
                }
              }}
            >
              <Image source={{ uri: item.author.avatar }} style={styles.authorAvatar} />
            </TouchableOpacity>
            
            <View style={styles.authorInfo}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  // Generate a stable user ID for the author
                  const userId = `author_${item.id}`;
                  
                  // Check if this matches the current user
                  const currentUser = auth().currentUser;
                  const isCurrentUser = currentUser && 
                    (currentUser.displayName === item.author.username || 
                     currentUser.email?.split('@')[0] === item.author.username);
                  
                  if (isCurrentUser) {
                    // If it's the current user, navigate to ProfileTab
                    console.log('This is the current user, navigating to ProfileTab');
                    navigation.navigate('ProfileTab');
                  } else {
                    // If it's another user, navigate to UserDetailScreen
                    console.log('This is another user, navigating to UserDetailScreen');
                    navigation.navigate('UserDetailScreen', { 
                      userId, 
                      username: item.author.username 
                    });
                  }
                }}
              >
                <View style={styles.authorNameRow}>
                  <Text style={[styles.authorUsername, { color: textColor }]}>
                    {item.author.username}
                  </Text>
                  {item.author.isVerified && (
                    <Icon name="checkmark-circle" size={14} color={mainColor} style={styles.verifiedBadge} />
                  )}
                </View>
              </TouchableOpacity>
              
              <Text style={[styles.postDate, { color: subTextColor }]}>
                {item.publishedDate}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Icon name="ellipsis-horizontal" size={20} color={subTextColor} />
          </TouchableOpacity>
        </View>

        {/* Fashion Image Gallery with swipe */}
        <Animated.View 
          style={[
            styles.galleryContainer,
            {
              transform: [
                { 
                  translateX: panX.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: [-width * 0.3, 0, width * 0.3],
                    extrapolate: 'clamp'
                  })
                }
              ]
            }
          ]}
          {...(panResponder ? panResponder.panHandlers : {})}
        >
          <Image 
            source={{ uri: item.gallery[currentImageIndex] }} 
            style={styles.galleryImage}
          />
          
          {/* Overlay shadow for aesthetic tag */}
          <View style={styles.galleryOverlay} />

          {/* Aesthetic Tag */}
          <View style={styles.aestheticContainer}>
            <View style={[
              styles.aestheticPill, 
              { backgroundColor: mainColor }
            ]}>
              <Text style={styles.aestheticText}>
                {item.aesthetic}
              </Text>
            </View>
          </View>
          
          {/* Image navigation dots */}
          {item.gallery.length > 1 && (
            <View style={styles.galleryDots}>
              {item.gallery.map((_, i) => (
                <View 
                  key={`dot-${i}`} 
                  style={[
                    styles.galleryDot, 
                    i === currentImageIndex && [
                      styles.activeDot,
                      { backgroundColor: mainColor }
                    ]
                  ]} 
                />
              ))}
            </View>
          )}
          
          {/* Gallery navigation */}
          {item.gallery.length > 1 && (
            <>
              {/* Swipe indicators */}
              <Animated.View 
                style={[
                  styles.swipeIndicator, 
                  styles.swipeIndicatorLeft,
                  {
                    opacity: panX.interpolate({
                      inputRange: [0, 50, 100],
                      outputRange: [0, 0.5, 0.8],
                      extrapolate: 'clamp'
                    })
                  }
                ]}
              >
                <Icon name="chevron-back" size={28} color="white" />
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.swipeIndicator, 
                  styles.swipeIndicatorRight,
                  {
                    opacity: panX.interpolate({
                      inputRange: [-100, -50, 0],
                      outputRange: [0.8, 0.5, 0],
                      extrapolate: 'clamp'
                    })
                  }
                ]}
              >
                <Icon name="chevron-forward" size={28} color="white" />
              </Animated.View>
            </>
          )}
        </Animated.View>

        {/* Post Content */}
        <View style={styles.postContent}>
          {/* Title */}
          <Text style={[styles.postTitle, { color: textColor }]}>
            {item.title}
          </Text>
          
          {/* Caption */}
          <TouchableOpacity 
            onPress={() => toggleExpandPost(item.id)}
            activeOpacity={0.9}
          >
            <Text style={[styles.postCaption, { color: subTextColor }]}>
              {isExpanded ? item.caption : (
                item.caption.length > 120 ? 
                  item.caption.substring(0, 120) + '... ' : 
                  item.caption
              )}
              {!isExpanded && item.caption.length > 120 && (
                <Text 
                  style={[styles.readMoreText, { color: mainColor }]}
                >
                  Read More
                </Text>
              )}
            </Text>
          </TouchableOpacity>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            <FlatList
              data={item.tags}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(tag, index) => `tag-${index}`}
              renderItem={({ item: tag }) => (
                <TouchableOpacity
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 72, 112, 0.1)'
                        : 'rgba(239, 61, 71, 0.08)',
                      borderColor: isDarkMode
                        ? 'rgba(255, 72, 112, 0.2)'
                        : 'rgba(239, 61, 71, 0.15)',
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: mainColor }]}> {tag} </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Featured Pieces - Collapsed by Default */}
          <TouchableOpacity 
            style={[styles.featuredHeader, { borderTopColor: borderColor }]}
            onPress={() => toggleExpandPost(item.id)}
          >
            <Text style={[styles.featuredTitle, { color: textColor }]}>
              Featured Pieces
            </Text>
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={subTextColor} 
            />
          </TouchableOpacity>
          
          {/* Outfit Items - Only Shown When Expanded */}
          {isExpanded && (
            <View style={styles.outfitItems}>
              {item.outfitItems.map((piece, i) => (
                <View 
                  key={`piece-${i}`}
                  style={[styles.outfitItem, { borderColor: borderColor }]}
                >
                  <View style={[styles.itemIconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.1)' : 'rgba(239, 61, 71, 0.08)' }]}>
                    <Icon 
                      name={['shirt', 'apps', 'footsteps', 'glasses'][i % 4]} 
                      size={18} 
                      color={mainColor} 
                    />
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>
                      {piece.name}
                    </Text>
                    <Text style={[styles.itemBrand, { color: mainColor }]}>
                      {piece.brand}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Post Actions */}
          <View style={[styles.postActions, { borderTopColor: borderColor }]}>
            <View style={styles.actionGroup}>
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  item.isUpvoted && { backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.15)' : 'rgba(239, 61, 71, 0.08)' }
                ]}
              >
                <Icon 
                  name={item.isUpvoted ? "heart" : "heart-outline"} 
                  size={22} 
                  color={item.isUpvoted ? mainColor : iconColor} 
                />
                <Text style={[
                  styles.actionText, 
                  { color: item.isUpvoted ? mainColor : subTextColor }
                ]}>
                  {item.upvotes}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  expandedComments === item.id && { 
                    backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.15)' : 'rgba(239, 61, 71, 0.08)',
                  }
                ]}
                onPress={() => toggleComments(item.id)}
              >
                <Icon 
                  name="chatbubble-outline" 
                  size={20} 
                  color={expandedComments === item.id ? mainColor : iconColor} 
                />
                <Text style={[
                  styles.actionText, 
                  { color: expandedComments === item.id ? mainColor : subTextColor }
                ]}>
                  {item.commentCount}
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.saveButton,
                item.isSaved && { backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.15)' : 'rgba(239, 61, 71, 0.08)' }
              ]}
            >
              <Icon 
                name={item.isSaved ? "bookmark" : "bookmark-outline"} 
                size={20} 
                color={item.isSaved ? mainColor : iconColor} 
              />
            </TouchableOpacity>
          </View>

          {/* Comments Section - Expanded When Toggled */}
          {expandedComments === item.id && (
            <View style={styles.commentsSection}>
              <View style={styles.commentsList}>
                {item.comments.slice(0, 2).map((comment) => (
                  <View 
                    key={comment.id} 
                    style={styles.commentItem}
                  >
                    <Text style={[styles.commentUsername, { color: textColor }]}>
                      {comment.username}
                    </Text>
                    <Text style={[styles.commentText, { color: subTextColor }]}>
                      {comment.text}
                    </Text>
                  </View>
                ))}
                
                {item.comments.length > 2 && (
                  <TouchableOpacity 
                    style={styles.viewMoreComments}
                  >
                    <Text style={[styles.viewMoreText, { color: mainColor }]}>
                      View all {item.commentCount} comments
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Add comment input */}
              <View style={styles.addCommentRow}>
                <View style={[styles.commentInputContainer, { backgroundColor: inputBgColor }]}>
                  <TextInput
                    placeholder="Add a comment..."
                    placeholderTextColor={subTextColor}
                    style={[styles.commentInput, { color: textColor }]}
                  />
                  <TouchableOpacity style={styles.postCommentButton}>
                    <Icon name="paper-plane-outline" size={18} color={mainColor} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  // Render a trending topic chip
  const renderTrendingTopic = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.topicChip,
        selectedTopic === item ? 
          { backgroundColor: mainColor } : 
          { backgroundColor: isDarkMode ? 'rgba(34, 34, 50, 0.8)' : '#F0F0F0' }
      ]}
      onPress={() => setSelectedTopic(item)}
    >
      <Text 
        style={[
          styles.topicText, 
          { color: selectedTopic === item ? 'white' : textColor }
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Animated header background opacity
  const headerBgOpacity = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.headerContainer}>
          {/* Animated Background */}
          <Animated.View 
            style={[
              styles.headerBackground, 
              { 
                backgroundColor: cardBgColor,
                borderBottomColor: borderColor,
                opacity: headerBgOpacity 
              }
            ]} 
          />

          {/* Header Content */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                DripOut
              </Text>
              <View style={styles.headerSubtitleRow}>
                <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
                  Your Style Feed
                </Text>
                {loadingProducts && (
                  <ActivityIndicator 
                    size="small" 
                    color={mainColor} 
                    style={styles.smallLoadingIndicator} 
                  />
                )}
              </View>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => navigation.navigate('ResetAuth')}
              >
                <Icon name="refresh-circle-outline" size={24} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="notifications-outline" size={24} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Icon name="search-outline" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <Animated.FlatList
          data={fashionPosts}
          renderItem={renderFashionPost}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={mainColor}
              colors={[mainColor]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Stories Row */}
              <View style={styles.storiesContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesList}
                >
                  {STORIES.map(item => renderStoryItem({ item }))}
                </ScrollView>
              </View>

              {/* Topic/Filter Pills */}
              <View style={styles.topicsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topicsList}
                >
                  {TRENDING_TOPICS.map(item => renderTrendingTopic({ item }))}
                </ScrollView>
              </View>
              
              {/* Show loading indicator when fetching products */}
              {loadingProducts && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={mainColor} style={styles.loadingIndicator} />
                </View>
              )}
            </>
          }
          ListFooterComponent={
            <View style={{ height: 90 }} />
          }
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tagsScrollContent: {
    flexDirection: 'row',
    paddingRight: 8,
  },
  headerContainer: {
    position: 'relative',
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderBottomWidth: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallLoadingIndicator: {
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Stories
  storiesContainer: {
    marginVertical: 12,
  },
  storiesList: {
    paddingHorizontal: 16,
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 74,
  },
  storyRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAdd: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  storyUsername: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  
  // Topics
  topicsContainer: {
    marginBottom: 16,
  },
  topicsList: {
    paddingHorizontal: 16,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Loading indicator
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  
  // Feed content
  listContent: {
    paddingVertical: 8,
  },
  
  // Post Card
  postCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  authorInfo: {
    marginLeft: 10,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  postDate: {
    fontSize: 12,
    marginTop: 2,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Gallery
  galleryContainer: {
    position: 'relative',
    height: width,
    backgroundColor: '#e0e0e0',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  galleryDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicatorLeft: {
    left: 20,
  },
  swipeIndicatorRight: {
    right: 20,
  },
  
  // Aesthetic Tag
  aestheticContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  aestheticPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aestheticText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Post Content
  postContent: {
    padding: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  postCaption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  readMoreText: {
    fontWeight: '600',
  },
  
  // Tags
  tagsContainer: {
    marginBottom: 16,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Featured Pieces
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  outfitItems: {
    marginTop: 12,
  },
  outfitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemBrand: {
    fontSize: 12,
    marginTop: 2,
  },
  
  // Post Actions
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  actionGroup: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  saveButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Comments
  commentsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  commentsList: {
    marginBottom: 16,
  },
  commentItem: {
    marginBottom: 10,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  viewMoreComments: {
    marginTop: 6,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  commentInput: {
    flex: 1,
    height: 36,
    paddingVertical: 8,
    fontSize: 14,
  },
  postCommentButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;