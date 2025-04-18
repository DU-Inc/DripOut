import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  AccessibilityInfo,
  GestureResponderEvent,
  InteractionManager,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import ContentAction from '../common/CardButtons/contentAction';
import { Swipeable } from 'react-native-gesture-handler';
import { SharedElement } from 'react-navigation-shared-element';
import { FeedStackParamList } from '../../navigations/feedNavigator/FeedNavigator';

// Types
export type Article = {
  id: string;
  sourceName: string;       // e.g. "CNN"
  sourceLogoUrl?: string;   // optional 24×24 px
  headline: string;
  summary?: string;         // Optional summary text for display when headline is short
  imageUrl: string;
  publishedAt: Date;
  author?: string;
};

export interface NewsCardProps {
  article: Article;
  mode: 'list' | 'grid';
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
  onShare?: (id: string) => void;
  onBookmark?: (id: string) => void;
  isDarkMode?: boolean;
  isContentActionActive?: boolean;
  onContentActionExpandChange?: (isExpanded: boolean) => void;
}

type NavigationProp = StackNavigationProp<FeedStackParamList>;

const { width } = Dimensions.get('window');
const GRID_CARD_WIDTH = (width / 2) - 12; // 2 cards per row with minimal spacing
const SWIPE_THRESHOLD = 0.30 * width; // 30% of width for half-swipe (reduced)
const FULL_SWIPE_THRESHOLD = 0.9 * width; // 60% of width for full-swipe
const CARD_PRESSED_SCALE = 1.02;
const PRESS_FEEDBACK_DURATION = 100;

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  mode,
  onLike,
  onDislike,
  onShare,
  onBookmark,
  isDarkMode = true,
  isContentActionActive = false,
  onContentActionExpandChange,
}) => {
  // Navigation
  const navigation = useNavigation<NavigationProp>();
  
  // State
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  // Animation values
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardElevation = useRef(new Animated.Value(1)).current;
  // Animation values for status indicators
  const likeAnim = useRef({ opacity: new Animated.Value(0), scale: new Animated.Value(0) }).current;
  const dislikeAnim = useRef({ opacity: new Animated.Value(0), scale: new Animated.Value(0) }).current;
  const bookmarkAnim = useRef({ opacity: new Animated.Value(0), scale: new Animated.Value(0) }).current;
  
  // Refs
  const swipeableRef = useRef<Swipeable>(null);
  const cardRef = useRef<View>(null);
  // Track active animations for cleanup
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);
  
  // Animation value for content action overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Get theme colors
  const theme = isDarkMode ? colors.dark : colors.light;
  
  // New state for headline height measurement
  const [headlineHeight, setHeadlineHeight] = useState(0);
  const [headlineLineCount, setHeadlineLineCount] = useState(2); // Default to 2 lines
  
  // Measure card position for transitions
  const measureCardPosition = () => {
    if (cardRef.current) {
      cardRef.current.measureInWindow((x, y, width, height) => {
        setCardPosition({ x, y, width, height });
      });
    }
  };

  // Cleanup all animations to prevent memory leaks
  useEffect(() => {
    // Return cleanup function to run on unmount
    return () => {
      // Stop all active animations
      activeAnimations.current.forEach(animation => {
        if (animation) {
          animation.stop();
        }
      });
      activeAnimations.current = [];
      
      // Stop any overlay animation
      overlayOpacity.stopAnimation();
      
      // Stop scale and elevation animations
      cardScale.stopAnimation();
      cardElevation.stopAnimation();
      
      // Remove all listeners
      overlayOpacity.removeAllListeners();
      cardScale.removeAllListeners();
      cardElevation.removeAllListeners();
    };
  }, [overlayOpacity, cardScale, cardElevation]);

  // Animate status indicators based on state changes
  useEffect(() => {
    const animateIndicator = (anim: { opacity: Animated.Value, scale: Animated.Value }, isActive: boolean) => {
      if (isActive) {
        anim.opacity.setValue(0);
        anim.scale.setValue(0.5); // Start slightly smaller
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 4, // Adjust for desired bounciness
          tension: 60, // Adjust for speed
          useNativeDriver: true,
        }).start();
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 150, // Faster opacity fade-in
          useNativeDriver: true,
        }).start();
      } else {
        // Optional: Add fade-out animation
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.scale, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      }
    };

    animateIndicator(likeAnim, isLiked);
  }, [isLiked, likeAnim]);

  useEffect(() => {
    const animateIndicator = (anim: { opacity: Animated.Value, scale: Animated.Value }, isActive: boolean) => {
      if (isActive) {
        anim.opacity.setValue(0);
        anim.scale.setValue(0.5);
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }).start();
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.scale, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      }
    };
    animateIndicator(dislikeAnim, isDisliked);
  }, [isDisliked, dislikeAnim]);

  useEffect(() => {
    const animateIndicator = (anim: { opacity: Animated.Value, scale: Animated.Value }, isActive: boolean) => {
      if (isActive) {
        anim.opacity.setValue(0);
        anim.scale.setValue(0.5);
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }).start();
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.scale, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      }
    };
    animateIndicator(bookmarkAnim, isBookmarked);
  }, [isBookmarked, bookmarkAnim]);

  // Animate overlay when content action changes
  useEffect(() => {
    if (isContentActionActive) {
      const animation = Animated.timing(overlayOpacity, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      });
      
      // Track animation for cleanup
      activeAnimations.current.push(animation);
      
      animation.start(({ finished }) => {
        // Remove from active animations when done
        if (finished) {
          const index = activeAnimations.current.indexOf(animation);
          if (index !== -1) {
            activeAnimations.current.splice(index, 1);
          }
        }
      });
    } else {
      const animation = Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      });
      
      // Track animation for cleanup
      activeAnimations.current.push(animation);
      
      animation.start(({ finished }) => {
        // Remove from active animations when done
        if (finished) {
          const index = activeAnimations.current.indexOf(animation);
          if (index !== -1) {
            activeAnimations.current.splice(index, 1);
          }
        }
      });
    }
  }, [isContentActionActive, overlayOpacity]);

  // Format time ago from publishedAt date
  const formatTimeAgo = (date: Date): string => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    
    if (diff < 60) {
      return `${diff}m ago`;
    } else if (diff < 1440) {
      return `${Math.floor(diff / 60)}h ago`;
    } else {
      return `${Math.floor(diff / 1440)}d ago`;
    }
  };

  // Handle image load
  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  // Handle card press - open article
  const handleCardPress = () => {
    console.log(`Card pressed for article ID: ${article.id}`);
    
    // Measure card position before navigating
    measureCardPosition();
    
    // Provide press feedback animation
    const pressAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: CARD_PRESSED_SCALE,
          duration: PRESS_FEEDBACK_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardElevation, {
          toValue: 3,
          duration: PRESS_FEEDBACK_DURATION,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(cardScale, {
          toValue: 1,
          duration: PRESS_FEEDBACK_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardElevation, {
          toValue: 1,
          duration: PRESS_FEEDBACK_DURATION,
          useNativeDriver: false,
        }),
      ]),
    ]);
    
    // Track animation for cleanup
    activeAnimations.current.push(pressAnimation);
    
    pressAnimation.start(({ finished }) => {
      // Remove from active animations when done
      if (finished) {
        const index = activeAnimations.current.indexOf(pressAnimation);
        if (index !== -1) {
          activeAnimations.current.splice(index, 1);
        }
      }
    });
    
    // Navigate with a slight delay to allow the animation to play
    InteractionManager.runAfterInteractions(() => {
      console.log(`Navigating to ExpandedNewsScreen with articleId: ${article.id}`);
      navigation.navigate('ExpandedNewsScreen', {
        articleId: article.id,
        sourcePosition: cardPosition
      });
    });
  };

  // Handle long press to toggle content action
  const handleLongPress = () => {
    if (onContentActionExpandChange) {
      onContentActionExpandChange(!isContentActionActive);
    }
  };

  // Handle like action
  const handleLike = () => {
    // Toggle like/dislike states
    if (isDisliked) setIsDisliked(false);
    setIsLiked(!isLiked);
    if (onLike) onLike(article.id);
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle dislike action
  const handleDislike = () => {
    // Toggle like/dislike states
    if (isLiked) setIsLiked(false);
    setIsDisliked(!isDisliked);
    if (onDislike) onDislike(article.id);
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle bookmark action
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    if (onBookmark) onBookmark(article.id);
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Handle share action
  const handleShare = () => {
    if (onShare) onShare(article.id);
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  // Track swipe progress to determine half-swipe vs full-swipe
  const handleSwipeableWillOpen = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
  };

  // Handle swipe drag - track swipe progress
  const onSwipeProgress = (event: any, gestureState: any) => {
    // Just track the progress
    setSwipeProgress(Math.abs(gestureState.dx));
    return false; // Don't terminate gesture
  };

  // Handle headline layout to determine if it's one or two lines
  const handleHeadlineLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeadlineHeight(height);
    
    // Estimate line count based on line height (18px for grid mode)
    const estimatedLines = Math.round(height / 18); 
    setHeadlineLineCount(estimatedLines > 2 ? 2 : estimatedLines);
  };

  // Render swipe actions with half-swipe menu (swipe right)
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    // Swipe Right reveals actions on the RIGHT side: Dislike, Like
    const dislikeColor = isDisliked ? '#FF3B30' : theme.text.primary; // Red when active
    const likeColor = isLiked ? '#4CAF50' : theme.text.primary;     // Green when active

    return (
      <View style={styles.swipeActionsContainer}>
        {/* Empty View on the Left to push content Right */}
        <View style={{ flex: 1 }} />
        {/* Actions on the RIGHT edge */}
        <Animated.View
          style={[
            styles.swipeActionGroup,
            styles.rightSwipeActions, // Position group to the right
          ]}
        >
          {/* Dislike Action (Appears first on the right)*/}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isDisliked && styles.activeSwipeAction,
            ]}
            onPress={handleDislike}
          >
            <Icon name={isDisliked ? "thumb-down" : "thumb-down-outline"} size={32} color={dislikeColor} />
            <Text style={[styles.swipeActionText, { color: dislikeColor }]}>Dislike</Text>
          </TouchableOpacity>

          {/* Like Action (Appears second on the right) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isLiked && styles.activeSwipeAction,
            ]}
            onPress={handleLike}
          >
            <Icon name={isLiked ? "thumb-up" : "thumb-up-outline"} size={32} color={likeColor} />
            <Text style={[styles.swipeActionText, { color: likeColor }]}>Like</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Render swipe actions with half-swipe menu (swipe left)
  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    // Swipe Left reveals actions on the LEFT side: Bookmark, Share
    const bookmarkColor = isBookmarked ? '#FFCC00' : theme.text.primary; // Yellow when active
    const shareColor = theme.text.primary; // Default color

    return (
      <View style={styles.swipeActionsContainer}>
        {/* Actions on the LEFT edge */}
        <Animated.View
          style={[
            styles.swipeActionGroup,
            styles.leftSwipeActions, // Position group to the left
          ]}
        >
          {/* Bookmark Action (Appears first on the left) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
              isBookmarked && styles.activeSwipeAction,
            ]}
            onPress={handleBookmark}
          >
            <Icon name={isBookmarked ? "bookmark" : "bookmark-outline"} size={32} color={bookmarkColor} />
            <Text style={[styles.swipeActionText, { color: bookmarkColor }]}>Bookmark</Text>
          </TouchableOpacity>

          {/* Share Action (Appears second on the left) */}
          <TouchableOpacity
            style={[
              styles.swipeAction,
            ]}
            onPress={handleShare}
          >
            <Icon name="share-variant" size={32} color={shareColor} />
            <Text style={[styles.swipeActionText, { color: shareColor }]}>Share</Text>
          </TouchableOpacity>
        </Animated.View>
        {/* Empty View on the Right to push content Left */}
        <View style={{ flex: 1 }} />
      </View>
    );
  };

  // Handle swipe completion
  const handleSwipeableOpen = (direction: 'left' | 'right', swipeDistance: number) => {
    // If this is a full swipe, trigger the primary action
    if (swipeDistance > FULL_SWIPE_THRESHOLD) {
      if (direction === 'right') {
        // Full swipe right - Like
        handleLike();
      } else {
        // Full swipe left - Share
        handleShare();
      }
    } else if (swipeDistance > SWIPE_THRESHOLD) {
      // Half-swipe - keep menu open
      // Don't close it - user can tap on actions or swipe back
    } else {
      // Swipe not far enough, close it
      if (swipeableRef.current) {
        swipeableRef.current.close();
      }
    }
  };

  // Content action sub-actions
  const contentActions = [
    {
      id: 'share',
      icon: <Icon name="share-variant" size={22} color={isDarkMode ? "#FFFFFF" : theme.text.primary} />,
      label: 'Share',
      backgroundColor: 'transparent',
      onClick: handleShare,
      accessibilityLabel: 'Share article',
    },
    {
      id: 'bookmark',
      icon: <Icon name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? "#FFCC00" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Bookmark',
      backgroundColor: 'transparent',
      onClick: handleBookmark,
      accessibilityLabel: 'Bookmark article',
    },
    {
      id: 'like',
      icon: <Icon name={isLiked ? "thumb-up" : "thumb-up-outline"} size={22} color={isLiked ? "#4CAF50" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Like',
      backgroundColor: 'transparent',
      onClick: handleLike,
      accessibilityLabel: 'Like article',
    },
    {
      id: 'dislike',
      icon: <Icon name={isDisliked ? "thumb-down" : "thumb-down-outline"} size={22} color={isDisliked ? "#FF3B30" : (isDarkMode ? "#FFFFFF" : theme.text.primary)} />,
      label: 'Dislike',
      backgroundColor: 'transparent',
      onClick: handleDislike,
      accessibilityLabel: 'Dislike article',
    },
  ];

  // Render list mode
  const renderListMode = () => {
    return (
      <View style={[
        styles.listContainer,
        { backgroundColor: isDarkMode ? theme.surface : '#F5F5F7' } // "Ash" background color
      ]}>
        <View style={styles.listTextContainer}>
          <View style={styles.sourceRow}>
            {article.sourceLogoUrl ? (
              <Image
                source={{ uri: article.sourceLogoUrl }}
                style={styles.sourceLogo}
                onLoad={handleImageLoad}
              />
            ) : null}
            <Text style={[styles.sourceText, { color: theme.text.secondary }]}>
              {article.sourceName}
            </Text>
          </View>
          
          <SharedElement id={`article.${article.id}.title`}>
            <Text 
              style={[styles.headlineText, styles.listHeadline, { color: theme.text.primary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {article.headline}
            </Text>
          </SharedElement>
          
          {/* Date and author on same row */}
          <View style={styles.metaInfoRow}>
            <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
              {formatTimeAgo(article.publishedAt)}
            </Text>
            
            {article.author && (
              <>
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}> • </Text>
                <Text style={[styles.metaText, { color: theme.text.tertiary }]} numberOfLines={1}>
                  {article.author}
                </Text>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.listImageContainer}>
          <SharedElement id={`article.${article.id}.image`} style={{ width: '100%', height: '100%' }}>
            <Image 
              source={{ uri: article.imageUrl }}
              style={styles.listImage}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
          </SharedElement>
        </View>
        
        {/* ActionButton container fully below content */}
        <View style={styles.actionButtonContainer}>
          {/* Status indicators */}
          <View style={styles.statusIndicatorsRow}>
            {isLiked && (
              <Animated.View style={[
                styles.statusIndicator,
                { opacity: likeAnim.opacity, transform: [{ scale: likeAnim.scale }] }
              ]}>
                <Icon name="thumb-up" size={18} color="#4CAF50" /* Green */ />
              </Animated.View>
            )}
            
            {isDisliked && (
              <Animated.View style={[
                styles.statusIndicator,
                { opacity: dislikeAnim.opacity, transform: [{ scale: dislikeAnim.scale }] }
              ]}>
                <Icon name="thumb-down" size={18} color="#FF3B30" /* Red */ />
              </Animated.View>
            )}
            
            {isBookmarked && (
               <Animated.View style={[
                styles.statusIndicator,
                { opacity: bookmarkAnim.opacity, transform: [{ scale: bookmarkAnim.scale }] }
              ]}>
                <Icon name="bookmark" size={18} color="#FFCC00" /* Yellow */ />
               </Animated.View>
            )}
          </View>
          
          {/* ContentAction component */}
          <View style={styles.contentActionContainer}>
            <ContentAction
              actions={contentActions}
              expansionMode="vertical"
              size={32}
              backgroundColor={isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(240, 240, 242, 0.9)'}
              iconColor={theme.text.primary}
              spacing={4}
              isActive={isContentActionActive}
              onExpandChange={onContentActionExpandChange}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>
      </View>
    );
  };

  // Render grid mode
  const renderGridMode = () => {
    return (
      <View style={[
        styles.gridContainer,
        { backgroundColor: isDarkMode ? theme.surface : '#F5F5F7' } // "Ash" background color
      ]}>
        {/* Source & Logo at top */}
        <View style={styles.gridSourceRow}>
          {article.sourceLogoUrl ? (
            <Image
              source={{ uri: article.sourceLogoUrl }}
              style={styles.sourceLogo}
              onLoad={handleImageLoad}
            />
          ) : null}
          <Text style={[styles.sourceText, { color: theme.text.secondary }]}>
            {article.sourceName}
          </Text>
        </View>

        {/* Text content area - always 2 lines total */}
        <View style={styles.gridTextContentArea}>
          {/* Headline below source */}
          <SharedElement id={`article.${article.id}.title`}>
            <Text 
              style={[styles.headlineText, styles.gridHeadline, { color: theme.text.primary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
              onLayout={handleHeadlineLayout}
            >
              {article.headline}
            </Text>
          </SharedElement>

          {/* Summary text when headline is short */}
          {headlineLineCount === 1 && article.summary && (
            <Text 
              style={[styles.summaryText, { color: theme.text.secondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {article.summary}
            </Text>
          )}
        </View>

        {/* Image with fixed aspect ratio */}
        <View style={styles.imageWrapper}>
          <SharedElement id={`article.${article.id}.image`} style={styles.gridImageContainer}>
            <Image 
              source={{ uri: article.imageUrl }}
              style={styles.gridImage}
              resizeMode="cover"
              onLoad={handleImageLoad}
            />
          </SharedElement>
        </View>
        
        {/* Meta information on same row */}
        <View style={styles.gridMetaRow}>
          <Text style={[styles.metaText, styles.gridMetaText, { color: theme.text.tertiary }]}>
            {formatTimeAgo(article.publishedAt)}
          </Text>
          
          {article.author && (
            <>
              <Text style={[styles.metaText, styles.gridMetaText, { color: theme.text.tertiary }]}> • </Text>
              <Text 
                style={[styles.metaText, styles.gridMetaText, { color: theme.text.tertiary, flex: 1 }]} 
                numberOfLines={1}
              >
                {article.author}
              </Text>
            </>
          )}
        </View>
        
        {/* Status indicators and content action in row at bottom */}
        <View style={styles.gridActionRow}>
          {/* Status indicators */}
          <View style={styles.statusIndicatorsRow}>
            {isLiked && (
              <Animated.View style={[
                styles.statusIndicator,
                { opacity: likeAnim.opacity, transform: [{ scale: likeAnim.scale }] }
              ]}>
                <Icon name="thumb-up" size={16} color="#4CAF50" /* Green */ />
              </Animated.View>
            )}
            
            {isDisliked && (
              <Animated.View style={[
                styles.statusIndicator,
                { opacity: dislikeAnim.opacity, transform: [{ scale: dislikeAnim.scale }] }
              ]}>
                <Icon name="thumb-down" size={16} color="#FF3B30" /* Red */ />
              </Animated.View>
            )}
            
            {isBookmarked && (
              <Animated.View style={[
                styles.statusIndicator,
                { opacity: bookmarkAnim.opacity, transform: [{ scale: bookmarkAnim.scale }] }
              ]}>
                <Icon name="bookmark" size={16} color="#FFCC00" /* Yellow */ />
              </Animated.View>
            )}
          </View>
          
          {/* ContentAction component */}
          <View style={styles.gridContentActionContainer}>
            <ContentAction
              actions={contentActions}
              expansionMode="vertical"
              size={28}
              backgroundColor={isDarkMode ? 'rgba(60, 60, 60, 0.8)' : 'rgba(240, 240, 242, 0.9)'}
              iconColor={theme.text.primary}
              spacing={4}
              isActive={isContentActionActive}
              onExpandChange={onContentActionExpandChange}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>
      </View>
    );
  };

  // Create the shadow style
  const shadowStyle = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={handleSwipeableWillOpen}
      onSwipeableOpen={(direction: any, swipeDistance: any) => 
        handleSwipeableOpen(direction as 'left' | 'right', swipeDistance as number)
      }
      overshootLeft={false}
      overshootRight={false}
      friction={1} // Reduced friction for easier swiping
      rightThreshold={SWIPE_THRESHOLD} // Use threshold to determine when to stay open
      leftThreshold={SWIPE_THRESHOLD}
    >
      <Animated.View
        ref={cardRef}
        style={[
          { 
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleCardPress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          accessibilityLabel={`${article.sourceName}: ${article.headline}`}
          style={[
            styles.cardWrapper,
            mode === 'grid' ? styles.gridCardWrapper : styles.listCardWrapper,
            { backgroundColor: isDarkMode ? theme.surface : '#F5F5F7' }, // "Ash" background color
            shadowStyle as any,
          ]}
        >
          {mode === 'list' ? renderListMode() : renderGridMode()}
          
          {/* Overlay for active card */}
          {isContentActionActive && (
            <Animated.View 
              style={[
                styles.cardOverlay,
                { opacity: overlayOpacity }
              ]}
              pointerEvents="none"
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    margin: 3, // Reduced margin
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  listCardWrapper: {
    width: '100%',
    height: 140, // Adjusted height for better layout
  },
  gridCardWrapper: {
    width: GRID_CARD_WIDTH,
    margin: '1%',
    maxHeight: 290, // Adjusted maximum height
  },
  // List mode styles
  listContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  listTextContainer: {
    flex: 3,
    padding: 10, // Reduced padding
  },
  listImageContainer: {
    flex: 1.5,  // Reduced from 2
    padding: 12, // Increased padding
    position: 'relative',
  },
  listImage: {
    width: '90%',  // Reduced from 100%
    height: '90%', // Reduced from 100%
    borderRadius: 8,
    alignSelf: 'center', // Center the image
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  actionButtonContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    bottom: 4,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    
  },
  statusIndicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // Grid mode styles
  gridContainer: {
    width: '100%',
    padding: 8,
    borderRadius: 12,
  },
  gridSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginBottom: 2, // Reduced margin
  },
  imageWrapper: {
    width: '90%', // Reduced from 100%
    position: 'relative',
    marginVertical: 6,
    alignSelf: 'center', // Center the wrapper
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1.8, // Increased from 1.5 to make it shorter
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignSelf: 'center', // Center the image
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  gridMetaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  gridActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  // Shared styles
  sourceRow: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceLogo: {
    width: 22,
    height: 22,
    marginRight: 6, // Reduced margin
    borderRadius: 11,
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headlineText: {
    fontWeight: '700',
  },
  listHeadline: {
    fontSize: 16,
    lineHeight: 20,
    marginVertical: 5,
    maxHeight: 40, // 2 lines at 20 line height
  },
  gridHeadline: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 0, // Reduced to allow for summary
    // No maxHeight constraint to allow measurement
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  swipeActionsContainer: {
    flex: 1, // Take full available space
    flexDirection: 'row',
    // justifyContent: 'space-between', // Removed - let inner views push content
    alignItems: 'center',
  },
  swipeActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%', // Ensure group takes full height for vertical centering
    // Removed flex: 1 to allow groups to size to content
  },
  leftSwipeActions: {
    justifyContent: 'flex-start', // Align items to the start (left) of the group
    paddingLeft: 0,
    marginRight: -15, // Add some padding from the edge
  },
  rightSwipeActions: {
    justifyContent: 'flex-end', // Align items to the end (right) of the group
    paddingRight: 0,
    marginRight: -15, // Add some padding from the edge
  },
  swipeAction: {
    height: '100%', // Take full height for vertical centering
    minWidth: 60, // Minimum width for touch target
    paddingHorizontal: 0, // Horizontal padding within the action
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // No background color
    marginHorizontal: 0, // Space between icons in a group
  },
  activeSwipeAction: {
    transform: [{scale: 1.1}], // Increased scale when active
  },
  swipeActionText: {
    // Color is now set dynamically inline
    fontWeight: '600',
    marginTop: 4, // Space between icon and text
    fontSize: 11, // Slightly smaller text
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 50,
    borderRadius: 12,
  },
  contentActionContainer: {
    alignItems: 'center',
    zIndex: 60, // Higher than overlay
    position: 'relative',
  },
  gridContentActionContainer: {
    alignItems: 'center',
    zIndex: 60, // Higher than overlay
    position: 'relative',
  },
  statusIndicator: {
    width: 28, // Keep size for layout consistency
    height: 28,
    borderRadius: 14,
    // backgroundColor: 'rgba(0,0,0,0.05)', // Removed background color
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  gridTextContentArea: {
    minHeight: 36, // Space for exactly 2 lines of text
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.8, // Lighter shade as requested
  },
});

export default NewsCard; 
