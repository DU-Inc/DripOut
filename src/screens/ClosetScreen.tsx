import React, { useState, useRef } from "react";
import {
  SafeAreaView,
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";
import ClosetBox from "../components/ClosetComponents/ClosetBox";
import ClosetNavigation from "../components/ClosetComponents/ClosetNavigation";
import BottomNavigationBar from "../components/NavigationButton/BottomNavigationBar";
import ThreeDNavigation from "../components/NavigationButton/NavigationItems /3DNavigation";


const FAKE_BANNERS = [
  { id: "1", uri: "https://picsum.photos/800/300?random=1" },
  { id: "2", uri: "https://picsum.photos/800/300?random=2" },
];

const FAKE_WISHLIST = Array.from({ length: 5 }).map((_, i) => ({
  id: i.toString(),
  uri: `https://picsum.photos/200/200?random=${i + 1}`,
}));

const FAKE_SLIDING_CARDS = Array.from({ length: 6 }).map((_, i) => ({
  id: i.toString(),
  uri: `https://picsum.photos/200/300?random=${i + 10}`,
  price: `$${(i + 1) * 10}`,
}));

const ClosetScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<"stack" | "collage">("stack");
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation */}
      <ClosetNavigation />

      <ScrollView>
        {/* Banners */}
        <FlatList
          data={FAKE_BANNERS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bannerList}
          renderItem={({ item }) => (
            <Image source={{ uri: item.uri }} style={styles.bannerImage} />
          )}
        />

        {/* Closet Component */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Favorites</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "stack" && styles.activeButton,
              ]}
              onPress={() => setViewMode("stack")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === "stack" && styles.activeButtonText,
                ]}
              >
                Stack View
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "collage" && styles.activeButton,
              ]}
              onPress={() => setViewMode("collage")}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === "collage" && styles.activeButtonText,
                ]}
              >
                Collage View
              </Text>
            </TouchableOpacity>
          </View>
          <ClosetBox viewMode={viewMode} />
        </View>

        {/* Wishlist Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wishlist</Text>
          <FlatList
            data={FAKE_WISHLIST}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.wishlistCard}>
                <Image source={{ uri: item.uri }} style={styles.cardImage} />
              </View>
            )}
          />
        </View>

        {/* Sliding Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop the Look</Text>
          <FlatList
            data={FAKE_SLIDING_CARDS}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.slidingCard}>
                <Image source={{ uri: item.uri }} style={styles.slidingImage} />
                <Text style={styles.price}>{item.price}</Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
      {/* Bottom Navigation Bar */}
      <BottomNavigationBar scrollY={scrollY}>
        <ThreeDNavigation />
      </BottomNavigationBar>
    </SafeAreaView>
  );
};

export default ClosetScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  bannerList: { marginVertical: 10 },
  bannerImage: { width: Dimensions.get("window").width, height: 200 },
  section: { marginVertical: 20, paddingHorizontal: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  toggleContainer: { flexDirection: "row", justifyContent: "center" },
  toggleButton: { padding: 10, marginHorizontal: 5, backgroundColor: "#ddd", borderRadius: 5 },
  activeButton: { backgroundColor: "#333" },
  toggleButtonText: { fontSize: 14, color: "#333" },
  activeButtonText: { color: "#fff" },
  wishlistCard: { width: 150, height: 150, borderRadius: 10, marginRight: 10, overflow: "hidden" },
  cardImage: { width: "100%", height: "100%" },
  slidingCard: { width: 130, marginRight: 10 },
  slidingImage: { width: "100%", height: 150 },
  price: { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", padding: 5, borderRadius: 5 },
});
