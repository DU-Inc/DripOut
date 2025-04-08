import { useEffect, useState } from 'react';
import { auth } from '../config/firebaseconfig';
import { restoreAuthSession } from '../utils/restoreAuth';
import { authCache } from '../utils/authCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appStateManager } from '../utils/appStateManager';

// Initial route types that match our navigator structure
type InitialRouteType = 'Auth' | 'Home' | 'Loading' | 'Onboarding';

export const useAuthSession = () => {
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Loading');
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let authStateUnsubscribe: (() => void) | null = null;

    const checkOnboardingStatus = async (userId: string) => {
      try {
        // Check if onboarding is completed
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        console.log("Auth hook - onboardingCompleted status:", onboardingCompleted);
        
        // Update app state manager with the onboarding status
        if (onboardingCompleted === 'false') {
          console.log("Auth hook - User needs onboarding");
          appStateManager.setOnboarding(true);
          return 'Onboarding';
        } else {
          console.log("Auth hook - User can go to home");
          appStateManager.setOnboarding(false);
          return 'Home';
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // Default to onboarding if there's an error
        appStateManager.setOnboarding(true);
        return 'Onboarding';
      }
    };

    const initializeAuth = async () => {
      try {
        console.log("useAuthSession: Initializing auth session...");
        
        // Initialize appStateManager first to ensure state consistency
        await appStateManager.initialize();
        if (!isMounted) return;
        
        // Then check token validity
        const token = await restoreAuthSession();
        if (!isMounted) return;

        // If we have both valid token and current user, user is authenticated
        if (token && auth().currentUser) {
          console.log("useAuthSession: Valid token found, user is authenticated");
          
          // Set authenticated status in appStateManager
          appStateManager.setAuthenticated(true);
          
          // Check onboarding status to determine initial route
          const currentUser = auth().currentUser;
          if (currentUser) {
            const route = await checkOnboardingStatus(currentUser.uid);
            setInitialRoute(route as InitialRouteType);
          }
        } else {
          console.log("useAuthSession: No valid token found, user needs to authenticate");
          
          // Set not authenticated in appStateManager
          appStateManager.setAuthenticated(false);
          setInitialRoute('Auth');
        }
        
        setAuthChecked(true);
        setLoading(false);
      } catch (error) {
        console.error('useAuthSession: Auth initialization error:', error);
        if (isMounted) {
          // Handle failure gracefully
          appStateManager.setAuthenticated(false);
          setInitialRoute('Auth');
          setAuthChecked(true);
          setLoading(false);
        }
      }
    };

    // Start auth initialization
    initializeAuth();

    // Listen for auth state changes from Firebase
    authStateUnsubscribe = auth().onAuthStateChanged(async (user) => {
      if (!isMounted) return;

      console.log("useAuthSession: Auth state change detected:", user ? "User logged in" : "User logged out");

      if (user) {
        // Update cache activity timestamp and app state
        authCache.updateLastActivity();
        appStateManager.setAuthenticated(true);
        
        // Determine route based on onboarding status
        const route = await checkOnboardingStatus(user.uid);
        setInitialRoute(route as InitialRouteType);
      } else {
        // No user, clear cache and set unauthenticated state
        authCache.invalidateCache();
        appStateManager.setAuthenticated(false);
        setInitialRoute('Auth');
      }
      
      setAuthChecked(true);
      setLoading(false);
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (authStateUnsubscribe) {
        authStateUnsubscribe();
      }
    };
  }, []);

  // Subscribe to appStateManager authentication changes
  useEffect(() => {
    // This effect ensures the hook's state stays in sync with appStateManager
    const unsubscribeAuth = appStateManager.subscribeToAuthState((isAuthenticated) => {
      console.log("useAuthSession: appStateManager auth change:", isAuthenticated);
      // Don't update route here - let the onboarding subscription handle that
    });

    const unsubscribeOnboarding = appStateManager.subscribeToOnboardingState((isOnboarding) => {
      console.log("useAuthSession: appStateManager onboarding change:", isOnboarding);
      
      // Update initialRoute based on combined auth/onboarding state
      if (appStateManager.isAuthenticated()) {
        if (isOnboarding) {
          setInitialRoute('Onboarding');
        } else {
          setInitialRoute('Home');
        }
      } else {
        setInitialRoute('Auth');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOnboarding();
    };
  }, []);

  return { initialRoute, loading, authChecked };
}; 