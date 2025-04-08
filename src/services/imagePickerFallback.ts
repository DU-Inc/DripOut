import { Alert, Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { PermissionsAndroid } from 'react-native';

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
 * Request photo library permission for Android
 * @returns boolean indicating if permission was granted
 */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS permissions are handled by the OS
  }

  try {
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
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error('Error requesting photo library permission:', err);
    return false;
  }
};

/**
 * Select an image from the device's photo library using CameraRoll
 * This is a fallback solution when react-native-image-picker is not working
 * @returns Promise that resolves to an ImageAsset or null
 */
export const selectImageFromLibraryFallback = async (): Promise<ImageAsset | null> => {
  try {
    // Request permission
    const permissionGranted = await requestPhotoLibraryPermission();
    if (!permissionGranted) {
      console.log('Permission denied for accessing photo library');
      Alert.alert('Permission denied', 'DripOut needs permission to access your photos');
      return null;
    }

    // Get photos from camera roll
    const photos = await CameraRoll.getPhotos({
      first: 20,
      assetType: 'Photos',
    });
    
    if (photos.edges.length > 0) {
      // Use the first photo for simplicity
      // In a real app, you would show a photo picker UI
      const asset = photos.edges[0].node;
      return {
        uri: asset.image.uri,
        type: 'image/jpeg', // Assuming JPEG for simplicity
        name: asset.image.uri.split('/').pop() || 'photo.jpg',
      };
    } else {
      Alert.alert('No Photos', 'No photos found in your gallery.');
      return null;
    }
  } catch (error) {
    console.error('Error selecting image from library:', error);
    Alert.alert('Error', 'Failed to access photos. Please try again.');
    return null;
  }
};

/**
 * Simulated photo capture function
 * This is just a placeholder when the camera functionality isn't available
 * @returns Promise that resolves to null and shows an alert
 */
export const takePhotoWithCameraFallback = async (): Promise<ImageAsset | null> => {
  Alert.alert(
    'Camera Not Available',
    'The camera feature requires additional setup. Please use the image gallery instead.',
    [
      {
        text: 'Use Gallery',
        onPress: async () => {
          return await selectImageFromLibraryFallback();
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
  return null;
};