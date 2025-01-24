import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import AuthForm from '../components/Auth/AuthForm'; // Your existing AuthForm component
import { signUp, signIn, resetPassword } from '../services/auth'; // Your existing auth services

const AuthScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(''); // New field for sign-up
  const [lastName, setLastName] = useState('');   // New field for sign-up
  const [username, setUsername] = useState('');   // New field for sign-up
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSignInSignUp = async () => {
    try {
      if (isSignUp) {
        // Pass all the new sign-up fields
        await signUp(email, password, navigation, firstName, lastName, username );
      } else {
        await signIn(email, password, navigation);
      }
    } catch (err: any) {
      switch (err.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-email':
          setError('Incorrect email or password. Please try again.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up.');
          break;
        case 'auth/email-already-in-use':
          setError('This email is already in use. Please sign in.');
          break;
        case 'auth/invalid-credential':
          setError('Incorrect email or password. Please try again.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
    }
  };

  const handleForgotPassword = async () => {
    try {
      await resetPassword(email);
      Alert.alert('Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <AuthForm
        isSignUp={isSignUp}
        handleSignInSignUp={handleSignInSignUp}
        errorMessage={error}
        email={email}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        firstName={firstName}    // Pass the new sign-up fields
        lastName={lastName}
        username={username}
        setFirstName={setFirstName}  // Setters for the new sign-up fields
        setLastName={setLastName}
        setUsername={setUsername}
        toggleForm={() => setIsSignUp(!isSignUp)}
        handleForgotPassword={handleForgotPassword}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 16,
  },
});

export default AuthScreen;
