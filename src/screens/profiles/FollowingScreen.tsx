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
  getFollowingProfiles,
  UserProfile,
  unfollowUser,
} from '../../services/firestoreService';
import auth from '@react-native-firebase/auth';

type FollowingScreenRouteProp = RouteProp<SocialStackParamList, 'Following'>;
type SocialNavigationProp = StackNavigationProp<SocialStackParamList>;

interface FollowingItemProps {
  user: UserProfile;
  isCurrentUser: boolean;
  onViewProfile: () => void;
  onUnfollow: () => void;
  unfollowLoading: boolean;
}

const FollowingItem: React.FC<FollowingItemProps> = ({
  user,
  isCurrentUser,
  onViewProfile,
  onUnfollow,
  unfollowLoading,
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
      
      {isCurrentUser && (
        <TouchableOpacity
          style={[
            styles.unfollowButton,
            {
              borderColor: mainColor,
            },
          ]}
          onPress={onUnfollow}
          disabled={unfollowLoading}
        >
          {unfollowLoading ? (
            <ActivityIndicator size="small" color={mainColor} />
          ) : (
            <Text
              style={[
                styles.unfollowButtonText,
                { color: mainColor },
              ]}
            >
              Following
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const FollowingScreen: React.FC = () => {
  const route = useRoute<FollowingScreenRouteProp>();
  const { username, userId } = route.params;
  const navigation = useNavigation<SocialNavigationProp>();
  const { isDarkMode } = useTheme();
  const currentUser = auth().currentUser;
  
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unfollowLoadingMap, setUnfollowLoadingMap] = useState<Record<string, boolean>>({});
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  useEffect(() => {
    fetchFollowing();
  }, [userId]);

  const fetchFollowing = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const followingData = await getFollowingProfiles(userId);
      setFollowing(followingData);
    } catch (error) {
      console.error('Error fetching following:', error);
      Alert.alert('Error', 'Failed to load following users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFollowing();
  };
  
  const handleViewProfile = (username: string) => {
    navigation.navigate('ViewUserProfile', { username });
  };
  
  const handleUnfollow = async (user: UserProfile) => {
    if (!currentUser || !user.userID || userId !== currentUser.uid) return;
    
    setUnfollowLoadingMap(prev => ({ ...prev, [user.userID]: true }));
    
    try {
      await unfollowUser(currentUser.uid, user.userID);
      
      // Remove the user from the following list
      setFollowing(prev => prev.filter(item => item.userID !== user.userID));
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user');
    } finally {
      setUnfollowLoadingMap(prev => ({ ...prev, [user.userID]: false }));
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
          {username}'s Following
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Following List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading following...
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.userID}
          renderItem={({ item }) => (
            <FollowingItem
              user={item}
              isCurrentUser={currentUser?.uid === userId}
              onViewProfile={() => handleViewProfile(item.username)}
              onUnfollow={() => handleUnfollow(item)}
              unfollowLoading={unfollowLoadingMap[item.userID] || false}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={60} color={subTextColor} />
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                Not following anyone yet
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
  unfollowButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  unfollowButtonText: {
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

export default FollowingScreen; 