import { Platform } from 'react-native';
import { auth } from '../Config/firebaseconfig';
import storage from '@react-native-firebase/storage';

// Set the storage bucket - try both formats to ensure one works
try {
  // Try both bucket formats to see which one works
  const bucketFormats = [
    'dripout-32d33.appspot.com',
    'dripout-32d33.firebasestorage.app'
  ];
  
  for (const bucket of bucketFormats) {
    try {
      storage().setStorageBucket(bucket);
      console.log('🔍 STORAGE INIT: Successfully set primary bucket to: ' + bucket);
      break;
    } catch (error) {
      console.log('🔍 STORAGE INIT: Failed to set bucket: ' + bucket, error.message);
    }
  }
} catch (error) {
  console.log('🔍 STORAGE INIT: General initialization error', error);
}

/**
 * Upload an image to Firebase Storage and get the URL
 * 
 * @param uri - The local URI of the image to upload
 * @param folder - The folder to store the image in (e.g., 'posts', 'profiles')
 * @param filename - Optional custom filename for the upload
 * @param onProgress - Optional callback for upload progress
 * @returns The download URL of the uploaded image
 */
export const uploadImageAndGetURL = async (
  uri: string,
  folder: string,
  filename?: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('📤 StorageService: Starting image upload');
  
  return new Promise((resolve, reject) => {
    try {
      // Get current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return reject(new Error('User not authenticated'));
      }
      
      // Extract filename from path
      const uriPath = uri.split('/');
      const fileName = filename || uriPath[uriPath.length - 1];
      
      // Add timestamp to filename to ensure uniqueness
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      
      // Explicitly construct the path with user ID for better organization
      const storagePath = `${folder}/${currentUser.uid}/${uniqueFileName}`;
      
      // Log the current bucket being used
      const currentBucket = storage()._customUrlOrRegion || '(default)';
      console.log('🔍 UPLOAD ATTEMPT [PRIMARY PATH]: Using bucket: ' + currentBucket);
      console.log('🔍 UPLOAD ATTEMPT [PRIMARY PATH]: Storage path: ' + storagePath);

      // Create a storage reference with the explicit path
      const ref = storage().ref(storagePath);
      
      // Normalize URI for iOS
      const normalizedUri = Platform.OS === 'ios' && !uri.startsWith('file://') 
        ? `file://${uri}` 
        : uri;
      
      console.log('🔍 UPLOAD ATTEMPT [PRIMARY PATH]: Normalized URI: ' + normalizedUri.substring(0, 50) + '...');
      
      // Create upload task
      console.log('🔍 UPLOAD ATTEMPT [PRIMARY PATH]: Starting upload');
      const uploadTask = ref.putFile(normalizedUri);
      
      // Register observers
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          const progressPercent = Math.round(progress * 100);
          
          // Log progress milestones
          if (progressPercent % 20 === 0 || progressPercent === 100) {
            console.log(`🔍 UPLOAD PROGRESS [PRIMARY PATH]: ${progressPercent}% complete (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
          }
          
          // Log state changes
          if (snapshot.state === 'running') {
            console.log('🔍 UPLOAD STATE [PRIMARY PATH]: Upload is running');
          } else if (snapshot.state === 'paused') {
            console.log('🔍 UPLOAD STATE [PRIMARY PATH]: Upload is paused');
          }
          
          // Call progress callback if provided
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Upload failed with error code:', error.code);
          console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Error details:', error.message);
          
          // Provide specific error messages for common issues
          switch (error.code) {
            case 'storage/unauthorized':
              console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Not authorized to upload. Check Firebase Storage rules.');
              reject(new Error('Not authorized to upload. Check your Firebase Storage rules.'));
              break;
            case 'storage/canceled':
              console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Upload was canceled.');
              reject(new Error('Upload was canceled.'));
              break;
            case 'storage/object-not-found':
              console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Object not found error, trying FALLBACK METHOD!');
              
              // Switch to the other bucket format
              const currentBucket = storage()._customUrlOrRegion || '';
              const alternateBucket = currentBucket.includes('appspot')
                ? 'dripout-32d33.firebasestorage.app'
                : 'dripout-32d33.appspot.com';
              
              console.log('🔍 UPLOAD ATTEMPT [FALLBACK PATH]: Switching to alternate bucket: ' + alternateBucket);
              storage().setStorageBucket(alternateBucket);
              
              // We can't use await here since we're in a non-async callback, so use Promise instead
              const testPath = `test/simple_test_${Date.now()}.txt`;
              console.log('🔍 UPLOAD ATTEMPT [FALLBACK PATH]: Testing with simple file: ' + testPath);
              const simpleRef = storage().ref(testPath);
              
              // Use Promise chain instead of await
              simpleRef.putString('Test data')
                .then(() => {
                  console.log('🔍 UPLOAD SUCCESS [FALLBACK PATH]: Test upload succeeded with alternate bucket: ' + alternateBucket);
                  console.log('🔍 UPLOAD INFO [FALLBACK PATH]: ✅ FALLBACK METHOD WORKING - Will use this bucket for future uploads!');
                  reject(new Error('Please try your upload again with the new storage configuration.'));
                })
                .catch((retryError) => {
                  console.log('🔍 UPLOAD ERROR [FALLBACK PATH]: Alternate bucket failed too:', retryError.message);
                  console.log('🔍 UPLOAD INFO [FALLBACK PATH]: ❌ BOTH METHODS FAILED - Firebase Storage configuration issue');
                  reject(new Error('Firebase Storage is not configured correctly.'));
                });
              break;
            case 'storage/unknown':
              console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Unknown storage error');
              reject(new Error(`Unknown error occurred. Check your network connection.`));
              break;
            default:
              console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Unhandled error type');
              reject(error);
          }
        },
        async () => {
          // Handle successful uploads on complete
          console.log('🔍 UPLOAD SUCCESS [PRIMARY PATH]: Upload completed successfully!');
          
          try {
            // Get the download URL from snapshot reference
            console.log('🔍 UPLOAD SUCCESS [PRIMARY PATH]: Getting download URL');
            const downloadURL = await ref.getDownloadURL();
            console.log('🔍 UPLOAD SUCCESS [PRIMARY PATH]: ✅ UPLOAD COMPLETE - Download URL generated');
            console.log('🔍 UPLOAD INFO [PRIMARY PATH]: The PRIMARY upload path is working correctly!');
            resolve(downloadURL);
          } catch (urlError) {
            console.log('🔍 UPLOAD ERROR [PRIMARY PATH]: Failed to get download URL:', urlError.message);
            reject(new Error('Upload succeeded but failed to get download URL'));
          }
        }
      );
    } catch (error) {
      console.log('🔍 UPLOAD ERROR [SETUP]: General error during upload setup:', error);
      reject(error instanceof Error ? error : new Error('Unknown error during upload setup'));
    }
  });
};