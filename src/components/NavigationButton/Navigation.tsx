// src/navigations/Navigations.tsx
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/NavigationTypes';

export const useNavigateTo = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const navigateToUserProfile = () => {
    navigation.navigate('UserProfileScreen');
  };

  const navigateToUserPreferences = () => {
    navigation.navigate('UserPreferencesScreen');
  };

  return {
    navigateToUserProfile,
    navigateToUserPreferences,
  };
};
