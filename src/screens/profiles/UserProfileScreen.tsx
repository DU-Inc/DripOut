// src/screens/profiles/UserProfileScreen.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Modal, 
  TextInput, 
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
  Pressable,
  RefreshControl,
  Linking
} from 'react-native';
import { db, auth, Timestamp } from '../../Config/firebaseconfig';
import { createUserProfile, UserProfile, getUserPreferences, UserPreferences, setUserPreferences, propagateProfileUpdates } from '../../services/firestoreService';
import { getPostsByUser, Post } from '../../services/postService';
import { followUser, unfollowUser, isUserFollowing, getFollowCounts } from '../../services/followService';
import { takePhotoWithCamera, selectImageFromLibrary, ImageAsset } from '../../services/imagePickerService';
import { uploadImageAndGetURL } from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types/NavigationTypes';
// Firestore imported via db from config
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { appStateManager } from '../../utils/appStateManager';

// Cache keys and expiry time
// Using function to create user-specific cache keys
const getUserPostsCacheKey = (userId: string) => `user_posts_cache_${userId}`;
const getUserPostsTimestampKey = (userId: string) => `user_posts_cache_timestamp_${userId}`;
const getUserProfileCacheKey = (userId: string) => `user_profile_cache_${userId}`;
const getUserProfileTimestampKey = (userId: string) => `user_profile_cache_timestamp_${userId}`;
const getUserPrefsCacheKey = (userId: string) => `user_preferences_cache_${userId}`;
const getUserPrefsTimestampKey = (userId: string) => `user_preferences_cache_timestamp_${userId}`;
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

const { width, height } = Dimensions.get('window');

// Mock fashion inspiration boards (for style showcase)
const STYLE_BOARDS = [
  {
    id: '1',
    title: 'Minimalist Elegance',
    description: 'Clean lines, neutral tones, timeless pieces',
    image: 'https://images.unsplash.com/photo-1594633313515-7ad9334a2349?q=80&w=800&auto=format',
    items: 12
  },
  {
    id: '2',
    title: 'Street Style',
    description: 'Urban looks with bold statement pieces',
    image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=800&auto=format',
    items: 8
  },
  {
    id: '3',
    title: 'Casual Chic',
    description: 'Effortless style for everyday elegance',
    image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format',
    items: 15
  }
];

// We'll load saved outfits and favorite products from Firestore
// instead of using this mock data
// This comment is kept for reference

// Define interfaces for outfits and products
interface SavedOutfit {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  products: any[];
  createdAt: any;
}

interface FavoritedProduct {
  id: string;
  userId: string;
  name: string;
  brand: string;
  price: number | string;
  imageUrl: string;
  favorited: any;
  url?: string;
  productId?: string | null;
  description?: string;
}

// Add deduplication helper function
const removeDuplicates = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

const UserProfileScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Profile picture update state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'outfits' | 'styles'>('posts');
  const [loading, setLoading] = useState(true);
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
  const [editPreferencesData, setEditPreferencesData] = useState<UserPreferences | null>(null);
  const [selectedStyleBoard, setSelectedStyleBoard] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  
  // New states for saved outfits and favorite products
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoritedProduct[]>([]);
  const [outfitsLoading, setOutfitsLoading] = useState(true);
  
  // Follow related states
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // Deduplication logic for favorite products to fix duplicates
  const uniqueFavoriteProducts = useMemo(() => {
    const seen = new Set();
    return favoriteProducts.filter(product => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }, [favoriteProducts]);

  // Colors based on theme - using app's red theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const secondaryColor = isDarkMode ? '#FF6D8E' : '#FF3B5C'; // Red accent
  const accentColor = isDarkMode ? '#FF9F0A' : '#FF9500'; // Orange for contrast
  const surfaceColor = isDarkMode ? '#222232' : '#F5F5F5';
  const secondarySurfaceColor = isDarkMode ? '#2A2A38' : '#F0F0F5';
  
  // Animated values
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

  // Fetch user posts with caching
  const fetchPosts = useCallback(async (userId?: string, forceRefresh = false) => {
    try {
      if (!userId) {
        console.error('No userId provided to fetchPosts');
        setPostsLoading(false);
        return;
      }
      
      // Get user-specific cache keys
      const postsCacheKey = getUserPostsCacheKey(userId);
      const postsTimestampKey = getUserPostsTimestampKey(userId);
      
      console.log(`Fetching posts for user: ${userId}, cache key: ${postsCacheKey}`);
      
      // If not forcing refresh, try to get from cache first
      if (!forceRefresh) {
        try {
          const cachedTimestampStr = await AsyncStorage.getItem(postsTimestampKey);
          const cachedPostsStr = await AsyncStorage.getItem(postsCacheKey);
          
          if (cachedTimestampStr && cachedPostsStr) {
            const timestamp = parseInt(cachedTimestampStr);
      const now = Date.now();
            
            // If cache is less than expiry time old, use it
            if (now - timestamp < CACHE_EXPIRY_TIME) {
              const cachedPosts = JSON.parse(cachedPostsStr);
              setUserPosts(cachedPosts);
        setPostsLoading(false);
              console.log(`Using cached posts data for user ${userId}`);
        return;
            }
          }
        } catch (cacheError) {
          console.warn('Error reading from cache:', cacheError);
          // Continue with network fetch if cache read fails
        }
      }
      
      // Cache miss or forced refresh - fetch from network
      setPostsLoading(true);
      const posts = await getPostsByUser(userId);
      setUserPosts(posts);
      
      // Update cache with user-specific keys
      try {
        await AsyncStorage.setItem(postsCacheKey, JSON.stringify(posts));
        await AsyncStorage.setItem(postsTimestampKey, Date.now().toString());
        console.log(`Posts cache updated for user ${userId}`);
      } catch (cacheError) {
        console.warn('Error writing to cache:', cacheError);
        // Non-critical error, we can continue without caching
      }
      
      setPostsLoading(false);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setPostsLoading(false);
    }
  }, []);

  // Fetch saved outfits from Firestore
  const fetchSavedOutfits = useCallback(async (userId: string) => {
    setOutfitsLoading(true);
    try {
      console.log('Fetching saved outfits for user:', userId);
      // Query the saved_outfits collection for the current user using React Native Firebase
      const outfitsSnapshot = await db
        .collection("saved_outfits")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      
      if (outfitsSnapshot.empty) {
        console.log("No saved outfits found");
        setSavedOutfits([]);
      } else {
        // Map the documents to our data model
        const outfits: SavedOutfit[] = outfitsSnapshot.docs.map(doc => {
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
        
        console.log(`Retrieved ${outfits.length} saved outfits`);
        setSavedOutfits(outfits);
      }
    } catch (error) {
      console.error("Error fetching saved outfits:", error);
      setSavedOutfits([]);
    } finally {
      setOutfitsLoading(false);
    }
  }, []);

  // Fetch favorite products from Firestore
  const fetchFavoriteProducts = useCallback(async (userId: string) => {
    try {
      console.log('Fetching favorite products for user:', userId);
      // Query the user_favorite_products collection using React Native Firebase
      const favoritesSnapshot = await db
        .collection("user_favorite_products")
        .where("userId", "==", userId)
        .orderBy("favorited", "desc")
        .limit(10)
        .get();
      
      if (favoritesSnapshot.empty) {
        console.log("No favorite products found");
        setFavoriteProducts([]);
      } else {
        // Map the documents to our data model
        const favorites: FavoritedProduct[] = favoritesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            name: data.name || "Favorite Product",
            brand: data.brand || "Unknown Brand",
            price: data.price || 0,
            imageUrl: data.imageUrl || data.images?.[0] || "",
            favorited: data.favorited,
            url: data.url,
            productId: data.productId || null,
            description: data.description || null
          };
        });
        
        console.log(`Retrieved ${favorites.length} favorite products`);
        setFavoriteProducts(favorites);
      }
    } catch (error) {
      console.error("Error fetching favorite products:", error);
      setFavoriteProducts([]);
    }
  }, []);

  // Handle refresh with cache invalidation - using consolidated function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const user = auth().currentUser;
      if (user) {
        // Use consolidated function with force refresh
        await fetchAllUserData(user.uid, true);
        
        // Check follow status if viewing another user's profile
        if (profileUserId && user.uid !== profileUserId) {
          await checkFollowStatus(user.uid, profileUserId);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    setRefreshing(false);
  }, [fetchAllUserData, checkFollowStatus, profileUserId]);

  // Helper function to fetch and cache user preferences
  const fetchAndCachePreferences = useCallback(async (userId: string, forceRefresh = false) => {
    const prefsCacheKey = getUserPrefsCacheKey(userId);
    const prefsTimestampKey = getUserPrefsTimestampKey(userId);
    
    if (!forceRefresh) {
      try {
        // Try to get preferences from cache
        const cachedTimestampStr = await AsyncStorage.getItem(prefsTimestampKey);
        const cachedPrefsStr = await AsyncStorage.getItem(prefsCacheKey);
        
        if (cachedTimestampStr && cachedPrefsStr) {
          const timestamp = parseInt(cachedTimestampStr);
          const now = Date.now();
          
          // If cache is less than expiry time old, use it
          if (now - timestamp < CACHE_EXPIRY_TIME) {
            const cachedPrefs = JSON.parse(cachedPrefsStr);
            setPreferences(cachedPrefs);
            setEditPreferencesData(cachedPrefs);
            console.log(`Using cached preferences data for user ${userId}`);
            return;
          }
        }
      } catch (cacheError) {
        console.warn('Error reading preferences from cache:', cacheError);
      }
    }
    
    // Cache miss or forced refresh - fetch from network
    try {
      const userPrefs = await getUserPreferences(userId);
      if (userPrefs) {
        setPreferences(userPrefs);
        setEditPreferencesData(userPrefs);
        
        // Update cache
        try {
          await AsyncStorage.setItem(prefsCacheKey, JSON.stringify(userPrefs));
          await AsyncStorage.setItem(prefsTimestampKey, Date.now().toString());
          console.log(`Preferences cache updated for user ${userId}`);
        } catch (cacheError) {
          console.warn('Error writing preferences to cache:', cacheError);
        }
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  }, []);

  // Handle follow/unfollow action
  const handleFollowAction = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !profileUserId) {
        Alert.alert('Error', 'You need to be logged in to follow users');
        return;
      }

      if (currentUser.uid === profileUserId) {
        Alert.alert('Error', 'You cannot follow yourself');
        return;
      }

      setIsFollowLoading(true);

      if (isFollowing) {
        // Unfollow the user
        await unfollowUser(currentUser.uid, profileUserId);
        setIsFollowing(false);
        // Update follower count (optimistic update, will be refreshed on next fetch)
        setFollowCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        // Follow the user
        await followUser(currentUser.uid, profileUserId);
        setIsFollowing(true);
        // Update follower count (optimistic update, will be refreshed on next fetch)
        setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error handling follow action:', error);
      Alert.alert('Error', error.message || 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Check if current user follows the profile user
  const checkFollowStatus = useCallback(async (currentUserId: string, profileId: string) => {
    try {
      if (currentUserId === profileId) {
        // Don't check follow status if viewing own profile
        return;
      }
      const following = await isUserFollowing(currentUserId, profileId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  }, []);

  // Fetch follow counts
  const fetchFollowCounts = useCallback(async (userId: string) => {
    try {
      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  }, []);
  
  // Function to handle profile picture update
  const handleProfilePictureUpdate = () => {
    if (!profile) return;
    
    // Using imported Alert from react-native
    Alert.alert(
      'Update Profile Picture',
      'Choose a method to update your profile picture',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            console.log('Take Photo pressed');
            try {
              const image = await takePhotoWithCamera();
              console.log('Camera image result:', image);
              if (image) {
                uploadProfilePicture(image);
              }
            } catch (error) {
              console.error('Error taking photo:', error);
              Alert.alert('Error', 'Failed to take photo. Please try again.');
            }
          }
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            console.log('Choose from Library pressed');
            try {
              const image = await selectImageFromLibrary();
              console.log('Library image result:', image);
              if (image) {
                uploadProfilePicture(image);
              }
            } catch (error) {
              console.error('Error selecting from library:', error);
              Alert.alert('Error', 'Failed to select image. Please try again.');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
  
  // Function to upload the selected profile picture
  const uploadProfilePicture = async (image: ImageAsset) => {
    try {
      console.log('Starting profile picture upload with image:', image);
      const currentUser = auth().currentUser;
      if (!currentUser || !profile) {
        console.error('No current user or profile data');
        Alert.alert('Error', 'You must be logged in to update your profile picture.');
        return;
      }
      
      setIsUploadingImage(true);
      setUploadProgress(0);
      console.log('Set upload state, preparing to upload to Firebase Storage');
      
      // Upload image to Firebase Storage in profile folder with user ID
      console.log(`Uploading image with URI: ${image.uri}`);
      const imageUrl = await uploadImageAndGetURL(
        image.uri,
        'profile_pictures',
        `profile_${currentUser.uid}_${Date.now()}`,
        (progress) => {
          console.log(`Upload progress: ${progress * 100}%`);
          setUploadProgress(progress);
        }
      );
      
      console.log('Image uploaded successfully, URL:', imageUrl);
      
      // Update the user's profile with the new image URL
      console.log('Updating user document in Firestore');
      await db.collection('users').doc(currentUser.uid).update({
        profilePictureURL: imageUrl,
        updatedAt: new Date()
      });
      
      // Also update the Firebase Auth user profile
      console.log('Updating Firebase Auth user profile');
      try {
        await currentUser.updateProfile({
          photoURL: imageUrl
        });
        console.log('Firebase Auth profile updated successfully');
      } catch (authError) {
        console.error('Error updating Firebase Auth profile:', authError);
        // Continue with the process even if this fails
      }
      
      // Update profile in Firestore and propagate to other collections
      console.log('Propagating profile picture update to other collections');
      await propagateProfileUpdates(currentUser.uid, { profilePictureURL: imageUrl });
      
      // Update local state
      console.log('Updating local state with new profile picture');
      setProfile({
        ...profile,
        profilePictureURL: imageUrl,
        updatedAt: new Date()
      });
      
      // Update profile cache
      console.log('Updating profile cache');
      const profileCacheKey = getUserProfileCacheKey(currentUser.uid);
      const profileTimestampKey = getUserProfileTimestampKey(currentUser.uid);
      
      await AsyncStorage.setItem(profileCacheKey, JSON.stringify({
        ...profile,
        profilePictureURL: imageUrl,
        updatedAt: new Date()
      }));
      await AsyncStorage.setItem(profileTimestampKey, Date.now().toString());
      
      console.log('Profile picture update completed successfully');
      Alert.alert('Success', 'Your profile picture has been updated.');
      setIsUploadingImage(false);
      
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
      setIsUploadingImage(false);
    }
  };

  // Consolidated data fetching function
  const fetchAllUserData = useCallback(async (userId: string, forceRefresh = false) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // Set loading states
      setLoading(true);
      setPostsLoading(true);
      setOutfitsLoading(true);
      
      // Get profile cache first for immediate UI
      if (!forceRefresh) {
        const profileCacheKey = getUserProfileCacheKey(userId);
        const profileTimestampKey = getUserProfileTimestampKey(userId);
        
        try {
          const cachedTimestampStr = await AsyncStorage.getItem(profileTimestampKey);
          const cachedProfileStr = await AsyncStorage.getItem(profileCacheKey);
          
          if (cachedTimestampStr && cachedProfileStr) {
            const timestamp = parseInt(cachedTimestampStr);
            const now = Date.now();
            
            if (now - timestamp < CACHE_EXPIRY_TIME) {
              const cachedProfile = JSON.parse(cachedProfileStr);
              setProfile(cachedProfile);
              setLoading(false);
              console.log(`Using cached profile data for user ${userId}`);
            }
          }
        } catch (cacheError) {
          console.warn('Error reading profile from cache:', cacheError);
        }
      }
      
      // Fetch all data in parallel - single orchestrated call
      const [prefs, posts, outfits, products, counts] = await Promise.allSettled([
        fetchAndCachePreferences(userId, forceRefresh),
        fetchPosts(userId, forceRefresh),
        fetchSavedOutfits(userId),
        fetchFavoriteProducts(userId),
        fetchFollowCounts(userId)
      ]);
      
      // Handle results
      if (prefs.status === 'rejected') console.error('Failed to fetch preferences:', prefs.reason);
      if (posts.status === 'rejected') console.error('Failed to fetch posts:', posts.reason);
      if (outfits.status === 'rejected') console.error('Failed to fetch outfits:', outfits.reason);
      if (products.status === 'rejected') console.error('Failed to fetch products:', products.reason);
      if (counts.status === 'rejected') console.error('Failed to fetch follow counts:', counts.reason);
      
      // Clear loading states
      setPostsLoading(false);
      setOutfitsLoading(false);
      
    } catch (error) {
      console.error('Error in fetchAllUserData:', error);
      setLoading(false);
      setPostsLoading(false);
      setOutfitsLoading(false);
    }
  }, [fetchAndCachePreferences, fetchPosts, fetchSavedOutfits, fetchFavoriteProducts, fetchFollowCounts]);

  // Subscribe to user profile changes in Firestore with minimal dependencies
  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;
    
    const initializeUser = async () => {
      const user = auth().currentUser;
      
      if (user) {
        console.log('UserProfileScreen mounted, fetching data...');
        setProfileUserId(user.uid);
        
        // Set up profile listener
        const profileCacheKey = getUserProfileCacheKey(user.uid);
        const profileTimestampKey = getUserProfileTimestampKey(user.uid);
        
        profileUnsubscribe = db.collection('users').doc(user.uid).onSnapshot(async (docSnap) => {
          if (docSnap.exists) {
            const userData = docSnap.data() as UserProfile;
            
            if (userData.createdAt && userData.createdAt.toDate && typeof userData.createdAt.toDate === 'function') {
              userData.createdAt = userData.createdAt.toDate();
            }
            
            setProfile(userData);
            setLoading(false);
            
            // Update cache
            try {
              await AsyncStorage.setItem(profileCacheKey, JSON.stringify(userData));
              await AsyncStorage.setItem(profileTimestampKey, Date.now().toString());
            } catch (cacheError) {
              console.warn('Error writing profile to cache:', cacheError);
            }
          }
        }, (error) => {
          console.error('Error fetching profile:', error);
          setLoading(false);
        });
        
        // Fetch all other data once
        await fetchAllUserData(user.uid, false);
        
      } else {
        setProfile(null);
        setLoading(false);
      }
    };
    
    initializeUser();
    
    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []); // Minimal dependencies - only run once on mount
  
  // Refresh data when the screen comes into focus - optimized
  useFocusEffect(
    useCallback(() => {
      // Only refresh if cache is stale (don't fetch on every focus)
      const user = auth().currentUser;
      if (user && profileUserId && user.uid === profileUserId) {
        // Light refresh - only fetch if cache is expired
        fetchPosts(user.uid, false);
      }
    }, [fetchPosts, profileUserId])
  );
  
  // Function to clear cache when needed (like after creating a new post)
  const clearPostsCache = useCallback(async (userId?: string) => {
    try {
      if (!userId) {
        const currentUser = auth().currentUser;
        if (!currentUser) {
          console.warn('No user ID available to clear cache');
          return;
        }
        userId = currentUser.uid;
      }
      
      const postsCacheKey = getUserPostsCacheKey(userId);
      const postsTimestampKey = getUserPostsTimestampKey(userId);
      
      await AsyncStorage.removeItem(postsCacheKey);
      await AsyncStorage.removeItem(postsTimestampKey);
      console.log(`Posts cache cleared for user ${userId}`);
    } catch (error) {
      console.warn('Error clearing posts cache:', error);
    }
  }, []);

  const openPreferencesModal = () => {
    // If no preferences exist yet, create a default structure
    const defaultPreferences: UserPreferences = {
      preferredStyles: [],
      preferredBrands: [],
      topsSize: '',
      bottomsSize: '',
      shoeSize: '',
      colorPreferences: [],
      emailNotifications: true,
      pushNotifications: true,
      ...preferences // Spread existing preferences if any
    };
    
    setEditPreferencesData(preferences || defaultPreferences);
    setIsPreferencesModalVisible(true);
  };

  const handleSavePreferences = async () => {
    const currentUser = auth().currentUser;
    if (currentUser && editPreferencesData) {
      const userId = currentUser.uid;
      await setUserPreferences(userId, editPreferencesData);
      
      // Update cache with new preferences
      try {
        await AsyncStorage.setItem(PREFERENCES_CACHE_KEY, JSON.stringify(editPreferencesData));
        await AsyncStorage.setItem(PREFERENCES_CACHE_TIMESTAMP_KEY, Date.now().toString());
        console.log('Preferences cache updated after save');
      } catch (cacheError) {
        console.warn('Error updating preferences cache:', cacheError);
      }
      
      Alert.alert('Success', 'Your style preferences have been updated.', [
        { text: 'OK', onPress: () => setIsPreferencesModalVisible(false) }
      ]);
    }
  };

  const handleAddProfile = async () => {
    const userId = auth().currentUser?.uid;
    if (userId) {
      const defaultProfile: UserProfile = {
        userID: userId,
        email: auth().currentUser?.email || '',
        username: '',
        fullName: '',
        profilePictureURL: '',
        createdAt: new Date(),
        isVerified: auth().currentUser?.emailVerified || false,
        userRole: 'user',
        userGender: '',
        userDisplayName: '',
        userPronouns: '',
        userType: 'basic',
      };
      await createUserProfile(userId, defaultProfile);
      Alert.alert('Profile Created', 'Your profile has been created successfully!');
    }
  };

  const handleChangePreferences = (field: keyof UserPreferences, value: any) => {
    setEditPreferencesData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Helper for arrays in preferences
  const toggleArrayItem = (field: 'preferredStyles' | 'preferredBrands' | 'colorPreferences', item: string) => {
    if (!editPreferencesData) return;
    
    const currentArray = [...(editPreferencesData[field] || [])];
    const index = currentArray.indexOf(item);
    
    if (index >= 0) {
      currentArray.splice(index, 1);
    } else {
      currentArray.push(item);
    }
    
    handleChangePreferences(field, currentArray);
  };
  
  const navigateToSettings = () => {
    navigation.navigate('SettingsScreen' as never);
  };
  
  // Function to navigate to user detail screen
  const navigateToUserDetail = (userId: string, username: string) => {
    navigation.navigate('UserDetailScreen' as never, { userId, username } as never);
  };
  
  const viewStyleBoard = (boardId: string) => {
    setSelectedStyleBoard(boardId);
  };
  
  const closeStyleBoardModal = () => {
    setSelectedStyleBoard(null);
  };

  // Handle sign out properly with cache clearing
  const handleSignOut = async () => {
    try {
      // Store the user ID before signing out
      const currentUser = auth().currentUser;
      const userId = currentUser?.uid;
      
      // Import the appStateManager to update auth state
      const { appStateManager } = require('../../utils/appStateManager');
      
      // Clear all user-specific caches if we have a valid user ID
      if (userId) {
        // Clear posts cache
        const postsCacheKey = getUserPostsCacheKey(userId);
        const postsTimestampKey = getUserPostsTimestampKey(userId);
        
        // Clear profile cache
        const profileCacheKey = getUserProfileCacheKey(userId);
        const profileTimestampKey = getUserProfileTimestampKey(userId);
        
        // Clear preferences cache
        const prefsCacheKey = getUserPrefsCacheKey(userId);
        const prefsTimestampKey = getUserPrefsTimestampKey(userId);
        
        console.log('Clearing all caches for user:', userId);
        
        await Promise.all([
          AsyncStorage.removeItem(postsCacheKey),
          AsyncStorage.removeItem(postsTimestampKey),
          AsyncStorage.removeItem(profileCacheKey),
          AsyncStorage.removeItem(profileTimestampKey),
          AsyncStorage.removeItem(prefsCacheKey),
          AsyncStorage.removeItem(prefsTimestampKey)
        ]);
        
        console.log('All user caches cleared successfully');
      }
      
      // Sign out with Firebase
      await auth().signOut();
      
      // Update app state manager (redundant with our Firebase listener, but for safety)
      appStateManager.setAuthenticated(false);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Sign Out Error', 'An error occurred while signing out. Please try again.');
    }
  };

  // Memoized navigation functions for better performance
  const navigateToCreatePost = useCallback(() => {
    navigation.navigate('CreatePostScreen' as never);
  }, [navigation]);

  const navigateToCloset = useCallback(() => {
    navigation.navigate('ClosetScreen' as never);
  }, [navigation]);

  const navigateToOverview = useCallback(() => {
    navigation.navigate('OverviewScreen' as never);
  }, [navigation]);

  const navigateTo3D = useCallback(() => {
    navigation.navigate('3DScreen' as never);
  }, [navigation]);

  // Memoize tab content rendering to prevent unnecessary re-renders
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'posts':
        return (
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
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.postsGrid}
              />
            ) : (
              <View style={styles.emptyPostsContainer}>
                <Icon name="images-outline" size={60} color={subTextColor} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyPostsText, { color: textColor }]}>
                  No Posts Yet
                </Text>
                <Text style={[styles.emptyPostsSubText, { color: subTextColor }]}>
                  Share your style by creating your first post
                </Text>
                <TouchableOpacity 
                  style={[styles.createPostButton, { backgroundColor: mainColor }]}
                  onPress={() => navigation.navigate('CreatePostScreen' as never)}
                >
                  <Text style={styles.createPostButtonText}>Create Post</Text>
                  <Icon name="add-circle" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'outfits':
        return (
          <>
            {/* Saved Outfits Section */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Saved Outfits</Text>
              {outfitsLoading ? (
                <ActivityIndicator size="small" color={mainColor} />
              ) : savedOutfits.length > 0 ? (
                <FlatList
                  data={savedOutfits}
                  numColumns={2}
                  renderItem={({ item }) => (
                    <View style={[styles.outfitCard, { backgroundColor: cardBgColor }]}>
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.outfitImage} 
                        resizeMode="cover"
                      />
                      <View style={styles.outfitInfo}>
                        <Text style={[styles.outfitName, { color: textColor }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.outfitItemCount, { color: subTextColor }]}>
                          {item.products?.length || 0} items
                        </Text>
                      </View>
                    </View>
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.outfitsGrid}
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

            {/* Favorite Products Section */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Favorite Products</Text>
              {outfitsLoading ? (
                <ActivityIndicator size="small" color={mainColor} />
              ) : favoriteProducts.length > 0 ? (
                <FlatList
                  data={favoriteProducts}
                  numColumns={2}
                  renderItem={({ item }) => (
                    <View style={[styles.productCard, { backgroundColor: cardBgColor }]}>
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.productImage} 
                        resizeMode="cover"
                      />
                      <View style={styles.productInfo}>
                        <Text style={[styles.productBrand, { color: subTextColor }]} numberOfLines={1}>
                          {item.brand}
                        </Text>
                        <Text style={[styles.productName, { color: textColor }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={[styles.productPrice, { color: mainColor }]}>
                          ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                        </Text>
                      </View>
                    </View>
                  )}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.productsGrid}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="heart-outline" size={48} color={subTextColor} />
                  <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                    No favorite products yet
                  </Text>
                </View>
              )}
            </View>
          </>
        );

      default:
        return null;
    }
  }, [activeTab, postsLoading, userPosts, outfitsLoading, savedOutfits, favoriteProducts, mainColor, subTextColor, textColor, cardBgColor]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={mainColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading your profile...</Text>
      </View>
    );
  }

  // Style board detail modal
  const renderStyleBoardModal = () => {
    if (!selectedStyleBoard) return null;
    
    const board = STYLE_BOARDS.find(board => board.id === selectedStyleBoard);
    if (!board) return null;
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedStyleBoard}
        onRequestClose={closeStyleBoardModal}
      >
        <SafeAreaView style={[styles.styleBoardModal, { backgroundColor: bgColor }]}>
          <View style={[styles.styleBoardModalHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={closeStyleBoardModal}>
              <Icon name="chevron-back" size={24} color={mainColor} />
            </TouchableOpacity>
            <Text style={[styles.styleBoardModalTitle, { color: textColor }]}>{board.title}</Text>
            <TouchableOpacity>
              <Icon name="share-outline" size={24} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1 }}>
            <ImageBackground
              source={{ uri: board.image }}
              style={styles.styleBoardHero}
            >
              <View style={[styles.styleBoardOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }]}>
                <Text style={[styles.styleBoardHeroTitle, { color: textColor }]}>{board.title}</Text>
                <Text style={[styles.styleBoardCardDescription, { color: subTextColor }]}>{board.description}</Text>
              </View>
            </ImageBackground>
            
            <View style={styles.styleBoardContent}>
              <Text style={[styles.styleBoardSectionTitle, { color: textColor }]}>Fashion Items</Text>
              <Text style={[styles.styleBoardDetailDescription, { color: subTextColor }]}>
                This is a curated collection showcasing {board.title.toLowerCase()} style. Browse through the items to get inspiration for your next outfit.
              </Text>
              
              {/* Sample items in the board */}
              <View style={styles.styleBoardItemsGrid}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.styleBoardItem, 
                      { 
                        backgroundColor: cardBgColor,
                        shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.1)'
                      }
                    ]}
                  >
                    <Image 
                      source={{ 
                        uri: `https://picsum.photos/300/300?random=${index + 10 * parseInt(board.id)}` 
                      }} 
                      style={styles.styleBoardItemImage} 
                    />
                    <View style={styles.styleBoardItemContent}>
                      <Text 
                        style={[styles.styleBoardItemTitle, { color: textColor }]}
                        numberOfLines={1}
                      >
                        Fashion Item {index + 1}
                      </Text>
                      <View style={styles.styleBoardItemRow}>
                        <Text style={[styles.styleBoardItemBrand, { color: mainColor }]}>
                          Brand Name
                        </Text>
                        <Text style={[styles.styleBoardItemPrice, { color: subTextColor }]}>
                          ${(50 + index * 25).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

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
          <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={navigateToSettings}
          >
            <FeatherIcon name="settings" size={24} color={mainColor} />
          </TouchableOpacity>
        </Animated.View>
        
        {profile ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={mainColor}
                colors={[mainColor]}
              />
            }
          >
            {/* Profile Header Section */}
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
                {profile.profilePictureURL ? (
                  <Image 
                    source={{ uri: profile.profilePictureURL }} 
                    style={styles.profileImage} 
                  />
                ) : (
                  <View style={[styles.defaultProfileImage, { backgroundColor: mainColor }]}>
                    <Text style={styles.defaultProfileImageText}>
                      {profile.userDisplayName ? 
                        profile.userDisplayName.charAt(0).toUpperCase() : 
                        profile.username ? 
                          profile.username.charAt(0).toUpperCase() : 
                          profile.email ? 
                            profile.email.charAt(0).toUpperCase() : 
                            '?'}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={[styles.profileCameraButton, { backgroundColor: surfaceColor }]}
                  onPress={handleProfilePictureUpdate}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={mainColor} />
                  ) : (
                    <FeatherIcon name="camera" size={18} color={mainColor} />
                  )}
                </TouchableOpacity>
                
                {/* Make entire profile image clickable for updating */}
                <TouchableOpacity 
                  style={styles.profileClickOverlay}
                  activeOpacity={0.8}
                  onPress={handleProfilePictureUpdate}
                />
              </View>
              
              <View style={styles.nameContainer}>
                <Text style={[styles.displayName, { color: textColor }]}>
                  {profile.userDisplayName || profile.username || 'Set your name'}
                </Text>
                
                <Text style={[styles.username, { color: subTextColor }]}>
                  @{profile.username || 'username'}
                  {profile.isVerified && (
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
              
              {/* Follow/Unfollow Button - Only shown when viewing another user's profile */}
              {profileUserId && auth().currentUser && profileUserId !== auth().currentUser.uid && (
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
            
            <TouchableOpacity 
              style={[
                styles.tab, 
                styles.settingsTab
              ]}
              onPress={navigateToSettings}
            >
              <Icon 
                name="settings-outline" 
                size={24} 
                color={subTextColor} 
              />
              <Text style={[
                styles.tabText, 
                { color: subTextColor }
              ]}>Settings</Text>
            </TouchableOpacity>
          </View>
          
          {/* Tab Content */}
          {renderTabContent()}
        </ScrollView>
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>Loading your profile...</Text>
        </View>
      )}
      
      {/* Style Board Detail Modal */}
      {renderStyleBoardModal()}
      
      {/* Style Preferences Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isPreferencesModalVisible}
        onRequestClose={() => setIsPreferencesModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setIsPreferencesModalVisible(false)}>
              <Icon name="close" size={26} color={mainColor} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Style Preferences</Text>
            <TouchableOpacity onPress={handleSavePreferences}>
              <Text style={[styles.modalSave, { color: mainColor }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {editPreferencesData && (
              <>
                {/* Style Preferences */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: textColor }]}>Style Aesthetic</Text>
                  <Text style={[styles.modalSectionSubtitle, { color: subTextColor }]}>
                    Select styles that match your personal aesthetic
                  </Text>
                  
                  <View style={styles.tagSelectionGrid}>
                    {['Minimalist', 'Vintage', 'Street Style', 'Casual', 'Formal', 'Athleisure', 
                      'Bohemian', 'Preppy', 'Edgy', 'Classic', 'Punk', 'Hip-Hop', 'Y2K'].map((style) => (
                      <TouchableOpacity 
                        key={style}
                        style={[
                          styles.tagSelectButton,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            borderColor: editPreferencesData.preferredStyles.includes(style) ? mainColor : 'transparent',
                          }
                        ]}
                        onPress={() => toggleArrayItem('preferredStyles', style)}
                      >
                        {editPreferencesData.preferredStyles.includes(style) && (
                          <View style={[styles.selectedMarker, { backgroundColor: mainColor }]}>
                            <Icon name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text 
                          style={[
                            styles.tagSelectText, 
                            { 
                              color: editPreferencesData.preferredStyles.includes(style) ? 
                                mainColor : subTextColor 
                            }
                          ]}
                        >
                          {style}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Brands */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: textColor }]}>Favorite Brands</Text>
                  <Text style={[styles.modalSectionSubtitle, { color: subTextColor }]}>
                    Select brands you love to wear
                  </Text>
                  
                  <View style={styles.tagSelectionGrid}>
                    {['Nike', 'Adidas', 'Levi\'s', 'H&M', 'Zara', 'Uniqlo', 'Vans', 'Supreme', 
                      'The North Face', 'Patagonia', 'Calvin Klein', 'Tommy Hilfiger', 'Gucci', 
                      'Balenciaga', 'Off-White'].map((brand) => (
                      <TouchableOpacity 
                        key={brand}
                        style={[
                          styles.tagSelectButton,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            borderColor: editPreferencesData.preferredBrands.includes(brand) ? accentColor : 'transparent',
                          }
                        ]}
                        onPress={() => toggleArrayItem('preferredBrands', brand)}
                      >
                        {editPreferencesData.preferredBrands.includes(brand) && (
                          <View style={[styles.selectedMarker, { backgroundColor: accentColor }]}>
                            <Icon name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text 
                          style={[
                            styles.tagSelectText, 
                            { 
                              color: editPreferencesData.preferredBrands.includes(brand) ? 
                                accentColor : subTextColor 
                            }
                          ]}
                        >
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Colors */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: textColor }]}>Color Palette</Text>
                  <Text style={[styles.modalSectionSubtitle, { color: subTextColor }]}>
                    Select colors you prefer to wear
                  </Text>
                  
                  <View style={styles.tagSelectionGrid}>
                    {['Black', 'White', 'Gray', 'Blue', 'Navy', 'Green', 'Olive', 'Red', 
                      'Burgundy', 'Pink', 'Purple', 'Yellow', 'Orange', 'Brown', 'Beige'].map((color) => (
                      <TouchableOpacity 
                        key={color}
                        style={[
                          styles.tagSelectButton,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            borderColor: editPreferencesData.colorPreferences.includes(color) ? secondaryColor : 'transparent',
                          }
                        ]}
                        onPress={() => toggleArrayItem('colorPreferences', color)}
                      >
                        {editPreferencesData.colorPreferences.includes(color) && (
                          <View style={[styles.selectedMarker, { backgroundColor: secondaryColor }]}>
                            <Icon name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text 
                          style={[
                            styles.tagSelectText, 
                            { 
                              color: editPreferencesData.colorPreferences.includes(color) ? 
                                secondaryColor : subTextColor 
                            }
                          ]}
                        >
                          {color}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Sizes */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: textColor }]}>Your Sizes</Text>
                  <Text style={[styles.modalSectionSubtitle, { color: subTextColor }]}>
                    Enter your clothing sizes for better recommendations
                  </Text>
                  
                  <View style={styles.sizesGroup}>
                    <View style={styles.sizeInputContainer}>
                      <Text style={[styles.sizeInputLabel, { color: subTextColor }]}>Tops</Text>
                      <TextInput
                        value={editPreferencesData.topsSize}
                        onChangeText={(text) => handleChangePreferences('topsSize', text)}
                        style={[
                          styles.sizeInput,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            color: textColor,
                            borderColor: borderColor
                          }
                        ]}
                        placeholder="E.g., S, M, L, XL"
                        placeholderTextColor={subTextColor}
                      />
                    </View>
                    
                    <View style={styles.sizeInputContainer}>
                      <Text style={[styles.sizeInputLabel, { color: subTextColor }]}>Bottoms</Text>
                      <TextInput
                        value={editPreferencesData.bottomsSize}
                        onChangeText={(text) => handleChangePreferences('bottomsSize', text)}
                        style={[
                          styles.sizeInput,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            color: textColor,
                            borderColor: borderColor
                          }
                        ]}
                        placeholder="E.g., 30, 32, 8, 10"
                        placeholderTextColor={subTextColor}
                      />
                    </View>
                    
                    <View style={styles.sizeInputContainer}>
                      <Text style={[styles.sizeInputLabel, { color: subTextColor }]}>Shoes</Text>
                      <TextInput
                        value={editPreferencesData.shoeSize}
                        onChangeText={(text) => handleChangePreferences('shoeSize', text)}
                        style={[
                          styles.sizeInput,
                          { 
                            backgroundColor: isDarkMode ? secondarySurfaceColor : surfaceColor,
                            color: textColor,
                            borderColor: borderColor
                          }
                        ]}
                        placeholder="E.g., US 9, EU 42"
                        placeholderTextColor={subTextColor}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Tab styles
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
    paddingHorizontal: 16,
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
  settingsTab: {
    borderBottomColor: 'transparent', // Ensure no default active border
  },
  // Posts styles
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
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createPostButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Post modal
  postModalContainer: {
    flex: 1,
  },
  postModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postModalTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  postModalContent: {
    flex: 1,
  },
  postModalImage: {
    width: '100%',
    height: width,
    resizeMode: 'cover',
  },
  postModalDetails: {
    padding: 16,
  },
  postModalUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  postModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postModalUsername: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  postModalTime: {
    ...defaultTextStyle,
    fontSize: 13,
    marginTop: 2,
  },
  postModalCaption: {
    ...defaultTextStyle,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  postModalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  postModalTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  postModalTagText: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
  },
  postModalStats: {
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postModalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  postModalStatText: {
    ...defaultTextStyle,
    fontSize: 14,
    marginLeft: 6,
  },
  postModalOutfitItems: {
    marginTop: 8,
  },
  postModalOutfitTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  postModalOutfitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postModalOutfitItemName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  postModalOutfitItemBrand: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  postModalOutfitItemLink: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    right: 16,
    padding: 10,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Will add hover effect in actual interaction
  },
  scrollView: {
    paddingBottom: 40,
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
  profileHeader: {
    height: 320,
    width: width,
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
  profileClickOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    zIndex: 5, // Higher than base image but lower than camera button
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
  profileCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10, // Ensure the camera button appears above other elements
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
  followButton: {
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 50,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  followButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: -20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    ...defaultTextStyle,
    fontSize: 12,
    marginTop: 6,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginLeft: 4,
  },
  sectionAction: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
  },
  styleBoards: {
    paddingLeft: 16,
    paddingBottom: 8,
  },
  styleBoard: {
    width: width * 0.7,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  styleBoardImage: {
    width: '100%',
    height: 140,
  },
  styleBoardBody: {
    padding: 16,
  },
  styleBoardTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  styleBoardCardDescription: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 12,
  },
  styleBoardDetailDescription: {
    ...defaultTextStyle,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  styleBoardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleBoardItems: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  styleBoardItemCount: {
    ...defaultTextStyle,
    fontSize: 13,
    marginLeft: 6,
  },
  preferencesPreview: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  preferencesTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  preferencesSubtitle: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  editButtonText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
  },
  preferencesBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  preferenceSection: {
    marginBottom: 16,
  },
  preferenceType: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 8,
  },
  tagsScrollView: {
    paddingBottom: 4,
  },
  styleTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  styleTagText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyPreference: {
    ...defaultTextStyle,
    fontSize: 14,
    fontStyle: 'italic',
  },
  noPreferencesContainer: {
    paddingVertical: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noPreferencesText: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
    maxWidth: '80%',
  },
  setPreferencesButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  setPreferencesButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outfitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  outfitCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 1,
  },
  outfitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  outfitDetails: {
    padding: 8,
  },
  outfitTitle: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesCount: {
    ...defaultTextStyle,
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  productsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  productsCount: {
    ...defaultTextStyle,
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceText: {
    ...defaultTextStyle,
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  productCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
  },
  productOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  productDetails: {
    padding: 8,
  },
  productTitle: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginLeft: 4,
  },
  emptyStateContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateButtonText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 24,
    alignSelf: 'center',
  },
  viewAllButtonText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  accountControls: {
    marginHorizontal: 16,
    borderRadius: 16,
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  signOutText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  accountInfo: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  noProfileContainer: {
    margin: 16,
    marginTop: 100,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  noProfileIcon: {
    marginBottom: 16,
  },
  noProfileTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  noProfileDescription: {
    ...defaultTextStyle,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  createProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createProfileButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  styleBoardModal: {
    flex: 1,
  },
  styleBoardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  styleBoardModalTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  styleBoardHero: {
    height: 250,
    width: '100%',
    justifyContent: 'flex-end',
  },
  styleBoardOverlay: {
    padding: 20,
    width: '100%',
  },
  styleBoardHeroTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  styleBoardContent: {
    padding: 20,
  },
  styleBoardSectionTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  styleBoardItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  styleBoardItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  styleBoardItemImage: {
    width: '100%',
    height: 120,
  },
  styleBoardItemContent: {
    padding: 12,
  },
  styleBoardItemTitle: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  styleBoardItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleBoardItemBrand: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '500',
  },
  styleBoardItemPrice: {
    ...defaultTextStyle,
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 30,
  },
  modalSectionTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalSectionSubtitle: {
    ...defaultTextStyle,
    fontSize: 16,
    marginBottom: 20,
  },
  tagSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tagSelectButton: {
    width: '31%',
    marginHorizontal: '1%',
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  selectedMarker: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagSelectText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  sizesGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sizeInputContainer: {
    width: '31%',
    marginBottom: 16,
  },
  sizeInputLabel: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 8,
  },
  sizeInput: {
    ...defaultTextStyle,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default UserProfileScreen;