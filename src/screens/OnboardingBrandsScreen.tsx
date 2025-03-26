import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import OnboardingBubbles from '../components/Onboarding/OnboardingBubbles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingContext } from '../context/OnboardingContext';

type OnboardingBrandsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingBrands'>;

const OnboardingBrandsScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const navigation = useNavigation<OnboardingBrandsScreenNavigationProp>();
  const { selectedBrands } = useOnboardingContext();

  // Custom colors for a luxurious feel
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Your Favorite Brands</Text>
        <Text style={[styles.subtitle, { color: subTextColor }]}>
          Select the brands that inspire your personal style.
        </Text>
      </View>

      <View style={styles.bubblesContainer}>
        <OnboardingBubbles 
          type="brands"
          options={[
            'Nike', 'Adidas', 'Zara', 'H&M', 'Gucci',
            'Louis Vuitton', 'Prada', 'Supreme', 'Off-White', 'Balenciaga',
            'Calvin Klein', 'Tommy Hilfiger', 'Gap', 'Levi\'s', 'Ralph Lauren',
            'Uniqlo', 'North Face', 'Patagonia', 'Vans', 'Converse', 
            'New Balance', 'Puma', 'Under Armour', 'Stone Island', 'Stüssy'
          ]}
          onSelectionChange={() => {}}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={mainColor} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={async () => {
              try {
                // Mark onboarding as completed
                await AsyncStorage.setItem('onboardingCompleted', 'true');
                console.log("Skipping brands selection - navigating to main app");
                
                // Use navigate instead of reset
                navigation.navigate('MainTabs');
                
                // Add fallback
                setTimeout(() => {
                  if (navigation.isFocused()) {
                    console.log("Fallback navigation to sizing screen");
                    navigation.navigate('OnboardingSizing');
                  }
                }, 300);
              } catch (error) {
                console.error("Navigation error:", error);
                // Fallback to next screen
                navigation.navigate('OnboardingSizing');
              }
            }}
          >
            <Text style={[styles.skipText, { color: subTextColor }]}>Skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={() => {
              // Check if user has made any selections
              if (selectedBrands.length === 0) {
                // Show confirmation if no brands selected
                Alert.alert(
                  'No Brands Selected',
                  'Are you sure you want to continue without selecting any brands? You can always update your preferences later.',
                  [
                    {
                      text: 'Go Back',
                      style: 'cancel',
                    },
                    {
                      text: 'Continue',
                      onPress: () => navigation.navigate('OnboardingSizing')
                    },
                  ]
                );
              } else {
                // Proceed if brands are selected
                navigation.navigate('OnboardingSizing');
              }
              console.log("Brands selected:", selectedBrands);
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 30,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
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

export default OnboardingBrandsScreen;
