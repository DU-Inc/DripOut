import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import SignIn from './SignIn';
import SignUp from './SignUp';
import { useTheme } from '../../styles/themeprovider';
import { lightTheme, darkTheme } from '../../styles/themes';

interface AuthFormProps {
  isSignUp: boolean;
  handleSignInSignUp: () => void;
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
  toggleForm: () => void;
  handleForgotPassword: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp,
  handleSignInSignUp,
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
  toggleForm,
  handleForgotPassword,
}) => {
  const { isDarkMode } = useTheme();
  
  // Custom colors for our unique luxury design
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {isSignUp ? (
        <SignUp
          handleSignUp={handleSignInSignUp}
          errorMessage={errorMessage}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          firstName={firstName}
          lastName={lastName}
          username={username}
          dateOfBirth={dateOfBirth}
          setFirstName={setFirstName}
          setLastName={setLastName}
          setUsername={setUsername}
        />
      ) : (
        <SignIn
          handleSignIn={handleSignInSignUp}
          errorMessage={errorMessage}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          handleForgotPassword={handleForgotPassword}
        />
      )}
      
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={toggleForm}
        activeOpacity={0.7}
      >
        <Text style={[styles.toggleText, { color: mainColor }]}>
          {isSignUp 
            ? 'Already have an account? Sign In' 
            : 'Don\'t have an account? Sign Up'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    marginVertical: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default AuthForm;