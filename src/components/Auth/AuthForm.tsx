import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SignIn from './SignIn'; // Assuming SignIn and SignUp are in the same directory
import SignUp from './SignUp';

interface AuthFormProps {
  isSignUp: boolean;
  handleSignInSignUp: () => void;
  errorMessage: string;
  email: string;         // Mandatory
  password: string;      // Mandatory
  firstName: string;     // Mandatory for sign-up
  lastName: string;      // Mandatory for sign-up
  username: string;      // Mandatory for sign-up
  dateOfBirth?: string;  // Optional for sign-up
  setEmail: (email: string) => void;           // Mandatory setter
  setPassword: (password: string) => void;     // Mandatory setter
  setFirstName: (firstName: string) => void;   // Mandatory setter
  setLastName: (lastName: string) => void;     // Mandatory setter
  setUsername: (username: string) => void;     // Mandatory setter
  toggleForm: () => void;
  handleForgotPassword: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp,
  handleSignInSignUp,
  errorMessage,
  email,
  password,
  firstName,  // Mandatory values
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
  return (
    <View style={styles.container}>
      {isSignUp ? (
        <SignUp
          handleSignUp={handleSignInSignUp}
          errorMessage={errorMessage}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          firstName={firstName}       // Pass sign-up specific props
          lastName={lastName}
          username={username}
          dateOfBirth={dateOfBirth}
          setFirstName={setFirstName}  // Setters for sign-up fields
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
      <TouchableOpacity style={styles.toggleButton} onPress={toggleForm}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account? Sign In' : 'Don’t have an account? Sign Up'}
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
    padding: 20,
  },
  toggleButton: {
    marginTop: 20,
  },
  toggleText: {
    color: 'blue',
  },
});

export default AuthForm;
