import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, ScrollView, Modal, TextInput, StyleSheet, Alert, Image, ImageBackground } from 'react-native';
import { auth, db } from '../../Config/firebaseconfig';
import { createUserProfile, UserProfile } from '../../services/firestoreService';
import { doc, onSnapshot, Timestamp  } from 'firebase/firestore'; // Import onSnapshot for real-time updates

const UserProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal visibility
  const [editProfileData, setEditProfileData] = useState<UserProfile | null>(null); // State for editable profile data
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);

  const openDetailsModal = () => {
    setIsDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalVisible(false);
  };

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as UserProfile;
          
          // Check if createdAt is a Firestore Timestamp and convert it to JavaScript Date
          if (data.createdAt && data.createdAt instanceof Timestamp) {
            data.createdAt = data.createdAt.toDate(); // Convert Firestore Timestamp to Date
          }

          setProfile(data);
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
        userAge: undefined,
        userMusic: '',
        userGender: '',
        userDisplayName: '',
        userPronouns: '',
        userType: 'basic',
        bio: ''
      };
      await createUserProfile(userId, defaultProfile);
      Alert.alert('Profile added successfully!');
    }
  };

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    setEditProfileData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const fakeFashionPosts = [
    { imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    { imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
  ];


  return (
    <ScrollView>
      <ImageBackground
        source={require('../../assets/images/backphoto.jpg')}
        style={styles.bannerImage}
      >
        <View style={styles.profileImageContainer}>
          {profile && profile.profilePictureURL ? (
            <Image
              source={{ uri: profile.profilePictureURL }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={require('../../assets/images/profile.png')}
              style={styles.profileImage}
            />
          )}
        </View>
      </ImageBackground>
      {profile ? (
        <View style={styles.profileContainer}>
          <Text style={styles.nameText}>Name: {profile.fullName || 'Not set'}</Text>
          <Text style={styles.usernameText}>@{profile.username}</Text>
          <Text style={styles.bioText}>{profile.bio || 'This is your bio. Update it to tell the world about yourself.'}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>123</Text>
              <Text style={styles.statLabel}>Tweets</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>456</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>789</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {profile.userID === auth.currentUser?.uid ? (
            <View style={styles.actionButtons}>
              <Button title="View More Details" onPress={openDetailsModal} />
              <Button title="Edit Profile" onPress={openEditModal} />
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <Button title="Follow" onPress={() => Alert.alert('Follow button pressed')} />
              <Button title="Message" onPress={() => Alert.alert('Message button pressed')} />
            </View>
          )}
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

      {/* Modal for more profile details */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isDetailsModalVisible}
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>More Profile Details</Text>
          {profile && (
            <>
              {profile.createdAt && (
                <Text>Created At: {new Date(profile.createdAt).toLocaleString()}</Text>
              )}
              <Text>Full Name: {profile.fullName || 'Not set'}</Text>
              <Text>Profile Picture: {profile.profilePictureURL || 'Not set'}</Text>
              <Text>Is Verified: {profile.isVerified ? 'Yes' : 'No'}</Text>
              <Text>User Role: {profile.userRole}</Text>
              <Text>Age: {profile.userAge !== undefined ? profile.userAge.toString() : 'Not set'}</Text>
              <Text>Music Preference: {profile.userMusic || 'Not set'}</Text>
              <Text>Gender: {profile.userGender || 'Not set'}</Text>
              <Text>Display Name: {profile.userDisplayName || 'Not set'}</Text>
              <Text>Pronouns: {profile.userPronouns || 'Not set'}</Text>
              <Text>User Type: {profile.userType}</Text>
            </>
          )}
          <Button title="Close" onPress={closeDetailsModal} />
        </View>
      </Modal>

            {/* Fashion Gallery Section */}
            <View style={styles.fashionSection}>
        <Text style={styles.sectionHeader}></Text>
        <View style={styles.fashionGallery}>
          {fakeFashionPosts.map((post, index) => (
            <Image
              key={index}
              source={{ uri: post.imageUrl }}
              style={styles.fashionImage}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  profileContainer: {
    padding: 20,
    borderRadius: 10,
    margin: 15,
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
    alignItems: 'center',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  bannerImage: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
  },
  profileImageContainer: {
    alignSelf: 'center',
    marginTop: -60, // To overlap the banner
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  bioText: {
    marginVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#777',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 5,
  },
  nameText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#555',
    marginBottom: 10,
  },
  fashionSection: {
    marginTop: -70,
    margin: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  fashionGallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fashionImage: {
    width: '48%',
    height: 150,
    marginBottom: 10,
    borderRadius: 10,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: -5,
    textAlign: 'center',
  },
});

export default UserProfileScreen;
