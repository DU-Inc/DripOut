// src/screens/profiles/UserProfileScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
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
  Pressable
} from 'react-native';
import { db } from '../../Config/firebaseconfig';
import { auth } from '../../Config/firebaseconfig';
import { createUserProfile, UserProfile, getUserPreferences, UserPreferences, setUserPreferences } from '../../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../types/NavigationTypes';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, NavigationProp } from '@react-navigation/native';

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

// Mock outfit items for user showcase
const USER_OUTFITS = [
  {
    id: '1',
    title: 'Weekend Brunch',
    image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800&auto=format',
    likes: 18
  },
  {
    id: '2',
    title: 'Office Attire',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=800&auto=format',
    likes: 24
  },
  {
    id: '3',
    title: 'Evening Look',
    image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=800&auto=format',
    likes: 32
  }
];

const UserProfileScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
  const [editPreferencesData, setEditPreferencesData] = useState<UserPreferences | null>(null);
  const [selectedStyleBoard, setSelectedStyleBoard] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // Theme colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF'; // iOS card background
  const borderColor = isDarkMode ? '#38383A' : '#E5E5EA'; // iOS separator
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const secondaryColor = isDarkMode ? '#64D2FF' : '#5AC8FA'; // iOS light blue
  const accentColor = isDarkMode ? '#FF9F0A' : '#FF9500'; // iOS orange
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7'; // iOS system gray
  const secondarySurfaceColor = isDarkMode ? '#3A3A3C' : '#E5E5EA'; // iOS secondary background
  
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

  // Subscribe to user profile changes in Firestore
  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = auth().currentUser;
        
        if (user) {
          console.log('Fetching profile for user:', user.uid);
          
          // Set up a real-time listener for the user's profile
          const userRef = doc(db, 'users', user.uid);
          profileUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              console.log('Profile found:', docSnap.id);
              const userData = docSnap.data() as UserProfile;
              
              // Convert Firestore Timestamp to Date if needed
              if (userData.createdAt && userData.createdAt instanceof Timestamp) {
                userData.createdAt = userData.createdAt.toDate();
              }
              
              setProfile(userData);
            } else {
              console.log('No profile found for user');
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            console.error('Error fetching profile:', error);
            setLoading(false);
          });
          
          // Also fetch the user's preferences
          const userPrefs = await getUserPreferences(user.uid);
          if (userPrefs) {
            setPreferences(userPrefs);
            setEditPreferencesData(userPrefs);
          }
        } else {
          console.log('No user logged in');
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        setLoading(false);
      }
    };
    
    console.log('UserProfileScreen mounted, fetching data...');
    fetchUserData();
    
    // Cleanup function
    return () => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
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
  
  const viewStyleBoard = (boardId: string) => {
    setSelectedStyleBoard(boardId);
  };
  
  const closeStyleBoardModal = () => {
    setSelectedStyleBoard(null);
  };

  // Handle sign out properly
  const handleSignOut = async () => {
    try {
      // Import the appStateManager to update auth state
      const { appStateManager } = require('../../utils/appStateManager');
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
          <FeatherIcon name="settings" size={22} color={mainColor} />
        </TouchableOpacity>
      </Animated.View>
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {profile ? (
          <>
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
                            profile.email.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.profileCameraButton, { backgroundColor: surfaceColor }]}
                    onPress={() => Alert.alert('Coming Soon', 'Profile picture upload will be available soon!')}
                  >
                    <FeatherIcon name="camera" size={18} color={mainColor} />
                  </TouchableOpacity>
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
                    <Text style={[styles.statValue, { color: textColor }]}>3</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Outfits</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>74</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>128</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
            
            {/* Quick Actions */}
            <View style={[styles.quickActions, { backgroundColor: cardBgColor }]}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
              >
                <Icon name="add-circle-outline" size={22} color={mainColor} />
                <Text style={[styles.actionText, { color: textColor }]}>New Outfit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={openPreferencesModal}
              >
                <Icon name="color-palette-outline" size={22} color={accentColor} />
                <Text style={[styles.actionText, { color: textColor }]}>Style Preferences</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  await AsyncStorage.setItem('onboardingCompleted', 'false');
                  Alert.alert(
                    'Onboarding Reset',
                    'Going to onboarding flow for testing.',
                    [
                      { 
                        text: 'Go Now', 
                        onPress: () => navigation.reset({
                          index: 0,
                          routes: [{ name: 'Onboarding' as never }]
                        }) 
                      }
                    ]
                  );
                }}
              >
                <Icon name="reload-outline" size={22} color="#FF9500" />
                <Text style={[styles.actionText, { color: textColor }]}>Test Onboarding</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={navigateToSettings}
              >
                <Icon name="settings-outline" size={22} color={secondaryColor} />
                <Text style={[styles.actionText, { color: textColor }]}>Profile Settings</Text>
              </TouchableOpacity>
            </View>
            
            {/* Style Boards Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Style Inspiration</Text>
                <TouchableOpacity>
                  <Text style={[styles.sectionAction, { color: mainColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={STYLE_BOARDS}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.styleBoards}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.styleBoard, 
                      { 
                        backgroundColor: cardBgColor,
                        shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.1)' 
                      }
                    ]}
                    onPress={() => viewStyleBoard(item.id)}
                  >
                    <Image source={{ uri: item.image }} style={styles.styleBoardImage} />
                    <View style={styles.styleBoardBody}>
                      <Text style={[styles.styleBoardTitle, { color: textColor }]}>{item.title}</Text>
                      <Text style={[styles.styleBoardCardDescription, { color: subTextColor }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <View style={styles.styleBoardMeta}>
                        <View style={styles.styleBoardItems}>
                          <Icon name="shirt-outline" size={14} color={subTextColor} />
                          <Text style={[styles.styleBoardItemCount, { color: subTextColor }]}>
                            {item.items} items
                          </Text>
                        </View>
                        <Icon name="chevron-forward" size={16} color={mainColor} />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.id}
              />
            </View>
            
            {/* Style Preferences Preview */}
            <View style={[styles.preferencesPreview, { backgroundColor: cardBgColor }]}>
              <View style={styles.preferencesHeader}>
                <View>
                  <Text style={[styles.preferencesTitle, { color: textColor }]}>
                    Style Preferences
                  </Text>
                  <Text style={[styles.preferencesSubtitle, { color: subTextColor }]}>
                    Your personal style profile
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: mainColor }]}
                  onPress={openPreferencesModal}
                >
                  <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              {preferences ? (
                <View style={styles.preferencesBody}>
                  {/* Style Tags */}
                  <View style={styles.preferenceSection}>
                    <Text style={[styles.preferenceType, { color: subTextColor }]}>Style Aesthetic</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollView}
                    >
                      {preferences.preferredStyles && preferences.preferredStyles.length > 0 ? (
                        preferences.preferredStyles.map((style, index) => (
                          <View 
                            key={index}
                            style={[
                              styles.styleTag,
                              { 
                                backgroundColor: isDarkMode ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
                                borderColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)'
                              }
                            ]}
                          >
                            <Text style={[styles.styleTagText, { color: mainColor }]}>{style}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.emptyPreference, { color: subTextColor }]}>
                          No style preferences set
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                  
                  {/* Brands */}
                  <View style={styles.preferenceSection}>
                    <Text style={[styles.preferenceType, { color: subTextColor }]}>Favorite Brands</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollView}
                    >
                      {preferences.preferredBrands && preferences.preferredBrands.length > 0 ? (
                        preferences.preferredBrands.map((brand, index) => (
                          <View 
                            key={index}
                            style={[
                              styles.styleTag,
                              { 
                                backgroundColor: isDarkMode ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 149, 0, 0.1)',
                                borderColor: isDarkMode ? 'rgba(255, 159, 10, 0.3)' : 'rgba(255, 149, 0, 0.2)'
                              }
                            ]}
                          >
                            <Text style={[styles.styleTagText, { color: accentColor }]}>{brand}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.emptyPreference, { color: subTextColor }]}>
                          No brand preferences set
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                  
                  {/* Colors */}
                  <View style={styles.preferenceSection}>
                    <Text style={[styles.preferenceType, { color: subTextColor }]}>Color Palette</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollView}
                    >
                      {preferences.colorPreferences && preferences.colorPreferences.length > 0 ? (
                        preferences.colorPreferences.map((color, index) => (
                          <View 
                            key={index}
                            style={[
                              styles.styleTag,
                              { 
                                backgroundColor: isDarkMode ? 'rgba(100, 210, 255, 0.2)' : 'rgba(90, 200, 250, 0.1)',
                                borderColor: isDarkMode ? 'rgba(100, 210, 255, 0.3)' : 'rgba(90, 200, 250, 0.2)'
                              }
                            ]}
                          >
                            <Text style={[styles.styleTagText, { color: secondaryColor }]}>{color}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.emptyPreference, { color: subTextColor }]}>
                          No color preferences set
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <View style={styles.noPreferencesContainer}>
                  <Icon name="color-palette-outline" size={40} color={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} />
                  <Text style={[styles.noPreferencesText, { color: subTextColor }]}>
                    Set your style preferences to get personalized fashion recommendations
                  </Text>
                  <TouchableOpacity 
                    style={[styles.setPreferencesButton, { backgroundColor: mainColor }]}
                    onPress={openPreferencesModal}
                  >
                    <Text style={styles.setPreferencesButtonText}>Set Preferences</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {/* User Outfits */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>My Outfits</Text>
                <TouchableOpacity>
                  <Text style={[styles.sectionAction, { color: mainColor }]}>See All</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.outfitsGrid}>
                {USER_OUTFITS.map((outfit, index) => (
                  <TouchableOpacity 
                    key={outfit.id}
                    style={[
                      styles.outfitCard, 
                      { 
                        backgroundColor: cardBgColor,
                        shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.1)' 
                      }
                    ]}
                  >
                    <Image source={{ uri: outfit.image }} style={styles.outfitImage} />
                    <View style={styles.outfitOverlay}>
                      <View style={styles.outfitDetails}>
                        <Text style={styles.outfitTitle}>{outfit.title}</Text>
                        <View style={styles.likesContainer}>
                          <Icon name="heart" size={14} color="#FFFFFF" />
                          <Text style={styles.likesCount}>{outfit.likes}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Account Controls */}
            <View style={[styles.accountControls, { backgroundColor: cardBgColor }]}>
              <TouchableOpacity 
                style={[styles.signOutButton, { borderColor: isDarkMode ? 'rgba(255, 69, 58, 0.3)' : 'rgba(255, 59, 48, 0.3)' }]}
                onPress={handleSignOut}
              >
                <Text style={[styles.signOutText, { color: isDarkMode ? '#FF453A' : '#FF3B30' }]}>Sign Out</Text>
              </TouchableOpacity>
              
              <Text style={[styles.accountInfo, { color: subTextColor }]}>
                {profile.userType.charAt(0).toUpperCase() + profile.userType.slice(1)} account · Created {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.noProfileContainer, { backgroundColor: cardBgColor }]}>
            <Icon name="person-circle-outline" size={80} color={mainColor} style={styles.noProfileIcon} />
            <Text style={[styles.noProfileTitle, { color: textColor }]}>Create Your Profile</Text>
            <Text style={[styles.noProfileDescription, { color: subTextColor }]}>
              Set up your profile to get personalized style recommendations and show off your fashion sense.
            </Text>
            <TouchableOpacity 
              style={[styles.createProfileButton, { backgroundColor: mainColor }]}
              onPress={handleAddProfile}
            >
              <Text style={styles.createProfileButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
      
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
    padding: 8,
  },
  scrollContent: {
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
    fontSize: 20,
    fontWeight: '700',
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
    paddingHorizontal: 16,
  },
  outfitCard: {
    width: (width - 40) / 3,
    height: (width - 40) / 3,
    borderRadius: 8,
    margin: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  outfitDetails: {
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitTitle: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '600',
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