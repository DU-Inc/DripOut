import React, { useState } from 'react';
import { View, Alert, StyleSheet, StatusBar, Image, SafeAreaView } from 'react-native';
import AuthForm from '../components/Auth/AuthForm';
import { signUp, signIn, resetPassword } from '../services/auth';
import { useTheme } from '../styles/themeprovider';
import { lightTheme, darkTheme } from '../styles/themes';

const AuthScreen = ({ navigation }: { navigation: any }) => {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  // Custom colors for our unique luxury design
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const statusBarStyle = isDarkMode ? 'light-content' : 'dark-content';

  const handleSignInSignUp = async () => {
    try {
      if (isSignUp) {
        await signUp(email, password, navigation, firstName, lastName, username);
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
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }
    
    try {
      await resetPassword(email);
      Alert.alert(
        'Password Reset', 
        'A password reset link has been sent to your email.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else {
        setError('Unable to send reset link. Please try again later.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={bgColor} />
      <View style={styles.container}>
        <AuthForm
          isSignUp={isSignUp}
          handleSignInSignUp={handleSignInSignUp}
          errorMessage={error}
          email={email}
          password={password}
          setEmail={setEmail}
          setPassword={setPassword}
          firstName={firstName}
          lastName={lastName}
          username={username}
          setFirstName={setFirstName}
          setLastName={setLastName}
          setUsername={setUsername}
          toggleForm={() => {
            setIsSignUp(!isSignUp);
            setError(''); // Clear errors when switching forms
          }}
          handleForgotPassword={handleForgotPassword}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default AuthScreen;
