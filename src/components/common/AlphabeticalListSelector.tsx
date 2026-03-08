/**
 * AlphabeticalListSelector Component
 * A clean, minimalist list component for selecting brands or styles
 * Features alphabetical indexing and serif typography with enhanced performance
 */

import React, { useRef, useCallback, useMemo } from 'react';
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
const ITEM_HEIGHT = 60;
const SCROLL_THROTTLE = 32; // Increased from 16ms for better performance

const AlphabeticalListSelector: React.FC<AlphabeticalListSelectorProps> = ({
  items,
  selectedItems,
  onItemToggle,
  type
}) => {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(0);

  // Memoize available letters to prevent recalculation
  const availableLetters = useMemo(() => getAvailableLetters(items), [items]);

  // Memoize letter press handler with instant jumping
  const handleLetterPress = useCallback((letter: string) => {
    const index = getIndexForLetter(items, letter);
    if (flatListRef.current && index >= 0) {
      // Use instant scrolling instead of animated for immediate response
      flatListRef.current.scrollToIndex({
        index,
        animated: false, // Changed to false for instant jumping
        viewPosition: 0.05 // Show item at very top for better visibility
      });
    }
  }, [items]);

  // Optimized scroll handler with better throttling
  const handleScroll = useCallback((event: any) => {
    const scrollYValue = event.nativeEvent.contentOffset.y;
    scrollY.current = scrollYValue;
  }, []);

  // Memoized item press handler
  const handleItemPress = useCallback((item: string) => {
    onItemToggle(item);
  }, [onItemToggle]);

  // Memoized render item function
  const renderItem = useCallback(({ item }: { item: string }) => {
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
  }, [selectedItems, theme, handleItemPress]);

  // Enhanced scroll to index error handler with instant scrolling
  const onScrollToIndexFailed = useCallback((info: any) => {
    const wait = new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time further
    wait.then(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: info.index,
          animated: false, // Use instant scrolling for consistency
          viewPosition: 0.05
        });
      }
    });
  }, []);

  // Memoize key extractor
  const keyExtractor = useCallback((item: string) => item, []);

  // Memoize getItemLayout for better performance
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  // Memoize content container style
  const contentContainerStyle = useMemo(() => [
    styles.listContent,
    {
      paddingRight: type === 'brands' ? 40 : 0, // Space for alphabet index only on brands
    }
  ], [type]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={[styles.list, { backgroundColor: 'transparent' }]}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={SCROLL_THROTTLE}
        onScrollToIndexFailed={onScrollToIndexFailed}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={15} // Reduced for better performance
        windowSize={8} // Reduced window size
        initialNumToRender={12} // Reduced initial render
        getItemLayout={getItemLayout}
        updateCellsBatchingPeriod={50} // Batch updates for better performance
        disableVirtualization={false} // Keep virtualization enabled
      />
      
      {/* Alphabet Index - only show for brands since styles list is shorter */}
      {type === 'brands' && (
        <AlphabetIndex
          availableLetters={availableLetters}
          onLetterPress={handleLetterPress}
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

export default React.memo(AlphabeticalListSelector);