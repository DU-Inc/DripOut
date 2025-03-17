import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import { searchProducts, Product } from '../services/recommendationService';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width - 48;
const ITEM_HEIGHT = 180;

const RecommendationScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Custom color palette for our unique design
  const mainColor = isDarkMode ? '#7562FA' : '#5245CC';
  const bgColor = isDarkMode ? '#121212' : '#F7F7F7';
  const textColor = isDarkMode ? '#F1F1F2' : '#202020';
  const subTextColor = isDarkMode ? '#A8A8A8' : '#757575';
  const cardBgColor = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A2A' : '#EEEEEE';
  
  // Animation references
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  // Sample filters for fashion items
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'shirts', label: 'Shirts' },
    { id: 'pants', label: 'Pants' },
    { id: 'dresses', label: 'Dresses' },
    { id: 'shoes', label: 'Shoes' },
    { id: 'accessories', label: 'Accessories' }
  ];

  // Handle search input focus animation
  const handleFocus = () => {
    Animated.timing(searchBarAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(searchBarAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const results = await searchProducts(query);
      setProducts(results);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openProductUrl = (url: string) => {
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Cannot open product page');
    });
  };

  // Animated search bar styles
  const searchBarWidth = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '100%']
  });

  const searchBarHeight = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 54]
  });

  const searchBarOpacity = searchBarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1]
  });

  // Product item renderer with animations
  const renderProduct = ({ item, index }: { item: Product, index: number }) => {
    // Create staggered animations
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateXAnim = useRef(new Animated.Value(25)).current;

    // Start animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 120,
        useNativeDriver: true
      }),
      Animated.timing(translateXAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true
      })
    ]).start();

    return (
      <Animated.View 
        style={[
          styles.productItem, 
          { 
            backgroundColor: cardBgColor,
            borderColor: borderColor,
            opacity: opacityAnim,
            transform: [{ translateX: translateXAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.itemContent}
          activeOpacity={0.7}
          onPress={() => openProductUrl(item.url)}
        >
          <Image 
            source={{ uri: item.images[0] }} 
            style={styles.productImage} 
          />
          
          <View style={styles.productDetails}>
            <View style={styles.productTop}>
              <Text style={[styles.productName, { color: textColor }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.productSite, { color: subTextColor }]}>
                {item.site}
              </Text>
            </View>
            
            <View style={styles.productBottom}>
              <Text style={[styles.productPrice, { color: mainColor }]}>
                ${item.price.toFixed(2)}
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: 'rgba(117, 98, 250, 0.15)' }]}
                >
                  <Icon name="heart-outline" size={20} color={mainColor} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.viewButton, { backgroundColor: mainColor }]}
                >
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render trending searches - reusable section
  const renderTrendingSearches = () => {
    const trendingSearches = ['Summer Outfits', 'Business Casual', 'Minimalist', 'Street Style', 'Sustainable'];
    
    return (
      <View style={styles.trendingSection}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Trending Searches</Text>
        <View style={styles.trendingTags}>
          {trendingSearches.map((tag, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.trendingTag, { borderColor: borderColor }]}
              onPress={() => {
                setQuery(tag);
                handleSearch();
              }}
            >
              <Text style={[styles.trendingTagText, { color: subTextColor }]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Discover</Text>
      </View>
      
      {/* Search bar */}
      <Animated.View style={[
        styles.searchContainer,
        { 
          width: searchBarWidth,
          height: searchBarHeight,
          opacity: searchBarOpacity,
          backgroundColor: cardBgColor,
          borderColor: borderColor,
        }
      ]}>
        <Icon name="search" size={20} color={subTextColor} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search style, item or brand..."
          placeholderTextColor={subTextColor}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        {query.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setQuery('')}
          >
            <Icon name="close-circle" size={18} color={subTextColor} />
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && { 
                  backgroundColor: mainColor,
                }
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text 
                style={[
                  styles.filterText, 
                  { color: activeFilter === filter.id ? '#FFFFFF' : subTextColor }
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <View style={[styles.loadingIndicator, { backgroundColor: cardBgColor }]}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: textColor }]}>
              Finding your style...
            </Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={[styles.errorContainer, { backgroundColor: cardBgColor }]}>
            <Icon name="alert-circle-outline" size={40} color="#e74c3c" />
            <Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: mainColor }]}
              onPress={handleSearch}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Animated.FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.productsList}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } }}],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <>
              {renderTrendingSearches()}
              
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Suggestions</Text>
                
                <View style={styles.emptyStateContainer}>
                  <Icon 
                    name="search-outline" 
                    size={60} 
                    color={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                  />
                  <Text style={[styles.emptyText, { color: subTextColor }]}>
                    {query.trim() 
                      ? 'No results found. Try a different search term.' 
                      : 'Search for items to find your style.'}
                  </Text>
                </View>
              </View>
            </>
          }
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
    marginRight: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  productsList: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  productItem: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    height: ITEM_HEIGHT,
  },
  itemContent: {
    flexDirection: 'row',
    height: '100%',
  },
  productImage: {
    width: ITEM_HEIGHT - 40,
    height: ITEM_HEIGHT,
    resizeMode: 'cover',
  },
  productDetails: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  productTop: {
    flex: 1,
  },
  productBottom: {
    justifyContent: 'flex-end',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productSite: {
    fontSize: 13,
    opacity: 0.8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingIndicator: {
    padding: 24,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 24,
    borderRadius: 16,
    width: '90%',
    alignItems: 'center',
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  trendingSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  trendingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendingTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  trendingTagText: {
    fontSize: 14,
  },
  suggestionsContainer: {
    marginTop: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '80%',
  },
});

export default RecommendationScreen;
