import React, { useRef } from "react";
import {
  SafeAreaView,
  Animated,
  View,
  StyleSheet,
  Image,
  ScrollView,
  Text,
} from "react-native";
import ThreeDNavigation from "../components/NavigationButton/NavigationItems /3DNavigation";
import NavigationItems from "../components/3DComponents/3DNavigationItems";
// No longer need custom bottom navigation bar with tab navigator
import ThreeDBox from "../components/3DComponents/ThreeDBox"; // Import the reusable 3D Box component
import { useTheme } from '../styles/theme/ThemeContext';
import Icon from "react-native-vector-icons/Ionicons";

const FAKE_CARDS = [
  { id: "1", uri: "https://picsum.photos/300/300?random=1" },
  { id: "2", uri: "https://picsum.photos/300/300?random=2" },
  { id: "3", uri: "https://picsum.photos/300/300?random=3" },
  { id: "4", uri: "https://picsum.photos/300/300?random=4" },
];

const SLIDING_CARDS = [
  { id: "1", uri: "https://picsum.photos/300/200?random=5", price: "$25" },
  { id: "2", uri: "https://picsum.photos/300/200?random=6", price: "$35" },
  { id: "3", uri: "https://picsum.photos/300/200?random=7", price: "$45" },
  { id: "4", uri: "https://picsum.photos/300/200?random=8", price: "$55" },
  { id: "5", uri: "https://picsum.photos/300/200?random=9", price: "$65" },
  { id: "6", uri: "https://picsum.photos/300/200?random=10", price: "$75" },
];

const ThreeDScreen: React.FC = () => {
  const scrollY = useRef(new Animated.Value(0)).current; // Track scrolling
  const { isDarkMode } = useTheme();
  
  // iOS-native colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const surfaceColor = isDarkMode ? '#1C1C1E' : '#F2F2F7'; // iOS system background
  const cardBgColor = isDarkMode ? '#2C2C2E' : '#FFFFFF'; // iOS card background

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: bgColor },
      ]}
    >
      {/* iOS-style header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>3D Wardrobe</Text>
        <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
          Try on clothes virtually
        </Text>
      </View>

      <Animated.ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* 3D Box Section */}
        <View style={[
          styles.threeDContainer,
          { 
            backgroundColor: cardBgColor,
            shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
          }
        ]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Your 3D Avatar</Text>
          <ThreeDBox
            width={0.85}
            height={0.65}
            imageUrl={require('../assets/images/3dimage.png')}
          />
        </View>

        {/* Shopping Cards Section with iOS styling */}
        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 30 }]}>Trending Items</Text>
        <View style={styles.shoppingCardsContainer}>
          {FAKE_CARDS.map((card) => (
            <View 
              key={card.id} 
              style={[
                styles.shoppingCard,
                { 
                  backgroundColor: cardBgColor,
                  shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.2)'
                }
              ]}
            >
              <Image source={{ uri: card.uri }} style={styles.cardImage} />
              <View style={styles.cardOverlay}>
                <Icon 
                  name="eye-outline" 
                  size={22} 
                  color="white" 
                  style={[styles.icon, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
                />
                <Icon 
                  name="heart-outline" 
                  size={22} 
                  color="white" 
                  style={[styles.icon, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Sliding Cards Section with iOS styling */}
        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 25 }]}>Best Deals</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.slidingSection}
          decelerationRate="fast"
          snapToInterval={150}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {SLIDING_CARDS.map((card) => (
            <View 
              key={card.id} 
              style={[
                styles.slidingCard,
                { 
                  backgroundColor: cardBgColor,
                  shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.2)'
                }
              ]}
            >
              <Image source={{ uri: card.uri }} style={styles.slidingImage} />
              <Text style={styles.price}>{card.price}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Additional Shopping Cards Section with iOS styling */}
        <Text style={[styles.sectionTitle, { color: textColor, marginTop: 25 }]}>Just for You</Text>
        <View style={[styles.shoppingCardsContainer, { marginBottom: 100 }]}>
          {FAKE_CARDS.slice(0, 2).map((card) => (
            <View 
              key={card.id} 
              style={[
                styles.shoppingCard,
                { 
                  backgroundColor: cardBgColor,
                  shadowColor: isDarkMode ? mainColor : 'rgba(0,0,0,0.2)'
                }
              ]}
            >
              <Image source={{ uri: card.uri }} style={styles.cardImage} />
              <View style={styles.cardOverlay}>
                <Icon 
                  name="eye-outline" 
                  size={22} 
                  color="white" 
                  style={[styles.icon, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
                />
                <Icon 
                  name="heart-outline" 
                  size={22} 
                  color="white" 
                  style={[styles.icon, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
                />
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.35, // iOS font tracking
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  threeDContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8, 
    elevation: 5, // Android shadow
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  shoppingCardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  shoppingCard: {
    width: "47%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  icon: {
    padding: 8,
    borderRadius: 20,
  },
  slidingSection: {
    marginBottom: 24,
  },
  slidingCard: {
    width: 140,
    height: 110,
    borderRadius: 16,
    marginRight: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  slidingImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  price: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
  },
});

export default ThreeDScreen;
