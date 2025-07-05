/**
 * AlphabetIndex Component
 * A vertical A-Z index that allows users to quickly jump to sections
 * Similar to iOS Contacts app alphabet index
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../styles/themeprovider';

interface AlphabetIndexProps {
  availableLetters: string[];
  onLetterPress: (letter: string) => void;
  activeLetter?: string;
}

const { height: screenHeight } = Dimensions.get('window');

const AlphabetIndex: React.FC<AlphabetIndexProps> = ({
  availableLetters,
  onLetterPress,
  activeLetter
}) => {
  const { theme } = useTheme();

  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {allLetters.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        const isActive = activeLetter === letter;
        
        return (
          <TouchableOpacity
            key={letter}
            style={[
              styles.letterContainer,
              isActive && { backgroundColor: theme.primary + '20' }
            ]}
            onPress={() => isAvailable && onLetterPress(letter)}
            disabled={!isAvailable}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.letter,
                {
                  color: isAvailable 
                    ? (isActive ? theme.primary : theme.text.primary)
                    : theme.text.secondary + '50'
                },
                isActive && { fontWeight: '700' }
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -((26 * 16) / 2) }], // Center vertically
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  letterContainer: {
    width: 24,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  letter: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'System', // Clean system font
  },
});

export default AlphabetIndex;