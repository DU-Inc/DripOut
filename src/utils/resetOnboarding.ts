import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility function to reset the onboarding status for testing
 * This can be called from a developer settings screen or from a debug menu
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    // Set onboarding status to false to trigger the onboarding flow on next launch
    await AsyncStorage.setItem('onboardingCompleted', 'false');
    console.log('Onboarding status reset successfully - user will see onboarding on next login');
    return Promise.resolve();
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
    return Promise.reject(error);
  }
};

/**
 * Utility function to skip onboarding (for testing)
 */
export const skipOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    console.log('Onboarding status set to completed - user will skip onboarding');
    return Promise.resolve();
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    return Promise.reject(error);
  }
};