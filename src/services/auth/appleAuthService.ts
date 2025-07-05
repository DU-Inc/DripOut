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
    console.log('🚀 Apple Sign-In: Starting authentication process...');
    
    // Checkpoint 1: Nonce generation
    console.log('🎲 Checkpoint 1: Nonce generation');
    const rawNonce = generateSecureNonce(32);
    const hashedNonce = sha256Hash(rawNonce);
    console.log('✅ Nonce generated - Raw length:', rawNonce.length, 'Hash length:', hashedNonce.length);
    console.log('🔍 Raw nonce preview:', rawNonce.substring(0, 8) + '...');
    console.log('🔍 Hashed nonce preview:', hashedNonce.substring(0, 16) + '...');

    // Checkpoint 2: Apple Sign-In request
    console.log('🍎 Checkpoint 2: Apple Sign-In request');
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [
        appleAuth.Scope.EMAIL,
        appleAuth.Scope.FULL_NAME
      ],
      nonce: hashedNonce, // Send SHA256 hash to Apple
    });

    console.log('🍎 Apple Sign-In: Received response from Apple');
    console.log('📧 Email provided:', !!appleAuthResponse.email);
    console.log('📧 Email value:', appleAuthResponse.email);
    console.log('👤 Full name provided:', !!appleAuthResponse.fullName);
    console.log('👤 Full name object:', JSON.stringify(appleAuthResponse.fullName, null, 2));
    console.log('👤 Given name:', appleAuthResponse.fullName?.givenName);
    console.log('👤 Family name:', appleAuthResponse.fullName?.familyName);
    console.log('🔑 Identity token provided:', !!appleAuthResponse.identityToken);
    console.log('🔑 Identity token length:', appleAuthResponse.identityToken?.length);
    console.log('📝 Authorization code provided:', !!appleAuthResponse.authorizationCode);
    console.log('📝 Authorization code length:', appleAuthResponse.authorizationCode?.length);
    
    // Add identity token debugging (React Native compatible)
    if (appleAuthResponse.identityToken) {
      try {
        // Decode the JWT header to verify structure (without signature verification)
        const tokenParts = appleAuthResponse.identityToken.split('.');
        console.log('🔍 Identity token parts count:', tokenParts.length);
        if (tokenParts.length >= 2) {
          // Use Buffer for React Native compatibility instead of atob
          const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString('utf-8'));
          console.log('🔍 Identity token header:', JSON.stringify(header, null, 2));
          
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
          console.log('🔍 Identity token payload keys:', Object.keys(payload));
          console.log('🔍 Identity token issuer (iss):', payload.iss);
          console.log('🔍 Identity token audience (aud):', payload.aud);
          console.log('🔍 Identity token subject (sub):', payload.sub);
          console.log('🔍 Identity token expiry (exp):', payload.exp, 'Current time:', Math.floor(Date.now() / 1000));
          console.log('🔍 Token valid:', payload.exp > Math.floor(Date.now() / 1000));
          
          // Check nonce in token payload
          if (payload.nonce) {
            console.log('🔍 Nonce in token payload:', payload.nonce);
            console.log('🔍 Nonce matches expected:', payload.nonce === hashedNonce);
          } else {
            console.warn('⚠️ No nonce found in identity token payload');
          }
        }
      } catch (tokenDecodeError) {
        console.warn('⚠️ Could not decode identity token for debugging:', tokenDecodeError);
      }
    }
    console.log('🔍 Complete Apple response structure:', JSON.stringify({
      email: appleAuthResponse.email,
      fullName: appleAuthResponse.fullName,
      user: appleAuthResponse.user,
      realUserStatus: appleAuthResponse.realUserStatus,
      state: appleAuthResponse.state,
      authorizationCode: !!appleAuthResponse.authorizationCode,
      identityToken: !!appleAuthResponse.identityToken,
      nonce: appleAuthResponse.nonce
    }, null, 2));
    
    // Ensure Apple returned a user identityToken
    if (!appleAuthResponse.identityToken) {
      console.error('❌ Apple Sign-In: No identity token received');
      throw new Error('Apple Sign-In failed - no identify token returned');
    }

    // Validate that we have the raw nonce for Firebase
    if (!rawNonce) {
      console.error('❌ Apple Sign-In: No raw nonce available');
      throw new Error('Invalid state: No raw nonce available for Firebase authentication');
    }

    // Get user data from Apple response
    const userData = {
      email: appleAuthResponse.email,
      firstName: appleAuthResponse.fullName?.givenName || null,
      lastName: appleAuthResponse.fullName?.familyName || null,
    };

    console.log('📋 User data extracted:', {
      hasEmail: !!userData.email,
      hasFirstName: !!userData.firstName,
      hasLastName: !!userData.lastName,
      emailDomain: userData.email ? userData.email.split('@')[1] : 'none'
    });

    // Graceful handling message for missing email
    if (!userData.email) {
      console.log('📧 No email provided by Apple - this is normal for existing Apple users who chose not to share email');
      console.log('💡 User can add email later through Settings page if needed');
    }
    
    // Explain missing name data
    if (!userData.firstName && !userData.lastName) {
      console.log('👤 No name provided by Apple - this is NORMAL for existing Apple users');
      console.log('📝 Apple only provides name data on the FIRST sign-in to protect privacy');
      console.log('💡 For existing users, Apple expects apps to use previously stored name data');
    }

    // Check if user is using anonymized data
    console.log('🔍 Apple Sign-In: Checking for anonymized data...');
    const isAnonymizedUser = hasAnonymizedData(userData);
    console.log('🔒 Is anonymized user:', isAnonymizedUser);
    
    if (isAnonymizedUser) {
      console.log('⚠️ User using anonymized Apple ID - privacy compliance required');
    }

    // Checkpoint 3: Firebase credential creation
    console.log('🔑 Checkpoint 3: Firebase credential creation');
    console.log('🍎 Creating Apple credential with Firebase...');
    console.log('🔑 Identity Token available:', !!appleAuthResponse.identityToken);
    console.log('🔑 Identity Token preview:', appleAuthResponse.identityToken?.substring(0, 50) + '...');
    console.log('🎲 Raw nonce available:', !!rawNonce);
    console.log('🎲 Raw nonce length:', rawNonce?.length);
    console.log('🎲 Raw nonce value:', rawNonce);
    console.log('🔐 Hashed nonce value:', hashedNonce);

    let appleCredential;
    
    // Validate we have the authorization code (required for accessToken)
    if (!appleAuthResponse.authorizationCode) {
      console.error('❌ No authorization code provided by Apple - this is required for credential');
      throw new Error('Apple Sign-In failed - no authorization code returned');
    }
    
    console.log('🔑 Authorization code available for accessToken:', !!appleAuthResponse.authorizationCode);
    
    try {
      // PRIMARY APPROACH: OAuthProvider with accessToken (from Medium article fix)
      console.log('🔧 Attempting OAuthProvider.credential with accessToken (authorizationCode)...');
      
      // Check if Apple returned our nonce
      if (appleAuthResponse.nonce && appleAuthResponse.nonce === hashedNonce) {
        console.log('✅ Nonce verification passed - Apple returned our hashed nonce');
        
        appleCredential = auth.OAuthProvider.credential('apple.com', {
          idToken: appleAuthResponse.identityToken,
          rawNonce: rawNonce,
          accessToken: appleAuthResponse.authorizationCode // KEY FIX: Add authorizationCode as accessToken
        });
        console.log('✅ OAuthProvider credential created WITH accessToken and nonce');
      } else {
        console.warn('⚠️ Nonce mismatch detected');
        console.log('🔍 Expected hashed nonce:', hashedNonce);
        console.log('🔍 Apple returned nonce:', appleAuthResponse.nonce);
        
        // Try with accessToken but without nonce
        appleCredential = auth.OAuthProvider.credential('apple.com', {
          idToken: appleAuthResponse.identityToken,
          accessToken: appleAuthResponse.authorizationCode
        });
        console.log('⚠️ OAuthProvider credential created WITH accessToken but WITHOUT nonce');
      }
    } catch (credentialError: any) {
      console.error('❌ OAuthProvider.credential with accessToken failed:', credentialError);
      
      try {
        // FALLBACK 1: Try AppleAuthProvider approach
        console.log('🔧 Attempting AppleAuthProvider.credential approach as fallback...');
        appleCredential = auth.AppleAuthProvider.credential(
          appleAuthResponse.identityToken,
          rawNonce
        );
        console.log('✅ AppleAuthProvider credential created as fallback');
      } catch (fallbackError: any) {
        console.error('❌ AppleAuthProvider.credential also failed:', fallbackError);
        
        try {
          // FALLBACK 2: OAuthProvider without accessToken
          console.log('🔧 Attempting OAuthProvider.credential without accessToken...');
          appleCredential = auth.OAuthProvider.credential('apple.com', {
            idToken: appleAuthResponse.identityToken,
            rawNonce: rawNonce
          });
          console.log('✅ OAuthProvider credential created without accessToken');
        } catch (finalError: any) {
          console.error('❌ All credential creation approaches failed:', finalError);
          
          // LAST RESORT: Try without nonce entirely
          console.log('🔧 Last resort: credential creation without nonce...');
          appleCredential = auth.AppleAuthProvider.credential(
            appleAuthResponse.identityToken
          );
          console.log('⚠️ Credential created without nonce (least secure)');
        }
      }
    }

    // Checkpoint 4: Firebase authentication
    console.log('🔥 Checkpoint 4: Firebase authentication');
    console.log('🔥 Apple Sign-In: Attempting Firebase authentication...');
    
    // Log credential details for debugging
    console.log('🔍 Credential details for Firebase:', {
      providerId: appleCredential?.providerId,
      signInMethod: appleCredential?.signInMethod,
      hasToken: !!appleCredential?.token,
      hasSecret: !!appleCredential?.secret
    });
    
    let userCredential;
    let user;
    
    try {
      userCredential = await auth().signInWithCredential(appleCredential);
      user = userCredential.user;
    } catch (firebaseAuthError: any) {
      console.error('🚨 Firebase signInWithCredential failed:', firebaseAuthError);
      
      // ENHANCED ERROR LOGGING - Capture ALL possible error properties
      console.error('🔍 Firebase error details (basic):', {
        code: firebaseAuthError.code,
        message: firebaseAuthError.message,
        nativeErrorCode: firebaseAuthError.nativeErrorCode,
        nativeErrorMessage: firebaseAuthError.nativeErrorMessage
      });
      
      // Log additional Firebase-specific error properties
      console.error('🔍 Firebase error details (extended):', {
        name: firebaseAuthError.name,
        stack: firebaseAuthError.stack,
        cause: firebaseAuthError.cause,
        userInfo: firebaseAuthError.userInfo,
        details: firebaseAuthError.details,
        underlyingError: firebaseAuthError.underlyingError,
        serverResponse: firebaseAuthError.serverResponse,
        customData: firebaseAuthError.customData
      });
      
      // Log the complete error object structure
      console.error('🔍 Complete error object:', JSON.stringify(firebaseAuthError, null, 2));
      
      // Log all enumerable properties
      console.error('🔍 All error properties:', Object.getOwnPropertyNames(firebaseAuthError));
      
      // Try to access any nested error information
      if (firebaseAuthError.userInfo) {
        console.error('🔍 UserInfo details:', JSON.stringify(firebaseAuthError.userInfo, null, 2));
      }
      
      if (firebaseAuthError.details) {
        console.error('🔍 Error details:', JSON.stringify(firebaseAuthError.details, null, 2));
      }
      
      if (firebaseAuthError.underlyingError) {
        console.error('🔍 Underlying error:', JSON.stringify(firebaseAuthError.underlyingError, null, 2));
      }
      
      // Try alternative approaches for internal-error
      if (firebaseAuthError.code === 'auth/internal-error') {
        console.log('🔧 Internal error detected - trying alternative credential approaches...');
        
        try {
          // Try with just the identity token (no nonce, no accessToken)
          console.log('🔧 Trying simplified AppleAuthProvider credential...');
          const simpleCredential = auth.AppleAuthProvider.credential(appleAuthResponse.identityToken);
          userCredential = await auth().signInWithCredential(simpleCredential);
          user = userCredential.user;
          console.log('✅ Fallback authentication successful with simplified credential');
        } catch (fallbackError: any) {
          console.error('❌ Fallback approach also failed:', fallbackError);
          
          // Try OAuthProvider without accessToken
          try {
            console.log('🔧 Trying OAuthProvider without accessToken...');
            const minimalCredential = auth.OAuthProvider.credential('apple.com', {
              idToken: appleAuthResponse.identityToken
            });
            userCredential = await auth().signInWithCredential(minimalCredential);
            user = userCredential.user;
            console.log('✅ Minimal credential authentication successful');
          } catch (minimalError: any) {
            console.error('❌ All authentication approaches failed');
            throw firebaseAuthError; // Re-throw original error
          }
        }
      } else {
        throw firebaseAuthError; // Re-throw if not internal-error
      }
    }
    console.log('✅ Firebase authentication successful - UID:', user.uid);
    console.log('👤 User email in Firebase:', user.email);
    console.log('👤 User display name in Firebase:', user.displayName);

    // Checkpoint 5: Database operations
    console.log('💾 Checkpoint 5: Database operations');
    console.log('💾 Apple Sign-In: Checking user in database...');
    const userDoc = await db.collection('users').doc(user.uid).get();
    const isNewUser = !userDoc.exists;
    console.log('👤 Is new user:', isNewUser);

    // If new user, create user document with anonymization flag
    if (isNewUser) {
      console.log('📝 Creating new user document...');
      
      // Graceful email handling for user document creation
      if (!userData.email) {
        console.log('📧 Creating user without email - user can add email later in Settings');
      }
      
      const userDocData: any = {
        userId: user.uid,
        email: userData.email, // null is acceptable - user can add later
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAppleAuth: true,
        isAnonymizedUser: isAnonymizedUser,
        onboardingCompleted: false,
        emailAddedLater: !userData.email // Flag to track if email was added post-signup
      };

      // Add warning for anonymized users
      if (isAnonymizedUser) {
        console.warn('⚠️ Creating user with anonymized Apple ID - ensure compliance with Apple policies');
        userDocData.anonymizedDataNotice = 'User signed in with Apple anonymized data. Obtain consent before linking additional identifying information.';
      }

      await db.collection('users').doc(user.uid).set(userDocData);
      console.log('✅ New user document created');

      // Set app state for new user
      console.log('🔄 Setting app state: authenticated + onboarding');
      appStateManager.setAuthenticated(true);
      appStateManager.setOnboarding(true);
    } else {
      console.log('🔄 Updating existing user...');
      // Update last login time for existing user
      const updateData: any = {
        lastLoginAt: new Date()
      };

      // Update anonymization status if it changed
      if (userDoc.data()?.isAnonymizedUser !== isAnonymizedUser) {
        updateData.isAnonymizedUser = isAnonymizedUser;
        console.log('🔄 Updated user anonymization status:', isAnonymizedUser);
      }

      await db.collection('users').doc(user.uid).update(updateData);
      console.log('✅ User document updated');

      // Set authenticated state
      console.log('🔄 Setting app state: authenticated');
      appStateManager.setAuthenticated(true);
    }

    // Store the token
    console.log('🔐 Storing Firebase token...');
    const token = await user.getIdToken();
    await AsyncStorage.setItem('firebaseUserToken', token);
    console.log('✅ Firebase token stored successfully');

    console.log('🎉 Apple Sign-In: Complete success!');
    
    const result = {
      user,
      isNewUser,
      userData,
      isAnonymizedUser,
      authorizationCode: appleAuthResponse.authorizationCode ? 
        String(appleAuthResponse.authorizationCode) : undefined
    };
    
    console.log('📋 Final result summary:', {
      userId: result.user.uid,
      isNewUser: result.isNewUser,
      isAnonymizedUser: result.isAnonymizedUser,
      hasAuthCode: !!result.authorizationCode,
      hasEmail: !!result.userData.email
    });
    
    // Final graceful email handling message
    if (!result.userData.email) {
      console.log('✅ Apple Sign-In successful without email - user can add email in Settings > Email & Security');
    } else {
      console.log('✅ Apple Sign-In successful with email:', result.userData.email);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Apple Sign-In Error occurred!');
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    });
    
    // Enhanced error logging for specific error types
    if (error.code) {
      console.error('🚨 Firebase error code:', error.code);
      
      // Provide specific guidance for common errors
      switch (error.code) {
        case 'auth/internal-error':
          console.error('💡 Suggestion: Check Firebase configuration and credential creation');
          break;
        case 'auth/invalid-credential':
          console.error('💡 Suggestion: Verify nonce and identity token are correct');
          break;
        case 'auth/network-request-failed':
          console.error('💡 Suggestion: Check internet connection and Firebase endpoints');
          break;
        default:
          console.error('💡 Check Firebase console and Apple Sign-In configuration');
      }
    }
    
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