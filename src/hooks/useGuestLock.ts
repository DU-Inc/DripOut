// src/hooks/useGuestLock.ts
import { useState, useCallback, useEffect } from 'react';
import { appStateManager } from '../utils/appStateManager';

interface UseGuestLockOptions {
  feature?: string;
  title?: string;
  message?: string;
}

export const useGuestLock = (options: UseGuestLockOptions = {}) => {
  const [isLockVisible, setIsLockVisible] = useState(false);
  
  const isGuest = appStateManager.isGuest();
  
  // Subscribe to authentication state changes and automatically dismiss locks when user becomes authenticated
  useEffect(() => {
    const unsubscribe = appStateManager.subscribeToAuthState((isAuthenticated) => {
      // If user becomes authenticated and we have a visible lock, dismiss it
      if (isAuthenticated && isLockVisible) {
        console.log('useGuestLock: User authenticated, automatically dismissing lock');
        setIsLockVisible(false);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [isLockVisible]);
  
  const lockAction = useCallback((callback: () => void) => {
    if (isGuest) {
      setIsLockVisible(true);
      return false; // Action was blocked
    } else {
      callback();
      return true; // Action was executed
    }
  }, [isGuest]);
  
  const dismissLock = useCallback(() => {
    setIsLockVisible(false);
  }, []);
  
  return {
    isGuest,
    isLockVisible,
    lockAction,
    dismissLock,
    lockProps: {
      visible: isLockVisible,
      onDismiss: dismissLock,
      title: options.title,
      message: options.message,
      feature: options.feature,
    },
  };
};

export default useGuestLock;