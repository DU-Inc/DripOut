import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  FlatList
} from 'react-native';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/NavigationTypes';
import { getAuth } from 'firebase/auth';
import { setUserPreferences } from '../services/firestoreService';
import { useOnboardingContext } from '../context/OnboardingContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize auth with proper typing
const auth = getAuth();

type OnboardingSizingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingSizing'>;

const OnboardingSizingScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const navigation = useNavigation<OnboardingSizingScreenNavigationProp>();
  const { selectedStyles, selectedBrands } = useOnboardingContext();
  
  // Define size options
  const topSizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const bottomSizeOptions = ["28", "30", "32", "34", "36", "38", "40", "42", "44"];
  const shoeSizeOptions = ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "US 13"];
  
  // State for selected sizes
  const [topsSize, setTopsSize] = useState('');
  const [bottomsSize, setBottomsSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for selector modal
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSelector, setCurrentSelector] = useState<'tops' | 'bottoms' | 'shoes' | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  // Custom colors for a luxurious feel
  const mainColor = isDarkMode ? '#FF6B6B' : '#EF3D47';
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
        console.log("Completed onboarding - navigating to main app");
        navigation.navigate('MainTabs');
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
      console.log("Skipping sizing - navigating to main app");
      
      // Use navigate instead of reset for more reliable navigation
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still navigate even if there's an error
      navigation.navigate('MainTabs');
    }
  };
  
  // Open the selector modal with appropriate options
  const openSelector = (type: 'tops' | 'bottoms' | 'shoes') => {
    setCurrentSelector(type);
    
    // Set the options based on selector type
    switch (type) {
      case 'tops':
        setCurrentOptions(topSizeOptions);
        break;
      case 'bottoms':
        setCurrentOptions(bottomSizeOptions);
        break;
      case 'shoes':
        setCurrentOptions(shoeSizeOptions);
        break;
    }
    
    setModalVisible(true);
  };
  
  // Handle option selection
  const handleSelect = (option: string) => {
    // Update the appropriate state based on current selector
    switch (currentSelector) {
      case 'tops':
        setTopsSize(option);
        break;
      case 'bottoms':
        setBottomsSize(option);
        break;
      case 'shoes':
        setShoeSize(option);
        break;
    }
    
    // Close the modal
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="chevron-back" size={24} color={mainColor} />
      </TouchableOpacity>
      
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
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                }
              ]}
              onPress={() => openSelector('tops')}
            >
              <Text style={{ color: topsSize ? textColor : subTextColor }}>
                {topsSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Bottoms Size</Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                }
              ]}
              onPress={() => openSelector('bottoms')}
            >
              <Text style={{ color: bottomsSize ? textColor : subTextColor }}>
                {bottomsSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: textColor }]}>Shoe Size</Text>
            <TouchableOpacity
              style={[
                styles.dropdownSelector,
                { 
                  backgroundColor: inputBgColor, 
                  borderColor: inputBorderColor,
                }
              ]}
              onPress={() => openSelector('shoes')}
            >
              <Text style={{ color: shoeSize ? textColor : subTextColor }}>
                {shoeSize || "Select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={subTextColor} />
            </TouchableOpacity>
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
      
      {/* Size Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={[
              styles.modalContent, 
              { backgroundColor: isDarkMode ? '#1A1A24' : '#FFFFFF' }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Select {currentSelector === 'tops' ? 'Top' : currentSelector === 'bottoms' ? 'Bottom' : 'Shoe'} Size
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={24} color={mainColor} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={currentOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    { 
                      backgroundColor: 
                        (currentSelector === 'tops' && item === topsSize) ||
                        (currentSelector === 'bottoms' && item === bottomsSize) ||
                        (currentSelector === 'shoes' && item === shoeSize)
                          ? `${mainColor}30`  // Semi-transparent highlight
                          : 'transparent'
                    }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={{ 
                    color: textColor,
                    fontWeight: 
                      (currentSelector === 'tops' && item === topsSize) ||
                      (currentSelector === 'bottoms' && item === bottomsSize) ||
                      (currentSelector === 'shoes' && item === shoeSize)
                        ? '600'
                        : 'normal'
                  }}>
                    {item}
                  </Text>
                  {/* Show checkmark for selected item */}
                  {((currentSelector === 'tops' && item === topsSize) ||
                    (currentSelector === 'bottoms' && item === bottomsSize) ||
                    (currentSelector === 'shoes' && item === shoeSize)) && (
                    <Icon name="checkmark" size={20} color={mainColor} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  dropdownSelector: {
    height: 55,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    maxHeight: '70%',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    alignItems: 'center',
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
