// src/screens/UserDetailScreen.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Alert,
  Image,
  SafeAreaView,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
  ImageBackground,
  FlatList,
  RefreshControl,
  Linking
} from 'react-native';
import { db } from '../Config/firebaseconfig';
import { auth } from '../Config/firebaseconfig';
import { getUserPreferences, UserPreferences } from '../services/firestoreService';
import { getPostsByUser, Post } from '../services/postService';
import { followUser, unfollowUser, isUserFollowing, getFollowCounts } from '../services/followService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types/NavigationTypes';
import { doc, getDoc, Timestamp, DocumentData } from 'firebase/firestore';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';

// Define route params type
type UserDetailParams = {
  userId: string;
  username?: string;
};

// Set default text styles
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  letterSpacing: 0.1,
};

const { width, height } = Dimensions.get('window');

const UserDetailScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, UserDetailParams>, string>>();
  const { userId, username } = route.params || {};
  
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'outfits' | 'styles'>('posts');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  
  // Follow states
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Theme colors
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const secondaryColor = isDarkMode ? '#FF6D8E' : '#FF3B5C'; // Red accent
  const accentColor = isDarkMode ? '#FF9F0A' : '#FF9500'; // Orange for contrast
  const surfaceColor = isDarkMode ? '#222232' : '#F5F5F5';
  
  // Animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 50],
    extrapolate: 'clamp'
  });
  
  const profileScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp'
  });
  
  const profileOpacity = scrollY.interpolate({
    inputRange: [0, 60, 130],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp'
  });
  
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
    } catch (error) {
      console.error('Error handling follow action:', error);
      Alert.alert('Error', error.message || 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  // Send message to user
  const handleSendMessage = () => {
    Alert.alert('Coming Soon', 'Message functionality will be available in a future update.');
  };
  
  // Check follow status
  const checkFollowStatus = useCallback(async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !userId) return;
      
      if (currentUser.uid === userId) {
        // Don't check if this is the current user's profile
        return;
      }
      
      const following = await isUserFollowing(currentUser.uid, userId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }, [userId]);
  
  // Fetch user's follow counts
  const fetchFollowCounts = useCallback(async () => {
    try {
      if (!userId) return;
      
      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  }, [userId]);
  
  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      // Fetch user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Convert Firestore Timestamp to Date if needed
        if (userData.createdAt && userData.createdAt instanceof Timestamp) {
          userData.createdAt = userData.createdAt.toDate();
        }
        
        setUserData(userData);
      } else {
        console.log('No user found with ID:', userId);
        Alert.alert('Error', 'User not found');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load user profile');
    }
  }, [userId]);
  
  // Fetch user posts
  const fetchUserPosts = useCallback(async () => {
    try {
      if (!userId) {
        setPostsLoading(false);
        return;
      }
      
      setPostsLoading(true);
      const posts = await getPostsByUser(userId);
      setUserPosts(posts);
      setPostsLoading(false);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setPostsLoading(false);
    }
  }, [userId]);
  
  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch fresh data
      await Promise.all([
        fetchUserData(),
        fetchUserPosts(),
        fetchFollowCounts(),
        checkFollowStatus()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setRefreshing(false);
  }, [fetchUserData, fetchUserPosts, fetchFollowCounts, checkFollowStatus]);
  
  // Initial data fetch
  useEffect(() => {
    fetchUserData();
    fetchUserPosts();
    fetchFollowCounts();
    checkFollowStatus();
  }, [fetchUserData, fetchUserPosts, fetchFollowCounts, checkFollowStatus, userId]);
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={mainColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }
  
  if (!userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color={subTextColor} />
          <Text style={[styles.errorText, { color: textColor }]}>User not found</Text>
          <TouchableOpacity 
            style={[styles.errorButton, { backgroundColor: mainColor }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Floating Header */}
      <Animated.View 
        style={[
          styles.floatingHeader,
          {
            height: headerHeight,
            opacity: headerOpacity,
            backgroundColor: cardBgColor,
            borderBottomColor: borderColor
          }
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {userData.username || userData.userDisplayName || 'Profile'}
        </Text>
        <View style={{ width: 40 }} /> {/* Empty space for balance */}
      </Animated.View>
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={mainColor}
            colors={[mainColor]}
          />
        }
      >
        {/* Profile Header */}
        <Animated.View 
          style={[
            styles.profileHeader,
            {
              transform: [{ scale: profileScale }],
              opacity: profileOpacity
            }
          ]}
        >
          <View style={styles.profileGradient}>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format' }}
              style={styles.profileBackground}
              blurRadius={isDarkMode ? 10 : 5}
            >
              <View style={[
                styles.profileOverlay,
                { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.75)' }
              ]} />
            </ImageBackground>
          </View>
          
          <View style={styles.profileContent}>
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
                      userData.username ? 
                        userData.username.charAt(0).toUpperCase() : 
                        userData.email.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.nameContainer}>
              <Text style={[styles.displayName, { color: textColor }]}>
                {userData.userDisplayName || userData.username || 'User'}
              </Text>
              
              <Text style={[styles.username, { color: subTextColor }]}>
                @{userData.username || 'user'}
                {userData.isVerified && (
                  <Icon name="checkmark-circle" size={16} color={mainColor} style={{ marginLeft: 4 }} />
                )}
              </Text>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{userPosts.length}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{followCounts.following}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: textColor }]}>{followCounts.followers}</Text>
                <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
              </View>
            </View>
            
            {/* Action Buttons - Only shown when viewing another user's profile */}
            {userId && auth().currentUser && userId !== auth().currentUser.uid && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    { 
                      backgroundColor: isFollowing ? 'transparent' : mainColor,
                      borderWidth: isFollowing ? 1 : 0,
                      borderColor: mainColor
                    }
                  ]}
                  onPress={handleFollowAction}
                  disabled={isFollowLoading}
                >
                  {isFollowLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? mainColor : 'white'} />
                  ) : (
                    <Text style={[
                      styles.followButtonText, 
                      { color: isFollowing ? mainColor : 'white' }
                    ]}>
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.messageButton, { borderColor: mainColor }]}
                  onPress={handleSendMessage}
                >
                  <Text style={[styles.messageButtonText, { color: mainColor }]}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
        
        {/* Profile Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: cardBgColor }]}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'posts' && [styles.activeTab, { borderBottomColor: mainColor }]
            ]}
            onPress={() => setActiveTab('posts')}
          >
            <Icon 
              name="grid-outline" 
              size={22} 
              color={activeTab === 'posts' ? mainColor : subTextColor} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'posts' ? mainColor : subTextColor }
            ]}>Posts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'outfits' && [styles.activeTab, { borderBottomColor: mainColor }]
            ]}
            onPress={() => setActiveTab('outfits')}
          >
            <Icon 
              name="shirt-outline" 
              size={22} 
              color={activeTab === 'outfits' ? mainColor : subTextColor} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'outfits' ? mainColor : subTextColor }
            ]}>Outfits</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'styles' && [styles.activeTab, { borderBottomColor: mainColor }]
            ]}
            onPress={() => setActiveTab('styles')}
          >
            <Icon 
              name="color-palette-outline" 
              size={22} 
              color={activeTab === 'styles' ? mainColor : subTextColor} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'styles' ? mainColor : subTextColor }
            ]}>Style</Text>
          </TouchableOpacity>
        </View>
        
        {/* Posts Tab Content */}
        {activeTab === 'posts' && (
          <View style={styles.sectionContainer}>
            {postsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={mainColor} />
                <Text style={[styles.loadingText, { color: subTextColor }]}>Loading posts...</Text>
              </View>
            ) : userPosts.length > 0 ? (
              <FlatList
                data={userPosts}
                numColumns={3}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.postCard}
                    onPress={() => {
                      setSelectedPost(item);
                      setIsPostModalVisible(true);
                    }}
                  >
                    <Image 
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                      style={styles.postImage} 
                      resizeMode="cover"
                    />
                    <View style={styles.postOverlay}>
                      <View style={styles.postStats}>
                        <View style={styles.postStat}>
                          <Icon name="heart" size={12} color="#FFFFFF" />
                          <Text style={styles.postStatText}>{item.likes || 0}</Text>
                        </View>
                        <View style={styles.postStat}>
                          <Icon name="chatbubble" size={12} color="#FFFFFF" />
                          <Text style={styles.postStatText}>{item.comments || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.postsGrid}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyPostsContainer}>
                <Icon name="images-outline" size={60} color={subTextColor} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyPostsText, { color: textColor }]}>
                  No Posts Yet
                </Text>
                <Text style={[styles.emptyPostsSubText, { color: subTextColor }]}>
                  This user hasn't shared any posts
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Outfits Tab Content */}
        {activeTab === 'outfits' && (
          <View style={styles.comingSoonContainer}>
            <Icon name="shirt-outline" size={60} color={subTextColor} style={{ opacity: 0.5 }} />
            <Text style={[styles.comingSoonText, { color: textColor }]}>
              Coming Soon
            </Text>
            <Text style={[styles.comingSoonSubtext, { color: subTextColor }]}>
              Outfit collections will be available in a future update
            </Text>
          </View>
        )}
        
        {/* Styles Tab Content */}
        {activeTab === 'styles' && (
          <View style={styles.comingSoonContainer}>
            <Icon name="color-palette-outline" size={60} color={subTextColor} style={{ opacity: 0.5 }} />
            <Text style={[styles.comingSoonText, { color: textColor }]}>
              Coming Soon
            </Text>
            <Text style={[styles.comingSoonSubtext, { color: subTextColor }]}>
              Style preferences will be available in a future update
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...defaultTextStyle,
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    height: 320,
    width,
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  profileBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  profileContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  defaultProfileImageText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  displayName: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    marginHorizontal: 24,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  followButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 6,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 6,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  messageButtonText: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: -20,
    marginBottom: 20,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  sectionContainer: {
    marginTop: 8,
    paddingBottom: 20,
  },
  postsGrid: {
    paddingHorizontal: 12,
  },
  postCard: {
    width: (width - 48) / 3,
    height: (width - 48) / 3,
    borderRadius: 8,
    margin: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
    opacity: 0,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 6,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    ...defaultTextStyle,
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 3,
  },
  emptyPostsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPostsText: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyPostsSubText: {
    ...defaultTextStyle,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  comingSoonContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  comingSoonSubtext: {
    ...defaultTextStyle,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});

export default UserDetailScreen;