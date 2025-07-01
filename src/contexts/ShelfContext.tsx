// src/contexts/ShelfContext.tsx
// Global context for managing shelf state across the app

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  ShelfProduct, 
  getShelfProducts, 
  addToShelf, 
  removeFromShelf, 
  clearShelf,
  isInShelf,
  getShelfStats
} from '../services/shelfService';
import { logger } from '../utils/logger';
import { auth } from '../Config/firebaseconfig';

// Context state interface
interface ShelfState {
  products: ShelfProduct[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  recentlyAddedCount: number;
  lastUpdated: number;
}

// Context actions
type ShelfAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: ShelfProduct[] }
  | { type: 'ADD_PRODUCT'; payload: ShelfProduct }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'CLEAR_PRODUCTS' }
  | { type: 'UPDATE_STATS'; payload: { totalCount: number; recentlyAddedCount: number } }
  | { type: 'SET_LAST_UPDATED'; payload: number };

// Context interface
interface ShelfContextType extends ShelfState {
  // Actions
  addProductToShelf: (product: Omit<ShelfProduct, 'addedAt' | 'source'>, source?: ShelfProduct['source']) => Promise<boolean>;
  removeProductFromShelf: (productId: string) => Promise<boolean>;
  clearAllProducts: () => Promise<boolean>;
  refreshShelf: () => Promise<void>;
  checkIsInShelf: (productId: string) => boolean;
  
  // Utility functions
  getProductById: (productId: string) => ShelfProduct | undefined;
  getRecentProducts: (hours?: number) => ShelfProduct[];
  getProductsBySource: (source: ShelfProduct['source']) => ShelfProduct[];
}

// Initial state
const initialState: ShelfState = {
  products: [],
  loading: false,
  error: null,
  totalCount: 0,
  recentlyAddedCount: 0,
  lastUpdated: 0,
};

// Reducer function
const shelfReducer = (state: ShelfState, action: ShelfAction): ShelfState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_PRODUCTS':
      return { 
        ...state, 
        products: action.payload, 
        totalCount: action.payload.length,
        loading: false, 
        error: null 
      };
    
    case 'ADD_PRODUCT':
      const newProducts = [...state.products, action.payload];
      return { 
        ...state, 
        products: newProducts, 
        totalCount: newProducts.length,
        error: null 
      };
    
    case 'REMOVE_PRODUCT':
      const filteredProducts = state.products.filter(p => p.id !== action.payload);
      return { 
        ...state, 
        products: filteredProducts, 
        totalCount: filteredProducts.length,
        error: null 
      };
    
    case 'CLEAR_PRODUCTS':
      return { 
        ...state, 
        products: [], 
        totalCount: 0,
        recentlyAddedCount: 0,
        error: null 
      };
    
    case 'UPDATE_STATS':
      return {
        ...state,
        totalCount: action.payload.totalCount,
        recentlyAddedCount: action.payload.recentlyAddedCount,
      };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    default:
      return state;
  }
};

// Create context
const ShelfContext = createContext<ShelfContextType | undefined>(undefined);

// Provider component
interface ShelfProviderProps {
  children: ReactNode;
}

export const ShelfProvider: React.FC<ShelfProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(shelfReducer, initialState);

  // Load shelf products on mount and auth changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        refreshShelf();
      } else {
        // Clear shelf when user logs out
        dispatch({ type: 'CLEAR_PRODUCTS' });
        dispatch({ type: 'UPDATE_STATS', payload: { totalCount: 0, recentlyAddedCount: 0 } });
      }
    });

    return () => unsubscribe();
  }, []);

  // Refresh shelf data from service
  const refreshShelf = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const [products, stats] = await Promise.all([
        getShelfProducts(true), // Force refresh
        getShelfStats()
      ]);

      dispatch({ type: 'SET_PRODUCTS', payload: products });
      dispatch({ type: 'UPDATE_STATS', payload: { 
        totalCount: stats.totalProducts, 
        recentlyAddedCount: stats.recentlyAdded 
      }});
      dispatch({ type: 'SET_LAST_UPDATED', payload: Date.now() });

      logger.log(`Shelf refreshed: ${products.length} products loaded`);
    } catch (error) {
      logger.error('Error refreshing shelf:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load shelf' });
    }
  };

  // Add product to shelf
  const addProductToShelf = async (
    product: Omit<ShelfProduct, 'addedAt' | 'source'>, 
    source: ShelfProduct['source'] = 'overview'
  ): Promise<boolean> => {
    try {
      // Check if already exists
      if (state.products.some(p => p.id === product.id)) {
        logger.log(`Product ${product.id} already in shelf`);
        return true;
      }

      const success = await addToShelf(product, source);
      
      if (success) {
        const shelfProduct: ShelfProduct = {
          ...product,
          addedAt: Date.now(),
          source
        };
        
        dispatch({ type: 'ADD_PRODUCT', payload: shelfProduct });
        
        // Update stats
        const stats = await getShelfStats();
        dispatch({ type: 'UPDATE_STATS', payload: { 
          totalCount: stats.totalProducts, 
          recentlyAddedCount: stats.recentlyAdded 
        }});
        
        dispatch({ type: 'SET_LAST_UPDATED', payload: Date.now() });
        logger.log(`Added product ${product.id} to shelf from ${source}`);
      }
      
      return success;
    } catch (error) {
      logger.error('Error adding product to shelf:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add product to shelf' });
      return false;
    }
  };

  // Remove product from shelf
  const removeProductFromShelf = async (productId: string): Promise<boolean> => {
    try {
      const success = await removeFromShelf(productId);
      
      if (success) {
        dispatch({ type: 'REMOVE_PRODUCT', payload: productId });
        
        // Update stats
        const stats = await getShelfStats();
        dispatch({ type: 'UPDATE_STATS', payload: { 
          totalCount: stats.totalProducts, 
          recentlyAddedCount: stats.recentlyAdded 
        }});
        
        dispatch({ type: 'SET_LAST_UPDATED', payload: Date.now() });
        logger.log(`Removed product ${productId} from shelf`);
      }
      
      return success;
    } catch (error) {
      logger.error('Error removing product from shelf:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove product from shelf' });
      return false;
    }
  };

  // Clear all products
  const clearAllProducts = async (): Promise<boolean> => {
    try {
      const success = await clearShelf();
      
      if (success) {
        dispatch({ type: 'CLEAR_PRODUCTS' });
        dispatch({ type: 'UPDATE_STATS', payload: { totalCount: 0, recentlyAddedCount: 0 } });
        dispatch({ type: 'SET_LAST_UPDATED', payload: Date.now() });
        logger.log('Cleared all products from shelf');
      }
      
      return success;
    } catch (error) {
      logger.error('Error clearing shelf:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear shelf' });
      return false;
    }
  };

  // Check if product is in shelf (fast local check)
  const checkIsInShelf = (productId: string): boolean => {
    return state.products.some(p => p.id === productId);
  };

  // Get product by ID
  const getProductById = (productId: string): ShelfProduct | undefined => {
    return state.products.find(p => p.id === productId);
  };

  // Get recent products (default: last 24 hours)
  const getRecentProducts = (hours: number = 24): ShelfProduct[] => {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return state.products.filter(p => p.addedAt > cutoffTime);
  };

  // Get products by source
  const getProductsBySource = (source: ShelfProduct['source']): ShelfProduct[] => {
    return state.products.filter(p => p.source === source);
  };

  const contextValue: ShelfContextType = {
    ...state,
    addProductToShelf,
    removeProductFromShelf,
    clearAllProducts,
    refreshShelf,
    checkIsInShelf,
    getProductById,
    getRecentProducts,
    getProductsBySource,
  };

  return (
    <ShelfContext.Provider value={contextValue}>
      {children}
    </ShelfContext.Provider>
  );
};

// Hook to use shelf context
export const useShelf = (): ShelfContextType => {
  const context = useContext(ShelfContext);
  if (!context) {
    throw new Error('useShelf must be used within a ShelfProvider');
  }
  return context;
};

// Export types for use in other components
export type { ShelfProduct, ShelfContextType, ShelfState };