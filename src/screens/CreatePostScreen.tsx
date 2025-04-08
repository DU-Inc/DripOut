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
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../styles/themeprovider';
import { createPost } from '../services/postService';
import { selectImageFromLibrary, takePhotoWithCamera, ImageAsset } from '../services/imagePickerService';

const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#FF6B6B' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const modalBgColor = isDarkMode ? 'rgba(10, 10, 15, 0.9)' : 'rgba(0, 0, 0, 0.5)';
  
  // Show image options modal
  const openImageOptions = () => {
    setShowImageOptions(true);
  };
  
  // Take a photo with camera
  const takePhoto = async () => {
    setShowImageOptions(false);
    
    const result = await takePhotoWithCamera();
    if (result) {
      setSelectedImage(result);
      console.log('Photo taken successfully:', result.uri);
    }
  };
  
  // Select image from gallery
  const selectImage = async () => {
    setShowImageOptions(false);
    
    const result = await selectImageFromLibrary();
    if (result) {
      setSelectedImage(result);
      console.log('Image selected successfully:', result.uri);
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
      
      // Create the post with progress tracking
      await createPost(
        {
          imageUri: selectedImage.uri,
          caption,
          tags: formattedTags,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      setIsUploading(false);
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
      console.error('Error creating post:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };
  
  // Format tags for preview
  const formatTags = (text: string) => {
    // Remove spaces and split by commas
    return text
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
      .join(' ');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Create Post</Text>
        <TouchableOpacity 
          style={[styles.postButton, 
            (!selectedImage || isUploading) && styles.disabledButton, 
            { backgroundColor: mainColor }
          ]}
          onPress={handleCreatePost}
          disabled={!selectedImage || isUploading}
        >
          <Text style={[styles.postButtonText, { color: '#FFFFFF' }]}>
            {isUploading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Preview */}
        <View style={[styles.imageContainer, { borderColor }]}>
          {selectedImage ? (
            <>
              <Image 
                source={{ uri: selectedImage.uri }} 
                style={styles.previewImage} 
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={openImageOptions}
              >
                <Icon name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.placeholderContainer}>
              <Icon name="image-outline" size={60} color={subTextColor} />
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
        
        {/* Caption Input */}
        <View style={[styles.inputContainer, { backgroundColor: cardBgColor, borderColor }]}>
          <TextInput
            style={[styles.captionInput, { color: textColor }]}
            placeholder="Write a caption..."
            placeholderTextColor={subTextColor}
            multiline
            maxLength={2200}
            value={caption}
            onChangeText={setCaption}
          />
        </View>
        
        {/* Tags Input */}
        <View style={[styles.inputContainer, { backgroundColor: cardBgColor, borderColor }]}>
          <TextInput
            style={[styles.tagsInput, { color: textColor }]}
            placeholder="Add tags (comma separated)"
            placeholderTextColor={subTextColor}
            value={tags}
            onChangeText={setTags}
          />
        </View>
        
        {/* Preview Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsPreviewContainer}>
            <Text style={[styles.tagsPreviewLabel, { color: subTextColor }]}>
              Tags Preview:
            </Text>
            <Text style={[styles.tagsPreview, { color: mainColor }]}>
              {formatTags(tags)}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Image Options Modal */}
      <Modal
        visible={showImageOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: modalBgColor }]}>
          <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Select Image From</Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <Icon name="camera" size={24} color={mainColor} />
              <Text style={[styles.modalOptionText, { color: textColor }]}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={selectImage}
            >
              <MaterialIcon name="photo-library" size={24} color={mainColor} />
              <Text style={[styles.modalOptionText, { color: textColor }]}>Photo Library</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalCancelButton, { borderTopColor: borderColor }]}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={[styles.modalCancelText, { color: mainColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Upload Progress Indicator */}
      {isUploading && (
        <View style={styles.progressOverlay}>
          <View style={[styles.progressContainer, { backgroundColor: cardBgColor }]}>
            <Text style={[styles.progressText, { color: textColor }]}>
              Uploading Post...
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { backgroundColor: mainColor, width: `${uploadProgress * 100}%` }
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
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  postButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    height: 300,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagsInput: {
    fontSize: 16,
    paddingVertical: 8,
  },
  tagsPreviewContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  tagsPreviewLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  tagsPreview: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  modalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
  },
  modalCancelText: {
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
    borderRadius: 12,
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
    backgroundColor: 'rgba(150,150,150,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  progressPercentage: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default CreatePostScreen;