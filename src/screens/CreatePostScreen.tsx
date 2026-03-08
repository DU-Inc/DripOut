import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../styles/themeprovider';
import { createPost } from '../services/postService';
import { 
  selectImageFromLibrary, 
  takePhotoWithCamera, 
  selectImageFromLibraryAndCrop, 
  takePhotoWithCameraAndCrop, 
  ImageAsset,
  CroppingOptions
} from '../services/imagePickerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';
import { scrapeProductFromUrl, Product } from '../services/recommendationService';
import firestore from '@react-native-firebase/firestore';

// Cache keys matching those in UserProfileScreen
const POSTS_CACHE_KEY = 'user_posts_cache';
const POSTS_CACHE_TIMESTAMP_KEY = 'user_posts_cache_timestamp';

// Interface for featured piece (clothing item)
interface FeaturedPiece {
  id: string;
  name: string;
  brand: string;
  type: 'shirt' | 'pants' | 'shoes' | 'watch' | 'jewelry' | 'accessory';
  link?: string; // Optional affiliate link
}

const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  
  // Basic post data
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  
  // Featured pieces data
  const [featuredPieces, setFeaturedPieces] = useState<FeaturedPiece[]>([]);
  const [showAddPieceModal, setShowAddPieceModal] = useState(false);
  const [newPieceName, setNewPieceName] = useState('');
  const [newPieceBrand, setNewPieceBrand] = useState('');
  const [newPieceLink, setNewPieceLink] = useState('');
  const [newPieceType, setNewPieceType] = useState<'shirt' | 'pants' | 'shoes' | 'watch' | 'jewelry' | 'accessory'>('shirt');
  
  // UI states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [currentTab, setCurrentTab] = useState<'details' | 'pieces'>('details');
  
  // Colors based on theme - matching reddish app theme
  const mainColor = isDarkMode ? '#FF6B6B' : '#EF3D47'; // Reddish primary color matching app
  const bgColor = isDarkMode ? '#121212' : '#F8F9FA';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDarkMode ? '#333333' : '#E0E0E0';
  const modalBgColor = isDarkMode ? 'rgba(18, 18, 18, 0.95)' : 'rgba(0, 0, 0, 0.6)';
  const inputBgColor = isDarkMode ? '#2C2C2C' : '#F5F5F5';
  const accentColor = isDarkMode ? '#FF4870' : '#FF3B5C'; // Secondary reddish accent
  const successColor = isDarkMode ? '#03DAC5' : '#00C853';
  
  // Show image options modal
  const openImageOptions = () => {
    setShowImageOptions(true);
  };
  
  // Take a photo with camera
  const takePhoto = async () => {
    // DON'T close modal first - this causes iOS gallery to close immediately
    // Instead, add iOS animation delay and close modal AFTER picker returns
    
    setTimeout(async () => {
      try {
        // Use our image picker service with cropping
        const cameraOptions = {
          maxHeight: 2400,
          maxWidth: 2400,
          quality: 1 as const,
          includeBase64: false,
          saveToPhotos: false,
          mediaType: 'photo' as const
        };

        const croppingOptions: CroppingOptions = {
          cropperActiveWidgetColor: mainColor,
          cropperToolbarColor: mainColor,
          cropperToolbarWidgetColor: '#FFFFFF',
          freeStyleCropEnabled: true,
          enableRotationGesture: true,
          compressImageQuality: 0.95,
          compressImageMaxWidth: 2400,
          compressImageMaxHeight: 2400,
        };
        
        const result = await takePhotoWithCameraAndCrop(cameraOptions, croppingOptions);
        
        // Close modal AFTER picker returns (successful or not)
        setShowImageOptions(false);
        
        if (result) {
          setSelectedImage(result);
        }
      } catch (error: unknown) {
        // Close modal even on error
        setShowImageOptions(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert(
          'Camera Error', 
          `Failed to take photo: ${errorMessage}. Please try again.`
        );
      }
    }, 100); // iOS animation delay as per Stack Overflow solution
  };
  
  // Select image from gallery
  const selectImage = async () => {
    // DON'T close modal first - this causes iOS gallery to close immediately
    // Instead, add iOS animation delay and close modal AFTER picker returns
    
    setTimeout(async () => {
      try {
        // Use our image picker service with cropping
        const libraryOptions = {
          maxHeight: 2400,
          maxWidth: 2400,
          quality: 1 as const,
          selectionLimit: 1,
          includeBase64: false,
          mediaType: 'photo' as const
        };

        const croppingOptions: CroppingOptions = {
          cropperActiveWidgetColor: mainColor,
          cropperToolbarColor: mainColor,
          cropperToolbarWidgetColor: '#FFFFFF',
          freeStyleCropEnabled: true,
          enableRotationGesture: true,
          compressImageQuality: 0.95,
          compressImageMaxWidth: 2400,
          compressImageMaxHeight: 2400,
        };
        
        const result = await selectImageFromLibraryAndCrop(libraryOptions, croppingOptions);
        
        // Close modal AFTER picker returns (successful or not)
        setShowImageOptions(false);
        
        if (result) {
          setSelectedImage(result);
        }
      } catch (error: unknown) {
        // Close modal even on error
        setShowImageOptions(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert(
          'Gallery Error', 
          `Failed to select image: ${errorMessage}. Please try again.`
        );
      }
    }, 100); // iOS animation delay as per Stack Overflow solution
  };

  // Re-crop the currently selected image
  const reCropImage = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please select an image first');
      return;
    }

    // Re-open image options so users can re-select and crop with the native flow.
    setShowImageOptions(true);
  };

  
  // Add a new featured piece
  const addFeaturedPiece = () => {
    if (!newPieceName.trim() || !newPieceBrand.trim()) {
      Alert.alert('Missing Information', 'Please provide both name and brand for the piece');
      return;
    }
    
    const newPiece: FeaturedPiece = {
      id: Date.now().toString(),
      name: newPieceName.trim(),
      brand: newPieceBrand.trim(),
      type: newPieceType,
      link: newPieceLink.trim() || undefined // Only include if provided
    };
    
    // Add the new piece to the collection
    setFeaturedPieces([...featuredPieces, newPiece]);
    
    // Reset form fields
    setNewPieceName('');
    setNewPieceBrand('');
    setNewPieceLink('');
    setShowAddPieceModal(false);
    
    // Show success toast or feedback
    const piecesCount = featuredPieces.length + 1;
    
    // If this is the first piece, give more detailed feedback
    if (piecesCount === 1) {
      Alert.alert(
        'Piece Added',
        'Your featured piece has been added! You can continue adding pieces or switch to Details tab to complete your post.',
        [
          {
            text: 'Add More',
            style: 'cancel',
          },
          {
            text: 'Done',
            onPress: () => setCurrentTab('details'),
          },
        ]
      );
    } else {
      // For subsequent pieces, just show a brief confirmation
      setTimeout(() => {
        Alert.alert('Piece Added', `${newPiece.name} added to featured pieces (${piecesCount} total)`);
      }, 300);
    }
  };
  
  // Remove a featured piece
  const removeFeaturedPiece = (pieceId: string) => {
    setFeaturedPieces(featuredPieces.filter(piece => piece.id !== pieceId));
  };
  
  // Get icon for piece type
  const getPieceIcon = (type: string) => {
    switch(type) {
      case 'shirt':
        return 'hanger'; // Using hanger icon for tops/shirts
      case 'pants':
        return 'animation'; // Animation icon resembles pants/trousers better
      case 'shoes':
        return 'shoe-formal';
      case 'accessory':
        return 'sunglasses';
      default:
        return 'hanger';
    }
  };
  
  // Function to clear the posts cache with user-specific key
  const clearPostsCache = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.warn('No user ID available to clear cache');
        return;
      }
      
      // Use user-specific cache keys
      const userId = currentUser.uid;
      const postsCacheKey = `user_posts_cache_${userId}`;
      const postsTimestampKey = `user_posts_cache_timestamp_${userId}`;
      
      await AsyncStorage.removeItem(postsCacheKey);
      await AsyncStorage.removeItem(postsTimestampKey);
      console.log(`Posts cache cleared for user ${userId} after creating new post`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Error clearing posts cache:', errorMessage);
      // Non-critical error - continue even if cache clear fails
    }
  };

  // Background function to scrape product data and update the post
  const handleBackgroundScraping = async (postId: string, outfitItems: any[]) => {
    try {
      console.log('🔍 Starting background scraping for post:', postId);
      
      // Extract URLs from outfit items that have affiliate links
      const urlsToScrape = outfitItems
        .filter(item => item.affiliateLink && item.affiliateLink.trim() !== '')
        .map(item => item.affiliateLink.trim());
      
      if (urlsToScrape.length === 0) {
        console.log('📭 No URLs to scrape for post:', postId);
        return;
      }
      
      console.log(`🔗 Found ${urlsToScrape.length} URLs to scrape:`, urlsToScrape);
      
      // Call the scraping API
      const scrapedProducts = await scrapeProductFromUrl(
        urlsToScrape,
        (progress) => {
          // Silent progress tracking - no UI updates
          console.log(`🚀 Scraping progress for post ${postId}: ${Math.round(progress * 100)}%`);
        }
      ) as Product[];
      
      console.log(`✅ Successfully scraped ${scrapedProducts.length} products for post ${postId}`);
      
      // Create a map of URL to scraped product for easy lookup
      const urlToProductMap: Record<string, Product> = {};
      scrapedProducts.forEach((product, index) => {
        if (urlsToScrape[index]) {
          urlToProductMap[urlsToScrape[index]] = product;
        }
      });
      
      // Update outfit items with scraped product data
      const enhancedOutfitItems = outfitItems.map(item => {
        if (item.affiliateLink && urlToProductMap[item.affiliateLink]) {
          return {
            ...item,
            scrapedProduct: urlToProductMap[item.affiliateLink]
          };
        }
        return item;
      });
      
      // Update the post in Firebase with enhanced outfit items
      await firestore()
        .collection('posts')
        .doc(postId)
        .update({
          outfitItems: enhancedOutfitItems,
          lastScrapedAt: firestore.FieldValue.serverTimestamp()
        });
      
      console.log(`🎯 Successfully updated post ${postId} with scraped product data`);
      
      // Clear cache to ensure fresh data is loaded
      await clearPostsCache();
      console.log('🧹 Cache cleared after product scraping update');
      
    } catch (error) {
      // Silent error handling - just log, don't show to user
      // (Background operation, so we don't interrupt user experience)
      console.error('❌ Error during background scraping for post:', postId);
      console.error('Error details:', error);
      
      // Log rate limit errors for debugging
      const isRateLimit = (error as any)?.isRateLimit === true;
      if (isRateLimit) {
        const resetTime = (error as any)?.resetTime || 'midnight UTC';
        console.warn(`⚠️ Rate limit reached for scraping. Resets at ${resetTime}`);
      }
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Leave original data as-is, no user notification
    }
  };

  // Create post using the service
  const handleCreatePost = async () => {
    if (!selectedImage) {
      Alert.alert('Missing Image', 'Please select an image for your post');
      return;
    }
    
    if (!caption.trim()) {
      Alert.alert('Missing Caption', 'Please add a caption to your post');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Format tags
      const formattedTags = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => (tag.startsWith('#') ? tag : `#${tag}`));
      
      // Format featured pieces for storage - preserve all data including type and link
      const outfitItems = featuredPieces.map(piece => {
        return {
          name: piece.name,
          brand: piece.brand,
          type: piece.type, // Use the simplified type system
          affiliateLink: piece.link || undefined // Include affiliate link if provided
        };
      });
      
      console.log('Creating post with featured pieces:', JSON.stringify(outfitItems));
      
      // Create the post with both details and featured pieces
      const newPost = await createPost(
        {
          imageUri: selectedImage.uri,
          caption,
          tags: formattedTags,
          outfitItems // Include outfit items in the post data
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      // Clear the posts cache to ensure fresh data on profile page
      await clearPostsCache();
      
      setIsUploading(false);
      
      // Start background scraping if there are outfit items with links
      // This runs asynchronously and doesn't block the user experience
      if (outfitItems.length > 0) {
        const hasLinks = outfitItems.some(item => item.affiliateLink && item.affiliateLink.trim() !== '');
        if (hasLinks) {
          console.log('🚀 Starting background product scraping for new post');
          // Run in background - don't await this
          handleBackgroundScraping(newPost.id, outfitItems);
        }
      }
      
      Alert.alert(
        'Post Created',
        'Your post has been successfully created!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      setIsUploading(false);
      
      // More detailed error message
      let errorMessage = 'Failed to create post. Please try again.';
      if (error instanceof Error && error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert('Post Creation Failed', errorMessage);
    }
  };
  
  // Format tags for preview
  const formatTags = (text: string) => {
    return text
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
      .join(' ');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Create Post</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.postButton, 
                (!selectedImage || isUploading) && styles.disabledButton, 
                { backgroundColor: mainColor }
              ]}
              onPress={handleCreatePost}
              disabled={!selectedImage || isUploading}
            >
              <Text style={styles.postButtonText}>
                {isUploading ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Tab Selection */}
        <View style={[styles.tabContainer, { borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              currentTab === 'details' && [styles.activeTab, { borderBottomColor: mainColor }]
            ]}
            onPress={() => setCurrentTab('details')}
          >
            <Text style={[
              styles.tabText, 
              { color: currentTab === 'details' ? mainColor : subTextColor }
            ]}>
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              currentTab === 'pieces' && [styles.activeTab, { borderBottomColor: mainColor }]
            ]}
            onPress={() => setCurrentTab('pieces')}
          >
            <Text style={[
              styles.tabText, 
              { color: currentTab === 'pieces' ? mainColor : subTextColor }
            ]}>
              Featured Pieces
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Selection - Always Visible */}
          <View style={[styles.imageContainer, { borderColor }]}>
            {selectedImage ? (
              <>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage} 
                  resizeMode="contain"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity 
                    style={[styles.changeImageButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                    onPress={reCropImage}
                  >
                    <Icon name="crop" size={18} color="#FFFFFF" />
                    <Text style={styles.changeImageText}>Re-crop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.changeImageButton, { backgroundColor: 'rgba(0,0,0,0.5)', marginLeft: 8 }]}
                    onPress={openImageOptions}
                  >
                    <Icon name="refresh" size={18} color="#FFFFFF" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Icon 
                  name="image-outline" 
                  size={64} 
                  color={subTextColor} 
                  style={styles.placeholderIcon}
                />
                <Text style={[styles.placeholderText, { color: subTextColor }]}>
                  Choose an image for your post
                </Text>
                <TouchableOpacity 
                  style={[styles.selectImageButton, { backgroundColor: mainColor }]}
                  onPress={openImageOptions}
                >
                  <Icon name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.selectImageButtonText}>Select Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Details Tab Content */}
          {currentTab === 'details' && (
            <>
              {/* Caption Input with modern design */}
              <View style={[styles.formSection, { backgroundColor: cardBgColor, borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Caption</Text>
                <TextInput
                  style={[styles.captionInput, { color: textColor, backgroundColor: inputBgColor }]}
                  placeholder="Write a caption..."
                  placeholderTextColor={subTextColor}
                  multiline
                  maxLength={2200}
                  value={caption}
                  onChangeText={setCaption}
                />
              </View>
              
              {/* Tags Input with modern design */}
              <View style={[styles.formSection, { backgroundColor: cardBgColor, borderColor }]}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Tags</Text>
                <Text style={[styles.sectionHelper, { color: subTextColor }]}>
                  Separate tags with commas (e.g., minimal, sustainable)
                </Text>
                <TextInput
                  style={[styles.tagsInput, { color: textColor, backgroundColor: inputBgColor }]}
                  placeholder="Add tags (comma separated)"
                  placeholderTextColor={subTextColor}
                  value={tags}
                  onChangeText={setTags}
                />
                
                {/* Preview Tags */}
                {tags.length > 0 && (
                  <View style={styles.tagsPreviewContainer}>
                    <Text style={[styles.tagsPreviewLabel, { color: subTextColor }]}>
                      Preview:
                    </Text>
                    <View style={styles.tagsPreview}>
                      {tags.split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0)
                        .map((tag, index) => (
                          <View key={index} style={[
                            styles.tagPill, 
                            { 
                              backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.15)' : 'rgba(239, 61, 71, 0.08)',
                              borderColor: isDarkMode ? 'rgba(255, 107, 107, 0.25)' : 'rgba(239, 61, 71, 0.15)'
                            }
                          ]}>
                            <Text style={[styles.tagText, { color: mainColor }]}>
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </Text>
                          </View>
                        ))
                      }
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
          
          {/* Featured Pieces Tab Content */}
          {currentTab === 'pieces' && (
            <View style={[styles.formSection, { backgroundColor: cardBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>Featured Pieces</Text>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: mainColor }]}
                  onPress={() => setShowAddPieceModal(true)}
                >
                  <Icon name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.sectionHelper, { color: subTextColor }]}>
                Add clothing items featured in your post
              </Text>
              
              {featuredPieces.length === 0 ? (
                <View style={styles.emptyPieces}>
                  <MaterialCommunityIcon name="hanger" size={48} color={subTextColor} />
                  <Text style={[styles.emptyPiecesText, { color: subTextColor }]}>
                    No pieces added yet. Tap + to add items featured in your outfit.
                  </Text>
                </View>
              ) : (
                <View style={styles.piecesGrid}>
                  {featuredPieces.map((piece) => (
                    <View 
                      key={piece.id} 
                      style={[styles.pieceItem, { borderColor }]}
                    >
                      <View style={styles.iconContainer}>
                        {piece.type === 'shirt' ? (
                          <Icon name="shirt-outline" size={20} color={mainColor} />
                        ) : piece.type === 'pants' ? (
                          <Icon name="pricetag-outline" size={20} color={mainColor} />
                        ) : piece.type === 'shoes' ? (
                          <Icon name="footsteps-outline" size={20} color={mainColor} />
                        ) : (
                          <Icon name="glasses-outline" size={20} color={mainColor} />
                        )}
                      </View>
                      <View style={styles.pieceDetails}>
                        <Text style={[styles.pieceName, { color: textColor }]} numberOfLines={1}>
                          {piece.name}
                        </Text>
                        <Text style={[styles.pieceBrand, { color: accentColor }]} numberOfLines={1}>
                          {piece.brand}
                        </Text>
                        {piece.link && (
                          <Text style={[styles.pieceLink, { color: successColor }]} numberOfLines={1}>
                            Has affiliate link
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeFeaturedPiece(piece.id)}
                      >
                        <Icon name="close-circle" size={20} color={isDarkMode ? '#FF7597' : '#E53935'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Image Options Modal with modern design */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                Add Photo
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowImageOptions(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalOption, { borderColor }]}
              onPress={takePhoto}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.15)' : 'rgba(239, 61, 71, 0.08)' }]}>
                <Icon name="camera" size={24} color={mainColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.modalOptionText, { color: textColor }]}>
                  Take Photo
                </Text>
                <Text style={[styles.modalOptionSubtext, { color: subTextColor }]}>
                  Use your camera to take a new photo
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalOption, { borderColor }]}
              onPress={selectImage}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.15)' : 'rgba(239, 61, 71, 0.08)' }]}>
                <Icon name="images-outline" size={24} color={mainColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.modalOptionText, { color: textColor }]}>
                  Choose from Library
                </Text>
                <Text style={[styles.modalOptionSubtext, { color: subTextColor }]}>
                  Select from your existing photos
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={subTextColor} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Add Piece Modal with modern design */}
      <Modal
        visible={showAddPieceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddPieceModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.pieceModalContainer}
          >
            <View style={[styles.pieceModalContent, { backgroundColor: cardBgColor }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Add Featured Piece
                </Text>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowAddPieceModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.pieceForm}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Item Name
                  </Text>
                  <TextInput
                    style={[styles.pieceInput, { color: textColor, backgroundColor: inputBgColor }]}
                    placeholder="E.g., Oversized Cotton Blazer"
                    placeholderTextColor={subTextColor}
                    value={newPieceName}
                    onChangeText={setNewPieceName}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Brand
                  </Text>
                  <TextInput
                    style={[styles.pieceInput, { color: textColor, backgroundColor: inputBgColor }]}
                    placeholder="E.g., Zara, H&M, Nike"
                    placeholderTextColor={subTextColor}
                    value={newPieceBrand}
                    onChangeText={setNewPieceBrand}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <View style={styles.labelContainer}>
                    <Text style={[styles.inputLabel, { color: textColor }]}>
                      Product Link 
                    </Text>
                    <Text style={[styles.optionalText, { color: subTextColor }]}>
                      (Optional)
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.pieceInput, { color: textColor, backgroundColor: inputBgColor }]}
                    placeholder="E.g., https://shop.com/item/123?ref=yourid"
                    placeholderTextColor={subTextColor}
                    value={newPieceLink}
                    onChangeText={setNewPieceLink}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <Text style={[styles.infoText, { color: subTextColor }]}>
                    Add your affiliate link to earn commission when users purchase this item
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textColor }]}>
                    Type
                  </Text>
                  
                  {/* Horizontal scrollable type selector */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.typeScrollView}
                    contentContainerStyle={styles.typeScrollContent}
                  >
                    {[
                      { id: 'shirt', label: 'Top', icon: 'shirt-outline' },
                      { id: 'pants', label: 'Bottom', icon: 'pricetag-outline' },
                      { id: 'shoes', label: 'Shoes', icon: 'footsteps-outline' },
                      { id: 'watch', label: 'Watch', icon: 'time-outline' },
                      { id: 'jewelry', label: 'Jewelry', icon: 'diamond-outline' },
                      { id: 'accessory', label: 'Other', icon: 'glasses-outline' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.pieceTypeButton,
                          newPieceType === type.id && [
                            styles.selectedPieceType,
                            { borderColor: mainColor, backgroundColor: isDarkMode ? 'rgba(255, 107, 107, 0.15)' : 'rgba(239, 61, 71, 0.08)' }
                          ]
                        ]}
                        onPress={() => setNewPieceType(type.id as any)}
                      >
                        <View style={styles.typeIconContainer}>
                          <Icon 
                            name={type.icon} 
                            size={24} 
                            color={newPieceType === type.id ? mainColor : subTextColor}
                          />
                        </View>
                        <Text 
                          style={[
                            styles.pieceTypeLabel, 
                            { color: newPieceType === type.id ? mainColor : subTextColor }
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.addPieceButton, 
                    { backgroundColor: mainColor },
                    (!newPieceName.trim() || !newPieceBrand.trim()) && { opacity: 0.6 }
                  ]}
                  onPress={addFeaturedPiece}
                  disabled={!newPieceName.trim() || !newPieceBrand.trim()}
                >
                  <Text style={styles.addPieceButtonText}>
                    Add Piece
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      
      {/* Upload Progress Indicator with modern design */}
      {isUploading && (
        <View style={styles.progressOverlay}>
          <View style={[styles.progressContainer, { backgroundColor: cardBgColor }]}>
            <Text style={[styles.progressText, { color: textColor }]}>
              Uploading Post...
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarBg,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                ]} 
              />
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    backgroundColor: mainColor, 
                    width: `${uploadProgress * 100}%`,
                    shadowColor: mainColor
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressPercentage, { color: subTextColor }]}>
              {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  testButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Icon containers for consistent alignment
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 61, 71, 0.08)', // Matching reddish theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Tab navigation
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
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
  
  // Content
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    height: 300,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderIcon: {
    marginBottom: 12,
    opacity: 0.8,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: '80%',
  },
  selectImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectImageButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changeImageText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Form sections
  formSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  sectionHelper: {
    fontSize: 14,
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Caption and tags inputs
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    padding: 12,
    borderRadius: 12,
  },
  tagsInput: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tagsPreviewContainer: {
    marginTop: 16,
  },
  tagsPreviewLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Featured pieces
  emptyPieces: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyPiecesText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    maxWidth: '80%',
  },
  piecesGrid: {
    marginTop: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  pieceDetails: {
    flex: 1,
    marginLeft: 12,
  },
  pieceName: {
    fontSize: 15,
    fontWeight: '500',
  },
  pieceBrand: {
    fontSize: 13,
    marginTop: 2,
  },
  pieceLink: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 4,
  },
  
  // Image options modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  
  // Add piece modal
  pieceModalContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  pieceModalContent: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  pieceForm: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pieceInput: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  typeScrollView: {
    maxHeight: 100,
  },
  typeScrollContent: {
    paddingBottom: 8,
    paddingRight: 8,
  },
  pieceTypeButton: {
    width: 100,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 12,
  },
  selectedPieceType: {
    borderWidth: 2,
  },
  pieceTypeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  addPieceButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addPieceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Progress overlay
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  progressContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  progressBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  progressPercentage: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default CreatePostScreen;
