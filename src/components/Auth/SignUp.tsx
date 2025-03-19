import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing, ScrollView } from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import { lightTheme, darkTheme } from '../../styles/themes';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';

interface SignUpProps {
  handleSignUp: () => void;
  errorMessage: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth?: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setUsername: (username: string) => void;
  setDateOfBirth?: (dateOfBirth: string) => void;
}

const SignUp: React.FC<SignUpProps> = ({
  handleSignUp,
  errorMessage,
  email,
  password,
  firstName,
  lastName,
  username,
  dateOfBirth,
  setEmail,
  setPassword,
  setFirstName,
  setLastName,
  setUsername,
  setDateOfBirth,
}) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Animation values
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const buttonScale = useState(new Animated.Value(1))[0];
  
  // Custom colors for our unique luxury design
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const errorBgColor = isDarkMode ? 'rgba(255, 84, 112, 0.1)' : 'rgba(231, 76, 60, 0.05)';
  const validColor = isDarkMode ? '#56D6A0' : '#2ECC71';
  const inputBgColor = isDarkMode ? 'rgba(22, 23, 31, 0.8)' : '#FFFFFF';

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Form validation
  const isFormValid = firstName && lastName && username && email && password;
  
  // Handle date selection
  const handleDateChange = (event: any, selected: Date | undefined) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
      setDateOfBirth?.(selected.toDateString());
    }
  };

  // Handle button press animation
  const animateButton = () => {
    if (!isFormValid) return;
    
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start(() => handleSignUp());
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: textColor }]}>
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: subTextColor }]}>
            Join DripOut and discover your perfect style
          </Text>
        </View>

        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: errorBgColor, borderColor: theme.colors.error }]}>
            <Icon name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formContainer}>
          <View style={styles.row}>
            <View style={styles.halfInputWrapper}>
              <View style={[
                styles.iconContainer, 
                { backgroundColor: focusedInput === 'firstName' ? mainColor : 'rgba(150, 150, 150, 0.1)' }
              ]}>
                <Icon 
                  name="person-outline" 
                  size={18} 
                  color={focusedInput === 'firstName' ? '#FFFFFF' : subTextColor} 
                />
              </View>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: focusedInput === 'firstName' ? mainColor : borderColor, 
                    color: textColor,
                    backgroundColor: cardBgColor,
                  }
                ]}
                value={firstName}
                placeholder="First Name"
                placeholderTextColor={subTextColor}
                onChangeText={setFirstName}
                autoCapitalize="words"
                onFocus={() => setFocusedInput('firstName')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.halfInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    borderColor: focusedInput === 'lastName' ? mainColor : borderColor, 
                    color: textColor,
                    backgroundColor: cardBgColor,
                  }
                ]}
                value={lastName}
                placeholder="Last Name"
                placeholderTextColor={subTextColor}
                onChangeText={setLastName}
                autoCapitalize="words"
                onFocus={() => setFocusedInput('lastName')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: focusedInput === 'username' ? mainColor : 'rgba(150, 150, 150, 0.1)' }
            ]}>
              <Icon 
                name="at-outline" 
                size={20} 
                color={focusedInput === 'username' ? '#FFFFFF' : subTextColor} 
              />
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: focusedInput === 'username' ? mainColor : borderColor, 
                  color: textColor,
                  backgroundColor: cardBgColor,
                }
              ]}
              value={username}
              placeholder="Username"
              placeholderTextColor={subTextColor}
              onChangeText={setUsername}
              autoCapitalize="none"
              onFocus={() => setFocusedInput('username')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: focusedInput === 'email' ? mainColor : 'rgba(150, 150, 150, 0.1)' }
            ]}>
              <Icon 
                name="mail-outline" 
                size={20} 
                color={focusedInput === 'email' ? '#FFFFFF' : subTextColor} 
              />
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: focusedInput === 'email' ? mainColor : borderColor, 
                  color: textColor,
                  backgroundColor: cardBgColor,
                }
              ]}
              value={email}
              placeholder="Email Address"
              placeholderTextColor={subTextColor}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: focusedInput === 'password' ? mainColor : 'rgba(150, 150, 150, 0.1)' }
            ]}>
              <Icon 
                name="lock-closed-outline" 
                size={20} 
                color={focusedInput === 'password' ? '#FFFFFF' : subTextColor} 
              />
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  borderColor: focusedInput === 'password' ? mainColor : borderColor, 
                  color: textColor,
                  backgroundColor: cardBgColor,
                }
              ]}
              value={password}
              placeholder="Password"
              placeholderTextColor={subTextColor}
              onChangeText={setPassword}
              secureTextEntry
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: focusedInput === 'dob' ? mainColor : 'rgba(150, 150, 150, 0.1)' }
            ]}>
              <Icon 
                name="calendar-outline" 
                size={20} 
                color={focusedInput === 'dob' ? '#FFFFFF' : subTextColor} 
              />
            </View>
            <TouchableOpacity
              style={[
                styles.input, 
                { 
                  borderColor: focusedInput === 'dob' ? mainColor : borderColor, 
                  backgroundColor: cardBgColor,
                  justifyContent: 'center' 
                }
              ]}
              onPress={() => {
                setFocusedInput('dob');
                setShowDatePicker(true);
              }}
            >
              <Text style={{ color: selectedDate ? textColor : subTextColor }}>
                {selectedDate ? formatDate(selectedDate) : 'Date of Birth'}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%', marginTop: 10 }}>
            <TouchableOpacity
              style={[
                styles.button, 
                { 
                  backgroundColor: isFormValid ? mainColor : isDarkMode ? '#3F3F56' : '#CCCCCC',
                  opacity: isFormValid ? 1 : 0.7
                }
              ]}
              onPress={animateButton}
              activeOpacity={0.8}
              disabled={!isFormValid}
            >
              <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
              {isFormValid && <Icon name="checkmark-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />}
            </TouchableOpacity>
          </Animated.View>

          {!isFormValid && (
            <View style={styles.validationContainer}>
              <Icon name="information-circle-outline" size={16} color={subTextColor} />
              <Text style={[styles.validationText, { color: subTextColor }]}>
                Please fill all required fields to create your account
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footerContainer}>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <Text style={[styles.orText, { color: subTextColor }]}>or sign up with</Text>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
        </View>

        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity 
            style={[styles.socialButton, { borderColor: borderColor, backgroundColor: cardBgColor }]}
          >
            <Icon name="logo-google" size={20} color={isDarkMode ? '#FFFFFF' : '#DB4437'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.socialButton, { borderColor: borderColor, backgroundColor: cardBgColor }]}
          >
            <Icon name="logo-apple" size={20} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  halfInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  validationText: {
    fontSize: 12,
    marginLeft: 6,
  },
  button: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 30,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 15,
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
});

export default SignUp;
