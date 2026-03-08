import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Platform,
  Modal,
  PanResponder
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Icon from "react-native-vector-icons/Ionicons";

import { useTheme } from "../styles/themeprovider";
import { db, auth } from "../Config/firebaseconfig";
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from '@react-navigation/native';
import { Linking } from 'react-native';
import { RootStackParamList, MainTabParamList } from '../types/NavigationTypes';
import { appStateManager } from '../utils/appStateManager';
import LockOverlay from '../components/common/LockOverlay';
import { useGuestLock } from '../hooks/useGuestLock';

type NavigationType = NavigationProp<RootStackParamList>;

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
  productId?: string | null;
  description?: string;
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

// Modern product details modal with OutfitDetailScreen-inspired design
const ProductDetailsModal = React.memo(({ 
  visible, 
  item, 
  onClose, 
  onOpenProduct,
  onRemoveFavorite,
  mainColor, 
  cardBgColor,
  textColor, 
  subTextColor,
  borderColor
}: { 
  visible: boolean, 
  item: FavoritedProduct | null, 
  onClose: () => void,
  onOpenProduct: (url: string) => void,
  onRemoveFavorite: (product: FavoritedProduct) => void,
  mainColor: string,
  cardBgColor: string,
  textColor: string,
  subTextColor: string,
  borderColor: string
}) => {
  const navigation = useNavigation();
  const { width, height } = Dimensions.get('window');
  const { isDarkMode } = useTheme();
  
  if (!item) return null;

  // Enhanced color palette following OutfitDetailScreen
  const surfaceColor = isDarkMode ? '#15151F' : '#F9FAFB';
  const successColor = isDarkMode ? '#10B981' : '#059669';
  const warningColor = isDarkMode ? '#F59E0B' : '#D97706';
  
  // Format creation date
  const formatCreationDate = useCallback((createdAt: any): string => {
    try {
      if (!createdAt) return 'Unknown date';
      
      const date = createdAt.toDate 
        ? createdAt.toDate() 
        : createdAt.seconds 
          ? new Date(createdAt.seconds * 1000)
          : new Date(createdAt);
      
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown date';
    }
  }, []);
  
  // Formatted price with proper precision
  const formattedPrice = typeof item.price === 'number' 
    ? `$${item.price.toFixed(2)}` 
    : (typeof item.price === 'string' ? `$${item.price}` : 'Price unavailable');
  
  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity 
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        activeOpacity={1} 
        onPress={onClose} 
      >
        <TouchableOpacity
          style={[
            styles.modernModalContent,
            { 
              backgroundColor: cardBgColor,
              maxHeight: height * 0.85,
            }
          ]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Modern Header */}
          <View style={[styles.modernModalHeader]}>
            <TouchableOpacity
              style={[styles.modernHeaderButton, { backgroundColor: surfaceColor }]}
              onPress={onClose}
            >
              <Icon name="arrow-back" size={22} color={textColor} />
            </TouchableOpacity>
            
            <View style={styles.modernHeaderCenter}>
              <Text style={[styles.modernHeaderTitle, { color: textColor }]}>Product Details</Text>
              <Text style={[styles.modernHeaderSubtitle, { color: subTextColor }]}>
                Favorite Item
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.modernHeaderButton, { backgroundColor: surfaceColor }]}
              onPress={() => item.url && Linking.openURL(item.url)}
              disabled={!item.url}
            >
                                <Icon name="open-outline" size={20} color={item.url ? textColor : subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modernModalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modernModalScrollContent}
          >
            {/* Hero Image Section */}
            <View style={[styles.modernHeroSection, { backgroundColor: surfaceColor }]}>
              <View style={styles.modernImageContainer}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.modernProductImage}
                  resizeMode="cover"
                />
                
                {/* Floating Brand Badge */}
                <View style={styles.modernFloatingBadge}>
                  <View style={[styles.modernBrandBadge, { backgroundColor: mainColor }]}>
                    <Icon name="pricetag" size={14} color="#FFFFFF" />
                    <Text style={styles.modernBrandBadgeText}>{item.brand}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Product Info Card */}
            <View style={[styles.modernInfoCard, { backgroundColor: cardBgColor }]}>
              <View style={styles.modernProductHeader}>
                <View style={styles.modernProductTitleContainer}>
                  <Text style={[styles.modernProductName, { color: textColor }]}>
                    {item.name}
                  </Text>
                  <View style={[styles.modernProductMeta, { backgroundColor: surfaceColor }]}>
                    <Icon name="calendar-outline" size={14} color={subTextColor} />
                    <Text style={[styles.modernProductDate, { color: subTextColor }]}>
                      Added {formatCreationDate(item.favorited)}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.modernPriceTag, { backgroundColor: `${mainColor}15` }]}>
                  <Text style={[styles.modernPriceText, { color: mainColor }]}>
                    {formattedPrice}
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.modernQuickActions}>
                <TouchableOpacity
                  style={[styles.modernPrimaryAction, { backgroundColor: mainColor }]}
                  onPress={() => item.url && onOpenProduct(item.url)}
                  disabled={!item.url}
                >
                  <Icon name="cart" size={18} color="#FFFFFF" />
                  <Text style={styles.modernPrimaryActionText}>
                    {item.url ? 'Shop Now' : 'No Link'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modernSecondaryAction, { backgroundColor: surfaceColor, borderColor: borderColor }]}
                  onPress={() => navigation.navigate('3DTab')}
                >
                  <Icon name="cube-outline" size={16} color={textColor} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modernSecondaryAction, { backgroundColor: surfaceColor, borderColor: borderColor }]}
                  onPress={() => onRemoveFavorite(item)}
                >
                  <Icon name="heart" size={16} color="#FF4757" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Product Details */}
            <View style={[styles.modernDetailsSection, { backgroundColor: cardBgColor }]}>
              <View style={styles.modernSectionHeader}>
                <Text style={[styles.modernSectionTitle, { color: textColor }]}>
                  Product Details
                </Text>
                <Text style={[styles.modernSectionSubtitle, { color: subTextColor }]}>
                  Information about this item
                </Text>
              </View>

              <View style={styles.modernDetailsList}>
                <View style={[styles.modernDetailItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.modernDetailIcon, { backgroundColor: `${mainColor}15` }]}>
                    <Icon name="pricetag" size={18} color={mainColor} />
                  </View>
                  <View style={styles.modernDetailContent}>
                    <Text style={[styles.modernDetailLabel, { color: subTextColor }]}>Brand</Text>
                    <Text style={[styles.modernDetailValue, { color: textColor }]}>{item.brand}</Text>
                  </View>
                </View>
                
                <View style={[styles.modernDetailItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.modernDetailIcon, { backgroundColor: `${successColor}15` }]}>
                    <Icon name="heart" size={18} color={successColor} />
                  </View>
                  <View style={styles.modernDetailContent}>
                    <Text style={[styles.modernDetailLabel, { color: subTextColor }]}>Status</Text>
                    <Text style={[styles.modernDetailValue, { color: textColor }]}>Favorited</Text>
                  </View>
                </View>
                
                {item.url && (
                  <View style={[styles.modernDetailItem, { backgroundColor: surfaceColor }]}>
                    <View style={[styles.modernDetailIcon, { backgroundColor: `${warningColor}15` }]}>
                      <Icon name="link-outline" size={18} color={warningColor} />
                    </View>
                    <View style={styles.modernDetailContent}>
                      <Text style={[styles.modernDetailLabel, { color: subTextColor }]}>Availability</Text>
                      <Text style={[styles.modernDetailValue, { color: textColor }]}>Available Online</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Style Insights */}
            <View style={[styles.modernInsightsSection, { backgroundColor: cardBgColor }]}>
              <Text style={[styles.modernSectionTitle, { color: textColor }]}>
                Style Notes
              </Text>
              
              <View style={styles.modernInsightsList}>
                <View style={[styles.modernInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.modernInsightIcon, { backgroundColor: `${successColor}15` }]}>
                    <Icon name="checkmark-circle-outline" size={18} color={successColor} />
                  </View>
                  <Text style={[styles.modernInsightText, { color: textColor }]}>
                    Added to your favorites collection
                  </Text>
                </View>
                
                <View style={[styles.modernInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.modernInsightIcon, { backgroundColor: `${mainColor}15` }]}>
                    <Icon name="heart-outline" size={18} color={mainColor} />
                  </View>
                  <Text style={[styles.modernInsightText, { color: textColor }]}>
                    Perfect for creating new outfits
                  </Text>
                </View>
                
                <View style={[styles.modernInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.modernInsightIcon, { backgroundColor: `${warningColor}15` }]}>
                    <Icon name="cube-outline" size={18} color={warningColor} />
                  </View>
                  <Text style={[styles.modernInsightText, { color: textColor }]}>
                    Try on with 3D fitting room
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 32 }} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

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
  // State for outfit components modal
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);
  const [outfitModalVisible, setOutfitModalVisible] = useState(false);
  // State for product details modal
  const [selectedProduct, setSelectedProduct] = useState<FavoritedProduct | null>(null);
  const [productModalVisible, setProductModalVisible] = useState(false);
  
  // Create a PanResponder for the swipe gesture
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // If they swipe down more than 80 pixels, dismiss the modal
        if (gestureState.dy > 80) {
          setOutfitModalVisible(false);
          setSelectedOutfit(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If they swipe down more than 50 pixels, dismiss the modal
        if (gestureState.dy > 50) {
          setOutfitModalVisible(false);
          setSelectedOutfit(null);
        }
      },
    })
  ).current;
  
  const { isDarkMode } = useTheme();
  const navigation = useNavigation<NavigationType>();
  
  // Colors based on the app's design theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47'; // Red primary
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';

  // Guest lock functionality
  const isGuest = appStateManager.isGuest();
  const closetLock = useGuestLock({ 
    feature: 'managing your closet', 
    title: 'Build Your Digital Closet!',
    message: 'Sign in to save outfits, favorite products, and manage your personal collection.'
  });
  const outfitLock = useGuestLock({ 
    feature: 'viewing outfit details', 
    title: 'Explore Outfit Details!',
    message: 'Sign in to view detailed outfit breakdowns and styling tips.'
  });
  const productLock = useGuestLock({ 
    feature: 'viewing product details', 
    title: 'Discover Product Details!',
    message: 'Sign in to view product information, prices, and shop links.'
  });
  const surfaceColor = isDarkMode ? '#242535' : '#F5F5F5';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const accentColor = isDarkMode ? '#564DFF' : '#4D41D0'; // Secondary color
  const successColor = isDarkMode ? '#10B981' : '#059669';
  const warningColor = isDarkMode ? '#F59E0B' : '#D97706';

  // Categories for filtering owned products
  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];

  // Load data on component mount
  useEffect(() => {
    loadClosetData();
  }, []);
  
  // Show product details modal
  const showProductDetails = (product: FavoritedProduct) => {
    setSelectedProduct(product);
    setProductModalVisible(true);
  };
  
  // Close product details modal
  const closeProductDetails = () => {
    setProductModalVisible(false);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300);
  };
  
  // Open product URL in browser
  const openProductUrl = (url: string) => {
    if (!url) {
      Alert.alert("No URL", "This product doesn't have a link to view online.");
      return;
    }
    
    Linking.openURL(url).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Cannot open product page');
    });
  };
  
  // Remove item from favorites
  const removeFavorite = async (product: FavoritedProduct) => {
    try {
      // Ask for confirmation
      Alert.alert(
        "Remove from Favorites",
        "Are you sure you want to remove this item from your favorites?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Remove", 
            style: "destructive", 
            onPress: async () => {
              // Close the modal
              closeProductDetails();
              
              // Remove from Firestore
              await db.collection("user_favorite_products").doc(product.id).delete();
              
              // Update state
              setFavoriteProducts(prev => prev.filter(p => p.id !== product.id));
              
              // Show success message
              Alert.alert("Success", "Item removed from favorites.");
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error removing favorite:", error);
      Alert.alert("Error", "Failed to remove item from favorites.");
    }
  };

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
      const outfitsSnapshot = await db
        .collection("saved_outfits")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();
      
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
          products: data.products 
            ? (Array.isArray(data.products) 
               ? data.products 
               : (typeof data.products === 'number' ? [] : []))
            : [],
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
      const favoritesSnapshot = await db
        .collection("user_favorite_products")
        .where("userId", "==", userId)
        .orderBy("favorited", "desc")
        .get();
      
      if (favoritesSnapshot.empty) {
        console.log("No favorite products found");
        setFavoriteProducts([]);
        return;
      }
      
      // Map the documents to our data model
      const allFavorites: FavoritedProduct[] = favoritesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          name: data.name || "Favorite Product",
          brand: data.brand || "Unknown Brand",
          price: data.price || 0,
          imageUrl: data.imageUrl || data.images?.[0] || "",
          favorited: data.favorited,
          url: data.url,
          productId: data.productId || null,
          description: data.description || null
        };
      });
      
      // Handle duplicates by checking product name and brand (and productId if available)
      const uniqueProductsMap = new Map<string, FavoritedProduct>();
      const duplicateIds: string[] = [];
      
      // Process all products to find duplicates and keep only the most recent
      allFavorites.forEach(product => {
        // Normalize strings to prevent issues with whitespace, case, and special characters
        const normalizedName = (product.name || "").trim().toLowerCase();
        const normalizedBrand = (product.brand || "").trim().toLowerCase();
        const productId = product.productId || "";
        
        // Create a unique key based on normalized name and brand
        const productKey = `${normalizedName}_${normalizedBrand}_${productId}`;
        
        console.log(`Processing product: ${product.name} | Brand: ${product.brand} | Key: ${productKey}`);
        
        // If we already have this product, keep the one with the most recent favorited date
        if (uniqueProductsMap.has(productKey)) {
          const existing = uniqueProductsMap.get(productKey)!;
          
          console.log(`Duplicate found: Existing: ${existing.name}, Current: ${product.name}`);
          
          // Compare favorited dates (most recent wins)
          const existingDate = new Date(existing.favorited);
          const currentDate = new Date(product.favorited);
          
          if (currentDate > existingDate) {
            // Current product is more recent, replace existing
            console.log(`Keeping newer: ${product.name} (${currentDate}) over ${existing.name} (${existingDate})`);
            duplicateIds.push(existing.id);
            uniqueProductsMap.set(productKey, product);
          } else {
            // Existing product is more recent, mark current as duplicate
            console.log(`Keeping existing: ${existing.name} (${existingDate}) over ${product.name} (${currentDate})`);
            duplicateIds.push(product.id);
          }
        } else {
          // First time seeing this product, add it to the map
          console.log(`New product added: ${product.name}`);
          uniqueProductsMap.set(productKey, product);
        }
      });
      
      // Convert map values back to array
      const uniqueFavorites = Array.from(uniqueProductsMap.values());
      
      // Extra safety check to ensure no duplicates by product name and brand
      // This catches any edge cases missed by the previous logic
      const nameToProductMap = new Map<string, FavoritedProduct>();
      const finalUniqueFavorites: FavoritedProduct[] = [];
      
      uniqueFavorites.forEach(product => {
        const simplifiedKey = `${(product.name || "").trim().toLowerCase()}_${(product.brand || "").trim().toLowerCase()}`;
        
        if (!nameToProductMap.has(simplifiedKey)) {
          nameToProductMap.set(simplifiedKey, product);
          finalUniqueFavorites.push(product);
        } else {
          // If we still have a duplicate at this point, prefer the most recent one
          const existing = nameToProductMap.get(simplifiedKey)!;
          const existingDate = new Date(existing.favorited);
          const currentDate = new Date(product.favorited);
          
          if (currentDate > existingDate) {
            // Replace in both the map and the array
            const indexToReplace = finalUniqueFavorites.findIndex(p => p.id === existing.id);
            if (indexToReplace !== -1) {
              finalUniqueFavorites[indexToReplace] = product;
              nameToProductMap.set(simplifiedKey, product);
              console.log(`Final check replaced: ${existing.name} with newer ${product.name}`);
            }
          }
        }
      });
      
      console.log(`Original favorites: ${allFavorites.length}, After first deduplication: ${uniqueFavorites.length}, Final unique count: ${finalUniqueFavorites.length}`);
      
      // Set the unique products to state
      setFavoriteProducts(finalUniqueFavorites);
      
      // If duplicates were found, remove them from Firestore
      if (duplicateIds.length > 0) {
        console.log(`Found ${duplicateIds.length} duplicate favorites, cleaning up...`);
        
        // Delete each duplicate document
        const deletePromises = duplicateIds.map(async (docId) => {
          try {
            await db.collection("user_favorite_products").doc(docId).delete();
            console.log(`Deleted duplicate favorite with ID: ${docId}`);
            return { success: true, id: docId };
          } catch (deleteError) {
            console.error(`Error deleting duplicate favorite ${docId}:`, deleteError);
            return { success: false, id: docId, error: deleteError };
          }
        });
        
        // Wait for all deletions to complete and track results
        const deleteResults = await Promise.all(deletePromises);
        const successCount = deleteResults.filter(r => r.success).length;
        const failCount = deleteResults.filter(r => !r.success).length;
        
        console.log(`Duplicate favorites cleanup completed. Successful: ${successCount}, Failed: ${failCount}`);
        
        // If any deletions failed, warn about possible duplicates on next fetch
        if (failCount > 0) {
          console.warn(`Warning: ${failCount} duplicates could not be deleted. They may appear again on next fetch.`);
        }
      }
      
      // Additional check to verify memory state is clean
      if (finalUniqueFavorites.length > 0) {
        // Check for any remaining duplicates by name 
        const nameCount = new Map<string, number>();
        finalUniqueFavorites.forEach(product => {
          const name = (product.name || "").trim().toLowerCase();
          nameCount.set(name, (nameCount.get(name) || 0) + 1);
        });
        
        // Log any duplicates found for debugging
        nameCount.forEach((count, name) => {
          if (count > 1) {
            console.warn(`Warning: Found ${count} items with similar name "${name}" after all deduplication`);
            
            // List the duplicates
            const dupes = finalUniqueFavorites.filter(
              p => (p.name || "").trim().toLowerCase() === name
            );
            
            dupes.forEach(d => console.log(`  - ${d.name} | ${d.brand} | ID: ${d.id} | ProductID: ${d.productId}`));
          }
        });
      }
    } catch (error) {
      console.error("Error fetching favorite products:", error);
      setFavoriteProducts([]);
    }
  };

  // Fetch products that the user owns
  const fetchOwnedProducts = async (userId: string) => {
    try {
      // Query the user_owned_products collection
      const ownedSnapshot = await db
        .collection("user_owned_products")
        .where("userId", "==", userId)
        .orderBy("addedAt", "desc")
        .get();
      
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

  // Handle outfit deletion
  const deleteOutfit = useCallback(async (outfitId: string, outfitName: string) => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to delete outfits');
        return;
      }

      Alert.alert(
        'Delete Outfit',
        `Are you sure you want to delete "${outfitName}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await db.collection('saved_outfits').doc(outfitId).delete();
                
                // Update local state
                setSavedOutfits(prev => prev.filter(outfit => outfit.id !== outfitId));
                
                Alert.alert('Success', 'Outfit deleted successfully');
              } catch (error) {
                console.error('Error deleting outfit:', error);
                Alert.alert('Error', 'Failed to delete outfit. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in deleteOutfit:', error);
      Alert.alert('Error', 'Failed to delete outfit. Please try again.');
    }
  }, []);

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
        console.log('Selected outfit:', JSON.stringify(item, null, 2));
        console.log('Product count:', item.products ? item.products.length : 0);
        console.log('First product sample:', item.products && item.products.length > 0 ? JSON.stringify(item.products[0], null, 2) : 'No products');
        setSelectedOutfit(item);
        setOutfitModalVisible(true);
      }}
      onLongPress={() => deleteOutfit(item.id, item.name)}
      delayLongPress={500}
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
  ), [cardBgColor, isDarkMode, deleteOutfit]);

  // Handle favorite product deletion with confirmation
  const deleteFavoriteProduct = useCallback(async (product: FavoritedProduct) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${product.name}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFavorite(product)
        }
      ]
    );
  }, [removeFavorite]);

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
        const actionAllowed = productLock.lockAction(() => {
          showProductDetails(item);
        });
        if (!actionAllowed) return;
      }}
      onLongPress={() => {
        const actionAllowed = productLock.lockAction(() => {
          deleteFavoriteProduct(item);
        });
        if (!actionAllowed) return;
      }}
      delayLongPress={500}
    >
      <View style={styles.productImageContainer}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.productImage}
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={[styles.favoriteButton, { backgroundColor: mainColor }]}
          onPress={() => removeFavorite(item)}
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
      {/* Shop button removed per request */}
    </TouchableOpacity>
  ), [cardBgColor, borderColor, textColor, subTextColor, mainColor, deleteFavoriteProduct]);

  // Handle owned product deletion
  const deleteOwnedProduct = useCallback(async (product: OwnedProduct) => {
    Alert.alert(
      'Remove Item',
      `Remove "${product.name}" from your closet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentUser = auth().currentUser;
              if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to remove items');
                return;
              }

              await db.collection('user_owned_products').doc(product.id).delete();
              
              // Update local state
              setOwnedProducts(prev => prev.filter(item => item.id !== product.id));
              
              Alert.alert('Success', 'Item removed from your closet');
            } catch (error) {
              console.error('Error deleting owned product:', error);
              Alert.alert('Error', 'Failed to remove item. Please try again.');
            }
          }
        }
      ]
    );
  }, []);

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
        const actionAllowed = productLock.lockAction(() => {
          // Show product details
          Alert.alert("Product Details", `${item.name} by ${item.brand}\nCategory: ${item.category}\nWorn ${item.timesWorn || 0} times`);
        });
        if (!actionAllowed) return;
      }}
      onLongPress={() => {
        const actionAllowed = productLock.lockAction(() => {
          deleteOwnedProduct(item);
        });
        if (!actionAllowed) return;
      }}
      delayLongPress={500}
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
  ), [cardBgColor, borderColor, textColor, subTextColor, mainColor, deleteOwnedProduct]);

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
                      <Icon name="bag-outline" size={32} color={mainColor} />
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
                      <Icon name="heart" size={32} color={mainColor} />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        No Favorite Products Yet
      </Text>
      <Text style={[styles.emptyStateMessage, { color: subTextColor }]}>
        Like products from the feed to save them to your wishlist.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyStateButton, { backgroundColor: mainColor }]}
        onPress={() => navigation.navigate('MainTabs', {
          screen: 'SocialTab'
        })}
      >
        <Text style={styles.emptyStateButtonText}>Browse Fashion Feed</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyOwned = () => (
    <View style={styles.emptyStateContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: surfaceColor }]}>
                      <Icon name="cube-outline" size={32} color={mainColor} />
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

  // Render individual product item in the outfit modal
  const renderOutfitProduct = ({ item }: { item: Product }) => {
    console.log("Rendering product item:", JSON.stringify(item, null, 2));
    
    return (
      <View style={[styles.outfitProductItem, { backgroundColor: cardBgColor, borderColor }]}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.outfitProductImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.noImagePlaceholder, { backgroundColor: surfaceColor }]}>
                              <Icon name="image-outline" size={24} color={subTextColor} />
          </View>
        )}
        <View style={styles.outfitProductInfo}>
          <Text style={[styles.outfitProductBrand, { color: mainColor }]} numberOfLines={1}>
            {item.brand || "Unknown Brand"}
          </Text>
          <Text style={[styles.outfitProductName, { color: textColor }]} numberOfLines={2}>
            {item.name || "Unnamed Product"}
          </Text>
          {item.price && (
            <Text style={[styles.outfitProductPrice, { color: subTextColor }]}>
              ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
            </Text>
          )}
          {item.url && (
            <TouchableOpacity 
              style={[styles.outfitProductLink, { backgroundColor: mainColor }]}
              onPress={() => {
                // Would open the product URL
                Alert.alert("Visit Store", "This would open the product URL in a browser.");
              }}
            >
              <Text style={styles.outfitProductLinkText}>Visit Store</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Product Details Modal */}
      <ProductDetailsModal 
        visible={productModalVisible}
        item={selectedProduct}
        onClose={closeProductDetails}
        onOpenProduct={openProductUrl}
        onRemoveFavorite={removeFavorite}
        mainColor={mainColor}
        cardBgColor={cardBgColor}
        textColor={textColor}
        subTextColor={subTextColor}
        borderColor={borderColor}
      />
      
      {/* Outfit Detail Modal - Exact Mirror of OutfitDetailScreen */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={outfitModalVisible}
        onRequestClose={() => setOutfitModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          {/* Custom Header - Exact match */}
          <SafeAreaView>
            <View style={[styles.outfitDetailHeader, { backgroundColor: cardBgColor }]}>
              <TouchableOpacity
                style={[styles.outfitDetailHeaderButton, { backgroundColor: cardBgColor }]}
                onPress={() => setOutfitModalVisible(false)}
              >
                <Icon name="arrow-back" size={22} color={textColor} />
              </TouchableOpacity>
              
              <View style={styles.outfitDetailHeaderCenter}>
                <Text style={[styles.outfitDetailHeaderTitle, { color: textColor }]}>Outfit Details</Text>
                <Text style={[styles.outfitDetailHeaderSubtitle, { color: subTextColor }]}>
                  {selectedOutfit?.products?.length || 0} pieces
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.outfitDetailHeaderButton, { backgroundColor: cardBgColor }]}
                onPress={() => {
                  // Share functionality
                  Alert.alert("Share", "Share outfit functionality coming soon!");
                }}
              >
                                  <Icon name="share-outline" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <ScrollView
            style={styles.outfitDetailScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.outfitDetailScrollContent}
          >
            {/* Hero Image Section - Exact match */}
            <View style={[styles.outfitDetailHeroSection, { backgroundColor: cardBgColor }]}>
              <View style={styles.outfitDetailImageContainer}>
                <Image
                  source={{ uri: selectedOutfit?.imageUrl }}
                  style={styles.outfitDetailImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Outfit Info Card - Exact match */}
            <View style={[styles.outfitDetailInfoCard, { backgroundColor: cardBgColor }]}>
              <View style={styles.outfitDetailOutfitHeader}>
                <View style={styles.outfitDetailTitleContainer}>
                  <Text style={[styles.outfitDetailName, { color: textColor }]}>
                    {selectedOutfit?.name || 'Untitled Outfit'}
                  </Text>
                  <View style={[styles.outfitDetailMeta, { backgroundColor: surfaceColor }]}>
                    <Icon name="calendar-outline" size={14} color={subTextColor} />
                    <Text style={[styles.outfitDetailDate, { color: subTextColor }]}>
                      Created {selectedOutfit?.createdAt?.toDate ? 
                        selectedOutfit.createdAt.toDate().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Unknown date'}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.outfitDetailItemsCounter, { backgroundColor: `${mainColor}15` }]}>
                  <Text style={[styles.outfitDetailItemsCountText, { color: mainColor }]}>
                    {selectedOutfit?.products?.length || 0}
                  </Text>
                  <Text style={[styles.outfitDetailItemsLabel, { color: mainColor }]}>
                    pieces
                  </Text>
                </View>
              </View>

              {/* Quick Actions - Exact match */}
              <View style={styles.outfitDetailQuickActions}>
                <TouchableOpacity
                  style={[styles.outfitDetailPrimaryAction, { backgroundColor: mainColor }]}
                  onPress={() => {
                    setOutfitModalVisible(false);
                    navigation.navigate('MainTabs', {
                      screen: '3DTab',
                      params: {
                        preloadedOutfit: selectedOutfit ? {
                          id: selectedOutfit.id,
                          name: selectedOutfit.name,
                          products: selectedOutfit.products
                        } : undefined
                      }
                    });
                  }}
                >
                  <Icon name="camera-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.outfitDetailPrimaryActionText}>Try On</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.outfitDetailSecondaryAction, { backgroundColor: surfaceColor, borderColor: borderColor }]}
                  onPress={() => {
                    if (selectedOutfit) {
                      setOutfitModalVisible(false);
                      deleteOutfit(selectedOutfit.id, selectedOutfit.name);
                    }
                  }}
                >
                  <Icon name="trash-outline" size={16} color="#FF4757" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Outfit Pieces - Exact match */}
            <View style={[styles.outfitDetailPiecesSection, { backgroundColor: cardBgColor }]}>
              <View style={styles.outfitDetailSectionHeader}>
                <View>
                  <Text style={[styles.outfitDetailSectionTitle, { color: textColor }]}>
                    Outfit Pieces
                  </Text>
                  <Text style={[styles.outfitDetailSectionSubtitle, { color: subTextColor }]}>
                    Tap to view product details
                  </Text>
                </View>
                <View style={[styles.outfitDetailPiecesCount, { backgroundColor: surfaceColor }]}>
                  <Text style={[styles.outfitDetailPiecesCountText, { color: textColor }]}>
                    {selectedOutfit?.products?.length || 0}
                  </Text>
                </View>
              </View>

              {selectedOutfit?.products && selectedOutfit.products.length > 0 ? (
                <View style={styles.outfitDetailPiecesList}>
                  {selectedOutfit.products.map((product: Product, index: number) => (
                    <TouchableOpacity
                      key={product.id || index}
                      style={[styles.outfitDetailPieceItem, { backgroundColor: surfaceColor }]}
                      onPress={() => {
                        if (product.url) {
                          openProductUrl(product.url);
                        } else {
                          Alert.alert('Product Info', `${product.name} by ${product.brand}`);
                        }
                      }}
                      activeOpacity={product.url ? 0.7 : 1}
                    >
                      <View style={[styles.outfitDetailPieceIconContainer, { backgroundColor: `${mainColor}15` }]}>
                        <Icon 
                          name="shirt-outline"
                          size={22} 
                          color={mainColor} 
                        />
                      </View>
                      
                      <View style={styles.outfitDetailPieceContent}>
                        <Text style={[styles.outfitDetailPieceName, { color: textColor }]} numberOfLines={1}>
                          {product.name || 'Unknown Item'}
                        </Text>
                        <View style={styles.outfitDetailPieceMetaRow}>
                          <Text style={[styles.outfitDetailPieceBrand, { color: subTextColor }]}>
                            {product.brand || 'Unknown Brand'}
                          </Text>
                          {product.price && (
                            <Text style={[styles.outfitDetailPiecePrice, { color: mainColor }]}>
                              ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                            </Text>
                          )}
                        </View>
                      </View>

                      {product.url && (
                        <View style={styles.outfitDetailExternalLinkIndicator}>
                          <Icon 
                            name="open-outline" 
                            size={16} 
                            color={subTextColor} 
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.outfitDetailEmptyPieces}>
                  <Icon name="shirt-outline" size={48} color={subTextColor} style={{opacity: 0.5}} />
                  <Text style={[styles.outfitDetailEmptyPiecesText, { color: subTextColor }]}>
                    No pieces information available
                  </Text>
                  <Text style={[styles.outfitDetailEmptyPiecesSubtext, { color: subTextColor }]}>
                    This outfit was created before piece tracking
                  </Text>
                </View>
              )}
            </View>

            {/* Style Insights - Exact match */}
            <View style={[styles.outfitDetailInsightsSection, { backgroundColor: cardBgColor }]}>
              <Text style={[styles.outfitDetailSectionTitle, { color: textColor }]}>
                Style Insights
              </Text>
              
              <View style={styles.outfitDetailInsightsList}>
                <View style={[styles.outfitDetailInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.outfitDetailInsightIcon, { backgroundColor: `${successColor}15` }]}>
                    <Icon name="time-outline" size={18} color={successColor} />
                  </View>
                  <Text style={[styles.outfitDetailInsightText, { color: textColor }]}>
                    Perfect for casual day outings
                  </Text>
                </View>
                
                <View style={[styles.outfitDetailInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.outfitDetailInsightIcon, { backgroundColor: `${warningColor}15` }]}>
                    <Icon name="sunny-outline" size={18} color={warningColor} />
                  </View>
                  <Text style={[styles.outfitDetailInsightText, { color: textColor }]}>
                    Great for spring/summer weather
                  </Text>
                </View>
                
                <View style={[styles.outfitDetailInsightItem, { backgroundColor: surfaceColor }]}>
                  <View style={[styles.outfitDetailInsightIcon, { backgroundColor: `${mainColor}15` }]}>
                    <Icon name="people-outline" size={18} color={mainColor} />
                  </View>
                  <Text style={[styles.outfitDetailInsightText, { color: textColor }]}>
                    Ideal for social gatherings
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom spacing */}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
      
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
            const actionAllowed = closetLock.lockAction(() => {
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
            });
            if (!actionAllowed) return;
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
          onPress={() => {
            const actionAllowed = closetLock.lockAction(() => {
              setActiveTab("outfits");
            });
            if (!actionAllowed) return;
          }}
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
          onPress={() => {
            const actionAllowed = closetLock.lockAction(() => {
              setActiveTab("favorites");
            });
            if (!actionAllowed) return;
          }}
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
          onPress={() => {
            const actionAllowed = closetLock.lockAction(() => {
              setActiveTab("owned");
            });
            if (!actionAllowed) return;
          }}
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

      {/* Lock Overlays for guest users */}
      <LockOverlay
        {...closetLock.lockProps}
      />
      <LockOverlay
        {...outfitLock.lockProps}
      />
      <LockOverlay
        {...productLock.lockProps}
      />
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
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '95%',
    minHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    flexDirection: 'column',
    display: 'flex',
    overflow: 'hidden', // Prevent content from spilling outside
  },
  dragIndicator: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicatorBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: -4,
  },
  modalOutfitImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  outfitProductsContainer: {
    flex: 1,
    maxHeight: 380, // Increased height for better visibility
    minHeight: 300, // Ensure minimum space for the list
    marginBottom: 12,
  },
  outfitProductsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.2,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
  },
  outfitProductsList: {
    paddingBottom: 16,
    paddingTop: 4,
  },
  noProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    minHeight: 100,
  },
  noProductsText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  noProductsSubText: {
    fontSize: 13,
    textAlign: 'center',
  },
  outfitProductItem: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  outfitProductImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
  },
  noImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitProductInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
    padding: 2,
  },
  outfitProductBrand: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  outfitProductName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
    lineHeight: 18,
  },
  outfitProductPrice: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  outfitProductLink: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  outfitProductLinkText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  separator: {
    height: 1,
    marginVertical: 6,
    opacity: 0.6,
  },
  tryOnButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  tryOnButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Product Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalScrollContainer: {
    flex: 1,
    height: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  modalDetails: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 30,
  },
  modalSiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSiteText: {
    marginLeft: 6,
    fontSize: 16,
    opacity: 0.7,
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.85,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  favoriteButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  viewClosetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  viewClosetButtonText: {
    fontWeight: '500',
    fontSize: 15,
  },
  
  // Premium Modal styles - modern and aesthetic
  modalSafeArea: {
    flex: 1, 
    justifyContent: 'flex-end',
  },
  pullIndicator: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  pullIndicatorBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  productImageWrapper: {
    position: 'relative',
    width: '100%',
  },
  brandBanner: {
    position: 'absolute',
    top: 16,
    left: 0,
    paddingVertical: 4,
    paddingHorizontal: 12,
    paddingRight: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  brandBannerText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  priceContainer: {
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  // Product specs section
  productSpecs: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  specItem: {
    flex: 1,
    marginRight: 10,
  },
  specIcon: {
    marginBottom: 6,
  },
  specLabel: {
    fontSize: 12,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Description section
  productDescription: {
    marginBottom: 20,
  },
  descriptionHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  // Action buttons at bottom
  actionButtonContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainActionButtons: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    height: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    marginHorizontal: 4,
  },
  removeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  tryOnButton: {
    marginRight: 8,
  },
  shopButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#d1d1d6',
  },
  disabledButtonText: {
    color: '#8e8e93',
    fontWeight: '500',
    fontSize: 14,
  },
  
  // Modern Modal Styles (OutfitDetailScreen-inspired)
  modernModalContent: {
    width: '95%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    alignSelf: 'center',
  },
  modernModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modernHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernHeaderCenter: {
    alignItems: 'center',
  },
  modernHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modernHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modernModalScrollView: {
    flex: 1,
  },
  modernModalScrollContent: {
    paddingBottom: 20,
  },
  
  // Hero Section
  modernHeroSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modernImageContainer: {
    position: 'relative',
  },
  modernProductImage: {
    width: '100%',
    height: 280,
  },
  modernFloatingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modernBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modernBrandBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Info Card
  modernInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modernProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modernProductTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modernProductName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },
  modernProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modernProductDate: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  modernPriceTag: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
  },
  modernPriceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Quick Actions
  modernQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modernPrimaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  modernPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modernSecondaryAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  
  // Details Section
  modernDetailsSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modernSectionHeader: {
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modernSectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  modernDetailsList: {
    gap: 12,
  },
  modernDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  modernDetailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modernDetailContent: {
    flex: 1,
  },
  modernDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  modernDetailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Insights Section
  modernInsightsSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modernInsightsList: {
    marginTop: 16,
    gap: 12,
  },
  modernInsightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  modernInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modernInsightText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Modern Outfit Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modernOutfitModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modernOutfitImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  modernOutfitQuickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  modernOutfitPrimaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  modernOutfitPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modernOutfitSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  modernOutfitSecondaryActionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  modernOutfitInfo: {
    padding: 20,
  },
  modernOutfitTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 5,
  },
  modernOutfitSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  modernOutfitPiecesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modernOutfitPiecesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modernOutfitPiecesCount: {
    fontSize: 16,
    color: '#666666',
  },
  modernOutfitEmptyPieces: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  // New Outfit Detail Modal Styles (matching OutfitDetailScreen)
  outfitDetailModalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  outfitDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  outfitDetailScrollView: {
    flex: 1,
  },
  outfitDetailScrollContent: {
    paddingBottom: 20,
  },
  outfitDetailHeroSection: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  outfitDetailImageContainer: {
    position: 'relative',
  },
  outfitDetailImage: {
    width: '100%',
    height: 280,
  },
  outfitDetailInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitDetailTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  outfitDetailName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 30,
  },
  outfitDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  outfitDetailDate: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  outfitDetailItemsCounter: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
  },
  outfitDetailItemsCountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  outfitDetailItemsLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  outfitDetailQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outfitDetailPrimaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  outfitDetailPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outfitDetailSecondaryAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  outfitDetailPiecesSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitDetailSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  outfitDetailSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  outfitDetailSectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  outfitDetailPiecesCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitDetailPiecesCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  outfitDetailPiecesList: {
    gap: 12,
  },
  outfitDetailPieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  outfitDetailPieceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  outfitDetailPieceContent: {
    flex: 1,
  },
  outfitDetailPieceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  outfitDetailPieceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitDetailPieceBrand: {
    fontSize: 13,
    fontWeight: '500',
  },
  outfitDetailPiecePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  outfitDetailExternalLinkIndicator: {
    marginLeft: 8,
  },
  outfitDetailEmptyPieces: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  outfitDetailEmptyPiecesText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  outfitDetailEmptyPiecesSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  outfitDetailInsightsSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitDetailInsightsList: {
    marginTop: 16,
    gap: 12,
  },
  outfitDetailInsightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  outfitDetailInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  outfitDetailInsightText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Modern Outfit Modal Product List Styles
  modernOutfitPieceImageContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modernOutfitProductsList: {
    gap: 12,
    marginTop: 16,
  },
  modernOutfitProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernProductImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  modernProductImage: {
    width: '100%',
    height: '100%',
  },
  modernNoImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  modernProductContent: {
    flex: 1,
  },
  modernProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modernProductBrand: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  modernProductPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  modernProductName: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  modernProductColor: {
    fontSize: 12,
    fontWeight: '400',
  },
  modernProductAction: {
    marginLeft: 12,
    padding: 8,
  },
  modernNoProductsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 16,
  },
  modernNoProductsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  modernNoProductsSubText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Additional missing styles for outfit products
  outfitProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  outfitProductColor: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  outfitProductAction: {
    marginLeft: 12,
    padding: 8,
  },

  // OutfitDetailScreen Mirror Styles - Header
  outfitDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  outfitDetailHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitDetailHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  outfitDetailHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  outfitDetailHeaderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  outfitDetailScrollView: {
    flex: 1,
  },
  outfitDetailScrollContent: {
    paddingBottom: 20,
  },
  outfitDetailHeroSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitDetailImageContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitDetailImage: {
    width: '100%',
    height: '100%',
  },
  outfitDetailInfoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  outfitDetailOutfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
});