import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ToastAndroid,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';
import ShelfIcon from '../common/ShelfIcon';
import { useShelf } from '../../contexts/ShelfContext';
import { processSizeData, getDisplaySize } from '../../utils/sizeUtils';

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
  sizes?: string[]; // Available sizes for the product
  
  // Simplified actions - shelf button replaces add to cart
  onCardPress?: () => void;
  onAddToShelf?: () => void; // New shelf functionality
  onSave?: () => void; // Replaces like/bookmark functionality
  
  // Layout props
  cardWidth?: number;
  cardStyle?: object;
  imageAspectRatio?: number;
  isDarkMode?: boolean;
  
  // Card type for different data completeness
  cardType?: 'full' | 'simple' | 'partial';
  
  // Size display options
  showSizes?: boolean; // Whether to show sizes in the card
  maxSizesToShow?: number; // Maximum number of sizes to display
  
  // Guest state
  isGuest?: boolean; // Whether the user is a guest (disables animations)
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
  sizes,
  onCardPress,
  onAddToShelf,
  onSave,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardStyle,
  imageAspectRatio = 1.2,
  isDarkMode = false,
  cardType = 'full',
  showSizes = false,
  maxSizesToShow = 3,
  isGuest = false,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Shelf context
  const { checkIsInShelf, addProductToShelf, removeProductFromShelf, isInitialized, forceCheckShelfStatus } = useShelf();
  const [isInShelf, setIsInShelf] = useState(false);
  const [isShelfLoading, setIsShelfLoading] = useState(true); // Add loading state

  // Track the previous product ID to detect component recycling
  const [prevProductId, setPrevProductId] = useState(id);
  
  // Track all product props to detect any changes that should trigger state reset
  const [prevProductProps, setPrevProductProps] = useState({
    id,
    name,
    brand,
    price,
    currency,
    productUrl
  });

  // Enhanced recycling detection - check for ANY product prop changes
  useEffect(() => {
    const currentProps = { id, name, brand, price, currency, productUrl };
    const propsChanged = JSON.stringify(currentProps) !== JSON.stringify(prevProductProps);
    
    if (propsChanged) {
      console.log(`🔄 [UnifiedProductCard] Component recycled or props changed for ${id}`);
      console.log(`🔄 [UnifiedProductCard] Previous: ${prevProductId} → Current: ${id}`);
      
      // Reset all component state to defaults immediately
      setCurrentImageIndex(0);
      setIsImageLoading(true);
      setIsSaved(false);
      setIsInShelf(false);
      setIsShelfLoading(true); // Set loading state while we check shelf
      
      // Update tracking states
      setPrevProductId(id);
      setPrevProductProps(currentProps);
      
      // Trigger fresh shelf check after state reset
      if (!isGuest && isInitialized) {
        const inShelf = checkIsInShelf(id);
        console.log(`🔍 [UnifiedProductCard] Post-recycle shelf check for ${id}: ${inShelf ? 'IN SHELF' : 'NOT IN SHELF'}`);
        setIsInShelf(inShelf);
        setIsShelfLoading(false);
        
        // If we just reset state but the product shows as in shelf, do a force check
        // This handles cases where the component was recycled but the shelf state is stale
        if (inShelf) {
          console.log(`⚠️ [UnifiedProductCard] Post-recycle force check temporarily disabled for ${id}...`);
          // TODO: Re-enable once Firebase deprecation warnings are fixed
          // forceCheckShelfStatus(id).then(forceResult => {
          //   if (forceResult !== inShelf) {
          //     console.log(`🔄 [UnifiedProductCard] Post-recycle force check corrected state for ${id}: ${forceResult ? 'IN SHELF' : 'NOT IN SHELF'}`);
          //     setIsInShelf(forceResult);
          //   }
          // });
        }
      } else if (isGuest) {
        setIsShelfLoading(false);
      }
    }
  }, [id, name, brand, price, currency, productUrl, prevProductProps, prevProductId, checkIsInShelf, isGuest, isInitialized]);

  // Check shelf status on mount and when shelf context changes
  useEffect(() => {
    const checkShelfStatus = () => {
      // Guest users should never show products as being in shelf
      if (isGuest) {
        setIsInShelf(false);
        setIsShelfLoading(false);
        return;
      }
      
      // Don't check shelf status until shelf context is initialized
      // This prevents false negatives during app startup
      if (!isInitialized) {
        console.log(`⏳ [UnifiedProductCard] Shelf not initialized yet, waiting for ${id}...`);
        setIsInShelf(false);
        setIsShelfLoading(true);
        return;
      }
      
      setIsShelfLoading(true);
      const inShelf = checkIsInShelf(id);
      console.log(`🔍 [UnifiedProductCard] Shelf check for ${id}: ${inShelf ? 'IN SHELF' : 'NOT IN SHELF'}`);
      setIsInShelf(inShelf);
      setIsShelfLoading(false);
      
      // If we're checking a product that shows as in shelf but we just loaded,
      // do a force check to ensure we have the latest state
      if (inShelf && !isGuest) {
        console.log(`⚠️ [UnifiedProductCard] Double-checking temporarily disabled for ${id}...`);
        // TODO: Re-enable once Firebase deprecation warnings are fixed
        // forceCheckShelfStatus(id).then(forceResult => {
        //   if (forceResult !== inShelf) {
        //     console.log(`🔄 [UnifiedProductCard] Force check corrected state for ${id}: ${forceResult ? 'IN SHELF' : 'NOT IN SHELF'}`);
        //     setIsInShelf(forceResult);
        //   }
        // });
      }
    };
    checkShelfStatus();
  }, [id, checkIsInShelf, isGuest, isInitialized]);

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
    // Only update visual state if user is not a guest
    if (!isGuest) {
      setIsSaved(!isSaved);
    }
    onSave?.();
  };

  const handleCardPress = () => {
    onCardPress?.();
  };

  const handleShelfToggle = async (newIsInShelf: boolean) => {
    try {
      console.log(`🔄 [UnifiedProductCard] Toggling shelf for ${id}: ${newIsInShelf ? 'ADD' : 'REMOVE'}`);
      
      // Only update visual state if user is not a guest
      if (!isGuest) {
        setIsInShelf(newIsInShelf); // Optimistic update
      }
      
      if (newIsInShelf) {
        // Add to shelf
        const shelfProduct = {
          id,
          name: name || 'Unnamed Product',
          brand,
          price,
          currency,
          images,
          productUrl,
        };
        
        const success = await addProductToShelf(shelfProduct, 'overview');
        
        if (success) {
          console.log(`✅ [UnifiedProductCard] Successfully added ${id} to shelf`);
          // Show success feedback
          const message = 'Added to shelf';
          if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
          } else {
            // On iOS, you could use a different feedback mechanism
            // For now, we'll use Alert for consistency
            Alert.alert('Success', message);
          }
          onAddToShelf?.(); // Call optional callback
        } else {
          console.error(`❌ [UnifiedProductCard] Failed to add ${id} to shelf`);
          // Revert optimistic update on failure (only if not guest)
          if (!isGuest) {
            setIsInShelf(false);
          }
          Alert.alert('Error', 'Failed to add to shelf');
        }
      } else {
        // Remove from shelf
        const success = await removeProductFromShelf(id);
        
        if (success) {
          console.log(`✅ [UnifiedProductCard] Successfully removed ${id} from shelf`);
          const message = 'Removed from shelf';
          if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
          } else {
            Alert.alert('Success', message);
          }
        } else {
          console.error(`❌ [UnifiedProductCard] Failed to remove ${id} from shelf`);
          // Revert optimistic update on failure (only if not guest)
          if (!isGuest) {
            setIsInShelf(true);
          }
          Alert.alert('Error', 'Failed to remove from shelf');
        }
      }
    } catch (error) {
      console.error(`❌ [UnifiedProductCard] Error toggling shelf status for ${id}:`, error);
      // Revert optimistic update on error (only if not guest)
      if (!isGuest) {
        setIsInShelf(!newIsInShelf);
      }
      Alert.alert('Error', 'Something went wrong');
    }
  };

  // Get main image
  const mainImage = images && images.length > 0 ? images[currentImageIndex] : null;
  const imageHeight = cardWidth / imageAspectRatio;

  // Format price display
  const formattedPrice = `${currency}${price.toFixed(2)}`;

  // Process sizes for display
  const processedSizes = processSizeData(sizes);
  const displaySizes = showSizes && processedSizes.length > 0 
    ? processedSizes.slice(0, maxSizesToShow)
    : [];
  const hasMoreSizes = processedSizes.length > maxSizesToShow;

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
          
          {/* Sizes */}
          {displaySizes.length > 0 && (
            <View style={styles.sizesContainer}>
              <View style={styles.sizesRow}>
                {displaySizes.map((size, index) => (
                  <Text
                    key={size.id}
                    style={[styles.sizeChip, { 
                      backgroundColor: isDarkMode ? '#333' : '#F0F0F0',
                      color: textSecondary 
                    }]}
                  >
                    {getDisplaySize(size)}
                  </Text>
                ))}
                {hasMoreSizes && (
                  <Text style={[styles.moreSizes, { color: textSecondary }]}>
                    +{processedSizes.length - maxSizesToShow}
                  </Text>
                )}
              </View>
            </View>
          )}
          
          {/* Price and Shelf Button Row */}
          <View style={styles.bottomRow}>
            <Text style={[styles.price, { color: textPrimary }]}>
              {formattedPrice}
            </Text>
            
            {/* Shelf Button - Primary Action */}
            <View style={styles.shelfButtonContainer}>
              {isShelfLoading ? (
                // Show loading indicator while checking shelf status
                <View style={[styles.shelfLoadingContainer, { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                }]}>
                  <ActivityIndicator size={12} color={textSecondary} />
                </View>
              ) : (
                <ShelfIcon
                  isInShelf={isInShelf}
                  onToggle={handleShelfToggle}
                  size={16}
                  activeColor="#FFFFFF"
                  inactiveColor={textSecondary}
                  activeBackgroundColor="#FF6347"
                  inactiveBackgroundColor={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                  showBackground={true}
                  variant="hanger"
                  showAnimation={true}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  isGuest={isGuest}
                />
              )}
            </View>
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'transparent',
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
  shelfButtonContainer: {
    borderRadius: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  shelfLoadingContainer: {
    borderRadius: 8,
    padding: 4,
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
  sizesContainer: {
    marginBottom: 6,
  },
  sizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sizeChip: {
    fontSize: 10,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
    textAlign: 'center',
    minWidth: 20,
  },
  moreSizes: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
    marginLeft: 2,
  },
});

export default UnifiedProductCard;