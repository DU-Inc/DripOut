// src/screens/SocialScreen.tsx

import React, { useRef, useState, useEffect } from 'react';
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
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { Timestamp } from 'firebase/firestore';

// Add global setTimeout type declaration
declare const setTimeout: (callback: () => void, ms: number) => number;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
// No longer need custom bottom navigation bar with tab navigator
import { useTheme } from '../styles/theme/ThemeContext';

import { getCachedFeedPosts, Post } from '../services/postService';
import { getUserProfile, UserProfile } from '../services/firestoreService';
import { formatDistanceToNow } from 'date-fns';

// Add type definition for fashion post (enhanced post with UI properties)
interface FashionPost {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  title?: string;
  gallery: string[];
  aesthetic?: string;
  caption: string;
  tags: string[];
  outfitItems?: Array<{
    name: string;
    brand: string;
  }>;
  publishedDate: string;
  comments: Array<{
    id: string;
    username: string;
    text: string;
    timeAgo: string;
    likes: number;
  }>;
  commentCount: number;
  upvotes: number;
  saves: number;
  isSaved: boolean;
  isUpvoted: boolean;
  createdAt?: any;
}

// Generate sample comments for posts without comments yet
const generateSampleComments = (postId: string) => {
  const commentUsernames = ['grace_style', 'fashion_guru', 'trend_watcher', 'clothescritic', 'runway_fan', 'style_seeker'];
  const commentTexts = [
    'Love this! Would definitely try this style.',
    'The color palette is perfect for this season.',
    'Where can I find something similar to that?',
    'Been looking for this exact style inspiration, thanks for sharing!',
    'Already saved this to my collection, great post!',
    'The silhouette is so flattering, going to try this look tomorrow.'
  ];
  
  return Array.from({ length: Math.floor(Math.random() * 3) + 2 }).map((_, j) => ({
    id: `${postId}-${j}`,
    username: commentUsernames[Math.floor(Math.random() * commentUsernames.length)],
    text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
    timeAgo: `${Math.floor(Math.random() * 12) + 1}h ago`,
    likes: Math.floor(Math.random() * 20)
  }));
};

// These are style aesthetics to assign to posts
const STYLE_AESTHETICS = [
  'Minimalist',
  'Vintage Revival',
  'Modern Classic',
  'Scandinavian',
  'Tech Streetwear',
  'Sustainable Luxury',
  'Urban Chic',
  'Boho',
  'Preppy',
  'Athleisure'
];

// Trending topics for the filter chips
const TRENDING_TOPICS = [
  'All', 'Minimalism', 'Summer', 'Workwear', 'Vintage', 'Sustainable', 'Streetwear'
];

const { width } = Dimensions.get('window');
const swipeThreshold = width * 0.3; // 30% of screen width

type SocialScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SocialScreen: React.FC = () => {
  const navigation = useNavigation<SocialScreenNavigationProp>();
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  
  // State for real data
  const [firebasePosts, setFirebasePosts] = useState<Post[]>([]);
  const [fashionPosts, setFashionPosts] = useState<FashionPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use individual animation values for simplicity
  const [commentHeights] = useState<Record<string, number>>({});
  const commentAnimation = useRef(new Animated.Value(0)).current;
  
  // Create refs for post animations
  const postAnimations = useRef<Record<string, Animated.Value>>({});
  const panXValues = useRef<Record<string, Animated.Value>>({});
  const panResponders = useRef<Record<string, any>>({});

  // Helper function to safely create a complete FashionPost object with defaults
  const createFashionPost = (post: any): FashionPost => {
    // Default gallery with placeholder if needed
    const gallery = post?.imageUrl 
      ? [post.imageUrl] 
      : ['https://via.placeholder.com/400'];
      
    // Add random second image sometimes
    if (post?.imageUrl && Math.random() > 0.5) {
      gallery.push(`https://picsum.photos/800/1000?random=${Math.floor(Math.random() * 100)}`);
    }
    
    // Default caption
    const caption = post?.caption || 'Fashion inspiration';
    
    // Default title from first sentence of caption
    let title = '';
    try {
      if (caption) {
        const firstSentence = caption.split('.')[0];
        title = firstSentence && firstSentence.length > 30 
          ? firstSentence.substring(0, 30) + '...' 
          : firstSentence;
      }
    } catch (e) {
      title = 'Fashion inspiration';
    }
    
    // Format date safely
    let publishedDate = '1 day ago';
    if (post?.createdAt) {
      try {
        const timestamp = post.createdAt;
        if (timestamp && typeof timestamp.toDate === 'function') {
          publishedDate = formatDistanceToNow(timestamp.toDate()) + ' ago';
        } else if (timestamp && typeof timestamp.seconds === 'number') {
          publishedDate = formatDistanceToNow(new Date(timestamp.seconds * 1000)) + ' ago';
        } else if (timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number') {
          publishedDate = formatDistanceToNow(new Date(timestamp)) + ' ago';
        }
      } catch (e) {
        console.warn('Date formatting error:', e);
      }
    }
    
    // Default tag formatting
    const formattedTags = ((post?.tags || []) as any[])
      .filter((tag: any) => typeof tag === 'string')
      .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`);
    
    // Random aesthetic if none provided
    const aesthetic = STYLE_AESTHETICS[Math.floor(Math.random() * STYLE_AESTHETICS.length)];
    
    // Default outfit items
    const outfitItems = (post?.outfitItems && Array.isArray(post?.outfitItems) && post.outfitItems.length > 0)
      ? post.outfitItems
      : [
          {name: 'Oversized Shirt', brand: 'COS'},
          {name: 'Slim Trousers', brand: 'Uniqlo'},
          {name: 'Minimal Sneakers', brand: 'Common Projects'},
          {name: 'Classic Watch', brand: 'Timex'}
        ];
    
    // Generate sample comments
    const comments = generateSampleComments(post?.id || Math.random().toString());
    
    // Return complete FashionPost with all required properties
    return {
      id: post?.id || Math.random().toString(),
      userId: post?.userId || 'unknown',
      username: post?.username || 'style_user',
      userAvatar: post?.userAvatar,
      title,
      gallery,
      aesthetic,
      caption,
      tags: formattedTags,
      outfitItems,
      publishedDate,
      comments,
      commentCount: comments.length,
      upvotes: post?.likes || Math.floor(Math.random() * 500) + 100,
      saves: Math.floor(Math.random() * 200) + 50,
      isSaved: Math.random() > 0.5,
      isUpvoted: Math.random() > 0.6,
      createdAt: post?.createdAt
    };
  };

  // Fetch posts from Firebase
  const fetchPosts = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      // Get posts from Firestore with caching
      const posts = await getCachedFeedPosts(forceRefresh);
      setFirebasePosts(posts);
      
      // Convert to FashionPost format with safe conversion
      const enhancedPosts = (posts || []).map(post => createFashionPost(post));
      
      setFashionPosts(enhancedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // If we have no posts, create an empty array
      setFashionPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPosts(true); // Force refresh from Firestore
    } finally {
      setRefreshing(false);
    }
  };

  // Colors based on theme
  const mainColor = isDarkMode ? '#FF6B6B' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const iconColor = isDarkMode ? '#B8B8CC' : '#757575';
  const accentColor = isDarkMode ? '#FF4870' : '#FF3B5C';
  const saveColor = isDarkMode ? '#FFBA0D' : '#FFB100';

  // Toggle post expansion (showing full caption)
  const toggleExpandPost = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };
  
  // Toggle comments section expansion - simplified approach
  const toggleComments = (postId: string) => {
    // Configure layout animation for smooth transitions
    LayoutAnimation.configureNext({
      duration: 300,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    
    // Simple toggle approach - just update state to show/hide comments
    if (expandedComments === postId) {
      // Collapse comments
      Animated.timing(commentAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setExpandedComments(null);
      });
    } else {
      // Reset animation value
      commentAnimation.setValue(0);
      
      // Set new expanded comments
      setExpandedComments(postId);
      
      // Animate expansion
      Animated.timing(commentAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Cycle through gallery images
  const cycleGalleryImage = (postId: string, direction: 'next' | 'prev') => {
    const post = fashionPosts?.find(p => p?.id === postId);
    if (!post || !post.gallery || !Array.isArray(post.gallery) || post.gallery.length === 0) return;
    
    const currentIndex = activeGalleryIndex[postId] || 0;
    let newIndex;
    
    const maxIndex = post.gallery.length - 1;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % (maxIndex + 1);
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
    if (!fashionPosts || !Array.isArray(fashionPosts)) return;
    
    fashionPosts.forEach((post, index) => {
      if (!post || !post.id) return;
      
      if (!postAnimations.current[post.id]) {
        const animatedValue = new Animated.Value(0);
        postAnimations.current[post.id] = animatedValue;
        
        // Start animation
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      }
      
      if (!panXValues.current[post.id]) {
        panXValues.current[post.id] = new Animated.Value(0);
      }
      
      if (!panResponders.current[post.id]) {
        panResponders.current[post.id] = createPanResponderForPost(post.id);
      }
    });
  }, [fashionPosts]);
  
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
    const post = fashionPosts?.find(p => p?.id === postId);
    
    if (!post || !post.gallery) return;
    
    if (dx < -swipeThreshold && currentImageIndex < (post.gallery?.length || 0) - 1) {
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

  // Render fashion inspiration post
  const renderFashionPost = ({ item, index }: { item: FashionPost; index: number }) => {
    // Bail out if item is undefined or missing critical properties
    if (!item || !item.id) {
      console.warn('Attempted to render undefined post item');
      return null;
    }
    
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
          styles.inspirationCard, 
          { 
            backgroundColor: cardBgColor,
            borderColor: borderColor,
            opacity,
            transform: [{ translateY }],
            shadowColor: isDarkMode ? '#7C6BFF' : '#000000',
            shadowOffset: { width: 0, height: isDarkMode ? 4 : 2 },
            shadowOpacity: isDarkMode ? 0.15 : 0.05,
            shadowRadius: isDarkMode ? 12 : 8,
            elevation: isDarkMode ? 8 : 3
          }
        ]}
      >
        {/* Card Header with user info, title and publication date */}
        <View style={styles.inspirationHeader}>
          {/* User info with profile picture */}
          <View style={styles.userInfoContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                // Generate a user ID for the hardcoded user
                const userId = `user_${item.id}`;
                
                // Get username based on post ID
                const username = item.id === '1' ? 'grace_style' : 
                  item.id === '2' ? 'fashion_guru' : 
                  item.id === '3' ? 'trend_watcher' : 
                  item.id === '4' ? 'clothescritic' : 
                  item.id === '5' ? 'runway_fan' : 'style_seeker';
                
                // Navigate to user detail screen
                navigation.navigate('UserDetailScreen', { 
                  userId, 
                  username 
                });
              }}
            >
              <Image 
                source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }} 
                style={[
                  styles.profileImage, 
                  { 
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                  }
                ]} 
              />
            </TouchableOpacity>
            <View style={styles.userTextInfo}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => {
                  // Generate a user ID for the hardcoded user
                  const userId = `user_${item.id}`;
                  
                  // Get username based on post ID
                  const username = item.id === '1' ? 'grace_style' : 
                    item.id === '2' ? 'fashion_guru' : 
                    item.id === '3' ? 'trend_watcher' : 
                    item.id === '4' ? 'clothescritic' : 
                    item.id === '5' ? 'runway_fan' : 'style_seeker';
                  
                  // Navigate to user detail screen
                  navigation.navigate('UserDetailScreen', { 
                    userId, 
                    username 
                  });
                }}
              >
                <View style={styles.usernameContainer}>
                  <Text style={[styles.username, { color: textColor }]}>
                    {item.id === '1' ? 'grace_style' : 
                      item.id === '2' ? 'fashion_guru' : 
                      item.id === '3' ? 'trend_watcher' : 
                      item.id === '4' ? 'clothescritic' : 
                      item.id === '5' ? 'runway_fan' : 'style_seeker'}
                  </Text>
                  {(item.id === '1' || item.id === '3') && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="checkmark-circle" size={14} color="#0095F6" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[styles.publishDate, { color: subTextColor }]}>
                {item.publishedDate}
              </Text>
            </View>
            <TouchableOpacity style={styles.moreOptionsButton}>
              <Icon name="ellipsis-horizontal" size={18} color={subTextColor} />
            </TouchableOpacity>
          </View>
          
          {/* Post title */}
          <View style={styles.titleContainer}>
            <Text style={[styles.inspirationTitle, { color: textColor }]}>
              {item.title}
            </Text>
          </View>
        </View>

        {/* Fashion Image Gallery with swipe */}
        <Animated.View 
          style={[
            styles.galleryContainer,
            {
              transform: [
                { 
                  translateX: panX ? panX.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: [-width * 0.3, 0, width * 0.3],
                    extrapolate: 'clamp'
                  }) : 0
                }
              ]
            }
          ]}
          {...(panResponder ? panResponder.panHandlers : {})}
        >
          {item.gallery && item.gallery.length > 0 ? (
            <Image 
              source={{ uri: item.gallery[currentImageIndex] || 'https://via.placeholder.com/400' }} 
              style={styles.galleryImage}
            />
          ) : (
            <View style={[styles.galleryImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#888' }}>No image available</Text>
            </View>
          )}
          
          {/* Image navigation dots */}
          {item.gallery && item.gallery.length > 1 && (
            <View style={styles.galleryDots}>
              {item.gallery.map((_, i: number) => (
                <View 
                  key={`dot-${i}`} 
                  style={[
                    styles.galleryDot, 
                    i === currentImageIndex && {
                      backgroundColor: '#FFFFFF',
                      width: 8,
                    }
                  ]} 
                />
              ))}
            </View>
          )}
          
          {/* Left/Right navigation buttons for gallery */}
          {item.gallery && item.gallery.length > 1 && (
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
                <Icon name="chevron-back" size={32} color="rgba(255,255,255,0.9)" />
                <Icon name="chevron-back" size={32} color="rgba(255,255,255,0.9)" style={{marginLeft: -15}} />
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
                <Icon name="chevron-forward" size={32} color="rgba(255,255,255,0.9)" style={{marginRight: -15}} />
                <Icon name="chevron-forward" size={32} color="rgba(255,255,255,0.9)" />
              </Animated.View>
            
              {/* Regular navigation buttons */}
              <TouchableOpacity 
                style={[styles.galleryNavButton, styles.galleryNavLeft]}
                onPress={() => cycleGalleryImage(item.id, 'prev')}
              >
                <Icon name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.galleryNavButton, styles.galleryNavRight]}
                onPress={() => cycleGalleryImage(item.id, 'next')}
              >
                <Icon name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* Aesthetic Tag */}
        <View style={styles.aestheticContainer}>
          <View style={[
            styles.aestheticPill, 
            { 
              backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.12)' : 'rgba(82, 69, 204, 0.08)',
              borderColor: isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)'
            }
          ]}>
            <Text style={[styles.aestheticText, { color: mainColor }]}>
              {item.aesthetic}
            </Text>
          </View>
        </View>

        {/* Caption Section */}
        <View style={styles.captionContainer}>
          <Text style={[styles.captionText, { color: subTextColor }]}>
            {isExpanded ? item.caption : (
              item.caption.length > 120 ? 
                item.caption.substring(0, 120) + '... ' : 
                item.caption + ' '
            )}
            {!isExpanded && item.caption.length > 120 && (
              <Text 
                style={[styles.readMoreText, { color: mainColor }]}
                onPress={() => toggleExpandPost(item.id)}
              >
                Read More
              </Text>
            )}
          </Text>
        </View>

        {/* Tags Section */}
        <View style={styles.tagsContainer}>
          <FlatList
            data={item.tags}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => `tag-${index}`}
            renderItem={({item: tag, index}) => (
              <TouchableOpacity 
                key={`tag-${index}`}
                style={[
                  styles.tagPill,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(40, 40, 60, 0.4)' : 'rgba(240, 240, 240, 0.8)',
                    borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.3)' : 'rgba(210, 210, 210, 1)'
                  }
                ]}
              >
                <Text style={[styles.tagText, { color: textColor }]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Featured Pieces Section */}
        <View style={styles.piecesContainer}>
          <Text style={[styles.piecesHeading, { color: textColor }]}>Featured Pieces</Text>
          <View style={styles.piecesGrid}>
            {(item.outfitItems || []).map((piece: { name: string, brand: string }, i: number) => (
              <View 
                key={`piece-${i}`}
                style={[
                  styles.pieceItem,
                  { borderColor: borderColor }
                ]}
              >
                <MaterialIcon 
                  name={['tshirt-crew', 'shoe-heel', 'sunglasses', 'hat-fedora'][i % 4]} 
                  size={18} 
                  color={mainColor} 
                />
                <View style={styles.pieceDetails}>
                  <Text style={[styles.pieceName, { color: textColor }]} numberOfLines={1}>
                    {piece.name}
                  </Text>
                  <Text style={[styles.pieceBrand, { color: mainColor }]}>
                    {piece.brand}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Post Actions */}
        <View style={[styles.postActions, { borderTopColor: borderColor }]}>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                item.isUpvoted && { backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)' }
              ]}
            >
              <FeatherIcon 
                name="arrow-up" 
                size={20} 
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
                  backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)',
                }
              ]}
              onPress={() => toggleComments(item.id)}
            >
              <FeatherIcon 
                name="message-circle" 
                size={20} 
                color={expandedComments === item.id ? mainColor : iconColor} 
              />
              <Text style={[
                styles.actionText, 
                { color: expandedComments === item.id ? mainColor : subTextColor }
              ]}>
                {(item.commentCount || 0)} {expandedComments === item.id ? 'Comments' : 'Discuss'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.saveButton,
              item.isSaved && { backgroundColor: isDarkMode ? 'rgba(255, 186, 13, 0.15)' : 'rgba(255, 177, 0, 0.08)' }
            ]}
          >
            <FeatherIcon 
              name={item.isSaved ? "bookmark" : "bookmark"} 
              size={20} 
              color={item.isSaved ? saveColor : iconColor} 
            />
            <Text style={[
              styles.actionText, 
              { color: item.isSaved ? saveColor : subTextColor }
            ]}>
              {item.isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        {expandedComments === item.id && item.comments && Array.isArray(item.comments) && (
          <View 
            style={[
              styles.commentsSection,
              { borderTopColor: borderColor, borderTopWidth: 1 }
            ]}
          >
            {/* Comments header with collapse button */}
            <View style={styles.commentsHeader}>
              <Text style={[styles.commentsTitle, { color: textColor }]}>
                Comments ({item.commentCount || 0})
              </Text>
              <TouchableOpacity 
                style={[
                  styles.collapseButton,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : 'rgba(240, 240, 240, 0.8)',
                    borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.3)' : 'rgba(210, 210, 210, 1)'
                  }
                ]}
                onPress={() => toggleComments(item.id)}
              >
                <FeatherIcon name="chevron-up" size={18} color={mainColor} />
              </TouchableOpacity>
            </View>
            
            {/* Scrollable comments list */}
            <View style={styles.commentsScrollView}>
              <FlatList
                data={expandedComments === item.id && item.comments ? item.comments : []}
                keyExtractor={(comment) => comment?.id || Math.random().toString()}
                renderItem={({item: comment, index}) => {
                  if (!comment) return null;
                  return (
                    <View 
                      style={[
                        styles.commentItem,
                        index !== ((item.comments?.length || 0) - 1) && { 
                          borderBottomWidth: 1, 
                          borderBottomColor: 'rgba(150, 150, 150, 0.1)'
                        }
                      ]}
                    >
                      <View style={styles.commentHeader}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            // Generate a user ID for the comment user
                            const userId = `comment_user_${comment.id}`;
                            
                            // Navigate to user detail screen
                            navigation.navigate('UserDetailScreen', { 
                              userId, 
                              username: comment.username || 'anonymous' 
                            });
                          }}
                        >
                          <Text style={[styles.commentUsername, { color: textColor }]}>
                            {comment.username || 'anonymous'}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.commentTime, { color: subTextColor }]}>
                          {comment.timeAgo || 'recently'}
                        </Text>
                      </View>
                      
                      <Text style={[styles.commentText, { color: subTextColor }]}>
                        {comment.text || ''}
                      </Text>
                      
                      <View style={styles.commentActions}>
                        <TouchableOpacity style={styles.commentLike}>
                          <FeatherIcon name="heart" size={14} color={iconColor} />
                          {(comment.likes || 0) > 0 && (
                            <Text style={[styles.commentLikeCount, { color: subTextColor }]}>
                              {comment.likes || 0}
                            </Text>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity>
                          <Text style={[styles.commentReply, { color: subTextColor }]}>
                            Reply
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                style={styles.commentsList}
              />
            </View>
            
            {/* Add comment input */}
            <View style={styles.addCommentRow}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={subTextColor}
                style={[
                  styles.commentInput,
                  { 
                    color: textColor,
                    backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : 'rgba(240, 240, 240, 0.8)',
                    borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.3)' : 'rgba(210, 210, 210, 1)'
                  }
                ]}
              />
              <TouchableOpacity style={[styles.postCommentButton, { backgroundColor: mainColor }]}>
                <FeatherIcon name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render trending topic chip
  const renderTrendingTopic = ({ item }: { item: string }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.topicChip,
          selectedTopic === item && { 
            backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)',
            borderColor: mainColor,
          },
          isDarkMode && selectedTopic !== item && {
            backgroundColor: 'rgba(22, 23, 31, 0.8)',
            borderColor: 'rgba(70, 70, 90, 0.3)',
          }
        ]}
        onPress={() => setSelectedTopic(item)}
      >
        <Text 
          style={[
            styles.topicText, 
            { color: selectedTopic === item ? mainColor : subTextColor }
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  // Wrap renderFashionPost with error handling
  const safeRenderFashionPost = (props: { item: FashionPost, index: number }) => {
    try {
      // Check for undefined item
      if (!props || !props.item) {
        console.warn('Received undefined item in renderFashionPost');
        return null;
      }
      return renderFashionPost(props);
    } catch (err) {
      console.error('Error rendering fashion post:', err);
      return null;
    }
  };

  // Messages modal components
  const renderMessagesModal = () => {
    if (!showMessagesModal) return null;
    
    // Mock message data
    const MESSAGES = [
      {
        id: '1',
        user: 'sophia_style',
        avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
        lastMessage: 'Thanks for the style tip! I tried that outfit combination yesterday.',
        time: '5m',
        unread: true
      },
      {
        id: '2',
        user: 'marcus_fashion',
        avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
        lastMessage: 'Have you seen the new collection from that sustainable brand?',
        time: '27m',
        unread: false
      },
      {
        id: '3',
        user: 'olivia_trends',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        lastMessage: 'Loved your latest post! Mind sharing where you got that jacket?',
        time: '2h',
        unread: true
      },
      {
        id: '4',
        user: 'alex_stylist',
        avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
        lastMessage: 'Would you be interested in collaborating on a style guide?',
        time: '1d',
        unread: false
      },
    ];
    
    return (
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.messagesModal, { backgroundColor: cardBgColor }]}>
          <View style={styles.messagesHeader}>
            <Text style={[styles.messagesTitle, { color: textColor }]}>Messages</Text>
            <TouchableOpacity onPress={() => setShowMessagesModal(false)}>
              <Icon name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={MESSAGES}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.messageItem, 
                  item.unread && { backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.08)' : 'rgba(82, 69, 204, 0.04)' }
                ]}
              >
                <Image source={{ uri: item.avatar }} style={styles.messageAvatar} />
                <View style={styles.messageContent}>
                  <View style={styles.messageTop}>
                    <Text style={[styles.messageUser, { color: textColor }]}>{item.user}</Text>
                    <Text style={[styles.messageTime, { color: subTextColor }]}>{item.time}</Text>
                  </View>
                  <Text 
                    style={[
                      styles.messageText, 
                      { color: item.unread ? textColor : subTextColor }
                    ]} 
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>
                {item.unread && (
                  <View style={[styles.unreadIndicator, { backgroundColor: mainColor }]} />
                )}
              </TouchableOpacity>
            )}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Icon name="chatbubbles-outline" size={60} color={subTextColor} />
                <Text style={[styles.emptyMessagesText, { color: subTextColor }]}>
                  No messages yet
                </Text>
              </View>
            }
          />
          
          <TouchableOpacity 
            style={[styles.newMessageButton, { backgroundColor: mainColor }]}
          >
            <FeatherIcon name="edit-2" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header - Enhanced for dark mode with subtle gradient effect */}
      <View 
        style={[
          styles.header, 
          isDarkMode && { 
            backgroundColor: 'rgba(22, 23, 31, 0.8)', 
            borderBottomWidth: 1, 
            borderBottomColor: 'rgba(239, 61, 71, 0.1)'
          }
        ]}
      >
        <View>
          <Text style={[
            styles.headerTitle, 
            { color: textColor },
            isDarkMode && { textShadowColor: 'rgba(239, 61, 71, 0.3)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 8 }
          ]}>
            Fashion Feed
          </Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>Community inspiration</Text>
        </View>
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => setShowMessagesModal(true)}
          >
            <FeatherIcon 
              name="message-circle" 
              size={22} 
              color={isDarkMode ? '#B8B8CC' : textColor} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.searchButton,
              isDarkMode && { 
                backgroundColor: 'rgba(40, 40, 60, 0.4)', 
                borderWidth: 1,
                borderColor: 'rgba(124, 107, 255, 0.2)'
              }
            ]}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <FeatherIcon name="search" size={22} color={isDarkMode ? '#B8B8CC' : textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading fashion feed...
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={fashionPosts || []}
          renderItem={safeRenderFashionPost}
          keyExtractor={item => item?.id || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            isDarkMode && { paddingTop: 4 }
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <>
              {/* Trending Topics Filter */}
              <View style={styles.topicsContainer}>
                <Text style={[styles.topicsHeading, { color: textColor }]}>
                  Trending Inspiration
                </Text>
                <FlatList
                  data={TRENDING_TOPICS || []}
                  renderItem={renderTrendingTopic}
                  keyExtractor={item => item || Math.random().toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topicsList}
                />
              </View>

              {refreshing && (
                <View style={styles.refreshIndicator}>
                  <ActivityIndicator size="small" color={isDarkMode ? '#FF6B6B' : mainColor} />
                  <Text style={[
                    styles.refreshText, 
                    { color: isDarkMode ? '#B8B8CC' : subTextColor }
                  ]}>
                    Refreshing...
                  </Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FeatherIcon name="instagram" size={60} color={subTextColor} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                No Posts Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
                Be the first to share your fashion inspiration
              </Text>
              <TouchableOpacity 
                style={[styles.createFirstPostButton, { backgroundColor: mainColor }]}
                onPress={() => navigation.navigate('CreatePostScreen')}
              >
                <Text style={styles.createFirstPostButtonText}>Create Post</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            <View style={{ height: 90 }} />
          }
        />
      )}

      {/* Floating Action Button for creating posts */}
      <TouchableOpacity 
        style={[
          styles.createPostButton, 
          { backgroundColor: mainColor },
          isDarkMode && { 
            shadowColor: 'rgba(239, 61, 71, 0.7)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }
        ]}
        onPress={() => {
          console.log("Navigate to create post screen");
          navigation.navigate('CreatePostScreen');
        }}
      >
        <Icon name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Messages Modal */}
      {renderMessagesModal()}

      {/* No longer need custom bottom navigation bar - using Tab Navigator */}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default SocialScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...defaultTextStyle,
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    ...defaultTextStyle,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createFirstPostButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createFirstPostButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 2,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  createPostButton: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Positioned above the tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  // Trending topics section
  topicsContainer: {
    marginBottom: 20,
  },
  topicsHeading: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  topicsList: {
    paddingVertical: 4,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  topicText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Fashion inspiration card styling
  inspirationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  inspirationHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  userTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  moreOptionsButton: {
    padding: 8,
    marginRight: -8,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  titleContainer: {
    marginTop: 4,
  },
  inspirationTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  publishDate: {
    fontSize: 12,
    marginTop: 1,
  },
  
  // Gallery
  galleryContainer: {
    position: 'relative',
    height: width * 1.1,
    backgroundColor: '#e0e0e0',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryDots: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
  },
  galleryNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryNavLeft: {
    left: 8,
  },
  galleryNavRight: {
    right: 8,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 60,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 1,
  },
  swipeIndicatorLeft: {
    left: 16,
  },
  swipeIndicatorRight: {
    right: 16,
  },
  
  // Aesthetic section
  aestheticContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  aestheticPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  aestheticText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Caption section
  captionContainer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  captionText: {
    ...defaultTextStyle,
    fontSize: 15,
    lineHeight: 22,
  },
  readMoreText: {
    ...defaultTextStyle,
    fontWeight: '600',
  },
  
  // Tags section
  tagsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 6,
    borderWidth: 1,
  },
  tagText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Featured pieces section
  piecesContainer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    marginTop: 8,
  },
  piecesHeading: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 14,
  },
  piecesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
    marginHorizontal: '2%',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 16,
  },
  pieceDetails: {
    marginLeft: 8,
    flex: 1,
  },
  pieceName: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
  },
  pieceBrand: {
    ...defaultTextStyle,
    fontSize: 12,
    marginTop: 3,
  },
  
  // Post actions
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 0,
  },
  actionGroup: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Comments section
  commentsSection: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  commentsTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  commentsScrollView: {
    maxHeight: 200,
  },
  commentsList: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  commentItem: {
    paddingVertical: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentUsername: {
    ...defaultTextStyle,
    fontWeight: '600',
    fontSize: 14,
  },
  commentTime: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  commentText: {
    ...defaultTextStyle,
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentLikeCount: {
    ...defaultTextStyle,
    fontSize: 12,
    marginLeft: 4,
  },
  commentReply: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '500',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  commentInput: {
    ...defaultTextStyle,
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  postCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  // Refresh indicator
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  refreshText: {
    ...defaultTextStyle,
    marginLeft: 8,
    fontSize: 13,
  },

  // Messages modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  messagesModal: {
    width: '90%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  messagesTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  messageAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageUser: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  messageTime: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  messageText: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyMessages: {
    padding: 40,
    alignItems: 'center',
  },
  emptyMessagesText: {
    ...defaultTextStyle,
    fontSize: 16,
    marginTop: 12,
  },
  newMessageButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});