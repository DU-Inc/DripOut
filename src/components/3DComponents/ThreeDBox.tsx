import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";

interface ThreeDBoxProps {
  width?: number; // Customizable width as a percentage of the screen width (0-1 scale)
  height?: number; // Customizable height as a percentage of the screen height (0-1 scale)
  imageUrl?: string; // Image URL for 3D representation
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ThreeDBox: React.FC<ThreeDBoxProps> = ({
  width = 1, // Default to full screen width (1 means 100%)
  height = 0.75, // Default to 75% of the screen height
  imageUrl = "https://netrinoimages.s3.eu-west-2.amazonaws.com/2022/07/11/1233906/469853/stunningly_beautiful_woman_3d_model_c4d_max_obj_fbx_ma_lwo_3ds_3dm_stl_4815208_o.jpg", // Default placeholder image
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: screenWidth * width, // Calculate width as a percentage of screen width
          height: screenHeight * height, // Calculate height as a percentage of screen height
        },
      ]}
    >
      <Image source={{ uri: imageUrl }} style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});

export default ThreeDBox;
