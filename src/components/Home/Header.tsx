import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <HeaderContainer>
      <HeaderTitle>{title}</HeaderTitle>
    </HeaderContainer>
  );
};

// Styled components for Header using styled-components
const HeaderContainer = styled(View)`
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.primary}; /* Primary background color */
`;

const HeaderTitle = styled(Text)`
  font-size: ${({ theme }) => theme.typography.h2.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.h2.fontWeight};
  color: ${({ theme }) => theme.colors.text}; /* Text color */
  text-align: center;
`;

