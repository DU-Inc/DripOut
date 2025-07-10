import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styled from 'styled-components/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const navigation = useNavigation<NavigationProp>();
  
  return (
    <HeaderContainer>
      <HeaderTitle>{title}</HeaderTitle>
      <RecommendButton onPress={() => navigation.navigate('RecommendationScreen')}>
        <Icon name="search-outline" size={20} color="#fff" />
        <RecommendText>Find Fashion</RecommendText>
      </RecommendButton>
    </HeaderContainer>
  );
};

// Styled components for Header using styled-components
const HeaderContainer = styled(View)`
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.primary}; /* Primary background color */
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const HeaderTitle = styled(Text)`
  font-size: ${({ theme }) => theme.typography.h2.fontSize}px;
  font-weight: ${({ theme }) => theme.typography.h2.fontWeight};
  color: ${({ theme }) => theme.colors.text}; /* Text color */
`;

const RecommendButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: #3498db;
  padding-horizontal: 12px;
  padding-vertical: 6px;
  border-radius: 20px;
`;

const RecommendText = styled(Text)`
  color: #fff;
  margin-left: 4px;
  font-weight: 600;
`;

