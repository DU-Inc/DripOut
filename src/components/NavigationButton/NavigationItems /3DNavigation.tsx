import React from "react";
import DynamicNavigation, { DynamicNavigationItem } from "./DynamicNavigation";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../../types/NavigationTypes";

const ThreeDNavigation = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const icons: DynamicNavigationItem[] = [
    {
      name: "cube-outline",
      label: "3D",
      onPress: () => navigation.navigate("ThreeDScreen"), // Navigate to 3D Screen
    },
    {
      name: "shirt-outline",
      label: "Closet",
      onPress: () => navigation.navigate("ClosetScreen"), // Navigate to Closet Screen
    },
    {
      name: "cart-outline",
      label: "Cart",
      
    },
  ];

  return <DynamicNavigation icons={icons} />;
};

export default ThreeDNavigation;
