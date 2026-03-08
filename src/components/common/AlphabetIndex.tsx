/**
 * AlphabetIndex Component
 * A vertical A-Z index that allows users to quickly jump to sections
 * Similar to iOS Contacts app alphabet index with enhanced interactions
 */

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../../styles/themeprovider';

interface AlphabetIndexProps {
  availableLetters: string[];
  onLetterPress: (letter: string) => void;
}

const LETTER_HEIGHT = 16;
const LETTER_SPACING = 1;
const TOTAL_LETTER_HEIGHT = LETTER_HEIGHT + LETTER_SPACING;

const AlphabetIndex: React.FC<AlphabetIndexProps> = ({
  availableLetters,
  onLetterPress
}) => {
  const { theme } = useTheme();
  const allLetters = useMemo(() => ['●', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')], []);
  
  // Container measurement with safety checks
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Track last processed position to prevent oscillation
  const lastProcessedY = useRef<number>(-1);
  const lastTriggerTime = useRef<number>(0);

  // Reset tracking when container height changes (ensures clean state)
  const resetTracking = useCallback(() => {
    lastProcessedY.current = -1;
    lastTriggerTime.current = 0;
  }, []);

  // Handle container layout measurement
  const onContainerLayout = useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    setContainerHeight(height);
    resetTracking();
  }, [resetTracking]);

  // Stable and smooth drag scrolling algorithm with anti-bounce protection
  const onGestureEvent = useCallback((event: any) => {
    // Safety check for null event
    if (!event || !event.nativeEvent) {
      return;
    }
    
    // Extract values immediately to avoid synthetic event pooling issues
    const { y } = event.nativeEvent;
    
    // Safety checks for container measurements and valid y coordinate
    if (containerHeight <= 0 || typeof y !== 'number') {
      return;
    }
    
    const now = Date.now();
    
    // Throttle events to prevent excessive firing (max 30fps for smoother feel)
    if (now - lastTriggerTime.current < 33) {
      return;
    }
    
    // Require minimum movement to prevent micro-oscillations
    const minMovementThreshold = 3; // pixels
    if (lastProcessedY.current !== -1 && Math.abs(y - lastProcessedY.current) < minMovementThreshold) {
      return;
    }
    
    // Calculate relative position within the container (0 to containerHeight)
    const clampedY = Math.max(0, Math.min(containerHeight, y));
    
    // Calculate percentage through the container (0 to 1)
    const percentage = clampedY / containerHeight;
    
    // Map to letter index with stable calculation
    const totalLetters = allLetters.length;
    const rawIndex = percentage * totalLetters; // Don't subtract 1 for more predictable behavior
    const letterIndex = Math.floor(rawIndex); // Use floor instead of round to prevent oscillation
    const clampedIndex = Math.max(0, Math.min(letterIndex, totalLetters - 1));
    
    const targetLetter = allLetters[clampedIndex];
    
    // Only trigger if letter is available
    if (availableLetters.includes(targetLetter)) {
      console.log(`📍 Alphabet gesture: → ${targetLetter} (Y: ${y.toFixed(1)}, %: ${(percentage * 100).toFixed(1)}%)`);
      onLetterPress(targetLetter);
      lastProcessedY.current = y;
      lastTriggerTime.current = now;
    }
  }, [availableLetters, onLetterPress, allLetters, containerHeight]);

  // Handle gesture state changes
  const onHandlerStateChange = useCallback((event: any) => {
    const { state } = event.nativeEvent;
    
    if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // Reset tracking when gesture ends for clean start on next gesture
      lastProcessedY.current = -1;
      lastTriggerTime.current = 0;
    }
  }, []);

  // Memoize letter press handler
  const handleLetterPress = useCallback((letter: string) => {
    if (availableLetters.includes(letter)) {
      onLetterPress(letter);
    }
  }, [availableLetters, onLetterPress]);

  // Render individual letter with clean styling
  const renderLetter = useCallback((letter: string) => {
    const isAvailable = availableLetters.includes(letter);
    
    return (
      <View key={letter} style={styles.letterContainer}>
        <TouchableOpacity
          style={styles.letterButton}
          onPress={() => handleLetterPress(letter)}
          disabled={!isAvailable}
          activeOpacity={0.6}
        >
          <Text
            style={[
              styles.letter,
              {
                color: isAvailable 
                  ? theme.text.primary
                  : theme.text.secondary + '50'
              }
            ]}
          >
            {letter}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [availableLetters, handleLetterPress, theme]);

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={[-4, 4]} // Smaller threshold for more responsive activation
        failOffsetX={[-30, 30]} // Allow horizontal movement before failing
        shouldCancelWhenOutside={false} // Continue gesture even if finger moves outside
        minPointers={1} // Only track single touch for stability
        maxPointers={1}
      >
        <View 
          style={[styles.container, { backgroundColor: 'transparent' }]}
          onLayout={onContainerLayout}
        >
          {allLetters.map((letter) => renderLetter(letter))}
        </View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gestureContainer: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -((27 * TOTAL_LETTER_HEIGHT) / 2) }], // Center vertically (26 letters + 1 symbol)
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  letterContainer: {
    width: 24,
    height: LETTER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: LETTER_SPACING / 2,
  },
  letterButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  letter: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'System', // Clean system font
  },
});

export default React.memo(AlphabetIndex);