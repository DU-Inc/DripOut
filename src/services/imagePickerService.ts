// src/services/imagePickerService.ts
import ImagePicker, { Options, Image } from 'react-native-image-crop-picker';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Interface representing an image asset that can be uploaded
 */
export interface ImageAsset {
  uri: string;
  type?: string;
  name?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

/**
 * Options for image selection
 */
const DEFAULT_OPTIONS: Options = {
  width: 1200,
  height: 1200,
  cropping: true,
  cropperCircleOverlay: false,
  compressImageMaxWidth: 1200,
  compressImageMaxHeight: 1200,
  compressImageQuality: 0.8,
  mediaType: 'photo',
  includeBase64: false,
};

/**
 * Request camera permission on Android
 * @returns Promise<boolean> indicating if permission was granted
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'DripOut needs access to your camera to take photos.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Error requesting camera permission:', err);
    return false;
  }
};

/**
 * Converts an image from react-native-image-crop-picker to our ImageAsset format
 */
export const formatImageResponse = (response: Image): ImageAsset => {
  const pathParts = response.path.split('/');
  const fileName = pathParts[pathParts.length - 1];
  
  return {
    uri: Platform.OS === 'android' ? response.path : response.path.replace('file://', ''),
    type: response.mime || 'image/jpeg',
    name: fileName || `image-${Date.now()}.jpg`,
    width: response.width,
    height: response.height,
    fileSize: response.size,
  };
};

/**
 * Launch the camera to take a photo
 * @param options - Optional image picker options
 * @returns Promise with the selected image or null if canceled
 */
export const takePhotoWithCamera = async (options?: Options): Promise<ImageAsset | null> => {
  try {
    // Request camera permission on Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.'
        );
        return null;
      }
    }
    
    // Launch camera with options
    const result = await ImagePicker.openCamera({
      ...DEFAULT_OPTIONS,
      ...options,
    });
    
    console.log('Image taken successfully:', result.path);
    return formatImageResponse(result);
  } catch (error: any) {
    // Handle user cancellation
    if (error.code === 'E_PICKER_CANCELLED') {
      console.log('User cancelled image picker');
      return null;
    }
    
    // Handle permission errors
    if (error.code === 'E_NO_CAMERA_PERMISSION') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos.'
      );
      return null;
    }
    
    console.error('Error taking picture:', error);
    Alert.alert('Error', 'Failed to take picture. Please try again.');
    return null;
  }
};

/**
 * Launch the image gallery to select a photo
 * @param options - Optional image picker options
 * @returns Promise with the selected image or null if canceled
 */
export const selectImageFromLibrary = async (options?: Options): Promise<ImageAsset | null> => {
  try {
    // Launch gallery with options
    const result = await ImagePicker.openPicker({
      ...DEFAULT_OPTIONS,
      ...options,
    });
    
    console.log('Image selected successfully:', result.path);
    return formatImageResponse(result);
  } catch (error: any) {
    // Handle user cancellation
    if (error.code === 'E_PICKER_CANCELLED') {
      console.log('User cancelled image picker');
      return null;
    }
    
    // Handle permission errors
    if (error.code === 'E_NO_LIBRARY_PERMISSION') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is required to select images.'
      );
      return null;
    }
    
    console.error('Error selecting from gallery:', error);
    Alert.alert('Error', 'Failed to select image. Please try again.');
    return null;
  }
};

/**
 * Clean up any temporary files created by the image picker
 */
export const cleanupImages = (): Promise<void> => {
  return ImagePicker.clean();
};