import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from "../../styles/themeprovider";

export interface PasswordRequirement {
  id: string;
  text: string;
  validator: (password: string) => boolean;
  isMet: boolean;
}

interface PasswordChecklistProps {
  password: string;
  requirements: PasswordRequirement[];
  showChecklist: boolean; // Only show after user stops typing or moves to next field
  title?: string; // Kept for backwards compatibility but not used
}

const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ 
  password, 
  requirements,
  showChecklist
}) => {
  const { theme } = useTheme();
  
  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (showChecklist) {
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
  }, [showChecklist]);
  
  const styles = StyleSheet.create({
    container: {
      marginVertical: 2,
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
      color: theme.text.secondary, // Always use secondary text color for requirements
      flex: 1,
    },
  });

  // If not supposed to show checklist, return null
  if (!showChecklist) {
    return null;
  }
  
  // Check if all requirements are met
  const allRequirementsMet = requirements.every(req => req.isMet);
  
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {allRequirementsMet ? (
        <View style={styles.requirementRow}>
          <Icon 
            name="checkbox-marked-circle-outline" 
            size={16} 
            color={theme.primary} 
          />
          <Text style={styles.requirementText}>
            Password is valid
          </Text>
        </View>
      ) : (
        requirements.map((requirement) => (
          <View style={styles.requirementRow} key={requirement.id}>
            <Icon 
              name={requirement.isMet ? "checkbox-marked-circle-outline" : "checkbox-blank-circle-outline"} 
              size={16} 
              color={requirement.isMet ? theme.primary : theme.text.secondary} 
            />
            <Text style={styles.requirementText}>
              {requirement.text}
            </Text>
          </View>
        ))
      )}
    </Animated.View>
  );
};

export default PasswordChecklist; 