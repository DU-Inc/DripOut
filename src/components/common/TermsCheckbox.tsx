import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from "../../styles/themeprovider";
import { createAuthStyles } from '../../styles/components/auth.styles';

interface TermsCheckboxProps {
  isChecked: boolean;
  onToggle: () => void;
}

const TermsCheckbox: React.FC<TermsCheckboxProps> = ({ isChecked, onToggle }) => {
  const { theme } = useTheme();
  // Use the existing auth styles assuming termsContainer, checkbox, termsText are defined there
  const styles = createAuthStyles(theme);

  const handlePress = () => {
    if (isChecked) {
      // If currently checked, show alert before unchecking
      Alert.alert(
        "Confirm Action",
        "You must agree to the terms and conditions to proceed. Are you sure you want to uncheck this box?",
        [
          {
            text: "Keep box checked",
            style: "cancel" // Does nothing, leaves box checked
          },
          {
            text: "Continue to uncheck",
            onPress: onToggle, // Call the original toggle function to uncheck
            style: "destructive"
          }
        ]
      );
    } else {
      // If currently unchecked, just check it directly
      onToggle();
    }
  };

  return (
    <View style={styles.termsContainer}>
      <TouchableOpacity onPress={handlePress} style={styles.checkbox}>
        <Icon
          name={isChecked ? 'checkbox-marked-circle-outline' : 'checkbox-blank-circle-outline'}
          size={20}
          color={theme.primary}
        />
      </TouchableOpacity>
      <Text style={styles.termsText}>
        This box is pre-selected to streamline your experience. By continuing, you confirm that you agree to our Terms of Service.
      </Text>
    </View>
  );
};

export default TermsCheckbox; 