import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  Image,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  RefreshControl,
  StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../../Config/firebaseconfig';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import { appStateManager } from '../../utils/appStateManager';
import { useOptimizedProfile } from '../../hooks/useOptimizedProfile';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigations/types';

type NavigationType = NavigationProp<RootStackParamList>;

const OptimizedUserProfileScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets(); // Get safe area insets
  const navigation = useNavigation<NavigationType>();
  
  // Use the optimized profile hook
  const {
    profile,
    preferences,
    posts,
    followCounts,
    savedOutfits,
    loadingStates,
    isInitialLoading,
    isRefreshing,
    refresh,
    forceRefresh,
    error
  } = useOptimizedProfile();

  const [activeTab, setActiveTab] = useState<'posts' | 'outfits' | 'styles'>('posts');

  // Colors based on theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              appStateManager.setAuthenticated(false);
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  }, []);

  // Memoize tab content rendering to prevent unnecessary re-renders
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'posts':
        return (
          <View style={styles.sectionContainer}>
            {loadingStates.posts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={mainColor} />
                <Text style={[styles.loadingText, { color: subTextColor }]}>Loading posts...</Text>
              </View>
            ) : posts.length > 0 ? (
              <FlatList
                key="posts-grid-3-columns"
                data={posts}
                numColumns={3}
                renderItem={({ item, index }) => (
                  <TouchableOpacity 
                    style={styles.postCard}
                    onPress={() => navigation.navigate('PostDetailScreen', {
                      postId: item.id,
                      userId: auth().currentUser?.uid || '',
                      initialPostIndex: index
                    })}
                  >
                    <Image 
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                      style={styles.postImage} 
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="images-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                  No posts yet
                </Text>
              </View>
            )}
          </View>
        );

      case 'outfits':
        return (
          <View style={styles.sectionContainer}>
            {loadingStates.savedOutfits ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={mainColor} />
                <Text style={[styles.loadingText, { color: subTextColor }]}>Loading outfits...</Text>
              </View>
            ) : savedOutfits.length > 0 ? (
              <FlatList
                key="outfits-grid-2-columns"
                data={savedOutfits}
                numColumns={2}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.outfitCard, { backgroundColor: cardBgColor }]}
                    onPress={() => navigation.navigate('OutfitDetailScreen', {
                      outfitId: item.id,
                      outfit: {
                        id: item.id,
                        userId: auth().currentUser?.uid || '',
                        name: item.name,
                        imageUrl: item.imageUrl,
                        products: item.products || [],
                        createdAt: item.createdAt
                      }
                    })}
                  >
                    <Image 
                      source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                      style={styles.outfitImage} 
                      resizeMode="cover"
                    />
                    <Text style={[styles.outfitName, { color: textColor }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Icon name="shirt-outline" size={48} color={subTextColor} />
                <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                  No saved outfits yet
                </Text>
              </View>
            )}
          </View>
        );

      case 'styles':
        return (
          <View style={[styles.preferencesPreview, { backgroundColor: cardBgColor }]}>
            <View style={styles.preferencesHeader}>
              <View>
                <Text style={[styles.preferencesTitle, { color: textColor }]}>
                  Style Preferences
                </Text>
                <Text style={[styles.preferencesSubtitle, { color: subTextColor }]}>
                  Your personal style profile
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: mainColor }]}
                onPress={() => navigation.navigate('UserPreferencesScreen' as never)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {preferences ? (
              <View style={styles.preferencesContent}>
                {/* Preferred Styles */}
                {preferences.preferredStyles && preferences.preferredStyles.length > 0 && (
                  <View style={styles.preferenceGroup}>
                    <Text style={[styles.preferenceLabel, { color: textColor }]}>Preferred Styles</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollView}
                    >
                      {preferences.preferredStyles.map((style, index) => (
                        <View 
                          key={index}
                          style={[styles.styleTag, { backgroundColor: `${mainColor}20` }]}
                        >
                          <Text style={[styles.styleTagText, { color: mainColor }]}>{style}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Preferred Brands */}
                {preferences.preferredBrands && preferences.preferredBrands.length > 0 && (
                  <View style={styles.preferenceGroup}>
                    <Text style={[styles.preferenceLabel, { color: textColor }]}>Favorite Brands</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagsScrollView}
                    >
                      {preferences.preferredBrands.map((brand, index) => (
                        <View 
                          key={index}
                          style={[styles.styleTag, { backgroundColor: `${mainColor}20` }]}
                        >
                          <Text style={[styles.styleTagText, { color: mainColor }]}>{brand}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Sizes */}
                <View style={styles.preferenceSizes}>
                  {preferences.topsSize && (
                    <View style={styles.sizeItem}>
                      <Text style={[styles.sizeLabel, { color: subTextColor }]}>Tops</Text>
                      <Text style={[styles.sizeValue, { color: textColor }]}>{preferences.topsSize}</Text>
                    </View>
                  )}
                  {preferences.bottomsSize && (
                    <View style={styles.sizeItem}>
                      <Text style={[styles.sizeLabel, { color: subTextColor }]}>Bottoms</Text>
                      <Text style={[styles.sizeValue, { color: textColor }]}>{preferences.bottomsSize}</Text>
                    </View>
                  )}
                  {preferences.shoeSize && (
                    <View style={styles.sizeItem}>
                      <Text style={[styles.sizeLabel, { color: subTextColor }]}>Shoes</Text>
                      <Text style={[styles.sizeValue, { color: textColor }]}>{preferences.shoeSize}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noPreferencesContainer}>
                <Icon name="color-palette-outline" size={40} color={subTextColor} />
                <Text style={[styles.noPreferencesText, { color: subTextColor }]}>
                  Set up your style preferences to get personalized recommendations
                </Text>
                <TouchableOpacity 
                  style={[styles.setupButton, { backgroundColor: mainColor }]}
                  onPress={() => navigation.navigate('UserPreferencesScreen' as never)}
                >
                  <Text style={styles.setupButtonText}>Set Preferences</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  }, [activeTab, posts, savedOutfits, preferences, loadingStates, mainColor, subTextColor, textColor, cardBgColor]);

  // Show loading skeleton while initial data loads
  if (isInitialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>
              Loading your profile...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show error if there's an error
  if (error && !profile) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={48} color={mainColor} />
            <Text style={[styles.errorTitle, { color: textColor }]}>
              Something went wrong
            </Text>
            <Text style={[styles.errorMessage, { color: subTextColor }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: mainColor }]}
              onPress={forceRefresh}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={mainColor}
            colors={[mainColor]}
          />
        }
      >
        {/* Profile Header */}
        <View style={[
          styles.profileHeader, 
          { 
            backgroundColor: cardBgColor,
            paddingTop: insets.top + 20 // Add extra padding for notch
          }
        ]}>
          <Image
            source={{ 
              uri: profile?.profilePictureURL || 'https://via.placeholder.com/120'
            }}
            style={styles.profilePicture}
          />
          
          <Text style={[styles.profileName, { color: textColor }]}>
            {profile?.userDisplayName || profile?.fullName || 'User'}
          </Text>
          
          <Text style={[styles.profileUsername, { color: subTextColor }]}>
            @{profile?.username || 'username'}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {posts.length}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Posts</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowingScreen', {
                userId: auth().currentUser?.uid || '',
                initialTab: 'followers'
              })}
            >
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.followers}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowingScreen', {
                userId: auth().currentUser?.uid || '',
                initialTab: 'following'
              })}
            >
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.following}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: cardBgColor }]}>
          {['posts', 'outfits', 'styles'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: mainColor }
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? mainColor : subTextColor }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      </ScrollView>

      {/* Sign Out Button */}
      <View style={[styles.signOutContainer, { backgroundColor: cardBgColor }]}>
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: mainColor }]}
          onPress={handleSignOut}
        >
          <Icon name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },
  profileUsername: {
    fontSize: 16,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  sectionContainer: {
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postCard: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  outfitCard: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 1,
  },
  outfitName: {
    fontSize: 12,
    fontWeight: '500',
    padding: 10,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 10,
  },
  signOutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Styles tab styles
  preferencesPreview: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  preferencesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  preferencesTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferencesSubtitle: {
    fontSize: 14,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  preferencesContent: {
    padding: 16,
  },
  preferenceGroup: {
    marginBottom: 24,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsScrollView: {
    paddingBottom: 8,
  },
  styleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  styleTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  preferenceSizes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  sizeItem: {
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  sizeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  noPreferencesContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noPreferencesText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  setupButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OptimizedUserProfileScreen; 