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
  Modal,
  Pressable,
  RefreshControl,
} from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../types/NavigationTypes';
import { getUnreadNotificationsCount } from '../services/notificationService';
import auth from '@react-native-firebase/auth';

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

// Post authors/creators
const creators = [
  { username: 'minimal_maven', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { username: 'retroreviver', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { username: 'classic_couturier', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { username: 'scandi_style', avatar: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { username: 'urban_techninja', avatar: 'https://randomuser.me/api/portraits/men/78.jpg' },
  { username: 'eco_elegance', avatar: 'https://randomuser.me/api/portraits/women/54.jpg' }
];

// Generate fashion inspiration posts for the feed
const FASHION_POSTS = Array.from({ length: 6 }).map((_, i) => {
  // Fashion inspiration titles
  const inspirationTitles = [
    'Urban Minimalism',
    'Modern Vintage Fusion',
    'Structured Casual',
    'Elevated Basics',
    'Technical Athleisure',
    'Sustainable Luxury'
  ];
  
  // Different styling notes
  const stylingNotes = [
    'Streamlined silhouettes with monochromatic color blocking create visual interest while maintaining a clean aesthetic. Focus on premium fabrics and perfect fit.',
    'Blending contemporary elements with classic vintage pieces for a timeless yet fresh look. The contrast between old and new creates unique visual interest.',
    'Soft draping combined with architectural lines creates a balanced silhouette that\'s both refined and comfortable for everyday wear.',
    'Reimagining wardrobe essentials with premium materials and subtle design details. The beauty is in the precision of construction and quality of materials.',
    'Technical fabrics and functional details combined with thoughtful layering for a look that transitions seamlessly between activities.',
    'Environmentally conscious design choices featuring organic materials and ethical production methods, without compromising on style or quality.'
  ];
  
  // Style aesthetics
  const aesthetics = [
    'Minimalist',
    'Vintage Revival',
    'Modern Classic',
    'Scandinavian',
    'Tech Streetwear',
    'Sustainable Luxury'
  ];
  
  // Caption and tags for each post
  const postCaptions = [
    'Clean lines and monochromatic palettes that embody simplicity and sophistication.',
    'Contemporary takes on classic vintage pieces that blend nostalgia with modern sensibilities.',
    'Timeless pieces reimagined with subtle contemporary details for everyday elegance.',
    'Functional minimalism with clean lines, natural materials, and subdued colors.',
    'Performance-driven designs blending urban style with technical innovation.',
    'Eco-conscious luxury focusing on ethical production and sustainable materials.'
  ];
  
  // Tags for each post
  const postTags = [
    ['#minimalism', '#monochrome', '#essentials', '#quality'],
    ['#vintage', '#retro', '#reuse', '#timeless'],
    ['#classic', '#tailored', '#structured', '#refined'],
    ['#scandinavian', '#nordic', '#clean', '#functional'],
    ['#techwear', '#urban', '#performance', '#innovative'],
    ['#sustainable', '#ethical', '#conscious', '#eco']
  ];
  
  // Generate data for outfit details - more comprehensive with multiple items
  const outfitItems = [
    [
      {name: 'Oversized Wool Blazer', brand: 'Arket'},
      {name: 'Ribbed Tank', brand: 'COS'},
      {name: 'Wide-Leg Trousers', brand: 'Toteme'},
      {name: 'Leather Loafers', brand: 'ATP Atelier'}
    ],
    [
      {name: 'Vintage Denim Jacket', brand: 'Levi\'s'},
      {name: 'Silk Button-Down', brand: 'Equipment'},
      {name: 'High-Rise Jeans', brand: 'AGOLDE'},
      {name: 'Square-Toe Boots', brand: 'By Far'}
    ],
    [
      {name: 'Belted Trench Coat', brand: 'Burberry'},
      {name: 'Cashmere Turtleneck', brand: 'Vince'},
      {name: 'Tailored Pants', brand: 'The Row'},
      {name: 'Leather Chelsea Boots', brand: 'Common Projects'}
    ],
    [
      {name: 'Merino Crewneck', brand: 'Uniqlo'},
      {name: 'Relaxed Oxford Shirt', brand: 'Acne Studios'},
      {name: 'Straight-Leg Chinos', brand: 'A.P.C.'},
      {name: 'Minimal Sneakers', brand: 'Axel Arigato'}
    ],
    [
      {name: 'Technical Parka', brand: 'Nanamica'},
      {name: 'Performance T-Shirt', brand: 'Lululemon'},
      {name: 'Tapered Track Pants', brand: 'Y-3'},
      {name: 'Knit Runners', brand: 'Adidas'}
    ],
    [
      {name: 'Organic Cotton Overshirt', brand: 'Asket'},
      {name: 'Recycled Wool Sweater', brand: 'Patagonia'},
      {name: 'Hemp Twill Pants', brand: 'Story Mfg.'},
      {name: 'Vegan Leather Boots', brand: 'Veja'}
    ]
  ];
  
  // Generate style approach and notes
  const inspoTag = Math.random() > 0.5 ? 'Fashion Forward' : 'Timeless Style';
  const publishedDate = [`April ${i + 1}`, `May ${i + 10}`, `June ${i + 5}`][i % 3];
  const upvotes = Math.floor(Math.random() * 500) + 100;
  const saves = Math.floor(Math.random() * 200) + 50;
  
  // Generate fake comments
  const commentUsernames = ['grace_style', 'fashion_guru', 'trend_watcher', 'clothescritic', 'runway_fan', 'style_seeker', 'fashionista', 'denim_lover', 'minimal_style'];
  const commentTexts = [
    'Love this aesthetic! Would definitely try combining these pieces.',
    'The color palette is perfect for this season.',
    'Where can I find something similar to that key piece?',
    'Been looking for this exact style inspiration, thanks for sharing!',
    'Already saved this to my collection, great curation!',
    'The silhouette is so flattering, going to try this look tomorrow.',
    'This is exactly what I\'ve been searching for. Do you think it works for all body types?',
    'I\'ve been trying to incorporate more pieces like this into my wardrobe.',
    'The styling here is impeccable. Love how the pieces complement each other.',
    'Just bought something similar and was looking for styling ideas. This is perfect!',
    'Can you recommend any affordable alternatives for the featured pieces?',
    'This would work great for my upcoming event. Thanks for the inspiration!'
  ];
  
  const comments = Array.from({ length: Math.floor(Math.random() * 6) + 5 }).map((_, j) => ({
    id: `${i}-${j}`,
    username: commentUsernames[Math.floor(Math.random() * commentUsernames.length)],
    text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
    timeAgo: `${Math.floor(Math.random() * 12) + 1}h ago`,
    likes: Math.floor(Math.random() * 20)
  }));
  
  // Generate color palette
  const colorPalettes = [
    ['#0F0F0F', '#FFFFFF', '#ECECEC', '#9E9E9E'],
    ['#151A30', '#7A8CB2', '#DCE8F2', '#EAC696'],
    ['#2E2922', '#A68C69', '#F1EFDC', '#CBD3CE'],
    ['#294243', '#0F979A', '#F3F1E0', '#D97762'],
    ['#141E29', '#23395B', '#8EA8C3', '#CBB3BF'],
    ['#3C403D', '#667761', '#ABC4A1', '#E9F5DB']
  ];
  
  return {
    id: i.toString(),
    title: inspirationTitles[i],
    creator: creators[i],
    gallery: [
      `https://picsum.photos/800/1000?random=${i * 3 + 31}`,
      `https://picsum.photos/800/1000?random=${i * 3 + 32}`,
      `https://picsum.photos/800/1000?random=${i * 3 + 33}`
    ],
    aesthetic: aesthetics[i],
    caption: postCaptions[i],
    tags: postTags[i],
    outfitItems: outfitItems[i],
    publishedDate,
    comments,
    commentCount: comments.length,
    upvotes,
    saves,
    isSaved: Math.random() > 0.5,
    isUpvoted: Math.random() > 0.6
  };
});

// Trending topics for the filter chips
const TRENDING_TOPICS = [
  'All', 'Minimalism', 'Summer', 'Workwear', 'Vintage', 'Sustainable', 'Streetwear'
];

const { width } = Dimensions.get('window');
const swipeThreshold = width * 0.3; // 30% of screen width

const SocialScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigation = useNavigation<StackNavigationProp<SocialStackParamList>>();
  const currentUser = auth().currentUser;

  // Use individual animation values for simplicity
  const [commentHeights] = useState<Record<string, number>>({});
  const commentAnimation = useRef(new Animated.Value(0)).current;
  
  // Create refs for post animations
  const postAnimations = useRef<Record<string, Animated.Value>>({});
  const panXValues = useRef<Record<string, Animated.Value>>({});
  const panResponders = useRef<Record<string, any>>({});

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const iconColor = isDarkMode ? '#B8B8CC' : '#757575';
  const accentColor = isDarkMode ? '#FF4870' : '#FF3B5C';
  const saveColor = isDarkMode ? '#FFBA0D' : '#FFB100';

  const toggleExpandPost = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };
  
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

  React.useEffect(() => {
    // Create animations for each post
    FASHION_POSTS.forEach((post, index) => {
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
  }, []);
  
  const createPanResponderForPost = (postId) => {
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
  
  const handleSwipeEnd = (postId, gestureState) => {
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

  // Create random user data for usernames - this is now ONLY used for generating mock data
  useEffect(() => {
    // In a real app, we would fetch user data from an API and store it in a global state
    // or context. For now, we're just setting up sample data for the ViewUserProfileScreen
    // to retrieve when needed.
  }, []);
  
  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadNotificationsCount = async () => {
      if (!currentUser) return;
      
      try {
        const count = await getUnreadNotificationsCount(currentUser.uid);
        setUnreadNotifications(count);
      } catch (error) {
        console.error('Error fetching unread notifications count:', error);
      }
    };
    
    fetchUnreadNotificationsCount();
    
    // In a real app, you would set up a listener for real-time updates
    // or use a refresh mechanism
  }, [currentUser]);
  
  const handleOpenUserProfile = (username: string) => {
    console.log('Navigating to profile for:', username);
    navigation.navigate('ViewUserProfile', { username });
  };
  
  const handleOpenSuggestedUsers = () => {
    navigation.navigate('SuggestedUsers');
  };
  
  const handleOpenNotifications = () => {
    navigation.navigate('Notifications');
  };

  const renderFashionPost = ({ item, index }) => {
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
        {/* Card Header with title, user and publication date */}
        <View style={styles.inspirationHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.inspirationTitle, { color: textColor }]}>
              {item.title}
            </Text>
            <Text style={[styles.publishDate, { color: subTextColor }]}>
              {item.publishedDate}
            </Text>
          </View>
          
          {/* User Profile Section */}
          <TouchableOpacity 
            style={styles.postUser}
            onPress={() => handleOpenUserProfile(item.creator.username)}
          >
            <Image 
              source={{ uri: item.creator.avatar }} 
              style={styles.profileAvatar} 
            />
            <Text style={[styles.profileUsername, { color: textColor }]}>
              @{item.creator.username}
            </Text>
          </TouchableOpacity>
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
          
          {/* Image navigation dots */}
          {item.gallery.length > 1 && (
            <View style={styles.galleryDots}>
              {item.gallery.map((_, i) => (
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.tags.map((tag, i) => (
              <TouchableOpacity 
                key={`tag-${i}`}
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
            ))}
          </ScrollView>
        </View>

        {/* Featured Pieces Section */}
        <View style={styles.piecesContainer}>
          <Text style={[styles.piecesHeading, { color: textColor }]}>Featured Pieces</Text>
          <View style={styles.piecesGrid}>
            {item.outfitItems.map((piece, i) => (
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
                {item.commentCount} {expandedComments === item.id ? 'Comments' : 'Discuss'}
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
        {expandedComments === item.id && (
          <View 
            style={[
              styles.commentsSection,
              { borderTopColor: borderColor, borderTopWidth: 1 }
            ]}
          >
            {/* Comments header with collapse button */}
            <View style={styles.commentsHeader}>
              <Text style={[styles.commentsTitle, { color: textColor }]}>
                Comments ({item.commentCount})
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
            <ScrollView 
              style={styles.commentsScrollView}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.commentsList}>
                {expandedComments === item.id && item.comments.map((comment, i) => (
                  <View 
                    key={comment.id} 
                    style={[
                      styles.commentItem,
                      i !== item.comments.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: 'rgba(150, 150, 150, 0.1)'
                      }
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <TouchableOpacity 
                        onPress={() => {
                          console.log('Comment username clicked:', comment.username);
                          handleOpenUserProfile(comment.username);
                        }}
                        style={{ padding: 4 }}
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
                      <TouchableOpacity style={styles.commentLike}>
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
                ))}
              </View>
            </ScrollView>
            
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

  const renderTrendingTopic = ({ item }) => (
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header for Social Screen */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Social</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleOpenSuggestedUsers}
            >
              <Icon name="people-outline" size={24} color={mainColor} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleOpenNotifications}
            >
              <Icon name="notifications-outline" size={24} color={mainColor} />
              {unreadNotifications > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Trending Topics Horizontal ScrollView */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicsContainer}
        >
          {TRENDING_TOPICS.map((topic, index) => (
            <TouchableOpacity
              key={topic}
              style={[
                styles.topicChip,
                { 
                  backgroundColor: selectedTopic === topic ? mainColor : 'transparent',
                  borderColor: selectedTopic === topic ? mainColor : borderColor,
                  marginLeft: index === 0 ? 16 : 8
                }
              ]}
              onPress={() => setSelectedTopic(topic)}
            >
              <Text 
                style={[
                  styles.topicText, 
                  { 
                    color: selectedTopic === topic 
                      ? isDarkMode ? '#FFFFFF' : '#FFFFFF' 
                      : isDarkMode ? '#FFFFFF' : textColor
                  }
                ]}
              >
                {topic}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Fashion Posts FlatList */}
      <FlatList
        data={FASHION_POSTS}
        renderItem={renderFashionPost}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={mainColor}
            colors={[mainColor]}
            progressBackgroundColor={isDarkMode ? '#16171F' : '#FFFFFF'}
          />
        }
      />
      
      {/* Message button that navigates to the Messages screen */}
      <TouchableOpacity
        style={[styles.messageButton, { backgroundColor: mainColor }]}
        onPress={() => navigation.navigate('Messages')}
      >
        <Icon name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SocialScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    ...defaultTextStyle,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  topicsContainer: {
    paddingRight: 16,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicText: {
    fontSize: 14,
    fontWeight: '500',
    ...defaultTextStyle,
  },
  messageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  // Fashion inspiration card styling
  inspirationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  inspirationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flex: 1,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  profileUsername: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  inspirationTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
    letterSpacing: 0.2,
  },
  publishDate: {
    fontSize: 13,
    marginTop: 4,
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
  
  // Feed content
  feedContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});