import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { restoreAuthSession } from '../utils/restoreAuth';
import { auth } from '../Config/firebaseconfig';
import { authCache } from '../utils/authCacheManager.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';

//  include 'Loading' and 'Onboarding'
type InitialRouteType = 'Auth' | 'Home' | 'Loading' | 'Onboarding';

export const useAuthSession = () => {
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkOnboardingStatus = async (userId: string) => {
      try {
        // Check if onboarding is completed
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        console.log("Auth hook - onboardingCompleted status:", onboardingCompleted);
        
        if (onboardingCompleted === 'false') {
          console.log("Auth hook - User needs onboarding");
          return 'Onboarding';
        } else {
          console.log("Auth hook - User can go to home");
          return 'Home';
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        return 'Onboarding'; // Default to onboarding if there's an error
      }
    };

    const initializeAuth = async () => {
      try {
        // Start parallel auth check
        const token = await restoreAuthSession();
        
        if (!isMounted) return;

        if (token && auth.currentUser) {
          const route = await checkOnboardingStatus(auth.currentUser.uid);
          setInitialRoute(route as InitialRouteType);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };

    // Start auth initialization
    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        authCache.updateLastActivity();
        const route = await checkOnboardingStatus(user.uid);
        setInitialRoute(route as InitialRouteType);
      } else {
        authCache.invalidateCache();
        setInitialRoute('Auth');
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { initialRoute, loading };
};
