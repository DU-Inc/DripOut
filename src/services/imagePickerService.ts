// src/services/imagePickerService.ts
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { CameraOptions, ImageLibraryOptions, Asset } from 'react-native-image-picker';
// Import with fallback handling
let ImageCropPicker: any = null;
try {
  ImageCropPicker = require('react-native-image-crop-picker').default;
} catch (error) {
  console.warn('📸 react-native-image-crop-picker not available:', error);
}

// Debug log
console.log('📸 react-native-image-picker imported directly');

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
 * Cropping options for the image cropper
 */
export interface CroppingOptions {
  cropperActiveWidgetColor?: string;
  cropperStatusBarColor?: string;
  cropperToolbarColor?: string;
  cropperToolbarWidgetColor?: string;
  freeStyleCropEnabled?: boolean;
  hideBottomControls?: boolean;
  enableRotationGesture?: boolean;
  disableCropperColorSetters?: boolean;
  cropperChooseText?: string;
  cropperCancelText?: string;
  includeExif?: boolean;
  avoidEmptySpaceAroundImage?: boolean;
  includeBase64?: boolean;
  compressImageQuality?: number;
  compressImageMaxWidth?: number;
  compressImageMaxHeight?: number;
  cropping?: boolean;
}

/**
 * Common options for image selection
 */
const DEFAULT_CAMERA_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  includeBase64: false,
  maxHeight: 2400,
  maxWidth: 2400,
  quality: 0.95,
  saveToPhotos: false,
};

const DEFAULT_LIBRARY_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  includeBase64: false,
  maxHeight: 2400,
  maxWidth: 2400,
  quality: 0.95,
  selectionLimit: 1,
};

/**
 * Request camera permission on Android
 * @returns Promise<boolean> indicating if permission was granted
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    console.log('📸 Requesting camera permission');
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
    
    const result = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('📸 Camera permission granted:', result);
    return result;
  } catch (err) {
    console.error('📸 Error requesting camera permission:', err);
    return false;
  }
};

/**
 * Request photo library permission on Android
 * @returns Promise<boolean> indicating if permission was granted
 */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  try {
    console.log('🖼️ Requesting photo library permission');
    let granted;
    
    if (parseInt(Platform.Version as string, 10) >= 33) {
      // For Android 13 and higher, request READ_MEDIA_IMAGES
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Photo Library Permission',
          message: 'DripOut needs access to your photos to select images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
    } else {
      // For older Android versions, request READ_EXTERNAL_STORAGE
      granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Photo Library Permission',
          message: 'DripOut needs access to your photos to select images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
    }
    
    const result = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log('🖼️ Photo library permission granted:', result);
    return result;
  } catch (err) {
    console.error('🖼️ Error requesting photo library permission:', err);
    return false;
  }
};

/**
 * Converts a react-native-image-picker Asset to our ImageAsset format
 */
export const formatImageResponse = (response: Asset | any): ImageAsset => {
  if (!response || !response.uri) {
    console.error('📸 Invalid asset received in formatImageResponse:', response);
    throw new Error('Invalid image asset: missing URI');
  }
  
  // Handle both react-native-image-picker Asset and react-native-image-crop-picker response
  const name = response.fileName || response.filename || `image-${Date.now()}.jpg`;
  const type = response.type || response.mime || (response.uri.endsWith('.png') ? 'image/png' : 'image/jpeg');
  
  console.log(`📸 Formatting image response: ${name} (${type})`);
  
  return {
    uri: response.uri || response.path,
    type: type,
    name: name,
    width: response.width,
    height: response.height,
    fileSize: response.fileSize || response.size,
  };
};

/**
 * Open image cropper with the given image URI
 * @param imageUri - URI of the image to crop
 * @param options - Optional cropping options
 * @returns Promise with the cropped image or null if canceled
 */
export const cropImage = async (imageUri: string, options?: CroppingOptions): Promise<ImageAsset | null> => {
  console.log('✂️ Starting image cropping for:', imageUri);
  
  // Check if the crop picker module is available
  if (!ImageCropPicker) {
    console.warn('✂️ Image crop picker module not available, skipping crop step');
    Alert.alert(
      'Cropping Not Available', 
      'Image cropping is temporarily unavailable. The image will be used as selected.',
      [{ text: 'OK' }]
    );
    // Return the original image without cropping
    return {
      uri: imageUri,
      type: imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg',
      name: `image-${Date.now()}.${imageUri.endsWith('.png') ? 'png' : 'jpg'}`,
    };
  }
  
  try {
    const defaultOptions: CroppingOptions = {
      cropping: true,
      freeStyleCropEnabled: true,
      enableRotationGesture: true,
      avoidEmptySpaceAroundImage: false,
      includeBase64: false,
      compressImageQuality: 0.95,
      compressImageMaxWidth: 2400,
      compressImageMaxHeight: 2400,
      cropperActiveWidgetColor: '#EF3D47',
      cropperToolbarColor: '#EF3D47',
      cropperToolbarWidgetColor: '#FFFFFF',
      cropperChooseText: 'Choose',
      cropperCancelText: 'Cancel',
      hideBottomControls: false,
      disableCropperColorSetters: false,
      includeExif: true,
    };

    const croppingOptions = {
      ...defaultOptions,
      ...(options || {}),
    };

    console.log('✂️ Opening cropper with options:', JSON.stringify(croppingOptions));
    
    try {
      const croppedImage = await ImageCropPicker.openCropper({
        path: imageUri,
        mediaType: 'photo' as const,
        ...croppingOptions,
      });

      console.log('✂️ Image cropped successfully:', croppedImage.path);
      
      try {
        return formatImageResponse(croppedImage);
      } catch (formatError) {
        console.error('✂️ Error formatting cropped image response:', formatError);
        Alert.alert('Error', 'Failed to process the cropped image. Please try again.');
        return null;
      }
    } catch (cropError: any) {
      // If the native module is not available, show a helpful message
      if (cropError.message && (cropError.message.includes('RNCImageCropPicker') || cropError.message.includes('TurboModuleRegistry'))) {
        console.warn('✂️ Native image crop picker not available, skipping crop step');
        Alert.alert(
          'Cropping Not Available', 
          'Image cropping is temporarily unavailable. The image will be used as selected.',
          [{ text: 'OK' }]
        );
        // Return the original image without cropping
        return {
          uri: imageUri,
          type: imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg',
          name: `image-${Date.now()}.${imageUri.endsWith('.png') ? 'png' : 'jpg'}`,
        };
      }
      throw cropError; // Re-throw other errors
    }
  } catch (error: any) {
    // Check if user cancelled
    if (error.code === 'E_PICKER_CANCELLED') {
      console.log('✂️ User cancelled image cropping');
      return null;
    }
    
    console.error('✂️ Error cropping image:', error);
    Alert.alert('Error', 'Failed to crop image. Please try again.');
    return null;
  }
};

/**
 * Launch the camera to take a photo
 * @param options - Optional camera options
 * @returns Promise with the selected image or null if canceled
 */
export const takePhotoWithCamera = async (options?: CameraOptions): Promise<ImageAsset | null> => {
  console.log('📸 Starting takePhotoWithCamera');
  
  try {
    // Check if camera function is available
    if (typeof launchCamera !== 'function') {
      console.error('📸 Error: launchCamera is not a function');
      Alert.alert('Error', 'Camera functionality is not available. Please restart the app.');
      return null;
    }
    // Request camera permission on Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        console.log('📸 Camera permission denied');
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.'
        );
        return null;
      }
    }
    
    // Make sure we have a proper current options object
    const currentOptions = {
      ...DEFAULT_CAMERA_OPTIONS,
      ...(options || {}),
    };
    
    console.log('📸 Launching camera with options:', JSON.stringify(currentOptions));
    
    // Launch camera with options
    console.log('📸 Attempting to launch camera');
    const result = await launchCamera(currentOptions);
    
    console.log('📸 Camera result received:', result.didCancel ? 'Cancelled' : 'Success');
    
    // Check if user cancelled
    if (result.didCancel) {
      console.log('📸 User cancelled taking a photo');
      return null;
    }
    
    // Check for errors
    if (result.errorCode) {
      console.error('📸 Camera error:', result.errorCode, result.errorMessage);
      Alert.alert('Error', result.errorMessage || 'Failed to take picture. Please try again.');
      return null;
    }
    
    // Get the first asset (we're only allowing one photo at a time)
    if (!result.assets || result.assets.length === 0) {
      console.error('📸 No assets returned from camera');
      return null;
    }
    
    const asset = result.assets[0];
    if (!asset || !asset.uri) {
      console.error('📸 Invalid image asset returned from camera:', asset);
      return null;
    }
    
    console.log('📸 Photo taken successfully:', asset.uri);
    try {
      return formatImageResponse(asset);
    } catch (formatError) {
      console.error('📸 Error formatting camera image response:', formatError);
      Alert.alert('Error', 'Failed to process the image. Please try again.');
      return null;
    }
  } catch (error) {
    console.error('📸 Error taking picture:', error);
    Alert.alert('Error', 'Failed to take picture. Please try again.');
    return null;
  }
};

/**
 * Launch the image gallery to select a photo
 * @param options - Optional image library options
 * @returns Promise with the selected image or null if canceled
 */
export const selectImageFromLibrary = async (options?: ImageLibraryOptions): Promise<ImageAsset | null> => {
  console.log('🖼️ Starting selectImageFromLibrary');
  
  try {
    // Check if library function is available
    if (typeof launchImageLibrary !== 'function') {
      console.error('🖼️ Error: launchImageLibrary is not a function');
      Alert.alert('Error', 'Photo library access is not available. Please restart the app.');
      return null;
    }
    // Request photo library permission on Android
    if (Platform.OS === 'android') {
      const hasPermission = await requestPhotoLibraryPermission();
      if (!hasPermission) {
        console.log('🖼️ Photo library permission denied');
        Alert.alert(
          'Permission Required',
          'Photo library permission is required to select images.'
        );
        return null;
      }
    }
    
    // Make sure we have a proper current options object
    const currentOptions = {
      ...DEFAULT_LIBRARY_OPTIONS,
      ...(options || {}),
    };
    
    console.log('🖼️ Launching image library with options:', JSON.stringify(currentOptions));
    
    // Launch image library with options
    console.log('🖼️ Attempting to launch image library');
    const result = await launchImageLibrary(currentOptions);
    
    console.log('🖼️ Image library result received:', result.didCancel ? 'Cancelled' : 'Success');
    
    // Check if user cancelled
    if (result.didCancel) {
      console.log('🖼️ User cancelled image selection');
      return null;
    }
    
    // Check for errors
    if (result.errorCode) {
      console.error('🖼️ Image library error:', result.errorCode, result.errorMessage);
      Alert.alert('Error', result.errorMessage || 'Failed to select image. Please try again.');
      return null;
    }
    
    // Get the first asset (we're only allowing one image at a time)
    if (!result.assets || result.assets.length === 0) {
      console.error('🖼️ No assets returned from photo library');
      return null;
    }
    
    const asset = result.assets[0];
    if (!asset || !asset.uri) {
      console.error('🖼️ Invalid image asset returned from library:', asset);
      return null;
    }
    
    console.log('🖼️ Image selected successfully:', asset.uri);
    try {
      return formatImageResponse(asset);
    } catch (formatError) {
      console.error('🖼️ Error formatting library image response:', formatError);
      Alert.alert('Error', 'Failed to process the selected image. Please try again.');
      return null;
    }
  } catch (error) {
    console.error('🖼️ Error selecting from gallery:', error);
    Alert.alert('Error', 'Failed to select image. Please try again.');
    return null;
  }
};

/**
 * Take a photo with camera and then crop it
 * @param cameraOptions - Optional camera options
 * @param croppingOptions - Optional cropping options
 * @returns Promise with the cropped image or null if canceled
 */
export const takePhotoWithCameraAndCrop = async (
  cameraOptions?: CameraOptions, 
  croppingOptions?: CroppingOptions
): Promise<ImageAsset | null> => {
  console.log('📸✂️ Starting takePhotoWithCameraAndCrop');
  
  try {
    // First, take the photo
    const photo = await takePhotoWithCamera(cameraOptions);
    if (!photo) {
      return null; // User cancelled or error occurred
    }
    
    // Then crop the photo
    const croppedPhoto = await cropImage(photo.uri, croppingOptions);
    return croppedPhoto;
  } catch (error) {
    console.error('📸✂️ Error in takePhotoWithCameraAndCrop:', error);
    Alert.alert('Error', 'Failed to take and crop photo. Please try again.');
    return null;
  }
};

/**
 * Select an image from library and then crop it
 * @param libraryOptions - Optional image library options
 * @param croppingOptions - Optional cropping options
 * @returns Promise with the cropped image or null if canceled
 */
export const selectImageFromLibraryAndCrop = async (
  libraryOptions?: ImageLibraryOptions, 
  croppingOptions?: CroppingOptions
): Promise<ImageAsset | null> => {
  console.log('🖼️✂️ Starting selectImageFromLibraryAndCrop');
  
  try {
    // First, select the image
    const image = await selectImageFromLibrary(libraryOptions);
    if (!image) {
      return null; // User cancelled or error occurred
    }
    
    // Then crop the image
    const croppedImage = await cropImage(image.uri, croppingOptions);
    return croppedImage;
  } catch (error) {
    console.error('🖼️✂️ Error in selectImageFromLibraryAndCrop:', error);
    Alert.alert('Error', 'Failed to select and crop image. Please try again.');
    return null;
  }
};