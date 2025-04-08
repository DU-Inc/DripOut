import { storage } from '../Config/firebaseconfig';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Platform } from 'react-native';
import { auth } from '../Config/firebaseconfig';

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
  try {
    // Get current user ID for organizing uploads
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Parse the filename from URI if not provided
    const fileNameFromUri = uri.substring(uri.lastIndexOf('/') + 1);
    const uploadFileName = filename || fileNameFromUri;
    
    // Create a unique file path in storage
    const timestamp = new Date().getTime();
    const storagePath = `${folder}/${userId}/${timestamp}_${uploadFileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Convert URI to Blob (needed for Firebase Storage)
    const fetchResponse = await fetch(uri);
    const blob = await fetchResponse.blob();
    
    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Upload failed:', error);
          reject(error);
        },
        async () => {
          // Handle successful uploads - get the download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (err) {
            console.error('Failed to get download URL:', err);
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};