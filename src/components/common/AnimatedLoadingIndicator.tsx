import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from "../../styles/themeprovider";

// Get device dimensions
const { width } = Dimensions.get('window');
// Scale factor based on screen width
const scale = width / 375; // Using iPhone 8 as baseline

// Function to make dimensions responsive
const normalize = (size: number) => {
  return Math.round(scale * size);
};

type AnimatedLoadingIndicatorProps = {
  text?: string;
  customColor?: string;
  size?: 'small' | 'medium' | 'large';
  includeIcons?: boolean;
};

const AnimatedLoadingIndicator: React.FC<AnimatedLoadingIndicatorProps> = ({
  text = 'Loading...',
  customColor,
  size = 'medium',
  includeIcons = true
}) => {
  const { theme } = useTheme();
  const mainColor = customColor || theme.primary;
  
  // Animation values
  const clothesHanger = useRef(new Animated.Value(0)).current;
  const clothesRack = useRef(new Animated.Value(0)).current;
  const fashionIcon1 = useRef(new Animated.Value(0)).current;
  const fashionIcon2 = useRef(new Animated.Value(0)).current;
  const fashionIcon3 = useRef(new Animated.Value(0)).current;
  
  // Size multipliers based on the size prop
  const sizeFactor = size === 'small' ? 0.7 : size === 'large' ? 1.3 : 1;
  
  useEffect(() => {
    // Create hanger animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(clothesHanger, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(clothesHanger, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Create rack sliding animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(clothesRack, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(clothesRack, {
          toValue: 0,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Create fashion icons animations with different timings
    const startIconAnimation = (iconRef: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconRef, {
            toValue: 1,
            duration: 800,
            delay,
            easing: Easing.bounce,
            useNativeDriver: true
          }),
          Animated.timing(iconRef, {
            toValue: 0,
            duration: 800,
            easing: Easing.bounce,
            useNativeDriver: true
          })
        ])
      ).start();
    };
    
    if (includeIcons) {
      startIconAnimation(fashionIcon1, 0);
      startIconAnimation(fashionIcon2, 300);
      startIconAnimation(fashionIcon3, 600);
    }
  }, [clothesHanger, clothesRack, fashionIcon1, fashionIcon2, fashionIcon3, includeIcons]);
  
  // Interpolate animations
  const hangerRotation = clothesHanger.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '10deg']
  });
  
  const rackTranslate = clothesRack.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20]
  });
  
  const icon1Scale = fashionIcon1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  const icon2Scale = fashionIcon2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  const icon3Scale = fashionIcon3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2]
  });
  
  return (
    <View style={styles.container}>
      {/* Clothes rack with hangers */}
      <Animated.View style={[
        styles.clothesRack, 
        { 
          transform: [{ translateX: rackTranslate }],
          height: normalize(50 * sizeFactor),
          width: normalize(200 * sizeFactor),
          marginBottom: normalize(-10)
        }
      ]}>
        <View style={[styles.rackBar, { backgroundColor: mainColor }]} />
        
        {/* Hanger 1 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { left: 0, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="shirt-outline" size={normalize(30 * sizeFactor)} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 2 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { left: normalize(50 * sizeFactor), transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="glasses-outline" size={normalize(28 * sizeFactor)} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 3 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { right: normalize(50 * sizeFactor), transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="watch-outline" size={normalize(30 * sizeFactor)} color={mainColor} />
        </Animated.View>
        
        {/* Hanger 4 */}
        <Animated.View style={[
          styles.hangerContainer, 
          { right: 0, transform: [{ rotate: hangerRotation }] }
        ]}>
          <Icon name="bag-outline" size={normalize(30 * sizeFactor)} color={mainColor} />
        </Animated.View>
      </Animated.View>
      
      {/* Loading text - between the clothes rack and fashion icons */}
      {text && (
        <Text style={[
          styles.loadingText, 
          { 
            color: theme.text.primary,
            fontSize: normalize(16 * sizeFactor),
            fontWeight: '500',
            marginTop: normalize(0),
            marginBottom: normalize(8)
          }
        ]}>
          {text}
        </Text>
      )}
      
      {/* Fashion icons bouncing around */}
      {includeIcons && (
        <View style={styles.fashionIconsContainer}>
          <Animated.View style={{ transform: [{ scale: icon1Scale }] }}>
            <Icon name="star" size={normalize(24 * sizeFactor)} color={mainColor} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: icon2Scale }] }}>
            <Icon name="sparkles-outline" size={normalize(24 * sizeFactor)} color={mainColor} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: icon3Scale }] }}>
            <Icon name="heart" size={normalize(24 * sizeFactor)} color={mainColor} />
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: normalize(24),
  },
  clothesRack: {
    width: normalize(200),
    height: normalize(100),
    position: 'relative',
    alignItems: 'center',
  },
  rackBar: {
    width: '100%',
    height: normalize(4),
    borderRadius: normalize(2),
    marginTop: normalize(20),
  },
  hangerContainer: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fashionIconsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: normalize(20),
  },
  loadingText: {
    marginTop: normalize(20),
    fontSize: normalize(18),
    fontWeight: '500',
    textAlign: 'center',
  }
});

export default AnimatedLoadingIndicator; 