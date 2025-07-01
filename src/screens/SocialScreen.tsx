import PantsIcon from '../assets/icons/pants.svg';
import jewelryIcon from '../assets/icons/jewelry.svg';
import watchIcon from '../assets/icons/watch.svg';
// Fallback stock silhouette avatar URL (Gravatar "mp" default)
const DEFAULT_AVATAR_URL = 'https://www.gravatar.com/avatar/?d=mp&f=y';


/**
 * Resolve avatar source: use provided URL; otherwise generate a single-letter avatar.
 * @param avatarUrl URL string from user profile
 * @param displayName Optional display name (for initial)
 * @param username Fallback username (for initial)
 */
const getAvatarSource = (
  avatarUrl?: string,
  displayName?: string,
  username?: string
): { uri: string } => {
  if (avatarUrl && avatarUrl.trim()) {
    return { uri: avatarUrl };
  }
  const initial = displayName
    ? displayName.charAt(0).toUpperCase()
    : username
    ? username.charAt(0).toUpperCase()
    : '';
  return initial
    ? { uri: `https://ui-avatars.com/api/?name=${initial}&background=0D8ABC&color=fff&bold=true&size=128` }
    : { uri: DEFAULT_AVATAR_URL };
};
// src/screens/SocialScreen.tsx

import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Linking,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../types/NavigationTypes';

import { auth, Timestamp } from '../Config/firebaseconfig';
import firestore from '@react-native-firebase/firestore';
// React Native Firebase automatically handles timestamps
import { followUser, unfollowUser, isUserFollowing } from '../services/followService';
import { isRealUserId } from '../utils/userUtils';
import { toggleLikePost, hasUserLikedPost } from '../services/likeService';
import { toggleSavePost, hasUserSavedPost } from '../services/saveService';
import { addComment, getCommentsByPost, deleteComment, likeComment, Comment as CommentType } from '../services/commentService';
import { 
  getConversations, 
  ConversationWithDetails, 
  sendMessage, 
  markConversationAsRead 
} from '../services/messageService';

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
import { useTheme } from '../styles/themeprovider';

import { getCachedFeedPosts, Post } from '../services/postService';
import { getUserProfile, UserProfile } from '../services/firestoreService';
import { 
  hasCachedLike, 
  hasCachedSave, 
  hasCachedFollow, 
  updateLikeCache, 
  updateSaveCache, 
  updateFollowCache,
  batchUpdateLikesCache,
  batchUpdateSavesCache,
  batchUpdateFollowsCache 
} from '../services/interactionCache';
import { formatDistanceToNow } from 'date-fns';

import { OutfitItem } from '../services/postService';

// Add type definition for fashion post (enhanced post with UI properties)
interface FashionPost {
  id: string;
  userId: string;
  username: string;
  userDisplayName?: string; // Added display name field
  userAvatar?: string;
  title?: string;
  gallery: string[];
  caption: string;
  tags: string[];
  outfitItems: OutfitItem[];
  publishedDate: string;
  comments: Array<{
    id: string;
    username: string;
    text: string;
    timeAgo: string;
    likes: number;
    userId?: string;
    userAvatar?: string;
    createdAt?: any;
  }>;
  commentCount: number;
  upvotes: number;
  saves: number;
  isSaved: boolean;
  isUpvoted: boolean;
  isFollowing?: boolean; // Track if the current user is following this post's author
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

// Removed STYLE_AESTHETICS constants - now using user-inputted tags for styling


const { width } = Dimensions.get('window');
const swipeThreshold = width * 0.3; // 30% of screen width

type SocialScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Define type for route params
type SocialScreenParams = {
  showMessages?: boolean;
  messageUserId?: string;
  messageUsername?: string;
};

// Product Details Modal Component using similar styling to ExpandedProductScreen
const ProductDetailsModal: React.FC<{
  visible: boolean;
  product: OutfitItem | null;
  onClose: () => void;
  onOpenProduct: (url: string) => void;
  isDarkMode: boolean;
  mainColor: string;
  cardBgColor: string;
  textColor: string;
  subTextColor: string;
  borderColor: string;
}> = ({ 
  visible, 
  product, 
  onClose, 
  onOpenProduct, 
  isDarkMode, 
  mainColor, 
  cardBgColor, 
  textColor, 
  subTextColor, 
  borderColor 
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

    // Helper function to get valid and deduplicated image URLs
  const getValidImageUrls = (images: any[]): string[] => {
    const validUrls = images
      .map(img => {
        // Handle both string URLs and objects with url property
        const url = typeof img === 'string' ? img : img?.url;
        return url;
      })
      .filter(url => {
        // Filter out invalid URLs (like product page URLs)
        return url && 
               typeof url === 'string' && 
               (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')) &&
               !url.includes('/products/') &&
               url.startsWith('http');
      });

    // Deduplicate by extracting base filename and keeping highest quality
    const imageMap = new Map<string, { url: string; width: number; quality: number }>();
    
    validUrls.forEach(url => {
      try {
        // Extract base filename (remove query params and size variations)
        const baseUrl = url.split('?')[0];
        const filename = baseUrl.split('/').pop() || '';
        const baseFilename = filename.replace(/_\d+x\d+|_grande|_large|_medium|_small|_compact|_thumb/g, '');
        
        // Extract width from URL params for quality scoring
        const widthMatch = url.match(/[?&]width=(\d+)/);
        const width = widthMatch ? parseInt(widthMatch[1]) : 1000; // Default width if not specified
        
        // Quality scoring: prefer larger images, penalize tiny thumbnails
        let quality = width;
        if (width < 100) quality = width * 0.1; // Heavily penalize tiny thumbnails
        else if (width < 300) quality = width * 0.5; // Penalize small images
        else if (width > 1200) quality = width * 1.2; // Prefer high-res images
        
        // Prefer URLs without size params (usually original size)
        if (!url.includes('width=')) quality += 500;
        
        // Check if we already have this image
        const existing = imageMap.get(baseFilename);
        if (!existing || quality > existing.quality) {
          imageMap.set(baseFilename, { url, width, quality });
        }
      } catch (error) {
        console.log('🎭 Error processing image URL:', url, error);
      }
    });
    
    // Sort by quality (highest first) and return URLs
    const deduplicatedUrls = Array.from(imageMap.values())
      .sort((a, b) => b.quality - a.quality)
      .map(item => item.url)
      .slice(0, 10); // Limit to max 10 images for better UX
    
    console.log('🎭 Deduplicated images:', validUrls.length, '→', deduplicatedUrls.length);
    console.log('🎭 Selected image URLs:', deduplicatedUrls.map(url => {
      const widthMatch = url.match(/[?&]width=(\d+)/);
      const width = widthMatch ? widthMatch[1] : 'original';
      return `${url.split('/').pop()?.split('?')[0]} (${width}px)`;
    }));
    
    return deduplicatedUrls;
  };

  // Navigation functions for image carousel
  const navigateToNextImage = (validImages: string[]) => {
    const currentIndex = Math.min(selectedImageIndex, validImages.length - 1);
    if (currentIndex < validImages.length - 1) {
      console.log('🎭 Navigating to next image:', currentIndex + 1);
      setSelectedImageIndex(currentIndex + 1);
    }
  };

  const navigateToPreviousImage = (validImages: string[]) => {
    const currentIndex = Math.min(selectedImageIndex, validImages.length - 1);
    if (currentIndex > 0) {
      console.log('🎭 Navigating to previous image:', currentIndex - 1);
      setSelectedImageIndex(currentIndex - 1);
    }
  };

  useEffect(() => {
    console.log('🎭 ProductModal visibility changed:', visible);
    if (visible) {
      setSelectedImageIndex(0);
      console.log('🎭 Starting modal open animation');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('🎭 Modal open animation completed');
      });
    } else {
      console.log('🎭 Starting modal close animation');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('🎭 Modal close animation completed');
      });
    }
  }, [visible]);

  if (!visible || !product?.scrapedProduct) {
    console.log('🎭 Modal not rendering - visible:', visible, 'product:', !!product, 'scrapedProduct:', !!product?.scrapedProduct);
    return null;
  }

  const { scrapedProduct } = product;
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7';
  
  console.log('🎭 Rendering ProductModal - product:', product.name, 'visible:', visible);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.productModalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)' }]}>
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              opacity: fadeAnim 
            }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={onClose} 
          />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.productModalContent,
            { 
              backgroundColor: cardBgColor,
              transform: [{ translateY: slideAnim }]
            }
          ]}
          onLayout={(event) => {
            const { height, width } = event.nativeEvent.layout;
            console.log('🎭 Modal content layout - height:', height, 'width:', width);
          }}
        >
          {/* Header */}
          <View style={[styles.productModalHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity
              style={[styles.productModalHeaderButton, { backgroundColor: surfaceColor }]}
              onPress={onClose}
            >
              <Icon name="arrow-back" size={22} color={textColor} />
            </TouchableOpacity>
            
            <View style={styles.productModalHeaderCenter}>
              <Text style={[styles.productModalHeaderTitle, { color: textColor }]}>
                Product Details
              </Text>
              <Text style={[styles.productModalHeaderSubtitle, { color: subTextColor }]}>
                Featured Item
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.productModalHeaderButton, { backgroundColor: surfaceColor }]}
              onPress={() => {
                if (scrapedProduct.productUrl) {
                  onOpenProduct(scrapedProduct.productUrl);
                } else if (product.affiliateLink) {
                  onOpenProduct(product.affiliateLink);
                }
              }}
              disabled={!scrapedProduct.productUrl && !product.affiliateLink}
            >
              <FeatherIcon 
                name="external-link" 
                size={20} 
                color={(scrapedProduct.productUrl || product.affiliateLink) ? textColor : subTextColor} 
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.productModalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productModalScrollContent}
            scrollEnabled={true}
          >
            {/* Hero Image Section */}
            <View style={[styles.productModalHeroSection, { backgroundColor: surfaceColor }]}>
                        <View style={styles.productModalImageContainer}>
            {(() => {
              const validImages = getValidImageUrls(scrapedProduct.images || []);
              console.log('🎭 Valid images found:', validImages.length, 'out of', scrapedProduct.images?.length || 0);
              console.log('🎭 First few valid images:', validImages.slice(0, 3));
              console.log('🎭 All deduplicated images:', validImages.map((url, i) => `${i}: ${url.split('/').pop()}`));
              
              if (validImages.length > 0) {
                const currentImageIndex = Math.min(selectedImageIndex, validImages.length - 1);
                
                return (
                  <>
                    <View style={styles.productModalImageWrapper}>
                      <Image
                        source={{ uri: validImages[currentImageIndex] }}
                        style={styles.productModalProductImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🎭 Image failed to load:', validImages[currentImageIndex], error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('🎭 Image loaded successfully:', validImages[currentImageIndex]);
                        }}
                      />
                    </View>
                    
                    {/* Navigation arrows */}
                    {validImages.length > 1 && (
                      <>
                        {/* Previous image button */}
                        {currentImageIndex > 0 && (
                          <TouchableOpacity 
                            style={[styles.productModalNavButton, styles.productModalNavButtonLeft]}
                            onPress={() => navigateToPreviousImage(validImages)}
                            activeOpacity={0.7}
                          >
                            <FeatherIcon name="chevron-left" size={24} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                        
                        {/* Next image button */}
                        {currentImageIndex < validImages.length - 1 && (
                          <TouchableOpacity 
                            style={[styles.productModalNavButton, styles.productModalNavButtonRight]}
                            onPress={() => navigateToNextImage(validImages)}
                            activeOpacity={0.7}
                          >
                            <FeatherIcon name="chevron-right" size={24} color="#FFFFFF" />
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                    
                    {/* Debug info */}
                    {__DEV__ && (
                      <View style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: 8,
                        borderRadius: 4,
                        zIndex: 10
                      }}>
                        <Text style={{ color: 'white', fontSize: 12 }}>
                          {currentImageIndex + 1} / {validImages.length}
                        </Text>
                      </View>
                    )}
                    
                    {/* Image pagination dots */}
                    {validImages.length > 1 && (
                      <View style={styles.productModalImageDots}>
                        {validImages.map((_, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.productModalImageDot,
                              {
                                backgroundColor: index === currentImageIndex 
                                  ? mainColor 
                                  : 'rgba(255, 255, 255, 0.5)'
                              }
                            ]}
                            onPress={() => {
                              console.log('🎭 Dot pressed - changing to image', index);
                              setSelectedImageIndex(index);
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </>
                );
              } else {
                return (
                  <View style={[styles.productModalProductImage, { backgroundColor: surfaceColor, justifyContent: 'center', alignItems: 'center' }]}>
                    <Icon name="image-outline" size={60} color={subTextColor} />
                    <Text style={[{ color: subTextColor, marginTop: 8, fontSize: 14 }]}>No valid images found</Text>
                  </View>
                );
                             }
             })()}
                
                {/* Floating Brand Badge */}
                <View style={styles.productModalFloatingBadge}>
                                  <View style={[styles.productModalBrandBadge, { backgroundColor: mainColor }]}>
                  <FeatherIcon name="tag" size={14} color="#FFFFFF" />
                  <Text style={styles.productModalBrandBadgeText}>
                    {product.brand || scrapedProduct.brand}
                  </Text>
                </View>
                </View>
              </View>
            </View>

            {/* Product Info Card */}
            <View style={[styles.productModalInfoCard, { backgroundColor: cardBgColor, borderColor }]}>
              <View style={styles.productModalTitleContainer}>
                <Text style={[styles.productModalProductName, { color: textColor }]}>
                  {scrapedProduct.name || product.name}
                </Text>
                
                {scrapedProduct.price !== undefined && (
                  <Text style={[styles.productModalPrice, { color: mainColor }]}>
                    {scrapedProduct.currency || '$'}{scrapedProduct.price.toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Store Info */}
              {scrapedProduct.site && (
                <View style={styles.productModalStoreInfo}>
                  <FeatherIcon name="shopping-bag" size={16} color={subTextColor} />
                  <Text style={[styles.productModalStoreText, { color: subTextColor }]}>
                    Available at {scrapedProduct.site}
                  </Text>
                </View>
              )}

              {/* Description */}
              {scrapedProduct.description && (
                <View style={styles.productModalDescriptionContainer}>
                  <Text style={[styles.productModalSectionTitle, { color: textColor }]}>
                    Description
                  </Text>
                  <Text style={[styles.productModalDescription, { color: subTextColor }]}>
                    {scrapedProduct.description}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.productModalActionButtons}>
                <TouchableOpacity
                  style={[styles.productModalPrimaryButton, { backgroundColor: mainColor }]}
                  onPress={() => {
                    if (scrapedProduct.productUrl) {
                      onOpenProduct(scrapedProduct.productUrl);
                    } else if (product.affiliateLink) {
                      onOpenProduct(product.affiliateLink);
                    }
                  }}
                  disabled={!scrapedProduct.productUrl && !product.affiliateLink}
                >
                  <Text style={styles.productModalPrimaryButtonText}>Shop Now</Text>
                  <FeatherIcon name="shopping-bag" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const SocialScreen: React.FC = () => {
  const navigation = useNavigation<SocialScreenNavigationProp>();
  const route = useRoute<RouteProp<Record<string, SocialScreenParams>, string>>();
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  
  // State for real data
  const [firebasePosts, setFirebasePosts] = useState<Post[]>([]);
  const [fashionPosts, setFashionPosts] = useState<FashionPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentsText, setCommentsText] = useState<Record<string, string>>({});
  const [isAddingComment, setIsAddingComment] = useState<string | null>(null); // Track which post is adding a comment
  
  // Background refresh state
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // Messaging state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Product details modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OutfitItem | null>(null);
  
  // Use individual animation values for simplicity
  const [commentHeights] = useState<Record<string, number>>({});
  const commentAnimation = useRef(new Animated.Value(0)).current;
  
  // Create refs for post animations
  const postAnimations = useRef<Record<string, Animated.Value>>({});
  const panXValues = useRef<Record<string, Animated.Value>>({});
  const panResponders = useRef<Record<string, any>>({});

  // Fetch posts from Firebase with caching and interaction data
  const fetchPosts = async (forceRefresh = false) => {
    console.log('🔄 fetchPosts called with forceRefresh =', forceRefresh);
    try {
      if (forceRefresh) {
        setIsLoading(true);
      } else {
        setIsBackgroundRefreshing(true);
      }
      
      // Get posts from Firestore with caching
      console.log('📥 Getting posts from Firestore with getCachedFeedPosts()');
      const posts = await getCachedFeedPosts(forceRefresh);
      console.log(`📦 Received ${posts.length} posts from Firestore`);
      console.log('📊 Post sample:', posts.length > 0 ? JSON.stringify(posts[0], null, 2) : 'No posts');
      setFirebasePosts(posts);
      
      // Update last refresh time
      setLastRefreshTime(Date.now());
      
      // Convert to FashionPost format
      console.log('🔄 Converting posts to FashionPost format');
      const enhancedPosts = await Promise.all(posts.map(async (post, index) => {
        console.log(`📝 Processing post #${index}, ID: ${post.id}, userId: ${post.userId}`);
        // Format post dates
        let publishedDate = '1 day ago';
        try {
          if (post.createdAt) {
            // Handle various formats of createdAt
            const date = post.createdAt.toDate 
              ? post.createdAt.toDate() 
              : post.createdAt.seconds 
                ? new Date(post.createdAt.seconds * 1000)
                : new Date(post.createdAt);
            
            publishedDate = formatDistanceToNow(date) + ' ago';
          }
        } catch (dateError) {
          console.log('Error formatting date:', dateError);
        }
        
        // No longer generating random aesthetic values - using user tags instead
        // Real data for likes and saves
        const upvotes = post.likes || 0;
        const saves = Math.floor(Math.random() * 200) + 50; // In the future, we'd count the actual saves
        
        // Check if current user has liked or saved the post - cache first approach
        let isSaved = false;
        let isUpvoted = false;
        let isFollowing = false;
        const currentUser = auth().currentUser;
        
        if (currentUser && post.id) {
          try {
            // Try cache first for like status
            const cachedLike = await hasCachedLike(post.id);
            if (cachedLike !== null) {
              isUpvoted = cachedLike;
              console.log(`🚀 Using cached like status for post ${post.id}: ${isUpvoted}`);
            } else {
              // Cache miss - get from API and update cache
              isUpvoted = await hasUserLikedPost(currentUser.uid, post.id);
              await updateLikeCache(post.id, isUpvoted);
              console.log(`🔍 Fetched and cached like status for post ${post.id}: ${isUpvoted}`);
            }
            
            // Try cache first for save status
            const cachedSave = await hasCachedSave(post.id);
            if (cachedSave !== null) {
              isSaved = cachedSave;
              console.log(`🚀 Using cached save status for post ${post.id}: ${isSaved}`);
            } else {
              // Cache miss - get from API and update cache
              isSaved = await hasUserSavedPost(currentUser.uid, post.id);
              await updateSaveCache(post.id, isSaved);
              console.log(`🔍 Fetched and cached save status for post ${post.id}: ${isSaved}`);
            }
          } catch (err) {
            console.error('Error checking post interaction status:', err);
            // Default to not liked/saved on error
            isSaved = false;
            isUpvoted = false;
          }
        } else {
          // Use random values for demo/testing
          isSaved = Math.random() > 0.5;
          isUpvoted = Math.random() > 0.6;
        }
        
        // Check actual follow status if we have a valid user ID - cache first approach
        if (currentUser && post.userId && isRealUserId(post.userId)) {
          try {
            // Try cache first for follow status
            const cachedFollow = await hasCachedFollow(post.userId);
            if (cachedFollow !== null) {
              isFollowing = cachedFollow;
              console.log(`🚀 Using cached follow status for user ${post.userId}: ${isFollowing}`);
            } else {
              // Cache miss - get from API and update cache
              isFollowing = await isUserFollowing(currentUser.uid, post.userId);
              await updateFollowCache(post.userId, isFollowing);
              console.log(`👤 Fetched and cached follow status for user ${post.userId}: ${isFollowing}`);
            }
          } catch (err) {
            console.error('Error checking follow status:', err);
            // Default to not following on error
            isFollowing = false;
          }
        } else {
          // Use random for demo/test users
          isFollowing = Math.random() > 0.6;
        }
        
        // Initialize with empty comments array - we'll only use generated comments for mock posts
        let comments: Array<{
          id: string;
          username: string;
          text: string;
          timeAgo: string;
          likes: number;
          userId?: string;
          userAvatar?: string;
          createdAt?: any;
        }> = [];
        let commentCount = 0;
        
        // For real posts, check the actual comment count
        if (isRealUserId(post.userId) && !post.id.includes('mock')) {
          try {
            // Check real comment count by counting them in Firestore
            const realComments = await getCommentsByPost(post.id);
            commentCount = realComments.length;
            console.log(`Real comment count for post ${post.id}: ${commentCount}`);
            
            // Only use generated sample comments for demo posts
            comments = []; // Real comments will be loaded when opening the comments section
          } catch (err) {
            console.error('Error checking comment count:', err);
            commentCount = post.comments || 0; // Fall back to the post's comment count field
          }
        } else {
          // Generate fake comments for demo posts
          comments = generateSampleComments(post.id);
          commentCount = comments.length;
        }
        
        // Convert tags array to include hashtags if they don't have them
        const formattedTags = (post.tags || []).map(tag => 
          tag.startsWith('#') ? tag : `#${tag}`
        );
        
        // Create gallery array from the single image
        const gallery = [post.imageUrl];
        // No longer adding random stock images to galleries
        
        // Create title from caption if none exists
        let title = post.caption.split('.')[0];
        if (title && title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
        
        // Use real outfit items if available, otherwise only generate for mock posts
        let outfitItems = post.outfitItems || [];
        
        // Only generate sample outfit items for mock posts
        if (outfitItems.length === 0 && (!isRealUserId(post.userId) || post.id.includes('mock'))) {
          outfitItems = [
            {
              name: 'Oversized Shirt', 
              brand: 'COS',
              type: 'shirt',
              affiliateLink: Math.random() > 0.5 ? 'https://www.cos.com' : undefined
            },
            {
              name: 'Slim Trousers', 
              brand: 'Uniqlo',
              type: 'pants',
              affiliateLink: Math.random() > 0.5 ? 'https://www.uniqlo.com' : undefined
            },
            {
              name: 'Minimal Sneakers', 
              brand: 'Common Projects',
              type: 'shoes',
              affiliateLink: Math.random() > 0.5 ? 'https://www.mrporter.com' : undefined
            },
            {
              name: 'Classic Watch', 
              brand: 'Timex',
              type: 'accessory',
              affiliateLink: Math.random() > 0.5 ? 'https://www.timex.com' : undefined
            }
          ];
        }
          
        return {
          ...post,
          title,
          gallery,
          tags: formattedTags,
          publishedDate,
          outfitItems,
          comments,
          commentCount,
          upvotes,
          saves,
          isSaved,
          isUpvoted,
          isFollowing
        } as FashionPost;
      }));
      
      setFashionPosts(enhancedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      // If we have no posts, create an empty array
      setFashionPosts([]);
    } finally {
      setIsLoading(false);
      setIsBackgroundRefreshing(false);
    }
  };

  // Check for navigation params to open messages
  useEffect(() => {
    const routeParams = route?.params;
    
    // Handle the navigation from UserDetailScreen
    if (routeParams?.showMessages) {
      console.log('Detected route params to show messages:', routeParams);
      
      // Make sure user is logged in
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Sign In Required', 'You need to be signed in to view messages');
        return;
      }
      
      // Navigate to MessagingScreen instead of showing modal
      if (routeParams.messageUserId && routeParams.messageUsername) {
        console.log(`Navigating to MessagingScreen with ${routeParams.messageUsername} (${routeParams.messageUserId})`);
        
        navigation.navigate('MessagingScreen', {
          otherUserId: routeParams.messageUserId,
          otherUserName: routeParams.messageUsername
        });
      } else {
        // Navigate to general messaging screen without specific conversation
        navigation.navigate('MessagingScreen', {});
      }
    }
  }, [route?.params]);

  // Initial data load
  useEffect(() => {
    console.log('🟢 Initial data load - calling fetchPosts()');
    fetchPosts();
    fetchConversations();
  }, []);
  
  // Background refresh when cache might be stale
  useEffect(() => {
    const checkForBackgroundRefresh = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      const BACKGROUND_REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes
      
      // If it's been more than 10 minutes since last refresh, do a background refresh
      if (timeSinceLastRefresh > BACKGROUND_REFRESH_THRESHOLD && !isBackgroundRefreshing && !isLoading) {
        console.log('🔄 Background refresh triggered - cache might be stale');
        fetchPosts(false); // Background refresh, not force refresh
      }
    };
    
    // Check on mount and when focus returns to the screen
    const unsubscribe = navigation.addListener('focus', () => {
      checkForBackgroundRefresh();
    });
    
    return unsubscribe;
  }, [navigation, lastRefreshTime, isBackgroundRefreshing, isLoading]);
  
  // Function to send a message
  const handleSendMessage = async () => {
    try {
      if (!selectedConversation || !messageText.trim()) {
        return;
      }
      
      setIsSendingMessage(true);
      
      const receiverId = selectedConversation.otherUserId;
      await sendMessage(receiverId, messageText);
      
      // Clear the input
      setMessageText('');
      
      // Refresh conversations to show new message
      await fetchConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Update follow status for a specific user in all posts
  const updateFollowStatusForUser = async (userId: string, isNowFollowing: boolean) => {
    console.log(`🔄 Updating follow status for user ${userId} to ${isNowFollowing ? 'following' : 'not following'}`);
    
    setFashionPosts(prev => prev.map(post => {
      if (post.userId === userId) {
        return {
          ...post,
          isFollowing: isNowFollowing
        };
      }
      return post;
    }));
  };

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
  
  // Handle follow/unfollow action
  const handleFollowToggle = async (postId: string, userId: string) => {
    console.log(`${isRealUserId(userId) ? 'REAL' : 'MOCK'} USER FOLLOW TOGGLE - postId: ${postId}, userId: ${userId}`);
    
    // Only process for real users
    if (!isRealUserId(userId)) {
      alert('Following demo accounts is not available.');
      return;
    }
    
    // Current user must be logged in
    const currentUser = auth().currentUser;
    if (!currentUser) {
      alert('You need to be logged in to follow users');
      return;
    }
    
    // Get the current post
    const post = fashionPosts.find(p => p.id === postId);
    if (!post) return;
    
    try {
      // Optimistically update UI
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isFollowing: !p.isFollowing
          };
        }
        return p;
      }));
      
      // Update cache immediately for instant response
      await updateFollowCache(userId, !post.isFollowing);
      
      // Make the actual API call
      if (post.isFollowing) {
        // If currently following, unfollow
        await unfollowUser(currentUser.uid, userId);
        console.log(`Successfully unfollowed user ${userId}`);
        
        // Update all posts by this user to show not following
        await updateFollowStatusForUser(userId, false);
      } else {
        // If not following, follow
        await followUser(currentUser.uid, userId);
        console.log(`Successfully followed user ${userId}`);
        
        // Update all posts by this user to show following
        await updateFollowStatusForUser(userId, true);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      
      // If error, revert the UI change
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isFollowing: post.isFollowing // Revert to original state
          };
        }
        return p;
      }));
      
      // Revert cache
      await updateFollowCache(userId, post.isFollowing ?? false);
      
      // Show error to user
      alert('Failed to update follow status. Please try again.');
    }
  };
  
  // Fetch conversations from Firestore
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('No user logged in, cannot fetch conversations');
        return;
      }
      
      console.log('Fetching conversations for user', currentUser.uid);
      const conversationsData = await getConversations();
      console.log(`Retrieved ${conversationsData.length} conversations`);
      
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      alert('Failed to load conversations. Please try again.');
    } finally {
      setIsLoadingConversations(false);
    }
  };
  
  // Handle message action for a specific user
  const handleMessage = (userId: string, username: string) => {
    console.log(`MESSAGE USER - userId: ${userId}, username: ${username}`);
    
    // Only process for real users
    if (!isRealUserId(userId)) {
      alert('Messaging demo accounts is not available.');
      return;
    }

    // Find if there's an existing conversation with this user
    const existingConversation = conversations.find(
      conv => conv.otherUserId === userId
    );
    
    if (existingConversation) {
      // Navigate to the messaging screen with the existing conversation
      navigation.navigate('MessagingScreen', {
        conversationId: existingConversation.id,
        otherUserId: userId,
        otherUserName: username
      });
    } else {
      // Navigate to the messaging screen to start a new conversation
      navigation.navigate('MessagingScreen', {
        otherUserId: userId,
        otherUserName: username
      });
    }
  };
  
  // Handle upvote action with caching
  const handleUpvoteToggle = async (postId: string) => {
    // Current user must be logged in
    const currentUser = auth().currentUser;
    if (!currentUser) {
      alert('You need to be logged in to like posts');
      return;
    }
    
    // Get the current post
    const post = fashionPosts.find(p => p.id === postId);
    if (!post) return;
    
    // Check if this is a mock/demo post
    if (!isRealUserId(post.userId) || post.id.includes('mock')) {
      alert('Demo posts cannot be liked');
      return;
    }
    
    const newIsUpvoted = !post.isUpvoted;
    
    try {
      // Optimistically update UI
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isUpvoted: newIsUpvoted,
            upvotes: newIsUpvoted ? p.upvotes + 1 : Math.max(0, p.upvotes - 1)
          };
        }
        return p;
      }));
      
      // Update cache immediately for instant response on future checks
      await updateLikeCache(postId, newIsUpvoted);
      
      // Make the actual API call
      const isNowLiked = await toggleLikePost(currentUser.uid, postId);
      console.log(`Successfully ${isNowLiked ? 'liked' : 'unliked'} post ${postId}`);
    } catch (error) {
      console.error('Error toggling like status:', error);
      
      // Revert UI on error
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isUpvoted: post.isUpvoted,
            upvotes: post.upvotes
          };
        }
        return p;
      }));
      
      // Revert cache
      await updateLikeCache(postId, post.isUpvoted);
      
      // Show error to user
      alert('Failed to update like status. Please try again.');
    }
  };
  
  // Alias for handleUpvoteToggle to maintain compatibility with existing code
  const handleLikeToggle = handleUpvoteToggle;
  
  // Handle save action with caching
  const handleSaveToggle = async (postId: string) => {
    // Current user must be logged in
    const currentUser = auth().currentUser;
    if (!currentUser) {
      alert('You need to be logged in to save posts');
      return;
    }
    
    // Get the current post
    const post = fashionPosts.find(p => p.id === postId);
    if (!post) return;
    
    // Check if this is a mock/demo post
    if (!isRealUserId(post.userId) || post.id.includes('mock')) {
      alert('Demo posts cannot be saved');
      return;
    }
    
    const newIsSaved = !post.isSaved;
    
    try {
      // Optimistically update UI
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isSaved: newIsSaved
          };
        }
        return p;
      }));
      
      // Update cache immediately for instant response on future checks
      await updateSaveCache(postId, newIsSaved);
      
      // Make the actual API call
      const isNowSaved = await toggleSavePost(currentUser.uid, postId);
      console.log(`Successfully ${isNowSaved ? 'saved' : 'unsaved'} post ${postId}`);
    } catch (error) {
      console.error('Error toggling save status:', error);
      
      // Revert UI on error
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isSaved: post.isSaved
          };
        }
        return p;
      }));
      
      // Revert cache
      await updateSaveCache(postId, post.isSaved);
      
      // Show error to user
      alert('Failed to update save status. Please try again.');
    }
  };
  
  // Handle opening product in browser
  const handleOpenProduct = async (url: string) => {
    try {
      console.log(`Opening product URL: ${url}`);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        // Close modal after opening link
        setShowProductModal(false);
      } else {
        throw new Error(`Cannot open URL: ${url}`);
      }
    } catch (err) {
      console.error('Error opening product link:', err);
      Alert.alert(
        'Could not open link',
        'The link cannot be opened. It may be invalid or your device does not support opening this type of link.'
      );
    }
  };

  // Handle adding a new comment
  const handleAddComment = async (postId: string, text: string) => {
    // Validate input
    if (!text.trim()) {
      alert('Please enter a comment');
      return;
    }
    
    // Current user must be logged in
    const currentUser = auth().currentUser;
    if (!currentUser) {
      alert('You need to be logged in to comment');
      return;
    }
    
    // Get the current post
    const post = fashionPosts.find(p => p.id === postId);
    if (!post) return;
    
    // Check if this is a mock/demo post
    if (!isRealUserId(post.userId) || post.id.includes('mock')) {
      alert('Cannot comment on demo posts');
      return;
    }
    
    try {
      // Add the comment to the database
      const newComment = await addComment(postId, text);
      
      // Convert to the app's comment format
      const formattedComment = {
        id: newComment.id,
        username: newComment.username,
        userId: newComment.userId,
        text: newComment.text,
        timeAgo: 'Just now',
        likes: 0,
        userAvatar: newComment.userAvatar,
        createdAt: newComment.createdAt
      };
      
      // Update state with the new comment
      setFashionPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [formattedComment, ...p.comments],
            commentCount: p.commentCount + 1
          };
        }
        return p;
      }));
      
      console.log(`Successfully added comment to post ${postId}`);
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };
  
  // We now use the shared isRealUserId utility function from userUtils.ts
  
  // Toggle comments section expansion - simplified approach
  const toggleComments = async (postId: string) => {
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
      
      // Fetch real comments from Firestore if this is a real post
      const post = fashionPosts.find(p => p.id === postId);
      if (post && isRealUserId(post.userId) && !post.id.includes('mock')) {
        try {
          console.log(`Fetching real comments for post ${postId}`);
          const comments = await getCommentsByPost(postId);
          
          // Convert to the app's comment format - even if we have 0 real comments
          const formattedComments = comments.map(comment => ({
            id: comment.id,
            username: comment.username,
            userId: comment.userId,
            text: comment.text,
            timeAgo: comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) + ' ago' : 'Just now',
            likes: comment.likes,
            userAvatar: comment.userAvatar,
            createdAt: comment.createdAt
          }));
          
          // Update the post with real comments and correct comment count
          setFashionPosts(prev => prev.map(p => {
            if (p.id === postId) {
              console.log(`Updating post ${postId} with ${formattedComments.length} real comment(s)`);
              return {
                ...p,
                comments: formattedComments,
                commentCount: formattedComments.length
              };
            }
            return p;
          }));
        } catch (error) {
          console.error('Error fetching real comments:', error);
          // Keep using the existing sample comments if there's an error
        }
      }
      
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
    const post = fashionPosts.find(p => p.id === postId);
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
    fashionPosts.forEach((post, index) => {
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
    const post = fashionPosts.find(p => p.id === postId);
    
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

  // Render fashion inspiration post
  // Memoize the renderFashionPost function for better performance
  const renderFashionPost = useCallback(({ item, index }: { item: FashionPost; index: number }) => {
    // Remove excessive console logs in production for better performance
    if (__DEV__) {
      console.log(`⭐ Rendering post #${index} with ID: ${item.id}`);
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
          isDarkMode && styles.darkInspirationCard,
          { 
            backgroundColor: cardBgColor,
            borderColor: borderColor,
            opacity,
            transform: [{ translateY }],
            // Enhanced dynamic shadows are now handled in the styles themselves
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
                console.log('PROFILE IMAGE CLICK - userId:', item.userId);
                
                // Check if this post is from the current user
                const currentUser = auth().currentUser;
                // Add debug logs to see what's causing the mismatch
                console.log('COMPARING - Post userId:', item.userId, 'type:', typeof item.userId);
                console.log('COMPARING - Current user uid:', currentUser?.uid, 'type:', typeof currentUser?.uid);
                console.log('COMPARING - Are they equal?', currentUser?.uid === item.userId);
                
                // Check for valid userIds (not unknown or mock users)
                const isRealUserId = item.userId && 
                  !item.userId.includes('unknown') && 
                  !item.userId.includes('mock');
                  
                if (currentUser && isRealUserId && item.userId === currentUser.uid) {
                  // If it's the current user, navigate to ProfileTab
                  console.log('This is the current user, navigating to ProfileTab');
                  // Navigate to profile within the same tab group
                  (navigation as any).jumpTo('ProfileTab');
                } else {
                  // Check if this is a mock/unknown user or a real user
                  const isMockOrUnknown = item.userId && 
                    (item.userId.includes('unknown') || item.userId.includes('mock'));
                    
                  if (isMockOrUnknown) {
                    console.log('This is a demo/mock user, showing friendly message');
                    // You could show an alert or toast here instead of navigating
                    alert('This is a demo profile and not available for viewing.');
                  } else {
                    // If it's a real user, navigate to UserDetailScreen
                    console.log('This is another user, navigating to UserDetailScreen');
                                            navigation.navigate('UserDetailScreen', { 
                          userId: item.userId, 
                          username: item.username
                        });
                  }
                }
              }}
            >
              {item.userAvatar && item.userAvatar.trim() ? (
                <Image
                  source={{ uri: item.userAvatar }}
                  style={[
                    styles.profileImage,
                    {
                      borderWidth: 1,
                      borderColor: isDarkMode
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.1)'
                    }
                  ]}
                />
              ) : (
                <View style={[
                  styles.profileImage,
                  {
                    backgroundColor: '#0D8ABC',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDarkMode
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.1)'
                  }
                ]}>
                  <Text style={[
                    styles.defaultProfileText,
                    {
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: 'bold'
                    }
                  ]}>
                    {item.userDisplayName ? 
                      item.userDisplayName.charAt(0).toUpperCase() : 
                      item.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.userTextInfo}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => {
                  console.log('USERNAME CLICK - userId:', item.userId);
                  
                  // Check if this post is from the current user
                  const currentUser = auth().currentUser;
                  // Add debug logs to see what's causing the mismatch
                  console.log('COMPARING - Post userId:', item.userId, 'type:', typeof item.userId);
                  console.log('COMPARING - Current user uid:', currentUser?.uid, 'type:', typeof currentUser?.uid);
                  console.log('COMPARING - Are they equal?', currentUser?.uid === item.userId);
                  
                  // Check for valid userIds (not unknown or mock users)
                const isRealUserId = item.userId && 
                  !item.userId.includes('unknown') && 
                  !item.userId.includes('mock');
                  
                if (currentUser && isRealUserId && item.userId === currentUser.uid) {
                    // If it's the current user, navigate to ProfileTab
                    console.log('This is the current user, navigating to ProfileTab');
                    // Navigate to profile within the same tab group
                    (navigation as any).jumpTo('ProfileTab');
                  } else {
                    // Check if this is a mock/unknown user or a real user
                    const isMockOrUnknown = item.userId && 
                      (item.userId.includes('unknown') || item.userId.includes('mock'));
                      
                    if (isMockOrUnknown) {
                      console.log('This is a demo/mock user, showing friendly message');
                      // You could show an alert or toast here instead of navigating
                      alert('This is a demo profile and not available for viewing.');
                    } else {
                      // If it's a real user, navigate to UserDetailScreen
                      console.log('This is another user, navigating to UserDetailScreen');
                      navigation.navigate('UserDetailScreen', { 
                        userId: item.userId, 
                        username: item.username
                      });
                    }
                  }
                }}
              >
                <View style={styles.usernameContainer}>
                  <Text style={[styles.username, { color: textColor }]}>
                    {item.userDisplayName ? item.userDisplayName : `@${item.username}`}
                  </Text>
                  {item.username.includes('verified') && (
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
            <View style={styles.userActionButtons}>
              {/* Only show action buttons if it's not the current user's post */}
              {(() => {
                const currentUser = auth().currentUser;
                const showActions = currentUser && currentUser.uid !== item.userId && isRealUserId(item.userId);
                
                if (showActions) {
                  return (
                    <>
                      <TouchableOpacity 
                        style={[
                          styles.followButton,
                          item.isFollowing ? styles.followingButton : styles.followButton,
                          { backgroundColor: item.isFollowing ? 'transparent' : mainColor }
                        ]}
                        onPress={() => handleFollowToggle(item.id, item.userId)}
                      >
                        <Text style={[
                          styles.followButtonText, 
                          { color: item.isFollowing ? mainColor : '#FFFFFF' }
                        ]}>
                          {item.isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                }
                
                return (
                  <TouchableOpacity style={styles.moreOptionsButton}>
                    <Icon name="ellipsis-horizontal" size={18} color={subTextColor} />
                  </TouchableOpacity>
                );
              })()}
            </View>
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
          <Image 
            source={{ uri: item.gallery[currentImageIndex] }} 
            style={styles.galleryImage}
          />
          
          {/* Subtle overlay for depth */}
          <View style={styles.galleryOverlay} />
          
          {/* Inner shadow/border for refinement */}
          <View style={[
            styles.galleryInnerShadow,
            isDarkMode && { borderColor: 'rgba(124, 107, 255, 0.15)' }
          ]} />
          
          {/* Image navigation dots */}
          {item.gallery.length > 1 && (
            <View style={styles.galleryDots}>
              {item.gallery.map((_, i: number) => (
                <View 
                  key={`dot-${i}`} 
                  style={[
                    styles.galleryDot, 
                    i === currentImageIndex && {
                      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                      width: 8,
                    }
                  ]} 
                />
              ))}
            </View>
          )}
          
          {/* Left/Right navigation buttons for gallery */}
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

        {/* Removed aesthetic section - styling moved to user tags */}

        {/* Caption Section */}
        <View style={styles.captionContainer}>
                  <Text style={[
          styles.captionText, 
          isDarkMode && styles.darkCaptionText,
          { color: subTextColor }
        ]}>
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

        {/* Tags Section - Now with enhanced aesthetic styling */}
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
                  styles.aestheticPill, // Using the beautiful aesthetic pill styling
                  isDarkMode && styles.darkAestheticPill,
                  { 
                    backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.12)' : 'rgba(82, 69, 204, 0.08)',
                    borderColor: isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)',
                    marginRight: 8, // Space between tags
                  }
                ]}
              >
                <Text style={[styles.aestheticText, { color: mainColor }]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Featured Pieces Section */}
                  <View style={[
            styles.piecesContainer,
            isDarkMode && styles.darkPiecesContainer
          ]}>
            <Text style={[styles.piecesHeading, { color: textColor }]}>Featured Pieces</Text>
          
          {item.outfitItems.length > 0 ? (
            <View>
              {/* Show indicator that there are more items if count > 4 */}
              {item.outfitItems.length > 4 && (
                <View style={styles.piecesCountHeader}>
                  <Text style={[styles.piecesCount, { color: subTextColor }]}>
                    {item.outfitItems.length} pieces • Swipe to see all
                  </Text>
                  <View style={styles.swipeIndicators}>
                    <Icon name="chevron-back" size={12} color={subTextColor} />
                    <Icon name="chevron-forward" size={12} color={subTextColor} />
                  </View>
                </View>
              )}
              
              {/* Horizontal scrollable list for pieces */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.piecesScrollView}
                contentContainerStyle={styles.piecesScrollContent}
                snapToInterval={item.outfitItems.length > 4 ? (width * 0.88) / 2 : undefined}
                decelerationRate="fast"
              >
                {item.outfitItems.map((piece, i) => {
                  // Determine icon based on piece type if available, or use fallback
                  let iconName = 'tshirt-crew';
                  
                  if (piece.type) {
                    if (piece.type === 'shirt') {
                      iconName = 'tshirt-crew';
                    } else if (piece.type === 'pants') {
                      iconName = 'tights';
                    } else if (piece.type === 'shoes') {
                      iconName = 'shoe-heel';
                    } else if (piece.type === 'watch') {
                      iconName = 'watch';
                    } else if (piece.type === 'jewelry') {
                      // Jewelry with item name-based detection
                      const nameLower = piece.name.toLowerCase();
                      if (nameLower.includes('ring')) {
                        iconName = 'diamond-stone';
                      } else if (nameLower.includes('necklace') || nameLower.includes('chain')) {
                        iconName = 'necklace';
                      } else if (nameLower.includes('bracelet')) {
                        iconName = 'bracelet';
                      } else if (nameLower.includes('earring')) {
                        iconName = 'ear-hearing';
                      } else {
                        iconName = 'diamond-stone'; // Default jewelry icon
                      }
                    } else if (piece.type === 'accessory') {
                      // Generic accessory - try to detect type from name
                      const nameLower = piece.name.toLowerCase();
                      if (nameLower.includes('watch')) {
                        iconName = 'watch';
                      } else if (nameLower.includes('glass')) {
                        iconName = 'sunglasses';
                      } else if (nameLower.includes('hat') || nameLower.includes('cap')) {
                        iconName = 'hat-fedora';
                      } else if (nameLower.includes('bag') || nameLower.includes('purse')) {
                        iconName = 'shopping-outline';
                      } else {
                        iconName = 'sunglasses'; // Default accessory icon
                      }
                    }
                  } else {
                    // Fallback if no type
                    iconName = ['tshirt-crew', 'tights', 'shoe-heel', 'watch'][i % 4];
                  }
                  
                  // Determine if piece has affiliate link and/or scraped product data
                  const hasLink = !!piece.affiliateLink;
                  const hasScrapedProduct = !!piece.scrapedProduct;
                  const shouldShowModal = hasLink && hasScrapedProduct;
                  
                  return (
                    <TouchableOpacity 
                      key={`piece-${i}`}
                      style={[
                        styles.pieceItem,
                        isDarkMode && styles.darkPieceItem,
                        { borderColor: hasLink ? mainColor : borderColor },
                        hasLink && { 
                          backgroundColor: isDarkMode 
                            ? 'rgba(124, 107, 255, 0.08)' 
                            : 'rgba(82, 69, 204, 0.04)' 
                        },
                        // Add red glowy outline for pieces with scraped product data
                        shouldShowModal && {
                          borderWidth: 2,
                          borderColor: mainColor,
                          shadowColor: mainColor,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 8,
                        }
                      ]}
                      onPress={() => {
                        if (shouldShowModal) {
                          // Show product details modal for pieces with scraped data
                          console.log(`🎭 Opening product modal for: ${piece.name}`);
                          console.log(`🎭 Piece object:`, piece);
                          console.log(`🎭 Has scraped product:`, !!piece.scrapedProduct);
                          setSelectedProduct(piece);
                          setShowProductModal(true);
                        } else if (hasLink) {
                          // Open link directly for pieces without scraped data
                          console.log(`Opening link: ${piece.affiliateLink}`);
                          // Open link in browser
                          Linking.canOpenURL(piece.affiliateLink!)
                            .then(supported => {
                              if (supported) {
                                return Linking.openURL(piece.affiliateLink!);
                              } else {
                                throw new Error(`Cannot open URL: ${piece.affiliateLink}`);
                              }
                            })
                            .catch(err => {
                              console.error('Error opening link:', err);
                              Alert.alert(
                                'Could not open link',
                                'The link cannot be opened. It may be invalid or your device does not support opening this type of link.'
                              );
                            });
                        }
                      }}
                      activeOpacity={hasLink ? 0.6 : 1}
                    >
                      <MaterialIcon 
                        name={iconName}
                        size={18} 
                        color={mainColor} 
                      />
                      <View style={styles.pieceDetails}>
                        <Text style={[styles.pieceName, { color: textColor }]} numberOfLines={1}>
                          {piece.name}
                        </Text>
                        <View style={styles.pieceBrandRow}>
                          <Text style={[styles.pieceBrand, { color: mainColor }]}>
                            {piece.brand}
                          </Text>
                          {hasLink && (
                            <FeatherIcon 
                              name="external-link" 
                              size={12} 
                              color={mainColor} 
                              style={styles.pieceLink}
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyPiecesContainer}>
              <MaterialIcon name="tshirt-crew-outline" size={24} color={subTextColor} style={{opacity: 0.5}} />
              <Text style={[styles.emptyPiecesText, {color: subTextColor}]}>
                No featured pieces for this post
              </Text>
            </View>
          )}
        </View>

        {/* Post Actions */}
        <View style={[styles.postActions, { borderTopColor: borderColor }]}>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                item.isUpvoted && styles.actionButtonActive,
                item.isUpvoted && isDarkMode && styles.darkActionButtonActive,
                item.isUpvoted && { backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)' }
              ]}
              onPress={() => handleUpvoteToggle(item.id)}
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
                expandedComments === item.id && styles.actionButtonActive,
                expandedComments === item.id && isDarkMode && styles.darkActionButtonActive,
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
                {item.commentCount > 0 
                  ? `${item.commentCount} ${expandedComments === item.id ? 'Comments' : 'Discuss'}`
                  : expandedComments === item.id ? 'No comments' : 'Discuss'
                }
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.saveButton,
              item.isSaved && styles.saveButtonActive,
              item.isSaved && isDarkMode && styles.darkActionButtonActive,
              item.isSaved && { backgroundColor: isDarkMode ? 'rgba(255, 186, 13, 0.15)' : 'rgba(255, 177, 0, 0.08)' }
            ]}
            onPress={() => handleSaveToggle(item.id)}
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
        {expandedComments === item.id && (
          <View 
            style={[
              styles.commentsSection,
              isDarkMode && styles.darkCommentsSection,
              { borderTopColor: borderColor, borderTopWidth: 1 }
            ]}
          >
            {/* Comments header with collapse button */}
            <View style={[
              styles.commentsHeader,
              isDarkMode && styles.darkCommentsHeader
            ]}>
              <Text style={[
                styles.commentsTitle, 
                isDarkMode && styles.darkCommentsTitle,
                { color: textColor }
              ]}>
                Comments ({item.commentCount})
              </Text>
              <TouchableOpacity 
                style={[
                  styles.collapseButton,
                  isDarkMode && styles.darkCollapseButton
                ]}
                onPress={() => toggleComments(item.id)}
              >
                <FeatherIcon name="chevron-up" size={18} color={mainColor} />
              </TouchableOpacity>
            </View>
            
            {/* Scrollable comments list */}
            <View style={styles.commentsScrollView}>
              <FlatList
                data={expandedComments === item.id ? item.comments : []}
                keyExtractor={(comment) => comment.id}
                ListEmptyComponent={() => (
                  <View style={styles.emptyCommentsContainer}>
                    <FeatherIcon name="message-circle" size={24} color={subTextColor} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyCommentsText, { color: subTextColor }]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </View>
                )}
                renderItem={({item: comment, index}) => (
                  <View 
                    style={[
                      styles.commentItem,
                      { backgroundColor: cardBgColor },
                      isDarkMode && styles.darkCommentItem,
                      index !== item.comments.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(150, 150, 150, 0.1)'
                      }
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          // Check if this is the current user commenting
                          const currentUser = auth().currentUser;
                          
                          // Add debug logs to see what's being compared
                          console.log('COMMENT COMPARING - Comment username:', comment.username);
                          console.log('COMMENT COMPARING - Current user displayName:', currentUser?.displayName);
                          console.log('COMMENT COMPARING - Current user email prefix:', currentUser?.email?.split('@')[0]);
                          
                          if (currentUser && 
                             (currentUser.displayName === comment.username || 
                              (currentUser.email && comment.username === currentUser.email.split('@')[0]))) {
                            // If comment is from current user, navigate to ProfileTab
                            console.log('This is the current user comment, navigating to ProfileTab');
                            (navigation as any).jumpTo('ProfileTab');
                          } else {
                            // Comments are typically generated/demo users
                            // We'll show an alert for these generated comment users
                            console.log('This is a generated comment user, showing friendly message');
                            alert('This is a demo commenter profile and not available for viewing.');
                            
                            // Keeping this code commented for reference if you want to enable it later
                            /*
                            const userId = `comment_user_${comment.id}`;
                            console.log('This is another user comment, navigating to UserDetailScreen');
                            navigation.navigate('UserDetailScreen', { 
                              userId, 
                              username: comment.username 
                            });
                            */
                          }
                        }}
                      >
                        <Text style={[styles.commentUsername, { color: textColor }]}>
                          {comment.username}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.commentTime, { color: subTextColor }]}>
                        {comment.timeAgo}
                      </Text>
                    </View>
                    
                    <Text style={[styles.commentText, { color: subTextColor }]}>
                      {comment.text}
                    </Text>
                    
                    <View style={styles.commentActions}>
                      <TouchableOpacity 
                        style={styles.commentLike}
                        onPress={() => {
                          // For real comments, we would call likeComment here
                          // For demo/mock comments, just show a message
                          const currentUser = auth().currentUser;
                          if (!currentUser) {
                            alert('You need to be logged in to like comments');
                            return;
                          }
                          
                          if (item.id.includes('mock') || !isRealUserId(item.userId)) {
                            alert('Cannot like comments on demo posts');
                            return;
                          }
                          
                          // Optimistically update UI
                          setFashionPosts(prev => prev.map(p => {
                            if (p.id === item.id) {
                              return {
                                ...p,
                                comments: p.comments.map(c => {
                                  if (c.id === comment.id) {
                                    return {
                                      ...c,
                                      likes: c.likes + 1
                                    };
                                  }
                                  return c;
                                })
                              };
                            }
                            return p;
                          }));
                          
                          // Call the API
                          likeComment(comment.id).catch(error => {
                            console.error('Error liking comment:', error);
                            // Revert UI change on error
                            setFashionPosts(prev => prev.map(p => {
                              if (p.id === item.id) {
                                return {
                                  ...p,
                                  comments: p.comments.map(c => {
                                    if (c.id === comment.id) {
                                      return {
                                        ...c,
                                        likes: comment.likes
                                      };
                                    }
                                    return c;
                                  })
                                };
                              }
                              return p;
                            }));
                          });
                        }}
                      >
                        <FeatherIcon name="heart" size={14} color={iconColor} />
                        {comment.likes > 0 && (
                          <Text style={[styles.commentLikeCount, { color: subTextColor }]}>
                            {comment.likes}
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
                )}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                style={styles.commentsList}
              />
            </View>
            
            {/* Add comment input */}
            <View style={[
              styles.addCommentRow,
              { backgroundColor: cardBgColor },
              isDarkMode && styles.darkAddCommentRow
            ]}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={subTextColor}
                style={[
                  styles.commentInput,
                  isDarkMode && styles.darkCommentInput,
                  { color: textColor }
                ]}
                onChangeText={(text) => {
                  // Add a comment text state variable for each post
                  if (!commentsText) {
                    setCommentsText({});
                  }
                  setCommentsText({
                    ...commentsText,
                    [item.id]: text
                  });
                }}
                value={commentsText?.[item.id] || ''}
              />
              <TouchableOpacity 
                style={[styles.postCommentButton, { backgroundColor: mainColor }]}
                onPress={() => {
                  if (commentsText?.[item.id]?.trim()) {
                    // Show loading indicator
                    const currentPostId = item.id;
                    setIsAddingComment(currentPostId);
                    
                    handleAddComment(currentPostId, commentsText[currentPostId])
                      .then(() => {
                        // Clear the input after submitting
                        setCommentsText({
                          ...commentsText,
                          [currentPostId]: ''
                        });
                      })
                      .catch(err => {
                        console.error('Failed to post comment:', err);
                        Alert.alert('Error', 'Failed to post comment. Please try again.');
                      })
                      .finally(() => {
                        setIsAddingComment(null);
                      });
                  }
                }}
                disabled={isAddingComment === item.id}
              >
                {isAddingComment === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FeatherIcon name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  }, [expandedPost, activeGalleryIndex, postAnimations, panXValues, panResponders, 
    handleLikeToggle, handleSaveToggle, toggleComments, handleAddComment, 
    textColor, subTextColor, cardBgColor, borderColor, mainColor, isDarkMode, 
    navigation, isAddingComment, commentsText, expandedComments]);


  // Messages modal components
  const renderMessagesModal = () => {
    if (!showMessagesModal) return null;
    
    // Determine which view to show - conversation list or selected conversation
    const isConversationSelected = selectedConversation !== null;
    
    return (
      <KeyboardAvoidingView
        style={[
          styles.modalOverlay, 
          { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={[
          styles.messagesModal, 
          { backgroundColor: cardBgColor },
          isDarkMode && { borderColor: '#2C2C2E', borderWidth: 1 }
        ]}>
          <View style={styles.messagesHeader}>
            {isConversationSelected ? (
              // Show back button and conversation name
              <View style={styles.conversationHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setSelectedConversation(null)}
                >
                  <Icon name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>
                <View style={styles.conversationInfo}>
                  <Text style={[styles.messagesTitle, { color: textColor }]}>
                    {selectedConversation.otherUserName}
                  </Text>
                </View>
              </View>
            ) : (
              // Show messages title
              <View style={styles.messagesHeaderContent}>
                <Text style={[styles.messagesTitle, { color: textColor }]}>Messages</Text>
                {isLoadingConversations && <ActivityIndicator size="small" color={mainColor} style={{marginLeft: 10}} />}
              </View>
            )}
            <TouchableOpacity onPress={() => {
              setShowMessagesModal(false);
              setSelectedConversation(null);
            }}>
              <Icon name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          {isConversationSelected ? (
            // Show selected conversation messages
            <View style={styles.conversationContainer}>
              {/* Message list would go here */}
              <TouchableOpacity 
                style={styles.conversationMessages} 
                activeOpacity={1}
                onPress={() => Keyboard.dismiss()}
              >
                <Text style={[styles.conversationPlaceholder, {color: subTextColor}]}>
                  This is the beginning of your conversation with {selectedConversation.otherUserName}.
                </Text>
              </TouchableOpacity>
              
              {/* Message input with keyboard handling */}
              <View style={styles.messageInputContainer}>
                <TextInput
                  placeholder="Type a message..."
                  placeholderTextColor={subTextColor}
                  style={[
                    styles.messageInput,
                    { 
                      color: textColor,
                      backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : 'rgba(240, 240, 240, 0.8)',
                      borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.3)' : 'rgba(210, 210, 210, 1)'
                    }
                  ]}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  autoFocus
                  maxLength={500}
                  blurOnSubmit={false}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    handleSendMessage();
                  }}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendMessageButton, 
                    { backgroundColor: mainColor },
                    (!messageText.trim() || isSendingMessage) && { opacity: 0.5 }
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleSendMessage();
                  }}
                  disabled={!messageText.trim() || isSendingMessage}
                >
                  {isSendingMessage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <FeatherIcon name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Show conversations list
            <>
              <FlatList
                data={conversations}
                keyExtractor={item => item.id || item.otherUserId}
                renderItem={({ item }) => {
                  // Calculate if there are unread messages from this user
                  const hasUnread = item.unreadCount && 
                                   item.unreadCount[auth().currentUser?.uid || ''] > 0;
                                   
                  return (
                    <TouchableOpacity 
                      style={[
                        styles.messageItem, 
                        hasUnread && { backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.08)' : 'rgba(82, 69, 204, 0.04)' }
                      ]}
                      onPress={() => {
                        setSelectedConversation(item);
                        // Mark as read when opening conversation
                        if (hasUnread) {
                          markConversationAsRead(item.otherUserId)
                            .then(() => fetchConversations())
                            .catch(err => console.error('Error marking as read:', err));
                        }
                      }}
                    >
                      <Image
                        source={getAvatarSource(item.otherUserAvatar || undefined, undefined, item.otherUserName)}
                        style={styles.messageAvatar}
                      />
                      <View style={styles.messageContent}>
                        <View style={styles.messageTop}>
                          <Text style={[styles.messageUser, { color: textColor }]}>
                            {item.otherUserName}
                          </Text>
                          <Text style={[styles.messageTime, { color: subTextColor }]}>
                            {item.lastMessageTime}
                          </Text>
                        </View>
                        <Text 
                          style={[
                            styles.messageText, 
                            { color: hasUnread ? textColor : subTextColor }
                          ]} 
                          numberOfLines={1}
                        >
                          {item.lastMessage || 'Start a conversation...'}
                        </Text>
                      </View>
                      {hasUnread && (
                        <View style={[styles.unreadIndicator, { backgroundColor: mainColor }]} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                refreshing={isLoadingConversations}
                onRefresh={fetchConversations}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Icon name="chatbubbles-outline" size={60} color={subTextColor} />
                    <Text style={[styles.emptyMessagesText, { color: subTextColor }]}>
                      {isLoadingConversations 
                        ? 'Loading conversations...' 
                        : 'No messages yet. Start a conversation!'}
                    </Text>
                  </View>
                }
              />
              
              {/* New message button - we'll change this to be a ComposeIcon in the header instead */}
              <TouchableOpacity 
                style={[styles.newMessageButton, { backgroundColor: mainColor }]}
                onPress={() => {
                  // This would be replaced with a navigation to a user search screen
                  alert('To message someone, tap on their profile in a post.');
                }}
              >
                <FeatherIcon name="edit-2" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header - Clean Apple-style design */}
      <View 
                  style={[
            styles.header,
            { 
              backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }
          ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
                          <Text style={[
                styles.headerTitle, 
                { color: isDarkMode ? '#FFFFFF' : '#202020' }
              ]}>
                Feed
              </Text>
              <Text style={[
                styles.headerSubtitle, 
                { color: isDarkMode ? '#B8B8CC' : '#757575' }
              ]}>
                Community inspiration
              </Text>
          </View>
          <View style={styles.headerRightContainer}>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => navigation.navigate('SearchScreen')}
            >
                                              <FeatherIcon 
                  name="search" 
                  size={22} 
                  color={isDarkMode ? '#007AFF' : '#007AFF'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => {
                  const currentUser = auth().currentUser;
                  if (!currentUser) {
                    Alert.alert('Sign In Required', 'You need to be signed in to create a post');
                    return;
                  }
                  navigation.navigate('CreatePostScreen');
                }}
              >
                <FeatherIcon 
                  name="plus" 
                  size={22} 
                  color={isDarkMode ? '#007AFF' : '#007AFF'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => {
                  const currentUser = auth().currentUser;
                  if (!currentUser) {
                    Alert.alert('Sign In Required', 'You need to be signed in to view messages');
                    return;
                  }
                  navigation.navigate('MessagingScreen', {});
                }}
              >
                <FeatherIcon 
                  name="message-circle" 
                  size={22} 
                  color={isDarkMode ? '#007AFF' : '#007AFF'} 
                />
              </TouchableOpacity>
            </View>
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
          data={fashionPosts}
          renderItem={renderFashionPost}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={[
            styles.listContent,
            { backgroundColor: 'transparent' },
            isDarkMode && { paddingTop: 4 }
          ]}
          
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          // Performance optimizations
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={9}
          updateCellsBatchingPeriod={50}
          getItemLayout={(data, index) => ({
            length: 520, // Approximate height of each post item
            offset: 520 * index,
            index,
          })}
          ListHeaderComponent={
            <>

              {refreshing && (
                <View style={[
                  styles.refreshIndicator,
                  { backgroundColor: isDarkMode ? 'transparent' : 'transparent' }
                ]}>
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
            <View style={[
              styles.emptyContainer,
              { backgroundColor: isDarkMode ? 'transparent' : 'transparent' }
            ]}>
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
          // Check if user is logged in
          const currentUser = auth().currentUser;
          if (!currentUser) {
            Alert.alert('Sign In Required', 'You need to be signed in to create posts');
            return;
          }
          navigation.navigate('CreatePostScreen');
        }}
      >
        <Icon name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Messages Modal */}
      {renderMessagesModal()}

      {/* Product Details Modal */}
      <ProductDetailsModal
        visible={showProductModal}
        product={selectedProduct}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProduct(null);
        }}
        onOpenProduct={handleOpenProduct}
        isDarkMode={isDarkMode}
        mainColor={mainColor}
        cardBgColor={cardBgColor}
        textColor={textColor}
        subTextColor={subTextColor}
        borderColor={borderColor}
      />

      {/* No longer need custom bottom navigation bar - using Tab Navigator */}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default SocialScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Don't set backgroundColor here - it should come from the dynamic prop
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
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
    letterSpacing: 0.2,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButton: {
    display: 'none',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 100,
  },
  
  
  // Fashion inspiration card styling - Enhanced depth and shadows
  inspirationCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0,
    backgroundColor: '#FFFFFF', // Default solid background for shadow efficiency
    // Enhanced multi-layered shadow system
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    // backgroundColor can be overridden dynamically via cardBgColor
  },
  inspirationHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    // Remove shadow properties - they cannot be applied to Image components
    // If shadow is needed, apply it to a wrapper View instead
  },
  userTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },
  followingButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
  },
  followButtonText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    color: '#FFFFFF',
  },
  followingButtonText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    color: '#8E8E93',
  },
  messageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
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
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  titleContainer: {
    marginTop: 4,
  },
  inspirationTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  publishDate: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
    color: '#8E8E93',
  },
  
  // Gallery - Enhanced with overlays and depth
  galleryContainer: {
    position: 'relative',
    height: width * 0.8,
    backgroundColor: '#FFFFFF', // Solid background for shadow efficiency
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    // Inner shadow effect for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
    pointerEvents: 'none',
  },
  galleryInnerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    pointerEvents: 'none',
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
  
  // Aesthetic section removed - styling moved to user tags
  aestheticPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 0,
    backgroundColor: '#F2F2F7',
    // Subtle shadow for aesthetic pill
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  aestheticText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0,
  },
  
  // Caption section
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  captionText: {
    ...defaultTextStyle,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    color: '#1C1C1E',
  },
  readMoreText: {
    ...defaultTextStyle,
    fontWeight: '600',
    color: '#007AFF',
    letterSpacing: 0,
  },
  
  // Tags section
  tagsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 0,
  },
  // Old tag styles removed - now using aesthetic pill styling for user tags
  
  // Featured pieces section
  piecesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  piecesHeading: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0,
    color: '#1C1C1E',
  },
  piecesCountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  piecesCount: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  swipeIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  piecesScrollView: {
    marginBottom: 4,
  },
  piecesScrollContent: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  piecesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.4,
    marginRight: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 0,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    // Enhanced shadow for piece items
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pieceDetails: {
    marginLeft: 8,
    flex: 1,
  },
  pieceName: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  pieceBrand: {
    ...defaultTextStyle,
    fontSize: 11,
    marginTop: 2,
    color: '#8E8E93',
  },
  pieceBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  pieceLink: {
    marginLeft: 4,
  },
  emptyPiecesContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 16,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyPiecesText: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 8,
  },
  
  // Post actions - Apple-style clean design
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: 'transparent',
    // Subtle shadow for buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    // Enhanced shadow when active
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  saveButtonActive: {
    backgroundColor: 'transparent',
  },
  actionText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 6,
    letterSpacing: 0,
    color: '#8E8E93',
  },
  actionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Comments section - Enhanced design
  commentsSection: {
    overflow: 'hidden',
    backgroundColor: 'rgba(248, 248, 248, 0.5)',
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  commentsTitle: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  collapseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
  },
  commentsScrollView: {
    maxHeight: 240,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  commentItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    // backgroundColor will be set dynamically
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentUsername: {
    ...defaultTextStyle,
    fontWeight: '600',
    fontSize: 14,
    color: '#1C1C1E',
  },
  commentTime: {
    ...defaultTextStyle,
    fontSize: 12,
    color: '#8E8E93',
  },
  commentText: {
    ...defaultTextStyle,
    fontSize: 14,
    lineHeight: 20,
    color: '#1C1C1E',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  commentLikeCount: {
    ...defaultTextStyle,
    fontSize: 12,
    marginLeft: 4,
    color: '#8E8E93',
  },
  commentReply: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    // backgroundColor will be set dynamically
  },
  commentInput: {
    ...defaultTextStyle,
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F2F2F7',
    fontSize: 14,
    color: '#1C1C1E',
  },
  postCommentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#007AFF',
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
    maxHeight: '80%',
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
  emptyCommentsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCommentsText: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
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
  
  // Conversation styles
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messagesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // This ensures the input stays at the bottom
  },
  conversationMessages: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100, // Ensure there's always space here
  },
  conversationPlaceholder: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  messageInputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle background to distinguish input area
    minHeight: 60,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16, // Slightly larger font
    maxHeight: 100,
    minHeight: 40,
  },
  sendMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  defaultProfileText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Dark mode styles - Enhanced shadows for dark theme
  darkInspirationCard: {
    backgroundColor: '#1C1C1E',
    borderColor: '#2C2C2E',
    // Enhanced shadow for dark mode with color tint
    shadowColor: '#7C6BFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  darkCaptionText: {
    color: '#FFFFFF',
  },
  darkAestheticPill: {
    backgroundColor: '#2C2C2E',
  },
  // darkTagPill removed - now using darkAestheticPill for user tags
  darkPiecesContainer: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  darkPieceItem: {
    backgroundColor: '#2C2C2E',
  },
  darkFollowingButton: {
    backgroundColor: '#2C2C2E',
  },
  darkMessageButton: {
    backgroundColor: '#2C2C2E',
  },
  // Dark mode comments styles
  darkCommentsSection: {
    backgroundColor: 'rgba(44, 44, 46, 0.5)',
  },
  darkCommentsHeader: {
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  darkCommentsTitle: {
    color: '#FFFFFF',
  },
  darkCollapseButton: {
    backgroundColor: '#2C2C2E',
  },
  darkCommentItem: {
    backgroundColor: '#1C1C1E',
  },
  darkCommentUsername: {
    color: '#FFFFFF',
  },
  darkCommentText: {
    color: '#FFFFFF',
  },
  darkAddCommentRow: {
    backgroundColor: '#1C1C1E',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  darkCommentInput: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    color: '#FFFFFF',
  },
  darkActionButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderColor: 'rgba(0, 122, 255, 0.4)',
  },
  
  // Product Details Modal Styles
  productModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  productModalContent: {
    height: '90%',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  productModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  productModalHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productModalHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  productModalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  productModalHeaderSubtitle: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  productModalScrollView: {
    flex: 1,
  },
  productModalScrollContent: {
    paddingBottom: 30,
  },
  productModalHeroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  productModalImageContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  productModalImageWrapper: {
    width: '100%',
    height: '100%',
  },
  productModalProductImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  productModalImageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productModalImageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  productModalFloatingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  productModalBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  productModalBrandBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  productModalInfoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productModalTitleContainer: {
    marginBottom: 16,
  },
  productModalProductName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 28,
  },
  productModalPrice: {
    fontSize: 24,
    fontWeight: '800',
  },
  productModalStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  productModalStoreText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  productModalDescriptionContainer: {
    marginBottom: 24,
  },
  productModalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  productModalDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  productModalActionButtons: {
    gap: 12,
  },
  productModalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  productModalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  productModalNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  productModalNavButtonLeft: {
    left: 16,
  },
  productModalNavButtonRight: {
    right: 16,
  },
});

const getClothingIconName = (itemName: string): string => {
  const lowerCaseName = itemName.toLowerCase();
  if (lowerCaseName.includes('shirt') || lowerCaseName.includes('top')) {
    return 'tshirt-crew';
  } else if (lowerCaseName.includes('shoe') || lowerCaseName.includes('sneaker') || lowerCaseName.includes('boot') || lowerCaseName.includes('heel')) {
    return 'shoe-sneaker'; // More generic shoe icon
  } else if (lowerCaseName.includes('pants') || lowerCaseName.includes('jeans') || lowerCaseName.includes('trousers')) {
    // MaterialCommunityIcons doesn't have a great "pants" icon.
    // 'hanger' or 'tag' might be generic fallbacks. Using 'hanger'.
    return 'hanger';
  } else if (lowerCaseName.includes('hat') || lowerCaseName.includes('cap')) {
    return 'hat-fedora';
  } else if (lowerCaseName.includes('glasses') || lowerCaseName.includes('sunglasses')) {
    return 'sunglasses';
  } else if (lowerCaseName.includes('watch')) {
    return 'watch';
  } else if (lowerCaseName.includes('bag') || lowerCaseName.includes('purse')) {
    return 'purse';
  } else if (lowerCaseName.includes('jacket') || lowerCaseName.includes('coat')) {
    return 'hanger';
  }
  // Default fallback icon
  return 'hanger';
};