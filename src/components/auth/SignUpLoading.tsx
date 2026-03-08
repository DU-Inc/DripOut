import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from "../../styles/themeprovider";
import { Dimensions } from 'react-native';
import AnimatedLoadingIndicator from '../common/AnimatedLoadingIndicator';

// Get device dimensions
const { width } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

const SignUpLoading: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.contentContainer}>
        <AnimatedLoadingIndicator 
          text="Creating your account..."
          size="large"
        />
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
    padding: normalize(30),
    backgroundColor: 'transparent',
  }
});

export default SignUpLoading; 