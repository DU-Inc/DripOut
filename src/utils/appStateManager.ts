import { AppState, AppStateStatus } from 'react-native';
import { authCache } from './authCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';
import { db } from '../Config/firebaseconfig';
import { getUserPreferences } from '../services/firestoreService';
import { AppState as RNAppState } from 'react-native';
import { initializeWelcomeCache } from '../services/welcomeProductCache';
import { cleanupShelfOnLogout } from '../services/shelfService';
import { sessionManager } from './sessionManager';

// Add these to the top of the file with other declarations
declare const clearInterval: (id: number) => void;
declare const setInterval: (callback: () => void, ms: number) => number;

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
  private _isGuestMode: boolean = false; // NEW: Explicit guest mode tracking
  private _authListeners: Array<(isAuthenticated: boolean) => void> = [];
  private _onboardingListeners: Array<(isOnboarding: boolean) => void> = [];
  private _signupSuccessListeners: Array<(isSignupSuccess: boolean) => void> = [];
  private _optionsSheetListeners: Array<(showOptions: boolean) => void> = []; // Listeners for options sheet
  private _initializationStarted: boolean = false;
  
  // Add these properties to the AppStateManager class
  private authStateListener: any = null;
  private backgroundValidationTimer: any = null;
  private appStateSubscription: any = null;
  private readonly VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private constructor() {
    this.setupAppStateListener();
    this.setupAuthStateListener();
    this.setupBackgroundValidation();
    this.setupAppActiveListener();
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
    
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background or was suspended
      this.lastActiveTimestamp = Date.now();
      
      // Store suspension time to detect new app launches vs. resuming from background
      AsyncStorage.setItem('lastSuspendTimestamp', Date.now().toString())
        .then(() => console.log('AppStateManager: Saved app suspension timestamp'))
        .catch(err => console.error('AppStateManager: Failed to save suspension timestamp:', err));
    }
  };

  cleanup(): void {
    console.log('AppStateManager: Performing full cleanup');
    
    // Remove the auth state listener
    if (this.authStateListener) {
      console.log('AppStateManager: Cleaning up auth state listener');
      this.authStateListener();
      this.authStateListener = null;
    }
    
    // Clear the background validation timer
    if (this.backgroundValidationTimer) {
      console.log('AppStateManager: Cleaning up background validation timer');
      clearInterval(this.backgroundValidationTimer);
      this.backgroundValidationTimer = null;
    }
    
    // Remove the app state subscription
    if (this.appStateSubscription) {
      console.log('AppStateManager: Cleaning up app state subscription');
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Remove the existing app state listener
    if (this.subscription) {
      console.log('AppStateManager: Cleaning up subscription');
      this.subscription.remove();
    }
    
    // Reset all state
    this._initializationStarted = false;
    this._isAuthenticated = false;
    this._isOnboarding = false;
    this._showOnboardingOptions = false;
    
    // Clear all listeners
    this._authListeners = [];
    this._onboardingListeners = [];
    this._signupSuccessListeners = [];
    this._optionsSheetListeners = [];
    
    console.log('AppStateManager: Cleanup completed successfully');
  }

  // New methods for auth state management
  
  // Add this function to validate an authentication token with Firebase
  private async validateAuthToken(): Promise<boolean> {
    console.log('AppStateManager: Validating auth token...');
    return await this.forceServerValidation();
  }

  // Add a function to clear all user data from AsyncStorage
  private async clearAllUserData(): Promise<void> {
    console.log('AppStateManager: Clearing all user data from AsyncStorage');
    
    try {
      // List of all keys related to user data
      const userDataKeys = [
        // Auth related
        'firebaseUserToken',
        'lastActivityTimestamp',
        'refreshToken',
        'userEmail',
        'userFirstName',
        'userId',
        
        // Onboarding related
        'onboardingCompleted',
        'onboardingSkipped',
        'onboardingStarted',
        'onboardingCompletedSteps',
        'onboardingFilledSteps',
        
        // Preferences
        'selectedStyles',
        'selectedBrands',
        'sizingData',
        
        // Any other user-specific data
        'userPreferences',
        'userNotifications',
        'userSettings'
      ];
      
      await Promise.all(userDataKeys.map(key => AsyncStorage.removeItem(key)));
      
      // Clean up user-specific caches (like shelf products)
      await cleanupShelfOnLogout();
      
      // Clear session data
      await sessionManager.clearSession();
      
      // Clear guest mode flag
      this._isGuestMode = false;
      
      console.log('AppStateManager: Successfully cleared all user data');
    } catch (error) {
      console.error('AppStateManager: Error clearing user data:', error);
    }
  }

  // Update the initialize method to include logic to navigate to incomplete steps
  public async initialize(): Promise<void> {
    if (this._initializationStarted) {
      console.log('AppStateManager: Initialization already started, skipping.');
      return;
    }
    this._initializationStarted = true;
    console.log('AppStateManager: Starting initialization...');
    
    // Initialize welcome cache early for background display
    console.log('AppStateManager: 🎨 Initializing welcome product cache...');
    await initializeWelcomeCache();

    try {
      // CRITICAL: On every app launch, clear the options sheet shown flag
      // This ensures the sheet is shown exactly once on each app launch for users who need onboarding
      await AsyncStorage.removeItem('optionsSheetLastShown');
      console.log('AppStateManager: Cleared options sheet shown flag for new app session');
      
      // CRITICAL: Clear guest mode on every app launch - guest mode should not persist
      this._isGuestMode = false;
      console.log('AppStateManager: Cleared guest mode flag for new app session');
      
      // CRITICAL INITIALIZATION STEP: ALWAYS validate with server first
      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        console.log(`AppStateManager: 🔐 Firebase reports user ${firebaseUser.uid} is logged in at initialization time`);
        
        // FORCE server validation - this will check with Firebase servers if the user still exists
        const isTokenValid = await this.forceServerValidation();
        
        if (!isTokenValid) {
          console.error('AppStateManager: ⚠️ User token is INVALID according to server! Forcing logout...');
          await this.forceLogout();
          return; // Exit initialization early
        }
        
        // Token is valid according to server, proceed with normal initialization
        console.log('AppStateManager: ✅ User validated with Firebase servers');
        this._isAuthenticated = true;
        
        // Force check their onboarding status directly from Firestore
        try {
          const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
          const onboardingCompleted = userDoc.exists && userDoc.data()?.onboardingCompleted === true;
          console.log(`AppStateManager: 🔍 Direct Firestore check - User onboarding completed: ${onboardingCompleted}`);
          
          // Update onboarding state based on direct check
          this._isOnboarding = !onboardingCompleted;
          await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
          
          // NEW: Check for incomplete onboarding steps
          if (!onboardingCompleted && userDoc.exists) {
            // Get completed steps from Firestore
            const onboardingSteps = userDoc.data()?.onboardingSteps || {};
            const completedSteps = onboardingSteps.completedSteps || [];
            
            // Save to AsyncStorage for step tracker
            await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(completedSteps));
            
            // Check if we need to navigate to a specific incomplete step
            const requiredSteps = [1, 2, 3, 4]; // All onboarding steps
            const missingSteps = requiredSteps.filter(step => !completedSteps.includes(step));
            
            if (missingSteps.length > 0) {
              // Find the lowest incomplete step
              const lowestIncompleteStep = Math.min(...missingSteps);
              console.log(`AppStateManager: Found incomplete step: ${lowestIncompleteStep}`);
              
              // Save this for navigation in the UI layer
              await AsyncStorage.setItem('incompleteOnboardingStep', lowestIncompleteStep.toString());
            }
          }
          
          // Check if options sheet has been shown
          const optionsSheetLastShown = await AsyncStorage.getItem('optionsSheetLastShown');
          if (!optionsSheetLastShown && !onboardingCompleted) {
            console.log('AppStateManager: 📃 Setting options sheet to show for user needing onboarding');
            this._showOnboardingOptions = true;
          }
        } catch (error) {
          console.error('AppStateManager: Error checking Firestore for onboarding status:', error);
        }
      } else {
        console.log('AppStateManager: Firebase reports no logged in user at initialization time');
        this._isAuthenticated = false;
      }
    
      // Continue with normal initialization...

      // Check for existing auth token
      const token = await AsyncStorage.getItem('firebaseUserToken');
      
      // Check if this is a new app launch vs. a resume from background
      const lastSuspendTime = await AsyncStorage.getItem('lastSuspendTimestamp');
      const now = Date.now();
      const isNewLaunch = !lastSuspendTime || (now - parseInt(lastSuspendTime, 10)) > 60 * 60 * 1000; // More than an hour
      
      // If it's a new launch, clear the options sheet shown flag to ensure it shows on each new app launch
      if (isNewLaunch) {
        console.log('AppStateManager: Detected new app launch, clearing options sheet shown state');
        await AsyncStorage.removeItem('optionsSheetLastShown');
      }
      
      // Now check if the options sheet has been shown in this specific launch/session
      const optionsSheetLastShown = await AsyncStorage.getItem('optionsSheetLastShown');
      const optionsSheetShownInCurrentSession = !!optionsSheetLastShown;
      
      if (token) {
        // Verify token is still valid (not expired)
        const lastActivity = await AsyncStorage.getItem('lastActivityTimestamp');
        const lastActivityTime = lastActivity ? parseInt(lastActivity, 10) : 0;
        
        // Debug logs to diagnose timestamp issues
        console.log('AppStateManager: Token found, checking expiry');
        console.log('AppStateManager: Current time:', now);
        console.log('AppStateManager: Last activity time:', lastActivityTime);
        console.log('AppStateManager: Time difference (ms):', now - lastActivityTime);
        
        // Check if token is not too old (24 hours)
        const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - lastActivityTime < TOKEN_EXPIRY) {
          // Token is valid age-wise, but let's also validate it with Firebase
          console.log('AppStateManager: Token age is valid, now validating with Firebase...');
          
          const isTokenValid = await this.validateAuthToken();
          
          if (!isTokenValid) {
            console.error('AppStateManager: ⚠️ User token is invalid despite valid age! Forcing logout...');
            
            // Clear all user data
            await this.clearAllUserData();
            
            // Force sign out from Firebase
            try {
              await auth().signOut();
            } catch (signOutError) {
              console.error('AppStateManager: Error signing out:', signOutError);
            }
            
            // Set state to unauthenticated
            this._isAuthenticated = false;
            this._isOnboarding = false;
            this._showOnboardingOptions = false;
            
            // Notify listeners of auth state change
            this._authListeners.forEach(listener => listener(this._isAuthenticated));
            
            console.log('AppStateManager: Forced logout completed due to invalid token');
            return; // Exit initialization early
          }
          
          // Token is valid, set authenticated state
          console.log('AppStateManager: Valid auth token confirmed with Firebase, setting authenticated state');
          this._isAuthenticated = true;
          
          // Check if user needs onboarding (safely)
          try {
            const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
            this._isOnboarding = onboardingCompleted === 'false';
            console.log(`AppStateManager: Onboarding required: ${this._isOnboarding}`);
            
            // For a user who needs onboarding, always show the options sheet on new app launch
            // But don't show it again within the same session if they've dismissed it
            if (this._isOnboarding) {
              if (!optionsSheetShownInCurrentSession) {
                this._showOnboardingOptions = true;
                console.log('AppStateManager: Setting onboarding options sheet to be shown');
              } else {
                console.log('AppStateManager: Options sheet already shown this session, not showing again');
                this._showOnboardingOptions = false;
              }
            } else {
              this._showOnboardingOptions = false;
            }
            
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
                    this._showOnboardingOptions = false;
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
                  this._showOnboardingOptions = false;
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
            this._showOnboardingOptions = false;
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
          this._showOnboardingOptions = false;
        }
      } else {
        // No token found, user is not authenticated
        console.log('AppStateManager: No auth token found, user not authenticated');
        this._isAuthenticated = false;
        this._isOnboarding = false;
        this._showOnboardingOptions = false;
        
        // Check if Firebase still has an active session despite no token
        const currentUser = auth().currentUser;
        if (currentUser) {
          console.log('AppStateManager: Firebase session found but no token, validating session...');
          
          // Validate the token with Firebase servers
          const isTokenValid = await this.validateAuthToken();
          
          if (!isTokenValid) {
            console.error('AppStateManager: Firebase session invalid, forcing logout');
            
            // Clear all user data
            await this.clearAllUserData();
            
            // Force sign out
            try {
              await auth().signOut();
            } catch (signOutError) {
              console.error('AppStateManager: Error signing out:', signOutError);
            }
            
            this._isAuthenticated = false;
            return; // Exit initialization
          }
          
          console.log('AppStateManager: Firebase session valid, restoring authentication state');
          try {
            const currentTime = Date.now();
            // Get a fresh token and update storage
            const freshToken = await currentUser.getIdToken(true);
            await AsyncStorage.setItem('firebaseUserToken', freshToken);
            await AsyncStorage.setItem('lastActivityTimestamp', currentTime.toString());
            this._isAuthenticated = true;
            
            // Check onboarding status
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
              const data = userDoc.data();
              const onboardingCompleted = data?.onboardingCompleted === true;
              const onboardingSkipped = data?.onboardingSkipped === true;
              await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
              this._isOnboarding = !onboardingCompleted;
              
              // Set showOnboardingOptions to true if user needs onboarding
              // This ensures the options sheet is shown before onboarding
              if (this._isOnboarding && !optionsSheetShownInCurrentSession) {
                this._showOnboardingOptions = true;
                console.log('AppStateManager: Setting onboarding options sheet to be shown');
              } else if (this._isOnboarding && optionsSheetShownInCurrentSession) {
                console.log('AppStateManager: Options sheet already shown this session, not showing again');
                this._showOnboardingOptions = false;
              }
            } else {
              this._isOnboarding = true;
              
              // Only show options sheet if it hasn't been shown already
              this._showOnboardingOptions = !optionsSheetShownInCurrentSession;
              if (this._showOnboardingOptions) {
                console.log('AppStateManager: Setting onboarding options sheet to be shown');
              } else {
                console.log('AppStateManager: Options sheet already shown this session, not showing again');
              }
            }
            
            console.log(`AppStateManager: Restored authentication state, onboarding=${this._isOnboarding}, showOptionsSheet=${this._showOnboardingOptions}`);
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
            this._showOnboardingOptions = false;
          }
        }
      }
    } catch (error) {
      console.error('AppStateManager: Error during initialization:', error);
      // Force logout on any initialization error to be safe
      await this.forceLogout();
    }

    // Load user preferences from Firestore to AsyncStorage
    if (this._isAuthenticated) {
      try {
        await this.loadUserPreferences();
      } catch (preferenceError) {
        console.error('AppStateManager: Error loading preferences during initialization:', preferenceError);
      }
    }

    console.log(`AppStateManager: Initialization finished. Authentication=${this._isAuthenticated}, Onboarding=${this._isOnboarding}, ShowOptions=${this._showOnboardingOptions}`);
  }

  // Load user preferences from Firestore and save to AsyncStorage
  public async loadUserPreferences(): Promise<void> {
    console.log('AppStateManager: Loading user preferences from Firestore');
    
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('AppStateManager: No user logged in, skipping preference loading');
        return;
      }
      
      // 1. Get the user document from Firestore to check onboarding status
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      
      if (!userDoc.exists) {
        console.log('AppStateManager: No user document found');
        return;
      }
      
      // Check onboarding status from the user document
      const userData = userDoc.data();
      const onboardingCompleted = userData.onboardingCompleted === true;
      const onboardingSkipped = userData.onboardingSkipped === true;
      const onboardingSteps = userData.onboardingSteps || {};
      
      console.log(`AppStateManager: Onboarding status - completed: ${onboardingCompleted}, skipped: ${onboardingSkipped}`);
      
      // Save onboarding status to AsyncStorage
      await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
      await AsyncStorage.setItem('onboardingSkipped', onboardingSkipped ? 'true' : 'false');
      
      // If there are recorded steps, save them to AsyncStorage
      if (onboardingSteps.completedSteps && Array.isArray(onboardingSteps.completedSteps)) {
        await AsyncStorage.setItem('onboardingCompletedSteps', JSON.stringify(onboardingSteps.completedSteps));
        console.log('AppStateManager: Completed steps saved to AsyncStorage');
      }
      
      // 2. Get user preferences from the user_preferences collection
      const preferences = await getUserPreferences(currentUser.uid);
      
      if (!preferences) {
        console.log('AppStateManager: No preferences found in user_preferences collection');
        return;
      }
      
      // 3. Map the preferences to the expected AsyncStorage format
      
      // Save styles to AsyncStorage if they exist
      if (preferences.preferredStyles && Array.isArray(preferences.preferredStyles)) {
        await AsyncStorage.setItem('selectedStyles', JSON.stringify(preferences.preferredStyles));
        console.log('AppStateManager: Styles saved to AsyncStorage');
      }
      
      // Save brands to AsyncStorage if they exist
      if (preferences.preferredBrands && Array.isArray(preferences.preferredBrands)) {
        await AsyncStorage.setItem('selectedBrands', JSON.stringify(preferences.preferredBrands));
        console.log('AppStateManager: Brands saved to AsyncStorage');
      }
      
      // Save sizing data to AsyncStorage if it exists
      const sizingData = {
        topSize: preferences.topsSize || '',
        bottomSize: preferences.bottomsSize || '',
        shoeSize: preferences.shoeSize || ''
      };
      
      await AsyncStorage.setItem('sizingData', JSON.stringify(sizingData));
      console.log('AppStateManager: Sizing data saved to AsyncStorage');
      
      console.log('AppStateManager: All preferences loaded from Firestore and saved to AsyncStorage');
    } catch (error) {
      console.error('AppStateManager: Error loading preferences:', error);
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
    return this._isGuestMode;
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
    // Added logging to debug authentication state changes
    console.log(`AppStateManager: Setting authenticated state to ${isAuthenticated} (was ${this._isAuthenticated})`);
    
    if (this._isAuthenticated !== isAuthenticated) {
      this._isAuthenticated = isAuthenticated;
      console.log(`AppStateManager: User ${isAuthenticated ? 'authenticated' : 'logged out'}`);
      
      // Update lastActivityTimestamp when setting authenticated state to true
      if (isAuthenticated) {
        // Clear guest mode when user becomes authenticated
        this._isGuestMode = false;
        
        AsyncStorage.setItem('lastActivityTimestamp', Date.now().toString())
          .then(() => console.log('AppStateManager: Updated activity timestamp'))
          .catch(err => console.error('AppStateManager: Failed to update timestamp:', err));
          
        // If user is authenticated, ALWAYS force check onboarding status
        this.checkOnboardingStatus();
        
        // If the user is authenticated, load their preferences from Firestore
        this.loadUserPreferences()
          .then(() => console.log('AppStateManager: Loaded user preferences after authentication'))
          .catch(err => console.error('AppStateManager: Failed to load preferences after authentication:', err));
      } else {
        // If the user logs out, clear ALL user data from AsyncStorage
        this.clearAllUserData()
          .then(() => console.log('AppStateManager: Cleared all user data on logout'))
          .catch(err => console.error('AppStateManager: Failed to clear user data on logout:', err));
      }
      
      // Notify listeners
      this._authListeners.forEach(listener => listener(this._isAuthenticated));
    }
  }

  // NEW: Method to explicitly set guest mode (only called when user chooses "Continue as Guest")
  public setExplicitGuestMode(isGuest: boolean): void {
    console.log(`AppStateManager: Setting explicit guest mode to ${isGuest}`);
    
    if (this._isGuestMode !== isGuest) {
      this._isGuestMode = isGuest;
      
      if (isGuest) {
        // When entering guest mode, ensure user is not authenticated
        this._isAuthenticated = false;
        console.log('AppStateManager: User entered explicit guest mode');
      } else {
        // When exiting guest mode, clear the flag
        console.log('AppStateManager: User exited guest mode');
      }
      
      // Notify auth listeners (guest mode changes affect auth state)
      this._authListeners.forEach(listener => listener(this._isAuthenticated));
    }
  }

  // New method to check onboarding status and set state appropriately
  private async checkOnboardingStatus(): Promise<void> {
    try {
      console.log('AppStateManager: Checking onboarding status for authenticated user');
      const currentUser = auth().currentUser;
      
      if (!currentUser) {
        console.warn('AppStateManager: No current user found when checking onboarding status');
        return;
      }
      
      // Force check from Firestore
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      let onboardingCompleted = false;
      let onboardingStarted = false;
      let onboardingSkipped = false;
      
      if (userDoc.exists) {
        const data = userDoc.data();
        onboardingCompleted = data?.onboardingCompleted === true;
        onboardingSkipped = data?.onboardingSkipped === true;
        onboardingStarted = data?.onboardingStarted === true;
        console.log('AppStateManager: Got onboarding status from Firestore:', 
          'completed:', onboardingCompleted, 
          'started:', onboardingStarted, 
          'skipped:', onboardingSkipped
        );
      } else {
        console.log('AppStateManager: User doc not found in Firestore, setting onboarding to true');
      }
      
      // Update AsyncStorage with the current onboarding status
      await AsyncStorage.setItem('onboardingCompleted', onboardingCompleted ? 'true' : 'false');
      
      // Update onboarding state
      const needsOnboarding = !onboardingCompleted;
      this._isOnboarding = needsOnboarding;
      
      // Notify onboarding listeners
      this._onboardingListeners.forEach(listener => listener(this._isOnboarding));
      
      // Check if we should show options sheet
      const optionsSheetLastShown = await AsyncStorage.getItem('optionsSheetLastShown');
      
      if (needsOnboarding && !optionsSheetLastShown) {
        console.log('AppStateManager: Setting options sheet to show for user needing onboarding');
        this._showOnboardingOptions = true;
        
        // Notify options sheet listeners
        this._optionsSheetListeners.forEach(listener => listener(this._showOnboardingOptions));
      }
      
    } catch (error) {
      console.error('AppStateManager: Error checking onboarding status:', error);
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
      
      // If turning off the options sheet, store a flag in AsyncStorage to indicate
      // that it's been shown for this session
      if (!showOptions) {
        const currentTime = new Date().toISOString();
        AsyncStorage.setItem('optionsSheetLastShown', currentTime)
          .then(() => console.log('AppStateManager: Saved options sheet shown timestamp'))
          .catch(err => console.error('AppStateManager: Failed to save options sheet timestamp:', err));
      }
      
      // Notify listeners
      this._optionsSheetListeners.forEach(listener => listener(this._showOnboardingOptions));
    }
  }

  public setGuestMode(isGuest: boolean): void {
    // Use the new explicit guest mode method
    this.setExplicitGuestMode(isGuest);
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

  // Add a public method to validate tokens
  public async validateCurrentUser(): Promise<boolean> {
    console.log('AppStateManager: Manually validating current user...');
    
    try {
      // First check if we have a current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('AppStateManager: No current user to validate');
        this.setAuthenticated(false);
        return false;
      }
      
      // Then validate the token
      const isValid = await this.validateAuthToken();
      
      if (!isValid) {
        console.log('AppStateManager: Manual validation failed, forcing logout');
        // Force logout
        await this.clearAllUserData();
        await auth().signOut();
        this.setAuthenticated(false);
        return false;
      }
      
      // Everything is valid
      console.log('AppStateManager: Manual validation successful');
      this.setAuthenticated(true);
      return true;
    } catch (error) {
      console.error('AppStateManager: Error during manual validation:', error);
      // Don't force logout on error, just return false
      return false;
    }
  }

  // Add this method to set up the auth state listener
  private setupAuthStateListener(): void {
    console.log('AppStateManager: Setting up auth state listener');
    
    try {
      // Remove any existing listener
      if (this.authStateListener) {
        this.authStateListener();
        this.authStateListener = null;
      }
      
      // Set up a new listener
      this.authStateListener = auth().onAuthStateChanged(async (user) => {
        console.log(`AppStateManager: 🔥 Firebase auth state changed: user=${user ? user.uid : 'null'}`);
        
        if (user) {
          // User is signed in - IMMEDIATELY validate with server
          const isValid = await this.forceServerValidation();
          
          if (!isValid) {
            console.error('AppStateManager: ⚠️ SERVER VALIDATION FAILED for signed-in user! Forcing logout...');
            await this.forceLogout();
            return;
          }
          
          // User is valid according to server
          this._isAuthenticated = true;
          this._authListeners.forEach(listener => listener(true));
        } else {
          // User is signed out
          console.log('AppStateManager: User signed out');
          this._isAuthenticated = false;
          this._authListeners.forEach(listener => listener(false));
          
          // Clear any user data
          this.clearAllUserData().catch(err => {
            console.error('AppStateManager: Error clearing user data after logout:', err);
          });
        }
      });
      
      console.log('AppStateManager: Auth state listener setup complete');
    } catch (error) {
      console.error('AppStateManager: Error setting up auth state listener:', error);
    }
  }

  // Add this method to set up periodic background validation
  private setupBackgroundValidation(): void {
    console.log('AppStateManager: Setting up background validation');
    
    // Clear any existing timer
    if (this.backgroundValidationTimer) {
      clearInterval(this.backgroundValidationTimer);
      this.backgroundValidationTimer = null;
    }
    
    // Set up a new timer
    this.backgroundValidationTimer = setInterval(async () => {
      console.log('AppStateManager: Running background validation check');
      
      if (this._isAuthenticated) {
        const isValid = await this.forceServerValidation();
        
        if (!isValid) {
          console.error('AppStateManager: ⚠️ Background validation failed! Forcing logout...');
          await this.forceLogout();
        } else {
          console.log('AppStateManager: Background validation successful');
        }
      }
    }, this.VALIDATION_INTERVAL);
    
    console.log('AppStateManager: Background validation setup complete');
  }

  // Add this method to set up app state listener for resume validation
  private setupAppActiveListener(): void {
    console.log('AppStateManager: Setting up app state listener');
    
    // Remove any existing subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Set up a new subscription
    this.appStateSubscription = RNAppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('AppStateManager: App came to foreground, validating authentication...');
        
        if (this._isAuthenticated) {
          const isValid = await this.forceServerValidation();
          
          if (!isValid) {
            console.error('AppStateManager: ⚠️ Resume validation failed! Forcing logout...');
            await this.forceLogout();
          } else {
            console.log('AppStateManager: Resume validation successful');
          }
        }
        
        // Continue with normal app state handling
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
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background or was suspended
        this.lastActiveTimestamp = Date.now();
        
        // Store suspension time to detect new app launches vs. resuming from background
        AsyncStorage.setItem('lastSuspendTimestamp', Date.now().toString())
          .then(() => console.log('AppStateManager: Saved app suspension timestamp'))
          .catch(err => console.error('AppStateManager: Failed to save suspension timestamp:', err));
      }
    });
    
    console.log('AppStateManager: App state listener setup complete');
  }

  // Add this method for forcing server validation
  public async forceServerValidation(): Promise<boolean> {
    console.log('AppStateManager: 🔒 FORCING server validation...');
    
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('AppStateManager: No current user for server validation');
        return false;
      }
      
      // Force a token refresh to validate with server
      // This will ONLY succeed if the user account still exists on the server
      try {
        // Intentionally disable caching for this request
        const forceRefresh = true;
        await currentUser.getIdToken(forceRefresh);
        
        // If we got here, the server confirmed the token is valid
        console.log('AppStateManager: ✅ SERVER CONFIRMS user is valid');
        return true;
      } catch (tokenError: any) {
        console.error(`AppStateManager: ❌ SERVER REJECTED token: ${tokenError.code || 'unknown error'}`);
        
        // These codes specifically mean the user is invalid on the server
        if (
          tokenError.code === 'auth/user-token-expired' ||
          tokenError.code === 'auth/user-not-found' ||
          tokenError.code === 'auth/user-disabled' ||
          (tokenError.message && (
            tokenError.message.includes('user not found') ||
            tokenError.message.includes('user disabled') ||
            tokenError.message.includes('token expired')
          ))
        ) {
          return false;
        }
        
        // For network errors, we return false to be safe
        if (tokenError.code === 'auth/network-request-failed') {
          console.warn('AppStateManager: Network error during validation, treating as invalid for safety');
          return false;
        }
        
        // For other unknown errors, log but assume valid
        console.warn('AppStateManager: Unknown error during validation:', tokenError);
        return false; // Changed to false to be more secure - any error means invalid
      }
    } catch (error) {
      console.error('AppStateManager: Error during server validation:', error);
      return false; // Always treat errors as invalid tokens for security
    }
  }

  // Fix the forceLogout method to use proper Firebase methods
  public async forceLogout(): Promise<void> {
    console.log('AppStateManager: 🚨 FORCING LOGOUT...');
    
    try {
      // Clear all user data from AsyncStorage first
      await this.clearAllUserData();
      
      // Try to forcibly invalidate the token
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          // Force a token refresh to invalidate the current token
          await currentUser.getIdToken(true);
        }
      } catch (refreshError) {
        console.error('AppStateManager: Error refreshing token:', refreshError);
        // Continue with logout even if refresh fails
      }
      
      // Set state to unauthenticated BEFORE the signOut call
      // This ensures listeners are notified even if signOut fails
      this._isAuthenticated = false;
      this._isOnboarding = false;
      this._showOnboardingOptions = false;
      this._isGuestMode = false; // Ensure guest mode is off
      
      // Clear all caches
      try {
        authCache.invalidateCache();
      } catch (cacheError) {
        console.error('AppStateManager: Error clearing auth cache:', cacheError);
      }
      
      // Notify listeners of auth state change ASAP
      this._authListeners.forEach(listener => listener(false));
      
      // Force sign out from Firebase
      try {
        await auth().signOut();
        console.log('AppStateManager: Firebase sign out successful');
      } catch (signOutError) {
        console.error('AppStateManager: Error signing out from Firebase:', signOutError);
        
        // Try additional measures to force logout
        try {
          const currentUser = auth().currentUser;
          // Use Firebase's revokeToken method if available
          if (currentUser && typeof currentUser.delete === 'function') {
            // This is an extreme measure - attempt to delete the user's session
            // This won't delete the user account, just force revoke the current session
            console.log('AppStateManager: Attempting to force session termination');
            await currentUser.reload();
          }
        } catch (sessionError) {
          console.error('AppStateManager: Error terminating session:', sessionError);
        }
      }
      
      // Set auth state again to be absolutely sure
      this._isAuthenticated = false;
      this._isGuestMode = false; // Ensure guest mode is off
      
      console.log('AppStateManager: Forced logout completed successfully');
    } catch (error) {
      console.error('AppStateManager: Error during forced logout:', error);
      
      // Even if error occurs, still set authenticated to false
      this._isAuthenticated = false;
      this._authListeners.forEach(listener => listener(false));
    }
  }
}

// Export the singleton instance
export const appStateManager = AppStateManager.getInstance();

// Check if user needs onboarding - use the instance's methods
export const checkNeedsOnboarding = async (): Promise<boolean> => {
  try {
    // Check if the user is authenticated
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log("appStateManager: No user logged in, no onboarding needed");
      return false;
    }
    
    // Check if onboarding is completed in user document
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    
    if (!userDoc.exists) {
      console.log("appStateManager: User document doesn't exist, onboarding needed");
      return true;
    }
    
    const data = userDoc.data();
    const onboardingCompleted = data.onboardingCompleted === true;
    const onboardingSkipped = data.onboardingSkipped === true;
    const onboardingStarted = data.onboardingStarted === true;
    
    // Log all onboarding states for debugging
    console.log(`appStateManager: Onboarding states - completed:${onboardingCompleted}, started:${onboardingStarted}, skipped:${onboardingSkipped}`);
    
    // A user needs onboarding if:
    // 1. They haven't completed it yet (onboardingCompleted is false)
    // 2. AND EITHER:
    //   a. They've never started it (onboardingStarted is false)
    //   b. OR they've skipped it before (onboardingSkipped is true)
    return !onboardingCompleted;
  } catch (error) {
    console.error("appStateManager: Error checking onboarding status:", error);
    return false; // Default to not needing onboarding on error
  }
};

// Mark onboarding as started
export const markOnboardingStarted = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error("appStateManager: No user logged in, can't mark onboarding started");
      return;
    }
    
    // Update user document to mark onboarding as started
    await db.collection('users').doc(currentUser.uid).update({
      onboardingStarted: true,
      onboardingStartedAt: new Date(),
    });
    
    console.log("appStateManager: Onboarding marked as started");
    
  } catch (error) {
    console.error("appStateManager: Error marking onboarding as started:", error);
  }
};

// Mark onboarding as completed
export const markOnboardingCompleted = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error("appStateManager: No user logged in, can't mark onboarding completed");
      return;
    }
    
    // Get completed steps from AsyncStorage
    const completedStepsStr = await AsyncStorage.getItem('onboardingCompletedSteps');
    const skippedStepsStr = await AsyncStorage.getItem('onboardingSkippedSteps');
    
    let completedSteps: number[] = [];
    let skippedSteps: number[] = [];
    
    if (completedStepsStr) {
      try {
        completedSteps = JSON.parse(completedStepsStr);
      } catch (e) {
        console.error("appStateManager: Error parsing completed steps:", e);
      }
    }
    
    if (skippedStepsStr) {
      try {
        skippedSteps = JSON.parse(skippedStepsStr);
      } catch (e) {
        console.error("appStateManager: Error parsing skipped steps:", e);
      }
    }
    
    // Check what data is actually available
    const stylesData = await AsyncStorage.getItem('selectedStyles');
    const brandsData = await AsyncStorage.getItem('selectedBrands');
    const sizingData = await AsyncStorage.getItem('sizingData');
    
    const styles = stylesData ? JSON.parse(stylesData) : [];
    const brands = brandsData ? JSON.parse(brandsData) : [];
    const sizing = sizingData ? JSON.parse(sizingData) : {};
    
    // Check for required data
    const hasStyles = Array.isArray(styles) && styles.length > 0;
    const hasBrands = Array.isArray(brands) && brands.length > 0;
    
    // For sizing, require ALL THREE sizing fields to be filled
    const hasTopSize = !!(sizing && sizing.topSize);
    const hasBottomSize = !!(sizing && sizing.bottomSize);
    const hasShoeSize = !!(sizing && sizing.shoeSize);
    const hasSizing = hasTopSize && hasBottomSize && hasShoeSize;
    
    // Check if ALL required data is present for full completion
    const hasAllRequiredData = hasStyles && hasBrands && hasSizing;
    
    console.log("markOnboardingCompleted: Checking completion requirements:");
    console.log(`- Styles: ${hasStyles ? 'Complete' : 'Incomplete'}`);
    console.log(`- Brands: ${hasBrands ? 'Complete' : 'Incomplete'}`);
    console.log(`- Sizing: ${hasSizing ? 'Complete' : 'Incomplete'} (Top: ${hasTopSize}, Bottom: ${hasBottomSize}, Shoes: ${hasShoeSize})`);
    console.log(`- Overall status: ${hasAllRequiredData ? 'COMPLETE' : 'INCOMPLETE'}`);
    
    // Determine which steps were actually filled vs skipped
    const filledSteps: number[] = [];
    if (hasStyles) filledSteps.push(1);
    if (hasBrands) filledSteps.push(2);
    // For sizing step, consider it filled if at least one size is provided
    if (hasTopSize || hasBottomSize || hasShoeSize) filledSteps.push(3);
    filledSteps.push(4); // Review is always considered completed
    
    // Make sure completed steps and filled steps are in sync
    // But for step 3, only include it in completedSteps if ALL sizing fields are complete
    let finalCompletedSteps = [...completedSteps];
    if (hasSizing) {
      if (!finalCompletedSteps.includes(3)) finalCompletedSteps.push(3);
    } else {
      finalCompletedSteps = finalCompletedSteps.filter(step => step !== 3);
    }
    // Always include the other filled steps
    if (hasStyles && !finalCompletedSteps.includes(1)) finalCompletedSteps.push(1);
    if (hasBrands && !finalCompletedSteps.includes(2)) finalCompletedSteps.push(2);
    if (!finalCompletedSteps.includes(4)) finalCompletedSteps.push(4);
    
    // Get the current onboarding steps status to preserve any other step data
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    let existingSteps = {};
    
    if (userDoc.exists && userDoc.data()?.onboardingSteps) {
      existingSteps = userDoc.data()?.onboardingSteps;
    }
    
    // Update user document with all onboarding fields
    await db.collection('users').doc(currentUser.uid).update({
      onboardingStarted: true,
      // Only mark as completed if ALL required data is present
      onboardingCompleted: hasAllRequiredData,
      onboardingCompletedAt: new Date(),
      onboardingSkipped: skippedSteps.length > 0, // If any steps were skipped, mark as partially skipped
      onboardingPartiallyCompleted: !hasAllRequiredData, // Mark as partially completed if not all data is present
      onboardingSteps: {
        ...existingSteps,
        completedSteps: finalCompletedSteps,
        skippedSteps: skippedSteps,
        completedAt: new Date(),
        wasCompleted: hasAllRequiredData,
        // Add validation data to confirm what was filled
        validationData: {
          hadStyles: hasStyles,
          hadBrands: hasBrands,
          hadSizing: hasSizing,
          hasAllSizing: hasSizing,
          hasTopSize: hasTopSize,
          hasBottomSize: hasBottomSize, 
          hasShoeSize: hasShoeSize,
          stylesCount: styles.length,
          brandsCount: brands.length,
          verifiedAt: new Date()
        }
      }
    });
    
    console.log(`appStateManager: Onboarding marked as ${hasAllRequiredData ? 'fully completed' : 'partially completed'} with validation`);
    
    // Update AsyncStorage to reflect the completed state
    await AsyncStorage.setItem('onboardingCompleted', hasAllRequiredData ? 'true' : 'false');
    await AsyncStorage.setItem('onboardingPartiallyCompleted', !hasAllRequiredData ? 'true' : 'false');
    await AsyncStorage.setItem('onboardingSkipped', skippedSteps.length > 0 ? 'true' : 'false');
    
    // Update local state using the instance
    appStateManager.setOnboarding(!hasAllRequiredData); // Only turn off onboarding flag if fully completed
    
  } catch (error) {
    console.error("appStateManager: Error marking onboarding as completed:", error);
  }
};

// Mark onboarding as skipped
export const markOnboardingSkipped = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error("appStateManager: No user logged in, can't mark onboarding skipped");
      return;
    }
    
    // Get the current onboarding steps status to preserve any completed steps
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    let existingSteps = { viewedSteps: [], completedSteps: [] };
    
    if (userDoc.exists && userDoc.data()?.onboardingSteps) {
      existingSteps = userDoc.data()?.onboardingSteps;
    }
    
    // Update user document with all onboarding fields
    await db.collection('users').doc(currentUser.uid).update({
      onboardingStarted: true,
      onboardingSkipped: true,
      onboardingSkippedAt: new Date(),
      onboardingCompleted: false, // Keep as false since it wasn't actually completed
      onboardingSteps: {
        ...existingSteps,
        skippedAt: new Date(),
        // Mark that it was skipped
        wasSkipped: true
      }
    });
    
    console.log("appStateManager: Onboarding marked as skipped");
    
    // Update AsyncStorage to reflect the skipped state
    await AsyncStorage.setItem('onboardingSkipped', 'true');
    await AsyncStorage.setItem('onboardingCompleted', 'false');
    
    // We don't update the onboarding state here because we want
    // the options sheet to reappear on next app launch
    
  } catch (error) {
    console.error("appStateManager: Error marking onboarding as skipped:", error);
  }
};

// Export this method so it can be used directly
export const validateCurrentUser = async (): Promise<boolean> => {
  return await appStateManager.validateCurrentUser();
};

// Add this export after the appStateManager export
export const forceAuthValidation = async (): Promise<boolean> => {
  console.log('forceAuthValidation: Forcing auth validation check from external call');
  return await appStateManager.forceServerValidation();
}; 