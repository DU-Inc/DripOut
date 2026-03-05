import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import { followService, UserPreview } from '../../services/followService';
import { RootStackParamList } from '../../types/NavigationTypes';

type FollowersFollowingScreenRouteProp = RouteProp<
  RootStackParamList,
  'FollowersFollowingScreen'
>;

type FollowersFollowingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FollowersFollowingScreen'
>;

const FollowersFollowingScreen: React.FC = () => {
  const route = useRoute<FollowersFollowingScreenRouteProp>();
  const navigation = useNavigation<FollowersFollowingScreenNavigationProp>();
  const { isDarkMode } = useTheme();

  // Get parameters from route
  const { initialTab = 'followers', userId } = route.params || {};

  // State
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<UserPreview[]>([]);
  const [following, setFollowing] = useState<UserPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A3A' : '#E5E5EA';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';

  // Fetch followers data
  const fetchFollowers = useCallback(async () => {
    try {
      console.log('Fetching followers for userId:', userId);
      const followersData = await followService.getFollowersWithProfile(userId);
      console.log('Fetched followers data:', followersData);
      setFollowers(followersData || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      setError('Failed to load followers');
    }
  }, [userId]);

  // Fetch following data
  const fetchFollowing = useCallback(async () => {
    try {
      console.log('Fetching following for userId:', userId);
      const followingData = await followService.getFollowingWithProfile(userId);
      console.log('Fetched following data:', followingData);
      setFollowing(followingData || []);
    } catch (error) {
      console.error('Error fetching following:', error);
      setError('Failed to load following');
    }
  }, [userId]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([fetchFollowers(), fetchFollowing()]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFollowers, fetchFollowing]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle user press
  const handleUserPress = useCallback((user: UserPreview) => {
    navigation.navigate('UserDetailScreen', {
      userId: user.id,
      username: user.username
    });
  }, [navigation]);

  // Get user initials
  const getUserInitials = useCallback((user: UserPreview): string => {
    if (user.userDisplayName) {
      return user.userDisplayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    } else if (user.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    } else if (user.username) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  }, []);

  // Render user item
  const renderUserItem = useCallback(({ item }: { item: UserPreview }) => {
    const initials = getUserInitials(item);
    
    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: cardBgColor, borderBottomColor: borderColor }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {item.profilePictureURL ? (
          <Image
            source={{ uri: item.profilePictureURL }}
            style={styles.profilePicture}
            defaultSource={{ uri: 'https://via.placeholder.com/50/CCCCCC/FFFFFF?text=U' }}
            onError={() => console.log('Failed to load profile picture for:', item.username)}
          />
        ) : (
          <View style={[styles.initialsContainer, { backgroundColor: mainColor }]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text
            style={[styles.displayName, { color: textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.userDisplayName || item.fullName || item.username}
          </Text>
          <Text
            style={[styles.username, { color: subTextColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            @{item.username}
          </Text>
        </View>
        <TouchableOpacity style={[styles.removeButton, { backgroundColor: subTextColor }]}>
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [cardBgColor, borderColor, textColor, subTextColor, mainColor, handleUserPress, getUserInitials]);

  // Get current data based on active tab
  const currentData = activeTab === 'followers' ? followers : following;

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Icon
        name={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'}
        size={64}
        color={subTextColor}
      />
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        No {activeTab}
      </Text>
      <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
        {activeTab === 'followers'
          ? "You don't have any followers yet"
          : "You're not following anyone yet"
        }
      </Text>
    </View>
  );

  // Render loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              Connections
            </Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              Loading connections...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Connections
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabContainer, { backgroundColor: cardBgColor, borderBottomColor: borderColor }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'followers' && { borderBottomColor: mainColor }
            ]}
            onPress={() => setActiveTab('followers')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'followers' ? mainColor : subTextColor }
            ]}>
              {followers.length} Followers
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'following' && { borderBottomColor: mainColor }
            ]}
            onPress={() => setActiveTab('following')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'following' ? mainColor : subTextColor }
            ]}>
              {following.length} Following
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {currentData.length > 0 ? (
          <FlatList
            data={currentData}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            key={`${activeTab}-list`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={mainColor}
                colors={[mainColor]}
              />
            }
          />
        ) : (
          renderEmptyState()
        )}

        {/* Error state */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: mainColor }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: mainColor }]}
              onPress={loadData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  initialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FollowersFollowingScreen; 
