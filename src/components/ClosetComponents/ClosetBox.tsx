import React from "react";
import { View, FlatList, Image, StyleSheet, Dimensions } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const FAKE_FAVORITES = Array.from({ length: 20 }).map((_, i) => ({
  id: i.toString(),
  uri: `https://picsum.photos/300/300?random=${i + 1}`,
}));

interface ClosetBoxProps {
  viewMode: "stack" | "collage";
}

const ClosetBox: React.FC<ClosetBoxProps> = ({ viewMode }) => {
  if (viewMode === "stack") {
    return (
      <FlatList
        data={FAKE_FAVORITES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.stackCard}>
            <Image source={{ uri: item.uri }} style={styles.stackImage} />
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.collageContainer}>
      {FAKE_FAVORITES.slice(0, 9).map((item) => (
        <View key={item.id} style={styles.collageItem}>
          <Image source={{ uri: item.uri }} style={styles.collageImage} />
        </View>
      ))}
    </View>
  );
};

export default ClosetBox;

const styles = StyleSheet.create({
  stackCard: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.5,
    marginRight: 15,
    borderRadius: 10,
    overflow: "hidden",
  },
  stackImage: { width: "100%", height: "100%" },
  collageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  collageItem: {
    width: SCREEN_WIDTH / 3 - 10,
    height: SCREEN_WIDTH / 3 - 10,
    margin: 5,
    borderRadius: 10,
    overflow: "hidden",
  },
  collageImage: { width: "100%", height: "100%" },
});
