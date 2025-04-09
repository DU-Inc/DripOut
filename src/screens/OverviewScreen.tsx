// src/screens/OverviewScreen.tsx

import React, { useRef, useState } from 'react';
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
      style={[styles.featuredCard, { opacity: activeFeature === index ? 1 : 0.8 }]}
      onPress={() => {
        setActiveFeature(index);
        setTimeout(() => navigateToScreen(item.screen), 300);
      }}
      activeOpacity={0.9}
    >
      <ImageBackground 
        source={{ uri: item.image }} 
        style={styles.featuredImage}
        imageStyle={{ borderRadius: 20 }}
      >
        {/* Dark overlay */}
        <View style={styles.featuredOverlay}>
          <View style={styles.featuredContent}>
            <Text style={[styles.featuredTitle, { color: '#FFFFFF' }]}>{item.title}</Text>
            <Text style={[styles.featuredDescription, { color: 'rgba(255,255,255,0.8)' }]}>{item.description}</Text>
            <View style={[styles.featuredButton, { backgroundColor: mainColor }]}>
              <Text style={styles.featuredButtonText}>Explore</Text>
              <Icon name="arrow-forward" size={16} color="#FFFFFF" />
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
              <View 
                key={index} 
                style={[
                  styles.featuredDot, 
                  { backgroundColor: activeFeature === index ? mainColor : surfaceColor }
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
            <ThreeDBox
              width={0.78}
              height={0.65}
              imageUrl={require('../assets/images/3dimage.png')}
            />
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
      >
        <FeatherIcon name="message-circle" size={24} color="#FFFFFF" />
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
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    ...defaultTextStyle,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingTop: 20,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  welcomeTitle: {
    ...defaultTextStyle,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  welcomeSubtitle: {
    ...defaultTextStyle,
    fontSize: 18,
    marginTop: 6,
  },
  // Featured Section
  featuredSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featuredList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  featuredCard: {
    width: width - 60,
    height: 220,
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  featuredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  featuredContent: {
    maxWidth: '85%',
  },
  featuredTitle: {
    ...defaultTextStyle,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  featuredDescription: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  featuredButtonText: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  featuredDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  featuredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  // Avatar Section
  avatarSection: {
    paddingTop: 24,
    paddingBottom: 30,
    marginBottom: 30,
  },
  avatarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 2,
  },
  avatarContainer: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  tryOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  tryOnButtonText: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Trending Section
  trendingSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  trendingList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  productCard: {
    width: 160,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  productPrice: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
  },
  // Style Boards Section
  styleBoardsSection: {
    marginBottom: 30,
  },
  styleBoardsGrid: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  styleBoard: {
    width: width * 0.7,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    padding: 12,
  },
  styleBoardTitle: {
    ...defaultTextStyle,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Community Section
  communitySection: {
    paddingTop: 24,
    paddingBottom: 30,
    marginBottom: 30,
  },
  communityPosts: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  communityPost: {
    width: width * 0.8, // Set width for horizontal scrolling
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16, // Add horizontal margin
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  username: {
    ...defaultTextStyle,
    fontSize: 15,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  actionGroup: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 16,
  },
  postStats: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postLikes: {
    ...defaultTextStyle,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  postComments: {
    ...defaultTextStyle,
    fontSize: 14,
  },
  // Closet Section
  closetSection: {
    marginBottom: 30,
  },
  closetCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  closetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closetTitle: {
    ...defaultTextStyle,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  closetDescription: {
    ...defaultTextStyle,
    fontSize: 14,
    maxWidth: '90%',
  },
  closetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closetIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  closetIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Message Button
  messageButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default OverviewScreen;