import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { resetAuthState } from '../../utils/resetAuth';
import { useNavigation } from '@react-navigation/native';

const ResetAuthScreen = () => {
  const navigation = useNavigation();

  const handleReset = async () => {
    try {
      const success = await resetAuthState();
      if (success) {
        Alert.alert(
          'Success',
          'Authentication state has been reset. The app will now restart.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Force app reload
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to reset authentication state');
      }
    } catch (error) {
      console.error('Reset error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Authentication</Text>
      <Text style={styles.description}>
        This will sign you out and clear all stored data. You'll need to sign in again.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Reset and Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#EF3D47',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ResetAuthScreen; 