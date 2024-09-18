import React from 'react';
import { View, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native';
import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../styles/themeprovider';

interface AuthFormProps {
  isSignUp: boolean;
  handleSignInSignUp: () => void;
  errorMessage: string;
  email: string; 
  password: string; 
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  toggleForm: () => void;
  handleForgotPassword: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  isSignUp,
  handleSignInSignUp,
  errorMessage,
  email, // Add email prop here
  password, // Add password prop here
  setEmail,
  setPassword,
  toggleForm,
  handleForgotPassword,
}) => {
  const { isDarkMode } = useTheme();
  return (
    <KeyboardAvoidingWrapper behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeArea>
        <Container>
          <Title>{isSignUp ? 'Sign Up' : 'Sign In'}</Title>

          {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

          <StyledTextInput
            value={email} // Now using the email prop
            placeholder="Email"
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={isDarkMode ? '#cccccc' : '#666666'}
          />

          <StyledTextInput
            value={password} // Now using the password prop
            placeholder="Password"
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={isDarkMode ? '#cccccc' : '#666666'}
          />

          <StyledButton onPress={handleSignInSignUp}>
            <ButtonText>{isSignUp ? 'Sign Up' : 'Sign In'}</ButtonText>
          </StyledButton>

          {!isSignUp && (
            <ForgotPasswordButton onPress={handleForgotPassword}>
              <ForgotPasswordText>Forgot Password?</ForgotPasswordText>
            </ForgotPasswordButton>
          )}

          <ToggleFormButton onPress={toggleForm}>
            <ToggleText>{isSignUp ? 'Already have an account? Sign In' : 'Don’t have an account? Sign Up'}</ToggleText>
          </ToggleFormButton>
        </Container>
      </SafeArea>
    </KeyboardAvoidingWrapper>
  );
};

// Styled Components with theme styles
const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView)`
  flex: 1;
`;

const SafeArea = styled(SafeAreaView)`
  flex: 1;
  padding: 40px 20px 20px 20px;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Container = styled(View)`
  flex: 1;
  width: 100%;
  justify-content: center;
  align-items: center;
`;

const Title = styled(Text)`
  font-size: ${({ theme }) => theme.typography.h1.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.h1.fontWeight};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 40px;
`;

const ErrorText = styled(Text)`
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  margin-bottom: 10px;
`;

const StyledTextInput = styled(TextInput)`
  width: 100%;
  height: 50px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 20px;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const StyledButton = styled(TouchableOpacity)`
  background-color: ${({ theme }) => theme.colors.primary};
  padding: 15px;
  border-radius: 8px;
  width: 60%;
  align-items: center;
  margin-bottom: 15px;
`;

const ButtonText = styled(Text)`
  font-size: ${({ theme }) => theme.typography.body.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.body.fontWeight};
  color: ${({ theme }) => theme.colors.text};
`;

const ForgotPasswordButton = styled(TouchableOpacity)`
  margin-top: 10px;
`;

const ForgotPasswordText = styled(Text)`
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
`;

const ToggleFormButton = styled(TouchableOpacity)`
  margin-top: 20px;
`;

const ToggleText = styled(Text)`
  color: ${({ theme }) => theme.colors.secondary};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.body.fontSize}px;
`;

export default AuthForm;