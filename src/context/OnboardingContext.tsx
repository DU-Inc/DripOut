import React, { createContext, useState, useContext, ReactNode } from 'react';

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

type OnboardingProviderProps = {
  children: ReactNode;
};

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const addStyle = (style: string) => {
    setSelectedStyles(prev => [...prev, style]);
  };

  const removeStyle = (style: string) => {
    setSelectedStyles(prev => prev.filter(s => s !== style));
  };

  const addBrand = (brand: string) => {
    setSelectedBrands(prev => [...prev, brand]);
  };

  const removeBrand = (brand: string) => {
    setSelectedBrands(prev => prev.filter(b => b !== brand));
  };

  const clearSelections = () => {
    setSelectedStyles([]);
    setSelectedBrands([]);
  };

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

export const useOnboardingContext = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
};
