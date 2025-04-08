import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import OnboardingBubbles from '../components/Onboarding/OnboardingBubbles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* global setTimeout */

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { selectedStyles, selectedBrands } = useOnboardingContext();
  
  useEffect(() => {
    console.log("OnboardingScreen mounted");
    console.log("Current context: styles =", selectedStyles, "brands =", selectedBrands);
  }, [selectedStyles, selectedBrands]);

  // Custom colors for a luxurious feel
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';

  console.log("OnboardingScreen render");
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Discover Your Style</Text>
        <Text style={[styles.subtitle, { color: subTextColor }]}>
          Let's personalize your experience. Select your favorite styles.
        </Text>
      </View>

      <View style={styles.bubblesContainer}>
        <OnboardingBubbles 
          type="styles"
          options={[
            'Casual', 'Formal', 'Streetwear', 'Athletic', 'Vintage',
            'Minimalist', 'Bohemian', 'Preppy', 'Grunge', 'Hipster',
            'Classic', 'Punk', 'Business', 'Retro', 'Sporty',
            'Urban', 'Chic', 'Elegant', 'Indie'
          ]}
          onSelectionChange={() => {}}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={async () => {
              try {
                // Mark onboarding as completed
                await AsyncStorage.setItem('onboardingCompleted', 'true');
                console.log("Skipping onboarding - navigating to main app");
                
                // Use replace instead of reset for more reliable navigation
                navigation.navigate('MainTabs');
                
                // Add fallback in case direct navigation fails
                setTimeout(() => {
                  if (navigation.isFocused()) {
                    console.log("Fallback navigation to brands screen");
                    navigation.navigate('OnboardingBrands');
                  }
                }, 300);
              } catch (error) {
                console.error("Navigation error:", error);
                // Fallback to next screen in onboarding flow
                navigation.navigate('OnboardingBrands');
              }
            }}
          >
            <Text style={[styles.skipText, { color: subTextColor }]}>Skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={() => {
              // Check if user has made any selections
              if (selectedStyles.length === 0) {
                // Show confirmation if no styles selected
                Alert.alert(
                  'No Styles Selected',
                  'Are you sure you want to continue without selecting any styles? You can always update your preferences later.',
                  [
                    {
                      text: 'Go Back',
                      style: 'cancel',
                    },
                    {
                      text: 'Continue',
                      onPress: () => navigation.navigate('OnboardingBrands')
                    },
                  ]
                );
              } else {
                // Proceed if styles are selected
                navigation.navigate('OnboardingBrands');
              }
            }}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  bubblesContainer: {
    flex: 1,
    marginVertical: 20,
    position: 'relative',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '55%', // Adjusted width for the button
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  skipButton: {
    padding: 10,
    width: '30%', // Adjusted width for the skip button
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default OnboardingScreen;
