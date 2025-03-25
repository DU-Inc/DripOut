import React, { useState, useRef, useEffect, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  InteractionManager,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../styles/themeprovider';
import { signOutUser } from '../../services/auth';

// These are actually globals in React Native environment
declare const setInterval: (callback: () => void, ms: number) => number;
declare const clearInterval: (id: number) => void;

interface BottomNavigationBarProps {
  children?: ReactNode;
  scrollY: Animated.Value; // pass from your scrollable screen
}

const BOTTOM_HIDDEN_OFFSET = 150;
// A small threshold to detect if user is near the top
const TOP_THRESHOLD = 5;
const { width } = Dimensions.get('window');

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  children,
  scrollY,
}) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { isDarkMode } = useTheme();
  const slideOffset = useRef(new Animated.Value(0)).current;
  const [isHidden, setIsHidden] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [contentWidth, setContentWidth] = useState<number>(60);

  const handleContentLayout = (e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  };

  const slideBar = (show: boolean) => {
    Animated.spring(slideOffset, {
      toValue: show ? 0 : BOTTOM_HIDDEN_OFFSET,
      useNativeDriver: true,
      friction: 6,
      tension: 50,
    }).start();
  };

  const hideBar = () => {
    if (!isHidden) {
      setIsHidden(true);
      slideBar(false);
    }
  };

  const showBar = () => {
    if (isHidden) {
      setIsHidden(false);
      slideBar(true);
    }
  };

  const previousOffset = useRef(0);
  const lastDownScrollRef = useRef<number | null>(null);
  const lastNotDownRef = useRef<number | null>(null);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const now = Date.now();
      const diff = value - previousOffset.current;

      // 1) If we are near the top => ALWAYS show bar, skip hide logic
      if (value <= TOP_THRESHOLD) {
        showBar();
        // Clear the "down scroll" so we don't hide
        lastDownScrollRef.current = null;
        // Update "not downscroll" since we are effectively "not scrolling down"
        if (!lastNotDownRef.current) {
          lastNotDownRef.current = now;
        }
      }
      // 2) Else handle normal scroll detection
      else {
        if (diff > 0) {
          // Scrolling DOWN
          if (!lastDownScrollRef.current) {
            lastDownScrollRef.current = now;
          }
          lastNotDownRef.current = null;
        } else if (diff < 0) {
          // Scrolling UP => show bar immediately
          showBar();
          lastDownScrollRef.current = null;
          if (!lastNotDownRef.current) {
            lastNotDownRef.current = now;
          }
        } else {
          // diff === 0 => no movement
          if (!lastNotDownRef.current) {
            lastNotDownRef.current = now;
          }
          lastDownScrollRef.current = null;
        }
      }

      previousOffset.current = value;
    });

    // Poll logic every 200ms
    // @ts-ignore
    const pollInterval = setInterval(() => {
      const now = Date.now();

      // Hide if scrolling down for >= 0.5s
      if (lastDownScrollRef.current) {
        const diff = now - lastDownScrollRef.current;
        if (diff >= 500) {
          hideBar();
        }
      }

      // Show if NOT scrolling down for >= 1.5s
      if (lastNotDownRef.current) {
        const diff = now - lastNotDownRef.current;
        if (diff >= 1500) {
          showBar();
        }
      }
    }, 200);

    return () => {
      scrollY.removeListener(listenerId);
      // @ts-ignore
      clearInterval(pollInterval);
    };
  }, [scrollY, isHidden]);

  const handleToggleModal = () => {
    // This function is removed as per the new implementation
  };

  const navigateTo = (screen: keyof RootStackParamList, tabName: string) => {
    setActiveTab(tabName);
    
    // For screens in the tab navigator, navigate to MainTabs first
    if (screen === 'Home' || screen === 'RecommendationScreen' || 
        screen === 'ThreeDScreen' || screen === 'ClosetScreen' || 
        screen === 'UserProfileScreen') {
      
      // Convert old screen names to new tab names
      const screenToTabMap: Record<string, string> = {
        'Home': 'HomeTab',
        'RecommendationScreen': 'DiscoverTab',
        'ThreeDScreen': '3DTab',
        'ClosetScreen': 'ClosetTab',
        'UserProfileScreen': 'ProfileTab'
      };
      
      // Check if we're already on MainTabs
      const currentState = navigation.getState();
      const currentRoute = currentState.routes[currentState.index];
      
      if (currentRoute.name === 'MainTabs') {
        // Already in tabs, just navigate to the specific tab
        navigation.navigate('MainTabs', { 
          screen: screenToTabMap[screen] as any,
          // Reset tab navigation to initial state (no stacked screens)
          params: {
            resetStack: true
          }
        });
      } else {
        // Navigate to MainTabs and then to the specific tab
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'MainTabs', 
            params: { 
              screen: screenToTabMap[screen] as any
            } 
          }]
        });
      }
    } else {
      // For other screens not in the tab navigator, navigate directly
      navigation.navigate(screen);
    }
  };

  // Colors based on theme
  const bgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#38383A' : '#F2F2F7';
  const iconColor = isDarkMode ? '#FFFFFF' : '#000000';

  const handlePressProfile = () => {
    navigation.navigate('UserProfileScreen');
  };

  const handlePressPreferences = () => {
    navigation.navigate('UserPreferencesScreen');
  };

  const handlePressSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={handlePressProfile}
      >
        <Icon name="person-outline" size={24} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={handlePressPreferences}
      >
        <Icon name="settings-outline" size={24} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.iconButton} 
        onPress={handlePressSignOut}
      >
        <Icon name="log-out-outline" size={24} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopWidth: 0.5,
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    padding: 10,
  },
});

export default BottomNavigationBar;
