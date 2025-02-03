import AsyncStorage from '@react-native-async-storage/async-storage';

export const restoreAuthSession = async () => {
  console.log('Attempting to restore user session...');
  const token = await AsyncStorage.getItem('firebaseUserToken');
  console.log('Retrieved token from AsyncStorage:', token);

  if (token) {
    console.log('Session found. Firebase will handle re-authentication automatically.');
  } else {
    console.log('No user session found');
  }
};
