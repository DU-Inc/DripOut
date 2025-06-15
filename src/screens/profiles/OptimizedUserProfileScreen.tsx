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
import { auth } from '../../Config/firebaseconfig';
import { useTheme } from '../../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import { appStateManager } from '../../utils/appStateManager';
import { useOptimizedProfile } from '../../hooks/useOptimizedProfile';

const OptimizedUserProfileScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  // Use the optimized profile hook
  const {
    profile,
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

  const [activeTab, setActiveTab] = useState<'posts' | 'outfits'>('posts');

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
        <View style={[styles.profileHeader, { backgroundColor: cardBgColor }]}>
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
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.followers}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Followers</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: textColor }]}>
                {followCounts.following}
              </Text>
              <Text style={[styles.statLabel, { color: subTextColor }]}>Following</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: cardBgColor }]}>
          {['posts', 'outfits'].map((tab) => (
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
          {activeTab === 'posts' && (
            <View style={styles.sectionContainer}>
              {loadingStates.posts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={mainColor} />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>Loading posts...</Text>
                </View>
              ) : posts.length > 0 ? (
                <FlatList
                  data={posts}
                  numColumns={3}
                  renderItem={({ item }) => (
                    <View style={styles.postCard}>
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.postImage} 
                        resizeMode="cover"
                      />
                    </View>
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
          )}

          {activeTab === 'outfits' && (
            <View style={styles.sectionContainer}>
              {loadingStates.savedOutfits ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={mainColor} />
                  <Text style={[styles.loadingText, { color: subTextColor }]}>Loading outfits...</Text>
                </View>
              ) : savedOutfits.length > 0 ? (
                <FlatList
                  data={savedOutfits}
                  numColumns={2}
                  renderItem={({ item }) => (
                    <View style={[styles.outfitCard, { backgroundColor: cardBgColor }]}>
                      <Image 
                        source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                        style={styles.outfitImage} 
                        resizeMode="cover"
                      />
                      <Text style={[styles.outfitName, { color: textColor }]}>
                        {item.name}
                      </Text>
                    </View>
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
          )}
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
    paddingVertical: 30,
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
});

export default OptimizedUserProfileScreen; 