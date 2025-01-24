import React from "react";
import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../../types/NavigationTypes";

export interface DynamicNavigationItem {
  name: string; // Ionicon name
  size?: number; // optional custom size
  color?: string; // optional custom color
  label?: string; // text label under the icon
  onPress?: () => void; // Optional press handler
}

interface DynamicNavigationProps {
  icons: DynamicNavigationItem[]; // The full array of icons
}

/**
 * Displays up to 5 icons. Each icon can also have a label below it.
 */
const DynamicNavigation: React.FC<DynamicNavigationProps> = ({ icons }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>(); // Add navigation hook

  // Only show up to 5 icons
  const limitedIcons = icons.slice(0, 5);

  return (
    <View style={styles.container}>
      {limitedIcons.map((icon, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.itemButton}
          onPress={icon.onPress || (() => {})} // Use onPress handler if provided
        >
          <Icon
            name={icon.name}
            size={icon.size ?? 26}
            color={icon.color ?? "#fff"}
          />
          {icon.label && <Text style={styles.label}>{icon.label}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default DynamicNavigation;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 10,
  },
  itemButton: {
    flexDirection: "column",
    alignItems: "center",
    marginHorizontal: 20,
  },
  label: {
    marginTop: 1,
    fontSize: 10,
    color: "#fff",
    fontWeight: "200",
  },
});
