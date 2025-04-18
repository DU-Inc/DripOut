// src/screens/UserDetailScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Image,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { db, auth } from '../Config/firebaseconfig';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../styles/themeprovider';
import { followUser, unfollowUser, isUserFollowing, getFollowCounts } from '../services/followService';
import { getPostsByUser, Post } from '../services/postService';
import { isRealUserId } from '../utils/userUtils';

// Define route params type
type UserDetailParams = {
  userId: string;
  username?: string;
  userDisplayName?: string;
};

// Define User data interface
interface SafeUserData {
  userID: string;
  username: string;
  email: string;
  userDisplayName?: string;
  fullName?: string;
  profilePictureURL?: string;
  createdAt?: Date;
  isVerified?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  fashionGenres?: string[];
  affiliateLinks?: {
    name: string;
    url: string;
    platform: string;
  }[];
  joinDate?: string;
}

const UserDetailScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, UserDetailParams>, string>>();
  const { userId, username, userDisplayName } = route.params || {};
  
  // Colors based on theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<SafeUserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  
  // Posts state
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'outfits' | 'styles'>('posts');
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  
  // Post detail modal state
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostDetailVisible, setIsPostDetailVisible] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Handle follow/unfollow action
  const handleFollowAction = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !userId) {
        Alert.alert('Error', 'You need to be logged in to follow users');
        return;
      }
      
      if (currentUser.uid === userId) {
        Alert.alert('Error', 'You cannot follow yourself');
        return;
      }
      
      setIsFollowLoading(true);
      
      // Check if userId is a real user
      if (!isRealUserId(userId)) {
        Alert.alert('Error', 'Cannot follow demo or test users');
        return;
      }
        
      if (isFollowing) {
        // Unfollow user
        await unfollowUser(currentUser.uid, userId);
        setIsFollowing(false);
        // Update follower count (optimistic update)
        setFollowCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        // Follow user
        await followUser(currentUser.uid, userId);
        setIsFollowing(true);
        // Update follower count (optimistic update)
        setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (err: any) {
      console.error('Error handling follow action:', err);
      Alert.alert('Error', err.message || 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  // Check if current user is following the profile user
  const checkFollowStatus = async () => {
    try {
      if (!userId) return;
      
      const currentUser = auth().currentUser;
      if (!currentUser || currentUser.uid === userId) return;
      
      const following = await isUserFollowing(currentUser.uid, userId);
      setIsFollowing(following);
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };
  
  // Fetch user's follow counts
  const fetchFollowCounts = async () => {
    try {
      if (!userId) return;
      
      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
    } catch (err) {
      console.error('Error fetching follow counts:', err);
    }
  };
  
  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      if (!userId) {
        setPostsLoading(false);
        return;
      }
      
      setPostsLoading(true);
      const posts = await getPostsByUser(userId);
      setUserPosts(posts);
      setPostsLoading(false);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      setPostsLoading(false);
    }
  };
  
  // Handle opening post detail
  const handlePostPress = useCallback((post: Post) => {
    setSelectedPost(post);
    setIsPostDetailVisible(true);
  }, []);
  
  // Simulate hover effect on post touch
  const handlePostHover = useCallback((postId: string) => {
    setHoveredPostId(postId);
  }, []);
  
  // Clear hover effect when touch ends
  const handlePostHoverEnd = useCallback(() => {
    setHoveredPostId(null);
  }, []);
  
  // Handle closing post detail
  const handleClosePostDetail = useCallback(() => {
    setIsPostDetailVisible(false);
    setSelectedPost(null);
  }, []);
  
  // Handle liking a post (optimistic update)
  const handleLikePost = useCallback(async (post: Post) => {
    if (isLiking || !auth().currentUser) return;
    
    try {
      setIsLiking(true);
      
      // Find post in the array
      const updatedPosts = userPosts.map(p => {
        if (p.id === post.id) {
          // Toggle like (simplified implementation - in a real app you'd use a likes collection)
          return { ...p, likes: p.likes + 1 };
        }
        return p;
      });
      
      // Update UI optimistically
      setUserPosts(updatedPosts);
      
      // If we had a real implementation, we would update the likes in Firestore here
      // For now, this is just a UI demonstration
      
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost({
          ...selectedPost,
          likes: selectedPost.likes + 1
        });
      }
    } catch (err) {
      console.error('Error liking post:', err);
      Alert.alert('Error', 'Failed to like the post');
      
      // Revert optimistic update on error
      fetchUserPosts();
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, userPosts, selectedPost]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Fetching user data for ID:', userId);
        setIsLoading(true);
        
        if (!userId) {
          setError('No user ID provided');
          setIsLoading(false);
          return;
        }
        
        // Fetch user document from Firestore
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('Fetched user data:', data);
          
          // Convert to SafeUserData format with real data only
          const safeUserData: SafeUserData = {
            userID: userId,
            username: data.username || 'user',
            email: data.email || '',
            userDisplayName: data.userDisplayName || data.fullName || '',
            fullName: data.fullName || '',
            profilePictureURL: data.profilePictureURL || '',
            isVerified: data.isVerified || false,
            bio: data.bio || '',
            createdAt: data.createdAt || null
          };
          
          // Add optional fields only if they exist in data
          if (data.location) safeUserData.location = data.location;
          if (data.website) safeUserData.website = data.website;
          if (data.fashionGenres) safeUserData.fashionGenres = data.fashionGenres;
          if (data.affiliateLinks) safeUserData.affiliateLinks = data.affiliateLinks;
          
          // Calculate join date from createdAt if available
          if (data.createdAt) {
            const createdDate = new Date(data.createdAt.seconds * 1000);
            safeUserData.joinDate = createdDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            });
          }
          
          setUserData(safeUserData);
          
          // Fetch additional data
          await Promise.all([
            fetchFollowCounts(),
            checkFollowStatus(),
            fetchUserPosts()
          ]);
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error loading user data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={mainColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }
  
  if (error || !userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: mainColor }]}>
          {error || 'No user data available'}
        </Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: mainColor }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Back Button */}
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(25, 25, 35, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backButtonText, { color: mainColor }]}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        {/* Profile Header Section - Instagram Style */}
        <View style={styles.profileHeader}>
          {/* Profile Image - Left Side */}
          <View style={styles.profileImageContainer}>
            {userData.profilePictureURL ? (
              <Image 
                source={{ uri: userData.profilePictureURL }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={[styles.defaultProfileImage, { backgroundColor: mainColor }]}>
                <Text style={styles.defaultProfileImageText}>
                  {userData.userDisplayName ? 
                    userData.userDisplayName.charAt(0).toUpperCase() : 
                    userData.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          
          {/* User Stats & Info - Right Side */}
          <View style={styles.userInfoContainer}>
            {/* Username Row */}
            <View style={styles.usernameRow}>
              <Text style={[styles.username, { color: textColor }]}>
                {userData.userDisplayName || userData.username}
                {userData.isVerified ? <Text style={styles.verifiedBadge}> ✓</Text> : null}
              </Text>
            </View>
            
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{userPosts.length}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Posts</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{followCounts.followers}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{followCounts.following}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
              </View>
            </View>
            
            {/* Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
              {(() => {
                const currentUser = auth().currentUser;
                if (currentUser && userId && currentUser.uid !== userId) {
                  // Viewing someone else's profile
                  return (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.followButton,
                          {
                            backgroundColor: isFollowing ? 'transparent' : isDarkMode ? mainColor : '#3897f0',
                            borderWidth: isFollowing ? 1 : 0,
                            borderColor: isDarkMode ? mainColor : '#3897f0',
                            flex: 1,
                            marginRight: 8
                          }
                        ]}
                        onPress={handleFollowAction}
                        disabled={isFollowLoading}
                      >
                        {isFollowLoading ? (
                          <ActivityIndicator size="small" color={isFollowing ? mainColor : 'white'} />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {isFollowing && (
                              <Icon name="checkmark-circle" size={14} color={isDarkMode ? mainColor : '#3897f0'} style={{ marginRight: 4 }} />
                            )}
                            <Text
                              style={[
                                styles.followButtonText,
                                { color: isFollowing ? (isDarkMode ? mainColor : '#3897f0') : 'white' }
                              ]}
                            >
                              {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.messageButton,
                          {
                            backgroundColor: isDarkMode ? 'rgba(62, 62, 70, 0.3)' : 'rgba(240, 240, 245, 0.8)',
                            borderWidth: 1,
                            borderColor: isDarkMode ? 'rgba(70, 70, 90, 0.4)' : 'rgba(210, 210, 220, 0.9)',
                            flex: 1
                          }
                        ]}
                        onPress={() => {
                          // Check if this is a real user
                          if (!isRealUserId(userId)) {
                            alert('Messaging demo accounts is not available.');
                            return;
                          }
                          
                          // Navigate directly to the MessagingScreen
                          console.log(`MESSAGE USER from details - userId: ${userId}, username: ${userData.username}`);
                          navigation.navigate('MessagingScreen', {
                            otherUserId: userData.userID,
                            otherUserName: userData.username
                          });
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="chatbubble-outline" size={14} color={textColor} style={{ marginRight: 5 }} />
                          <Text
                            style={[
                              styles.messageButtonText,
                              { color: textColor }
                            ]}
                          >
                            Message
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </>
                  );
                } else if (currentUser && userId && currentUser.uid === userId) {
                  // Viewing own profile
                  return (
                    <TouchableOpacity
                      style={[
                        styles.editProfileButton,
                        {
                          backgroundColor: 'transparent',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#3A3A3A' : '#dbdbdb',
                          flex: 1
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.editProfileButtonText,
                          { color: textColor }
                        ]}
                      >
                        Edit Profile
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
            </View>
          </View>
        </View>
        
        {/* Bio & Details Section */}
        <View style={styles.bioSection}>
          <Text style={[styles.displayName, { color: textColor }]}>
            {userData.fullName || ''}
          </Text>
          
          {userData.bio ? (
            <Text style={[styles.bioText, { color: textColor }]}>
              {userData.bio}
            </Text>
          ) : null}
          
          {/* Website - top priority */}
          {userData.website ? (
            <TouchableOpacity style={styles.websiteLink}>
              <Text style={[styles.websiteLinkText, { color: mainColor }]}>
                {userData.website}
              </Text>
            </TouchableOpacity>
          ) : null}
          
          {/* User Details & Metadata */}
          <View style={styles.metadataContainer}>
            {userData.location ? (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: subTextColor }]}>
                  📍 {userData.location}
                </Text>
              </View>
            ) : null}
            
            {userData.joinDate ? (
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataText, { color: subTextColor }]}>
                  📅 Joined {userData.joinDate}
                </Text>
              </View>
            ) : null}
          </View>
          
          {/* Fashion Genres Tags */}
          {userData.fashionGenres && userData.fashionGenres.length > 0 ? (
            <View style={styles.genresContainer}>
              {userData.fashionGenres.map((genre, index) => (
                <View 
                  key={index}
                  style={[
                    styles.genreTag, 
                    { backgroundColor: isDarkMode ? 'rgba(239, 61, 71, 0.15)' : 'rgba(239, 61, 71, 0.1)' }
                  ]}
                >
                  <Text style={[styles.genreText, { color: mainColor }]}>
                    {genre}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        
        {/* Affiliate Links Section - if available */}
        {userData.affiliateLinks && userData.affiliateLinks.length > 0 ? (
          <View style={styles.affiliateSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Shop {userData.username}'s Favorites
            </Text>
            {userData.affiliateLinks.map((link, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.affiliateLinkItem, 
                  { backgroundColor: isDarkMode ? '#242535' : '#f5f5f5' }
                ]}
              >
                <View style={styles.affiliateLinkContent}>
                  <View>
                    <Text style={[styles.affiliateLinkName, { color: textColor }]}>
                      {link.name}
                    </Text>
                    <Text style={[styles.affiliateLinkPlatform, { color: subTextColor }]}>
                      {link.platform}
                    </Text>
                  </View>
                  <Text style={[styles.shopNowText, { color: mainColor }]}>Visit →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        
        {/* User's email - only visible to the user themselves */}
        {(() => {
          const currentUser = auth().currentUser;
          // Only show email if we're viewing our own profile
          if (currentUser && userId && currentUser.uid === userId) {
            return (
              <View style={styles.emailContainer}>
                <Text style={[styles.emailText, { color: subTextColor }]}>
                  {userData.email || 'No email available'}
                </Text>
              </View>
            );
          }
          return null;
        })()}
        
        {/* Tab Navigation - Instagram Style */}
        <View style={styles.tabsContainer}>
          <View style={[styles.tabBar, { borderBottomColor: isDarkMode ? '#333' : '#dbdbdb' }]}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'posts' ? styles.activeTab : null]}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={styles.tabIcon}>📸</Text>
              {activeTab === 'posts' && (
                <View style={[styles.tabIndicator, { backgroundColor: isDarkMode ? mainColor : '#000000' }]} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'outfits' ? styles.activeTab : null]}
              onPress={() => setActiveTab('outfits')}
            >
              <Text style={styles.tabIcon}>👕</Text>
              {activeTab === 'outfits' && (
                <View style={[styles.tabIndicator, { backgroundColor: isDarkMode ? mainColor : '#000000' }]} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'styles' ? styles.activeTab : null]}
              onPress={() => setActiveTab('styles')}
            >
              <Text style={styles.tabIcon}>🎨</Text>
              {activeTab === 'styles' && (
                <View style={[styles.tabIndicator, { backgroundColor: isDarkMode ? mainColor : '#000000' }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Tab Content */}
        {activeTab === 'posts' ? (
          <View style={styles.tabContentArea}>
            {postsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={mainColor} />
                <Text style={[styles.loadingText, { color: subTextColor }]}>Loading posts...</Text>
              </View>
            ) : userPosts.length > 0 ? (
              <FlatList
                data={userPosts}
                numColumns={3}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.postRow}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.postCard}
                    onPress={() => handlePostPress(item)}
                    activeOpacity={0.9}
                  >
                    <Image 
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/300' }}
                      style={styles.postImage} 
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? '#242535' : '#f5f5f5' }]}>
                      <Text style={{fontSize: 36}}>📷</Text>
                    </View>
                    <Text style={[styles.emptyTitle, { color: textColor }]}>No Posts Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
                      When {userData.username} shares photos, they'll appear here.
                    </Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <View style={[styles.emptyStateIconContainer, { backgroundColor: isDarkMode ? '#242535' : '#f5f5f5' }]}>
                  <Text style={styles.emptyStateIcon}>📷</Text>
                </View>
                <Text style={[styles.emptyStateText, { color: textColor }]}>
                  No Posts Yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: subTextColor }]}>
                  When {userData.username} shares photos, you'll see them here
                </Text>
              </View>
            )}
          </View>
        ) : activeTab === 'outfits' ? (
          <View style={styles.tabContentArea}>
            <View style={styles.emptyFeatureContainer}>
              <View style={[styles.emptyFeatureIconContainer, { backgroundColor: isDarkMode ? 'rgba(239, 61, 71, 0.15)' : 'rgba(239, 61, 71, 0.08)' }]}>
                <Text style={styles.emptyFeatureIcon}>👕</Text>
              </View>
              <Text style={[styles.emptyFeatureTitle, { color: textColor }]}>
                Outfit Collections
              </Text>
              <Text style={[styles.emptyFeatureDescription, { color: subTextColor }]}>
                Curated outfit collections will be available soon. Create and share complete looks.
              </Text>
              {userData.userID === auth().currentUser?.uid && (
                <TouchableOpacity 
                  style={[styles.createOutfitButton, { backgroundColor: mainColor }]}
                >
                  <Text style={styles.createOutfitButtonText}>
                    Create First Outfit
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.tabContentArea}>
            <View style={styles.emptyFeatureContainer}>
              <View style={[styles.emptyFeatureIconContainer, { backgroundColor: isDarkMode ? 'rgba(239, 61, 71, 0.15)' : 'rgba(239, 61, 71, 0.08)' }]}>
                <Text style={styles.emptyFeatureIcon}>🎨</Text>
              </View>
              <Text style={[styles.emptyFeatureTitle, { color: textColor }]}>
                Style Profile
              </Text>
              <Text style={[styles.emptyFeatureDescription, { color: subTextColor }]}>
                Your personal style analysis and preferences will appear here. Discover your unique fashion identity.
              </Text>
              {userData.userID === auth().currentUser?.uid && (
                <TouchableOpacity 
                  style={[styles.createOutfitButton, { backgroundColor: mainColor }]}
                >
                  <Text style={styles.createOutfitButtonText}>
                    Complete Style Quiz
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
      
      {/* Post Detail Modal */}
      <Modal
        visible={isPostDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePostDetail}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          {selectedPost ? (
            <View style={styles.modalWrapper}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#333' : '#e0e0e0' }]}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleClosePostDetail}
                >
                  <Text style={[styles.closeButtonText, { color: textColor }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: textColor }]}>Post</Text>
                <View style={styles.headerSpacer} />
              </View>
              
              <ScrollView contentContainerStyle={styles.postDetailContainer}>
                {/* Post Card */}
                <View style={[styles.postCard_detailed, { backgroundColor: isDarkMode ? '#16171F' : '#FFFFFF' }]}>
                  {/* Post Header - Author Info */}
                  <View style={styles.postDetailHeader}>
                    <View style={styles.postAuthorRow}>
                      {selectedPost.userAvatar ? (
                        <Image 
                          source={{ uri: selectedPost.userAvatar }} 
                          style={styles.postAuthorAvatar} 
                        />
                      ) : (
                        <View style={[styles.defaultAuthorAvatar, { backgroundColor: mainColor }]}>
                          <Text style={styles.defaultAuthorAvatarText}>
                            {selectedPost.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.postAuthorName, { color: textColor }]}>
                          {selectedPost.username}
                        </Text>
                        {userData && userData.isVerified ? (
                          <Text style={styles.verifiedBadgeSmall}>Verified</Text>
                        ) : null}
                      </View>
                    </View>
                    
                    <TouchableOpacity style={styles.postMoreButton}>
                      <Text style={{ fontSize: 18, color: textColor }}>•••</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Post Image */}
                  <Image
                    source={{ uri: selectedPost.imageUrl || 'https://via.placeholder.com/400' }}
                    style={styles.postDetailImage}
                    resizeMode="cover"
                  />
                  
                  {/* Interaction Buttons */}
                  <View style={styles.postActions}>
                    <View style={styles.leftActions}>
                      <TouchableOpacity 
                        style={styles.postAction}
                        onPress={() => handleLikePost(selectedPost)}
                        disabled={isLiking}
                      >
                        <Text style={[styles.postActionIcon, { color: mainColor }]}>❤️</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.postAction}>
                        <Text style={[styles.postActionIcon, { color: textColor }]}>💬</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.postAction}>
                        <Text style={[styles.postActionIcon, { color: textColor }]}>🔄</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity style={styles.postAction}>
                      <Text style={[styles.postActionIcon, { color: textColor }]}>🔖</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Likes Count */}
                  <Text style={[styles.likesText, { color: textColor }]}>
                    {selectedPost.likes} likes
                  </Text>
                  
                  {/* Caption */}
                  <View style={styles.captionContainer}>
                    <Text style={[styles.postCaptionUsername, { color: textColor }]}>
                      {selectedPost.username}
                    </Text>
                    <Text style={[styles.postCaption, { color: isDarkMode ? '#e0e0e0' : '#303030' }]}>
                      {selectedPost.caption}
                    </Text>
                  </View>
                  
                  {/* Tags */}
                  {selectedPost.tags && selectedPost.tags.length > 0 ? (
                    <View style={styles.tagsContainer}>
                      {selectedPost.tags.map((tag, index) => (
                        <TouchableOpacity key={index} style={styles.tag}>
                          <Text style={[styles.tagText, { color: mainColor }]}>
                            #{tag}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  
                  {/* Comments Placeholder */}
                  <TouchableOpacity style={styles.viewCommentsButton}>
                    <Text style={[styles.viewCommentsText, { color: subTextColor }]}>
                      View all {selectedPost.comments} comments
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Outfit Items / Affiliate Links */}
                  {selectedPost.outfitItems && selectedPost.outfitItems.length > 0 ? (
                    <View style={styles.outfitItemsContainer}>
                      <Text style={[styles.outfitItemsTitle, { color: textColor }]}>
                        Featured Items
                      </Text>
                      {selectedPost.outfitItems.map((item, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={[styles.affiliateLink, { backgroundColor: isDarkMode ? '#242535' : '#f5f5f5' }]}
                        >
                          <View style={styles.affiliateLinkContent}>
                            <View>
                              <Text style={[styles.outfitItemName, { color: textColor }]}>
                                {item.name}
                              </Text>
                              <Text style={[styles.outfitItemBrand, { color: subTextColor }]}>
                                by {item.brand}
                              </Text>
                            </View>
                            <Text style={[styles.shopNowText, { color: mainColor }]}>Shop →</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={mainColor} />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// Set default text styles for consistent typography
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  letterSpacing: 0.05,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingText: {
    ...defaultTextStyle,
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    padding: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
  },
  // Main content styles
  content: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 60,
  },
  
  // Profile header section - Instagram style
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    width: '100%',
    paddingTop: 10,
  },
  profileImageContainer: {
    marginRight: 20,
    width: '28%',
    alignItems: 'center',
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 0.5,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  defaultProfileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  defaultProfileImageText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
  },
  
  // User info container (right side of profile)
  userInfoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  username: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    color: '#0095F6',
    fontSize: 16,
  },
  
  // Bio section
  bioSection: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 2,
  },
  displayName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  bioText: {
    ...defaultTextStyle,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
  },
  userDetailsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    ...defaultTextStyle,
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  detailLink: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  genreTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '600',
  },
  affiliateSection: {
    width: '100%',
    marginBottom: 20,
  },
  affiliateSectionTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  affiliateLinkItem: {
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  affiliateLinkContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affiliateLinkName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  affiliateLinkPlatform: {
    ...defaultTextStyle,
    fontSize: 13,
    marginTop: 2,
  },
  shopNowText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  // Stats section
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingRight: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '400',
  },
  
  // Action buttons
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  followButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  followButtonText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  messageButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageButtonText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  editProfileButton: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  editProfileButtonText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  
  // Website and metadata
  websiteLink: {
    marginBottom: 6,
  },
  websiteLinkText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
    color: '#0095F6',
    letterSpacing: -0.2,
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    marginBottom: 10,
  },
  metadataItem: {
    marginRight: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    ...defaultTextStyle,
    fontSize: 12.5,
  },
  tabsContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 6,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  activeTab: {
    opacity: 1,
  },
  tabContent: {
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  tabContentArea: {
    width: '100%',
    minHeight: 250,
    paddingTop: 10,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  postCard: {
    width: '32.5%',
    aspectRatio: 1,
    marginBottom: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 6,
    opacity: 0, // Hidden by default
  },
  postStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  postStatText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyPostsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPostsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPostsText: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyPostsSubtext: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateIcon: {
    fontSize: 32,
  },
  emptyStateText: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  emptyFeatureContainer: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFeatureIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyFeatureIcon: {
    fontSize: 38,
  },
  emptyFeatureTitle: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyFeatureDescription: {
    ...defaultTextStyle,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 30,
    maxWidth: '90%',
  },
  createOutfitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createOutfitButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emailContainer: {
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  emailText: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalWrapper: {
    flex: 1,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Match closeButton width for balanced header
  },
  closeButton: {
    padding: 10,
    width: 40,
  },
  closeButtonText: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '600',
  },
  postDetailContainer: {
    paddingBottom: 30,
  },
  postCard_detailed: {
    borderRadius: 12,
    marginTop: 8,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  postDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  defaultAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  defaultAuthorAvatarText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  postAuthorName: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadgeSmall: {
    ...defaultTextStyle,
    color: '#0095F6',
    fontSize: 12,
  },
  postMoreButton: {
    padding: 8,
  },
  postDetailImage: {
    width: '100%',
    aspectRatio: 1,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAction: {
    marginRight: 16,
  },
  postActionIcon: {
    fontSize: 24,
  },
  likesText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  captionContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  postCaptionUsername: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  postCaption: {
    ...defaultTextStyle,
    fontSize: 14,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  tag: {
    marginRight: 10,
    marginBottom: 6,
  },
  tagText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  viewCommentsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewCommentsText: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  outfitItemsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    marginTop: 10,
  },
  outfitItemsTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  affiliateLink: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  affiliateLinkContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitItemName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  outfitItemBrand: {
    ...defaultTextStyle,
    fontSize: 13,
    marginTop: 2,
  },
  shopNowText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserDetailScreen;