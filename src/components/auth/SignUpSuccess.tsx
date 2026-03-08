import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from "../../styles/themeprovider";
import { Dimensions } from 'react-native';

// Get device dimensions
const { width } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

const SignUpSuccess: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentContainer}>
        <Icon 
          name="check-circle-outline" 
          size={normalize(100)} 
          color={theme.success} 
          style={styles.icon}
        />
        <Text style={[styles.title, { color: theme.text.primary }]}>
          Sign Up Successful!
        </Text>
        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            Your account has been successfully created. You're ready to start using DripOut!
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: normalize(24),
    maxWidth: '90%',
  },
  icon: {
    marginBottom: normalize(20),
  },
  title: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    marginTop: normalize(16),
    textAlign: 'center',
  },
  subtitleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: normalize(16),
    marginTop: normalize(16),
    textAlign: 'center',
    lineHeight: normalize(22),
  },
});

export default SignUpSuccess; 