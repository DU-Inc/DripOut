import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeColors } from '../../styles/theme/colors';
import { text } from '../../styles/theme/text';

// Get device dimensions
const { width, height } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

export interface PasswordRequirement {
  id: string;
  text: string;
  validator: (pwd: string) => boolean;
  isMet: boolean;
}

interface PasswordChecklistProps {
  password: string;
  requirements: PasswordRequirement[];
  showChecklist: boolean;
  theme: ThemeColors;
}

interface PasswordMatchChecklistProps {
  password: string;
  confirmPassword: string;
  showChecklist: boolean;
  passwordValid: boolean;
  theme: ThemeColors;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ 
  password, 
  requirements, 
  showChecklist,
  theme
}) => {
  if (!showChecklist) {
    return null;
  }
  
  // Check if all requirements are met
  const allRequirementsMet = requirements.every(req => req.isMet);
  
  // Show a "Password valid" message if all requirements are met
  if (allRequirementsMet && password.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Icon 
            name="check-circle-outline"
            size={normalize(11)}
            color={theme.success} 
            style={styles.icon}
          />
          <Text style={[styles.validText, { color: theme.success }]}>
            {text.components.passwordChecklist.valid}
          </Text>
        </View>
      </View>
    );
  }
  
  // Otherwise show the detailed requirements
  return (
    <View style={styles.container}>
      {requirements.map((req) => (
        <View key={req.id} style={styles.row}>
          <Icon 
            name={req.isMet ? "check-circle-outline" : "circle-outline"} 
            size={normalize(10)}
            color={req.isMet ? theme.success : theme.text.secondary} 
            style={styles.icon}
          />
          <Text style={[
            styles.text, 
            { color: req.isMet ? theme.success : theme.text.secondary }
          ]}>
            {req.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

export const PasswordMatchChecklist: React.FC<PasswordMatchChecklistProps> = ({ 
  password, 
  confirmPassword, 
  showChecklist,
  passwordValid,
  theme
}) => {
  if (!showChecklist || !passwordValid) {
    return null;
  }
  
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Icon 
          name={passwordsMatch ? "check-circle-outline" : "circle-outline"} 
          size={normalize(10)}
          color={passwordsMatch ? theme.success : theme.text.secondary} 
          style={styles.icon}
        />
        <Text style={[
          styles.text, 
          { color: passwordsMatch ? theme.success : theme.text.secondary }
        ]}>
          {text.components.passwordChecklist.match}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(4),
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: normalize(2),
  },
  icon: {
    marginRight: normalize(6),
  },
  validText: {
    fontSize: normalize(11),
    fontWeight: '500',
  },
  text: {
    fontSize: normalize(11),
  },
}); 