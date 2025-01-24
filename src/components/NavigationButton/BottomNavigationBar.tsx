import React, { useState, useRef, useEffect, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ModalNavigation, {
  ModalNavigationHandles,
} from '../../components/NavigationButton/ModalNavigation';

interface BottomNavigationBarProps {
  children?: ReactNode;
  scrollY: Animated.Value; // pass from your scrollable screen
}

const BOTTOM_HIDDEN_OFFSET = 150;
// A small threshold to detect if user is near the top
const TOP_THRESHOLD = 5;

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  children,
  scrollY,
}) => {
  const slideOffset = useRef(new Animated.Value(0)).current;
  const [isHidden, setIsHidden] = useState(false);
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
      clearInterval(pollInterval);
    };
  }, [scrollY, isHidden]);

  const handleToggleModal = () => {
    modalRef.current?.toggleModal();
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            width: contentWidth,
            left: '50%',
            marginLeft: -(contentWidth / 2),
            transform: [{ translateY: slideOffset }],
          },
        ]}
      >
        <View style={styles.navBar} onLayout={handleContentLayout}>
          <View style={styles.additionalNavItems}>{children}</View>

          <TouchableOpacity style={styles.navButton} onPress={handleToggleModal}>
            <View style={styles.iconWrapper}>
              <Icon name="apps-sharp" size={28} color="#fff" />
            </View>
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
    bottom: 15,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 2,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalNavItems: {
    flexDirection: 'row',
  },
  navButton: {
    padding: 8,
  },
  iconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
