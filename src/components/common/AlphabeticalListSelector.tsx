/**
 * AlphabeticalListSelector Component
 * A clean, minimalist list component for selecting brands or styles
 * Features alphabetical indexing and serif typography
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import { useTheme } from '../../styles/themeprovider';
import AlphabetIndex from './AlphabetIndex';
import { getAvailableLetters, getIndexForLetter } from '../../services/brandDataService';

interface AlphabeticalListSelectorProps {
  items: string[];
  selectedItems: string[];
  onItemToggle: (item: string) => void;
  type: 'brands' | 'styles';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AlphabeticalListSelector: React.FC<AlphabeticalListSelectorProps> = ({
  items,
  selectedItems,
  onItemToggle,
  type
}) => {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeLetter, setActiveLetter] = useState<string>('');

  // Get available letters for the alphabet index
  const availableLetters = getAvailableLetters(items);

  // Handle alphabet index letter press
  const handleLetterPress = (letter: string) => {
    const index = getIndexForLetter(items, letter);
    if (flatListRef.current && index >= 0) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.1 // Show the item near the top
      });
      setActiveLetter(letter);
    }
  };

  // Update active letter based on scroll position
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const itemHeight = 60; // Approximate item height
    const currentIndex = Math.floor(scrollY / itemHeight);
    
    if (currentIndex >= 0 && currentIndex < items.length) {
      const currentItem = items[currentIndex];
      const currentLetter = currentItem.charAt(0).toUpperCase();
      if (currentLetter !== activeLetter) {
        setActiveLetter(currentLetter);
      }
    }
  };

  // Handle item selection
  const handleItemPress = (item: string) => {
    onItemToggle(item);
  };

  // Render individual list item
  const renderItem = ({ item }: { item: string }) => {
    const isSelected = selectedItems.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          {
            backgroundColor: isSelected 
              ? theme.primary + '10'
              : 'transparent',
            borderColor: theme.border,
          },
          theme.elevation.light
        ]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemText,
              {
                color: isSelected 
                  ? theme.primary
                  : theme.text.primary,
                fontWeight: isSelected ? '600' : '400'
              }
            ]}
          >
            {item}
          </Text>
          
          {/* Selection indicator */}
          <View
            style={[
              styles.selectionIndicator,
              {
                backgroundColor: isSelected 
                  ? theme.primary 
                  : 'transparent',
                borderColor: isSelected 
                  ? theme.primary 
                  : theme.border,
              }
            ]}
          >
            {isSelected && (
              <Text style={[styles.checkmark, { color: theme.text.onPrimary }]}>
                ✓
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Handle scroll to index errors (for items that might not be visible)
  const onScrollToIndexFailed = (info: any) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.1
      });
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        style={[styles.list, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingRight: type === 'brands' ? 40 : 0, // Space for alphabet index only on brands
          }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollToIndexFailed={onScrollToIndexFailed}
        removeClippedSubviews={Platform.OS === 'android'} // Performance optimization
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={15}
        getItemLayout={(data, index) => ({
          length: 60,
          offset: 60 * index,
          index,
        })}
      />
      
      {/* Alphabet Index - only show for brands since styles list is shorter */}
      {type === 'brands' && (
        <AlphabetIndex
          availableLetters={availableLetters}
          onLetterPress={handleLetterPress}
          activeLetter={activeLetter}
        />
      )}
      
      {/* Selection count indicator - subtle and non-prominent */}
      {selectedItems.length > 0 && (
        <View
          style={[
            styles.selectionCount,
            {
              backgroundColor: theme.background + 'F0', // More transparent
              borderColor: theme.border,
            }
          ]}
        >
          <Text style={[styles.selectionCountText, { color: theme.text.secondary }]}>
            {selectedItems.length} selected
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
    // paddingRight will be set dynamically based on whether alphabet index is shown
  },
  itemContainer: {
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 60,
  },
  itemText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Serif font as requested
    flex: 1,
    marginRight: 12,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectionCount: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  selectionCountText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default AlphabeticalListSelector;