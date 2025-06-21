import { db, auth } from '../Config/firebaseconfig';

/**
 * Interface for Saved product in closet
 */
export interface SavedProduct {
  id?: string;
  userId: string;
  productId: string;
  productName?: string;
  productBrand?: string;
  productPrice?: number;
  productImage?: string;
  productUrl?: string;
  createdAt: any;
}

/**
 * Check if a user has saved a product to their closet
 * @param userId - The user ID
 * @param productId - The product ID
 * @returns Promise with boolean indicating whether the user has saved the product
 */
export const hasUserSavedProduct = async (userId: string, productId: string): Promise<boolean> => {
  try {
    const querySnapshot = await db
      .collection('saved_products')
      .where('userId', '==', userId)
      .where('productId', '==', productId)
      .get();

    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if user has saved product:', error);
    throw error;
  }
};

/**
 * Save a product to user's closet
 * @param userId - The ID of the user saving the product
 * @param productId - The ID of the product to save
 * @param productData - Additional product data to store
 * @returns Promise indicating success
 */
export const saveProductToCloset = async (
  userId: string, 
  productId: string, 
  productData?: {
    name?: string;
    brand?: string;
    price?: number;
    image?: string;
    url?: string;
  }
): Promise<void> => {
  try {
    // Check if the user has already saved the product
    const alreadySaved = await hasUserSavedProduct(userId, productId);
    if (alreadySaved) {
      console.log(`User ${userId} has already saved product ${productId} to closet`);
      return;
    }

    // Create a unique ID for the saved product document
    const savedDocId = `${userId}_${productId}`;
    const savedRef = db.collection('saved_products').doc(savedDocId);

    // Create the saved product document
    await savedRef.set({
      userId,
      productId,
      productName: productData?.name || '',
      productBrand: productData?.brand || '',
      productPrice: productData?.price || 0,
      productImage: productData?.image || '',
      productUrl: productData?.url || '',
      createdAt: new Date()
    });

    console.log(`User ${userId} saved product ${productId} to closet`);
  } catch (error) {
    console.error('Error saving product to closet:', error);
    throw error;
  }
};

/**
 * Remove a product from user's closet
 * @param userId - The ID of the user removing the product
 * @param productId - The ID of the product to remove
 * @returns Promise indicating success
 */
export const removeProductFromCloset = async (userId: string, productId: string): Promise<void> => {
  try {
    // Create a unique ID for the saved product document
    const savedDocId = `${userId}_${productId}`;
    const savedRef = db.collection('saved_products').doc(savedDocId);

    // Delete the saved product document
    await savedRef.delete();

    console.log(`User ${userId} removed product ${productId} from closet`);
  } catch (error) {
    console.error('Error removing product from closet:', error);
    throw error;
  }
};

/**
 * Toggle save status for a product in user's closet
 * @param userId - The ID of the user toggling the save
 * @param productId - The ID of the product
 * @param productData - Additional product data to store if saving
 * @returns Promise with boolean indicating the new save status (true = saved, false = removed)
 */
export const toggleSaveProductToCloset = async (
  userId: string, 
  productId: string, 
  productData?: {
    name?: string;
    brand?: string;
    price?: number;
    image?: string;
    url?: string;
  }
): Promise<boolean> => {
  try {
    const isSaved = await hasUserSavedProduct(userId, productId);
    
    if (isSaved) {
      await removeProductFromCloset(userId, productId);
      return false;
    } else {
      await saveProductToCloset(userId, productId, productData);
      return true;
    }
  } catch (error) {
    console.error('Error toggling product save status:', error);
    throw error;
  }
};

/**
 * Get all products saved by a user in their closet
 * @param userId - The user ID
 * @returns Promise with array of saved products
 */
export const getSavedProductsByUser = async (userId: string): Promise<SavedProduct[]> => {
  try {
    const querySnapshot = await db
      .collection('saved_products')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SavedProduct));
  } catch (error) {
    console.error('Error getting saved products by user:', error);
    throw error;
  }
};

/**
 * Get the count of products saved by a user
 * @param userId - The user ID
 * @returns Promise with number of saved products
 */
export const getSavedProductsCount = async (userId: string): Promise<number> => {
  try {
    const querySnapshot = await db
      .collection('saved_products')
      .where('userId', '==', userId)
      .get();

    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting saved products count:', error);
    throw error;
  }
};