// src/screens/SearchScreen.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../styles/theme/ThemeContext';
import Fuse from 'fuse.js';
import { searchUsers, getUserProfileByUsername, UserProfile } from '../services/firestoreService';
import { auth } from '../Config/firebaseconfig';
import { getFollowCounts } from '../services/followService';

// Define interfaces for app data
interface User {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  profileImage: string;
  isVerified?: boolean;
  followers?: number;
  following?: number;
}

interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  caption: string;
  imageUrl: string;
  tags: string[];
  likes: number;
  comments: number;
}

interface Tag {
  id: string;
  name: string;
  postCount: number;
}

// Interface for previous search results
interface PreviousSearch {
  query: string;
  timestamp: number;
  users: User[];
  posts: Post[];
  tags: Tag[];
}

// Default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

// Generate fashion posts similar to the SocialScreen - KEEPING MOCK POSTS FOR NOW
// These would be replaced with Firestore data in a complete implementation
const FASHION_POSTS = Array.from({ length: 6 }).map((_, i) => {
  // Different styling notes & captions
  const captions = [
    'Streamlined silhouettes with monochromatic color blocking create visual interest while maintaining a clean aesthetic. Focus on premium fabrics and perfect fit.',
    'Blending contemporary elements with classic vintage pieces for a timeless yet fresh look. The contrast between old and new creates unique visual interest.',
    'Soft draping combined with architectural lines creates a balanced silhouette that\'s both refined and comfortable for everyday wear.',
    'Reimagining wardrobe essentials with premium materials and subtle design details. The beauty is in the precision of construction and quality of materials.',
    'Technical fabrics and functional details combined with thoughtful layering for a look that transitions seamlessly between activities.',
    'Environmentally conscious design choices featuring organic materials and ethical production methods, without compromising on style or quality.'
  ];
  
  // Tags for each post
  const postTags = [
    ['minimalism', 'monochrome', 'essentials', 'quality'],
    ['vintage', 'retro', 'reuse', 'timeless'],
    ['classic', 'tailored', 'structured', 'refined'],
    ['scandinavian', 'nordic', 'clean', 'functional'],
    ['techwear', 'urban', 'performance', 'innovative'],
    ['sustainable', 'ethical', 'conscious', 'eco']
  ];

  return {
    id: i.toString(),
    userId: `user_${i}`,
    username: [
      'grace_style', 
      'fashion_guru', 
      'trend_watcher', 
      'clothescritic', 
      'runway_fan', 
      'style_seeker'
    ][i] || 'user',
    userAvatar: `https://i.pravatar.cc/150?u=${i}`,
    caption: captions[i],
    imageUrl: `https://picsum.photos/800/1000?random=${i * 3 + 51}`,
    tags: postTags[i],
    likes: Math.floor(Math.random() * 500) + 100,
    comments: Math.floor(Math.random() * 100) + 10
  };
});

// Extract all tags from posts and create a Tag array with counts
const UNIQUE_TAGS: Tag[] = Array.from(
  new Set(
    FASHION_POSTS.flatMap(post => post.tags)
  )
).map(tag => ({
  id: `tag_${tag}`,
  name: tag,
  postCount: FASHION_POSTS.filter(post => 
    post.tags.includes(tag)
  ).length
}));

// Search screen component
const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // References for search instances (for post and tag searches which still use mock data)
  const postSearchRef = useRef<Fuse<Post>>();
  const tagSearchRef = useRef<Fuse<Tag>>();
  
  // Search results
  const [firebaseUsers, setFirebaseUsers] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Fuse.FuseResult<Post>[]>([]);
  const [tagResults, setTagResults] = useState<Fuse.FuseResult<Tag>[]>([]);
  
  // User display data with follow counts
  const [userDisplayData, setUserDisplayData] = useState<User[]>([]);
  
  // Previous search results stored for display on the main screen
  const [previousSearches, setPreviousSearches] = useState<PreviousSearch[]>([]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Theme colors
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const surfaceColor = isDarkMode ? '#222232' : '#F5F5F5';
  const inputBgColor = isDarkMode ? '#1E1E2E' : '#F2F2F2';
  
  // Initialize search instances for posts and tags (still using mock data)
  useEffect(() => {
    postSearchRef.current = new Fuse(FASHION_POSTS, {
      keys: ['caption', 'tags', 'username'],
      threshold: 0.3,
      includeScore: true
    });
    
    tagSearchRef.current = new Fuse(UNIQUE_TAGS, {
      keys: ['name'],
      threshold: 0.3,
      includeScore: true
    });
    
    // Animate screen fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true
    }).start();
    
    // Load recent searches from AsyncStorage
    loadRecentSearches();
    
    return () => {
      // Clean up animation
      fadeAnim.setValue(0);
    };
  }, []);
  
  // Process Firestore user data into display format
  useEffect(() => {
    const processUserData = async () => {
      if (firebaseUsers.length === 0) return;
      
      try {
        const usersWithCounts = await Promise.all(
          firebaseUsers.map(async (user) => {
            // Default placeholder image if no profile picture
            const profileImageUrl = user.profilePictureURL || 'https://i.pravatar.cc/150?u=default';
            
            // Get follow counts from Firestore (if service exists)
            let followerCount = 0;
            let followingCount = 0;
            try {
              const counts = await getFollowCounts(user.userID);
              followerCount = counts.followers;
              followingCount = counts.following;
            } catch (error) {
              console.log('Error fetching follow counts:', error);
            }
            
            return {
              id: user.userID,
              username: user.username,
              displayName: user.userDisplayName || user.fullName || '',
              bio: user.bio || '',
              profileImage: profileImageUrl,
              isVerified: user.isVerified || false,
              followers: followerCount,
              following: followingCount
            };
          })
        );
        
        setUserDisplayData(usersWithCounts);
      } catch (error) {
        console.error('Error processing user data:', error);
      }
    };
    
    processUserData();
  }, [firebaseUsers]);
  
  // Perform search when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Clear results when search is empty
      setFirebaseUsers([]);
      setPostResults([]);
      setTagResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Short delay for better UX
    const searchTimeout = setTimeout(async () => {
      try {
        // Real Firebase user search
        const users = await searchUsers(searchQuery);
        setFirebaseUsers(users);
        
        // Mock post search (would be replaced with Firestore implementation)
        if (postSearchRef.current) {
          const posts = postSearchRef.current.search(searchQuery);
          setPostResults(posts);
        }
        
        // Mock tag search (would be replaced with Firestore implementation)
        if (tagSearchRef.current) {
          const tags = tagSearchRef.current.search(searchQuery);
          setTagResults(tags);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);
  
  // Save search results after they're loaded
  useEffect(() => {
    // Only save when we have search results and we're not still searching
    if (searchQuery.trim() !== '' && !isSearching && hasResults) {
      console.log('Saving search results for:', searchQuery);
      // Use setTimeout to ensure all state updates have completed
      setTimeout(() => {
        savePreviousSearchResults();
      }, 500);
    }
  }, [isSearching, hasResults, searchQuery, userDisplayData, postResults, tagResults]);
  
  // Load recent searches from AsyncStorage with user-specific key
  const loadRecentSearches = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;
      
      // Use user-specific key to prevent cross-account contamination
      const userId = currentUser.uid;
      const recentSearchesKey = `recentSearches_${userId}`;
      const previousSearchesKey = `previousSearchResults_${userId}`;
      
      const savedSearches = await AsyncStorage.getItem(recentSearchesKey);
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
      
      // Load previous search results with full data
      const savedPreviousSearches = await AsyncStorage.getItem(previousSearchesKey);
      if (savedPreviousSearches) {
        setPreviousSearches(JSON.parse(savedPreviousSearches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };
  
  // Save previous search results with the complete result data
  const savePreviousSearchResults = async () => {
    if (!searchQuery.trim() || !hasResults) {
      console.log('Not saving search results - Empty query or no results');
      return;
    }
    
    try {
      console.log('Starting to save previous search results');
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('No current user found, cannot save results');
        return;
      }
      
      const userId = currentUser.uid;
      const previousSearchesKey = `previousSearchResults_${userId}`;
      
      // Create a new previous search object
      const newPreviousSearch: PreviousSearch = {
        query: searchQuery,
        timestamp: Date.now(),
        users: userDisplayData,
        posts: postResults.map(result => result.item),
        tags: tagResults.map(result => result.item)
      };
      
      console.log('New previous search object created with:', {
        query: newPreviousSearch.query,
        users: newPreviousSearch.users.length,
        posts: newPreviousSearch.posts.length,
        tags: newPreviousSearch.tags.length
      });
      
      // Update state with new search at the beginning - don't filter out existing to allow duplicates 
      // which will make the recents more visible and testable
      const updatedPreviousSearches = [
        newPreviousSearch,
        ...previousSearches
      ].slice(0, 10); // Keep more results (up to 10) to make testing easier
      
      console.log('Setting previous searches state with', updatedPreviousSearches.length, 'items');
      setPreviousSearches(updatedPreviousSearches);
      
      // Save to AsyncStorage immediately
      await AsyncStorage.setItem(previousSearchesKey, JSON.stringify(updatedPreviousSearches));
      console.log('Saved previous searches to AsyncStorage');
      
      // Also add to recent searches for faster lookups
      saveSearchQuery(searchQuery);
    } catch (error) {
      console.error('Error saving previous search results:', error);
    }
  };
  
  // Save search query to recent searches with user-specific key
  const saveSearchQuery = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;
      
      // Use user-specific key to prevent cross-account contamination
      const userId = currentUser.uid;
      const recentSearchesKey = `recentSearches_${userId}`;
      
      // Add to front, remove duplicates, limit to 10
      const updatedSearches = [
        query, 
        ...recentSearches.filter(item => item !== query)
      ].slice(0, 10);
      
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem(recentSearchesKey, JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };
  
  // Clear recent searches with user-specific key
  const clearRecentSearches = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;
      
      // Use user-specific key to prevent cross-account contamination
      const userId = currentUser.uid;
      const recentSearchesKey = `recentSearches_${userId}`;
      
      setRecentSearches([]);
      await AsyncStorage.removeItem(recentSearchesKey);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };
  
  // Handle user selection
  const handleUserSelect = (user: User) => {
    console.log('User selected:', user.username);
    saveSearchQuery(user.username);
    
    // For demo purposes, also save it to previousSearches if not coming from a previous search
    if (!previousSearches.some(ps => ps.query === user.username)) {
      const mockPreviousSearch: PreviousSearch = {
        query: user.username,
        timestamp: Date.now(),
        users: [user],
        posts: [],
        tags: []
      };
      
      const updatedPreviousSearches = [
        mockPreviousSearch,
        ...previousSearches
      ].slice(0, 5);
      
      setPreviousSearches(updatedPreviousSearches);
      
      // Also save to AsyncStorage
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userId = currentUser.uid;
        const previousSearchesKey = `previousSearchResults_${userId}`;
        AsyncStorage.setItem(previousSearchesKey, JSON.stringify(updatedPreviousSearches));
      }
    }
    
    navigation.navigate('UserDetailScreen', { 
      userId: user.id, 
      username: user.username 
    });
  };
  
  // Handle post selection
  const handlePostSelect = (post: Post) => {
    // In a real app, we'd navigate to the post detail
    // For now, we'll just save the search and show an alert
    const postSearchTerm = post.caption.substring(0, 20) + '...';
    console.log('Post selected:', postSearchTerm);
    saveSearchQuery(postSearchTerm);
    
    // For demo purposes, also save it to previousSearches
    if (!previousSearches.some(ps => ps.query === postSearchTerm)) {
      const mockPreviousSearch: PreviousSearch = {
        query: postSearchTerm,
        timestamp: Date.now(),
        users: [],
        posts: [post],
        tags: []
      };
      
      const updatedPreviousSearches = [
        mockPreviousSearch,
        ...previousSearches
      ].slice(0, 5);
      
      setPreviousSearches(updatedPreviousSearches);
      
      // Also save to AsyncStorage
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userId = currentUser.uid;
        const previousSearchesKey = `previousSearchResults_${userId}`;
        AsyncStorage.setItem(previousSearchesKey, JSON.stringify(updatedPreviousSearches));
      }
    }
    
    Alert.alert('Post Selected', `Viewing post by ${post.username}`);
  };
  
  // Handle tag selection
  const handleTagSelect = (tag: Tag) => {
    console.log('Tag selected:', tag.name);
    saveSearchQuery(tag.name);
    
    // For demo purposes, also save it to previousSearches
    if (!previousSearches.some(ps => ps.query === tag.name)) {
      const mockPreviousSearch: PreviousSearch = {
        query: tag.name,
        timestamp: Date.now(),
        users: [],
        posts: [],
        tags: [tag]
      };
      
      const updatedPreviousSearches = [
        mockPreviousSearch,
        ...previousSearches
      ].slice(0, 5);
      
      setPreviousSearches(updatedPreviousSearches);
      
      // Also save to AsyncStorage
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userId = currentUser.uid;
        const previousSearchesKey = `previousSearchResults_${userId}`;
        AsyncStorage.setItem(previousSearchesKey, JSON.stringify(updatedPreviousSearches));
      }
    }
    
    Alert.alert('Tag Selected', `Viewing posts with tag #${tag.name}`);
  };
  
  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      saveSearchQuery(searchQuery);
      Keyboard.dismiss();
      
      // Auto-select the tab with most results
      const resultCounts = {
        accounts: userDisplayData.length,
        posts: postResults.length,
        tags: tagResults.length
      };
      
      const maxCategory = Object.entries(resultCounts)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      
      setActiveTab(maxCategory);
      
      // Save the search results for later display
      savePreviousSearchResults();
    }
  };
  
  // Render user item
  const renderUserItem = ({ item }: { item: User }) => {
    return (
      <TouchableOpacity 
        style={styles.userItem}
        activeOpacity={0.7}
        onPress={() => handleUserSelect(item)}
      >
        <Image 
          source={{ uri: item.profileImage }} 
          style={styles.userAvatar} 
        />
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.username, { color: textColor }]}>
              {item.username}
            </Text>
            {item.isVerified && (
              <Icon name="checkmark-circle" size={14} color="#0095F6" style={styles.verifiedBadge} />
            )}
          </View>
          <Text style={[styles.displayName, { color: subTextColor }]} numberOfLines={1}>
            {item.displayName || ''}
          </Text>
          <Text style={[styles.followersText, { color: subTextColor }]}>
            {item.followers?.toLocaleString() || 0} followers
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render post item
  const renderPostItem = ({ item }: { item: Fuse.FuseResult<Post> }) => {
    const post = item.item;
    return (
      <TouchableOpacity 
        style={styles.postItem}
        activeOpacity={0.7}
        onPress={() => handlePostSelect(post)}
      >
        <Image 
          source={{ uri: post.imageUrl }} 
          style={styles.postImage} 
        />
        <View style={styles.postInfo}>
          <View style={styles.postHeader}>
            <Image 
              source={{ uri: post.userAvatar }} 
              style={styles.postUserAvatar} 
            />
            <Text style={[styles.postUsername, { color: textColor }]}>
              {post.username}
            </Text>
          </View>
          <Text style={[styles.postCaption, { color: subTextColor }]} numberOfLines={2}>
            {post.caption}
          </Text>
          <View style={styles.postStats}>
            <View style={styles.postStat}>
              <Icon name="heart" size={12} color={subTextColor} />
              <Text style={[styles.postStatText, { color: subTextColor }]}>
                {post.likes}
              </Text>
            </View>
            <View style={styles.postStat}>
              <Icon name="chatbubble" size={12} color={subTextColor} />
              <Text style={[styles.postStatText, { color: subTextColor }]}>
                {post.comments}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render tag item
  const renderTagItem = ({ item }: { item: Fuse.FuseResult<Tag> }) => {
    const tag = item.item;
    return (
      <TouchableOpacity 
        style={[styles.tagItem, { backgroundColor: inputBgColor }]}
        activeOpacity={0.7}
        onPress={() => handleTagSelect(tag)}
      >
        <View style={[styles.tagIconContainer, { backgroundColor: mainColor }]}>
          <FeatherIcon name="hash" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.tagInfo}>
          <Text style={[styles.tagName, { color: textColor }]}>
            #{tag.name}
          </Text>
          <Text style={[styles.tagPostCount, { color: subTextColor }]}>
            {tag.postCount} {tag.postCount === 1 ? 'post' : 'posts'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render recent search item
  const renderRecentSearchItem = ({ item }: { item: string }) => {
    return (
      <TouchableOpacity 
        style={styles.recentSearchItem}
        onPress={() => setSearchQuery(item)}
      >
        <View style={styles.recentSearchLeft}>
          <Icon name="time-outline" size={20} color={subTextColor} />
          <Text style={[styles.recentSearchText, { color: textColor }]}>
            {item}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.recentSearchRemove}
          onPress={() => {
            const updated = recentSearches.filter(search => search !== item);
            setRecentSearches(updated);
            
            const currentUser = auth().currentUser;
            if (currentUser) {
              const userId = currentUser.uid;
              const recentSearchesKey = `recentSearches_${userId}`;
              AsyncStorage.setItem(recentSearchesKey, JSON.stringify(updated));
            }
          }}
        >
          <Icon name="close" size={18} color={subTextColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  // Render previous search section
  const renderPreviousSearchSection = ({ item }: { item: PreviousSearch }) => {
    const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    
    // Helper function to get the most relevant results
    const getTopResults = () => {
      // Determine which category has the most items
      const counts = {
        users: item.users.length,
        posts: item.posts.length,
        tags: item.tags.length
      };
      
      const maxCategory = Object.entries(counts)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      
      // Return the appropriate items
      switch (maxCategory) {
        case 'users':
          return (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previousResultsRow}
            >
              {item.users.slice(0, 5).map((user, index) => (
                <TouchableOpacity 
                  key={`ps-user-${user.id}-${index}`}
                  style={styles.previousResultItem}
                  onPress={() => handleUserSelect(user)}
                >
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={styles.previousResultImage} 
                  />
                  <Text style={[styles.previousResultName, { color: textColor }]} numberOfLines={1}>
                    {user.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          );
        case 'posts':
          return (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previousResultsRow}
            >
              {item.posts.slice(0, 5).map((post, index) => (
                <TouchableOpacity 
                  key={`ps-post-${post.id}-${index}`}
                  style={styles.previousResultItem}
                  onPress={() => handlePostSelect(post)}
                >
                  <Image 
                    source={{ uri: post.imageUrl }} 
                    style={styles.previousResultImage} 
                  />
                  <Text style={[styles.previousResultName, { color: textColor }]} numberOfLines={1}>
                    @{post.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          );
        case 'tags':
          return (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.previousResultsRow}
            >
              {item.tags.slice(0, 8).map((tag, index) => (
                <TouchableOpacity 
                  key={`ps-tag-${tag.id}-${index}`}
                  style={[styles.previousTagItem, { backgroundColor: surfaceColor }]}
                  onPress={() => handleTagSelect(tag)}
                >
                  <Text style={[styles.previousTagText, { color: textColor }]}>
                    #{tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          );
        default:
          return null;
      }
    };
    
    return (
      <View style={[styles.previousSearchSection, { borderBottomColor: borderColor }]}>
        <View style={styles.previousSearchHeader}>
          <View>
            <Text style={[styles.previousSearchQuery, { color: textColor }]}>
              "{item.query}"
            </Text>
            <Text style={[styles.previousSearchDate, { color: subTextColor }]}>
              {formattedDate}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.searchAgainButton, { backgroundColor: mainColor }]}
            onPress={() => setSearchQuery(item.query)}
          >
            <Text style={styles.searchAgainText}>Search Again</Text>
          </TouchableOpacity>
        </View>
        
        {getTopResults()}
      </View>
    );
  };
  
  // Calculate result counts for tabs
  const resultCounts = {
    accounts: userDisplayData.length,
    posts: postResults.length,
    tags: tagResults.length
  };
  
  // Determine if we have any results
  const hasResults = userDisplayData.length > 0 || postResults.length > 0 || tagResults.length > 0;
  
  // Show recents when no search or no results
  const showRecents = searchQuery.trim() === '' || !hasResults;
  
  // For debugging
  console.log('Previous searches count:', previousSearches.length);
  console.log('Show recents:', showRecents);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Search Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.searchContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          
          <View style={[styles.searchInputContainer, { backgroundColor: inputBgColor }]}>
            <Icon name="search" size={20} color={subTextColor} style={styles.searchIcon} />
            <TextInput 
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search"
              placeholderTextColor={subTextColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Icon name="close-circle" size={18} color={subTextColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Tabs - Only show when we have search query */}
        {searchQuery.trim() !== '' && hasResults && (
          <View style={styles.tabsContainer}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollView}
            >
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'accounts' && styles.activeTab,
                  activeTab === 'accounts' && { borderBottomColor: mainColor }
                ]}
                onPress={() => setActiveTab('accounts')}
              >
                <Text 
                  style={[
                    styles.tabText, 
                    { color: activeTab === 'accounts' ? mainColor : subTextColor }
                  ]}
                >
                  Accounts
                  {resultCounts.accounts > 0 && ` (${resultCounts.accounts})`}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'posts' && styles.activeTab,
                  activeTab === 'posts' && { borderBottomColor: mainColor }
                ]}
                onPress={() => setActiveTab('posts')}
              >
                <Text 
                  style={[
                    styles.tabText, 
                    { color: activeTab === 'posts' ? mainColor : subTextColor }
                  ]}
                >
                  Posts
                  {resultCounts.posts > 0 && ` (${resultCounts.posts})`}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'tags' && styles.activeTab,
                  activeTab === 'tags' && { borderBottomColor: mainColor }
                ]}
                onPress={() => setActiveTab('tags')}
              >
                <Text 
                  style={[
                    styles.tabText, 
                    { color: activeTab === 'tags' ? mainColor : subTextColor }
                  ]}
                >
                  Tags
                  {resultCounts.tags > 0 && ` (${resultCounts.tags})`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
      
      {/* Main Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Loading Indicator */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={mainColor} />
          </View>
        )}
        
        {/* Recent Searches */}
        {showRecents && (
          <ScrollView style={styles.recentContainer} showsVerticalScrollIndicator={false}>
            {/* Display recent search terms */}
            {recentSearches.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentTitle, { color: textColor }]}>
                    Recent Searches
                  </Text>
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text style={[styles.clearRecentText, { color: mainColor }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {recentSearches.slice(0, 5).map((item, index) => (
                  <View key={`recent-${index}`}>
                    {renderRecentSearchItem({ item })}
                  </View>
                ))}
              </View>
            )}
            
            {/* Display previous search results */}
            {previousSearches.length > 0 && (
              <View style={styles.previousSearchesContainer}>
                <Text style={[styles.previousSearchesTitle, { color: textColor }]}>
                  Previous Results
                </Text>
                
                {previousSearches.map((item, index) => (
                  <View key={`previous-${index}`}>
                    {renderPreviousSearchSection({ item })}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
        
        {/* No Results Message */}
        {searchQuery.trim() !== '' && !isSearching && !hasResults && (
          <View style={styles.emptyContainer}>
            <FeatherIcon name="search" size={50} color={subTextColor} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              No Results Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
              Try searching for a different term or check your spelling
            </Text>
          </View>
        )}
        
        {/* Search Results */}
        {searchQuery.trim() !== '' && hasResults && (
          <>
            {/* Accounts Tab */}
            {activeTab === 'accounts' && (
              <FlatList
                data={userDisplayData}
                renderItem={renderUserItem}
                keyExtractor={(item) => `user-${item.id}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyTitle, { color: textColor }]}>
                      No matching users found
                    </Text>
                  </View>
                )}
              />
            )}
            
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <FlatList
                data={postResults}
                renderItem={renderPostItem}
                keyExtractor={(item) => `post-${item.item.id}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            )}
            
            {/* Tags Tab */}
            {activeTab === 'tags' && (
              <FlatList
                data={tagResults}
                renderItem={renderTagItem}
                keyExtractor={(item) => `tag-${item.item.id}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            )}
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...defaultTextStyle,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  tabsContainer: {
    height: 40,
  },
  tabsScrollView: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  recentContainer: {
    flex: 1,
    padding: 16,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  clearRecentText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentSearchText: {
    ...defaultTextStyle,
    fontSize: 15,
    marginLeft: 12,
  },
  recentSearchRemove: {
    padding: 8,
  },
  // Previous search styles
  previousSearchesContainer: {
    marginTop: 10,
  },
  previousSearchesTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  previousSearchSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  previousSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previousSearchQuery: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  previousSearchDate: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  searchAgainButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  searchAgainText: {
    ...defaultTextStyle,
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  previousResultsRow: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  previousResultItem: {
    marginRight: 12,
    width: 80,
    alignItems: 'center',
  },
  previousResultImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 4,
  },
  previousResultName: {
    ...defaultTextStyle,
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  previousTagItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  previousTagText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
  },
  resultsList: {
    padding: 16,
  },
  
  // User item styles
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  displayName: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 2,
  },
  followersText: {
    ...defaultTextStyle,
    fontSize: 13,
    marginTop: 4,
  },
  
  // Post item styles
  postItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  postImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: 6,
  },
  postInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  postUsername: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  postCaption: {
    ...defaultTextStyle,
    fontSize: 13,
    lineHeight: 18,
  },
  postStats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  postStatText: {
    ...defaultTextStyle,
    fontSize: 12,
    marginLeft: 4,
  },
  
  // Tag item styles
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  tagIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tagInfo: {
    flex: 1,
  },
  tagName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  tagPostCount: {
    ...defaultTextStyle,
    fontSize: 13,
    marginTop: 2,
  },
});

export default SearchScreen;