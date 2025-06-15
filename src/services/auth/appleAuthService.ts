import { appleAuth } from '@invertase/react-native-apple-authentication';
import { auth } from '../../Config/firebaseconfig';
import { db } from '../../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../../utils/appStateManager';

export interface AppleAuthResponse {
  user: any;
  isNewUser: boolean;
  userData: {
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export const signInWithApple = async (): Promise<AppleAuthResponse> => {
  try {
    // Start the sign-in request
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [
        appleAuth.Scope.EMAIL,
        appleAuth.Scope.FULL_NAME
      ],
    });

    // Ensure Apple returned a user identityToken
    if (!appleAuthResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identify token returned');
    }

    // Create a Firebase credential from the response
    const { identityToken, nonce } = appleAuthResponse;
    const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

    // Sign in with credential
    const userCredential = await auth().signInWithCredential(appleCredential);
    const user = userCredential.user;

    // Get user data from Apple response
    const userData = {
      email: appleAuthResponse.email,
      firstName: appleAuthResponse.fullName?.givenName || null,
      lastName: appleAuthResponse.fullName?.familyName || null,
    };

    // Check if user exists in Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    const isNewUser = !userDoc.exists;

    // If new user, create user document
    if (isNewUser) {
      await db.collection('users').doc(user.uid).set({
        userId: user.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAppleAuth: true,
        onboardingCompleted: false
      });

      // Set app state for new user
      appStateManager.setAuthenticated(true);
      appStateManager.setOnboarding(true);
    } else {
      // Update last login time for existing user
      await db.collection('users').doc(user.uid).update({
        lastLoginAt: new Date()
      });

      // Set authenticated state
      appStateManager.setAuthenticated(true);
    }

    // Store the token
    const token = await user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);

    return {
      user,
      isNewUser,
      userData
    };
  } catch (error) {
    console.error('Apple Sign-In Error:', error);
    throw error;
  }
};

export const isAppleAuthSupported = async (): Promise<boolean> => {
  return appleAuth.isSupported;
}; 