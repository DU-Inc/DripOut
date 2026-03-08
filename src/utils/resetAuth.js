import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const resetAuthState = async () => {
  try {
    // Sign out from Firebase
    await auth().signOut();
    
    // Clear all AsyncStorage data
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    
    console.log('Auth state reset successful');
    return true;
  } catch (error) {
    console.error('Error resetting auth state:', error);
    return false;
  }
}; 