import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../styles/themeprovider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, SocialStackParamList } from '../../types/NavigationTypes';
import { StackNavigationProp } from '@react-navigation/stack';
import { getUserProfileByUsername, followUser, unfollowUser, isFollowing } from '../../services/firestoreService';
import auth from '@react-native-firebase/auth';

const { width, height } = Dimensions.get('window');

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

// Type for user profile data (shared with other components)
export interface UserProfileData {
  username: string;
  displayName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  avatarUrl: string;
  userID?: string; // Added userID for follow functionality
}

type ViewUserProfileRouteProp = RouteProp<RootStackParamList, 'ViewUserProfileScreen'>;
type SocialNavigationProp = StackNavigationProp<SocialStackParamList>;

const ViewUserProfileScreen: React.FC = () => {
  const route = useRoute<ViewUserProfileRouteProp>();
  const { username } = route.params;
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [isUserFollowing, setIsUserFollowing] = useState<boolean>(false);
  const navigation = useNavigation<SocialNavigationProp>();
  const currentUser = auth().currentUser;
  
  const { isDarkMode } = useTheme();
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  // Fetch user data when the component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      try {
        // Try to fetch the real user data from Firestore
        const firebaseUser = await getUserProfileByUsername(username);
        
        if (firebaseUser) {
          // Use the actual user data from Firebase
          const userProfileData: UserProfileData = {
            username: firebaseUser.username,
            displayName: firebaseUser.userDisplayName || firebaseUser.username,
            bio: 'Fashion enthusiast and style curator.',
            followers: 0, // Will be updated from firestore in future
            following: 0, // Will be updated from firestore in future
            posts: Math.floor(Math.random() * 50) + 5, // Mock data for now
            verified: firebaseUser.isVerified,
            avatarUrl: firebaseUser.profilePictureURL || `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99)}.jpg`,
            userID: firebaseUser.userID
          };
          
          setUserData(userProfileData);
          
          // Check if the current user is following this user
          if (currentUser && firebaseUser.userID) {
            const following = await isFollowing(currentUser.uid, firebaseUser.userID);
            setIsUserFollowing(following);
          }
        } else {
          // Fallback to mock data if user not found
          const mockUserData: UserProfileData = {
            username: username,
            displayName: username.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            bio: 'Fashion enthusiast and style curator. Sharing inspiration and trends.',
            followers: Math.floor(Math.random() * 9000) + 1000,
            following: Math.floor(Math.random() * 500) + 100,
            posts: Math.floor(Math.random() * 50) + 5,
            verified: Math.random() > 0.7,
            avatarUrl: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99)}.jpg`,
            userID: 'mock-user-id' // Mock ID for testing
          };
          
          setUserData(mockUserData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to mock data on error
        const mockUserData: UserProfileData = {
          username: username,
          displayName: username.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
          bio: 'Fashion enthusiast and style curator. Sharing inspiration and trends.',
          followers: Math.floor(Math.random() * 9000) + 1000,
          following: Math.floor(Math.random() * 500) + 100,
          posts: Math.floor(Math.random() * 50) + 5,
          verified: Math.random() > 0.7,
          avatarUrl: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99)}.jpg`,
          userID: 'mock-user-id' // Mock ID for testing
        };
        
        setUserData(mockUserData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [username, currentUser]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  const handleFollowUser = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to follow users');
      return;
    }
    
    if (!userData?.userID) {
      Alert.alert('Error', 'Cannot follow this user');
      return;
    }
    
    setFollowLoading(true);
    
    try {
      if (isUserFollowing) {
        // Unfollow the user
        await unfollowUser(currentUser.uid, userData.userID);
        setIsUserFollowing(false);
        
        // Update the followers count
        if (userData) {
          setUserData({
            ...userData,
            followers: Math.max(0, userData.followers - 1)
          });
        }
      } else {
        // Follow the user
        await followUser(currentUser.uid, userData.userID);
        setIsUserFollowing(true);
        
        // Update the followers count
        if (userData) {
          setUserData({
            ...userData,
            followers: userData.followers + 1
          });
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleMessageUser = () => {
    if (!userData) return;
    
    navigation.navigate('Chat', {
      username: userData.displayName,
      avatar: userData.avatarUrl,
      userId: userData.userID
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Text style={[styles.loadingText, { color: textColor }]}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: textColor }]}>User not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header with back button */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={mainColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
        <TouchableOpacity>
          <FeatherIcon name="more-horizontal" size={24} color={mainColor} />
        </TouchableOpacity>
      </View>
      
      {/* Profile Content */}
      <ScrollView style={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: userData.avatarUrl }}
            style={styles.profileImage}
          />
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.displayName, { color: textColor }]}>
                {userData.displayName}
              </Text>
              {userData.verified && (
                <Icon 
                  name="checkmark-circle" 
                  size={16} 
                  color={mainColor} 
                  style={styles.verifiedBadge} 
                />
              )}
            </View>
            
            <Text style={[styles.username, { color: subTextColor }]}>
              @{userData.username}
            </Text>
            
            <Text style={[styles.bio, { color: subTextColor }]}>
              {userData.bio}
            </Text>
          </View>
        </View>
        
        {/* Stats Bar */}
        <View style={[styles.statsBar, { borderColor }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatNumber(userData.posts)}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Posts
            </Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (userData.userID) {
                navigation.navigate('Followers', { 
                  username: userData.displayName,
                  userId: userData.userID
                });
              }
            }}
          >
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatNumber(userData.followers)}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Followers
            </Text>
          </TouchableOpacity>
          
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              if (userData.userID) {
                navigation.navigate('Following', { 
                  username: userData.displayName,
                  userId: userData.userID
                });
              }
            }}
          >
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatNumber(userData.following)}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Following
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.followButton, 
              { 
                backgroundColor: isUserFollowing ? 'transparent' : mainColor,
                borderWidth: isUserFollowing ? 1 : 0,
                borderColor: mainColor
              }
            ]}
            onPress={handleFollowUser}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isUserFollowing ? mainColor : 'white'} />
            ) : (
              <Text 
                style={[
                  styles.followButtonText, 
                  { color: isUserFollowing ? mainColor : 'white' }
                ]}
              >
                {isUserFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.messageButton, { borderColor: mainColor }]}
            onPress={handleMessageUser}
          >
            <Text style={[styles.messageButtonText, { color: mainColor }]}>Message</Text>
          </TouchableOpacity>
        </View>
        
        {/* Featured Posts Section */}
        <View style={styles.postsSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Featured Posts</Text>
          
          <View style={styles.emptyState}>
            <FeatherIcon 
              name="image" 
              size={40} 
              color={subTextColor} 
            />
            <Text style={[styles.emptyText, { color: subTextColor }]}>
              No posts to display yet
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  profileHeader: {
    padding: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileInfo: {
    marginTop: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  username: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 12,
  },
  bio: {
    ...defaultTextStyle,
    fontSize: 14,
    lineHeight: 20,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  followButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  followButtonText: {
    ...defaultTextStyle,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 10,
  },
  messageButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    padding: 20,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 8,
  },
  loadingText: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  errorText: {
    ...defaultTextStyle,
    fontSize: 16,
  },
});

export default ViewUserProfileScreen; 