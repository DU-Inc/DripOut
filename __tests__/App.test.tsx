import 'react-native';
import React from 'react';
import App from '../App';
import RecommendationScreen from '../src/screens/RecommendationScreen';

// Note: import explicitly to use the types shipped with jest.
import {it, describe, expect, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});

describe('RecommendationScreen', () => {
  it('renders recommendation screen correctly', () => {
    // Mock components that might cause issues in tests
    jest.doMock('../src/styles/themeprovider', () => ({
      useTheme: () => ({ isDarkMode: false })
    }));
    
    // Simple test - just check it renders without crashing
    const tree = renderer.create(<RecommendationScreen />);
    expect(tree).toBeDefined();
  });
});
