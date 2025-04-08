// src/screens/UserPreferencesScreen.tsx

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Button, 
  ActivityIndicator, 
  ScrollView, 
  Modal, 
  TextInput, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Switch 
} from 'react-native';
import { db } from '../../Config/firebaseconfig';
import { getAuth } from 'firebase/auth';
import { setUserPreferences, UserPreferences } from '../../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot for real-time updates
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';

// Initialize auth with proper typing
const auth = getAuth();

const UserPreferencesScreen: React.FC = () => {
  const { isDarkMode, toggleTheme, themeMode, setThemeMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility
  const [editPreferencesData, setEditPreferencesData] = useState<UserPreferences | null>(null); // State for editable preferences data
  
  // Theme-based colors
  const backgroundColor = isDarkMode ? '#121212' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F1F2' : '#202020';
  const secondaryTextColor = isDarkMode ? '#A8A8A8' : '#757575';
  const cardBgColor = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A2A' : '#EEEEEE';
  const accentColor = isDarkMode ? '#FF6B6B' : '#EF3D47';

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'user_preferences', userId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setPreferences(docSnapshot.data() as UserPreferences);
        } else {
          setPreferences(null); // No preferences found
        }
      });

      setLoading(false);

      // Clean up the listener
      return () => unsubscribe();
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  const openEditModal = () => {
    setEditPreferencesData(preferences); // Pre-fill the modal with the current preferences data
    setIsModalVisible(true);
  };

  const handleSavePreferences = async () => {
    if (auth.currentUser && editPreferencesData) {
      const userId = auth.currentUser.uid;
      await setUserPreferences(userId, editPreferencesData);
      Alert.alert('Preferences updated successfully!');
      setIsModalVisible(false); // Close the modal
    }
  };

  // Updated handleChange function to accept different types based on the field
  const handleChange = (field: keyof UserPreferences, value: string | string[] | boolean) => {
    setEditPreferencesData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleAddPreferences = async () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const defaultPreferences: UserPreferences = {
        preferredStyles: [],
        preferredBrands: [],
        topsSize: '',
        bottomsSize: '',
        shoeSize: '',
        colorPreferences: [],
        emailNotifications: true,
        pushNotifications: true,
      };
      await setUserPreferences(userId, defaultPreferences);
      Alert.alert('Preferences added successfully!');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: backgroundColor }]}>
      {/* Dark Mode Toggle Section */}
      <View style={[styles.section, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
        <View style={styles.sectionHeader}>
          <Icon name="moon-outline" size={24} color={accentColor} style={styles.sectionIcon} />
          <Text style={[styles.sectionTitle, { color: textColor }]}>Appearance</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.themeOption, 
            { borderBottomColor: borderColor },
            themeMode === 'system' && styles.selectedThemeOption
          ]}
          onPress={() => setThemeMode('system')}
        >
          <View style={styles.themeOptionLeft}>
            <Icon name="phone-portrait-outline" size={22} color={themeMode === 'system' ? accentColor : secondaryTextColor} style={styles.themeIcon} />
            <View>
              <Text style={[styles.themeOptionLabel, { color: textColor }]}>Use System Setting</Text>
              <Text style={[styles.themeOptionSubLabel, { color: secondaryTextColor }]}>Automatically match device theme</Text>
            </View>
          </View>
          {themeMode === 'system' && (
            <Icon name="checkmark" size={22} color={accentColor} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.themeOption, 
            { borderBottomColor: borderColor },
            themeMode === 'light' && styles.selectedThemeOption
          ]}
          onPress={() => setThemeMode('light')}
        >
          <View style={styles.themeOptionLeft}>
            <Icon name="sunny-outline" size={22} color={themeMode === 'light' ? accentColor : secondaryTextColor} style={styles.themeIcon} />
            <View>
              <Text style={[styles.themeOptionLabel, { color: textColor }]}>Light</Text>
              <Text style={[styles.themeOptionSubLabel, { color: secondaryTextColor }]}>Classic light interface</Text>
            </View>
          </View>
          {themeMode === 'light' && (
            <Icon name="checkmark" size={22} color={accentColor} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.themeOption,
            themeMode === 'dark' && styles.selectedThemeOption
          ]}
          onPress={() => setThemeMode('dark')}
        >
          <View style={styles.themeOptionLeft}>
            <Icon name="moon-outline" size={22} color={themeMode === 'dark' ? accentColor : secondaryTextColor} style={styles.themeIcon} />
            <View>
              <Text style={[styles.themeOptionLabel, { color: textColor }]}>Dark</Text>
              <Text style={[styles.themeOptionSubLabel, { color: secondaryTextColor }]}>Optimized for low light</Text>
            </View>
          </View>
          {themeMode === 'dark' && (
            <Icon name="checkmark" size={22} color={accentColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* Preferences Section */}
      {preferences ? (
        <View style={[styles.section, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
          <View style={styles.sectionHeader}>
            <Icon name="options-outline" size={24} color={accentColor} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Style Preferences</Text>
          </View>
          
          <View style={styles.preferencesItem}>
            <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Preferred Styles</Text>
            <Text style={[styles.preferenceValue, { color: textColor }]}>
              {preferences.preferredStyles.join(', ') || 'Not set'}
            </Text>
          </View>
          
          <View style={styles.preferencesItem}>
            <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Preferred Brands</Text>
            <Text style={[styles.preferenceValue, { color: textColor }]}>
              {preferences.preferredBrands.join(', ') || 'Not set'}
            </Text>
          </View>
          
          <View style={styles.preferencesRow}>
            <View style={styles.preferencesColumn}>
              <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Tops Size</Text>
              <Text style={[styles.preferenceValue, { color: textColor }]}>
                {preferences.topsSize || 'Not set'}
              </Text>
            </View>
            
            <View style={styles.preferencesColumn}>
              <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Bottoms Size</Text>
              <Text style={[styles.preferenceValue, { color: textColor }]}>
                {preferences.bottomsSize || 'Not set'}
              </Text>
            </View>
            
            <View style={styles.preferencesColumn}>
              <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Shoe Size</Text>
              <Text style={[styles.preferenceValue, { color: textColor }]}>
                {preferences.shoeSize || 'Not set'}
              </Text>
            </View>
          </View>
          
          <View style={styles.preferencesItem}>
            <Text style={[styles.preferenceLabel, { color: secondaryTextColor }]}>Preferred Colors</Text>
            <Text style={[styles.preferenceValue, { color: textColor }]}>
              {preferences.colorPreferences.join(', ') || 'Not set'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: accentColor }]}
            onPress={openEditModal}
          >
            <Text style={styles.editButtonText}>Edit Preferences</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.section, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
          <View style={styles.noPreferencesContainer}>
            <Icon name="settings-outline" size={50} color={accentColor} style={{ marginBottom: 16 }} />
            <Text style={[styles.noPreferencesText, { color: textColor }]}>No preferences found</Text>
            <Text style={[styles.noPreferencesSubtext, { color: secondaryTextColor }]}>
              Set up your style preferences to get personalized recommendations
            </Text>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: accentColor, marginTop: 20 }]}
              onPress={handleAddPreferences}
            >
              <Text style={styles.editButtonText}>Add Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Notifications Section */}
      {preferences && (
        <View style={[styles.section, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
          <View style={styles.sectionHeader}>
            <Icon name="notifications-outline" size={24} color={accentColor} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Email Notifications</Text>
            <Switch
              value={preferences.emailNotifications}
              onValueChange={(value) => {
                if (editPreferencesData) {
                  handleChange('emailNotifications', value);
                  handleSavePreferences();
                }
              }}
              trackColor={{ false: '#767577', true: `${accentColor}80` }}
              thumbColor={preferences.emailNotifications ? accentColor : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: textColor }]}>Push Notifications</Text>
            <Switch
              value={preferences.pushNotifications}
              onValueChange={(value) => {
                if (editPreferencesData) {
                  handleChange('pushNotifications', value);
                  handleSavePreferences();
                }
              }}
              trackColor={{ false: '#767577', true: `${accentColor}80` }}
              thumbColor={preferences.pushNotifications ? accentColor : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          </View>
        </View>
      )}

      {/* Modal for editing preferences */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalView, { backgroundColor: cardBgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Edit Style Preferences</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Icon name="close-outline" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            {editPreferencesData && (
              <ScrollView style={styles.modalContent}>
                <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Preferred Styles (comma separated)</Text>
                <TextInput
                  placeholder="e.g. Casual, Formal, Sporty"
                  placeholderTextColor={secondaryTextColor}
                  value={editPreferencesData.preferredStyles.join(', ')}
                  onChangeText={(text) => handleChange('preferredStyles', text.split(', '))}
                  style={[styles.input, { 
                    color: textColor, 
                    backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                    borderColor: borderColor 
                  }]}
                />
                
                <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Preferred Brands (comma separated)</Text>
                <TextInput
                  placeholder="e.g. Nike, Adidas, H&M"
                  placeholderTextColor={secondaryTextColor}
                  value={editPreferencesData.preferredBrands.join(', ')}
                  onChangeText={(text) => handleChange('preferredBrands', text.split(', '))}
                  style={[styles.input, { 
                    color: textColor, 
                    backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                    borderColor: borderColor 
                  }]}
                />
                
                <View style={styles.inputRow}>
                  <View style={styles.inputColumn}>
                    <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Tops Size</Text>
                    <TextInput
                      placeholder="e.g. M"
                      placeholderTextColor={secondaryTextColor}
                      value={editPreferencesData.topsSize}
                      onChangeText={(text) => handleChange('topsSize', text)}
                      style={[styles.input, { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                        borderColor: borderColor 
                      }]}
                    />
                  </View>
                  
                  <View style={styles.inputColumn}>
                    <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Bottoms Size</Text>
                    <TextInput
                      placeholder="e.g. 32"
                      placeholderTextColor={secondaryTextColor}
                      value={editPreferencesData.bottomsSize}
                      onChangeText={(text) => handleChange('bottomsSize', text)}
                      style={[styles.input, { 
                        color: textColor, 
                        backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                        borderColor: borderColor 
                      }]}
                    />
                  </View>
                </View>
                
                <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Shoe Size</Text>
                <TextInput
                  placeholder="e.g. 10"
                  placeholderTextColor={secondaryTextColor}
                  value={editPreferencesData.shoeSize}
                  onChangeText={(text) => handleChange('shoeSize', text)}
                  style={[styles.input, { 
                    color: textColor, 
                    backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                    borderColor: borderColor 
                  }]}
                />
                
                <Text style={[styles.inputLabel, { color: secondaryTextColor }]}>Preferred Colors (comma separated)</Text>
                <TextInput
                  placeholder="e.g. Blue, Black, White"
                  placeholderTextColor={secondaryTextColor}
                  value={editPreferencesData.colorPreferences.join(', ')}
                  onChangeText={(text) => handleChange('colorPreferences', text.split(', '))}
                  style={[styles.input, { 
                    color: textColor, 
                    backgroundColor: isDarkMode ? '#252525' : '#f5f5f5',
                    borderColor: borderColor 
                  }]}
                />
                
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: accentColor }]}
                  onPress={handleSavePreferences}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontSize: 16,
  },
  // Theme option styles
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  selectedThemeOption: {
    backgroundColor: 'rgba(117, 98, 250, 0.05)',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    marginRight: 14,
    width: 24,
    alignItems: 'center',
  },
  themeOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  themeOptionSubLabel: {
    fontSize: 13,
  },
  preferencesItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  preferencesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  preferencesColumn: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  preferenceValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  noPreferencesContainer: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPreferencesText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  noPreferencesSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputColumn: {
    width: '48%',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  preferencesContainer: {
    padding: 20,
  },
});

export default UserPreferencesScreen;
