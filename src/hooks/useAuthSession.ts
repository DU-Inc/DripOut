import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { restoreAuthSession } from '../utils/restoreAuth';
import { auth } from '../Config/firebaseconfig';
import { authCache } from '../utils/authCacheManager.ts';

//  include 'Loading'
type InitialRouteType = 'Auth' | 'Home' | 'Loading';

export const useAuthSession = () => {
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Start parallel auth check
        const token = await restoreAuthSession();
        
        if (!isMounted) return;

        if (token) {
          setInitialRoute('Home');
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    };

    // Start auth initialization
    initializeAuth();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isMounted) return;

      if (user) {
        authCache.updateLastActivity();
        setInitialRoute('Home');
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
