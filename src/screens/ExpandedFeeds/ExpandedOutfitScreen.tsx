import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ExpandedPartialProductFeed from '../../components/ExpandedFeed/ExpandedPartialProductFeed';
import { useTheme } from '../../styles/theme/ThemeContext';
import { colors } from '../../styles/theme/colors';

// Create a simplified version for outfit carousel that doesn't use hooks from ExpandedProductScreen
const OutfitProductView = ({ item }: { item: Product }) => {
  const { isDarkMode } = useTheme();
  const themeColors = isDarkMode ? colors.dark : colors.light;
  const navigation = useNavigation<StackNavigationProp<any>>();
  
  // Function to navigate to the full product screen - only pass ID, let the screen fetch data
  const goToFullProductDetails = () => {
    navigation.navigate('ExpandedProductScreen', {
      productId: item.id,
      sourcePosition: item.sourcePosition
    });
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Main product image */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={goToFullProductDetails}
        >
          <Image 
            source={{ uri: item.productImage }}
            style={{ width: '100%', height: 500, resizeMode: 'cover' }}
          />
        </TouchableOpacity>
        
        {/* Product info */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: themeColors.text.primary, marginBottom: 8 }}>
            {item.productName || 'Product Name'}
          </Text>
          
          <Text style={{ fontSize: 18, color: themeColors.text.primary, marginBottom: 16 }}>
            {item.brand ? `By ${item.brand}` : ''}
          </Text>
          
          {item.price && (
            <Text style={{ fontSize: 20, fontWeight: '600', color: themeColors.text.primary }}>
              ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
            </Text>
          )}
          
          {item.description && (
            <Text style={{ marginTop: 24, color: themeColors.text.secondary, lineHeight: 22 }}>
              {item.description}
            </Text>
          )}
          
          {/* View full details button */}
          <TouchableOpacity
            style={{
              marginTop: 30,
              backgroundColor: themeColors.primary,
              padding: 16,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={goToFullProductDetails}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              View Full Details
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the product interface
interface Product {
  id: string;
  type: 'full' | 'partial';
  productName?: string;
  brand?: string;
  price?: number;
  currency?: string;
  productImage?: string;
  additionalImages?: string[];
  productUrl?: string;
  description?: string;
  sourcePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Define route params interface
interface RouteParams {
  products: Product[];
  initialIndex?: number;
  outfitId?: string;
  outfitName?: string;
}

const ExpandedOutfitScreen: React.FC = () => {
  // Get route params and navigation
  const route = useRoute();
  const params = route.params as RouteParams;
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDarkMode } = useTheme();
  const themeColors = isDarkMode ? colors.dark : colors.light;

  // Get products from route params or use empty array as fallback
  const products = params?.products || [];
  const outfitName = params?.outfitName || 'Outfit Details';
  
  // Set initial index from route params or default to 0
  const [currentIndex, setCurrentIndex] = useState(params?.initialIndex || 0);
  
  // Track page scroll offset for animations
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Calculate indicator width based on number of products
  const stepIndicatorWidth = SCREEN_WIDTH / (products.length > 5 ? 5 : products.length);
  
  // Animation value for step indicators
  const stepTranslate = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH * (products.length - 1)],
    outputRange: [0, stepIndicatorWidth * (products.length - 1)],
    extrapolate: 'clamp',
  });

  // Scroll to specific product index
  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < products.length && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  // Handle "Next" button press
  const handleNext = () => {
    scrollToIndex(currentIndex + 1);
  };

  // Handle "Previous" button press
  const handlePrevious = () => {
    scrollToIndex(currentIndex - 1);
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Render each product item in the horizontal FlatList
  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    if (item.type === 'full') {
      // Instead of creating a wrapper component with hooks, pass the data as a fake route
      return (
        <View style={styles.productContainer}>
          <OutfitProductView item={item} />
        </View>
      );
    } else {
      // For partial products, render ExpandedPartialProductFeed
      return (
        <View style={styles.productContainer}>
          <ExpandedPartialProductFeed
            isVisible={true}
            onClose={() => {}} // Not used since we're controlling visibility at the parent level
            productId={item.id}
            productName={item.productName}
            brandName={item.brand}
            productUrl={item.productUrl || ''}
            imageUrl={item.productImage}
            sourcePosition={item.sourcePosition}
          />
        </View>
      );
    }
  };

  // Extract key for FlatList
  const keyExtractor = (item: Product) => `product-${item.id}`;

  // Handle FlatList scroll to update current index
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        if (index !== currentIndex) {
          setCurrentIndex(index);
        }
      }
    }
  );

  // Render individual step indicators
  const renderStepIndicators = () => {
    return products.map((_, index) => {
      // For large number of products, limit display to maintain UI clarity
      if (products.length > 5 && (
          (index > currentIndex + 2) || 
          (index < currentIndex - 2 && index !== 0) || 
          (currentIndex === products.length - 1 && index < products.length - 5)
        )) {
        return null;
      }

      // Show ellipsis for skipped steps when there are many products
      if (products.length > 5 && index === 0 && currentIndex > 3) {
        return (
          <TouchableOpacity 
            key={`step-${index}`}
            style={styles.stepButton}
            onPress={() => scrollToIndex(0)}
          >
            <Text style={[styles.stepDotEllipsis, { color: themeColors.text.primary }]}>
              1
            </Text>
            <Text style={[styles.stepDotEllipsis, { color: themeColors.text.primary }]}>
              ...
            </Text>
          </TouchableOpacity>
        );
      }

      if (products.length > 5 && index === products.length - 1 && currentIndex < products.length - 4) {
        return (
          <TouchableOpacity 
            key={`step-${index}`}
            style={styles.stepButton}
            onPress={() => scrollToIndex(products.length - 1)}
          >
            <Text style={[styles.stepDotEllipsis, { color: themeColors.text.primary }]}>
              ...
            </Text>
            <Text style={[styles.stepDotEllipsis, { color: themeColors.text.primary }]}>
              {products.length}
            </Text>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity 
          key={`step-${index}`}
          style={styles.stepButton}
          onPress={() => scrollToIndex(index)}
        >
          <Text 
            style={[
              styles.stepText, 
              { 
                color: index === currentIndex 
                  ? themeColors.primary 
                  : themeColors.text.secondary 
              }
            ]}
          >
            {index + 1}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header with title and back button */}
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Icon 
            name="arrow-left" 
            size={24} 
            color={themeColors.text.primary} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>
          {outfitName}
        </Text>
        
        <View style={styles.placeholder} />
      </View>

      {/* Step tracker */}
      <View style={[styles.stepTracker, { backgroundColor: themeColors.background }]}>
        <View style={styles.stepsContainer}>
          {renderStepIndicators()}
          
          {/* Animated indicator line */}
          <Animated.View 
            style={[
              styles.activeIndicator, 
              { 
                backgroundColor: themeColors.primary,
                width: stepIndicatorWidth,
                transform: [{ translateX: stepTranslate }] 
              }
            ]} 
          />
        </View>

        {/* Product position text */}
        <Text style={[styles.positionText, { color: themeColors.text.secondary }]}>
          {currentIndex + 1} of {products.length}
        </Text>
      </View>

      {/* Product carousel */}
      <FlatList
        ref={flatListRef}
        data={products}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialScrollIndex={params?.initialIndex || 0}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Previous/Next navigation buttons */}
      <View style={styles.navigationButtons}>
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.prevButton, { backgroundColor: themeColors.surface }]} 
            onPress={handlePrevious}
          >
            <Icon name="chevron-left" size={30} color={themeColors.text.primary} />
          </TouchableOpacity>
        )}
        
        {currentIndex < products.length - 1 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.nextButton, { backgroundColor: themeColors.surface }]} 
            onPress={handleNext}
          >
            <Icon name="chevron-right" size={30} color={themeColors.text.primary} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  stepTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
    zIndex: 5,
  },
  stepsContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    height: 30,
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    height: 3,
    bottom: 0,
    borderRadius: 1.5,
  },
  stepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    minWidth: 30,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepDotEllipsis: {
    fontSize: 12,
    fontWeight: '500',
  },
  positionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  productContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  navigationButtons: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  prevButton: {
    marginLeft: 8,
  },
  nextButton: {
    marginRight: 8,
  },
});

export default ExpandedOutfitScreen; 