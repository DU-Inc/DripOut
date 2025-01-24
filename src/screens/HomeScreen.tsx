import React, { useRef } from 'react';
import {
  SafeAreaView,
  Animated,
  View,
  StatusBar,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { Header } from '../components/Home/Header';
import { SignOutButton } from '../components/Home/SignOutButton';
import NavigationButton from '../components/NavigationButton/NavigationButton';
import ThreeDNavigation from '../components/NavigationButton/NavigationItems /3DNavigation';
import BottomNavigationBar from '../components/NavigationButton/BottomNavigationBar';
import { useTheme } from '../styles/themeprovider';

// Some fake post data, each with random picsum URLs
const FAKE_FEED = Array.from({ length: 10 }).map((_, i) => ({
  id: i.toString(),
  uri: `https://picsum.photos/600/400?random=${i + 1}`,
  username: `user${i + 1}`,
  caption: `This is a caption for post #${i + 1}`,
}));

const HomeScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current; // track user scrolling

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? 'black' : 'white' },
      ]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <Animated.ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ paddingHorizontal: 5 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Example header at top */}
        <Header title="Welcome to the Home" />

        {/* <View style={{ marginTop: 5 }}>
          <SignOutButton />
          <NavigationButton screenName="UserProfileScreen" title="Go to Profile" />
          <NavigationButton screenName="UserPreferencesScreen" title="Go to Preferences" />
          <NavigationButton screenName="Home" title="Go to Home" />
        </View> */}

        {/* Fake feed posts */}
        {FAKE_FEED.map((post) => (
          <View key={post.id} style={styles.postContainer}>
            {/* Fake post header: user avatar & username */}
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri: `https://i.pravatar.cc/50?u=${post.username}`,
                }}
                style={styles.avatar}
              />
              <Text style={styles.username}>{post.username}</Text>
            </View>

            {/* Main image */}
            <Image source={{ uri: post.uri }} style={styles.postImage} />

            {/* Caption */}
            <Text style={styles.caption}>{post.caption}</Text>
          </View>
        ))}
      </Animated.ScrollView>

      {/* Provide scrollY to the BottomNavigationBar so you can test the hide/show. */}
      <BottomNavigationBar scrollY={scrollY}>
        <ThreeDNavigation />
      </BottomNavigationBar>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  postContainer: {
    marginTop: 15,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    backgroundColor: '#e2e2e2',
  },
  caption: {
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
});
