import { AppState, AppStateStatus } from 'react-native';
import { authCache } from './authCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseconfig';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseconfig';

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
      // Check for existing auth token
      const token = await AsyncStorage.getItem('firebaseUserToken');
      
      if (token) {
        // Verify token is still valid (not expired)
        const lastActivity = await AsyncStorage.getItem('lastActivityTimestamp');
        const now = Date.now();
        const lastActivityTime = lastActivity ? parseInt(lastActivity, 10) : 0;
        
        // Debug logs to diagnose timestamp issues
        console.log('AppStateManager: Token found, checking expiry');
        console.log('AppStateManager: Current time:', now);
        console.log('AppStateManager: Last activity time:', lastActivityTime);
        console.log('AppStateManager: Time difference (ms):', now - lastActivityTime);
        
        // Check if token is not too old (24 hours)
        const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - lastActivityTime < TOKEN_EXPIRY) {
          // Token is valid, set authenticated state
          console.log('AppStateManager: Valid auth token found, setting authenticated state');
          this._isAuthenticated = true;
          
          // Check if user needs onboarding (safely)
          try {
            const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
            this._isOnboarding = onboardingCompleted === 'false';
            console.log(`AppStateManager: Onboarding required: ${this._isOnboarding}`);
            
            // If Firebase auth has a current user, get a fresh token
            try {
              const currentUser = auth().currentUser;
              if (currentUser) {
                console.log('AppStateManager: Current user found, refreshing token');
                try {
                  // Get a fresh token and update storage
                  const freshToken = await currentUser.getIdToken(true);
                  await AsyncStorage.setItem('firebaseUserToken', freshToken);
                  console.log('AppStateManager: Successfully refreshed Firebase token');
                  
                  // Also update the timestamp to reset the expiry timer
                  await AsyncStorage.setItem('lastActivityTimestamp', now.toString());
                } catch (refreshError: any) {
                  console.warn('AppStateManager: Error refreshing token:', refreshError);
                  // Check if this is an auth error that requires re-authentication
                  if (refreshError.code === 'auth/requires-recent-login') {
                    console.warn('AppStateManager: Re-authentication required, logging out user');
                    // Clear token and set not authenticated if re-auth is required
                    await AsyncStorage.removeItem('firebaseUserToken');
                    await AsyncStorage.removeItem('lastActivityTimestamp');
                    this._isAuthenticated = false;
                    this._isOnboarding = false;
                  } else {
                    // For other errors, continue with existing token
                    console.log('AppStateManager: Using existing token despite refresh error');
                  }
                }
              } else {
                console.log('AppStateManager: No current user but token exists, attempting to restore session');
                // Try to restore Firebase session using the existing token
                try {
                  // Check if we can get a fresh Firebase session
                  await auth().signInWithCustomToken(token);
                  console.log('AppStateManager: Session restored successfully');
                } catch (sessionError) {
                  console.error('AppStateManager: Failed to restore session:', sessionError);
                  // If we can't restore the session, clear token and set not authenticated
                  await AsyncStorage.removeItem('firebaseUserToken');
                  await AsyncStorage.removeItem('lastActivityTimestamp');
                  this._isAuthenticated = false;
                  this._isOnboarding = false;
                }
              }
            } catch (tokenError) {
              console.warn('AppStateManager: Failed to refresh token:', tokenError);
              // Not critical, so continue with existing token
            }
          } catch (onboardingError) {
            console.warn('AppStateManager: Error checking onboarding state:', onboardingError);
            // Default to not requiring onboarding if error occurs
            this._isOnboarding = false;
          }
          
          // Update the last activity timestamp
          await AsyncStorage.setItem('lastActivityTimestamp', now.toString());
          console.log('AppStateManager: Updated activity timestamp');
        } else {
          // Token is expired, clear it
          console.log('AppStateManager: Auth token expired, clearing');
          await AsyncStorage.removeItem('firebaseUserToken');
          await AsyncStorage.removeItem('lastActivityTimestamp');
          this._isAuthenticated = false;
          this._isOnboarding = false;
        }
      } else {
        // No token found, user is not authenticated
        console.log('AppStateManager: No auth token found, user not authenticated');
        this._isAuthenticated = false;
        this._isOnboarding = false;
        
        // Check if Firebase still has an active session despite no token
        const currentUser = auth().currentUser;
        if (currentUser) {
          console.log('AppStateManager: Firebase session found but no token, restoring authentication state');
          try {
            const currentTime = Date.now();
            // Get a fresh token and update storage
            const freshToken = await currentUser.getIdToken(true);
            await AsyncStorage.setItem('firebaseUserToken', freshToken);
            await AsyncStorage.setItem('lastActivityTimestamp', currentTime.toString());
            this._isAuthenticated = true;
            
            // Check onboarding status
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const onboardingCompleted = userDoc.data().onboardingCompleted === true;
              await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
              this._isOnboarding = !onboardingCompleted;
            } else {
              this._isOnboarding = true;
            }
            
            console.log(`AppStateManager: Restored authentication state, onboarding=${this._isOnboarding}`);
          } catch (restoreError) {
            console.error('AppStateManager: Failed to restore authentication:', restoreError);
            // Force logout on restore error
            try {
              await auth().signOut();
            } catch (signOutError) {
              console.error('AppStateManager: Error signing out:', signOutError);
            }
            this._isAuthenticated = false;
            this._isOnboarding = false;
          }
        }
      }
    } catch (error) {
      console.error('AppStateManager: Error during initialization:', error);
      // Default to not authenticated on error
      this._isAuthenticated = false;
      this._isOnboarding = false;
    }

    console.log(`AppStateManager: Initialization finished. Authentication=${this._isAuthenticated}, Onboarding=${this._isOnboarding}`);
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