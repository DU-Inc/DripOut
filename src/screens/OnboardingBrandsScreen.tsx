import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import OnboardingBubbles from '../components/Onboarding/OnboardingBubbles';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingBrandsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingBrands'>;

const OnboardingBrandsScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const navigation = useNavigation<OnboardingBrandsScreenNavigationProp>();

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
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={async () => {
              // Mark onboarding as completed
              await AsyncStorage.setItem('onboardingCompleted', 'true');
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }}
          >
            <Text style={[styles.skipText, { color: subTextColor }]}>Skip for now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={() => navigation.navigate('OnboardingSizing')}
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
