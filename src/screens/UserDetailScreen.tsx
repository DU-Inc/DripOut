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
  FlatList,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation, RouteProp, NavigationProp } from '@react-navigation/native';
import { db, auth } from '../Config/firebaseconfig';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../styles/themeprovider';
import { followUser, unfollowUser, isUserFollowing, getFollowCounts } from '../services/followService';
import { getPostsByUser, Post } from '../services/postService';
import { getUserPreferences, UserPreferences } from '../services/firestoreService';
import { isRealUserId } from '../utils/userUtils';
import { RootStackParamList } from '../types/NavigationTypes';

type NavigationType = NavigationProp<RootStackParamList>;

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
  const insets = useSafeAreaInsets(); // Get safe area insets
  const navigation = useNavigation<NavigationType>();
  const route = useRoute<RouteProp<Record<string, UserDetailParams>, string>>();
  const { userId, username, userDisplayName } = route.params || {};
  
  // Colors based on theme (matching OptimizedUserProfileScreen)
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  
  // Outfits state
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [outfitsLoading, setOutfitsLoading] = useState(true);
  
  // User preferences state
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  
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

  // Fetch user's saved outfits
  const fetchSavedOutfits = async () => {
    try {
      if (!userId) {
        setOutfitsLoading(false);
        return;
      }
      
      setOutfitsLoading(true);
      const outfitsSnapshot = await db
        .collection("saved_outfits")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      
      if (outfitsSnapshot.empty) {
        setSavedOutfits([]);
        setOutfitsLoading(false);
        return;
      }

      const outfits = outfitsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Saved Outfit",
          imageUrl: data.imageUrl,
          products: data.products || [],
          createdAt: data.createdAt
        };
      });
      
      setSavedOutfits(outfits);
      setOutfitsLoading(false);
    } catch (err) {
      console.error('Error fetching saved outfits:', err);
      setSavedOutfits([]);
      setOutfitsLoading(false);
    }
  };

  // Fetch user's preferences
  const fetchUserPreferences = async () => {
    try {
      if (!userId) {
        setPreferencesLoading(false);
        return;
      }
      
      setPreferencesLoading(true);
      const preferences = await getUserPreferences(userId);
      setUserPreferences(preferences);
      setPreferencesLoading(false);
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setUserPreferences(null);
      setPreferencesLoading(false);
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

  // Refresh function for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUserData(),
        fetchFollowCounts(),
        checkFollowStatus(),
        fetchUserPosts(),
        fetchSavedOutfits(),
        fetchUserPreferences()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      console.log('Fetching user data for ID:', userId);
      setIsLoading(true);
      
      if (!userId) {
        setError('No user ID provided');
        setIsLoading(false);
        return;
      }
      
      // Fetch user document from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
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
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchUserData(),
        fetchFollowCounts(),
        checkFollowStatus(),
        fetchUserPosts(),
        fetchSavedOutfits(),
        fetchUserPreferences()
      ]);
    };
    
    fetchData();
  }, [fetchUserData, userId]);
  
  // Show loading skeleton while initial data loads
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 20 }]}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }
  
  // Show error if there's an error
  if (error && !userData) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.errorContainer, { paddingTop: insets.top + 20 }]}>
          <Icon name="alert-circle-outline" size={48} color={mainColor} />
          <Text style={[styles.errorTitle, { color: textColor }]}>
            Something went wrong
          </Text>
          <Text style={[styles.errorMessage, { color: subTextColor }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: mainColor }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={mainColor}
            colors={[mainColor]}
          />
        }
      >
        {/* Profile Header */}
        <View style={[
          styles.profileHeader, 
          { 
            backgroundColor: cardBgColor,
            paddingTop: insets.top + 20 // Add extra padding for notch
          }
        ]}>
          <Image
            source={{ 
              uri: userData?.profilePictureURL || 'https://via.placeholder.com/120'
            }}
            style={styles.profilePicture}
          />
          
          <Text style={[styles.profileName, { color: textColor }]}>
            {userData?.userDisplayName || userData?.fullName || 'User'}
          </Text>
          
          <Text style={[styles.profileUsername, { color: subTextColor }]}>
            @{userData?.username || 'username'}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {userPosts.length}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Posts</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {savedOutfits.length}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Outfits</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.followers}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.following}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
            </View>
          </View>
          
          {/* Follow Button */}
          {auth().currentUser?.uid !== userId && (
            <TouchableOpacity
              style={[
                styles.followButton,
                { 
                  backgroundColor: isFollowing ? 'transparent' : mainColor,
                  borderColor: mainColor,
                  borderWidth: 1
                }
              ]}
              onPress={handleFollowAction}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? mainColor : '#FFFFFF'} />
              ) : (
                <Text style={[
                  styles.followButtonText, 
                  { color: isFollowing ? mainColor : '#FFFFFF' }
                ]}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: cardBgColor }]}>
          {['posts', 'outfits', 'styles'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: mainColor }
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? mainColor : subTextColor }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
          {/* Tab Content */}
          {activeTab === 'posts' ? (
            <View style={styles.sectionContainer}>
              {postsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={mainColor} />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>Loading posts...</Text>
                </View>
              ) : userPosts.length > 0 ? (
                <FlatList
                  key="posts-grid-3-columns"
                  data={userPosts}
                  numColumns={3}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity 
                      style={styles.postCard}
                      onPress={() => handlePostPress(item)}
                    >
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.postImage} 
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="images-outline" size={48} color={subTextColor} />
                  <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                    No posts yet
                  </Text>
                </View>
              )}
            </View>
          ) : activeTab === 'outfits' ? (
            <View style={styles.sectionContainer}>
              {outfitsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={mainColor} />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>Loading outfits...</Text>
                </View>
              ) : savedOutfits.length > 0 ? (
                <FlatList
                  key="outfits-grid-2-columns"
                  data={savedOutfits}
                  numColumns={2}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity 
                      style={[styles.outfitCard, { backgroundColor: cardBgColor }]}
                      onPress={() => {
                        navigation.navigate('OutfitDetailScreen', {
                          outfit: item
                        });
                      }}
                    >
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.outfitImage} 
                        resizeMode="cover"
                      />
                      <Text style={[styles.outfitName, { color: textColor }]}>
                        {item.name || 'Saved Outfit'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                  columnWrapperStyle={styles.outfitRow}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="shirt-outline" size={48} color={subTextColor} />
                  <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                    No saved outfits yet
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sectionContainer}>
              {preferencesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={mainColor} />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>Loading preferences...</Text>
                </View>
              ) : userPreferences ? (
                <View style={[styles.preferencesContainer, { backgroundColor: cardBgColor }]}>
                  <View style={styles.preferencesHeader}>
                    <Text style={[styles.preferencesTitle, { color: textColor }]}>
                      Style Preferences
                    </Text>
                    <Text style={[styles.preferencesSubtitle, { color: subTextColor }]}>
                      {userData?.userDisplayName || userData?.fullName || 'User'}'s style profile
                    </Text>
                  </View>

                  <View style={styles.preferencesContent}>
                    {/* Preferred Styles */}
                    {userPreferences.preferredStyles && userPreferences.preferredStyles.length > 0 && (
                      <View style={styles.preferenceGroup}>
                        <Text style={[styles.preferenceLabel, { color: textColor }]}>Preferred Styles</Text>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.tagsScrollView}
                        >
                          {userPreferences.preferredStyles.map((style: string, index: number) => (
                            <View 
                              key={index}
                              style={[styles.styleTag, { backgroundColor: `${mainColor}20` }]}
                            >
                              <Text style={[styles.styleTagText, { color: mainColor }]}>{style}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Preferred Brands */}
                    {userPreferences.preferredBrands && userPreferences.preferredBrands.length > 0 && (
                      <View style={styles.preferenceGroup}>
                        <Text style={[styles.preferenceLabel, { color: textColor }]}>Favorite Brands</Text>
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.tagsScrollView}
                        >
                          {userPreferences.preferredBrands.map((brand: string, index: number) => (
                            <View 
                              key={index}
                              style={[styles.styleTag, { backgroundColor: `${mainColor}20` }]}
                            >
                              <Text style={[styles.styleTagText, { color: mainColor }]}>{brand}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Sizes */}
                    <View style={styles.preferenceSizes}>
                      {userPreferences.topsSize && (
                        <View style={styles.sizeItem}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Tops</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>{userPreferences.topsSize}</Text>
                        </View>
                      )}
                      {userPreferences.bottomsSize && (
                        <View style={styles.sizeItem}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Bottoms</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>{userPreferences.bottomsSize}</Text>
                        </View>
                      )}
                      {userPreferences.shoeSize && (
                        <View style={styles.sizeItem}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Shoes</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>{userPreferences.shoeSize}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="color-palette-outline" size={48} color={subTextColor} />
                  <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                    No style preferences set
                  </Text>
                </View>
              )}
            </View>
          )}
      </ScrollView>
    </View>
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
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },
  profileUsername: {
    fontSize: 16,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  followButton: {
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
  postCard: {
    flex: 1,
    margin: 1,
    aspectRatio: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  outfitCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '46%',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 1,
  },
  outfitName: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
    padding: 12,
    textAlign: 'center',
  },
  outfitRow: {
    justifyContent: 'space-between',
  },
  preferencesContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  preferencesHeader: {
    marginBottom: 20,
  },
  preferencesTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  preferencesSubtitle: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  preferencesContent: {
    gap: 20,
  },
  preferenceGroup: {
    marginBottom: 16,
  },
  preferenceLabel: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsScrollView: {
    paddingRight: 20,
  },
  styleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  styleTagText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  preferenceSizes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  sizeItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  sizeLabel: {
    ...defaultTextStyle,
    fontSize: 12,
    marginBottom: 4,
  },
  sizeValue: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  postDetailContainer: {
    padding: 16,
  },
  postDetailCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  postDetailImage: {
    width: '100%',
    aspectRatio: 1,
  },
  postDetailContent: {
    padding: 16,
  },
  postDetailCaption: {
    fontSize: 16,
    marginBottom: 8,
  },
  postDetailLikes: {
    fontSize: 14,
  },
});

export default UserDetailScreen;
