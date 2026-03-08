import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  View,
  Easing,
  Platform,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type AddToCartButtonProps = {
  /** Size of the button (in pixels) */
  size?: number;
  /** Primary color for the button */
  color?: string;
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional additional className */
  className?: string;
  /** Callback for button click */
  onPress?: () => void;
  /** Product image source for animation */
  productImageSource?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Additional style for the button */
  style?: object;
};

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  size = 36,
  color = '#FF4500',
  isLoading = false,
  className,
  onPress,
  productImageSource,
  animationDuration = 300,
  style,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Animations for product image 
  const productImageScale = useRef(new Animated.Value(0)).current;
  const productImageOpacity = useRef(new Animated.Value(0)).current;
  const productImageY = useRef(new Animated.Value(-80)).current; // Start higher (-80 instead of -50)
  
  // Create animated rotation for loading state
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Animation for press effect
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Handle loading animation
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isLoading, rotateAnim]);

  // Animate adding to cart
  const animateAddToCart = () => {
    // Reset the product image animation values
    productImageScale.setValue(0.7); // Smaller scale, same as removing
    productImageOpacity.setValue(1);
    productImageY.setValue(-80); // Start higher (-80 instead of -50)
    
    // Create a sequence for the product image animation - dropping into the cart
    Animated.sequence([
      // First show the product image
      Animated.timing(productImageOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      // Then animate the product image dropping into the cart
      Animated.timing(productImageY, {
        toValue: 0,
        duration: 800, // Slow down the animation
        easing: Easing.out(Easing.cubic), // Use cubic easing for smoothness
        useNativeDriver: true,
      }),
      // Then hide the product image
      Animated.timing(productImageOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete
      setIsAnimating(false);
      setIsInCart(true);
    });
  };
  
  // Animate removing from cart
  const animateRemoveFromCart = () => {
    // Reset the product image animation values
    productImageScale.setValue(0.7);
    productImageOpacity.setValue(0);
    productImageY.setValue(0);
    
    // Create a sequence for the product image animation - coming out of the cart
    Animated.sequence([
      // First show the product image
      Animated.timing(productImageOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      // Then animate the product image rising from the cart
      Animated.timing(productImageY, {
        toValue: -80, // Go higher (-80 instead of -50)
        duration: 800, // Slow down the animation
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Scale up and fade out the product image
      Animated.parallel([
        Animated.timing(productImageScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(productImageOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Animation complete
      setIsAnimating(false);
      setIsInCart(false);
    });
  };

  const handlePress = () => {
    if (!isLoading && !isAnimating && onPress) {
      setIsAnimating(true);
      
      // Animate the button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: animationDuration / 3,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: animationDuration / 3,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        })
      ]).start();
      
      // Toggle cart state and run appropriate animation
      if (isInCart) {
        animateRemoveFromCart();
      } else {
        animateAddToCart();
      }
      
      // Call the provided onPress handler
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Product image animation */}
      {productImageSource && isAnimating && (
        <Animated.View
          style={[
            styles.productImageContainer,
            {
              transform: [
                { translateY: productImageY },
                { scale: productImageScale }
              ],
              opacity: productImageOpacity,
            }
          ]}
        >
          <Image 
            source={{ uri: productImageSource }} 
            style={styles.productImage} 
            resizeMode="cover"
          />
        </Animated.View>
      )}
      
      {/* Main cart button */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.buttonWrapper}
      >
        <Animated.View 
          style={[
            styles.button, 
            { 
              width: size, 
              height: size, 
              borderRadius: size / 4, // Reduced border radius for more square look
              transform: [
                { scale: scaleAnim },
                { rotate: isLoading ? spin : '0deg' }
              ] 
            },
            style // Apply optional style prop
          ]}
        >
          <Icon 
            name={isInCart ? "cart-remove" : "cart-plus"} 
            size={size * 0.65}
            color={color}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 40, // Reduced from 60 to make it more compact
    height: 40, // Reduced from 60 to make it more compact
    alignItems: 'center', // Changed from flex-start to center
    justifyContent: 'center', // Changed from flex-start to center
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: 'white', // Restored white background
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  productImageContainer: {
    position: 'absolute',
    width: 32, // Smaller image
    height: 32, // Smaller image
    top: 0,
    left: 0, // Align to the left
    zIndex: 5,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8, // Rounder edges for the image
  }
});

export default AddToCartButton;
