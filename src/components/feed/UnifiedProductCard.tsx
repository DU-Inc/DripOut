import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';

interface ProductImage {
  id: string;
  url: string;
  fallbackUrl?: string;
}

export interface UnifiedProductCardProps {
  id: string;
  name?: string;
  brand?: string;
  price: number;
  currency?: string;
  images: ProductImage[];
  productUrl?: string;
  
  // Simplified actions - only 2 primary actions
  onCardPress?: () => void;
  onAddToCart?: () => void;
  onSave?: () => void; // Replaces like/bookmark functionality
  
  // Layout props
  cardWidth?: number;
  cardStyle?: object;
  imageAspectRatio?: number;
  isDarkMode?: boolean;
  
  // Card type for different data completeness
  cardType?: 'full' | 'simple' | 'partial';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // Default for 2-column grid

const UnifiedProductCard: React.FC<UnifiedProductCardProps> = ({
  id,
  name,
  brand,
  price,
  currency = '$',
  images,
  productUrl,
  onCardPress,
  onAddToCart,
  onSave,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardStyle,
  imageAspectRatio = 1.2,
  isDarkMode = false,
  cardType = 'full',
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Theme colors
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const backgroundColor = themeColors.surface;
  const textPrimary = themeColors.text.primary;
  const textSecondary = themeColors.text.secondary;
  const borderColor = themeColors.border;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleSavePress = () => {
    setIsSaved(!isSaved);
    onSave?.();
  };

  const handleCardPress = () => {
    onCardPress?.();
  };

  const handleAddToCart = () => {
    onAddToCart?.();
  };

  // Get main image
  const mainImage = images && images.length > 0 ? images[currentImageIndex] : null;
  const imageHeight = cardWidth / imageAspectRatio;

  // Format price display
  const formattedPrice = `${currency}${price.toFixed(2)}`;

  // Determine what info to show based on card type and available data
  const showBrand = cardType !== 'simple' && brand;
  const showName = cardType === 'full' && name;
  const showFullInfo = cardType === 'full';

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          width: cardWidth,
          backgroundColor,
          borderColor,
          opacity: fadeAnim,
        },
        cardStyle,
      ]}
    >
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9}>
        {/* Image Container */}
        <View style={[styles.imageContainer, { height: imageHeight }]}>
          {mainImage && (
            <>
              <SharedElement id={`product.${id}.image`}>
                <Image
                  source={{ uri: mainImage.url }}
                  style={[styles.image, { height: imageHeight }]}
                  onLoad={handleImageLoad}
                  resizeMode="cover"
                />
              </SharedElement>
              
              {/* Image indicators for multiple images */}
              {images.length > 1 && (
                <View style={styles.imageIndicators}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        {
                          backgroundColor: index === currentImageIndex 
                            ? '#FFFFFF' 
                            : 'rgba(255,255,255,0.5)',
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
              
              {/* Save button overlay */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSavePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[styles.saveButtonBackground, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Icon 
                    name={isSaved ? "heart" : "heart-outline"} 
                    size={16} 
                    color={isSaved ? "#FF6B6B" : "#FFFFFF"} 
                  />
                </View>
              </TouchableOpacity>
            </>
          )}
          
          {/* Loading state */}
          {isImageLoading && (
            <View style={[styles.loadingOverlay, { height: imageHeight }]}>
              <View style={styles.loadingPlaceholder} />
            </View>
          )}
        </View>

        {/* Content Container */}
        <View style={styles.content}>
          {/* Brand */}
          {showBrand && (
            <Text style={[styles.brand, { color: textSecondary }]} numberOfLines={1}>
              {brand}
            </Text>
          )}
          
          {/* Product Name */}
          {showName && (
            <SharedElement id={`product.${id}.title`}>
              <Text style={[styles.name, { color: textPrimary }]} numberOfLines={2}>
                {name}
              </Text>
            </SharedElement>
          )}
          
          {/* Price and Add to Cart Row */}
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: textPrimary }]}>
              {formattedPrice}
            </Text>
            
            {/* Add to Cart Button - Primary Action */}
            <TouchableOpacity 
              style={[styles.addToCartButton, { backgroundColor: themeColors.primary }]}
              onPress={handleAddToCart}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
            >
              <Icon name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          {/* External Link Indicator for Partial Cards */}
          {cardType === 'partial' && productUrl && (
            <View style={styles.externalLinkIndicator}>
              <Icon name="open-in-new" size={12} color={textSecondary} />
              <Text style={[styles.externalLinkText, { color: textSecondary }]}>
                External
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    width: '60%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  saveButtonBackground: {
    borderRadius: 12,
    padding: 6,
  },
  content: {
    padding: 12,
  },
  brand: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  addToCartButton: {
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  externalLinkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  externalLinkText: {
    fontSize: 10,
    fontWeight: '500',
  },
});

export default UnifiedProductCard;