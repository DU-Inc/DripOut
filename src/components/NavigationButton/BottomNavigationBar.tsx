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
} from 'react-native';

// These are actually globals in React Native environment
declare const setInterval: (callback: () => void, ms: number) => number;
declare const clearInterval: (id: number) => void;
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/NavigationTypes';
import ModalNavigation, {
  ModalNavigationHandles,
} from '../../components/NavigationButton/ModalNavigation';
import { useTheme } from '../../styles/themeprovider';

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

  const modalRef = useRef<ModalNavigationHandles>(null);

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
    modalRef.current?.toggleModal();
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
          screen: screenToTabMap[screen],
          params: {
            resetStack: true
          }
        } as any);
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

  // Define our colors based on theme - Enhanced for dark mode
  const bgColor = isDarkMode ? 'rgba(10, 10, 15, 0.95)' : 'rgba(255, 255, 255, 0.92)';
  const activeColor = isDarkMode ? '#9F91FF' : '#5245CC';
  const inactiveColor = isDarkMode ? '#6D6D88' : '#AAAAAA';
  const activeBgColor = isDarkMode ? 'rgba(124, 107, 255, 0.18)' : 'rgba(82, 69, 204, 0.08)';

  // Enhanced styles specifically for dark mode
  const navBarStyle = isDarkMode ? {
    backgroundColor: 'rgba(22, 23, 31, 0.9)',
    borderRadius: 24,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 107, 255, 0.15)',
    shadowColor: '#7C6BFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10
  } : {};

  // Enhanced center button for dark mode
  const centerButtonStyle = isDarkMode ? {
    backgroundColor: 'rgba(124, 107, 255, 1)',
    borderWidth: 2,
    borderColor: '#A394FF',
    shadowColor: '#7C6BFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10
  } : styles.centerButton;

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            width: '100%',
            transform: [{ translateY: slideOffset }],
            backgroundColor: bgColor,
            borderTopColor: isDarkMode ? 'rgba(124, 107, 255, 0.1)' : 'rgba(230, 230, 230, 0.8)',
            borderTopWidth: isDarkMode ? 0 : 0.5,
            paddingHorizontal: isDarkMode ? 10 : 0,
          },
        ]}
      >
        <View 
          style={[
            styles.navBar, 
            navBarStyle
          ]} 
          onLayout={handleContentLayout}
        >
          {/* Main tabs with unique design */}
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'home' && { 
                backgroundColor: activeBgColor,
                ...(isDarkMode ? {
                  borderRadius: 18,
                  borderWidth: activeTab === 'home' ? 1 : 0,
                  borderColor: 'rgba(124, 107, 255, 0.3)'
                } : {})
              }
            ]} 
            onPress={() => navigateTo('Home', 'home')}
          >
            <Icon 
              name={activeTab === 'home' ? 'home' : 'home-outline'} 
              size={24} 
              color={activeTab === 'home' ? activeColor : inactiveColor} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'discover' && { 
                backgroundColor: activeBgColor,
                ...(isDarkMode ? {
                  borderRadius: 18,
                  borderWidth: activeTab === 'discover' ? 1 : 0,
                  borderColor: 'rgba(124, 107, 255, 0.3)'
                } : {})
              }
            ]} 
            onPress={() => navigateTo('RecommendationScreen', 'discover')}
          >
            <Icon 
              name="search" 
              size={24} 
              color={activeTab === 'discover' ? activeColor : inactiveColor} 
            />
          </TouchableOpacity>

          {/* Center floating action button - Enhanced for dark mode */}
          <TouchableOpacity 
            style={[centerButtonStyle]}
            onPress={() => navigateTo('ThreeDScreen', '3d')}
          >
            <View style={isDarkMode ? {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(22, 23, 31, 0.8)',
              justifyContent: 'center',
              alignItems: 'center',
            } : {}}>
              <Icon 
                name="cube" 
                size={26} 
                color={isDarkMode ? '#A394FF' : '#ffffff'} 
                style={isDarkMode ? {
                  textShadowColor: 'rgba(124, 107, 255, 0.8)',
                  textShadowOffset: {width: 0, height: 0},
                  textShadowRadius: 10
                } : {}}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'closet' && { 
                backgroundColor: activeBgColor,
                ...(isDarkMode ? {
                  borderRadius: 18,
                  borderWidth: activeTab === 'closet' ? 1 : 0,
                  borderColor: 'rgba(124, 107, 255, 0.3)'
                } : {})
              }
            ]} 
            onPress={() => navigateTo('ClosetScreen', 'closet')}
          >
            <Icon 
              name="shirt-outline" 
              size={24} 
              color={activeTab === 'closet' ? activeColor : inactiveColor} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'profile' && { 
                backgroundColor: activeBgColor,
                ...(isDarkMode ? {
                  borderRadius: 18,
                  borderWidth: activeTab === 'profile' ? 1 : 0,
                  borderColor: 'rgba(124, 107, 255, 0.3)'
                } : {})
              }
            ]} 
            onPress={() => navigateTo('UserProfileScreen', 'profile')}
          >
            <Icon 
              name="person-outline" 
              size={24} 
              color={activeTab === 'profile' ? activeColor : inactiveColor} 
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ModalNavigation ref={modalRef} />
    </>
  );
};

export default BottomNavigationBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    paddingBottom: 25, // Extra padding for iPhone home indicator area
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navBar: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'relative',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7562FA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#7562FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 10,
    transform: [{ translateY: -10 }],
  },
});
