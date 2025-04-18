import React, { useRef, useState, useCallback } from 'react';
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
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
// Using View with background color instead of LinearGradient

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

// Generate fashion inspiration posts for the feed
const FASHION_POSTS = Array.from({ length: 8 }).map((_, i) => {
  // Fashion inspiration titles
  const inspirationTitles = [
    'Urban Minimalism',
    'Modern Vintage Fusion',
    'Structured Casual',
    'Elevated Basics',
    'Technical Athleisure',
    'Sustainable Luxury',
    'Monochrome Magic',
    'Statement Pieces'
  ];
  
  // Different styling notes
  const stylingNotes = [
    'Streamlined silhouettes with monochromatic color blocking create visual interest while maintaining a clean aesthetic. Focus on premium fabrics and perfect fit.',
    'Blending contemporary elements with classic vintage pieces for a timeless yet fresh look. The contrast between old and new creates unique visual interest.',
    'Soft draping combined with architectural lines creates a balanced silhouette that\'s both refined and comfortable for everyday wear.',
    'Reimagining wardrobe essentials with premium materials and subtle design details. The beauty is in the precision of construction and quality of materials.',
    'Technical fabrics and functional details combined with thoughtful layering for a look that transitions seamlessly between activities.',
    'Environmentally conscious design choices featuring organic materials and ethical production methods, without compromising on style or quality.',
    'Playing with various shades of a single color creates depth and visual interest while maintaining a cohesive and sophisticated aesthetic.',
    'Building outfits around one eye-catching piece, allowing it to stand out while keeping other elements understated and complementary.'
  ];
  
  // Style aesthetics
  const aesthetics = [
    'Minimalist',
    'Vintage Revival',
    'Modern Classic',
    'Scandinavian',
    'Tech Streetwear',
    'Sustainable Luxury',
    'Monochromatic',
    'Bold Statement'
  ];
  
  // Caption and tags for each post
  const postCaptions = [
    'Clean lines and monochromatic palettes that embody simplicity and sophistication.',
    'Contemporary takes on classic vintage pieces that blend nostalgia with modern sensibilities.',
    'Timeless pieces reimagined with subtle contemporary details for everyday elegance.',
    'Functional minimalism with clean lines, natural materials, and subdued colors.',
    'Performance-driven designs blending urban style with technical innovation.',
    'Eco-conscious luxury focusing on ethical production and sustainable materials.',
    'Exploring the subtle power of single-color dressing with textural contrasts and tonal variations.',
    'Making an impact with carefully chosen statement pieces that elevate your entire look.'
  ];
  
  // Tags for each post
  const postTags = [
    ['#minimalism', '#monochrome', '#essentials', '#quality'],
    ['#vintage', '#retro', '#reuse', '#timeless'],
    ['#classic', '#tailored', '#structured', '#refined'],
    ['#scandinavian', '#nordic', '#clean', '#functional'],
    ['#techwear', '#urban', '#performance', '#innovative'],
    ['#sustainable', '#ethical', '#conscious', '#eco'],
    ['#monochrome', '#tonal', '#texture', '#layers'],
    ['#statement', '#bold', '#unique', '#standout']
  ];
  
  // Generate data for outfit details
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
    ],
    [
      {name: 'Black Merino Turtleneck', brand: 'Uniqlo'},
      {name: 'Charcoal Wool Coat', brand: 'COS'},
      {name: 'Slate Gray Trousers', brand: 'Arket'},
      {name: 'Black Leather Boots', brand: 'Dr. Martens'}
    ],
    [
      {name: 'Printed Silk Blouse', brand: 'Sandro'},
      {name: 'High-Rise Straight Jeans', brand: 'Levi\'s'},
      {name: 'Sculptural Hoop Earrings', brand: 'Machete'},
      {name: 'Leather Strappy Sandals', brand: 'Maryam Nassir Zadeh'}
    ]
  ];
  
  // Random data for engagement
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
  
  return {
    id: i.toString(),
    title: inspirationTitles[i],
    gallery: [
      `https://picsum.photos/800/1000?random=${i * 3 + 51}`,
      `https://picsum.photos/800/1000?random=${i * 3 + 52}`,
      `https://picsum.photos/800/1000?random=${i * 3 + 53}`
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
    isUpvoted: Math.random() > 0.6,
    author: {
      username: commentUsernames[Math.floor(Math.random() * commentUsernames.length)],
      avatar: `https://i.pravatar.cc/150?img=${i + 10}`,
      isVerified: Math.random() > 0.7
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
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('For You');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  
  // Animation values
  const commentAnimation = useRef(new Animated.Value(0)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  
  // Create refs for post animations
  const postAnimations = useRef<Record<string, Animated.Value>>({});
  const panXValues = useRef<Record<string, Animated.Value>>({});
  const panResponders = useRef<Record<string, any>>({});

  // Simulate refresh action
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

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
            <Image source={{ uri: item.author.avatar }} style={styles.authorAvatar} />
            <View style={styles.authorInfo}>
              <View style={styles.authorNameRow}>
                <Text style={[styles.authorUsername, { color: textColor }]}>
                  {item.author.username}
                </Text>
                {item.author.isVerified && (
                  <Icon name="checkmark-circle" size={14} color={mainColor} style={styles.verifiedBadge} />
                )}
              </View>
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
              horizontal
              showsHorizontalScrollIndicator={false}
              data={item.tags}
              keyExtractor={(_, index) => `tag-${index}`}
              renderItem={({item: tag, index}) => (
                <TouchableOpacity 
                  key={`tag-${index}`}
                  style={[
                    styles.tagPill,
                    { 
                      backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.1)' : 'rgba(239, 61, 71, 0.08)',
                      borderColor: isDarkMode ? 'rgba(255, 72, 112, 0.2)' : 'rgba(239, 61, 71, 0.15)'
                    }
                  ]}
                >
                  <Text style={[styles.tagText, { color: mainColor }]}>
                    {tag}
                  </Text>
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
              <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
                Your Style Feed
              </Text>
            </View>
            
            <View style={styles.headerActions}>
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
          data={FASHION_POSTS}
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
                <FlatList
                  data={STORIES}
                  renderItem={renderStoryItem}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesList}
                />
              </View>

              {/* Topic/Filter Pills */}
              <View style={styles.topicsContainer}>
                <FlatList
                  data={TRENDING_TOPICS}
                  renderItem={renderTrendingTopic}
                  keyExtractor={item => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.topicsList}
                />
              </View>
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