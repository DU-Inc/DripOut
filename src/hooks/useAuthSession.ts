import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { restoreAuthSession } from '../utils/restoreAuth';
import { auth } from '../Config/firebaseconfig'; // Import initialized auth

//  include 'Loading'
type InitialRouteType = 'Auth' | 'Home' | 'Loading';

export const useAuthSession = () => {
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Loading');
  const [loading, setLoading] = useState(true); // New loading state

  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true); // Start loading when restoring the session
      await restoreAuthSession(); // Restore the session
      setLoading(false); // Done loading
    };

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setInitialRoute('Home'); // Navigate to Home if user is authenticated
      } else {
        setInitialRoute('Auth'); // Otherwise, navigate to Auth
      }
      setLoading(false); // Stop loading once the auth state is determined
    });

    restoreSession(); // Restore session on app load

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, []);

  return { initialRoute, loading }; // Return both route and loading state
};
