import { appleAuth } from '@invertase/react-native-apple-authentication';
import { auth } from '../../Config/firebaseconfig';
import { db } from '../../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../../utils/appStateManager';
import { generateSecureNonce, sha256Hash, hasAnonymizedData } from '../../utils/cryptoUtils';

export interface AppleAuthResponse {
  user: any;
  isNewUser: boolean;
  userData: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  isAnonymizedUser: boolean;
  authorizationCode?: string; // For token revocation
}

export const signInWithApple = async (): Promise<AppleAuthResponse> => {
  try {
    // Generate a cryptographically secure nonce
    const rawNonce = generateSecureNonce(32);
    const hashedNonce = sha256Hash(rawNonce);
    
    console.log('Apple Sign-In: Generated nonce for security');

    // Start the sign-in request with the hashed nonce
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [
        appleAuth.Scope.EMAIL,
        appleAuth.Scope.FULL_NAME
      ],
      nonce: hashedNonce, // Send SHA256 hash to Apple
    });

    // Ensure Apple returned a user identityToken
    if (!appleAuthResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identify token returned');
    }

    // Validate that we have the raw nonce for Firebase
    if (!rawNonce) {
      throw new Error('Invalid state: No raw nonce available for Firebase authentication');
    }

    // Get user data from Apple response
    const userData = {
      email: appleAuthResponse.email,
      firstName: appleAuthResponse.fullName?.givenName || null,
      lastName: appleAuthResponse.fullName?.familyName || null,
    };

    // Check if user is using anonymized data
    const isAnonymizedUser = hasAnonymizedData(userData);
    
    if (isAnonymizedUser) {
      console.log('Apple Sign-In: User is using anonymized email');
    }

    // Create Firebase credential with the raw nonce and full name
    // Use OAuthProvider for proper full name preservation
    const appleCredential = auth.OAuthProvider.credential('apple.com', {
      idToken: appleAuthResponse.identityToken,
      rawNonce: rawNonce, // Use the unhashed nonce for Firebase
    });

    // Sign in with credential
    const userCredential = await auth().signInWithCredential(appleCredential);
    const user = userCredential.user;

    // Check if user exists in Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    const isNewUser = !userDoc.exists;

    // If new user, create user document with anonymization flag
    if (isNewUser) {
      const userDocData: any = {
        userId: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAppleAuth: true,
        isAnonymizedUser: isAnonymizedUser,
        onboardingCompleted: false
      };

      // Add warning for anonymized users
      if (isAnonymizedUser) {
        console.warn('Creating user with anonymized Apple ID - ensure compliance with Apple policies');
        userDocData.anonymizedDataNotice = 'User signed in with Apple anonymized data. Obtain consent before linking additional identifying information.';
      }

      await db.collection('users').doc(user.uid).set(userDocData);

      // Set app state for new user
      appStateManager.setAuthenticated(true);
      appStateManager.setOnboarding(true);
    } else {
      // Update last login time for existing user
      const updateData: any = {
        lastLoginAt: new Date()
      };

      // Update anonymization status if it changed
      if (userDoc.data()?.isAnonymizedUser !== isAnonymizedUser) {
        updateData.isAnonymizedUser = isAnonymizedUser;
        console.log('Updated user anonymization status:', isAnonymizedUser);
      }

      await db.collection('users').doc(user.uid).update(updateData);

      // Set authenticated state
      appStateManager.setAuthenticated(true);
    }

    // Store the token
    const token = await user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    return {
      user,
      isNewUser,
      userData,
      isAnonymizedUser,
      authorizationCode: appleAuthResponse.authorizationCode ? 
        String(appleAuthResponse.authorizationCode) : undefined
    };
  } catch (error) {
    console.error('Apple Sign-In Error:', error);
    throw error;
  }
};

export const isAppleAuthSupported = async (): Promise<boolean> => {
  return appleAuth.isSupported;
};

/**
 * Revokes Apple Sign-In token and deletes user account
 * Required by Apple for account deletion functionality
 * @param authorizationCode - Authorization code from Apple Sign-In response
 */
export const revokeAppleTokenAndDeleteAccount = async (authorizationCode?: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    // If we have an authorization code, revoke the token
    if (authorizationCode) {
      console.log('Revoking Apple token...');
      await auth().revokeToken(authorizationCode);
      console.log('Apple token revoked successfully');
    } else {
      console.warn('No authorization code available - token cannot be revoked. User must sign in again.');
    }

    // Delete the user's Firestore data
    await db.collection('users').doc(currentUser.uid).delete();
    console.log('User Firestore data deleted');

    // Delete the Firebase Auth user
    await currentUser.delete();
    console.log('Firebase Auth user deleted');

    // Clear local storage
    await AsyncStorage.removeItem('firebaseUserToken');
    
    // Update app state
    appStateManager.setAuthenticated(false);
    appStateManager.setOnboarding(false);
    
  } catch (error) {
    console.error('Error during account deletion:', error);
    throw error;
  }
};

/**
 * Initiates Apple Sign-In for account deletion
 * This is required when user wants to delete account but we don't have authorization code
 */
export const signInForAccountDeletion = async (): Promise<string> => {
  try {
    // Generate a new nonce for this deletion request
    const rawNonce = generateSecureNonce(32);
    const hashedNonce = sha256Hash(rawNonce);
    
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      nonce: hashedNonce,
    });

    if (!appleAuthResponse.authorizationCode) {
      throw new Error('No authorization code received from Apple');
    }

    return String(appleAuthResponse.authorizationCode);
  } catch (error) {
    console.error('Error during sign-in for deletion:', error);
    throw error;
  }
}; 