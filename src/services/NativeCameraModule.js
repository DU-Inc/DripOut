// src/services/NativeCameraModule.js
import { NativeModules, Platform } from 'react-native';

const { DripOutCameraModule } = NativeModules;

/**
 * Native iOS Camera Module
 * Provides direct access to native iOS camera and photo library functionality
 */
class NativeCameraModuleClass {
  
  /**
   * Check if native camera module is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && DripOutCameraModule != null;
  }

  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Native camera module not available');
      return false;
    }

    try {
      const granted = await DripOutCameraModule.requestCameraPermission();
      console.log('📸 Native camera permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('📸 Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request photo library permission
   */
  async requestPhotoLibraryPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Native camera module not available');
      return false;
    }

    try {
      const granted = await DripOutCameraModule.requestPhotoLibraryPermission();
      console.log('📸 Native photo library permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('📸 Error requesting photo library permission:', error);
      return false;
    }
  }

  /**
   * Take a photo with the camera and enable cropping
   */
  async takePhotoWithCrop(options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Native camera module not available');
    }

    try {
      console.log('📸 Taking photo with native camera module');
      const result = await DripOutCameraModule.takePhotoWithCrop(options);
      
      if (result && result.uri) {
        console.log('📸 Photo taken successfully:', result.uri);
        return result;
      } else {
        console.warn('📸 No photo returned from native module');
        return null;
      }
    } catch (error) {
      console.error('📸 Error taking photo with native camera:', error);
      
      // Check for specific error codes
      if (error.code === 'user_cancelled') {
        console.log('📸 User cancelled photo capture');
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Select image from photo library with cropping
   */
  async selectFromLibraryWithCrop(options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Native camera module not available');
    }

    try {
      console.log('📸 Selecting image from library with native camera module');
      const result = await DripOutCameraModule.selectFromLibraryWithCrop(options);
      
      if (result && result.uri) {
        console.log('📸 Image selected successfully:', result.uri);
        return result;
      } else {
        console.warn('📸 No image returned from native module');
        return null;
      }
    } catch (error) {
      console.error('📸 Error selecting image from library with native camera:', error);
      
      // Check for specific error codes
      if (error.code === 'user_cancelled') {
        console.log('📸 User cancelled image selection');
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Crop an existing image
   */
  async cropImage(imageUri, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Native camera module not available');
    }

    try {
      console.log('📸 Cropping image with native camera module:', imageUri);
      const result = await DripOutCameraModule.cropImage(imageUri, options);
      
      if (result && result.uri) {
        console.log('📸 Image cropped successfully:', result.uri);
        return result;
      } else {
        console.warn('📸 No cropped image returned from native module');
        return null;
      }
    } catch (error) {
      console.error('📸 Error cropping image with native camera:', error);
      
      // Check for specific error codes
      if (error.code === 'user_cancelled') {
        console.log('📸 User cancelled image cropping');
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Show available features of the native module
   */
  getAvailableFeatures() {
    if (!this.isAvailable()) {
      return [];
    }

    return [
      'camera_capture',
      'photo_library_selection',
      'image_cropping',
      'permission_management',
      'native_performance',
      'ios_optimized'
    ];
  }

  /**
   * Get module information
   */
  getModuleInfo() {
    return {
      name: 'DripOutCameraModule',
      platform: Platform.OS,
      available: this.isAvailable(),
      version: '1.0.0',
      features: this.getAvailableFeatures()
    };
  }
}

// Export singleton instance
const NativeCameraModule = new NativeCameraModuleClass();

export default NativeCameraModule;