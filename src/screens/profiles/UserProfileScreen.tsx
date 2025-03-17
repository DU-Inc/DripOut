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
  Animated
} from 'react-native';
import { auth, db } from '../../Config/firebaseconfig';
import { createUserProfile, UserProfile, getUserPreferences, UserPreferences, setUserPreferences } from '../../services/firestoreService';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

const { width } = Dimensions.get('window');

const UserProfileScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
  const [editProfileData, setEditProfileData] = useState<UserProfile | null>(null);
  const [editPreferencesData, setEditPreferencesData] = useState<UserPreferences | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Theme colors
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const accentColor = isDarkMode ? '#FF4870' : '#FF3B5C';
  const saveColor = isDarkMode ? '#FFBA0D' : '#FFB100';
  const tabBackgroundColor = isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#FFFFFF';

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      // Listen for profile updates
      const profileUnsubscribe = onSnapshot(doc(db, 'users', userId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserProfile;
          
          // Convert Firestore Timestamp to Date
          if (data.createdAt && data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate();
          }
          if (data.updatedAt && data.updatedAt instanceof Timestamp) {
            data.updatedAt = data.updatedAt.toDate();
          }

          setProfile(data);
        } else {
          setProfile(null);
        }
      });

      // Listen for preferences updates
      const preferencesUnsubscribe = onSnapshot(doc(db, 'user_preferences', userId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setPreferences(docSnapshot.data() as UserPreferences);
        } else {
          setPreferences(null);
        }
      });

      setLoading(false);

      // Clean up the listeners
      return () => {
        profileUnsubscribe();
        preferencesUnsubscribe();
      };
    }
  }, []);

  const openProfileModal = () => {
    setEditProfileData(profile);
    setIsProfileModalVisible(true);
  };

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

  const handleSaveProfile = async () => {
    if (auth.currentUser && editProfileData) {
      const userId = auth.currentUser.uid;
      await createUserProfile(userId, {
        ...editProfileData,
        updatedAt: new Date(),
      });
      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => setIsProfileModalVisible(false) }
      ]);
    }
  };

  const handleSavePreferences = async () => {
    if (auth.currentUser && editPreferencesData) {
      const userId = auth.currentUser.uid;
      await setUserPreferences(userId, editPreferencesData);
      Alert.alert('Success', 'Your style preferences have been updated.', [
        { text: 'OK', onPress: () => setIsPreferencesModalVisible(false) }
      ]);
    }
  };

  const handleAddProfile = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const defaultProfile: UserProfile = {
        userID: userId,
        email: auth.currentUser?.email || '',
        username: '',
        fullName: '',
        profilePictureURL: '',
        createdAt: new Date(),
        isVerified: auth.currentUser?.emailVerified || false,
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

  const handleChangeProfile = (field: keyof UserProfile, value: any) => {
    setEditProfileData((prev) => (prev ? { ...prev, [field]: value } : null));
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={mainColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: cardBgColor,
            borderBottomColor: borderColor,
            shadowColor: isDarkMode ? mainColor : '#000000',
            opacity: headerOpacity
          }
        ]}
      >
        <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
      </Animated.View>
      
      <Animated.ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {profile ? (
          <>
            {/* Profile Header Section */}
            <View style={[styles.profileHeader, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
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
                  style={[styles.editImageButton, { backgroundColor: accentColor }]}
                  onPress={() => Alert.alert('Coming Soon', 'Profile picture upload will be available soon!')}
                >
                  <FeatherIcon name="camera" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.profileHeaderInfo}>
                <Text style={[styles.displayName, { color: textColor }]}>
                  {profile.userDisplayName || profile.username || 'Set your name'}
                </Text>
                
                <Text style={[styles.username, { color: subTextColor }]}>
                  @{profile.username || 'username'}
                  {profile.isVerified && (
                    <MaterialIcon name="check-decagram" size={14} color={isDarkMode ? '#59ABFF' : '#3897F0'} style={{ marginLeft: 4 }} />
                  )}
                </Text>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>0</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Outfits</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>0</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>0</Text>
                    <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.editProfileButton, { backgroundColor: mainColor }]}
                  onPress={openProfileModal}
                >
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { backgroundColor: tabBackgroundColor, borderColor: borderColor }]}>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'profile' && { borderBottomColor: mainColor, borderBottomWidth: 2 }
                ]}
                onPress={() => setActiveTab('profile')}
              >
                <Text style={[
                  styles.tabText, 
                  { color: activeTab === 'profile' ? mainColor : subTextColor }
                ]}>
                  Profile
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  activeTab === 'style' && { borderBottomColor: mainColor, borderBottomWidth: 2 }
                ]}
                onPress={() => setActiveTab('style')}
              >
                <Text style={[
                  styles.tabText, 
                  { color: activeTab === 'style' ? mainColor : subTextColor }
                ]}>
                  Style Preferences
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Tab Content */}
            {activeTab === 'profile' ? (
              <View style={[styles.sectionContainer, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Personal Information
                </Text>
                
                <View style={styles.profileItemsContainer}>
                  <View style={[styles.profileItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.profileItemIconContainer}>
                      <FeatherIcon name="mail" size={20} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                    </View>
                    <View style={styles.profileItemContent}>
                      <Text style={[styles.profileItemLabel, { color: subTextColor }]}>Email</Text>
                      <Text style={[styles.profileItemValue, { color: textColor }]}>{profile.email}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.profileItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.profileItemIconContainer}>
                      <FeatherIcon name="user" size={20} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                    </View>
                    <View style={styles.profileItemContent}>
                      <Text style={[styles.profileItemLabel, { color: subTextColor }]}>Full Name</Text>
                      <Text style={[styles.profileItemValue, { color: textColor }]}>
                        {profile.fullName || 'Not set'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.profileItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.profileItemIconContainer}>
                      <MaterialIcon name="gender-male-female" size={20} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                    </View>
                    <View style={styles.profileItemContent}>
                      <Text style={[styles.profileItemLabel, { color: subTextColor }]}>Gender</Text>
                      <Text style={[styles.profileItemValue, { color: textColor }]}>
                        {profile.userGender || 'Not set'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.profileItem, { borderBottomColor: borderColor }]}>
                    <View style={styles.profileItemIconContainer}>
                      <MaterialIcon name="tag-text" size={20} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                    </View>
                    <View style={styles.profileItemContent}>
                      <Text style={[styles.profileItemLabel, { color: subTextColor }]}>Pronouns</Text>
                      <Text style={[styles.profileItemValue, { color: textColor }]}>
                        {profile.userPronouns || 'Not set'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.accountInfoContainer}>
                  <Text style={[styles.accountInfoText, { color: subTextColor }]}>
                    {profile.userType.charAt(0).toUpperCase() + profile.userType.slice(1)} account · Created {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
                  </Text>
                </View>
              </View>
            ) : (
              // Style Preferences Tab
              <View style={[styles.sectionContainer, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
                <View style={styles.preferencesHeader}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Style Preferences
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.editPreferencesButton, { backgroundColor: preferences ? mainColor : saveColor }]}
                    onPress={openPreferencesModal}
                  >
                    <Text style={styles.editPreferencesButtonText}>
                      {preferences ? 'Edit Preferences' : 'Set Preferences'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {preferences ? (
                  <View style={styles.preferencesContainer}>
                    {/* Preferred Styles */}
                    <View style={[styles.preferenceSection, { borderBottomColor: borderColor }]}>
                      <Text style={[styles.preferenceSectionTitle, { color: textColor }]}>Style Aesthetics</Text>
                      <View style={styles.preferenceTagsContainer}>
                        {preferences.preferredStyles.length > 0 ? (
                          preferences.preferredStyles.map((style, index) => (
                            <View 
                              key={index} 
                              style={[
                                styles.preferenceTag, 
                                { 
                                  backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)',
                                  borderColor: isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)'
                                }
                              ]}
                            >
                              <Text style={[styles.preferenceTagText, { color: mainColor }]}>{style}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={[styles.emptyPreferenceText, { color: subTextColor }]}>No style preferences set</Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Preferred Brands */}
                    <View style={[styles.preferenceSection, { borderBottomColor: borderColor }]}>
                      <Text style={[styles.preferenceSectionTitle, { color: textColor }]}>Favorite Brands</Text>
                      <View style={styles.preferenceTagsContainer}>
                        {preferences.preferredBrands.length > 0 ? (
                          preferences.preferredBrands.map((brand, index) => (
                            <View 
                              key={index} 
                              style={[
                                styles.preferenceTag, 
                                { 
                                  backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.15)' : 'rgba(255, 59, 92, 0.08)',
                                  borderColor: isDarkMode ? 'rgba(255, 72, 112, 0.25)' : 'rgba(255, 59, 92, 0.15)'
                                }
                              ]}
                            >
                              <Text style={[styles.preferenceTagText, { color: accentColor }]}>{brand}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={[styles.emptyPreferenceText, { color: subTextColor }]}>No brand preferences set</Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Color Preferences */}
                    <View style={[styles.preferenceSection, { borderBottomColor: borderColor }]}>
                      <Text style={[styles.preferenceSectionTitle, { color: textColor }]}>Color Palette</Text>
                      <View style={styles.preferenceTagsContainer}>
                        {preferences.colorPreferences.length > 0 ? (
                          preferences.colorPreferences.map((color, index) => (
                            <View 
                              key={index} 
                              style={[
                                styles.preferenceTag, 
                                { 
                                  backgroundColor: isDarkMode ? 'rgba(255, 186, 13, 0.15)' : 'rgba(255, 177, 0, 0.08)',
                                  borderColor: isDarkMode ? 'rgba(255, 186, 13, 0.25)' : 'rgba(255, 177, 0, 0.15)'
                                }
                              ]}
                            >
                              <Text style={[styles.preferenceTagText, { color: saveColor }]}>{color}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={[styles.emptyPreferenceText, { color: subTextColor }]}>No color preferences set</Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Sizes */}
                    <View style={styles.preferenceSection}>
                      <Text style={[styles.preferenceSectionTitle, { color: textColor }]}>Your Sizes</Text>
                      <View style={styles.sizesContainer}>
                        <View style={[styles.sizeItem, { borderColor: borderColor }]}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Tops</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>
                            {preferences.topsSize || 'Not set'}
                          </Text>
                        </View>
                        
                        <View style={[styles.sizeItem, { borderColor: borderColor }]}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Bottoms</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>
                            {preferences.bottomsSize || 'Not set'}
                          </Text>
                        </View>
                        
                        <View style={[styles.sizeItem, { borderColor: borderColor }]}>
                          <Text style={[styles.sizeLabel, { color: subTextColor }]}>Shoes</Text>
                          <Text style={[styles.sizeValue, { color: textColor }]}>
                            {preferences.shoeSize || 'Not set'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noPreferencesContainer}>
                    <MaterialIcon name="hanger" size={56} color={isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)'} />
                    <Text style={[styles.noPreferencesTitle, { color: textColor }]}>No Style Preferences</Text>
                    <Text style={[styles.noPreferencesText, { color: subTextColor }]}>
                      Set your style preferences to get personalized fashion recommendations.
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Account Controls */}
            <View style={[styles.accountControlsContainer, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
              <TouchableOpacity 
                style={styles.accountControlButton}
                onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
              >
                <FeatherIcon name="settings" size={22} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                <Text style={[styles.accountControlText, { color: textColor }]}>Settings</Text>
                <FeatherIcon name="chevron-right" size={22} color={isDarkMode ? '#B8B8CC' : '#757575'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.accountControlButton}
                onPress={() => Alert.alert('Coming Soon', 'This feature will be available in a future update.')}
              >
                <FeatherIcon name="help-circle" size={22} color={isDarkMode ? '#B8B8CC' : '#757575'} />
                <Text style={[styles.accountControlText, { color: textColor }]}>Help & Support</Text>
                <FeatherIcon name="chevron-right" size={22} color={isDarkMode ? '#B8B8CC' : '#757575'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.signOutButton, { borderColor: isDarkMode ? 'rgba(255, 72, 112, 0.3)' : 'rgba(255, 59, 92, 0.3)' }]}
                onPress={() => auth.signOut()}
              >
                <Text style={[styles.signOutText, { color: accentColor }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={[styles.noProfileContainer, { backgroundColor: cardBgColor }]}>
            <MaterialIcon name="account-circle-outline" size={80} color={isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)'} />
            <Text style={[styles.noProfileTitle, { color: textColor }]}>Profile Not Found</Text>
            <Text style={[styles.noProfileText, { color: subTextColor }]}>
              Create your profile to get started with personalized fashion recommendations.
            </Text>
            <TouchableOpacity 
              style={[styles.createProfileButton, { backgroundColor: mainColor }]}
              onPress={handleAddProfile}
            >
              <Text style={styles.createProfileButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      
      {/* Profile Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isProfileModalVisible}
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setIsProfileModalVisible(false)}>
              <FeatherIcon name="x" size={24} color={isDarkMode ? '#B8B8CC' : '#757575'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile}>
              <Text style={[styles.modalSaveText, { color: mainColor }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {editProfileData && (
              <View style={styles.modalContent}>
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Username</Text>
                  <TextInput
                    value={editProfileData.username}
                    onChangeText={(text) => handleChangeProfile('username', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Display Name</Text>
                  <TextInput
                    value={editProfileData.userDisplayName || ''}
                    onChangeText={(text) => handleChangeProfile('userDisplayName', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Full Name</Text>
                  <TextInput
                    value={editProfileData.fullName || ''}
                    onChangeText={(text) => handleChangeProfile('fullName', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Gender</Text>
                  <TextInput
                    value={editProfileData.userGender || ''}
                    onChangeText={(text) => handleChangeProfile('userGender', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Pronouns</Text>
                  <TextInput
                    value={editProfileData.userPronouns || ''}
                    onChangeText={(text) => handleChangeProfile('userPronouns', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Preferences Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isPreferencesModalVisible}
        onRequestClose={() => setIsPreferencesModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setIsPreferencesModalVisible(false)}>
              <FeatherIcon name="x" size={24} color={isDarkMode ? '#B8B8CC' : '#757575'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Style Preferences</Text>
            <TouchableOpacity onPress={handleSavePreferences}>
              <Text style={[styles.modalSaveText, { color: mainColor }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            {editPreferencesData && (
              <View style={styles.modalContent}>
                {/* Style Preferences */}
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Style Aesthetics</Text>
                  <Text style={[styles.inputHelperText, { color: subTextColor }]}>
                    Select styles that match your aesthetic
                  </Text>
                  
                  <View style={styles.chipSelectionContainer}>
                    {['Minimalist', 'Vintage', 'Street Style', 'Casual', 'Formal', 'Athleisure', 
                      'Bohemian', 'Preppy', 'Edgy', 'Classic', 'Punk', 'Hip-Hop', 'Y2K'].map((style) => (
                      <TouchableOpacity 
                        key={style}
                        style={[
                          styles.selectionChip,
                          editPreferencesData.preferredStyles.includes(style) && {
                            backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.15)' : 'rgba(82, 69, 204, 0.08)',
                            borderColor: mainColor,
                          }
                        ]}
                        onPress={() => toggleArrayItem('preferredStyles', style)}
                      >
                        <Text 
                          style={[
                            styles.selectionChipText, 
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
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Favorite Brands</Text>
                  <Text style={[styles.inputHelperText, { color: subTextColor }]}>
                    Select brands you prefer
                  </Text>
                  
                  <View style={styles.chipSelectionContainer}>
                    {['Nike', 'Adidas', 'Levi\'s', 'H&M', 'Zara', 'Uniqlo', 'Vans', 'Supreme', 
                      'The North Face', 'Patagonia', 'Calvin Klein', 'Tommy Hilfiger', 'Gucci', 
                      'Balenciaga', 'Off-White'].map((brand) => (
                      <TouchableOpacity 
                        key={brand}
                        style={[
                          styles.selectionChip,
                          editPreferencesData.preferredBrands.includes(brand) && {
                            backgroundColor: isDarkMode ? 'rgba(255, 72, 112, 0.15)' : 'rgba(255, 59, 92, 0.08)',
                            borderColor: accentColor,
                          }
                        ]}
                        onPress={() => toggleArrayItem('preferredBrands', brand)}
                      >
                        <Text 
                          style={[
                            styles.selectionChipText, 
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
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Color Preferences</Text>
                  <Text style={[styles.inputHelperText, { color: subTextColor }]}>
                    Select colors you prefer
                  </Text>
                  
                  <View style={styles.chipSelectionContainer}>
                    {['Black', 'White', 'Gray', 'Blue', 'Navy', 'Green', 'Olive', 'Red', 
                      'Burgundy', 'Pink', 'Purple', 'Yellow', 'Orange', 'Brown', 'Beige'].map((color) => (
                      <TouchableOpacity 
                        key={color}
                        style={[
                          styles.selectionChip,
                          editPreferencesData.colorPreferences.includes(color) && {
                            backgroundColor: isDarkMode ? 'rgba(255, 186, 13, 0.15)' : 'rgba(255, 177, 0, 0.08)',
                            borderColor: saveColor,
                          }
                        ]}
                        onPress={() => toggleArrayItem('colorPreferences', color)}
                      >
                        <Text 
                          style={[
                            styles.selectionChipText, 
                            { 
                              color: editPreferencesData.colorPreferences.includes(color) ? 
                                saveColor : subTextColor 
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
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Tops Size</Text>
                  <TextInput
                    value={editPreferencesData.topsSize}
                    onChangeText={(text) => handleChangePreferences('topsSize', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholder="E.g., S, M, L, XL"
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Bottoms Size</Text>
                  <TextInput
                    value={editPreferencesData.bottomsSize}
                    onChangeText={(text) => handleChangePreferences('bottomsSize', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholder="E.g., 30, 32, 34"
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Shoe Size</Text>
                  <TextInput
                    value={editPreferencesData.shoeSize}
                    onChangeText={(text) => handleChangePreferences('shoeSize', text)}
                    style={[
                      styles.input, 
                      { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#F7F7F7',
                        borderColor: borderColor
                      }
                    ]}
                    placeholder="E.g., US 9, EU 42"
                    placeholderTextColor={subTextColor}
                  />
                </View>
                
                {/* Notification Preferences */}
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: subTextColor }]}>Notifications</Text>
                  
                  <View style={[styles.switchRow, { borderColor: borderColor }]}>
                    <Text style={[styles.switchLabel, { color: textColor }]}>Email Notifications</Text>
                    <TouchableOpacity
                      style={[
                        styles.switchButton,
                        { backgroundColor: editPreferencesData.emailNotifications ? mainColor : isDarkMode ? '#3F3F56' : '#E0E0E0' }
                      ]}
                      onPress={() => handleChangePreferences('emailNotifications', !editPreferencesData.emailNotifications)}
                    >
                      <View 
                        style={[
                          styles.switchThumb,
                          editPreferencesData.emailNotifications && { transform: [{ translateX: 22 }] }
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.switchRow, { borderColor: borderColor }]}>
                    <Text style={[styles.switchLabel, { color: textColor }]}>Push Notifications</Text>
                    <TouchableOpacity
                      style={[
                        styles.switchButton,
                        { backgroundColor: editPreferencesData.pushNotifications ? mainColor : isDarkMode ? '#3F3F56' : '#E0E0E0' }
                      ]}
                      onPress={() => handleChangePreferences('pushNotifications', !editPreferencesData.pushNotifications)}
                    >
                      <View 
                        style={[
                          styles.switchThumb,
                          editPreferencesData.pushNotifications && { transform: [{ translateX: 22 }] }
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileImageText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '600',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
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
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    alignSelf: 'center',
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  editProfileButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileItemsContainer: {
    marginTop: 8,
  },
  profileItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  profileItemIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemLabel: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 4,
  },
  profileItemValue: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
  },
  accountInfoContainer: {
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfoText: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editPreferencesButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  editPreferencesButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  preferencesContainer: {
    marginTop: 8,
  },
  preferenceSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  preferenceSectionTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  preferenceTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  preferenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  preferenceTagText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyPreferenceText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontStyle: 'italic',
  },
  sizesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sizeItem: {
    width: '30%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sizeLabel: {
    ...defaultTextStyle,
    fontSize: 12,
    marginBottom: 4,
  },
  sizeValue: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  noPreferencesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  noPreferencesTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noPreferencesText: {
    ...defaultTextStyle,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  accountControlsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
  },
  accountControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  accountControlText: {
    ...defaultTextStyle,
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  signOutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 10,
  },
  signOutText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  noProfileContainer: {
    marginHorizontal: 16,
    marginTop: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noProfileTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  noProfileText: {
    ...defaultTextStyle,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  createProfileButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  createProfileButtonText: {
    ...defaultTextStyle,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputHelperText: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    ...defaultTextStyle,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  chipSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  selectionChipText: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  switchLabel: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  switchButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  }
});

export default UserProfileScreen;
