import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../styles/themeprovider'; 
import { lightTheme, darkTheme } from '../../styles/themes'; 

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
  const { isDarkMode } = useTheme(); // Access the dark mode boolean from your context
  const theme = isDarkMode ? darkTheme : lightTheme; // Select the appropriate theme based on dark mode

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.transparent }]}>
      <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.typography.h2.fontSize }]}>
        Sign In
      </Text>

      {errorMessage ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text> : null}

      <TextInput
        style={[
          styles.input,
          { 
            minWidth: screenWidth * 0.5, // Set initial width to 50% of the screen width
            maxWidth: screenWidth * 0.7, // Allow it to grow up to 70% of screen width
            borderColor: theme.colors.border, 
            color: theme.colors.text, 
            backgroundColor: theme.colors.background, 
            fontSize: theme.typography.body.fontSize
          }
        ]}
        value={email}
        placeholder="Email"
        placeholderTextColor={theme.colors.placeholder}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[
          styles.input,
          { 
            minWidth: screenWidth * 0.5, // Set initial width to 50% of the screen width
            maxWidth: screenWidth * 0.7, // Allow it to grow up to 70% of screen width
            borderColor: theme.colors.border, 
            color: theme.colors.text, 
            backgroundColor: theme.colors.background, 
            fontSize: theme.typography.body.fontSize 
          }
        ]}
        value={password}
        placeholder="Password"
        placeholderTextColor={theme.colors.placeholder}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={handleSignIn}
      >
        <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
        <Text style={[styles.forgotButtonText, { color: theme.colors.link }]}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
  },
  forgotButton: {
    marginTop: 10,
  },
  forgotButtonText: {
    fontSize: 16,
  },
});

export default SignIn;
