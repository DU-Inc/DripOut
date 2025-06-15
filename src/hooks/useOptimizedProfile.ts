import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../Config/firebaseconfig';
import { profileOptimizationService, ProfileData, LoadingStates } from '../services/profileOptimizationService';
import { UserProfile, UserPreferences } from '../services/firestoreService';
import { Post } from '../services/postService';

interface UseOptimizedProfileReturn {
  // Data
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  posts: Post[];
  followCounts: { followers: number; following: number };
  savedOutfits: any[];
  favoriteProducts: any[];
  
  // Loading states
  loadingStates: LoadingStates;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Error handling
  error: string | null;
}

export const useOptimizedProfile = (): UseOptimizedProfileReturn => {
  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [savedOutfits, setSavedOutfits] = useState<any[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  
  // Loading states
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    profile: true,
    preferences: true,
    posts: true,
    followCounts: true,
    savedOutfits: true,
    favoriteProducts: true,
  });
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs to track component mount state
  const isMountedRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  
  // Helper to safely update state only if component is mounted
  const safeSetState = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      updateFn();
    }
  }, []);
  
  // Load essential data first (profile and preferences)
  const loadEssentialData = useCallback(async (userId: string) => {
    try {
      console.log('Loading essential data for user:', userId);
      
      const { profile: essentialProfile, preferences: essentialPreferences } = 
        await profileOptimizationService.loadEssentialData(userId);
      
      safeSetState(() => {
        if (essentialProfile) {
          setProfile(essentialProfile);
          setLoadingStates(prev => ({ ...prev, profile: false }));
        }
        
        if (essentialPreferences) {
          setPreferences(essentialPreferences);
          setLoadingStates(prev => ({ ...prev, preferences: false }));
        }
        
        // If we have essential data, we can show the UI
        if (essentialProfile || essentialPreferences) {
          setIsInitialLoading(false);
        }
      });
      
      console.log('Essential data loaded successfully');
    } catch (err) {
      console.error('Error loading essential data:', err);
      safeSetState(() => {
        setError('Failed to load profile data');
        setIsInitialLoading(false);
      });
    }
  }, [safeSetState]);
  
  // Load secondary data (posts, follows, etc.)
  const loadSecondaryData = useCallback(async (userId: string) => {
    try {
      console.log('Loading secondary data for user:', userId);
      
      const secondaryData = await profileOptimizationService.loadSecondaryData(userId);
      
      safeSetState(() => {
        if (secondaryData.posts) {
          setPosts(secondaryData.posts);
          setLoadingStates(prev => ({ ...prev, posts: false }));
        }
        
        if (secondaryData.followCounts) {
          setFollowCounts(secondaryData.followCounts);
          setLoadingStates(prev => ({ ...prev, followCounts: false }));
        }
        
        if (secondaryData.savedOutfits) {
          setSavedOutfits(secondaryData.savedOutfits);
          setLoadingStates(prev => ({ ...prev, savedOutfits: false }));
        }
        
        if (secondaryData.favoriteProducts) {
          setFavoriteProducts(secondaryData.favoriteProducts);
          setLoadingStates(prev => ({ ...prev, favoriteProducts: false }));
        }
      });
      
      console.log('Secondary data loaded successfully');
    } catch (err) {
      console.error('Error loading secondary data:', err);
      // Don't set error for secondary data failures, just log them
      safeSetState(() => {
        setLoadingStates(prev => ({
          ...prev,
          posts: false,
          followCounts: false,
          savedOutfits: false,
          favoriteProducts: false,
        }));
      });
    }
  }, [safeSetState]);
  
  // Initialize data loading
  const initializeData = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) {
      safeSetState(() => {
        setError('No authenticated user');
        setIsInitialLoading(false);
      });
      return;
    }
    
    currentUserIdRef.current = user.uid;
    
    try {
      // Load essential data first
      await loadEssentialData(user.uid);
      
      // Then load secondary data in the background
      loadSecondaryData(user.uid);
      
    } catch (err) {
      console.error('Error initializing data:', err);
      safeSetState(() => {
        setError('Failed to initialize profile data');
        setIsInitialLoading(false);
      });
    }
  }, [loadEssentialData, loadSecondaryData, safeSetState]);
  
  // Refresh data (use cache if available)
  const refresh = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Load both essential and secondary data
      await Promise.all([
        loadEssentialData(user.uid),
        loadSecondaryData(user.uid)
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      safeSetState(() => {
        setIsRefreshing(false);
      });
    }
  }, [loadEssentialData, loadSecondaryData, safeSetState]);
  
  // Force refresh (clear cache and reload)
  const forceRefresh = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      const allData = await profileOptimizationService.forceRefreshAllData(user.uid);
      
      safeSetState(() => {
        setProfile(allData.profile);
        setPreferences(allData.preferences);
        setPosts(allData.posts);
        setFollowCounts(allData.followCounts);
        setSavedOutfits(allData.savedOutfits);
        setFavoriteProducts(allData.favoriteProducts);
        
        setLoadingStates({
          profile: false,
          preferences: false,
          posts: false,
          followCounts: false,
          savedOutfits: false,
          favoriteProducts: false,
        });
      });
    } catch (err) {
      console.error('Error force refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      safeSetState(() => {
        setIsRefreshing(false);
      });
    }
  }, [safeSetState]);
  
  // Clear cache
  const clearCache = useCallback(async () => {
    const user = auth().currentUser;
    if (!user) return;
    
    try {
      await profileOptimizationService.clearUserCache(user.uid);
      console.log('Cache cleared successfully');
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;
    initializeData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [initializeData]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return {
    // Data
    profile,
    preferences,
    posts,
    followCounts,
    savedOutfits,
    favoriteProducts,
    
    // Loading states
    loadingStates,
    isInitialLoading,
    isRefreshing,
    
    // Actions
    refresh,
    forceRefresh,
    clearCache,
    
    // Error handling
    error,
  };
}; 