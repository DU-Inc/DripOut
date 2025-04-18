import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../styles/themeprovider';
import {
  getFollowersProfiles,
  UserProfile,
  followUser,
  unfollowUser,
  isFollowing,
} from '../../services/firestoreService';
import auth from '@react-native-firebase/auth';

type FollowersScreenRouteProp = RouteProp<SocialStackParamList, 'Followers'>;
type SocialNavigationProp = StackNavigationProp<SocialStackParamList>;

interface FollowerItemProps {
  user: UserProfile;
  isCurrentUser: boolean;
  onViewProfile: () => void;
  onToggleFollow: () => void;
  isFollowingThisUser: boolean;
  followLoading: boolean;
}

const FollowerItem: React.FC<FollowerItemProps> = ({
  user,
  isCurrentUser,
  onViewProfile,
  onToggleFollow,
  isFollowingThisUser,
  followLoading,
}) => {
  const { isDarkMode } = useTheme();
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  return (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: cardBgColor, borderColor }]}
      onPress={onViewProfile}
      activeOpacity={0.7}
    >
      <Image 
        source={{ 
          uri: user.profilePictureURL || 
            `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99)}.jpg` 
        }} 
        style={styles.avatar} 
      />
      
      <View style={styles.userInfo}>
        <View style={styles.nameContainer}>
          <Text style={[styles.displayName, { color: textColor }]}>
            {user.userDisplayName || user.username}
          </Text>
          {user.isVerified && (
            <Icon name="checkmark-circle" size={14} color={mainColor} style={styles.verifiedIcon} />
          )}
        </View>
        <Text style={[styles.username, { color: subTextColor }]}>@{user.username}</Text>
      </View>
      
      {!isCurrentUser && (
        <TouchableOpacity
          style={[
            styles.followButton,
            {
              backgroundColor: isFollowingThisUser ? 'transparent' : mainColor,
              borderWidth: isFollowingThisUser ? 1 : 0,
              borderColor: mainColor,
            },
          ]}
          onPress={onToggleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowingThisUser ? mainColor : 'white'} />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                { color: isFollowingThisUser ? mainColor : 'white' },
              ]}
            >
              {isFollowingThisUser ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const FollowersScreen: React.FC = () => {
  const route = useRoute<FollowersScreenRouteProp>();
  const { username, userId } = route.params;
  const navigation = useNavigation<SocialNavigationProp>();
  const { isDarkMode } = useTheme();
  const currentUser = auth().currentUser;
  
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingFollowMap, setLoadingFollowMap] = useState<Record<string, boolean>>({});
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  const fetchFollowers = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const followersData = await getFollowersProfiles(userId);
      setFollowers(followersData);
      
      // Check which followers the current user is following
      if (currentUser) {
        const followStatusMap: Record<string, boolean> = {};
        
        for (const follower of followersData) {
          if (follower.userID) {
            followStatusMap[follower.userID] = await isFollowing(currentUser.uid, follower.userID);
          }
        }
        
        setFollowingMap(followStatusMap);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
      Alert.alert('Error', 'Failed to load followers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFollowers();
  };
  
  const handleViewProfile = (username: string) => {
    navigation.navigate('ViewUserProfile', { username });
  };
  
  const handleToggleFollow = async (user: UserProfile) => {
    if (!currentUser || !user.userID) return;
    
    setLoadingFollowMap(prev => ({ ...prev, [user.userID]: true }));
    
    try {
      const isCurrentlyFollowing = followingMap[user.userID] || false;
      
      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.uid, user.userID);
      } else {
        await followUser(currentUser.uid, user.userID);
      }
      
      // Update the following map
      setFollowingMap(prev => ({
        ...prev,
        [user.userID]: !isCurrentlyFollowing,
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setLoadingFollowMap(prev => ({ ...prev, [user.userID]: false }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={mainColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          {username}'s Followers
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Followers List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading followers...
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.userID}
          renderItem={({ item }) => (
            <FollowerItem
              user={item}
              isCurrentUser={currentUser?.uid === item.userID}
              onViewProfile={() => handleViewProfile(item.username)}
              onToggleFollow={() => handleToggleFollow(item)}
              isFollowingThisUser={followingMap[item.userID] || false}
              followLoading={loadingFollowMap[item.userID] || false}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={60} color={subTextColor} />
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                No followers yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  username: {
    fontSize: 14,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default FollowersScreen; 