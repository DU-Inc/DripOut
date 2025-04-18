import React, { useState, useRef } from "react";
import {
  SafeAreaView,
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
  SectionList,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from '../styles/theme/ThemeContext';

// Mock wardrobe items - items the user owns
const OWNED_ITEMS = [
  {
    id: "o1",
    name: "Premium Cotton T-Shirt",
    brand: "Uniqlo",
    color: "Navy Blue",
    category: "Tops",
    uri: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format",
    purchaseDate: "March 10, 2024",
    timesWorn: 5
  },
  {
    id: "o2",
    name: "Slim Fit Jeans",
    brand: "Levi's",
    color: "Dark Indigo",
    category: "Bottoms",
    uri: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format",
    purchaseDate: "February 15, 2024",
    timesWorn: 8
  },
  {
    id: "o3",
    name: "Wool Blend Sweater",
    brand: "J.Crew",
    color: "Burgundy",
    category: "Tops",
    uri: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format",
    purchaseDate: "January 5, 2024",
    timesWorn: 3
  },
  {
    id: "o4",
    name: "Classic Leather Sneakers",
    brand: "Adidas",
    color: "White",
    category: "Footwear",
    uri: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600&auto=format",
    purchaseDate: "December 20, 2023",
    timesWorn: 12
  },
  {
    id: "o5",
    name: "Structured Blazer",
    brand: "Zara",
    color: "Charcoal",
    category: "Outerwear",
    uri: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=600&auto=format",
    purchaseDate: "November 15, 2023",
    timesWorn: 2
  },
  {
    id: "o6",
    name: "Casual Button-Down Shirt",
    brand: "H&M",
    color: "Light Blue",
    category: "Tops",
    uri: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?q=80&w=600&auto=format",
    purchaseDate: "October 5, 2023",
    timesWorn: 6
  }
];

// Mock saved/liked items - items the user does not own but likes
const LIKED_ITEMS = [
  {
    id: "l1",
    name: "Premium Wool Coat",
    brand: "COS",
    price: 250,
    uri: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=600&auto=format",
    liked: "April 12, 2024"
  },
  {
    id: "l2",
    name: "Oversized Sweater",
    brand: "& Other Stories",
    price: 89,
    uri: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=600&auto=format",
    liked: "April 10, 2024"
  },
  {
    id: "l3",
    name: "Chelsea Boots",
    brand: "Dr. Martens",
    price: 160,
    uri: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=600&auto=format",
    liked: "April 8, 2024"
  },
  {
    id: "l4",
    name: "Leather Crossbody Bag",
    brand: "Madewell",
    price: 120,
    uri: "https://images.unsplash.com/photo-1594223274512-ad4200e8b2a1?q=80&w=600&auto=format",
    liked: "April 5, 2024"
  },
  {
    id: "l5",
    name: "Straight Leg Trousers",
    brand: "Arket",
    price: 95,
    uri: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format",
    liked: "April 2, 2024"
  }
];

// Outfit suggestions based on owned items
const OUTFIT_SUGGESTIONS = [
  {
    id: "outfit1",
    name: "Casual Weekend",
    items: [OWNED_ITEMS[0], OWNED_ITEMS[1], OWNED_ITEMS[3]],
    imageUri: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format"
  },
  {
    id: "outfit2",
    name: "Business Casual",
    items: [OWNED_ITEMS[2], OWNED_ITEMS[1], OWNED_ITEMS[4]],
    imageUri: "https://images.unsplash.com/photo-1580420876816-ac9e5c1f48b4?q=80&w=800&auto=format"
  },
  {
    id: "outfit3",
    name: "Smart Evening",
    items: [OWNED_ITEMS[5], OWNED_ITEMS[1], OWNED_ITEMS[3]],
    imageUri: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?q=80&w=800&auto=format"
  }
];

// Closet statistics
const CLOSET_STATS = {
  totalItems: OWNED_ITEMS.length,
  categories: {
    Tops: OWNED_ITEMS.filter(item => item.category === "Tops").length,
    Bottoms: OWNED_ITEMS.filter(item => item.category === "Bottoms").length,
    Footwear: OWNED_ITEMS.filter(item => item.category === "Footwear").length,
    Outerwear: OWNED_ITEMS.filter(item => item.category === "Outerwear").length
  },
  mostWorn: OWNED_ITEMS.reduce((prev, current) => (prev.timesWorn > current.timesWorn) ? prev : current),
  recentlyAdded: OWNED_ITEMS.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0]
};

// Add interface types for the items
interface OwnedItem {
  id: string;
  name: string;
  brand: string;
  color: string;
  category: string;
  uri: string;
  purchaseDate: string;
  timesWorn: number;
}

interface LikedItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  uri: string;
  liked: string;
}

interface OutfitItem {
  id: string;
  name: string;
  items: OwnedItem[];
  imageUri: string;
}

const ClosetScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"owned" | "saved">("owned");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const scrollY = useRef(new Animated.Value(0)).current;
  const { isDarkMode } = useTheme();
  
  // iOS-native colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subTextColor = isDarkMode ? '#8E8E93' : '#6E6E73'; // iOS gray
  const mainColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS blue
  const secondaryColor = isDarkMode ? '#64D2FF' : '#5AC8FA'; // iOS light blue
  const accentColor = isDarkMode ? '#FF453A' : '#FF3B30'; // iOS red
  const cardBgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF'; // iOS card background
  const surfaceColor = isDarkMode ? '#2C2C2E' : '#F2F2F7'; // iOS system gray
  const separatorColor = isDarkMode ? '#38383A' : '#E5E5EA'; // iOS separator

  const categories = ["All", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories"];

  // Filter items based on selected category
  const filteredOwnedItems = selectedCategory === "All" 
    ? OWNED_ITEMS 
    : OWNED_ITEMS.filter(item => item.category === selectedCategory);

  const renderCategoryChip = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        { backgroundColor: selectedCategory === category ? mainColor : surfaceColor },
        isDarkMode && selectedCategory !== category && { borderWidth: 1, borderColor: '#38383A' }
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text 
        style={[
          styles.categoryText,
          { color: selectedCategory === category ? '#FFFFFF' : subTextColor }
        ]}
      >
        {category}
      </Text>
    </TouchableOpacity>
  );

  // Render an owned wardrobe item
  const renderOwnedItem = ({ item, index }: { item: OwnedItem; index: number }) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { 
          backgroundColor: cardBgColor,
          shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
        }
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.uri }} style={styles.itemImage} />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.itemBrand, { color: mainColor }]}>
          {item.brand}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemMetaText, { color: subTextColor }]}>
            Worn {item.timesWorn} times
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.itemAction}>
        <Icon name="ellipsis-horizontal" size={20} color={subTextColor} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render a liked/saved wardrobe item
  const renderLikedItem = ({ item, index }: { item: LikedItem; index: number }) => (
    <TouchableOpacity
      style={[
        styles.itemCard,
        { 
          backgroundColor: cardBgColor,
          shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
        }
      ]}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.uri }} style={styles.itemImage} />
        <TouchableOpacity style={styles.likeButton}>
          <Icon name="heart" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: textColor }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.itemBrand, { color: mainColor }]}>
          {item.brand}
        </Text>
        <Text style={[styles.itemPrice, { color: subTextColor }]}>
          ${item.price}
        </Text>
      </View>
      <TouchableOpacity 
        style={[
          styles.buyButton,
          { backgroundColor: mainColor }
        ]}
      >
        <Text style={styles.buyButtonText}>Buy</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render outfit suggestion card
  const renderOutfit = ({ item, index }: { item: OutfitItem; index: number }) => (
    <TouchableOpacity
      style={[
        styles.outfitCard,
        { 
          backgroundColor: cardBgColor,
          shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
        }
      ]}
    >
      <Image source={{ uri: item.imageUri }} style={styles.outfitImage} />
      <View style={styles.outfitDetails}>
        <Text style={[styles.outfitName, { color: textColor }]}>
          {item.name}
        </Text>
        <Text style={[styles.outfitItemCount, { color: subTextColor }]}>
          {item.items.length} items
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* iOS-style header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>Closet</Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
            {CLOSET_STATS.totalItems} items in your wardrobe
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: mainColor }]}
          onPress={() => {}}
        >
          <Icon name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab selection */}
      <View style={[styles.tabContainer, { borderBottomColor: separatorColor }]}>
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
            My Wardrobe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === "saved" && [styles.activeTab, { borderBottomColor: mainColor }]
          ]}
          onPress={() => setActiveTab("saved")}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === "saved" ? mainColor : subTextColor }
            ]}
          >
            Saved Items
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {activeTab === "owned" ? (
          <>
            {/* Closet statistics card */}
            <View style={[
              styles.statsCard, 
              { 
                backgroundColor: cardBgColor,
                shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
              }
            ]}>
              <Text style={[styles.statsTitle, { color: textColor }]}>Closet Insights</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {CLOSET_STATS.categories.Tops}
                  </Text>
                  <Text style={[styles.statLabel, { color: subTextColor }]}>Tops</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {CLOSET_STATS.categories.Bottoms}
                  </Text>
                  <Text style={[styles.statLabel, { color: subTextColor }]}>Bottoms</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {CLOSET_STATS.categories.Footwear}
                  </Text>
                  <Text style={[styles.statLabel, { color: subTextColor }]}>Shoes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: textColor }]}>
                    {CLOSET_STATS.categories.Outerwear}
                  </Text>
                  <Text style={[styles.statLabel, { color: subTextColor }]}>Outerwear</Text>
                </View>
              </View>
              
              <View style={[styles.mostWornContainer, { borderTopColor: separatorColor }]}>
                <View style={styles.mostWornInfo}>
                  <Text style={[styles.mostWornLabel, { color: subTextColor }]}>
                    Most worn item:
                  </Text>
                  <Text style={[styles.mostWornItem, { color: textColor }]}>
                    {CLOSET_STATS.mostWorn.name}
                  </Text>
                  <Text style={[styles.mostWornCount, { color: mainColor }]}>
                    {CLOSET_STATS.mostWorn.timesWorn} times
                  </Text>
                </View>
                <Image 
                  source={{ uri: CLOSET_STATS.mostWorn.uri }} 
                  style={styles.mostWornImage} 
                />
              </View>
            </View>

            {/* Outfit suggestions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Outfit Suggestions
              </Text>
              <FlatList
                data={OUTFIT_SUGGESTIONS}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderOutfit}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              />
            </View>

            {/* Category filter chips */}
            <View style={styles.categoriesContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {categories.map(category => renderCategoryChip(category))}
              </ScrollView>
            </View>

            {/* Owned items grid */}
            <View style={styles.itemsGrid}>
              {filteredOwnedItems.map((item, index) => (
                <View key={item.id} style={styles.gridItem}>
                  {renderOwnedItem({ item, index })}
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Liked/Saved items section */}
            <View style={styles.savedIntro}>
              <Icon 
                name="heart-circle" 
                size={36} 
                color={accentColor} 
                style={styles.savedIcon} 
              />
              <View>
                <Text style={[styles.savedTitle, { color: textColor }]}>
                  Your Wishlist
                </Text>
                <Text style={[styles.savedDescription, { color: subTextColor }]}>
                  {LIKED_ITEMS.length} items you've saved
                </Text>
              </View>
            </View>

            {/* Recently saved items */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Recently Saved
              </Text>
              
              <View style={styles.itemsGrid}>
                {LIKED_ITEMS.map((item, index) => (
                  <View key={item.id} style={styles.gridItem}>
                    {renderLikedItem({ item, index })}
                  </View>
                ))}
              </View>
            </View>

            {/* Similar items suggestion */}
            <View style={[
              styles.suggestionsCard, 
              { 
                backgroundColor: cardBgColor,
                shadowColor: isDarkMode ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0,0,0,0.1)'
              }
            ]}>
              <Text style={[styles.suggestionsTitle, { color: textColor }]}>
                Looking for more?
              </Text>
              <Text style={[styles.suggestionsText, { color: subTextColor }]}>
                Find similar items based on your saved preferences
              </Text>
              <TouchableOpacity 
                style={[styles.suggestionsButton, { backgroundColor: mainColor }]}
              >
                <Text style={styles.suggestionsButtonText}>
                  Discover Similar
                </Text>
                <Icon name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ClosetScreen;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.35, // iOS font tracking
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
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
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  mostWornContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  mostWornInfo: {
    flex: 1,
  },
  mostWornLabel: {
    fontSize: 13,
  },
  mostWornItem: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  mostWornCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  mostWornImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  categoriesContainer: {
    marginVertical: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  outfitCard: {
    width: width * 0.7,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  outfitImage: {
    width: '100%',
    height: '70%',
  },
  outfitDetails: {
    padding: 12,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  outfitItemCount: {
    fontSize: 14,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: '50%',
    padding: 4,
    marginBottom: 12,
  },
  itemCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  likeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    padding: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemAction: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButton: {
    margin: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  savedIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  savedIcon: {
    marginRight: 16,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  savedDescription: {
    fontSize: 14,
  },
  suggestionsCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 30,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionsText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  suggestionsButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 6,
  },
});