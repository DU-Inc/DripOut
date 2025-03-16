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
import BottomNavigationBar from "../components/NavigationButton/BottomNavigationBar";
import ThreeDBox from "../components/3DComponents/ThreeDBox"; // Import the reusable 3D Box component
import { useTheme } from "../styles/themeprovider";
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

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "black" : "white" },
      ]}
    >
      {/* Top Navigation */}
      <View style={styles.fixedNavigation}>
        <NavigationItems />
      </View>

      <Animated.ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.content}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* 3D Box Section */}
        <View style={styles.threeDContainer}>
          <Text style={styles.sectionTitle}>Your 3D Avatar</Text>
          <ThreeDBox
            width={0.8}
            height={0.65} // Fixed height
            imageUrl={require('../assets/images/3dimage.png')}
          />
        </View>

        {/* Shopping Cards Section */}
        <Text style={styles.sectionTitle}>Trending Items</Text>
        <View style={styles.shoppingCardsContainer}>
          {FAKE_CARDS.map((card) => (
            <View key={card.id} style={styles.shoppingCard}>
              <Image source={{ uri: card.uri }} style={styles.cardImage} />
              <View style={styles.cardOverlay}>
                <Icon name="eye" size={20} color="white" style={styles.icon} />
                <Icon name="heart" size={20} color="white" style={styles.icon} />
              </View>
            </View>
          ))}
        </View>

        {/* Sliding Cards Section */}
        <Text style={styles.sectionTitle}>Best Deals</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.slidingSection}
        >
          {SLIDING_CARDS.map((card) => (
            <View key={card.id} style={styles.slidingCard}>
              <Image source={{ uri: card.uri }} style={styles.slidingImage} />
              <Text style={styles.price}>{card.price}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Additional Shopping Cards Section */}
        <Text style={styles.sectionTitle}>Just for You</Text>
        <View style={[styles.shoppingCardsContainer, { marginBottom: 50 }]}>
          {FAKE_CARDS.slice(0, 2).map((card) => (
            <View key={card.id} style={styles.shoppingCard}>
              <Image source={{ uri: card.uri }} style={styles.cardImage} />
              <View style={styles.cardOverlay}>
                <Icon name="eye" size={20} color="white" style={styles.icon} />
                <Icon name="heart" size={20} color="white" style={styles.icon} />
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavigationBar scrollY={scrollY}>
        <ThreeDNavigation />
      </BottomNavigationBar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedNavigation: {
    position: "absolute",
    top: 0,
    zIndex: 10,
    width: "100%",
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50, // To account for fixed navigation
    paddingBottom: 50, // For scrollable bottom cards above menu
  },
  threeDContainer: {
    alignItems: "center",
    marginBottom: 20,
    elevation: 5, // Android shadow
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginVertical: 15,
  },
  shoppingCardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  shoppingCard: {
    width: "47%",
    height: 200,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 5,
  },
  cardImage: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(0, 0, 0, 0.0)",
    padding: 5,
    borderRadius: 5,
  },
  slidingSection: {
    marginBottom: 20,
  },
  slidingCard: {
    width: 130,
    height: 100,
    borderRadius: 15,
    marginRight: 10,
    overflow: "hidden",
    elevation: 5,
  },
  slidingImage: {
    width: "100%",
    height: "100%",
  },
  price: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    color: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
  },
});

export default ThreeDScreen;
