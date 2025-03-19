import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing, Image } from 'react-native';
import { useTheme } from '../../styles/themeprovider'; 
import { lightTheme, darkTheme } from '../../styles/themes'; 
import Icon from 'react-native-vector-icons/Ionicons'; // Import icons

interface SignInProps {
  handleSignIn: () => void;
  errorMessage: string;
  email: string;
  password: string;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  handleForgotPassword: () => void;
}

const SignIn: React.FC<SignInProps> = ({
  handleSignIn,
  errorMessage,
  email,
  password,
  setEmail,
  setPassword,
  handleForgotPassword,
}) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  // Animation values
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const labelAnim = useState(new Animated.Value(0))[0];
  const buttonScale = useState(new Animated.Value(1))[0];
  
  // Custom colors for our unique luxury design
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const errorBgColor = isDarkMode ? 'rgba(255, 84, 112, 0.1)' : 'rgba(231, 76, 60, 0.05)';

  const screenWidth = Dimensions.get('window').width;

  // Handle button press animation
  const animateButton = () => {
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
    ]).start(() => handleSignIn());
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: textColor }]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, { color: subTextColor }]}>
          Sign in to continue your fashion journey
        </Text>
      </View>

      {errorMessage ? (
        <View style={[styles.errorContainer, { backgroundColor: errorBgColor, borderColor: theme.colors.error }]}>
          <Icon name="alert-circle-outline" size={20} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.formContainer}>
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

        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
          <Text style={[styles.forgotButtonText, { color: mainColor }]}>Forgot Password?</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: mainColor }]}
            onPress={animateButton}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>SIGN IN</Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footerContainer}>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <Text style={[styles.orText, { color: subTextColor }]}>or continue with</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
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
  button: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotButtonText: {
    fontSize: 14,
    fontWeight: '500',
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

export default SignIn;
