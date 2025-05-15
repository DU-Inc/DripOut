import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';

/**
 * Interface for formatted product structure from Firebase
 */
export interface FormattedProduct {
  id: string;
  productImage: string;
  additionalImages: string[];
  productName: string;
  price: number | string;
  brand: string;
  description: string;
  size: string;
  sourceUrl: string;
}

/**
 * Formats raw product data from Firestore into the expected application format
 * @param product - Raw product data from Firestore
 * @param productId - ID of the product
 * @returns Formatted product object
 */
const formatFirestoreProduct = (product: any, productId: string): FormattedProduct => {
  // Extract images
  const mainImage = product.mainImage || '';
  const additionalImages = Array.isArray(product.additionalImages) ? product.additionalImages : [];
  
  return {
    id: productId,
    productImage: mainImage,
    additionalImages: additionalImages,
    productName: product.name || 'Unknown Product',
    price: product.price || 0,
    brand: product.brand || '',
    description: product.description || '',
    size: product.size || '',
    sourceUrl: product.productUrl || ''
  };
};

/**
 * Fetches products from Firestore based on product type
 * @param productType - Type of product to fetch
 * @param maxResults - Maximum number of results to return
 * @returns Array of formatted products
 */
const getProductsByType = async (productType: string, maxResults: number = 10): Promise<FormattedProduct[]> => {
  try {
    console.log(`Fetching products of type: ${productType}`);
    
    const productsCollection = collection(db, 'products');
    const productsQuery = query(
      productsCollection,
      where('productType', '==', productType),
      limit(maxResults)
    );
    
    const productsSnapshot = await getDocs(productsQuery);
    
    if (productsSnapshot.empty) {
      console.log(`No products found for type: ${productType}`);
      return [];
    }
    
    console.log(`Found ${productsSnapshot.size} products of type: ${productType}`);
    
    const formattedProducts: FormattedProduct[] = [];
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const formattedProduct = formatFirestoreProduct(product, doc.id);
      formattedProducts.push(formattedProduct);
    });
    
    return formattedProducts;
  } catch (error) {
    console.error(`Error fetching products of type ${productType}:`, error);
    return [];
  }
};

/**
 * Fetches products from both singleOutfitfrolSingle and singleOutfitfrolList1 collections,
 * with singleOutfitfrolSingle products shown first.
 * @returns Combined array of formatted products
 */
export const getFirestoreProducts = async (): Promise<FormattedProduct[]> => {
  try {
    console.log('Fetching firestore products from both collections');
    
    // First get products from singleOutfitfrolSingle (up to 5)
    const singleOutfitProducts = await getProductsByType('singleOutfitfrolSingle', 5);
    
    // Then get products from singleOutfitfrolList1
    const listOutfitProducts = await getProductsByType('singleOutfitfrolList1', 20);
    
    // Combine both arrays with single outfit products first
    const combinedProducts = [...singleOutfitProducts, ...listOutfitProducts];
    
    console.log(`Combined products: ${combinedProducts.length} total`);
    
    return combinedProducts;
  } catch (error) {
    console.error('Error fetching combined products:', error);
    return [];
  }
};

/**
 * Get a single product by ID
 * @param productId - The ID of the product to retrieve
 * @returns The product or null if not found
 */
export const getProductById = async (productId: string): Promise<FormattedProduct | null> => {
  try {
    // Get all products first (this could be optimized with a direct document query)
    const allProducts = await getFirestoreProducts();
    
    // Find the product with the matching ID
    const product = allProducts.find(p => p.id === productId);
    
    return product || null;
  } catch (error) {
    console.error(`Error getting product with ID ${productId}:`, error);
    return null;
  }
};