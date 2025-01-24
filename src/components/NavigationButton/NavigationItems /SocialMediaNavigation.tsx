import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const SocialMediaNavigation = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.navButton}>
        <Icon name="people-outline" size={30} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton}>
        <Icon name="chatbox-outline" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 10,
  },
});

export default SocialMediaNavigation;
