import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import AuthForm from '../components/Auth/AuthForm';
import { signUp, signIn, resetPassword } from '../services/auth';

const AuthScreen = ({ navigation }: { navigation: any }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSignInSignUp = async () => {
    try {
      if (isSignUp) {
        await signUp(email, password, navigation);
      } else {
        await signIn(email, password, navigation);
      }
    } catch (err: any) {
      setError(err.message);
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
        toggleForm={() => setIsSignUp(!isSignUp)}
        handleForgotPassword={handleForgotPassword}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // entire screen view
    justifyContent: 'center', // Center vertically
    paddingHorizontal: 16,
  },
});

export default AuthScreen;
