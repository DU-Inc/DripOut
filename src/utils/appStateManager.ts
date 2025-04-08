import { AppState, AppStateStatus } from 'react-native';
import { authCache } from './authCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';

class AppStateManager {
  private static instance: AppStateManager;
  private lastActiveTimestamp: number = Date.now();
  private readonly BACKGROUND_THRESHOLD = 5 * 60 * 60 * 1000; // 5 hours
  private subscription: any; // Store the subscription
  
  // New auth state tracking properties
  private _isAuthenticated: boolean = false;
  private _isOnboarding: boolean = false;
  private _isSignupSuccess: boolean = false;
  private _showOnboardingOptions: boolean = false; // New state for options sheet
  private _authListeners: Array<(isAuthenticated: boolean) => void> = [];
  private _onboardingListeners: Array<(isOnboarding: boolean) => void> = [];
  private _signupSuccessListeners: Array<(isSignupSuccess: boolean) => void> = [];
  private _optionsSheetListeners: Array<(showOptions: boolean) => void> = []; // Listeners for options sheet
  private _initializationStarted: boolean = false;
  
  private constructor() {
    this.setupAppStateListener();
  }

  static getInstance(): AppStateManager {
    if (!AppStateManager.instance) {
      AppStateManager.instance = new AppStateManager();
    }
    return AppStateManager.instance;
  }

  private setupAppStateListener(): void {
    // New way to add event listener, returns a subscription
    this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground
      const now = Date.now();
      const inactiveTime = now - this.lastActiveTimestamp;

      if (inactiveTime >= this.BACKGROUND_THRESHOLD) {
        // Been in background too long, invalidate cache
        authCache.invalidateCache();
      } else {
        // Update last activity
        authCache.updateLastActivity();
      }
    }
    
    if (nextAppState === 'background') {
      // App went to background
      this.lastActiveTimestamp = Date.now();
    }
  };

  cleanup(): void {
    // New way to remove event listener using the subscription
    this.subscription.remove();
    
    // Reset auth state on cleanup
    this._initializationStarted = false;
    this._isAuthenticated = false;
    this._isOnboarding = false;
    this._authListeners = [];
    this._onboardingListeners = [];
    this._signupSuccessListeners = [];
    console.log('AppStateManager: Cleanup called.');
  }

  // New methods for auth state management
  
  public async initialize(): Promise<void> {
    if (this._initializationStarted) {
      console.log('AppStateManager: Initialization already started, skipping.');
      return;
    }
    this._initializationStarted = true;
    console.log('AppStateManager: Starting initialization...');

    try {
      // First check if there's an active Firebase session
      const firebaseUser = auth().currentUser;
      
      if (firebaseUser) {
        // We have an active Firebase session - this is the source of truth
        console.log('AppStateManager: Active Firebase session found for user:', firebaseUser.uid);
        
        // Set authenticated state to true since we have an active Firebase user
        this._isAuthenticated = true;
        
        // Get fresh token and update storage for future quick checks
        try {
          const freshToken = await firebaseUser.getIdToken(true);
          const now = Date.now();
          
          await Promise.all([
            AsyncStorage.setItem('firebaseUserToken', freshToken),
            AsyncStorage.setItem('lastActivityTimestamp', now.toString())
          ]);
          
          console.log('AppStateManager: Firebase token refreshed and stored');
        } catch (tokenError) {
          console.warn('AppStateManager: Failed to refresh Firebase token:', tokenError);
          
          // If this is a critical auth error, handle logout
          if (tokenError instanceof Error && 
              tokenError.message.includes('auth/requires-recent-login')) {
            console.warn('AppStateManager: Session requires re-authentication, logging out');
            await this.forceLogout();
            return;
          }
        }
        
        // Check if user needs onboarding by checking Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            // User document exists, check if onboarding is completed
            const onboardingCompleted = userDoc.data().onboardingCompleted === true;
            
            // Update both AsyncStorage and app state
            await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
            this._isOnboarding = !onboardingCompleted;
            
            console.log(`AppStateManager: Onboarding status from Firestore: needs onboarding=${this._isOnboarding}`);
          } else {
            // User in Firebase but no Firestore doc - user needs onboarding
            console.log('AppStateManager: User exists in Firebase but no Firestore document, needs onboarding');
            await AsyncStorage.setItem('onboardingCompleted', 'false');
            this._isOnboarding = true;
          }
        } catch (firestoreError) {
          console.error('AppStateManager: Error fetching user doc from Firestore:', firestoreError);
          
          // Default to needing onboarding on error to be safe
          await AsyncStorage.setItem('onboardingCompleted', 'false');
          this._isOnboarding = true;
        }
      } else {
        // No active Firebase session - check if we have a token to restore session
        console.log('AppStateManager: No active Firebase session, checking for stored token');
        
        const token = await AsyncStorage.getItem('firebaseUserToken');
        if (token) {
          // We have a stored token, but Firebase session is not active
          // This could be due to app restart, token expiry, etc.
          console.log('AppStateManager: Found stored token, attempting to restore Firebase session');
          
          try {
            // Try to sign in anonymously with custom token to restore session
            // NOTE: This may not work with regular tokens, might need server-side custom token generation
            // Alternative: you may need to clear token and force user to log in again
            
            // For now, we'll just force logout to maintain consistency
            console.log('AppStateManager: Firebase session could not be restored from token, forcing logout');
            await this.forceLogout();
          } catch (restoreError) {
            console.error('AppStateManager: Error restoring Firebase session:', restoreError);
            await this.forceLogout();
          }
        } else {
          // No token and no Firebase session = definitely logged out
          console.log('AppStateManager: No token and no Firebase session, user is logged out');
          this._isAuthenticated = false;
          this._isOnboarding = false;
          
          // Clear any stale state just to be safe
          await this.clearAuthStorage();
        }
      }
    } catch (error) {
      console.error('AppStateManager: Unhandled error during initialization:', error);
      // Default to not authenticated on error
      this._isAuthenticated = false;
      this._isOnboarding = false;
      
      // Clear any potentially corrupted auth state
      await this.clearAuthStorage();
    }

    console.log(`AppStateManager: Initialization finished. Authentication=${this._isAuthenticated}, Onboarding=${this._isOnboarding}`);
  }
  
  // Helper method to clear all auth-related storage
  private async clearAuthStorage(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem('firebaseUserToken'),
      AsyncStorage.removeItem('lastActivityTimestamp'),
      AsyncStorage.removeItem('authCreateTimestamp'),
      AsyncStorage.removeItem('useBiometricAuth'),
      AsyncStorage.removeItem('onboardingCompleted')
    ]);
  }
  
  // Force logout helper that ensures both Firebase and local state are cleared
  private async forceLogout(): Promise<void> {
    try {
      // Sign out from Firebase first
      if (auth().currentUser) {
        await auth().signOut();
      }
    } catch (signOutError) {
      console.error('AppStateManager: Error signing out from Firebase:', signOutError);
    } finally {
      // Always clear local storage regardless of Firebase signout success
      await this.clearAuthStorage();
      
      // Reset app state
      this._isAuthenticated = false;
      this._isOnboarding = false;
      this._isSignupSuccess = false;
      this._showOnboardingOptions = false;
      
      console.log('AppStateManager: User has been force logged out');
    }
  }

  // Auth state getters
  public isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  public isOnboarding(): boolean {
    return this._isOnboarding;
  }

  public isGuest(): boolean {
    return !this._isAuthenticated;
  }

  public isSignupInProgress(): boolean {
    return this._isSignupSuccess;
  }
  
  // New getter for options sheet state
  public shouldShowOnboardingOptions(): boolean {
    return this._showOnboardingOptions;
  }

  // Auth state setters
  public setAuthenticated(isAuthenticated: boolean): void {
    if (this._isAuthenticated !== isAuthenticated) {
      // First verify the new state against Firebase auth
      const firebaseUser = auth().currentUser;
      
      // If trying to set authenticated=true but no Firebase user, this is an inconsistency
      if (isAuthenticated && !firebaseUser) {
        console.error('AppStateManager: Cannot set authenticated=true with no Firebase user!');
        
        // Instead of changing the state to true, we'll force a logout to fix inconsistency
        this.forceLogout()
          .then(() => console.log('AppStateManager: Forced logout due to auth inconsistency'))
          .catch(err => console.error('AppStateManager: Error during forced logout:', err));
        
        return;
      }
      
      // If trying to set authenticated=false but Firebase user exists, sign out from Firebase too
      if (!isAuthenticated && firebaseUser) {
        auth().signOut()
          .then(() => console.log('AppStateManager: Firebase signout successful'))
          .catch(err => console.error('AppStateManager: Firebase signout error:', err));
      }
      
      // Update the internal state
      this._isAuthenticated = isAuthenticated;
      console.log(`AppStateManager: User ${isAuthenticated ? 'authenticated' : 'logged out'}`);
      
      // Update lastActivityTimestamp when setting authenticated state to true
      if (isAuthenticated) {
        AsyncStorage.setItem('lastActivityTimestamp', Date.now().toString())
          .then(() => console.log('AppStateManager: Updated activity timestamp'))
          .catch(err => console.error('AppStateManager: Failed to update timestamp:', err));
      }
      
      // Notify listeners
      this._authListeners.forEach(listener => listener(this._isAuthenticated));
      
      // Emergency: If we're authenticating and no longer need onboarding,
      // explicitly force authentication state to be recognized
      if (isAuthenticated && !this._isOnboarding) {
        console.log('🚨 EMERGENCY: AppStateManager forcing authentication state to be fully recognized');
        // Give time for listeners to process changes
        setTimeout(() => {
          console.log('🚨 EMERGENCY RE-NOTIFYING AUTH LISTENERS');
          // Re-notify all listeners
          this._authListeners.forEach(listener => listener(true));
        }, 1000);
      }
    }
  }

  public setOnboarding(isOnboarding: boolean): void {
    if (this._isOnboarding !== isOnboarding) {
      this._isOnboarding = isOnboarding;
      console.log(`AppStateManager: Onboarding ${isOnboarding ? 'started' : 'completed'}`);
      
      // Store onboarding state in AsyncStorage
      AsyncStorage.setItem('onboardingCompleted', isOnboarding ? 'false' : 'true')
        .then(() => console.log('AppStateManager: Updated onboarding state in storage'))
        .catch(err => console.error('AppStateManager: Failed to update onboarding state:', err));
      
      // Notify listeners
      this._onboardingListeners.forEach(listener => listener(this._isOnboarding));
      
      // If onboarding is being turned off, also turn off options sheet
      if (!isOnboarding && this._showOnboardingOptions) {
        this.setShowOnboardingOptions(false);
      }
    }
  }
  
  // New setter for options sheet state
  public setShowOnboardingOptions(showOptions: boolean): void {
    if (this._showOnboardingOptions !== showOptions) {
      this._showOnboardingOptions = showOptions;
      console.log(`AppStateManager: Onboarding options sheet ${showOptions ? 'shown' : 'hidden'}`);
      
      // Notify listeners
      this._optionsSheetListeners.forEach(listener => listener(this._showOnboardingOptions));
    }
  }

  public setGuestMode(isGuest: boolean): void {
    // Invert the logic - setting guest mode to true means setting authenticated to false
    this.setAuthenticated(!isGuest);
  }

  public setSignupInProgress(isInProgress: boolean): void {
    if (this._isSignupSuccess !== isInProgress) {
      this._isSignupSuccess = isInProgress;
      console.log(`AppStateManager: Signup success flow ${isInProgress ? 'started' : 'completed'}`);
      
      // Notify listeners
      this._signupSuccessListeners.forEach(listener => listener(this._isSignupSuccess));
    }
  }

  // Subscription methods
  public subscribeToAuthState(listener: (isAuthenticated: boolean) => void): () => void {
    this._authListeners.push(listener);
    // Return an unsubscribe function
    return () => {
      this._authListeners = this._authListeners.filter(l => l !== listener);
    };
  }

  public subscribeToOnboardingState(listener: (isOnboarding: boolean) => void): () => void {
    this._onboardingListeners.push(listener);
    // Return an unsubscribe function
    return () => {
      this._onboardingListeners = this._onboardingListeners.filter(l => l !== listener);
    };
  }
  
  // New subscription method for options sheet
  public subscribeToOptionsSheetState(listener: (showOptions: boolean) => void): () => void {
    this._optionsSheetListeners.push(listener);
    // Return an unsubscribe function
    return () => {
      this._optionsSheetListeners = this._optionsSheetListeners.filter(l => l !== listener);
    };
  }

  public subscribeToGuestMode(listener: (isGuest: boolean) => void): () => void {
    // Wrap the listener to invert the authentication state
    const wrappedListener = (isAuthenticated: boolean) => {
      listener(!isAuthenticated);
    };
    
    // Store the reference so we can remove it later
    this._authListeners.push(wrappedListener);
    
    // Return an unsubscribe function
    return () => {
      this._authListeners = this._authListeners.filter(l => l !== wrappedListener);
    };
  }

  public subscribeToSignupProgress(listener: (isSignupSuccess: boolean) => void): () => void {
    this._signupSuccessListeners.push(listener);
    // Return an unsubscribe function
    return () => {
      this._signupSuccessListeners = this._signupSuccessListeners.filter(l => l !== listener);
    };
  }
}

export const appStateManager = AppStateManager.getInstance(); 