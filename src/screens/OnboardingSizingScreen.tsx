import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { auth } from '../Config/firebaseconfig';
import { setUserPreferences } from '../services/firestoreService';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingSizingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingSizing'>;

const OnboardingSizingScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const navigation = useNavigation<OnboardingSizingScreenNavigationProp>();
  const { selectedStyles, selectedBrands } = useOnboardingContext();
  
  const [topsSize, setTopsSize] = useState('');
  const [bottomsSize, setBottomsSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Custom colors for a luxurious feel
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const inputBgColor = isDarkMode ? '#16171F' : '#F8F8F8';
  const inputBorderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  const saveUserPreferences = async () => {
    try {
      setIsLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (userId) {
        // Create preferences object
        const userPreferences = {
          preferredStyles: selectedStyles,
          preferredBrands: selectedBrands,
          topsSize,
          bottomsSize,
          shoeSize,
          colorPreferences: [], // Default empty, can be set in user preferences later
          emailNotifications: true,
          pushNotifications: true,
        };
        
        // Save to Firestore
        await setUserPreferences(userId, userPreferences);
        
        // Mark onboarding as completed so user doesn't see it again
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Skip onboarding and mark as completed
  const skipOnboarding = async () => {
    try {
      // Mark onboarding as completed even when skipping
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still navigate even if there's an error
      navigation.navigate('MainTabs');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Your Size Profile</Text>
          <Text style={[styles.subtitle, { color: subTextColor }]}>
            Help us recommend the perfect fit for your style.
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Tops Size</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                  color: textColor,
                }
              ]}
              placeholder="S, M, L, XL, etc."
              placeholderTextColor={subTextColor}
              value={topsSize}
              onChangeText={setTopsSize}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Bottoms Size</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                  color: textColor,
                }
              ]}
              placeholder="30, 32, 34, etc."
              placeholderTextColor={subTextColor}
              value={bottomsSize}
              onChangeText={setBottomsSize}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Shoe Size</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                  color: textColor,
                }
              ]}
              placeholder="US 8, EU 41, etc."
              placeholderTextColor={subTextColor}
              value={shoeSize}
              onChangeText={setShoeSize}
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={skipOnboarding}
            disabled={isLoading}
          >
            <Text style={[styles.skipText, { color: subTextColor }]}>Skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={saveUserPreferences}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Saving...</Text>
            ) : (
              <>
                <Text style={styles.buttonText}>Complete</Text>
                <Icon name="checkmark" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              </>
            )}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '100%',
    marginBottom: 15,
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
  },
  skipText: {
    fontSize: 14,
  },
});

export default OnboardingSizingScreen;
