/**
 * Brand Data Service
 * Handles reading and parsing the brands.txt file for the onboarding process
 */

interface BrandGroup {
  letter: string;
  brands: string[];
}

/**
 * Load brands from the brands.txt file
 * Since React Native doesn't directly support reading text files from the bundle,
 * we'll use the brands list directly as a JavaScript array for now.
 * This can be updated later to read from a bundled asset if needed.
 * @returns Promise<string[]> - Array of brand names
 */
export const loadBrands = async (): Promise<string[]> => {
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
    const firstLetter = brand.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(brand);
  });
  
  // Convert to array and sort by letter
  return Object.keys(groups)
    .sort()
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
  const index = brands.findIndex(brand => 
    brand.charAt(0).toUpperCase() === upperLetter
  );
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
    letters.add(brand.charAt(0).toUpperCase());
  });
  return Array.from(letters).sort();
};