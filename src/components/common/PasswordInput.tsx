import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from "../../styles/theme/ThemeContext";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type PasswordInputProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  isValid?: boolean;
  showChecklist?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
};

const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  isValid,
  showChecklist,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
}) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const requirements = [
    { label: 'At least 8 characters', check: value.length >= 8 },
    { label: 'Contains a number', check: /\d/.test(value) },
    { label: 'Contains an uppercase letter', check: /[A-Z]/.test(value) },
    { label: 'Contains a special character', check: /[!@#$%^&*]/.test(value) },
  ];

  const allRequirementsMet = requirements.every(req => req.check);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.text.secondary }, labelStyle]}>
          {label}
        </Text>
      )}
      <View style={[styles.inputContainer, { borderColor: error ? theme.error : theme.border }]}>
        <TextInput
          style={[
            styles.input,
            { color: theme.text.primary },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          onFocus={() => showChecklist && setShowRequirements(true)}
          onBlur={() => showChecklist && !allRequirementsMet && setShowRequirements(false)}
        />
        <View style={styles.rightContainer}>
          {isValid && (
            <Icon
              name="check-circle"
              size={20}
              color={theme.primary}
              style={styles.checkIcon}
            />
          )}
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Icon
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={theme.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>
      {showRequirements && showChecklist && (
        <View style={styles.requirementsContainer}>
          {requirements.map((req, index) => (
            <View key={index} style={styles.requirementItem}>
              <Icon
                name={req.check ? 'check-circle' : 'circle-outline'}
                size={16}
                color={req.check ? theme.primary : theme.text.tertiary}
              />
              <Text
                style={[
                  styles.requirementText,
                  { color: req.check ? theme.text.primary : theme.text.tertiary },
                ]}
              >
                {req.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {error && (
        <Text style={[styles.error, { color: theme.error }, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: 8,
  },
  eyeIcon: {
    padding: 4,
  },
  requirementsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default PasswordInput; 