/**
 * Brand Data Service
 * Handles reading and parsing the brands.txt file for the onboarding process
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { memoryCache, CacheKeys } from './memoryCache';

// Cache configuration for brand data - brands are extremely stable
const BRAND_CACHE_KEY = '@DripOut:brandData';
const BRAND_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (brands rarely change)
const CACHE_VERSION = '1.0.0';

interface BrandGroup {
  letter: string;
  brands: string[];
}

interface BrandCache {
  brands: string[];
  timestamp: number;
  version: string;
}

/**
 * Load brands from the brands.txt file with caching
 * Since React Native doesn't directly support reading text files from the bundle,
 * we'll use the brands list directly as a JavaScript array for now.
 * This can be updated later to read from a bundled asset if needed.
 * @returns Promise<string[]> - Array of brand names
 */
export const loadBrands = async (): Promise<string[]> => {
  try {
    // Use memory-first cache with fallback logic
    const brands = await memoryCache.get(
      CacheKeys.BRAND_DATA,
      async () => {
        console.log('🔄 Loading brands from static data');
        return loadBrandsFromStaticData();
      },
      BRAND_CACHE_TTL
    );

    if (brands && Array.isArray(brands) && brands.length > 0) {
      return brands;
    }

    // Fallback to direct loading if cache fails
    return loadBrandsFromStaticData();
  } catch (error) {
    console.error('Error loading brands:', error);
    return loadBrandsFromStaticData();
  }
};

/**
 * Load brands from static data (extracted from main function)
 */
const loadBrandsFromStaticData = async (): Promise<string[]> => {
  try {
    // Brand list from brands.txt file - converted to JavaScript array
    const brands = [
      '&Collar', '0711', '10 CORSO COMO', '3.3 FIELD TRIP', '3PARADIS',
      '44 LABEL GROUP', 'A BATHING APE®', 'A-COLD-WALL*', 'A.P.C.', 'adidas',
      'Aetherapparel', 'Aimé Leon Dore', 'ALEMAIS', 'Alexander Wang', 'Alighieri',
      'AllSaints', 'AMI Paris', 'AMIRI', 'and Wander', 'Anke Drechsel',
      'Anya Hindmarch', 'APL: ATHLETIC PROPULSION LABS', 'Aquazzura', 'Armani Vintage', 'ARTISAN LAB',
      'ASOS', 'Audo', 'Auralee', 'Autry', 'Axel Arigato',
      'Balenciaga', 'Bally', 'Balmain', 'Banana Republic', 'Barrie',
      'BLUE SKY INN', 'Bluecoats', 'BODE', 'Boggi Milano', 'BOSS',
      'Bottega Veneta', 'Brunello Cucinelli', 'Burberry', 'C.P. Company', 'CAINTÈ',
      'Calvin Klein', 'Carhartt WIP', 'CELINE', 'Champion', 'CHANEL Pre-Owned',
      'Chloé', 'Christopher Esber', 'Cinq A Sept', 'Colorful Standard', 'Common Projects',
      'Coolibar', 'COS', 'COTTON JERSEY', 'CRTZRTW', 'Cubavera',
      'DeMellier', 'Diesel', 'Dior', 'Dolce & Gabbana', 'Doucal\'s',
      'DOWER AND HALL', 'Drumohr', 'DSQUARED2', 'Elisabetta Franchi', 'Emporio Armani',
      'Eric Ji', 'Fashion Nova', 'FENDI', 'Ferragamo', 'Fossil',
      'GANNI', 'Gap', 'GIANNI CHIARINI', 'Giorgio Armani', 'Giuseppe Zanotti',
      'Givenchy', 'GOAT', 'God\'s Masterful Children', 'Golden Goose', 'Gucci',
      'Gucci Eyewear', 'Gucci Pre-Owned', 'Guess US', 'Gymshark | We Do Gym', 'H&M',
      'Harvest & Mill', 'Heron Preston', 'HOKA', 'IBELIV', 'IRO',
      'ISABEL MARANT', 'Isabel Marant Eyewear', 'IVY OAK', 'Jacquemus', 'JEANS',
      'Jil Sander', 'Jordan', 'JW Anderson', 'Karl Lagerfeld', 'KHAITE',
      'lack of color', 'Lanvin', 'Le Monde Beryl', 'LEMAIRE', 'Les Deux',
      'Longchamp', 'Loro Piana', 'Louis Vuitton Pre-Owned', 'Magda Butrym', 'Maison Kitsuné',
      'Maison Margiela', 'Makavelic', 'Manière De Voir', 'Manière De Voir USA', 'Marc Jacobs',
      'Marni', 'MC2 Saint Barth', 'Miu Miu', 'Miu Miu Eyewear', 'MM6 Maison Margiela',
      'MM6 Maison Margiela X Salomon', 'My Store', 'NasonMoretti', 'Nina Ricci', 'Nothing New - Women\'s Shoes',
      'Off-White', 'Off-White Eyewear', 'Officine Creative', 'Old Navy', 'Palm Angels',
      'PANGAIA', 'Paris Texas', 'Pascal Design', 'Patagonia', 'Patrizia Pepe',
      'Philipp Plein', 'Philosophy Di Lorenzo Serafini', 'Pierre-Louis Mascia', 'PINKO', 'Polo Ralph Lauren',
      'Porter-Yoshida & Co.', 'Prada', 'Prada Eyewear', 'Prada Pre-Owned', 'PrettyLittleThing.com',
      'Rabanne', 'Radial', 'Ralph Lauren Collection', 'Reebok', 'Represent',
      'Representclo', 'Retrosuperfuture', 'Rick Owens DRKSHDW', 'Run & Fly (UK)', 'sacai',
      'Saint Laurent', 'SAINT MXXXXXX', 'SCORES U', 'SHUSHU/TONG', 'Sportsman',
      'Sprayground', 'sprayground kid', 'Spring Summer 2025', 'Stella McCartney', 'Stone Island',
      'Stores', 'Stores and Consignment Offices', 'Stussy', 'Sunspel US', 'Supreme',
      'TeeShoppen', 'The Anthology', 'The Attico', 'The Frankie Shop', 'The Marathon Clothing',
      'The Row', 'Theory', 'TOM FORD', 'TOM FORD Eyewear', 'Tory Burch',
      'Troubadour', 'TWINSET', 'UNIQLO', 'United Colors of Benetton', 'Universal Surplus',
      'Valentino Garavani', 'Vans', 'VAUCLUSE STUDIOS', 'VEJA', 'Versace',
      'visvim', 'Vivienne Westwood', 'Zadig&Voltaire', 'ZARA', 'ZIMMERMANN',
      'Études Studio'
    ];
    
    // Filter out any empty strings and sort alphabetically
    const cleanBrands = brands
      .map(brand => brand.trim())
      .filter(brand => brand.length > 0)
      .sort();
    
    console.log(`Loaded ${cleanBrands.length} brands from brand list`);
    return cleanBrands;
  } catch (error) {
    console.error('Error loading brands:', error);
    
    // Minimal fallback if there's any issue
    const fallbackBrands = [
      'Nike', 'Adidas', 'Gucci', 'Prada', 'Versace',
      'Balenciaga', 'Saint Laurent', 'Off-White', 'Supreme'
    ];
    
    console.log('Using minimal fallback brands list');
    return fallbackBrands.sort();
  }
};

/**
 * Group brands by their first letter for alphabet index navigation
 * @param brands Array of brand names
 * @returns BrandGroup[] - Array of objects with letter and corresponding brands
 */
export const groupBrandsByLetter = (brands: string[]): BrandGroup[] => {
  const groups: { [key: string]: string[] } = {};
  
  brands.forEach(brand => {
    const firstChar = brand.charAt(0).toUpperCase();
    // Check if it's a regular letter A-Z
    const groupKey = (firstChar >= 'A' && firstChar <= 'Z') ? firstChar : '●';
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(brand);
  });
  
  // Convert to array and sort by letter (● first, then A-Z)
  return Object.keys(groups)
    .sort((a, b) => {
      if (a === '●') return -1;
      if (b === '●') return 1;
      return a.localeCompare(b);
    })
    .map(letter => ({
      letter,
      brands: groups[letter].sort()
    }));
};

/**
 * Get the index position of the first brand starting with a specific letter
 * @param brands Array of brand names
 * @param letter The letter to find
 * @returns number - Index position, or 0 if not found
 */
export const getIndexForLetter = (brands: string[], letter: string): number => {
  const upperLetter = letter.toUpperCase();
  
  let index = -1;
  
  if (upperLetter === '●') {
    // Find first brand that doesn't start with A-Z
    index = brands.findIndex(brand => {
      const firstChar = brand.charAt(0).toUpperCase();
      return !(firstChar >= 'A' && firstChar <= 'Z');
    });
  } else {
    // Find first brand starting with the specific letter
    index = brands.findIndex(brand => 
      brand.charAt(0).toUpperCase() === upperLetter
    );
  }
  
  return index >= 0 ? index : 0;
};

/**
 * Get all available first letters from the brands list
 * @param brands Array of brand names
 * @returns string[] - Array of unique first letters
 */
export const getAvailableLetters = (brands: string[]): string[] => {
  const letters = new Set<string>();
  brands.forEach(brand => {
    const firstChar = brand.charAt(0).toUpperCase();
    // Check if it's a regular letter A-Z
    if (firstChar >= 'A' && firstChar <= 'Z') {
      letters.add(firstChar);
    } else {
      // For numbers, symbols, etc., use the special symbol
      letters.add('●');
    }
  });
  return Array.from(letters).sort((a, b) => {
    // Put ● at the beginning
    if (a === '●') return -1;
    if (b === '●') return 1;
    return a.localeCompare(b);
  });
};