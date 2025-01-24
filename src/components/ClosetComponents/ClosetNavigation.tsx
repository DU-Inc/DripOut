import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

const ClosetNavigation: React.FC = () => {
  const tabs = ["Menu1", "Menu2", "Menu3", "Menu4"];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab} style={styles.tabButton}>
          <Text style={styles.tabText}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ClosetNavigation;

const styles = StyleSheet.create({
  navBar: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, backgroundColor: "#f5f5f5" },
  tabButton: { paddingHorizontal: 10, paddingVertical: 5 },
  tabText: { fontSize: 16, fontWeight: "500", color: "#333" },
});
