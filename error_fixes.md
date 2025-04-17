# DripOut Error Fixes

This document tracks errors encountered during development and their solutions.

## Firebase Batch Operation Error

**Error:**
```
ERROR Error propagating profile updates: [TypeError: _$$_REQUIRE(_dependencyMap[3], "(...)Config/firebaseconfig").db.batch is not a function (it is undefined)]
ERROR Error updating profile picture: [TypeError: _$$_REQUIRE(_dependencyMap[3], "(...)Config/firebaseconfig").db.batch is not a function (it is undefined)]
```

**Fix:**
The error occurred because the code was using `db.batch()` which is not correct in Firebase v9 modular SDK. 

The fix involved:
1. Import `writeBatch` from Firebase Firestore:
```typescript
import { writeBatch } from 'firebase/firestore';
```

2. Replace all occurrences of `db.batch()` with `writeBatch(db)` in the `propagateProfileUpdates` function in `firestoreService.ts`:
```typescript
// Old code:
let batch = db.batch();

// New code:
let batch = writeBatch(db);
```

3. Also enhanced the profile picture update functionality by updating Firebase Auth profile:
```typescript
// Also update the Firebase Auth user profile
try {
  await currentUser.updateProfile({
    photoURL: imageUrl
  });
  console.log('Firebase Auth profile updated successfully');
} catch (authError) {
  console.error('Error updating Firebase Auth profile:', authError);
  // Continue with the process even if this fails
}
```

## Profile Picture Update Not Triggered on Click

**Issue:**
When clicking on profile picture, the image selection dialog was not appearing.

**Fix:**
1. Made the entire profile image clickable by updating the overlay:
```typescript
{/* Make entire profile image clickable for updating */}
<TouchableOpacity 
  style={styles.profileClickOverlay}
  activeOpacity={0.8}
  onPress={handleProfilePictureUpdate}
/>
```

2. Fixed z-index issues to ensure proper layering:
```typescript
profileCameraButton: {
  // ... existing styles
  zIndex: 10, // Ensure the camera button appears above other elements
},

profileClickOverlay: {
  // ... existing styles
  zIndex: 5, // Higher than base image but lower than camera button
},
```

3. Added better error handling in the camera and image picker functions:
```typescript
try {
  const image = await takePhotoWithCamera();
  console.log('Camera image result:', image);
  if (image) {
    uploadProfilePicture(image);
  }
} catch (error) {
  console.error('Error taking photo:', error);
  Alert.alert('Error', 'Failed to take photo. Please try again.');
}
```

## Username/Profile Data Inconsistency in Posts

**Issue:**
Posts in the social feed were showing outdated names or username data when the profile was updated in the user's profile screen.

**Fix:**
1. Modified the username display in `SocialScreen.tsx` to use '@' prefix for usernames in posts:
```typescript
<Text style={[styles.username, { color: textColor }]}>
  @{item.username}
</Text>
```

2. Enhanced the post creation logic in `postService.ts` to get the most up-to-date user data from Firestore:
```typescript
try {
  // Import getUserProfile to get the most up-to-date user info
  const { getUserProfile } = require('./firestoreService');
  const userProfile = await getUserProfile(userId);
  
  if (userProfile) {
    // Prefer Firestore username over displayName for consistency
    username = userProfile.username || currentUser.displayName || 'Anonymous';
    userAvatar = userProfile.profilePictureURL || currentUser.photoURL || '';
  } else {
    // Fallback to Firebase Auth user info
    username = currentUser.displayName || 'Anonymous';
    userAvatar = currentUser.photoURL || '';
  }
} catch (error) {
  console.error('Error fetching user profile for post, using fallback:', error);
  username = currentUser.displayName || 'Anonymous';
  userAvatar = currentUser.photoURL || '';
}
```

The key part of the fix was to ensure that posts always fetch the latest user profile data from Firestore's `users` collection rather than relying on Firebase Auth `displayName`, which might not be synchronized with Firestore updates.

3. Added a dedicated function to update existing posts when a user changes their profile:
```typescript
export const updatePostsWithNewProfileData = async (
  userId: string,
  newUsername?: string,
  newUserAvatar?: string
): Promise<void> => {
  if (!newUsername && !newUserAvatar) {
    console.log('No profile updates to propagate to posts');
    return;
  }
  
  try {
    console.log(`Updating existing posts for user ${userId} with new profile data`);
    
    // Query all posts by this user
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', userId)
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    
    if (postsSnapshot.empty) {
      console.log('No posts found to update');
      return;
    }
    
    // Create a batch to update all posts at once
    const batchSize = 500; // Firestore has a limit of 500 writes per batch
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    
    postsSnapshot.forEach((postDoc) => {
      const updateData: Record<string, any> = {};
      
      if (newUsername) updateData.username = newUsername;
      if (newUserAvatar) updateData.userAvatar = newUserAvatar;
      
      // Update the post document
      currentBatch.update(postDoc.ref, updateData);
      operationCount++;
      
      // If we've reached the batch limit, commit this batch and start a new one
      if (operationCount >= batchSize) {
        currentBatch.commit();
        currentBatch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Commit any remaining operations in the final batch
    if (operationCount > 0) {
      await currentBatch.commit();
    }
  } catch (error) {
    console.error('Error updating posts with new profile data:', error);
    throw error;
  }
};
```

4. Updated `propagateProfileUpdates` in `firestoreService.ts` to use this new function:
```typescript
// 1. Update user posts using the dedicated postService function
if (fieldsToPropagate.username || fieldsToPropagate.userAvatar) {
  try {
    // Import the post service function to update all posts by this user
    const { updatePostsWithNewProfileData } = require('./postService');
    
    // Call the dedicated function that handles batching internally
    await updatePostsWithNewProfileData(
      userId,
      fieldsToPropagate.username,
      fieldsToPropagate.userAvatar
    );
    
    console.log('Posts updated successfully through dedicated function');
  } catch (postUpdateError) {
    console.error('Error updating posts with dedicated function, falling back to manual update:', postUpdateError);
    
    // Fallback to original implementation if the dedicated function fails
    // ... fallback code here ...
  }
}