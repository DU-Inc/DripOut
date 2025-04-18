import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import {
  UserProfile,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  isFollowing,
} from '../services/firestoreService';
import auth from '@react-native-firebase/auth';

type SocialNavigationProp = StackNavigationProp<SocialStackParamList>;

const SuggestedUserItem: React.FC<{
  user: UserProfile;
  onViewProfile: () => void;
  onToggleFollow: () => void;
  isFollowing: boolean;
  followLoading: boolean;
  isDarkMode: boolean;
}> = ({ user, onViewProfile, onToggleFollow, isFollowing: isFollowingUser, followLoading, isDarkMode }) => {
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
      
      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowingUser ? 'transparent' : mainColor,
            borderWidth: isFollowingUser ? 1 : 0,
            borderColor: mainColor,
          },
        ]}
        onPress={onToggleFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={isFollowingUser ? mainColor : 'white'} />
        ) : (
          <Text
            style={[
              styles.followButtonText,
              { color: isFollowingUser ? mainColor : 'white' },
            ]}
          >
            {isFollowingUser ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const SuggestedUsersScreen: React.FC = () => {
  const navigation = useNavigation<SocialNavigationProp>();
  const { isDarkMode } = useTheme();
  const currentUser = auth().currentUser;
  
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
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
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const users = await getSuggestedUsers(currentUser.uid, 20);
      setSuggestedUsers(users);
      
      // Check following status for each user
      const followStatusMap: Record<string, boolean> = {};
      for (const user of users) {
        if (user.userID) {
          followStatusMap[user.userID] = await isFollowing(currentUser.uid, user.userID);
        }
      }
      setFollowingMap(followStatusMap);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      Alert.alert('Error', 'Failed to load suggested users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuggestedUsers();
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
          Suggested Users
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Description */}
      <View style={[styles.descriptionContainer, { borderBottomColor: borderColor }]}>
        <Text style={[styles.descriptionText, { color: subTextColor }]}>
          Find new people to follow based on your interests and connections.
        </Text>
      </View>
      
      {/* Suggested Users List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Finding users for you...
          </Text>
        </View>
      ) : (
        <FlatList
          data={suggestedUsers}
          keyExtractor={(item) => item.userID}
          renderItem={({ item }) => (
            <SuggestedUserItem
              user={item}
              onViewProfile={() => handleViewProfile(item.username)}
              onToggleFollow={() => handleToggleFollow(item)}
              isFollowing={followingMap[item.userID] || false}
              followLoading={loadingFollowMap[item.userID] || false}
              isDarkMode={isDarkMode}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={60} color={subTextColor} />
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                No suggestions available
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
  descriptionContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    padding: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
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

export default SuggestedUsersScreen; 