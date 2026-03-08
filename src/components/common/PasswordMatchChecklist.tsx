import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from "../../styles/themeprovider";

interface PasswordMatchChecklistProps {
  password: string;
  confirmPassword: string;
  showChecklist: boolean; // Only show after user stops typing or moves to next field
  passwordValid: boolean; // Add property to check if password is valid
  title?: string; // Kept for backwards compatibility but not used
}

const PasswordMatchChecklist: React.FC<PasswordMatchChecklistProps> = ({ 
  password, 
  confirmPassword,
  showChecklist,
  passwordValid
}) => {
  const { theme } = useTheme();
  const passwordsMatch = password === confirmPassword;
  
  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (showChecklist && passwordValid) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showChecklist, passwordValid]);
  
  const styles = StyleSheet.create({
    container: {
      marginVertical: 1.5,
      paddingVertical: 2,
      paddingHorizontal: 4,
      width: '100%',
    },
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 2,
    },
    requirementText: {
      marginLeft: 8,
      fontSize: 12,
      color: theme.text.secondary,
      flex: 1,
    }
  });

  // If not supposed to show checklist or password is not valid, return null
  if (!showChecklist || !passwordValid) {
    return null;
  }
  
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.requirementRow}>
        <Icon 
          name={passwordsMatch ? "checkbox-marked-circle-outline" : "checkbox-blank-circle-outline"}
          size={16} 
          color={passwordsMatch ? theme.primary : theme.text.secondary} 
        />
        <Text style={styles.requirementText}>
          {passwordsMatch ? "Passwords match" : "Passwords must match"}
        </Text>
      </View>
    </Animated.View>
  );
};

export default PasswordMatchChecklist; 