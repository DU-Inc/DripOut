// src/screens/OverviewScreen.tsx

import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
  ImageBackground,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import ThreeDBox from "../components/3DComponents/ThreeDBox";

// Set default text styles for SF Pro font family
const defaultTextStyle = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'SF Pro Text', // System font on iOS is SF Pro
  letterSpacing: 0.1, // SF Pro typically has slightly tighter letter spacing
};

const { width, height } = Dimensions.get('window');

// Mock featured sections
const FEATURED_CONTENT = [
  {
    id: '1',
    title: 'Create Your Digital Wardrobe',
    description: 'Organize your clothes, discover new outfits, and try them on with your 3D avatar',
    image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=800&auto=format',
    screen: '3DTab',
    gradient: ['#FF4870', '#EF3D47']
  },
  {
    id: '2',
    title: 'Find Your Style',
    description: 'Browse personalized recommendations based on your preferences',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format',
    screen: 'DiscoverTab',
    gradient: ['#FF4870', '#EF3D47']
  },
  {
    id: '3',
    title: 'Connect with Fashion Community',
    description: 'Share your style, get inspired by others, and join the conversation',
    image: 'https://images.unsplash.com/photo-1540174053853-1cc5d1e21c43?q=80&w=800&auto=format',
    screen: 'SocialTab',
    gradient: ['#FF4870', '#EF3D47']
  }
];

// Mock trending products
const TRENDING_PRODUCTS = [
  {
    id: '1',
    name: 'Minimalist Tee',
    price: '$39',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format',
  },
  {
    id: '2',
    name: 'Denim Jacket',
    price: '$89',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format',
  },
  {
    id: '3',
    name: 'Classic Watch',
    price: '$129',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=600&auto=format',
  },
  {
    id: '4',
    name: 'Leather Bag',
    price: '$149',
    image: 'https://images.unsplash.com/photo-1605733513597-a8f8341084e6?q=80&w=600&auto=format',
  }
];

// Mock style boards
const STYLE_BOARDS = [
  {
    id: '1',
    title: 'Minimalist Elegance',
    image: 'https://images.unsplash.com/photo-1613552465135-e5bba888a4ed?q=80&w=600&auto=format',
  },
  {
    id: '2',
    title: 'Street Style',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format',
  },
  {
    id: '3',
    title: 'Urban Casual',
    image: 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?q=80&w=600&auto=format',
  }
];

// Mock community posts
const COMMUNITY_POSTS = [
  {
    id: '1',
    username: 'sophia_style',
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=600&auto=format',
    likes: 248,
    comments: 34,
  },
  {
    id: '2',
    username: 'marcus_fashion',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format',
    likes: 176,
    comments: 23,
  }
];

const OverviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeFeature, setActiveFeature] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Animation effect when component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Colors based on theme - using the app's RED theme
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const inputBgColor = isDarkMode ? '#222232' : '#F5F5F5';
  const accentColor = isDarkMode ? '#FF6D8E' : '#FF3B5C'; // Red accent
  const surfaceColor = isDarkMode ? '#222232' : '#F5F5F5';

  // Header animation
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const navigateToScreen = (screenName: string) => {
    navigation.navigate(screenName as never);
  };

  const renderFeaturedItem = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity 
      style={[
        styles.featuredCard, 
        { opacity: activeFeature === index ? 1 : 0.8 }
      ]}
      onPress={() => {
        setActiveFeature(index);
        setTimeout(() => navigateToScreen(item.screen), 300);
      }}
      activeOpacity={0.9}
    >
      <ImageBackground 
        source={{ uri: item.image }} 
        style={styles.featuredImage}
        imageStyle={{ borderRadius: 24 }}
      >
        {/* Dark overlay */}
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredContent}>
            <Text style={[styles.featuredTitle, { color: '#FFFFFF' }]}>{item.title}</Text>
            <Text style={[styles.featuredDescription, { color: 'rgba(255,255,255,0.9)' }]}>{item.description}</Text>
            <View style={[styles.featuredButton, { backgroundColor: mainColor }]}>
              <Text style={styles.featuredButtonText}>Explore</Text>
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Floating Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: cardBgColor,
            opacity: headerOpacity,
            borderBottomColor: borderColor,
          }
        ]}
      >
        <Text style={[styles.headerTitle, { color: textColor }]}>DripOut</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="search" size={22} color={mainColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="notifications-outline" size={22} color={mainColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: textColor }]}>DripOut</Text>
          <Text style={[styles.welcomeSubtitle, { color: subTextColor }]}>Your personal style assistant</Text>
        </View>
        
        {/* Featured Sections */}
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Featured</Text>
          <FlatList
            data={FEATURED_CONTENT}
            renderItem={renderFeaturedItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={width - 60}
            decelerationRate="fast"
            contentContainerStyle={styles.featuredList}
            onMomentumScrollEnd={(e) => {
              const contentOffset = e.nativeEvent.contentOffset.x;
              const viewSize = width - 60;
              const index = Math.round(contentOffset / viewSize);
              setActiveFeature(index);
            }}
          />
          <View style={styles.featuredDots}>
            {FEATURED_CONTENT.map((_, index) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.featuredDot, 
                  { 
                    backgroundColor: activeFeature === index ? mainColor : surfaceColor,
                    transform: [{ scale: activeFeature === index ? 1.2 : 1 }],
                  }
                ]} 
              />
            ))}
          </View>
        </View>
        
        {/* 3D Avatar Section */}
        <View style={[styles.avatarSection, { backgroundColor: surfaceColor }]}>
          <View style={styles.avatarHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Your 3D Avatar</Text>
            <TouchableOpacity 
              onPress={() => navigateToScreen('3DTab')}
              style={styles.viewAllButton}
            >
              <Text style={[styles.viewAllText, { color: mainColor }]}>View</Text>
              <Icon name="chevron-forward" size={16} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.avatarContainer, { backgroundColor: cardBgColor }]}>
            <Animated.View style={{
              transform: [{ scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1]
              }) }]
            }}>
              <ThreeDBox
                width={0.84}
                height={0.7}
                imageUrl={require('../assets/images/3dimage.png')}
              />
            </Animated.View>
            <TouchableOpacity 
              style={[styles.tryOnButton, { backgroundColor: mainColor }]}
              onPress={() => navigateToScreen('3DTab')}
            >
              <Text style={styles.tryOnButtonText}>Try On Clothes</Text>
              <Icon name="shirt-outline" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Trending Products Section */}
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Trending Now</Text>
            <TouchableOpacity 
              onPress={() => navigateToScreen('DiscoverTab')}
              style={styles.viewAllButton}
            >
              <Text style={[styles.viewAllText, { color: mainColor }]}>View All</Text>
              <Icon name="chevron-forward" size={16} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            decelerationRate="fast"
            snapToInterval={170 + 14}
          >
            {TRENDING_PRODUCTS.map((product) => (
              <TouchableOpacity 
                key={product.id}
                style={[
                  styles.productCard, 
                  { 
                    backgroundColor: cardBgColor,
                    borderColor: borderColor,
                  }
                ]}
                onPress={() => navigateToScreen('DiscoverTab')}
              >
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <Text style={[styles.productName, { color: textColor }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productPrice, { color: mainColor }]}>{product.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Style Boards Section */}
        <View style={styles.styleBoardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Style Boards</Text>
            <TouchableOpacity 
              onPress={() => navigateToScreen('ProfileTab')}
              style={styles.viewAllButton}
            >
              <Text style={[styles.viewAllText, { color: mainColor }]}>View All</Text>
              <Icon name="chevron-forward" size={16} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styleBoardsGrid}
            decelerationRate="fast"
            snapToInterval={width * 0.7 + 16}
          >
            {STYLE_BOARDS.map((board) => (
              <TouchableOpacity 
                key={board.id}
                style={[
                  styles.styleBoard, 
                  { backgroundColor: cardBgColor }
                ]}
                onPress={() => navigateToScreen('ProfileTab')}
              >
                <Image source={{ uri: board.image }} style={styles.styleBoardImage} />
                <View style={[styles.styleBoardOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  <Text style={styles.styleBoardTitle}>{board.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Community Section */}
        <View style={[styles.communitySection, { backgroundColor: surfaceColor }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Community</Text>
            <TouchableOpacity 
              onPress={() => navigateToScreen('SocialTab')}
              style={styles.viewAllButton}
            >
              <Text style={[styles.viewAllText, { color: mainColor }]}>View All</Text>
              <Icon name="chevron-forward" size={16} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.communityPosts}
            decelerationRate="fast"
          >
            {COMMUNITY_POSTS.map((post) => (
              <TouchableOpacity 
                key={post.id}
                style={[
                  styles.communityPost, 
                  { backgroundColor: cardBgColor }
                ]}
                onPress={() => navigateToScreen('SocialTab')}
              >
                <View style={styles.postHeader}>
                  <View style={styles.postUser}>
                    <Image source={{ uri: post.avatar }} style={styles.userAvatar} />
                    <Text style={[styles.username, { color: textColor }]}>{post.username}</Text>
                  </View>
                  <Icon name="ellipsis-horizontal" size={18} color={subTextColor} />
                </View>
                <Image source={{ uri: post.image }} style={styles.postImage} />
                <View style={styles.postActions}>
                  <View style={styles.actionGroup}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="heart-outline" size={22} color={mainColor} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="chatbubble-outline" size={22} color={mainColor} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Icon name="paper-plane-outline" size={22} color={mainColor} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="bookmark-outline" size={22} color={mainColor} />
                  </TouchableOpacity>
                </View>
                <View style={styles.postStats}>
                  <Text style={[styles.postLikes, { color: textColor }]}>{post.likes} likes</Text>
                  <Text style={[styles.postComments, { color: subTextColor }]}>View all {post.comments} comments</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Closet Section */}
        <View style={styles.closetSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Your Closet</Text>
            <TouchableOpacity 
              onPress={() => navigateToScreen('ClosetTab')}
              style={styles.viewAllButton}
            >
              <Text style={[styles.viewAllText, { color: mainColor }]}>Open</Text>
              <Icon name="chevron-forward" size={16} color={mainColor} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.closetCard, 
              { backgroundColor: cardBgColor }
            ]}
            onPress={() => navigateToScreen('ClosetTab')}
          >
            <View style={styles.closetContent}>
              <View>
                <Text style={[styles.closetTitle, { color: textColor }]}>Manage Your Wardrobe</Text>
                <Text style={[styles.closetDescription, { color: subTextColor }]}>
                  Organize outfits, track items, and create new looks
                </Text>
              </View>
              <View style={[styles.closetButton, { backgroundColor: mainColor }]}>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            </View>
            
            <View style={styles.closetIconsRow}>
              <View style={[styles.closetIcon, { backgroundColor: surfaceColor }]}>
                <Icon name="shirt-outline" size={28} color={mainColor} />
              </View>
              <View style={[styles.closetIcon, { backgroundColor: surfaceColor }]}>
                <Icon name="glasses-outline" size={28} color={accentColor} />
              </View>
              <View style={[styles.closetIcon, { backgroundColor: surfaceColor }]}>
                <Icon name="watch-outline" size={28} color={mainColor} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer space for tab bar */}
        <View style={{ height: 90 }} />
      </Animated.ScrollView>
      
      {/* Quick Action Button */}
      <TouchableOpacity 
        style={[
          styles.messageButton, 
          { backgroundColor: mainColor }
        ]}
        onPress={() => navigateToScreen('SocialTab')}
        activeOpacity={0.7}
      >
        <FeatherIcon name="message-circle" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderRadius: 21,
    backgroundColor: 'rgba(239, 61, 71, 0.1)',
  },
  scrollContent: {
    paddingTop: 24,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  welcomeTitle: {
    ...defaultTextStyle,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  welcomeSubtitle: {
    ...defaultTextStyle,
    fontSize: 18,
    marginTop: 8,
    opacity: 0.85,
  },
  // Featured Section
  featuredSection: {
    marginBottom: 36,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 18,
    paddingHorizontal: 24,
    letterSpacing: 0.4,
  },
  featuredList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  featuredCard: {
    width: width - 60,
    height: 240,
    marginHorizontal: 10,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  featuredContent: {
    maxWidth: '90%',
  },
  featuredTitle: {
    ...defaultTextStyle,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  featuredDescription: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 20,
    lineHeight: 22,
    opacity: 0.9,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  featuredDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  featuredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  // Avatar Section
  avatarSection: {
    paddingTop: 28,
    paddingBottom: 34,
    marginBottom: 36,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  avatarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 61, 71, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewAllText: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 3,
  },
  avatarContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tryOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  tryOnButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Trending Section
  trendingSection: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  trendingList: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  productCard: {
    width: 170,
    borderRadius: 20,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productDetails: {
    padding: 14,
  },
  productName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 5,
  },
  productPrice: {
    ...defaultTextStyle,
    fontSize: 17,
    fontWeight: '700',
  },
  // Style Boards Section
  styleBoardsSection: {
    marginBottom: 36,
  },
  styleBoardsGrid: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  styleBoard: {
    width: width * 0.7,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  styleBoardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  styleBoardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  styleBoardTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Community Section
  communitySection: {
    paddingTop: 28,
    paddingBottom: 34,
    marginBottom: 36,
    borderRadius: 20,
    marginHorizontal: 12,
  },
  communityPosts: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  communityPost: {
    width: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'rgba(239, 61, 71, 0.5)',
  },
  username: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 320,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  actionGroup: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 18,
  },
  postStats: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  postLikes: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  postComments: {
    ...defaultTextStyle,
    fontSize: 14,
    opacity: 0.8,
  },
  // Closet Section
  closetSection: {
    marginBottom: 36,
  },
  closetCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  closetTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  closetDescription: {
    ...defaultTextStyle,
    fontSize: 15,
    maxWidth: '90%',
    lineHeight: 20,
    opacity: 0.85,
  },
  closetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  closetIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  closetIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Message Button
  messageButton: {
    position: 'absolute',
    right: 24,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default OverviewScreen;