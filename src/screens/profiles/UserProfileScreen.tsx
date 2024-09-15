// src/screens/UserProfileScreen.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../../Config/firebaseconfig';
import { getUserProfile, createUserProfile, UserProfile } from '../../services/firestoreService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/NavigationTypes';
import { doc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot for real-time updates

type UserProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UserProfileScreen'>;

const UserProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility
  const [editProfileData, setEditProfileData] = useState<UserProfile | null>(null); // State for editable profile data

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          setProfile(docSnapshot.data() as UserProfile);
        } else {
          setProfile(null); // No profile found
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
    setEditProfileData(profile); // Pre-fill the modal with the current profile data
    setIsModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (auth.currentUser && editProfileData) {
      const userId = auth.currentUser.uid;
      await createUserProfile(userId, {
        ...editProfileData,
        updatedAt: new Date(),
      });
      Alert.alert('Profile updated successfully!');
      setIsModalVisible(false); // Close the modal
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
        userAge: 0,
        userMusic: '',
        userGender: '',
        userDisplayName: '',
        userPronouns: '',
        userType: 'basic',
      };
      await createUserProfile(userId, defaultProfile);
      Alert.alert('Profile added successfully!');
    }
  };

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    setEditProfileData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <ScrollView>
      {profile ? (
        <View style={styles.profileContainer}>
          <Text>Email: {profile.email}</Text>
          <Text>Username: {profile.username}</Text>
          {profile.createdAt && (
            <Text>Created At: {new Date(profile.createdAt).toDateString()}</Text>
          )}
          <Text>Full Name: {profile.fullName || 'Not set'}</Text>
          <Text>Profile Picture: {profile.profilePictureURL || 'Not set'}</Text>
          <Text>Is Verified: {profile.isVerified ? 'Yes' : 'No'}</Text>
          <Text>User Role: {profile.userRole}</Text>
          <Text>Age: {profile.userAge ? profile.userAge.toString() : 'Not set'}</Text>
          <Text>Music Preference: {profile.userMusic || 'Not set'}</Text>
          <Text>Gender: {profile.userGender || 'Not set'}</Text>
          <Text>Display Name: {profile.userDisplayName || 'Not set'}</Text>
          <Text>Pronouns: {profile.userPronouns || 'Not set'}</Text>
          <Text>User Type: {profile.userType}</Text>

          <Button title="Edit Profile" onPress={openEditModal} />
        </View>
      ) : (
        <View style={styles.noProfileContainer}>
          <Text>No profile found!</Text>
          <Button title="Add Profile" onPress={handleAddProfile} />
        </View>
      )}

      {/* Modal for editing profile */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Edit Profile</Text>
          {editProfileData && (
            <View>
              <TextInput
                placeholder="Username"
                value={editProfileData.username}
                onChangeText={(text) => handleChange('username', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Full Name"
                value={editProfileData.fullName || ''}
                onChangeText={(text) => handleChange('fullName', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Age"
                value={editProfileData.userAge ? editProfileData.userAge.toString() : ''}
                keyboardType="numeric"
                onChangeText={(text) => handleChange('userAge', parseInt(text))}
                style={styles.input}
              />
              <TextInput
                placeholder="Music Preference"
                value={editProfileData.userMusic || ''}
                onChangeText={(text) => handleChange('userMusic', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Gender"
                value={editProfileData.userGender || ''}
                onChangeText={(text) => handleChange('userGender', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Display Name"
                value={editProfileData.userDisplayName || ''}
                onChangeText={(text) => handleChange('userDisplayName', text)}
                style={styles.input}
              />
              <TextInput
                placeholder="Pronouns"
                value={editProfileData.userPronouns || ''}
                onChangeText={(text) => handleChange('userPronouns', text)}
                style={styles.input}
              />
              <Button title="Save Changes" onPress={handleSaveProfile} />
              <Button title="Close" onPress={() => setIsModalVisible(false)} />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    padding: 20,
  },
  noProfileContainer: {
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

export default UserProfileScreen;
