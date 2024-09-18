// src/screens/UserPreferencesScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../../Config/firebaseconfig';
import { setUserPreferences, UserPreferences } from '../../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot for real-time updates



const UserPreferencesScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility
  const [editPreferencesData, setEditPreferencesData] = useState<UserPreferences | null>(null); // State for editable preferences data

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
    return <ActivityIndicator size="large" color="#0000ff" />;
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
    <ScrollView>
      {preferences ? (
        <View style={styles.preferencesContainer}>
          <Text>Preferred Styles: {preferences.preferredStyles.join(', ') || 'Not set'}</Text>
          <Text>Preferred Brands: {preferences.preferredBrands.join(', ') || 'Not set'}</Text>
          <Text>Tops Size: {preferences.topsSize || 'Not set'}</Text>
          <Text>Bottoms Size: {preferences.bottomsSize || 'Not set'}</Text>
          <Text>Shoe Size: {preferences.shoeSize || 'Not set'}</Text>
          <Text>Preferred Colors: {preferences.colorPreferences.join(', ') || 'Not set'}</Text>
          <Text>Email Notifications: {preferences.emailNotifications ? 'Enabled' : 'Disabled'}</Text>
          <Text>Push Notifications: {preferences.pushNotifications ? 'Enabled' : 'Disabled'}</Text>

          <Button title="Edit Preferences" onPress={openEditModal} />
        </View>
      ) : (
        <View style={styles.noPreferencesContainer}>
          <Text>No preferences found!</Text>
          <Button title="Add Preferences" onPress={handleAddPreferences} />
        </View>
      )}

      {/* Modal for editing preferences */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Edit Preferences</Text>
          {editPreferencesData && (
            <View>
              <TextInput
                placeholder="Preferred Styles (comma separated)"
                value={editPreferencesData.preferredStyles.join(', ')}
                onChangeText={(text) => handleChange('preferredStyles', text.split(', '))}
                style={styles.input}
              />
              <TextInput
                placeholder="Preferred Brands (comma separated)"
                value={editPreferencesData.preferredBrands.join(', ')}
                onChangeText={(text) => handleChange('preferredBrands', text.split(', '))}
                style={styles.input}
              />
              <TextInput
                placeholder="Tops Size"
                value={editPreferencesData.topsSize}
                onChangeText={(text) => handleChange('topsSize', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Bottoms Size"
                value={editPreferencesData.bottomsSize}
                onChangeText={(text) => handleChange('bottomsSize', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Shoe Size"
                value={editPreferencesData.shoeSize}
                onChangeText={(text) => handleChange('shoeSize', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Preferred Colors (comma separated)"
                value={editPreferencesData.colorPreferences.join(', ')}
                onChangeText={(text) => handleChange('colorPreferences', text.split(', '))}
                style={styles.input}
              />
              <Text>Email Notifications</Text>
              <Button
                title={editPreferencesData.emailNotifications ? 'Disable' : 'Enable'}
                onPress={() =>
                  handleChange('emailNotifications', !editPreferencesData.emailNotifications)
                }
              />
              <Text>Push Notifications</Text>
              <Button
                title={editPreferencesData.pushNotifications ? 'Disable' : 'Enable'}
                onPress={() =>
                  handleChange('pushNotifications', !editPreferencesData.pushNotifications)
                }
              />
              <Button title="Save Changes" onPress={handleSavePreferences} />
              <Button title="Close" onPress={() => setIsModalVisible(false)} />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  preferencesContainer: {
    padding: 20,
  },
  noPreferencesContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
});

export default UserPreferencesScreen;
