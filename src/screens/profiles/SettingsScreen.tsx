// src/screens/profiles/SettingsScreen.tsx

import React, { useEffect, useState, ReactNode } from 'react';
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
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../Config/firebaseconfig';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { UserProfile } from '../../services/firestoreService';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { resetOnboardingStatus } from '../../utils/resetOnboarding';

// Get the auth instance with proper typing
const auth = getAuth();

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  // Theme colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF'; // iOS card background
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const borderColor = isDarkMode ? '#38383A' : '#E5E5EA'; // iOS separator
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const secondaryColor = isDarkMode ? '#64D2FF' : '#5AC8FA'; // iOS light blue
  const accentColor = isDarkMode ? '#FF9F0A' : '#FF9500'; // iOS orange
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7'; // iOS system gray
  const secondarySurfaceColor = isDarkMode ? '#3A3A3C' : '#E5E5EA'; // iOS secondary background
  const dangerColor = isDarkMode ? '#FF453A' : '#FF3B30'; // iOS red

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
          setEditedProfile(data);
        } else {
          setProfile(null);
          setEditedProfile(null);
        }
        setLoading(false);
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
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (key: keyof UserProfile, value: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, [key]: value });
    }
  };

  const handleSaveProfile = async () => {
    if (!editedProfile || !auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'users', userId);
      
      // Add updatedAt timestamp
      const updatedProfile = {
        ...editedProfile,
        updatedAt: new Date()
      };
      
      await updateDoc(userRef, updatedProfile);
      
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
                  onPress: () => {
                    Alert.alert('Account Deletion', 'This feature will be implemented in a future update.');
                  }
                }
              ]
            );
          }
        }
      ]
    );
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
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Display Name</Text>
                  <TextInput
                    style={[styles.editInput, { color: textColor, backgroundColor: surfaceColor }]}
                    value={editedProfile?.userDisplayName || ''}
                    onChangeText={(text) => handleInputChange('userDisplayName', text)}
                    placeholder="Enter your display name"
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
                </View>
                <View style={[styles.editItem, { borderBottomColor: 'transparent' }]}>
                  <Text style={[styles.editLabel, { color: subTextColor }]}>Gender</Text>
                  <TextInput
                    style={[styles.editInput, { color: textColor, backgroundColor: surfaceColor }]}
                    value={editedProfile?.userGender || ''}
                    onChangeText={(text) => handleInputChange('userGender', text)}
                    placeholder="Enter your gender"
                    placeholderTextColor={subTextColor}
                  />
                </View>
              </>
            ) : (
              // Display Fields
              <>
                {renderSettingItem('user', 'Full Name', 'Your legal name', profile?.fullName || 'Not set')}
                {renderSettingItem('at-sign', 'Display Name', 'Name shown on your profile', profile?.userDisplayName || 'Not set')}
                {renderSettingItem('hash', 'Username', 'Your unique username', '@' + (profile?.username || 'username'))}
                {renderSettingItem('users', 'Gender', 'For size recommendations', profile?.userGender || 'Not specified')}
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            {editMode && (
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: mainColor }]} 
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Email & Security Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: subTextColor }]}>EMAIL & SECURITY</Text>
          <View style={[styles.settingsGroup, { backgroundColor: cardBgColor }]}>
            {renderSettingItem(
              'mail', 
              'Email Address', 
              'Your account email', 
              profile?.email || 'Not set'
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
              true, 
              () => Alert.alert('Push Notifications', 'This feature will be implemented in a future update.')
            )}
            {renderSettingItem(
              'mail', 
              'Email Notifications', 
              'Get updates in your inbox', 
              true, 
              () => Alert.alert('Email Notifications', 'This feature will be implemented in a future update.')
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
              'Reset Onboarding', 
              'Show onboarding flow on next login', 
              undefined, 
              async () => {
                await resetOnboardingStatus();
                Alert.alert(
                  'Onboarding Reset', 
                  'You will see the onboarding flow next time you log in.',
                  [{ text: 'OK' }]
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
              () => auth.signOut(),
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
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
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
  }
});

export default SettingsScreen;