import { auth } from '../Config/firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../utils/appStateManager';

class AuthGuard {
  private static instance: AuthGuard;
  private authCheckInterval: any = null;
  private readonly AUTH_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes (reduced frequency)
  private readonly FORCE_LOGOUT_THRESHOLD = 3; // Force logout after 3 failed checks
  private failedChecks = 0;
  private isChecking = false;

  private constructor() {}

  static getInstance(): AuthGuard {
    if (!AuthGuard.instance) {
      AuthGuard.instance = new AuthGuard();
    }
    return AuthGuard.instance;
  }

  /**
   * Start periodic authentication checks
   */
  public startAuthChecks(): void {
    console.log('AuthGuard: Starting periodic authentication checks');
    
    // Clear any existing interval
    this.stopAuthChecks();
    
    // Add a delay to allow AppStateManager to finish initialization
    setTimeout(() => {
      // Immediate check
      this.performAuthCheck();
      
      // Set up periodic checks
      this.authCheckInterval = setInterval(() => {
        this.performAuthCheck();
      }, this.AUTH_CHECK_INTERVAL);
    }, 2000); // 2 second delay
  }

  /**
   * Stop periodic authentication checks
   */
  public stopAuthChecks(): void {
    console.log('AuthGuard: Stopping authentication checks');
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }
    this.failedChecks = 0;
  }

  /**
   * Perform a comprehensive authentication check
   */
  private async performAuthCheck(): Promise<void> {
    if (this.isChecking) {
      console.log('AuthGuard: Auth check already in progress, skipping');
      return;
    }

    this.isChecking = true;
    console.log('AuthGuard: Performing authentication check...');

    try {
      // Check 1: Firebase Auth current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.warn('AuthGuard: No Firebase user found');
        await this.handleAuthFailure('No Firebase user');
        return;
      }

      // Check 2: Verify user token is still valid (but don't force refresh every time)
      try {
        await currentUser.getIdToken(false); // Don't force refresh to reduce overhead
        console.log('AuthGuard: Firebase token is valid');
      } catch (tokenError) {
        console.error('AuthGuard: Token validation failed:', tokenError);
        await this.handleAuthFailure('Invalid token');
        return;
      }

      // Check 3: Verify AsyncStorage has required auth data
      const storedToken = await AsyncStorage.getItem('firebaseUserToken');
      const lastActivity = await AsyncStorage.getItem('lastActivityTimestamp');
      
      if (!storedToken || !lastActivity) {
        console.warn('AuthGuard: Missing required auth data in storage');
        await this.handleAuthFailure('Missing auth data');
        return;
      }

      // Check 4: Verify token isn't too old (24 hours)
      const lastActivityTime = parseInt(lastActivity, 10);
      const now = Date.now();
      const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
      
      if (now - lastActivityTime > TOKEN_EXPIRY) {
        console.warn('AuthGuard: Auth data is too old');
        await this.handleAuthFailure('Expired auth data');
        return;
      }

      // Check 5: Verify AppStateManager reports user as authenticated
      if (!appStateManager.isAuthenticated()) {
        console.warn('AuthGuard: AppStateManager reports user is not authenticated');
        await this.handleAuthFailure('AppStateManager not authenticated');
        return;
      }

      // All checks passed
      console.log('AuthGuard: ✅ All authentication checks passed');
      this.failedChecks = 0;
      
      // Update last activity timestamp
      await AsyncStorage.setItem('lastActivityTimestamp', now.toString());

    } catch (error) {
      console.error('AuthGuard: Error during auth check:', error);
      await this.handleAuthFailure('Auth check error');
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Handle authentication failure
   */
  private async handleAuthFailure(reason: string): Promise<void> {
    this.failedChecks++;
    console.error(`AuthGuard: Auth check failed (${this.failedChecks}/${this.FORCE_LOGOUT_THRESHOLD}): ${reason}`);

    if (this.failedChecks >= this.FORCE_LOGOUT_THRESHOLD) {
      console.error('AuthGuard: 🚨 FORCING LOGOUT due to multiple auth failures');
      await this.forceLogout();
    }
  }

  /**
   * Force user logout and clear all auth data
   */
  private async forceLogout(): Promise<void> {
    console.log('AuthGuard: 🚨 FORCING USER LOGOUT');
    
    try {
      // Stop auth checks to prevent infinite loops
      this.stopAuthChecks();
      
      // Use AppStateManager's force logout which handles everything
      await appStateManager.forceLogout();
      
      console.log('AuthGuard: Force logout completed');
    } catch (error) {
      console.error('AuthGuard: Error during force logout:', error);
      
      // Fallback: Clear critical data manually
      try {
        await AsyncStorage.multiRemove([
          'firebaseUserToken',
          'lastActivityTimestamp',
          'userEmail',
          'userId',
          'userFirstName'
        ]);
        
        await auth().signOut();
        appStateManager.setAuthenticated(false);
      } catch (fallbackError) {
        console.error('AuthGuard: Fallback logout also failed:', fallbackError);
      }
    }
  }

  /**
   * Manually trigger an auth check (for use on app focus, etc.)
   */
  public async checkAuthNow(): Promise<boolean> {
    await this.performAuthCheck();
    return this.failedChecks === 0;
  }

  /**
   * Reset failed check counter (for use after successful login)
   */
  public resetFailedChecks(): void {
    this.failedChecks = 0;
    console.log('AuthGuard: Reset failed check counter');
  }
}

export const authGuard = AuthGuard.getInstance();