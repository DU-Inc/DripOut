import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingContextType = {
  selectedStyles: string[];
  selectedBrands: string[];
  addStyle: (style: string) => void;
  removeStyle: (style: string) => void;
  addBrand: (brand: string) => void;
  removeBrand: (brand: string) => void;
  clearSelections: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load saved preferences from AsyncStorage when context initializes
  useEffect(() => {
    const loadSavedPreferences = async () => {
      try {
        // Load saved styles
        const stylesData = await AsyncStorage.getItem('selectedStyles');
        if (stylesData) {
          const styles = JSON.parse(stylesData);
          if (Array.isArray(styles)) {
            console.log('OnboardingContext: Loading saved styles from AsyncStorage:', styles);
            setSelectedStyles(styles);
          }
        }

        // Load saved brands
        const brandsData = await AsyncStorage.getItem('selectedBrands');
        if (brandsData) {
          const brands = JSON.parse(brandsData);
          if (Array.isArray(brands)) {
            console.log('OnboardingContext: Loading saved brands from AsyncStorage:', brands);
            setSelectedBrands(brands);
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('Error loading saved preferences:', error);
        setInitialized(true);
      }
    };

    loadSavedPreferences();
  }, []);

  const addStyle = (style: string) => {
    // Prevent adding duplicates
    setSelectedStyles(prev => {
      if (prev.includes(style)) return prev;
      return [...prev, style];
    });
  };

  const removeStyle = (style: string) => {
    setSelectedStyles(prev => prev.filter(s => s !== style));
  };

  const addBrand = (brand: string) => {
    // Prevent adding duplicates
    setSelectedBrands(prev => {
      if (prev.includes(brand)) return prev;
      const newBrands = [...prev, brand];
      console.log('OnboardingContext: Adding brand:', brand, 'New brands list:', newBrands);
      return newBrands;
    });
  };

  const removeBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const newBrands = prev.filter(b => b !== brand);
      console.log('OnboardingContext: Removing brand:', brand, 'New brands list:', newBrands);
      return newBrands;
    });
  };

  const clearSelections = () => {
    setSelectedStyles([]);
    setSelectedBrands([]);
  };

  if (!initialized) {
    return null; // Or a loading indicator if needed
  }

  return (
    <OnboardingContext.Provider value={{
      selectedStyles,
      selectedBrands,
      addStyle,
      removeStyle,
      addBrand,
      removeBrand,
      clearSelections,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};
