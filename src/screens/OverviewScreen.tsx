// src/screens/OverviewScreen.tsx
// Infinite scroll feed implementation

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Platform,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  PanResponder,
  NativeScrollEvent
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import AnimatedLoadingIndicator from '../components/common/AnimatedLoadingIndicator';

// Add explicit global setTimeout declaration for TypeScript
declare const setTimeout: (callback: () => void, ms: number) => number;

const { width } = Dimensions.get('window');

// Default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text',
  letterSpacing: 0.1,
};

// Sample post data structure
interface FeedItem {
  id: string;
  type: 'post' | 'product' | 'outfit' | 'ad' | 'collection';
  content: any; // This will be specific to each card type
}

// Sample filter options
const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'Trending' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'popular', label: 'Popular' },
  { id: 'recommended', label: 'For You' },
  { id: 'sale', label: 'On Sale' },
  { id: 'winter', label: 'Winter Collection' },
  { id: 'summer', label: 'Summer Styles' }
];

// Helper function to generate unique IDs
const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
};

// Pull-to-refresh threshold
const REFRESH_THRESHOLD = 80;

const OverviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const pullY = useRef(new Animated.Value(0)).current;
  
  // Reference to the FlatList
  const flatListRef = useRef<FlatList>(null);
  
  // Keep track of current scroll position
  const scrollYValue = useRef(0);
  
  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isPullingDown, setIsPullingDown] = useState(false);

  // Theme colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73';
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#38383A' : '#E5E5EA';
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF';
  const filterBgColor = isDarkMode ? '#1C1C1E' : '#F2F2F7';
  const filterActiveBgColor = isDarkMode ? '#2C2C2E' : '#E5E5EA';

  // Update scrollYValue when the animated value changes
  scrollY.addListener(({ value }) => {
    scrollYValue.current = value;
  });

  // Header animation - Super smooth transition with even more steps
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 10, 20, 30, 40, 50, 60],
    outputRange: [50, 48, 40, 30, 20, 10, 0], // More steps for smoother transition
    extrapolate: 'clamp'
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 10, 20, 30, 40, 50, 60],
    outputRange: [1, 0.9, 0.8, 0.6, 0.4, 0.2, 0], // More steps for smoother fade
    extrapolate: 'clamp'
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, 10, 20, 30, 40, 50, 60],
    outputRange: [1, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88], // More subtle scaling
    extrapolate: 'clamp'
  });
  
  // Animation for the pull-to-refresh indicator
  const refreshIndicatorHeight = pullY.interpolate({
    inputRange: [0, REFRESH_THRESHOLD],
    outputRange: [0, 80],
    extrapolate: 'clamp'
  });

  // Setup pan responder for custom pull-to-refresh
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate when pulling down at the top of the list
        return !refreshing && !loading && gestureState.dy > 0 && scrollYValue.current === 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Update the pull distance
        pullY.setValue(Math.max(0, gestureState.dy));
        if (gestureState.dy > REFRESH_THRESHOLD && !isPullingDown) {
          setIsPullingDown(true);
        } else if (gestureState.dy <= REFRESH_THRESHOLD && isPullingDown) {
          setIsPullingDown(false);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If pulled enough, trigger refresh
        if (gestureState.dy > REFRESH_THRESHOLD) {
          handleRefresh();
        }
        
        // Animate the pull distance back to 0
        Animated.timing(pullY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();
      }
    })
  ).current;

  // Cleanup function to remove listeners on unmount
  useEffect(() => {
    return () => {
      scrollY.removeAllListeners();
    };
  }, [scrollY]);

  // Fetch feed data
  const fetchFeed = useCallback(async (pageNumber: number, refresh: boolean = false, filter: string = activeFilter) => {
    if (loading || (!hasMore && !refresh)) return;
    
    try {
      setLoading(true);
      
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(() => resolve(true), 1000));
      
      // This would be replaced with actual API call
      // const response = await api.getFeed(pageNumber, filter);
      
      // Simulated data for testing - now with truly unique IDs
      const newItems: FeedItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: generateUniqueId(), // Unique ID that won't collide
        type: ['post', 'product', 'outfit', 'ad', 'collection'][Math.floor(Math.random() * 5)] as FeedItem['type'],
        content: {
          title: `${filter !== 'all' ? filter + ' - ' : ''}Item ${pageNumber}-${i}`,
          description: 'This is a sample item in the feed',
          timestamp: new Date().toISOString(),
        }
      }));
      
      if (refresh) {
        setFeedItems(newItems);
        setPage(1);
      } else {
        setFeedItems(prev => [...prev, ...newItems]);
      }
      
      // Check if there's more data to load
      setHasMore(pageNumber < 5); // For testing, limit to 5 pages
      
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsPullingDown(false);
    }
  }, [loading, hasMore, activeFilter]);

  // Initial load
  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchFeed(1, true);
  }, [refreshing, fetchFeed]);

  // Handle loading more
  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage);
  }, [loading, hasMore, page, fetchFeed]);

  // Handle filter change
  const handleFilterChange = useCallback((filterId: string) => {
    if (filterId === activeFilter) return;
    setActiveFilter(filterId);
    setPage(1);
    setFeedItems([]);
    setHasMore(true);
    fetchFeed(1, true, filterId);
  }, [activeFilter, fetchFeed]);

  // Render item based on type
  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    // This would be implemented with separate card components for each type
    return (
      <View 
        style={[styles.feedCard, { 
          backgroundColor: cardBgColor,
          borderColor: borderColor,
        }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardType, { color: mainColor }]}>{item.type.toUpperCase()}</Text>
          <Text style={[styles.cardTitle, { color: textColor }]}>{item.content.title}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardDescription, { color: subTextColor }]}>
            {item.content.description}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardTimestamp, { color: subTextColor }]}>
            {new Date(item.content.timestamp).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  }, [cardBgColor, borderColor, mainColor, textColor, subTextColor]);

  // Render filter item
  const renderFilterItem = useCallback((filter: typeof FILTER_OPTIONS[0]) => {
    const isActive = filter.id === activeFilter;
    return (
      <TouchableOpacity
        key={filter.id}
        style={styles.filterItem}
        onPress={() => handleFilterChange(filter.id)}
      >
        <Text 
          style={[
            styles.filterText, 
            { 
              color: isActive ? mainColor : subTextColor,
              fontWeight: '600', // All filter items are bold now
            }
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  }, [activeFilter, mainColor, subTextColor, handleFilterChange]);

  // Render footer (loading indicator)
  const renderFooter = useCallback(() => {
    if (!loading || refreshing) return null;
    
    return (
      <View style={styles.footerContainer}>
        <AnimatedLoadingIndicator 
          text="" 
          size="small" 
          includeIcons={false} 
          customColor={mainColor}
        />
      </View>
    );
  }, [loading, refreshing, mainColor]);

  // Render header with pull-to-refresh
  const renderHeader = useCallback(() => {
    return (
      <Animated.View style={[styles.pullToRefreshContainer, { height: refreshIndicatorHeight }]}>
        {isPullingDown || refreshing ? (
          <AnimatedLoadingIndicator 
            text="" 
            size="small" 
            includeIcons={false} 
            customColor={mainColor}
          />
        ) : null}
      </Animated.View>
    );
  }, [refreshIndicatorHeight, isPullingDown, refreshing, mainColor]);

  // Empty list component
  const renderEmpty = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: textColor }]}>No items to display</Text>
        <TouchableOpacity 
          style={[styles.emptyButton, { backgroundColor: mainColor }]}
          onPress={() => fetchFeed(1, true)}
        >
          <Text style={styles.emptyButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }, [loading, textColor, mainColor, fetchFeed]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Collapsible App Name Header - Left aligned */}
      <Animated.View 
        style={[
          styles.appNameHeader, 
          { 
            backgroundColor: bgColor,
            height: headerHeight,
            opacity: headerOpacity,
          }
        ]}
      >
        <Animated.Text 
          style={[
            styles.appNameText, 
            { 
              color: textColor,
              transform: [{ scale: titleScale }] 
            }
          ]}
        >
          DripOut
        </Animated.Text>
      </Animated.View>
      
      {/* Horizontal Filter Bar - This stays fixed */}
      <View 
        style={[
          styles.filterContainer, 
          { 
            backgroundColor: bgColor,
            borderBottomColor: 'transparent', // Removed border
          }
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_OPTIONS.map(renderFilterItem)}
        </ScrollView>
      </View>
      
      {/* Feed List with custom pull-to-refresh */}
      <View style={styles.listContainer} {...panResponder.panHandlers}>
        {renderHeader()}
        <FlatList
          ref={flatListRef}
          data={feedItems}
          renderItem={renderFeedItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.feedContainer, { paddingTop: 12 }]} // Reduced top padding
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          // Standard RefreshControl removed, using custom pull-to-refresh
        />
      </View>
      
      {/* Initial loading state */}
      {loading && feedItems.length === 0 && !refreshing && (
        <View style={[styles.initialLoadingContainer, { backgroundColor: bgColor }]}>
          <AnimatedLoadingIndicator 
            text="" 
            size="small" 
            includeIcons={false}
            customColor={mainColor}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // App Name Header (Collapsible)
  appNameHeader: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 2, // Reduced from 5 to 2 to bring closer to filters
    overflow: 'hidden',
  },
  appNameText: {
    ...defaultTextStyle,
    fontSize: 24, // Reduced from 32 to 24
    fontWeight: '700', // Slightly reduced weight
    letterSpacing: 0.5,
  },
  // Filter Bar (Fixed)
  filterContainer: {
    height: 34, // Reduced from 40 to 34
    justifyContent: 'center',
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 0, // Removed vertical padding
    alignItems: 'center',
  },
  filterItem: {
    paddingHorizontal: 8, // Reduced from 12 to 8
    paddingVertical: 2, // Reduced from 4 to 2
    marginRight: 12, // Reduced from 16 to 12
  },
  filterText: {
    ...defaultTextStyle,
    fontSize: 14, // Reduced from 16 to 14
    fontWeight: '600', // All items are bold by default
  },
  // List container for custom pull-to-refresh
  listContainer: {
    flex: 1,
  },
  // Pull to refresh
  pullToRefreshContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  // Feed content
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  feedCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardType: {
    ...defaultTextStyle,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  cardDescription: {
    ...defaultTextStyle,
    fontSize: 16,
    lineHeight: 22,
  },
  cardFooter: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardTimestamp: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  footerContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  emptyText: {
    ...defaultTextStyle,
    fontSize: 16,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  initialLoadingContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default OverviewScreen;