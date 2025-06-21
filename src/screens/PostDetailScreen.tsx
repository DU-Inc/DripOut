import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  RefreshControl,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { auth } from '../Config/firebaseconfig';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getPostsByUser, Post } from '../services/postService';
import { toggleLikePost, hasUserLikedPost } from '../services/likeService';
import { toggleSavePost, hasUserSavedPost } from '../services/saveService';
import { getCommentsByPost, Comment, addComment } from '../services/commentService';
import { getUserProfile } from '../services/firestoreService';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigations/types';
import { formatDistanceToNow } from 'date-fns';

type NavigationType = NavigationProp<RootStackParamList>;
type PostDetailScreenRouteProp = RouteProp<RootStackParamList, 'PostDetailScreen'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PostWithInteractions extends Post {
  isLiked: boolean;
  isSaved: boolean;
  formattedDate: string;
  comments: Comment[];
}

const PostDetailScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationType>();
  const route = useRoute<PostDetailScreenRouteProp>();
  const { postId, userId, initialPostIndex = 0 } = route.params;

  // State
  const [posts, setPosts] = useState<PostWithInteractions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPostIndex, setCurrentPostIndex] = useState(initialPostIndex);
  const [user, setUser] = useState<any>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentsText, setCommentsText] = useState<Record<string, string>>({});
  const [isAddingComment, setIsAddingComment] = useState<string | null>(null);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Colors based on theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A3A' : '#E5E5E5';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';

  // Fetch posts and interactions
  const fetchPostsAndInteractions = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get all posts by user
      const userPosts = await getPostsByUser(userId);
      
      // Find the initial post index
      const targetPostIndex = userPosts.findIndex(post => post.id === postId);
      if (targetPostIndex !== -1) {
        setCurrentPostIndex(targetPostIndex);
      }

      // Get current user for interaction checks
      const currentUser = auth().currentUser;
      if (!currentUser) {
        setPosts(userPosts.map(post => ({
          ...post,
          isLiked: false,
          isSaved: false,
          formattedDate: formatPostDate(post.createdAt),
          comments: []
        })));
        return;
      }

      // Fetch interactions and comments for each post
      const postsWithInteractions = await Promise.all(
        userPosts.map(async (post) => {
          const [isLiked, isSaved, comments] = await Promise.all([
            hasUserLikedPost(currentUser.uid, post.id),
            hasUserSavedPost(currentUser.uid, post.id),
            getCommentsByPost(post.id)
          ]);

          return {
            ...post,
            isLiked,
            isSaved,
            formattedDate: formatPostDate(post.createdAt),
            comments
          };
        })
      );

      setPosts(postsWithInteractions);

      // Get user profile
      const userProfile = await getUserProfile(userId);
      setUser(userProfile);
      
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [postId, userId]);

  // Format post date
  const formatPostDate = (createdAt: any): string => {
    try {
      if (!createdAt) return 'Unknown';
      
      const date = createdAt.toDate 
        ? createdAt.toDate() 
        : createdAt.seconds 
          ? new Date(createdAt.seconds * 1000)
          : new Date(createdAt);
      
      return formatDistanceToNow(date) + ' ago';
    } catch (error) {
      return 'Unknown';
    }
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPostsAndInteractions();
    setIsRefreshing(false);
  }, [fetchPostsAndInteractions]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async (post: PostWithInteractions) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const newLikeStatus = await toggleLikePost(currentUser.uid, post.id);
      
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id 
            ? { 
                ...p, 
                isLiked: newLikeStatus,
                likes: newLikeStatus ? p.likes + 1 : Math.max(0, p.likes - 1)
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, []);

  // Handle save toggle
  const handleSaveToggle = useCallback(async (post: PostWithInteractions) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const newSaveStatus = await toggleSavePost(currentUser.uid, post.id);
      
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id 
            ? { ...p, isSaved: newSaveStatus }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  }, []);

  // Handle upvote toggle (same as like)
  const handleUpvoteToggle = useCallback(async (postId: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    try {
      const newLikeStatus = await toggleLikePost(currentUser.uid, postId);
      
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { 
                ...p, 
                isLiked: newLikeStatus,
                likes: newLikeStatus ? p.likes + 1 : Math.max(0, p.likes - 1)
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error toggling upvote:', error);
    }
  }, []);

  // Toggle comments
  const toggleComments = useCallback(async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(postId);
    }
  }, [expandedComments]);

  // Toggle post expansion
  const toggleExpandPost = useCallback((postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  }, [expandedPost]);

  // Handle add comment
  const handleAddComment = useCallback(async (postId: string, text: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser || !text.trim()) return;

    try {
      await addComment(postId, currentUser.uid, text.trim());
      
      // Refresh the specific post's comments
      const comments = await getCommentsByPost(postId);
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === postId 
            ? { ...p, comments, comments: p.comments + 1 }
            : p
        )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, []);

  // Navigate to user profile
  const handleProfilePress = useCallback(() => {
    // If viewing own profile, go back to the profile screen
    if (userId === auth().currentUser?.uid) {
      navigation.goBack();
    } else {
      // Navigate to other user's profile (would need UserProfileScreen for other users)
      console.log('Navigate to user profile:', userId);
    }
  }, [userId, navigation]);

  // Render post item with social feed styling
  const renderPostItem = useCallback(({ item: post, index }: { item: PostWithInteractions; index: number }) => {
    const isExpanded = expandedPost === post.id;
    
    return (
      <View style={[
        styles.inspirationCard,
        { 
          backgroundColor: cardBgColor,
          borderColor: borderColor,
          shadowColor: isDarkMode ? '#7C6BFF' : '#000000',
          shadowOffset: { width: 0, height: isDarkMode ? 4 : 2 },
          shadowOpacity: isDarkMode ? 0.15 : 0.05,
          shadowRadius: isDarkMode ? 12 : 8,
          elevation: isDarkMode ? 8 : 3
        }
      ]}>
        {/* Card Header with user info */}
        <View style={styles.inspirationHeader}>
          <TouchableOpacity 
            style={styles.userInfoContainer}
            onPress={handleProfilePress}
          >
            {post.userAvatar ? (
              <Image
                source={{ uri: post.userAvatar }}
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
                  {post.userDisplayName ? 
                    post.userDisplayName.charAt(0).toUpperCase() : 
                    post.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            
            <View style={styles.userTextInfo}>
              <Text style={[styles.username, { color: textColor }]}>
                {post.userDisplayName || post.username || 'User'}
              </Text>
              <Text style={[styles.publishDate, { color: subTextColor }]}>
                {post.formattedDate}
              </Text>
            </View>
            <View style={styles.userActionButtons}>
              <TouchableOpacity style={styles.moreOptionsButton}>
                <Icon name="ellipsis-horizontal" size={18} color={subTextColor} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        <View style={styles.galleryContainer}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.galleryImage}
            resizeMode="cover"
          />
        </View>

        {/* Caption Section */}
        <View style={styles.captionContainer}>
          <Text style={[
            styles.captionText, 
            { color: subTextColor }
          ]}>
            {isExpanded ? post.caption : (
              post.caption && post.caption.length > 120 ? 
                post.caption.substring(0, 120) + '... ' : 
                post.caption + ' '
            )}
            {!isExpanded && post.caption && post.caption.length > 120 && (
              <Text 
                style={[styles.readMoreText, { color: mainColor }]}
                onPress={() => toggleExpandPost(post.id)}
              >
                Read More
              </Text>
            )}
          </Text>
        </View>

        {/* Tags Section */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {post.tags.map((tag, tagIndex) => (
                <View
                  key={tagIndex}
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
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Pieces Section */}
        {post.outfitItems && post.outfitItems.length > 0 && (
          <View style={styles.piecesContainer}>
            <Text style={[styles.piecesHeading, { color: textColor }]}>Featured Pieces</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.piecesScrollView}
              contentContainerStyle={styles.piecesScrollContent}
            >
              {post.outfitItems.map((piece, i) => {
                let iconName = 'tshirt-crew';
                if (piece.type === 'shirt') iconName = 'tshirt-crew';
                else if (piece.type === 'pants') iconName = 'tights';
                else if (piece.type === 'shoes') iconName = 'shoe-sneaker';
                else if (piece.type === 'watch') iconName = 'watch';
                else if (piece.type === 'jewelry') iconName = 'ring';
                else if (piece.type === 'accessory') iconName = 'sunglasses';

                const hasLink = piece.affiliateLink && piece.affiliateLink.trim().length > 0;
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.pieceItem,
                      { 
                        backgroundColor: isDarkMode ? 'rgba(40, 40, 60, 0.3)' : 'rgba(248, 248, 250, 0.8)',
                        borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.4)' : 'rgba(220, 220, 225, 1)'
                      }
                    ]}
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
        )}

        {/* Post Actions */}
        <View style={[styles.postActions, { borderTopColor: borderColor }]}>
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                post.isLiked && styles.actionButtonActive,
                post.isLiked && { backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)' }
              ]}
              onPress={() => handleUpvoteToggle(post.id)}
            >
              <FeatherIcon 
                name="arrow-up" 
                size={20} 
                color={post.isLiked ? mainColor : subTextColor} 
              />
              <Text style={[
                styles.actionText, 
                { color: post.isLiked ? mainColor : subTextColor }
              ]}>
                {post.likes}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton,
                expandedComments === post.id && styles.actionButtonActive,
                expandedComments === post.id && { 
                  backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)',
                }
              ]}
              onPress={() => toggleComments(post.id)}
            >
              <FeatherIcon 
                name="message-circle" 
                size={20} 
                color={expandedComments === post.id ? mainColor : subTextColor} 
              />
              <Text style={[
                styles.actionText, 
                { color: expandedComments === post.id ? mainColor : subTextColor }
              ]}>
                {post.comments && post.comments.length > 0 
                  ? `${post.comments.length} ${expandedComments === post.id ? 'Comments' : 'Discuss'}`
                  : expandedComments === post.id ? 'No comments' : 'Discuss'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        {expandedComments === post.id && (
          <View 
            style={[
              styles.commentsSection,
              { borderTopColor: borderColor, borderTopWidth: 1 }
            ]}
          >
            <View style={styles.commentsHeader}>
              <Text style={[styles.commentsTitle, { color: textColor }]}>
                Comments ({post.comments ? post.comments.length : 0})
              </Text>
              <TouchableOpacity 
                style={styles.collapseButton}
                onPress={() => toggleComments(post.id)}
              >
                <FeatherIcon name="chevron-up" size={18} color={mainColor} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.commentsScrollView}>
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment, commentIndex) => (
                  <View 
                    key={comment.id}
                    style={[
                      styles.commentItem,
                      { backgroundColor: cardBgColor },
                      commentIndex !== post.comments.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(150, 150, 150, 0.1)'
                      }
                    ]}
                  >
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentUsername, { color: textColor }]}>
                        {comment.username}
                      </Text>
                      <Text style={[styles.commentTime, { color: subTextColor }]}>
                        {formatDistanceToNow(comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date())} ago
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: subTextColor }]}>
                      {comment.text}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCommentsContainer}>
                  <FeatherIcon name="message-circle" size={24} color={subTextColor} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyCommentsText, { color: subTextColor }]}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              )}
            </View>
            
            <View style={[styles.addCommentRow, { backgroundColor: cardBgColor }]}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor={subTextColor}
                style={[styles.commentInput, { color: textColor }]}
                onChangeText={(text) => {
                  setCommentsText({
                    ...commentsText,
                    [post.id]: text
                  });
                }}
                value={commentsText?.[post.id] || ''}
              />
              <TouchableOpacity 
                style={[styles.postCommentButton, { backgroundColor: mainColor }]}
                onPress={() => {
                  if (commentsText?.[post.id]?.trim()) {
                    setIsAddingComment(post.id);
                    handleAddComment(post.id, commentsText[post.id])
                      .then(() => {
                        setCommentsText({
                          ...commentsText,
                          [post.id]: ''
                        });
                      })
                      .finally(() => {
                        setIsAddingComment(null);
                      });
                  }
                }}
                disabled={isAddingComment === post.id}
              >
                {isAddingComment === post.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FeatherIcon name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    cardBgColor, 
    textColor, 
    subTextColor, 
    mainColor, 
    borderColor,
    isDarkMode,
    expandedPost,
    expandedComments,
    commentsText,
    isAddingComment,
    handleProfilePress,
    handleUpvoteToggle,
    toggleComments,
    toggleExpandPost,
    handleAddComment
  ]);

  // Initial load
  useEffect(() => {
    fetchPostsAndInteractions();
  }, [fetchPostsAndInteractions]);

  // Auto-scroll to target post
  useEffect(() => {
    if (posts.length > 0 && currentPostIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentPostIndex,
          animated: true,
          viewPosition: 0
        });
      }, 100);
    }
  }, [posts.length, currentPostIndex]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>Posts</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              Loading posts...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <SafeAreaView>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 50, 0) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Posts</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {/* Posts List */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={mainColor}
            colors={[mainColor]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        getItemLayout={(data, index) => ({
          length: screenHeight * 0.8, // Approximate height per post
          offset: screenHeight * 0.8 * index,
          index,
        })}
        initialScrollIndex={currentPostIndex}
        onScrollToIndexFailed={(info) => {
          // Fallback if auto-scroll fails
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }, 100);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Social feed style components
  inspirationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    borderWidth: 0,
  },
  defaultProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userTextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  publishDate: {
    fontSize: 12,
  },
  userActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  moreOptionsButton: {
    padding: 8,
    marginRight: -8,
  },
  
  // Gallery
  galleryContainer: {
    width: screenWidth - 32,
    height: screenWidth - 32,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  
  // Caption
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  readMoreText: {
    fontWeight: '600',
  },
  
  // Tags
  tagsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Featured pieces
  piecesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  piecesHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  piecesScrollView: {
    marginBottom: 8,
  },
  piecesScrollContent: {
    paddingBottom: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    minWidth: 120,
  },
  pieceDetails: {
    marginLeft: 8,
    flex: 1,
  },
  pieceName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  pieceBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieceBrand: {
    fontSize: 12,
    fontWeight: '500',
  },
  pieceLink: {
    marginLeft: 4,
  },
  
  // Post actions
  postActions: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  actionButtonActive: {
    // backgroundColor set dynamically
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Comments section
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapseButton: {
    padding: 4,
  },
  commentsScrollView: {
    maxHeight: 300,
  },
  commentItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCommentsText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 12,
  },
  postCommentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PostDetailScreen; 