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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../styles/themeprovider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/NavigationTypes';

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
}

type ViewUserProfileRouteProp = RouteProp<RootStackParamList, 'ViewUserProfileScreen'>;

const ViewUserProfileScreen: React.FC = () => {
  const route = useRoute<ViewUserProfileRouteProp>();
  const { username } = route.params;
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation();
  
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
    // Simulate fetching user data
    // In a real app, you would fetch this from your API/Firebase
    const mockUserData: UserProfileData = {
      username: username,
      displayName: username.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
      bio: 'Fashion enthusiast and style curator. Sharing inspiration and trends.',
      followers: Math.floor(Math.random() * 9000) + 1000,
      following: Math.floor(Math.random() * 500) + 100,
      posts: Math.floor(Math.random() * 50) + 5,
      verified: Math.random() > 0.7,
      avatarUrl: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 99)}.jpg`
    };
    
    // Simulate network delay
    setTimeout(() => {
      setUserData(mockUserData);
      setLoading(false);
    }, 500);
  }, [username]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatNumber(userData.followers)}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Followers
            </Text>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>
              {formatNumber(userData.following)}
            </Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>
              Following
            </Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.followButton, { backgroundColor: mainColor }]}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.messageButton, { borderColor: mainColor }]}
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
    marginBottom: 16,
  },
  profileInfo: {},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  username: {
    ...defaultTextStyle,
    fontSize: 16,
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
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
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
    color: '#FFFFFF',
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
    paddingBottom: 40,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...defaultTextStyle,
    fontSize: 16,
    marginTop: 12,
  },
  loadingText: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  errorText: {
    ...defaultTextStyle,
    fontSize: 16,
    color: 'red',
  },
});

export default ViewUserProfileScreen; 