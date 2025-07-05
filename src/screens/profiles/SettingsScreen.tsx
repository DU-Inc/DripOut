// src/screens/profiles/SettingsScreen.tsx

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
  FlatList,
  Pressable,
  Dimensions,
  Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { db, firestoreDB, authInstance } from '../../Config/firebaseconfig';
import { doc, deleteDoc } from '@react-native-firebase/firestore';
import { deleteUser, getAuth } from '@react-native-firebase/auth';
import { signOutUser } from '../../services/auth';
import { 
  UserProfile, 
  setUserPreferences, 
  getUserPreferences, 
  UserPreferences,
  propagateProfileUpdates
} from '../../services/firestoreService';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { resetOnboardingStatus } from '../../utils/resetOnboarding';
import { takePhotoWithCamera, selectImageFromLibrary, ImageAsset } from '../../services/imagePickerService';
import { uploadImageAndGetURL } from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../../utils/appStateManager';

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Profile editing state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Helper function to get user's initials
  const getUserInitials = () => {
    const name = editedProfile?.userDisplayName || editedProfile?.fullName || editedProfile?.username || 'User';
    return name.charAt(0).toUpperCase();
  };

  // Theme colors - using app's red theme to match the rest of the app
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const secondaryColor = isDarkMode ? '#FF6D8E' : '#FF5B66'; // Red accent
  const accentColor = isDarkMode ? '#FF9F0A' : '#FF9500'; // Orange for contrast
  const surfaceColor = isDarkMode ? '#222232' : '#F5F5F5';
  const secondarySurfaceColor = isDarkMode ? '#2A2A38' : '#F0F0F5';
  const dangerColor = isDarkMode ? '#FF453A' : '#FF3B30';
  const modalBgColor = isDarkMode ? 'rgba(10, 10, 15, 0.95)' : 'rgba(0, 0, 0, 0.5)';

  // Profile fields (optional)
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [bodyType, setBodyType] = useState<string>('');
  const [birthday, setBirthday] = useState<string>('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { width } = Dimensions.get('window');

  // States for clothing sizes modal
  const [topSize, setTopSize] = useState(preferences?.topsSize || '');
  const [bottomSize, setBottomSize] = useState(preferences?.bottomsSize || '');
  const [shoeSize, setShoeSize] = useState(preferences?.shoeSize || '');
  
  // States for email editing modal
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [editingEmail, setEditingEmail] = useState('');
  
  // Define standardized options
  const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
  const bodyTypeOptions = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size', 'Petite', 'Tall'];
  
  // Height options in cm
  const heightOptions = Array.from({ length: 81 }, (_, i) => ({
    cm: 140 + i,
    display: `${140 + i} cm (${Math.floor((140 + i) / 30.48)}' ${Math.round(((140 + i) / 2.54) % 12)}")`
  }));
  
  // Weight options in kg
  const weightOptions = Array.from({ length: 101 }, (_, i) => ({
    kg: 40 + i,
    display: `${40 + i} kg (${Math.round((40 + i) * 2.20462)} lbs)`
  }));

  // Load user profile and preferences
  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (userId) {
      // Listen for profile updates
      const profileUnsubscribe = db.collection('users').doc(userId).onSnapshot((docSnapshot) => {
        if (docSnapshot.exists) {
          try {
            // Get the raw data from Firestore
            const rawData = docSnapshot.data();
            
            // React Native Firebase automatically converts timestamps to Date objects
            const data: UserProfile = {
              ...rawData,
              createdAt: rawData.createdAt,
              updatedAt: rawData.updatedAt,
              // Ensure the new fields are properly typed
              height: rawData.height || undefined,
              weight: rawData.weight || undefined,
              bodyType: rawData.bodyType || undefined,
              birthday: rawData.birthday || undefined,
            } as UserProfile;
            
            console.log('Loaded profile data:', data);
            
            setProfile(data);
            setEditedProfile(data);
            
            // Initialize optional fields
            setHeight(data.height || '');
            setWeight(data.weight || '');
            setBodyType(data.bodyType || '');
            setBirthday(data.birthday || '');
            
            // If birthday is in date format, parse it
            if (data.birthday) {
              try {
                const parts = data.birthday.split('/');
                if (parts.length === 3) {
                  const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                  if (!isNaN(date.getTime())) {
                    setSelectedDate(date);
                  } else {
                    setSelectedDate(null);
                  }
                } else {
                  setSelectedDate(null);
                }
              } catch (e) {
                console.error('Error parsing birthday date:', e);
                setSelectedDate(null);
              }
            } else {
              setSelectedDate(null);
            }
            
            setLoading(false);
          } catch (error) {
            console.error('Error processing profile data:', error);
            setLoading(false);
          }
        } else {
          setProfile(null);
          setEditedProfile(null);
          setLoading(false);
        }
      });

      // Load user preferences
      getUserPreferences(userId).then(prefs => {
        if (prefs) {
          setPreferences(prefs);
          // Initialize clothing size states
          setTopSize(prefs.topsSize || '');
          setBottomSize(prefs.bottomsSize || '');
          setShoeSize(prefs.shoeSize || '');
        }
      });

      return () => {
        profileUnsubscribe();
      };
    }
  }, []);

  const handleEditToggle = () => {
    if (editMode) {
      // Exiting edit mode, discard changes
      setEditedProfile(profile);
      
      // Reset optional fields
      if (profile) {
        setHeight(profile.height || '');
        setWeight(profile.weight || '');
        setBodyType(profile.bodyType || '');
        setBirthday(profile.birthday || '');
        
        // Reset selected date if birthday exists
        if (profile.birthday) {
          try {
            const parts = profile.birthday.split('/');
            if (parts.length === 3) {
              const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
              if (!isNaN(date.getTime())) {
                setSelectedDate(date);
              } else {
                setSelectedDate(null);
              }
            } else {
              setSelectedDate(null);
            }
          } catch (e) {
            setSelectedDate(null);
          }
        } else {
          setSelectedDate(null);
        }
      }
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (key: keyof UserProfile, value: string) => {
    if (!editedProfile) return;
    
    // Create a copy of the current state
    const updatedProfile = { ...editedProfile };
    
    // Update the specified field
    updatedProfile[key] = value;
    
    // If the username is updated, always set the display name to match
    if (key === 'username') {
      // Format the username properly (lowercase, no spaces, alphanumeric + underscores)
      const formattedUsername = value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      updatedProfile.username = formattedUsername;
      
      // Always set the display name to the username
      updatedProfile.userDisplayName = formattedUsername;
    }
    
    setEditedProfile(updatedProfile);
  };

  const handleSaveProfile = async () => {
    const auth = getAuth();
    if (!editedProfile || !auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      const userRef = db.collection('users').doc(userId);
      
      // Create clean update data, removing any undefined values
      const updateData: Record<string, any> = {
        ...editedProfile,
        updatedAt: new Date()
      };
      
      // Add custom fields that may not be in editedProfile
      if (height) updateData.height = height;
      if (weight) updateData.weight = weight;
      if (bodyType) updateData.bodyType = bodyType;
      if (birthday) updateData.birthday = birthday;
      
      // Remove any undefined or null values to avoid Firestore errors
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });
      
      console.log('Saving profile with data:', updateData);
      await userRef.update(updateData);
      
      // Determine which fields need to be propagated to other collections
      const fieldsToPropagate: Partial<UserProfile> = {};
      
      // Check if username was updated
      if (editedProfile.username !== profile?.username) {
        fieldsToPropagate.username = editedProfile.username;
      }
      
      // Check if profile picture was updated
      if (editedProfile.profilePictureURL !== profile?.profilePictureURL) {
        fieldsToPropagate.profilePictureURL = editedProfile.profilePictureURL;
      }
      
      // Check if display name was updated
      if (editedProfile.userDisplayName !== profile?.userDisplayName) {
        fieldsToPropagate.userDisplayName = editedProfile.userDisplayName;
      }
      
      // Only call propagateProfileUpdates if there are fields to propagate
      if (Object.keys(fieldsToPropagate).length > 0) {
        console.log('Propagating profile updates to all collections...');
        try {
          await propagateProfileUpdates(userId, fieldsToPropagate);
          console.log('Profile updates successfully propagated');
        } catch (propagateError) {
          console.error('Error propagating profile updates:', propagateError);
          // Don't block the user from continuing even if propagation fails
        }
      }
      
      // Update local profile state to reflect changes
      setProfile({
        ...editedProfile,
        height,
        weight,
        bodyType,
        birthday,
        updatedAt: new Date()
      });
      
      Alert.alert(
        'Profile Updated', 
        'Your profile information has been updated successfully.',
        [{ text: 'OK', onPress: () => setEditMode(false) }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'There was a problem updating your profile. Please try again.');
    }
  };

  const handleOpenModal = (section: string) => {
    console.log(`Opening modal for section: ${section}`);
    setSelectedSection(section);
    setModalVisible(true);
    
    // On Android, we might need a slight delay to ensure state is updated
    if (Platform.OS === 'android') {
      setTimeout(() => {
        console.log(`Modal should be visible now for section: ${section}`);
      }, 100);
    }
  };

  const handleCloseModal = () => {
    // First hide the modal
    setModalVisible(false);
    
    // Then reset the selected section after a short delay
    // This prevents the "null section" warning during modal close animation
    setTimeout(() => {
      setSelectedSection(null);
    }, 300);
  };
  
  // Date picker functions
  const onDateChange = (event: any, date?: Date) => {
    setDatePickerVisible(Platform.OS === 'ios');
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date);
      // Format date as MM/DD/YYYY
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      setBirthday(`${month}/${day}/${year}`);
    }
  };
  
  const showDatePicker = () => {
    setDatePickerVisible(true);
  };
  
  // Handle selection for height, weight, and body type
  const handleHeightSelection = (item: { cm: number, display: string }) => {
    setHeight(item.display);
    handleCloseModal();
  };
  
  const handleWeightSelection = (item: { kg: number, display: string }) => {
    setWeight(item.display);
    handleCloseModal();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account', 
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion', 
              'This will permanently delete all your data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Yes, Delete', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const auth = getAuth();
                      const currentUser = auth.currentUser;
                      if (!currentUser) {
                        Alert.alert('Error', 'No user is currently signed in.');
                        return;
                      }

                      // 1. Delete user document from Firestore (using modular API)
                      const userDocRef = doc(firestoreDB, 'users', currentUser.uid);
                      await deleteDoc(userDocRef);
                      console.log('User document deleted from Firestore');

                      // 2. Delete Firebase Auth user account (using modular API)
                      await deleteUser(currentUser);
                      console.log('Firebase Auth user deleted');

                      // 3. Clear local storage
                      await AsyncStorage.removeItem('firebaseUserToken');
                      console.log('Local storage cleared');

                      // 4. Reset app state
                      appStateManager.setAuthenticated(false);
                      appStateManager.setOnboarding(false);
                      
                      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
                    } catch (error: any) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again.');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // Profile picture selection handler
  const handleProfilePictureSelection = () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose how you\'d like to update your profile picture',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const image = await takePhotoWithCamera();
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
            try {
              const image = await selectImageFromLibrary();
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

  // Profile picture upload handler
  const uploadProfilePicture = async (image: ImageAsset) => {
    try {
      // Wait for auth state to be fully initialized
      const auth = getAuth();
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          resolve(user);
        });
      });
      
      const currentUser = auth.currentUser;
      console.log('🔐 Profile Picture Upload: Current user:', currentUser ? 'Authenticated' : 'Not authenticated');
      console.log('🔐 Profile Picture Upload: User ID:', currentUser?.uid);
      console.log('🔐 Profile Picture Upload: Profile data:', profile ? 'Available' : 'Not available');
      
      if (!currentUser) {
        console.error('🔐 Profile Picture Upload: Authentication failed - no current user');
        Alert.alert('Error', 'You must be logged in to update your profile picture.');
        return;
      }
      
      if (!profile) {
        console.warn('🔐 Profile Picture Upload: Profile data not loaded yet, but proceeding with upload');
      }
      
      setIsUploadingImage(true);
      setUploadProgress(0);
      
      // Upload image to Firebase Storage
      const imageUrl = await uploadImageAndGetURL(
        image.uri,
        `users/${currentUser.uid}/profile_pictures`,
        `profile_${currentUser.uid}_${Date.now()}`,
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // Update the user's profile with the new image URL
      await db.collection('users').doc(currentUser.uid).update({
        profilePictureURL: imageUrl,
        updatedAt: new Date()
      });
      
      // Update Firebase Auth user profile
      try {
        await currentUser.updateProfile({
          photoURL: imageUrl
        });
      } catch (authError) {
        console.error('Error updating Firebase Auth profile:', authError);
      }
      
      // Propagate profile picture update to other collections
      await propagateProfileUpdates(currentUser.uid, { profilePictureURL: imageUrl });
      
      // Update local state
      const updatedProfile = {
        ...profile,
        profilePictureURL: imageUrl,
        updatedAt: new Date()
      };
      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      
      Alert.alert('Success', 'Your profile picture has been updated.');
      setIsUploadingImage(false);
      
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const savePreferences = async (sizeInfo: {
    topsSize?: string;
    bottomsSize?: string;
    shoeSize?: string;
  }) => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Create or update user preferences
      const updatedPreferences = {
        ...(preferences || {
          preferredStyles: [],
          preferredBrands: [],
          colorPreferences: [],
          emailNotifications: true,
          pushNotifications: true,
        }),
        ...sizeInfo
      };
      
      await setUserPreferences(userId, updatedPreferences);
      setPreferences(updatedPreferences);
      
      Alert.alert('Preferences Updated', 'Your size information has been saved successfully.');
      handleCloseModal();
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    }
  };

  const saveEmail = async (email: string) => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    
    try {
      const currentUser = auth.currentUser;
      const userId = currentUser.uid;
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      
      // Update Firestore user document
      await db.collection('users').doc(userId).update({
        email: email,
        updatedAt: new Date()
      });
      
      // Update Firebase Auth user profile
      try {
        await currentUser.updateEmail(email);
      } catch (authError: any) {
        console.warn('Could not update Firebase Auth email:', authError.message);
        // Continue anyway - the email is saved in Firestore
      }
      
      // Propagate email update to other collections
      await propagateProfileUpdates(userId, { email });
      
      // Update local state
      const updatedProfile = {
        ...profile,
        email: email,
        updatedAt: new Date()
      };
      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      
      Alert.alert('Email Updated', 'Your email address has been saved successfully.');
      setEmailModalVisible(false);
      setEditingEmail('');
      
    } catch (error) {
      console.error('Error updating email:', error);
      Alert.alert('Error', 'Failed to update email address. Please try again.');
    }
  };

  const renderSettingItem = (
    icon: string, 
    title: string, 
    subtitle?: string, 
    value?: string | boolean | React.ReactElement, 
    onPress?: () => void,
    iconColor = mainColor
  ) => {
    return (
      <TouchableOpacity 
        style={[styles.settingItem, { borderBottomColor: borderColor }]} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.settingIconContainer}>
          <FeatherIcon name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: textColor }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: subTextColor }]}>{subtitle}</Text>}
        </View>
        <View style={styles.settingValueContainer}>
          {typeof value === 'string' ? (
            <Text style={[styles.settingValue, { color: subTextColor }]}>{value}</Text>
          ) : typeof value === 'boolean' ? (
            <Switch 
              value={value} 
              onValueChange={() => onPress && onPress()} 
              trackColor={{ false: borderColor, true: isDarkMode ? mainColor : `${mainColor}80` }}
              thumbColor={value ? (isDarkMode ? '#FFFFFF' : mainColor) : '#F4F3F4'}
              ios_backgroundColor={borderColor}
            />
          ) : value}
          {onPress && typeof value !== 'boolean' && (
            <Icon name="chevron-forward" size={18} color={subTextColor} style={styles.chevron} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render size preferences modal content
  const renderSizePreferencesModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Size Preferences</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.modalBody, { paddingBottom: 20 }]}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Enter your clothing sizes for better recommendations
          </Text>
          
          <View style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subTextColor }]}>Tops Size</Text>
              <TextInput 
                style={[styles.formInput, { backgroundColor: surfaceColor, color: textColor, borderColor }]}
                value={topSize}
                onChangeText={setTopSize}
                placeholder="e.g., S, M, L, XL"
                placeholderTextColor={subTextColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subTextColor }]}>Bottoms Size</Text>
              <TextInput 
                style={[styles.formInput, { backgroundColor: surfaceColor, color: textColor, borderColor }]}
                value={bottomSize}
                onChangeText={setBottomSize}
                placeholder="e.g., 30, 32, 8, 10"
                placeholderTextColor={subTextColor}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subTextColor }]}>Shoe Size</Text>
              <TextInput 
                style={[styles.formInput, { backgroundColor: surfaceColor, color: textColor, borderColor }]}
                value={shoeSize}
                onChangeText={setShoeSize}
                placeholder="e.g., US 9, EU 42"
                placeholderTextColor={subTextColor}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.saveModalButton, { backgroundColor: mainColor }]}
              onPress={() => savePreferences({ topsSize: topSize, bottomsSize: bottomSize, shoeSize })}
            >
              <Text style={styles.saveModalButtonText}>Save Sizes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render email input modal
  const renderEmailModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Add Email Address</Text>
          <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.modalBody, { paddingBottom: 20 }]}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Enter your email address to receive important notifications and updates
          </Text>
          
          <View style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: subTextColor }]}>Email Address</Text>
              <TextInput 
                style={[styles.formInput, { backgroundColor: surfaceColor, color: textColor, borderColor }]}
                value={editingEmail}
                onChangeText={setEditingEmail}
                placeholder="your@email.com"
                placeholderTextColor={subTextColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.saveModalButton, { backgroundColor: mainColor, opacity: editingEmail.trim() ? 1 : 0.6 }]}
              onPress={() => saveEmail(editingEmail.trim())}
              disabled={!editingEmail.trim()}
            >
              <Text style={styles.saveModalButtonText}>Save Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render gender selection modal
  const renderGenderModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Gender</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Select your gender (optional)
          </Text>
          
          {genderOptions.map((option, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.optionItem, 
                { borderBottomColor: borderColor },
                editedProfile?.userGender === option && styles.selectedOption
              ]}
              onPress={() => {
                handleInputChange('userGender', option);
                handleCloseModal();
              }}
            >
              <Text style={[
                styles.optionText, 
                { color: textColor },
                editedProfile?.userGender === option && { color: mainColor, fontWeight: '600' }
              ]}>
                {option}
              </Text>
              {editedProfile?.userGender === option && (
                <Icon name="checkmark" size={20} color={mainColor} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render body type selection modal
  const renderBodyTypeModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Body Type</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Select your body type (optional)
          </Text>
          
          {bodyTypeOptions.map((option, index) => (
            <TouchableOpacity 
              key={index}
              style={[
                styles.optionItem, 
                { borderBottomColor: borderColor },
                bodyType === option && styles.selectedOption
              ]}
              onPress={() => {
                setBodyType(option);
                handleCloseModal();
              }}
            >
              <Text style={[
                styles.optionText, 
                { color: textColor },
                bodyType === option && { color: mainColor, fontWeight: '600' }
              ]}>
                {option}
              </Text>
              {bodyType === option && (
                <Icon name="checkmark" size={20} color={mainColor} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };


  // Render measurements selection options
  const renderMeasurementsModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Measurements</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.modalBody, { paddingBottom: 20 }]}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Select your measurements
          </Text>
          
          <View style={styles.measOptionsList}>
            <TouchableOpacity 
              style={[styles.measurementOption, { backgroundColor: surfaceColor }]}
              onPress={() => {
                handleCloseModal();
                setTimeout(() => handleOpenModal('height'), 300);
              }}
            >
              <View style={styles.measurementOptionContent}>
                <Text style={[styles.measurementOptionTitle, { color: textColor }]}>Height</Text>
                <Text style={[styles.measurementOptionValue, { color: subTextColor }]}>
                  {height || 'Not set'}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.measurementOption, { backgroundColor: surfaceColor, marginTop: 16 }]}
              onPress={() => {
                handleCloseModal();
                setTimeout(() => handleOpenModal('weight'), 300);
              }}
            >
              <View style={styles.measurementOptionContent}>
                <Text style={[styles.measurementOptionTitle, { color: textColor }]}>Weight</Text>
                <Text style={[styles.measurementOptionValue, { color: subTextColor }]}>
                  {weight || 'Not set'}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.inputHelp, { color: subTextColor, marginTop: 16, textAlign: 'center' }]}>
            Tap an option to select your measurements. These help us provide better size recommendations.
          </Text>
        </View>
      </View>
    );
  };

  // Render birthday input modal
  const renderBirthdayModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Birthday</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <Text style={[styles.modalSectionTitle, { color: textColor }]}>
            Choose your birthday (optional)
          </Text>
          
          <View style={styles.modalForm}>
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'ios' ? (
                <View style={styles.dateSelection}>
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    textColor={textColor}
                    style={{ width: '100%' }}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: surfaceColor, borderColor }]}
                    onPress={showDatePicker}
                  >
                    <Text style={{ color: birthday ? textColor : subTextColor }}>
                      {birthday || 'Select your birthday'}
                    </Text>
                    <Icon name="calendar-outline" size={20} color={mainColor} />
                  </Pressable>
                  
                  {datePickerVisible && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1920, 0, 1)}
                    />
                  )}
                </>
              )}
              
              <Text style={[styles.inputHelp, { color: subTextColor, marginTop: 16 }]}>
                Your birthday will be used for personalized recommendations and birthday offers
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.saveModalButton, { backgroundColor: mainColor }]}
              onPress={handleCloseModal}
            >
              <Text style={styles.saveModalButtonText}>Save Birthday</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render height selection modal
  const renderHeightSelectionModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Select Height</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
          {heightOptions.map((item) => (
            <TouchableOpacity 
              key={item.cm.toString()}
              style={[
                styles.optionItem, 
                { borderBottomColor: borderColor },
                height === item.display && styles.selectedOption
              ]}
              onPress={() => handleHeightSelection(item)}
            >
              <Text style={[
                styles.optionText, 
                { color: textColor },
                height === item.display && { color: mainColor, fontWeight: '600' }
              ]}>
                {item.display}
              </Text>
              {height === item.display && (
                <Icon name="checkmark" size={20} color={mainColor} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render weight selection modal
  const renderWeightSelectionModal = () => {
    return (
      <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>Select Weight</Text>
          <TouchableOpacity onPress={handleCloseModal}>
            <Icon name="close-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 20 }}>
          {weightOptions.map((item) => (
            <TouchableOpacity 
              key={item.kg.toString()}
              style={[
                styles.optionItem, 
                { borderBottomColor: borderColor },
                weight === item.display && styles.selectedOption
              ]}
              onPress={() => handleWeightSelection(item)}
            >
              <Text style={[
                styles.optionText, 
                { color: textColor },
                weight === item.display && { color: mainColor, fontWeight: '600' }
              ]}>
                {item.display}
              </Text>
              {weight === item.display && (
                <Icon name="checkmark" size={20} color={mainColor} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render the correct modal content based on selectedSection
  const renderModalContent = () => {
    // Only log if we have a section to render
    if (selectedSection) {
      console.log(`Rendering modal content for section: ${selectedSection}`);
    }
    
    switch (selectedSection) {
      case 'sizes':
        return renderSizePreferencesModal();
      case 'gender':
        return renderGenderModal();
      case 'bodyType':
        return renderBodyTypeModal();
      case 'height':
        return renderHeightSelectionModal();
      case 'weight':
        return renderWeightSelectionModal();
      case 'measurements':
        return renderMeasurementsModal();
      case 'birthday':
        return renderBirthdayModal();
      default:
        // Only show warning if modal is visible but section is invalid
        if (modalVisible && selectedSection !== null) {
          console.warn(`No modal content for section: ${selectedSection}`);
        }
        return <View />;  // Return empty view instead of null
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={mainColor} />
        <Text style={[styles.loadingText, { color: subTextColor }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={mainColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
        <TouchableOpacity onPress={handleEditToggle}>
          <Text style={[styles.headerAction, { color: mainColor }]}>
            {editMode ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>ACCOUNT INFORMATION</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {editMode ? (
              // Editable Fields
              <>
                {/* Profile Picture Edit */}
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: borderColor }]}
                  onPress={handleProfilePictureSelection}
                  disabled={isUploadingImage}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Profile Picture</Text>
                                      <View style={styles.profilePictureEditContainer}>
                      <View style={styles.profilePictureEditWrapper}>
                        {editedProfile?.profilePictureURL ? (
                          <Image
                            source={{ uri: editedProfile.profilePictureURL }}
                            style={styles.profilePictureEdit}
                          />
                        ) : (
                          <View style={[styles.profilePictureEditInitials, { backgroundColor: mainColor }]}>
                            <Text style={styles.profileInitialsText}>{getUserInitials()}</Text>
                          </View>
                        )}
                        {isUploadingImage && (
                          <View style={styles.profileUploadOverlay}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.profileUploadText}>{Math.round(uploadProgress * 100)}%</Text>
                          </View>
                        )}
                      </View>
                    <View style={styles.profilePictureEditInfo}>
                      <Text style={[styles.profilePictureEditText, { color: textColor }]}>
                        Tap to change
                      </Text>
                      <Text style={[styles.profilePictureEditSubtext, { color: subTextColor }]}>
                        Camera or Library
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                
                {/* Bio Edit */}
                <View style={[styles.editItem, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Bio</Text>
                  <TextInput
                    style={[styles.editBioInput, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
                    value={editedProfile?.bio || ''}
                    onChangeText={(text) => handleInputChange('bio', text)}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor={subTextColor}
                    multiline
                    maxLength={150}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.inputHelp, { color: subTextColor }]}>
                    {(editedProfile?.bio || '').length}/150 characters
                  </Text>
                </View>

                <View style={[styles.editItem, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Full Name</Text>
                  <TextInput
                    style={[styles.editInput, { color: textColor, backgroundColor: surfaceColor }]}
                    value={editedProfile?.fullName || ''}
                    onChangeText={(text) => handleInputChange('fullName', text)}
                    placeholder="Enter your full name"
                    placeholderTextColor={subTextColor}
                  />
                </View>
                <View style={[styles.editItem, { borderBottomColor: borderColor }]}>
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Username</Text>
                  <TextInput
                    style={[styles.editInput, { color: textColor, backgroundColor: surfaceColor }]}
                    value={editedProfile?.username || ''}
                    onChangeText={(text) => handleInputChange('username', text)}
                    placeholder="Enter your username"
                    placeholderTextColor={subTextColor}
                  />
                  <Text style={[styles.inputHelp, { color: subTextColor }]}>
                    Used as your display name (lowercase, no spaces, only letters, numbers, and underscores)
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleOpenModal('gender')}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Gender</Text>
                  <View style={[styles.selectInput, { backgroundColor: surfaceColor }]}>
                    <Text style={{ color: editedProfile?.userGender ? textColor : subTextColor }}>
                      {editedProfile?.userGender || 'Select your gender'}
                    </Text>
                    <Icon name="chevron-forward" size={20} color={subTextColor} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleOpenModal('birthday')}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Birthday</Text>
                  <View style={[styles.selectInput, { backgroundColor: surfaceColor }]}>
                    <Text style={{ color: birthday ? textColor : subTextColor }}>
                      {birthday || 'Add your birthday'}
                    </Text>
                    <Icon name="chevron-forward" size={20} color={subTextColor} />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              // Display Fields
              <>
                {renderSettingItem('camera', 'Profile Picture', 'Your profile photo', undefined, handleEditToggle)}
                {renderSettingItem('file-text', 'Bio', 'Tell us about yourself', profile?.bio || 'Not set', handleEditToggle)}
                {renderSettingItem('user', 'Full Name', 'Your legal name', profile?.fullName || 'Not set', handleEditToggle)}
                {renderSettingItem('hash', 'Username', 'Your unique username', '@' + (profile?.username || 'username'), handleEditToggle)}
                {renderSettingItem('users', 'Gender', 'For size recommendations', profile?.userGender || 'Not specified', () => {
                  handleEditToggle();
                  setTimeout(() => handleOpenModal('gender'), 300);
                })}
                {renderSettingItem('calendar', 'Birthday', 'For personalized recommendations', profile?.birthday || 'Not specified', () => {
                  handleEditToggle();
                  setTimeout(() => handleOpenModal('birthday'), 300);
                })}
              </>
            )}
          </View>

          {/* Body Measurements Section */}
          <Text style={[styles.sectionHeader, { color: subTextColor, marginTop: 24 }]}>BODY MEASUREMENTS</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {editMode ? (
              // Editable Fields
              <>
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleOpenModal('measurements')}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Measurements</Text>
                  <View style={[styles.selectInput, { backgroundColor: surfaceColor }]}>
                    <Text style={{ color: (height || weight) ? textColor : subTextColor, maxWidth: width - 160 }} numberOfLines={1} ellipsizeMode="tail">
                      {height && weight ? `${height}, ${weight}` : 
                       height ? `${height}` : 
                       weight ? `${weight}` : 'Add your measurements'}
                    </Text>
                    <Icon name="chevron-forward" size={20} color={subTextColor} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleOpenModal('bodyType')}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Body Type</Text>
                  <View style={[styles.selectInput, { backgroundColor: surfaceColor }]}>
                    <Text style={{ color: bodyType ? textColor : subTextColor }}>
                      {bodyType || 'Select your body type'}
                    </Text>
                    <Icon name="chevron-forward" size={20} color={subTextColor} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editItem, { borderBottomColor: 'transparent' }]}
                  onPress={() => handleOpenModal('sizes')}
                >
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Clothing Sizes</Text>
                  <View style={[styles.selectInput, { backgroundColor: surfaceColor }]}>
                    <Text style={{ color: subTextColor }}>
                      {preferences ? 
                        `${preferences.topsSize || '-'} / ${preferences.bottomsSize || '-'} / ${preferences.shoeSize || '-'}` : 
                        'Set your clothing sizes'}
                    </Text>
                    <Icon name="chevron-forward" size={20} color={subTextColor} />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              // Display Fields
              <>
                {renderSettingItem(
                  'activity', 
                  'Measurements', 
                  'For better size recommendations', 
                  (profile?.height || profile?.weight) ?
                    `${profile.height || ''} ${profile.height && profile.weight ? '/' : ''} ${profile.weight || ''}` :
                    'Not specified',
                  () => handleOpenModal('measurements')
                )}
                {renderSettingItem(
                  'aperture', 
                  'Body Type', 
                  'For style recommendations', 
                  profile?.bodyType || 'Not specified',
                  () => {
                    handleEditToggle();
                    setTimeout(() => handleOpenModal('bodyType'), 300);
                  }
                )}
                {renderSettingItem(
                  'shopping-bag', 
                  'Clothing Sizes', 
                  'Tops / Bottoms / Shoes', 
                  preferences ? 
                    `${preferences.topsSize || '-'} / ${preferences.bottomsSize || '-'} / ${preferences.shoeSize || '-'}` : 
                    'Not specified',
                  () => handleOpenModal('sizes')
                )}
              </>
            )}
          </View>

          {editMode && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: mainColor }]} 
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Email & Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>EMAIL & SECURITY</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'mail', 
              'Email Address', 
              profile?.email ? 'Your account email' : 'Tap to add your email', 
              profile?.email || 'Not set',
              !profile?.email ? () => {
                setEditingEmail('');
                setEmailModalVisible(true);
              } : undefined
            )}
            {renderSettingItem(
              'shield', 
              'Change Password', 
              'Update your password', 
              undefined, 
              () => Alert.alert('Change Password', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'lock', 
              'Two-Factor Authentication', 
              'Add an extra layer of security', 
              false, 
              () => Alert.alert('Two-Factor Authentication', 'This feature will be implemented in a future update.')
            )}
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>NOTIFICATIONS</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'bell', 
              'Push Notifications', 
              'Get mobile alerts', 
              preferences?.pushNotifications ?? true, 
              () => {
                if (preferences) {
                  const auth = getAuth();
                  setUserPreferences(auth.currentUser!.uid, {
                    ...preferences,
                    pushNotifications: !preferences.pushNotifications
                  }).then(() => {
                    setPreferences({
                      ...preferences,
                      pushNotifications: !preferences.pushNotifications
                    });
                  });
                }
              }
            )}
            {renderSettingItem(
              'mail', 
              'Email Notifications', 
              'Get updates in your inbox', 
              preferences?.emailNotifications ?? true, 
              () => {
                if (preferences) {
                  const auth = getAuth();
                  setUserPreferences(auth.currentUser!.uid, {
                    ...preferences,
                    emailNotifications: !preferences.emailNotifications
                  }).then(() => {
                    setPreferences({
                      ...preferences,
                      emailNotifications: !preferences.emailNotifications
                    });
                  });
                }
              }
            )}
            {renderSettingItem(
              'heart', 
              'Likes and Comments', 
              'When someone likes your outfit', 
              true, 
              () => Alert.alert('Likes Notifications', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'tag', 
              'New Products', 
              'When items matching your style arrive', 
              true, 
              () => Alert.alert('Product Notifications', 'This feature will be implemented in a future update.')
            )}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>APP SETTINGS</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'moon', 
              'Dark Mode', 
              'Switch app appearance', 
              isDarkMode, 
              toggleTheme
            )}
            {renderSettingItem(
              'globe', 
              'Language', 
              'Set your preferred language', 
              'English', 
              () => Alert.alert('Language Settings', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'download', 
              'Download Quality', 
              'Image quality settings', 
              'High', 
              () => Alert.alert('Download Settings', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'hard-drive', 
              'Clear Cache', 
              'Free up storage space', 
              undefined, 
              () => Alert.alert('Clear Cache', 'This feature will be implemented in a future update.')
            )}
          </View>
        </View>

        {/* About & Help */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>ABOUT & HELP</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'help-circle', 
              'Help Center', 
              'Get support and answers', 
              undefined, 
              () => Alert.alert('Help Center', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'file-text', 
              'Terms of Service', 
              'App usage terms', 
              undefined, 
              () => Alert.alert('Terms of Service', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'shield', 
              'Privacy Policy', 
              'How we handle your data', 
              undefined, 
              () => Alert.alert('Privacy Policy', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'info', 
              'About DripOut', 
              'Version information', 
              'v1.0.0', 
              () => Alert.alert('DripOut', 'Version 1.0.0\nDeveloped for Senior Project')
            )}
          </View>
        </View>

        {/* Development Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>DEVELOPMENT</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'refresh-cw', 
              'Start Onboarding Now', 
              'Immediately go to onboarding flow', 
              undefined, 
              async () => {
                Alert.alert(
                  'Start Onboarding', 
                  'This will take you to the onboarding flow now. Any current onboarding selections will be cleared.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Start Onboarding', 
                      onPress: async () => {
                        try {
                          console.log('🔴 Starting onboarding reset flow');
                          
                          // Reset onboarding status
                          await resetOnboardingStatus();
                          
                          // Clear any existing onboarding data from storage
                          await AsyncStorage.removeItem('selectedStyles');
                          await AsyncStorage.removeItem('selectedBrands');
                          await AsyncStorage.removeItem('sizingData');
                          await AsyncStorage.removeItem('onboardingCompletedSteps');
                          await AsyncStorage.removeItem('onboardingFilledSteps');
                          await AsyncStorage.removeItem('sessionSkippedSteps');
                          console.log('🟡 Cleared AsyncStorage data');
                          
                          // Context will be automatically cleared when onboarding starts fresh
                          console.log('🟡 AsyncStorage cleared - context will reset on onboarding start');
                          
                          // Set app state to require onboarding
                          appStateManager.setOnboarding(true);
                          
                          // Small delay to ensure context clears before navigation
                          setTimeout(() => {
                            console.log('🟢 Navigating to onboarding');
                            // Navigate to onboarding
                            navigation.navigate('Onboarding' as any, { directNavigation: true });
                          }, 100);
                          
                        } catch (error) {
                          console.error('Error starting onboarding:', error);
                          Alert.alert('Error', 'Failed to start onboarding. Please try again.');
                        }
                      }
                    }
                  ]
                );
              },
              secondaryColor
            )}
          </View>
        </View>
        
        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>ACCOUNT ACTIONS</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'log-out', 
              'Sign Out', 
              'Log out of your account', 
              undefined, 
              async () => {
                try {
                  await signOutUser();
                } catch (error) {
                  console.error('Sign out error:', error);
                  Alert.alert('Sign Out Error', 'An error occurred while signing out. Please try again.');
                }
              },
              accentColor
            )}
            {renderSettingItem(
              'trash-2', 
              'Delete Account', 
              'Permanently delete your data', 
              undefined, 
              handleDeleteAccount,
              dangerColor
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: subTextColor }]}>
            {profile?.userType === 'premium' ? 'Premium Account' : 'Standard Account'} • Created {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
          </Text>
        </View>
      </ScrollView>

      {/* Email Modal */}
      {emailModalVisible && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEmailModalVisible(false)}
          statusBarTranslucent={true}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[styles.modalContainer, { backgroundColor: modalBgColor }]}
          >
            {renderEmailModal()}
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Selection/Form Modals */}
      {modalVisible && selectedSection && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseModal}
          statusBarTranslucent={true}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[styles.modalContainer, { backgroundColor: modalBgColor }]}
          >
            {renderModalContent()}
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    ...defaultTextStyle,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '600',
  },
  headerAction: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    ...defaultTextStyle,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  settingsGroup: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  settingSubtitle: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...defaultTextStyle,
    fontSize: 15,
    marginRight: 4,
  },
  chevron: {
    marginLeft: 4,
  },
  editItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editLabel: {
    ...defaultTextStyle,
    fontSize: 13,
    marginBottom: 8,
  },
  editInput: {
    ...defaultTextStyle,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    ...defaultTextStyle,
    fontSize: 13,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%', // Ensure full width
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
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
  modalBody: {
    padding: 16,
    paddingBottom: 0,
    flexGrow: 1,
  },
  modalSectionTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    marginBottom: 16,
  },
  optionsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectedOption: {
    backgroundColor: 'rgba(239, 61, 71, 0.08)',
  },
  optionText: {
    ...defaultTextStyle,
    fontSize: 16,
  },
  modalForm: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    ...defaultTextStyle,
    fontSize: 14,
    marginBottom: 8,
  },
  formInput: {
    ...defaultTextStyle,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputHelp: {
    ...defaultTextStyle,
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  saveModalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveModalButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  dateSelection: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  measOptionsList: {
    marginVertical: 16,
  },
  measurementOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
  },
  measurementOptionContent: {
    flex: 1,
  },
  measurementOptionTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  measurementOptionValue: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  // Profile editing styles
  profilePictureEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  profilePictureEditWrapper: {
    position: 'relative',
    marginRight: 16,
  },
      profilePictureEdit: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    profilePictureEditInitials: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileInitialsText: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight: '700',
    },
  profileUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileUploadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  profilePictureEditInfo: {
    flex: 1,
  },
  profilePictureEditText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '500',
  },
  profilePictureEditSubtext: {
    ...defaultTextStyle,
    fontSize: 14,
    marginTop: 2,
  },
  editBioInput: {
    ...defaultTextStyle,
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginTop: 8,
  },
});

export default SettingsScreen;