import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const NavigationItems = () => {
  const [activeTab, setActiveTab] = useState("Me"); // State to track the active tab

  const tabs = ["Me", "My Closet", "Make Over", "Friends"];

  return (
    <View style={styles.navBar}>
      <TouchableOpacity style={styles.searchIcon}>
        <Icon name="search" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.menu}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.navItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.text,
                activeTab === tab && styles.activeText, // Apply active styles
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center", // Align items vertically
    paddingTop: 5, // Reduced top padding
    paddingBottom: 10, // Increased bottom padding
    backgroundColor: "transparent", // Transparent background
    position: "absolute",
    top: 0,
    width: "100%",
    paddingHorizontal: 10, // Consistent horizontal padding
  },
  searchIcon: {
    position: "absolute",
    right: 15, // Align the search icon to the far left
  },
  menu: {
    flexDirection: "row",
    justifyContent: "center", // Center menu items horizontally
    flex: 1, // Take up available space
  },
  navItem: {
    marginHorizontal: 8, // Spacing between tabs
  },
  text: {
    fontSize: 17, // Slightly larger for better readability
    fontWeight: "400", // Regular weight for inactive tabs
    color: "#333",
  },
  activeText: {
    fontSize: 18, // Larger size for active tab
    fontWeight: "600", // Bolder for active tab
    color: "#000", // Darker color for active tab
  },
});

export default NavigationItems;
