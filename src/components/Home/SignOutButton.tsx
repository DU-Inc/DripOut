import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import styled from 'styled-components/native';
import { signOutUser } from '../../services/auth';

export const SignOutButton: React.FC = () => {
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <SignOutButtonContainer onPress={handleSignOut}>
      <SignOutText>Sign Out</SignOutText>
    </SignOutButtonContainer>
  );
};

// Styled components for SignOutButton using styled-components
const SignOutButtonContainer = styled(TouchableOpacity)`
  width: 100%;
  padding: 15px;
  border-radius: 8px;
  background-color: ${({ theme }) => theme.colors.error}; /* Error color to make the button stand out */
  align-items: center;
  justify-content: center;
  margin-top: 20px; /* Add some space between other components */
`;

const SignOutText = styled(Text)`
  font-size: ${({ theme }) => theme.typography.body.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.body.fontWeight};
  color: ${({ theme }) => theme.colors.text}; /* Ensure text color is readable */
`;

