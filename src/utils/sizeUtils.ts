// src/utils/sizeUtils.ts

export interface SizeOption {
  id: string;
  label: string;
  normalizedLabel: string;
  isAvailable: boolean;
  category: 'clothing' | 'numeric' | 'onesize' | 'other';
}

// Standard clothing size mappings
const CLOTHING_SIZE_MAPPINGS: { [key: string]: string } = {
  'xs': 'XS',
  'extra small': 'XS',
  'x-small': 'XS',
  's': 'S',
  'small': 'S',
  'm': 'M',
  'medium': 'M',
  'l': 'L',
  'large': 'L',
  'xl': 'XL',
  'extra large': 'XL',
  'x-large': 'XL',
  'xxl': 'XXL',
  '2xl': 'XXL',
  'xx-large': 'XXL',
  'xxxl': 'XXXL',
  '3xl': 'XXXL',
  'xxx-large': 'XXXL',
};

// One-size variations
const ONE_SIZE_VARIATIONS = [
  'one size',
  'onesize',
  'one-size',
  'os',
  'universal',
  'free size',
  'freesize',
  'free-size',
  'one size fits all',
  'osfa',
];

/**
 * Normalizes a size string to a consistent format
 */
export const normalizeSize = (size: string): string => {
  if (!size) return size;
  
  const cleanSize = size.toString().toLowerCase().trim();
  
  // Check if it's a one-size variation
  if (ONE_SIZE_VARIATIONS.includes(cleanSize)) {
    return 'One Size';
  }
  
  // Check if it's a standard clothing size
  if (CLOTHING_SIZE_MAPPINGS[cleanSize]) {
    return CLOTHING_SIZE_MAPPINGS[cleanSize];
  }
  
  // If it's numeric, return as-is but formatted
  if (/^\d+$/.test(cleanSize)) {
    return cleanSize;
  }
  
  // If it contains numbers and letters (like 32W, 34L), format nicely
  if (/^\d+[a-zA-Z]$/.test(cleanSize)) {
    return cleanSize.toUpperCase();
  }
  
  // Default: capitalize first letter of each word
  return size.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Categorizes a size into different types
 */
export const categorizeSizeType = (size: string): SizeOption['category'] => {
  if (!size) return 'other';
  
  const cleanSize = size.toString().toLowerCase().trim();
  
  // One size
  if (ONE_SIZE_VARIATIONS.includes(cleanSize)) {
    return 'onesize';
  }
  
  // Standard clothing sizes
  if (CLOTHING_SIZE_MAPPINGS[cleanSize]) {
    return 'clothing';
  }
  
  // Numeric sizes (waist, measurements, etc.)
  if (/^\d+[a-zA-Z]?$/.test(cleanSize)) {
    return 'numeric';
  }
  
  return 'other';
};

/**
 * Formats raw size data from API into normalized SizeOption objects
 */
export const formatSizesFromAPI = (sizes: string[] | undefined | null): SizeOption[] => {
  if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
    // Return default one-size if no sizes provided
    return [{
      id: 'onesize',
      label: 'One Size',
      normalizedLabel: 'One Size',
      isAvailable: true,
      category: 'onesize'
    }];
  }
  
  return sizes.map((size, index) => {
    const normalizedLabel = normalizeSize(size);
    const category = categorizeSizeType(size);
    
    return {
      id: `size-${index}-${size.toLowerCase().replace(/\s+/g, '-')}`,
      label: size,
      normalizedLabel,
      isAvailable: true, // Assume all sizes from API are available
      category
    };
  });
};

/**
 * Sorts sizes in a logical order (clothing sizes first, then numeric, then others)
 */
export const sortSizes = (sizes: SizeOption[]): SizeOption[] => {
  const clothingOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  
  return sizes.sort((a, b) => {
    // One size always comes first
    if (a.category === 'onesize') return -1;
    if (b.category === 'onesize') return 1;
    
    // Clothing sizes in standard order
    if (a.category === 'clothing' && b.category === 'clothing') {
      const aIndex = clothingOrder.indexOf(a.normalizedLabel);
      const bIndex = clothingOrder.indexOf(b.normalizedLabel);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
    }
    
    // Numeric sizes in ascending order
    if (a.category === 'numeric' && b.category === 'numeric') {
      const aNum = parseInt(a.normalizedLabel);
      const bNum = parseInt(b.normalizedLabel);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
    }
    
    // Category priority: clothing > numeric > other
    const categoryPriority = { clothing: 1, numeric: 2, onesize: 0, other: 3 };
    const aPriority = categoryPriority[a.category];
    const bPriority = categoryPriority[b.category];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Alphabetical fallback
    return a.normalizedLabel.localeCompare(b.normalizedLabel);
  });
};

/**
 * Gets a display-friendly size string for UI components
 */
export const getDisplaySize = (size: SizeOption): string => {
  return size.normalizedLabel;
};

/**
 * Filters out duplicate sizes and keeps the best normalized version
 */
export const deduplicateSizes = (sizes: SizeOption[]): SizeOption[] => {
  const seen = new Set<string>();
  
  return sizes.filter(size => {
    const key = size.normalizedLabel.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Complete processing pipeline for size data from API
 */
export const processSizeData = (apiSizes: string[] | undefined | null): SizeOption[] => {
  const formatted = formatSizesFromAPI(apiSizes);
  const deduplicated = deduplicateSizes(formatted);
  const sorted = sortSizes(deduplicated);
  
  return sorted;
};