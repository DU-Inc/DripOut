import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import { useTheme } from "../styles/themeprovider";
import { db, auth } from "../Config/firebaseconfig";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

// Define interfaces for our data models
interface SavedOutfit {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  products: Product[];
  createdAt: any;
}

interface FavoritedProduct {
  id: string;
  userId: string;
  name: string;
  brand: string;
  price: number | string;
  imageUrl: string;
  favorited: any;
  url?: string;
}

interface OwnedProduct {
  id: string;
  userId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  addedAt: any;
  color?: string;
  size?: string;
  timesWorn?: number;
}

interface Product {
  id?: string;
  name?: string;
  brand?: string;
  price?: number | string;
  images?: string[];
  url?: string;
  color?: string;
}

// Main ClosetScreen component
const ClosetScreen: React.FC = () => {
  // State for tracking data and UI state
  const [activeTab, setActiveTab] = useState<"outfits" | "favorites" | "owned">("outfits");
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoritedProduct[]>([]);
  const [ownedProducts, setOwnedProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  // Colors based on the app's design theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const surfaceColor = isDarkMode ? '#242535' : '#F5F5F5';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const accentColor = isDarkMode ? '#564DFF' : '#4D41D0'; // Secondary color

  // Categories for filtering owned products
  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];

  // Load data on component mount
  useEffect(() => {
    loadClosetData();
  }, []);

  // Fetch all closet data from Firestore
  const loadClosetData = async () => {
    setLoading(true);
    const userId = auth().currentUser?.uid;
    
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Load all data types in parallel
      await Promise.all([
        fetchSavedOutfits(userId),
        fetchFavoriteProducts(userId),
        fetchOwnedProducts(userId)
      ]);
    } catch (error) {
      console.error("Error loading closet data:", error);
      Alert.alert("Error", "Failed to load your closet items. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClosetData();
    setRefreshing(false);
  };

  // Fetch saved outfits (try-on results)
  const fetchSavedOutfits = async (userId: string) => {
    try {
      // Query the saved_outfits collection for the current user
      const outfitsQuery = query(
        collection(db, "saved_outfits"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const outfitsSnapshot = await getDocs(outfitsQuery);
      
      if (outfitsSnapshot.empty) {
        console.log("No saved outfits found");
        setSavedOutfits([]);
        return;
      }
      
      // Map the documents to our data model
      const outfits: SavedOutfit[] = outfitsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Saved Outfit",
          imageUrl: data.imageUrl,
          products: data.products || [],
          createdAt: data.createdAt
        };
      });
      
      setSavedOutfits(outfits);
    } catch (error) {
      console.error("Error fetching saved outfits:", error);
      setSavedOutfits([]);
    }
  };

  // Fetch favorite/liked products
  const fetchFavoriteProducts = async (userId: string) => {
    try {
      // Query the user_favorite_products collection
      const favoritesQuery = query(
        collection(db, "user_favorite_products"),
        where("userId", "==", userId),
        orderBy("favorited", "desc")
      );
      
      const favoritesSnapshot = await getDocs(favoritesQuery);
      
      if (favoritesSnapshot.empty) {
        console.log("No favorite products found");
        setFavoriteProducts([]);
        return;
      }
      
      // Map the documents to our data model
      const favorites: FavoritedProduct[] = favoritesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Favorite Product",
          brand: data.brand || "Unknown Brand",
          price: data.price || 0,
          imageUrl: data.imageUrl || data.images?.[0] || "",
          favorited: data.favorited,
          url: data.url
        };
      });
      
      setFavoriteProducts(favorites);
    } catch (error) {
      console.error("Error fetching favorite products:", error);
      setFavoriteProducts([]);
    }
  };

  // Fetch products that the user owns
  const fetchOwnedProducts = async (userId: string) => {
    try {
      // Query the user_owned_products collection
      const ownedQuery = query(
        collection(db, "user_owned_products"),
        where("userId", "==", userId),
        orderBy("addedAt", "desc")
      );
      
      const ownedSnapshot = await getDocs(ownedQuery);
      
      if (ownedSnapshot.empty) {
        console.log("No owned products found");
        setOwnedProducts([]);
        return;
      }
      
      // Map the documents to our data model
      const owned: OwnedProduct[] = ownedSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "My Product",
          brand: data.brand || "Unknown Brand",
          category: data.category || "Other",
          imageUrl: data.imageUrl || "",
          addedAt: data.addedAt,
          color: data.color,
          size: data.size,
          timesWorn: data.timesWorn || 0
        };
      });
      
      setOwnedProducts(owned);
    } catch (error) {
      console.error("Error fetching owned products:", error);
      setOwnedProducts([]);
    }
  };

  // Filter owned products by selected category
  const filteredOwnedProducts = useCallback(() => {
    if (selectedCategory === "All") {
      return ownedProducts;
    }
    return ownedProducts.filter(product => product.category === selectedCategory);
  }, [ownedProducts, selectedCategory]);

  // Render saved outfit item
  const renderOutfit = useCallback(({ item }: { item: SavedOutfit }) => (
    <TouchableOpacity
      style={[
        styles.outfitCard,
        { 
          backgroundColor: cardBgColor,
          shadowColor: isDarkMode ? "rgba(255, 72, 112, 0.15)" : "rgba(0, 0, 0, 0.1)"
        }
      ]}
      onPress={() => {
        Alert.alert("Outfit Details", `${item.name} with ${item.products.length} items`);
      }}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.outfitImage}
        resizeMode="cover"
      />
      <View style={styles.outfitOverlay}>
        <Text style={styles.outfitName}>{item.name}</Text>
        <Text style={styles.outfitItemCount}>{item.products.length} items</Text>
      </View>
    </TouchableOpacity>
  ), [cardBgColor, isDarkMode]);

  // Render favorite product item
  const renderFavoriteProduct = useCallback(({ item }: { item: FavoritedProduct }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        { 
          backgroundColor: cardBgColor,
          borderColor: borderColor
        }
      ]}
      onPress={() => {
        if (item.url) {
          // Open product URL in browser or in-app webview
          Alert.alert("Product Details", `View ${item.name} by ${item.brand}`);
        }
      }}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={[styles.favoriteButton, { backgroundColor: mainColor }]}
          onPress={() => {
            // Handle unfavorite logic
            Alert.alert(
              "Remove from Favorites",
              "Are you sure you want to remove this item from your favorites?",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Remove", 
                  style: "destructive", 
                  onPress: () => {
                    // Remove logic would go here
                    Alert.alert("Not Implemented", "This feature is coming soon!");
                  }
                }
              ]
            );
          }}
        >
          <Icon name="heart" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productBrand, { color: mainColor }]} numberOfLines={1}>
          {item.brand}
        </Text>
        <Text style={[styles.productName, { color: textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.productPrice, { color: subTextColor }]}>
          ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.shopButton, { backgroundColor: mainColor }]}
        onPress={() => {
          if (item.url) {
            // Open product URL or shop functionality
            Alert.alert("Visit Store", "This feature will open the product page.");
          }
        }}
      >
        <Text style={styles.shopButtonText}>Shop</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [cardBgColor, borderColor, textColor, subTextColor, mainColor]);

  // Render owned product item
  const renderOwnedProduct = useCallback(({ item }: { item: OwnedProduct }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        { 
          backgroundColor: cardBgColor,
          borderColor: borderColor
        }
      ]}
      onPress={() => {
        // Show product details
        Alert.alert("Product Details", `${item.name} by ${item.brand}\nCategory: ${item.category}\nWorn ${item.timesWorn || 0} times`);
      }}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productBrand, { color: mainColor }]} numberOfLines={1}>
          {item.brand}
        </Text>
        <Text style={[styles.productName, { color: textColor }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.productMeta}>
          {item.color && (
            <View style={styles.colorDot} backgroundColor={item.color} />
          )}
          {item.size && (
            <Text style={[styles.sizeText, { color: subTextColor }]}>
              Size: {item.size}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.wornCounter}>
        <Text style={[styles.wornText, { color: subTextColor }]}>
          Worn {item.timesWorn || 0}×
        </Text>
      </View>
    </TouchableOpacity>
  ), [cardBgColor, borderColor, textColor, subTextColor, mainColor]);

  // Render category filter chip
  const renderCategoryChip = useCallback((category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        { 
          backgroundColor: selectedCategory === category ? mainColor : surfaceColor,
          borderColor: selectedCategory === category ? mainColor : borderColor
        }
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text 
        style={[
          styles.categoryText,
          { color: selectedCategory === category ? "#FFFFFF" : subTextColor }
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  ), [selectedCategory, mainColor, surfaceColor, borderColor, subTextColor]);

  // Empty state components for each tab
  const renderEmptyOutfits = () => (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: surfaceColor }]}>
        <FeatherIcon name="shopping-bag" size={32} color={mainColor} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        No Saved Outfits Yet
      </Text>
      <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
        Try on clothes in the 3D fitting room and save your favorite looks here.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyStateButton, { backgroundColor: mainColor }]}
        onPress={() => navigation.navigate('3DTab')}
      >
        <Text style={styles.emptyStateButtonText}>Go to Fitting Room</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyFavorites = () => (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: surfaceColor }]}>
        <FeatherIcon name="heart" size={32} color={mainColor} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        No Favorite Products Yet
      </Text>
      <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
        Like products from the feed to save them to your wishlist.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyStateButton, { backgroundColor: mainColor }]}
        onPress={() => navigation.navigate('SocialScreen')}
      >
        <Text style={styles.emptyStateButtonText}>Browse Fashion Feed</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyOwned = () => (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: surfaceColor }]}>
        <FeatherIcon name="package" size={32} color={mainColor} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        No Items in Your Wardrobe
      </Text>
      <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
        Add items that you own to your digital wardrobe.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyStateButton, { backgroundColor: mainColor }]}
        onPress={() => {
          // Handle add item logic
          Alert.alert("Coming Soon", "The ability to add your own items will be available soon!");
        }}
      >
        <Text style={styles.emptyStateButtonText}>Add an Item</Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state component
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading your closet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>My Closet</Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
            Your virtual fashion collection
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: mainColor }]}
          onPress={() => {
            // Navigate to add item flow or show options
            Alert.alert(
              "Add to Closet",
              "Choose what you want to add:",
              [
                {
                  text: "Try On Outfit",
                  onPress: () => navigation.navigate('3DTab')
                },
                {
                  text: "Add Owned Item",
                  onPress: () => Alert.alert("Coming Soon", "This feature will be available soon!")
                },
                {
                  text: "Cancel",
                  style: "cancel"
                }
              ]
            );
          }}
        >
          <Icon name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === "outfits" && [styles.activeTab, { borderBottomColor: mainColor }]
          ]}
          onPress={() => setActiveTab("outfits")}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === "outfits" ? mainColor : subTextColor }
            ]}
          >
            Saved Outfits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === "favorites" && [styles.activeTab, { borderBottomColor: mainColor }]
          ]}
          onPress={() => setActiveTab("favorites")}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === "favorites" ? mainColor : subTextColor }
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === "owned" && [styles.activeTab, { borderBottomColor: mainColor }]
          ]}
          onPress={() => setActiveTab("owned")}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === "owned" ? mainColor : subTextColor }
            ]}
          >
            My Items
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === "outfits" && (
        <FlatList
          data={savedOutfits}
          renderItem={renderOutfit}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.outfitGrid}
          columnWrapperStyle={styles.outfitRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[mainColor]}
              tintColor={mainColor}
            />
          }
          ListEmptyComponent={renderEmptyOutfits}
          // Performance optimizations
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      )}

      {activeTab === "favorites" && (
        <FlatList
          data={favoriteProducts}
          renderItem={renderFavoriteProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[mainColor]}
              tintColor={mainColor}
            />
          }
          ListEmptyComponent={renderEmptyFavorites}
          // Performance optimizations
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      )}

      {activeTab === "owned" && (
        <>
          {/* Category Filter */}
          <View style={styles.categoriesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.map(category => renderCategoryChip(category))}
            </ScrollView>
          </View>
          
          <FlatList
            data={filteredOwnedProducts()}
            renderItem={renderOwnedProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
            columnWrapperStyle={styles.productRow}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[mainColor]}
                tintColor={mainColor}
              />
            }
            ListEmptyComponent={renderEmptyOwned}
            // Performance optimizations
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={4}
            windowSize={5}
          />
        </>
      )}
    </SafeAreaView>
  );
};

export default ClosetScreen;

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 40) / 2; // Two columns with spacing

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Outfit grid styles
  outfitGrid: {
    padding: 12,
    paddingBottom: 100,
  },
  outfitRow: {
    justifyContent: 'space-between',
  },
  outfitCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  outfitName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  outfitItemCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  // Product grid styles
  productGrid: {
    padding: 12,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.7,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: ITEM_WIDTH * 1.1,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
    flex: 1,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sizeText: {
    fontSize: 12,
  },
  wornCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  wornText: {
    fontSize: 11,
    fontWeight: '500',
  },
  shopButton: {
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  shopButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Category filter styles
  categoriesContainer: {
    marginVertical: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});