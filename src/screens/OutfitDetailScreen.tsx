import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Dimensions,
  Share,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { auth, db } from '../Config/firebaseconfig';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/NavigationTypes';
import LinearGradient from 'react-native-linear-gradient';

type NavigationType = NavigationProp<RootStackParamList>;
type OutfitDetailScreenRouteProp = RouteProp<RootStackParamList, 'OutfitDetailScreen'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OutfitProduct {
  id: string;
  name: string;
  brand: string;
  price?: number;
  currency?: string;
  images?: Array<{ url: string }>;
  type?: string;
  affiliateLink?: string;
}

const OutfitDetailScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationType>();
  const route = useRoute<OutfitDetailScreenRouteProp>();
  const { outfit } = route.params;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Colors based on theme with enhanced palette
  const bgColor = isDarkMode ? '#0B0B0F' : '#FAFAFA';
  const textColor = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#6B7280';
  const cardBgColor = isDarkMode ? '#1A1A24' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A3A' : '#E5E7EB';
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  const successColor = isDarkMode ? '#10B981' : '#059669';
  const warningColor = isDarkMode ? '#F59E0B' : '#D97706';
  const surfaceColor = isDarkMode ? '#15151F' : '#F9FAFB';

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

  // Get clothing icon based on product type/name
  const getClothingIcon = useCallback((product: OutfitProduct): string => {
    const name = product.name?.toLowerCase() || '';
    const type = product.type?.toLowerCase() || '';
    
    if (type === 'shirt' || name.includes('shirt') || name.includes('top') || name.includes('blouse')) {
      return 'tshirt-crew';
    } else if (type === 'pants' || name.includes('pants') || name.includes('jeans') || name.includes('trouser')) {
      return 'pants';
    } else if (type === 'shoes' || name.includes('shoe') || name.includes('sneaker') || name.includes('boot')) {
      return 'shoe-sneaker';
    } else if (type === 'watch' || name.includes('watch')) {
      return 'watch';
    } else if (type === 'jewelry' || name.includes('ring') || name.includes('necklace') || name.includes('earring')) {
      return 'ring';
    } else if (type === 'accessory' || name.includes('bag') || name.includes('hat') || name.includes('sunglasses')) {
      return 'sunglasses';
    } else if (name.includes('jacket') || name.includes('coat') || name.includes('blazer')) {
      return 'coat-long';
    } else if (name.includes('dress') || name.includes('skirt')) {
      return 'tshirt-crew-outline';
    }
    return 'tshirt-crew';
  }, []);

  // Handle outfit deletion
  const handleDeleteOutfit = useCallback(async () => {
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to delete this outfit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const currentUser = auth().currentUser;
              
              if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to delete outfits');
                return;
              }

              // Delete the outfit from Firestore
              await db.collection('saved_outfits').doc(outfit.id).delete();
              
              Alert.alert('Success', 'Outfit deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting outfit:', error);
              Alert.alert('Error', 'Failed to delete outfit. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  }, [outfit.id, navigation]);

  // Handle outfit sharing
  const handleShareOutfit = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out my "${outfit.name}" outfit with ${outfit.products?.length || 0} items!`,
        url: outfit.imageUrl
      });
    } catch (error) {
      console.error('Error sharing outfit:', error);
    }
  }, [outfit]);

  // Navigate to 3D fitting room with this outfit
  const handleTryOn = useCallback(() => {
    // Navigate to MainTabs and then to the 3D tab with the outfit data
    navigation.navigate('MainTabs', {
      screen: '3DTab',
      params: {
        preloadedOutfit: {
          id: outfit.id,
          name: outfit.name,
          products: outfit.products || []
        }
      }
    });
  }, [navigation, outfit]);

  // Open product link
  const handleProductPress = useCallback((product: OutfitProduct) => {
    if (product.affiliateLink) {
      Linking.openURL(product.affiliateLink);
    } else {
      Alert.alert('Product Info', `${product.name} by ${product.brand}`);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Custom Header */}
      <SafeAreaView>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 20, 0) }]}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: cardBgColor }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textColor }]}>Outfit Details</Text>
            <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
              {outfit.products?.length || 0} pieces
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: cardBgColor }]}
            onPress={handleShareOutfit}
          >
            <FeatherIcon name="share" size={20} color={textColor} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image Section */}
        <View style={[styles.heroSection, { backgroundColor: cardBgColor }]}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: outfit.imageUrl }}
              style={styles.outfitImage}
              resizeMode="contain"
            />
            
            {/* Gradient Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </View>
        </View>

        {/* Outfit Info Card */}
        <View style={[styles.infoCard, { backgroundColor: cardBgColor }]}>
          <View style={styles.outfitHeader}>
            <View style={styles.outfitTitleContainer}>
              <Text style={[styles.outfitName, { color: textColor }]}>
                {outfit.name}
              </Text>
              <View style={[styles.outfitMeta, { backgroundColor: surfaceColor }]}>
                <Icon name="calendar-outline" size={14} color={subTextColor} />
                <Text style={[styles.outfitDate, { color: subTextColor }]}>
                  Created {formatCreationDate(outfit.createdAt)}
                </Text>
              </View>
            </View>
            
            <View style={[styles.itemsCounter, { backgroundColor: `${mainColor}15` }]}>
              <Text style={[styles.itemsCountText, { color: mainColor }]}>
                {outfit.products?.length || 0}
              </Text>
              <Text style={[styles.itemsLabel, { color: mainColor }]}>
                pieces
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: mainColor }]}
              onPress={handleTryOn}
            >
              <MaterialIcon name="camera-retake" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Try On</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryAction, { backgroundColor: surfaceColor, borderColor: borderColor }]}
              onPress={handleDeleteOutfit}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={mainColor} />
              ) : (
                <FeatherIcon name="trash-2" size={16} color="#FF4757" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Outfit Pieces */}
        <View style={[styles.piecesSection, { backgroundColor: cardBgColor }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Outfit Pieces
              </Text>
              <Text style={[styles.sectionSubtitle, { color: subTextColor }]}>
                Tap to view product details
              </Text>
            </View>
            <View style={[styles.piecesCount, { backgroundColor: surfaceColor }]}>
              <Text style={[styles.piecesCountText, { color: textColor }]}>
                {outfit.products?.length || 0}
              </Text>
            </View>
          </View>

          {outfit.products && outfit.products.length > 0 ? (
            <View style={styles.piecesList}>
              {outfit.products.map((product: OutfitProduct, index: number) => (
                <TouchableOpacity
                  key={product.id || index}
                  style={[styles.pieceItem, { backgroundColor: surfaceColor }]}
                  onPress={() => handleProductPress(product)}
                  activeOpacity={product.affiliateLink ? 0.7 : 1}
                >
                  <View style={[styles.pieceIconContainer, { backgroundColor: `${mainColor}15` }]}>
                    <MaterialIcon 
                      name={getClothingIcon(product)}
                      size={22} 
                      color={mainColor} 
                    />
                  </View>
                  
                  <View style={styles.pieceContent}>
                    <Text style={[styles.pieceName, { color: textColor }]} numberOfLines={1}>
                      {product.name || 'Unknown Item'}
                    </Text>
                    <View style={styles.pieceMetaRow}>
                      <Text style={[styles.pieceBrand, { color: subTextColor }]}>
                        {product.brand || 'Unknown Brand'}
                      </Text>
                      {product.price && (
                        <Text style={[styles.piecePrice, { color: mainColor }]}>
                          {product.currency || '$'}{product.price}
                        </Text>
                      )}
                    </View>
                  </View>

                  {product.affiliateLink && (
                    <View style={styles.externalLinkIndicator}>
                      <FeatherIcon 
                        name="external-link" 
                        size={16} 
                        color={subTextColor} 
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPieces}>
              <MaterialIcon name="tshirt-crew-outline" size={48} color={subTextColor} style={{opacity: 0.5}} />
              <Text style={[styles.emptyPiecesText, { color: subTextColor }]}>
                No pieces information available
              </Text>
              <Text style={[styles.emptyPiecesSubtext, { color: subTextColor }]}>
                This outfit was created before piece tracking
              </Text>
            </View>
          )}
        </View>

        {/* Style Insights */}
        <View style={[styles.insightsSection, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Style Insights
          </Text>
          
          <View style={styles.insightsList}>
            <View style={[styles.insightItem, { backgroundColor: surfaceColor }]}>
              <View style={[styles.insightIcon, { backgroundColor: `${successColor}15` }]}>
                <Icon name="time-outline" size={18} color={successColor} />
              </View>
              <Text style={[styles.insightText, { color: textColor }]}>
                Perfect for casual day outings
              </Text>
            </View>
            
            <View style={[styles.insightItem, { backgroundColor: surfaceColor }]}>
              <View style={[styles.insightIcon, { backgroundColor: `${warningColor}15` }]}>
                <Icon name="sunny-outline" size={18} color={warningColor} />
              </View>
              <Text style={[styles.insightText, { color: textColor }]}>
                Great for spring/summer weather
              </Text>
            </View>
            
            <View style={[styles.insightItem, { backgroundColor: surfaceColor }]}>
              <View style={[styles.insightIcon, { backgroundColor: `${mainColor}15` }]}>
                <Icon name="people-outline" size={18} color={mainColor} />
              </View>
              <Text style={[styles.insightText, { color: textColor }]}>
                Ideal for social gatherings
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Hero Section
  heroSection: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  outfitImage: {
    width: '100%',
    height: screenWidth - 40,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  
  // Info Card
  infoCard: {
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
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  outfitTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  outfitName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 30,
  },
  outfitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  outfitDate: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  itemsCounter: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
  },
  itemsCountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemsLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryAction: {
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
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  
  // Pieces Section
  piecesSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  piecesCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piecesCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Pieces List
  piecesList: {
    gap: 12,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  pieceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pieceContent: {
    flex: 1,
  },
  pieceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pieceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pieceBrand: {
    fontSize: 13,
    fontWeight: '500',
  },
  piecePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  externalLinkIndicator: {
    marginLeft: 8,
  },
  
  // Empty State
  emptyPieces: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPiecesText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyPiecesSubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  
  // Insights Section
  insightsSection: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  insightsList: {
    marginTop: 16,
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OutfitDetailScreen;