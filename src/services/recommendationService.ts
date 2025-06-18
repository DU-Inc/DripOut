import axios from 'axios';
import { auth } from '../Config/firebaseconfig';
import { uploadImageAndGetURL } from './storageService';
import { getUserProfile } from './firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Using buffer for arraybuffer to base64 conversion
import { Buffer } from 'buffer';

// API configuration
const API_BASE_URL = 'http://192.168.1.251:8082'; // For local development
// const API_BASE_URL = "10.41.97.93";
console.log('📡 Recommendation API configured with base URL:', API_BASE_URL);

// Initialize API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000000000000000000
});

// Log when the service is imported
console.log('🚀 Recommendation service initialized');

// Cache keys for user model
const USER_MODEL_CACHE_KEY = 'user_3d_model_url';
const USER_MODEL_TIMESTAMP_KEY = 'user_3d_model_timestamp';

/**
 * Normalize store names to domain format (e.g. "nike" -> "nike.com")
 * This ensures we capture subdomains like store.brand.com
 */
function normalizeStoreDomain(store: string): string {
  // Skip if already has a domain extension
  if (store.includes('.com') || store.includes('.net') || store.includes('.org')) {
    // Remove www. if present
    return store.replace(/^www\./i, '');
  }
  
  // Simple mapping for common stores that might have different domains
  const storeMap: Record<string, string> = {
    'h&m': 'hm.com',
    'zara': 'zara.com',
    'nike': 'nike.com',
    'adidas': 'adidas.com',
    'uniqlo': 'uniqlo.com',
    'macys': 'macys.com',
    'nordstrom': 'nordstrom.com',
    'asos': 'asos.com',
    'forever21': 'forever21.com',
    'gap': 'gap.com',
    'jcrew': 'jcrew.com',
    'bloomingdales': 'bloomingdales.com',
    'vaquxy': 'vaquxy.com',
    'louisvuitton': 'goat.com',
    'gucci': 'goat.com',
  

  };
  
  const normalizedStore = storeMap[store.toLowerCase()] || `${store.toLowerCase()}.com`;
  return normalizedStore;
}

/**
 * Product type definition based on the *actual* API response structure
 */
export interface Product {
  url: string;
  id?: string; 
  name?: string; // Use 'name' as returned by the API
  description?: string;
  price?: string | number; 
  currency?: string;
  images?: string[];
  sizes?: string[];
  color?: string; // Primary color
  brand?: string;
  
  // Add other fields from products_response if needed
  // source_domain?: string;
  // sku?: string;
  // in_stock?: boolean;
}

/**
 * Type definition for the overall API response object
 */
interface RecommendationsApiResponse {
  products: Product[];
  total_products: number;
  search_terms: string[];
  timestamp: string;
}

/**
 * Search for product recommendations based on query and user profile
 */
export async function searchProducts(
  query: string, 
  priceRange: [number, number] = [0, 1000], 
  limit: number = 10,
  userProfile?: any // Accept user profile data if available
): Promise<Product[]> {
  console.log('🔎 Starting product search for query:', query);
  try {
    // Initialize user profile data object
    const userProfileData: any = {};

    // Integrate relevant fields from the provided userProfile object
    if (userProfile) {
      console.log('👤 User profile data available, integrating preferences');

      // Map age if available
      if (typeof userProfile.userAge === 'number') {
        userProfileData.age = userProfile.userAge;
        console.log('🎂 Age:', userProfile.userAge);
      } else {
        // If age is required by API but not present, you might need a default or omit it
        // console.log('ℹ️ Age not provided in user profile');
      }

      // Map gender if available
      if (userProfile.userGender) {
        const gender = userProfile.userGender.toLowerCase();
        if (gender.includes('male') || gender.includes('man') || gender.includes('men')) {
          userProfileData.gender = 'male'; // Match expected API value if needed
        } else if (gender.includes('female') || gender.includes('woman') || gender.includes('women')) {
          userProfileData.gender = 'female'; // Match expected API value if needed
        } else {
          // Decide on a default or omit if gender is unknown/other
          // userProfileData.gender = 'unisex'; 
        }
        console.log('⚧️ Mapped Gender preference:', userProfileData.gender);
      }

      // Map style preferences if available
      if (userProfile.preferredStyles && Array.isArray(userProfile.preferredStyles) && userProfile.preferredStyles.length > 0) {
        userProfileData.style_preferences = userProfile.preferredStyles;
        console.log('🎨 Style preferences:', userProfile.preferredStyles);
      }

      // Map color preferences if available (assuming API expects 'color_preferences')
      if (userProfile.colorPreferences && Array.isArray(userProfile.colorPreferences) && userProfile.colorPreferences.length > 0) {
        userProfileData.color_preferences = userProfile.colorPreferences;
        console.log('🌈 Color preferences:', userProfile.colorPreferences);
      }

      // Map and normalize preferred stores if available
      if (userProfile.preferredBrands && Array.isArray(userProfile.preferredBrands) && userProfile.preferredBrands.length > 0) {
        userProfileData.preferred_stores = userProfile.preferredBrands; // Send original names if API expects them
        // Or normalize if needed: userProfile.preferredBrands.map(normalizeStoreDomain);
        console.log('🏬 Preferred brands/stores:', userProfileData.preferred_stores);
      }
      
      // Add budget object with min/max from priceRange
      userProfileData.budget = {
         min: priceRange[0],
         max: priceRange[1]
      };
      console.log('💰 Budget object:', userProfileData.budget);

    } else {
      console.log('ℹ️ No user profile available, sending minimal profile data');
      // Send at least the budget if required, even without full profile
      userProfileData.budget = {
         min: priceRange[0],
         max: priceRange[1]
      };
    }
    
    // Build the request payload according to the *expected* API schema
    const payload = {
      user_query: query,        // Use expected name
      user_profile: userProfileData,
      max_products: limit,      // Use expected name
      direct_search: false, 
    };
    console.log('📦 Request payload prepared:', JSON.stringify(payload));
    
    // Step 1: Initiate the recommendations task
    console.log('⏳ Sending request to start recommendations task:', `${API_BASE_URL}/recommendations`);
    const initialResponse = await apiClient.post('/recommendations', payload);
    
    if (!initialResponse.data || !initialResponse.data.task_id) {
      throw new Error('Invalid response from recommendations API - no task_id received');
    }
    
    const taskId = initialResponse.data.task_id;
    console.log(`📋 Recommendations task started with ID: ${taskId}`);
    
    // Step 2: Poll for the result
    const pollInterval = 3000; // Poll every 3 seconds
    const maxPollingTime = 120000; // Maximum 2 minutes of polling for recommendations
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // Check if we've exceeded the maximum polling time
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxPollingTime) {
            reject(new Error('Recommendations task timed out. The operation took too long to complete.'));
            return;
          }
          
          console.log('🔄 Polling for recommendations task status...');
          const statusResponse = await apiClient.get(`/recommendations_status/${taskId}`);
          
          if (!statusResponse.data) {
            reject(new Error('Failed to get task status - no response data'));
            return;
          }
          
          const { status, result } = statusResponse.data;
          console.log(`📊 Recommendations task status: ${status}`);
          
          if (status === 'SUCCESS') {
            // Task succeeded
            console.log('✅ Recommendations task completed successfully');
            
            if (!result || !result.products || result.products.length === 0) {
              console.log('ℹ️ No products found from recommendations');
              resolve([]); // Return empty array instead of rejecting
              return;
            }
            
            console.log('✅ Successfully received', result.products.length, 'recommendations');
            resolve(result.products);
            
          } else if (status === 'FAILURE') {
            // Task failed
            console.error('❌ Recommendations task failed:', result);
            const errorMessage = result?.error || 'Recommendations task failed with unknown error';
            reject(new Error(`Recommendations failed: ${errorMessage}`));
            
          } else if (status === 'PENDING' || status === 'STARTED') {
            // Task is still running, continue polling
            console.log(`⏳ Task status is ${status}. Polling again in ${pollInterval / 1000}s...`);
            setTimeout(checkStatus, pollInterval);
            
          } else {
            // Unknown status
            console.warn(`⚠️ Unknown task status: ${status}. Continuing to poll...`);
            setTimeout(checkStatus, pollInterval);
          }
          
        } catch (pollError) {
          console.error('❌ Error while polling for recommendations task status:', pollError);
          
          if (axios.isAxiosError(pollError)) {
            if (pollError.response?.status === 404) {
              reject(new Error('Recommendations task not found. The task may have expired.'));
            } else {
              reject(new Error(`Failed to check task status: ${pollError.message}`));
            }
          } else {
            reject(new Error(`Polling error: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`));
          }
        }
      };
      
      // Start the first poll
      checkStatus();
    });
    
  } catch (error: unknown) {
    console.error('❌ Error starting recommendations task:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('❌ Recommendations failed with error:',
        error.code || 'unknown code',
        'Message:', error.message);
      console.error('📡 Request config:',
        error.config?.url,
        'Method:', error.config?.method);
      console.error('🔄 Response data:', error.response?.data || 'No response data');
      console.error('📊 Response status:', error.response?.status, error.response?.statusText);
      
      if (error.response?.status === 404) {
        throw new Error('Recommendations endpoint not found. Please check if the API is running.');
      } else if (error.response?.status === 422) {
        // Extract detailed error message
        let errorMessage = 'Invalid request data for recommendations.';
        try {
          if (error.response?.data && typeof error.response.data === 'object') {
            const responseData = error.response.data as any;
            if (responseData.detail) {
              if (typeof responseData.detail === 'string') {
                errorMessage = responseData.detail;
              } else if (Array.isArray(responseData.detail)) {
                errorMessage = responseData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }
    } else {
      console.error('❌ Recommendations failed with non-Axios error:', error);
    }
    throw error;
  }
}

/**
 * Check API health to ensure connection is working
 */
export async function checkApiHealth() {
  console.log('🔍 Starting API health check to:', API_BASE_URL);
  try {
    console.log('⏳ Sending request to:', `${API_BASE_URL}/api`);
    const response = await apiClient.get('/api');
    console.log('✅ API health check response:', JSON.stringify(response.data));
    
    let status_code = response.data?.status_code;
    console.log('Status code: ', status_code)
    
    

   
    const isOnline = (
      status_code === 200
    );

    console.log('🚦 API status:', isOnline ? 'ONLINE' : 'OFFLINE');
    return isOnline;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        '❌ API health check failed with error:', 
        error.code || 'unknown code',
        'Message:', error.message,
        'Response:', error.response?.data || 'No response data'
      );
      console.error(
        '📡 API health check request config:', 
        error.config?.url,
        'Method:', error.config?.method,
        'Timeout:', error.config?.timeout
      );
    } else {
      console.error('❌ API health check failed with non-Axios error:', error);
    }
    return false;
  }
}

/**
 * Interface for user model creation request
 */
interface CreateUserModelRequest {
  userId: string;
  userProfile: any;
  imageUrls: string[];
}

/**
 * Interface for user model creation response
 */
interface CreateUserModelResponse {
  modelUrl: string;
  status: string;
  message: string;
}

/**
 * Interface for 3D model try-on request (legacy)
 */
interface TryOnRequest {
  userId: string;
  modelUrl: string;
  productId: string;
  productDetails?: any;
}

/**
 * Interface for 3D model try-on response (legacy)
 */
interface TryOnResponse {
  resultUrl: string;
  status: string;
  message: string;
}

/**
 * Interface for user avatar try-on request
 */
interface UserTryOnRequest {
  user_id: string;
  user_profile: any;
  user_images: string[];
  products: any[];
}

/**
 * Interface for user avatar try-on response - we now expect a binary blob
 * rather than a JSON object with URLs
 */
interface UserTryOnResponse {
  // The response is now a binary blob (image)
  type: 'blob';
}

/**
 * Create a 3D user model from images
 * 
 * @param imageUris - Array of local image URIs
 * @param onProgress - Optional progress callback function
 * @returns Promise with the URL to the created 3D model
 */
export const createUserModel = async (
  imageUris: string[],
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('🧍 Starting 3D model creation with', imageUris.length, 'images');
  try {
    // Check if user is authenticated
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get user's profile for body measurements and other data
    const userProfile = await getUserProfile(currentUser.uid);
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    
    // Upload all images to Firebase Storage
    console.log('📤 Uploading images to Firebase Storage');
    const uploadPromises = imageUris.map((uri, index) => 
      uploadImageAndGetURL(
        uri, 
        '3d_model_photos', 
        `model_photo_${index}_${Date.now()}.jpg`,
        (progress) => {
          // Calculate overall progress considering upload is 50% of the process
          if (onProgress) {
            const imageContribution = 0.5 / imageUris.length;
            const adjustedProgress = (index * imageContribution) + (progress * imageContribution);
            onProgress(adjustedProgress);
          }
        }
      )
    );
    
    const imageUrls = await Promise.all(uploadPromises);
    console.log('✅ All images uploaded successfully');
    
    // Call the API to create the 3D model
    console.log('🔄 Calling API to create 3D model');
    if (onProgress) onProgress(0.5); // Upload complete, now processing
    
    const payload: CreateUserModelRequest = {
      userId: currentUser.uid,
      userProfile: {
        height: userProfile.height,
        weight: userProfile.weight,
        bodyType: userProfile.bodyType,
        gender: userProfile.userGender,
        // Include any other relevant profile fields
      },
      imageUrls
    };
    
    const response = await apiClient.post<CreateUserModelResponse>('/create_user_model', payload);
    
    if (!response.data || !response.data.modelUrl) {
      throw new Error('Invalid response from 3D model API');
    }
    
    console.log('✅ 3D model created successfully:', response.data.modelUrl);
    
    // Cache the model URL for future use
    await AsyncStorage.setItem(USER_MODEL_CACHE_KEY, response.data.modelUrl);
    await AsyncStorage.setItem(USER_MODEL_TIMESTAMP_KEY, Date.now().toString());
    
    if (onProgress) onProgress(1.0); // Completed
    return response.data.modelUrl;
    
  } catch (error) {
    console.error('❌ Error creating 3D model:', error);
    throw error;
  }
};

/**
 * Try on a product using the user's 3D model
 * 
 * @param productId - ID of the product to try on
 * @param productDetails - Optional additional product details
 * @param onProgress - Optional progress callback function
 * @returns Promise with the URL to the generated image
 */
export const tryOnProduct = async (
  productId: string,
  productDetails?: any,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('👕 Starting product try-on for product:', productId);
  try {
    // Check if user is authenticated
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Get cached model URL
    let modelUrl = await AsyncStorage.getItem(USER_MODEL_CACHE_KEY);
    
    if (!modelUrl) {
      throw new Error('User 3D model not found. Please create a model first.');
    }
    
    if (onProgress) onProgress(0.2); // Initialization complete
    
    // Call the API to generate the try-on image
    console.log('🔄 Calling API for product try-on');
    
    const payload: TryOnRequest = {
      userId: currentUser.uid,
      modelUrl,
      productId,
      productDetails
    };
    
    const response = await apiClient.post<TryOnResponse>('/fit_user_model', payload);
    
    if (!response.data || !response.data.resultUrl) {
      throw new Error('Invalid response from try-on API');
    }
    
    console.log('✅ Try-on image generated successfully:', response.data.resultUrl);
    
    if (onProgress) onProgress(1.0); // Completed
    return response.data.resultUrl;
    
  } catch (error) {
    console.error('❌ Error during product try-on:', error);
    throw error;
  }
};

/**
 * Check if user has a 3D model already created
 * 
 * @returns Promise with boolean indicating if model exists
 */
export const hasUserModel = async (): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return false;
    }
    
    // Check if model URL is cached
    const modelUrl = await AsyncStorage.getItem(USER_MODEL_CACHE_KEY);
    if (modelUrl) {
      // Optionally validate that the URL is still accessible
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for user model:', error);
    return false;
  }
};

/**
 * Get the cached 3D model URL for the current user
 * 
 * @returns Promise with the model URL or null if not found
 */
export const getUserModelUrl = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(USER_MODEL_CACHE_KEY);
  } catch (error) {
    console.error('Error getting user model URL:', error);
    return null;
  }
};

// Cache keys for random products
const RANDOM_PRODUCTS_CACHE_KEY = 'random_products_cache';
const RANDOM_PRODUCTS_TIMESTAMP_KEY = 'random_products_timestamp';
// Cache expiration time (2 hours)
const CACHE_EXPIRATION_TIME = 2 * 60 * 60 * 1000;

// Cache keys used to store the timestamp of the last failed request
const LAST_FAILED_REQUEST_TIMESTAMP_KEY = 'random_products_last_failure';
// Minimum time to wait before trying a failed request again (5 minutes)
const MIN_RETRY_INTERVAL = 5 * 60 * 1000;

/**
 * Fetch random products from the API
 * 
 * @param forceRefresh Whether to force a refresh from the API
 * @returns Promise with an array of random products
 */
export const getRandomProducts = async (forceRefresh: boolean = false): Promise<Product[]> => {
  try {
    console.log('🎲 Starting random products fetch');
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedProductsJson = await AsyncStorage.getItem(RANDOM_PRODUCTS_CACHE_KEY);
      const cachedTimestampStr = await AsyncStorage.getItem(RANDOM_PRODUCTS_TIMESTAMP_KEY);
      
      if (cachedProductsJson && cachedTimestampStr) {
        const cachedTimestamp = parseInt(cachedTimestampStr, 10);
        const currentTime = Date.now();
        
        // If cache is still valid
        if (currentTime - cachedTimestamp < CACHE_EXPIRATION_TIME) {
          console.log('🎲 Using cached random products');
          const products = JSON.parse(cachedProductsJson);
          return products;
        }
      }
      
      // If we don't have valid cache but there was a recent failed request
      // and we're not forcing a refresh, avoid hammering the server
      const lastFailedRequestStr = await AsyncStorage.getItem(LAST_FAILED_REQUEST_TIMESTAMP_KEY);
      if (lastFailedRequestStr) {
        const lastFailedTimestamp = parseInt(lastFailedRequestStr, 10);
        const currentTime = Date.now();
        
        if (currentTime - lastFailedTimestamp < MIN_RETRY_INTERVAL) {
          console.log('🎲 Recent API failure, using cached products regardless of age');
          
          // Try to get products from cache regardless of age
          if (cachedProductsJson) {
            const products = JSON.parse(cachedProductsJson);
            return products;
          }
        }
      }
    }
    
    // If we reached here, we need to fetch from the API
    
    // For manual refresh (forceRefresh=true), always attempt the request
    // For automatic refresh, check if we recently failed before trying
    if (!forceRefresh) {
      const lastFailedRequestStr = await AsyncStorage.getItem(LAST_FAILED_REQUEST_TIMESTAMP_KEY);
      if (lastFailedRequestStr) {
        const lastFailedTimestamp = parseInt(lastFailedRequestStr, 10);
        const currentTime = Date.now();
        
        if (currentTime - lastFailedTimestamp < MIN_RETRY_INTERVAL) {
          console.log('🎲 Skipping API request due to recent failure');
          
          // Try to get products from cache regardless of age
          const cachedProductsJson = await AsyncStorage.getItem(RANDOM_PRODUCTS_CACHE_KEY);
          if (cachedProductsJson) {
            const products = JSON.parse(cachedProductsJson);
            return products;
          }
          
          // If no cache is available, return empty array
          return [];
        }
      }
    }
    
    console.log('🎲 Fetching fresh random products from API');
    
    // Set a reasonable timeout for the request (10 seconds)
    const response = await apiClient.get<{products: Product[]}>('/random_products', {
      timeout: 10000 // 10 seconds
    });
    
    if (!response.data || !response.data.products) {
      throw new Error('Invalid response from random products API');
    }
    
    const products = response.data.products;
    console.log(`🎲 Fetched ${products.length} random products successfully`);
    
    // Clear the failed timestamp since we succeeded
    await AsyncStorage.removeItem(LAST_FAILED_REQUEST_TIMESTAMP_KEY);
    
    // Cache the products
    await AsyncStorage.setItem(RANDOM_PRODUCTS_CACHE_KEY, JSON.stringify(products));
    await AsyncStorage.setItem(RANDOM_PRODUCTS_TIMESTAMP_KEY, Date.now().toString());
    
    return products;
  } catch (error) {
    console.error('❌ Error fetching random products:', error);
    
    // Record the failure time to avoid hammering the server
    await AsyncStorage.setItem(LAST_FAILED_REQUEST_TIMESTAMP_KEY, Date.now().toString());
    
    // Try to return cached products as fallback in case of error
    try {
      const cachedProductsJson = await AsyncStorage.getItem(RANDOM_PRODUCTS_CACHE_KEY);
      if (cachedProductsJson) {
        console.log('🎲 Using cached products as fallback after API error');
        return JSON.parse(cachedProductsJson);
      }
    } catch (cacheError) {
      console.error('❌ Error accessing cache:', cacheError);
    }
    
    // Return empty array if everything fails
    return [];
  }
};

/**
 * Scrape product details from a URL
 * This sends the URL to the API which will scrape and return product details
 * 
 * @param productUrl The URL of the product to scrape
 * @param onProgress Optional progress callback function
 * @returns Promise with the scraped product details
 */
/**
 * Try on products using the user's avatar images
 * 
 * @param userImages - Array of image URLs of the user's avatar
 * @param products - Array of products to try on
 * @param userProfile - Optional user profile data for size/fit calculations
 * @param onProgress - Optional progress callback function
 * @returns Promise with the URL to the generated try-on image
 */
export const userTryOn = async (
  userImages: string[],
  products: Product[],
  userProfile?: any,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('👕 Starting user try-on for', products.length, 'product(s)');
  try {
    // Check if user is authenticated
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    // Verify we have at least one user image
    if (!userImages || userImages.length === 0) {
      throw new Error('No user images provided. Please create your avatar first.');
    }
    
    // Verify we have at least one product
    if (!products || products.length === 0) {
      throw new Error('No products provided for try-on.');
    }
    
    if (onProgress) onProgress(0.1); // Initialization complete
    
    // Get user profile data if not provided
    let profile = userProfile;
    if (!profile) {
      try {
        profile = await getUserProfile(currentUser.uid);
        console.log('👤 Retrieved user profile data for try-on');
      } catch (profileError) {
        console.warn('⚠️ Could not retrieve user profile data, proceeding with basic info');
        profile = { userId: currentUser.uid };
      }
    }
    
    if (onProgress) onProgress(0.2); // Profile retrieved
    
    // Format the products to ensure they match the API's expected format
    const formattedProducts = products.map(product => ({
      id: product.id || `product_${Date.now()}`,
      name: product.name || 'Unnamed Product',
      brand: product.brand || '',
      color: product.color || '',
      price: product.price ? product.price.toString() : '',
      description: product.description || '',
      url: product.url || '',
      images: product.images || []
    }));
    
    // Create our request payload following the Pydantic model pattern
    const tryOnRequestData = {
      user_profile: {
        // Basic user information - simplified to match example
        age: profile.age || 30,
        gender: (profile.userGender || profile.gender || 'unknown').toLowerCase(),
        height: profile.height || "5'8\"",
        body_type: profile.bodyType || 'average',
        style_preferences: ['casual', 'minimalist'] // Default preferences if none specified
      },
      user_images: userImages,
      products: products.map(p => ({
        // Include all required fields: name, description, images, and url
        name: p.name || 'Unnamed Product',
        description: p.description || `A ${p.brand || ''} product`,
        images: p.images && p.images.length > 0 ? p.images : [],
        url: p.url || ''
      }))
    };
    
    console.log('📦 User try-on payload prepared with', userImages.length, 'user images and', products.length, 'products');
    
    // Step 1: Initiate the try-on task
    console.log('⏳ Sending request to start try-on task:', `${API_BASE_URL}/user_try_on`);
    const initialResponse = await apiClient.post('/user_try_on', tryOnRequestData);
    
    if (!initialResponse.data || !initialResponse.data.task_id) {
      throw new Error('Invalid response from try-on API - no task_id received');
    }
    
    const taskId = initialResponse.data.task_id;
    console.log(`📋 Try-on task started with ID: ${taskId}`);
    
    if (onProgress) onProgress(0.3); // Task initiated
    
    // Step 2: Poll for the result
    const pollInterval = 3000; // Poll every 3 seconds
    const maxPollingTime = 180000; // Maximum 3 minutes of polling for try-on
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // Check if we've exceeded the maximum polling time
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxPollingTime) {
            reject(new Error('Try-on task timed out. The operation took too long to complete.'));
            return;
          }
          
          console.log('🔄 Polling for try-on task status...');
          const statusResponse = await apiClient.get(`/try_on_status/${taskId}`);
          
          if (!statusResponse.data) {
            reject(new Error('Failed to get task status - no response data'));
            return;
          }
          
          const { status, result } = statusResponse.data;
          console.log(`📊 Try-on task status: ${status}`);
          
          // Update progress based on status and elapsed time
          if (onProgress) {
            const baseProgress = 0.3;
            const progressRange = 0.6; // From 0.3 to 0.9
            const timeProgress = Math.min(elapsedTime / maxPollingTime, 1);
            const currentProgress = baseProgress + (progressRange * timeProgress);
            onProgress(Math.min(currentProgress, 0.9));
          }
          
          if (status === 'SUCCESS') {
            // Task succeeded, now get the image
            console.log('✅ Try-on task completed successfully, retrieving image...');
            
            try {
              // Step 3: Get the actual image from the try_on_image endpoint
              const imageResponse = await apiClient.get(`/try_on_image/${taskId}`, {
                responseType: 'arraybuffer',
                headers: {
                  'Accept': 'image/png, image/jpeg'
                }
              });
              
              if (imageResponse.status !== 200) {
                throw new Error('Failed to retrieve generated image');
              }
              
              // Handle the arraybuffer response based on platform
              if (Platform.OS === 'web') {
                // For web platforms, we can use URL.createObjectURL
                const blob = new Blob([imageResponse.data], { type:'image/png'});
                const imageUrl = URL.createObjectURL(blob);
                console.log('✅ Try-on image generated successfully (web platform)');
                if (onProgress) onProgress(1.0);
                resolve(imageUrl);
              } else {
                try {
                  // For React Native, create a data URI
                  const base64Flag = 'data:image/png;base64,';
                  const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
                  const dataURI = `${base64Flag}${base64Image}`;
                  console.log('✅ Try-on image generated successfully (native platform)');
                  if (onProgress) onProgress(1.0);
                  resolve(dataURI);
                } catch (bufferError) {
                  console.error('Error converting arraybuffer to base64:', bufferError);
                  
                  // Fallback to the user's avatar image
                  console.log('⚠️ Using fallback method for image display');
                  if (onProgress) onProgress(1.0);
                  
                  if (userImages && userImages.length > 0) {
                    resolve(userImages[0]); // Return the user's avatar as fallback
                  } else {
                    reject(new Error('Failed to process try-on image and no fallback available'));
                  }
                }
              }
            } catch (imageError) {
              console.error('❌ Error retrieving try-on image:', imageError);
              reject(new Error('Try-on completed but failed to retrieve the generated image'));
            }
            
          } else if (status === 'FAILURE') {
            // Task failed
            console.error('❌ Try-on task failed:', result);
            const errorMessage = result?.error || 'Try-on task failed with unknown error';
            reject(new Error(`Try-on failed: ${errorMessage}`));
            
          } else if (status === 'PENDING' || status === 'STARTED') {
            // Task is still running, continue polling
            console.log(`⏳ Task status is ${status}. Polling again in ${pollInterval / 1000}s...`);
            setTimeout(checkStatus, pollInterval);
            
          } else {
            // Unknown status
            console.warn(`⚠️ Unknown task status: ${status}. Continuing to poll...`);
            setTimeout(checkStatus, pollInterval);
          }
          
        } catch (pollError) {
          console.error('❌ Error while polling for try-on task status:', pollError);
          
          if (axios.isAxiosError(pollError)) {
            if (pollError.response?.status === 404) {
              reject(new Error('Try-on task not found. The task may have expired.'));
            } else {
              reject(new Error(`Failed to check task status: ${pollError.message}`));
            }
          } else {
            reject(new Error(`Polling error: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`));
          }
        }
      };
      
      // Start the first poll
      checkStatus();
    });
    
  } catch (error) {
    console.error('❌ Error starting try-on task:', error);
    
    // Provide more comprehensive details about the error
    if (axios.isAxiosError(error)) {
      // Log request details
      console.error('Request URL:', error.config?.url);
      console.error('Request Method:', error.config?.method);
      console.error('Request Headers:', JSON.stringify(error.config?.headers, null, 2));
      console.error('Request Data:', error.config?.data);
      
      // Log response details
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
        
        // Handle different types of response data
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            console.error('Response Data (string):', error.response.data);
            try {
              // Try to parse as JSON
              const parsedData = JSON.parse(error.response.data);
              console.error('Response Data (parsed):', JSON.stringify(parsedData, null, 2));
            } catch (e) {
              console.error('Could not parse response data as JSON');
            }
          } else if (error.response.data instanceof ArrayBuffer) {
            // Convert ArrayBuffer to string
            try {
              const dataString = new TextDecoder().decode(error.response.data);
              console.error('Response Data (ArrayBuffer):', dataString);
              try {
                const parsedData = JSON.parse(dataString);
                console.error('Response Data (parsed from ArrayBuffer):', JSON.stringify(parsedData, null, 2));
              } catch (e) {
                console.error('Could not parse array buffer data as JSON');
              }
            } catch (e) {
              console.error('Error decoding ArrayBuffer:', e);
            }
          } else {
            // Object or other data type
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
          }
        }
        
        // If the API sent a detailed error message, extract it
        let errorDetail = 'Unknown error';
        try {
          if (error.response.data && error.response.data.detail) {
            errorDetail = error.response.data.detail;
          } else if (error.response.data && typeof error.response.data === 'string') {
            const parsed = JSON.parse(error.response.data);
            errorDetail = parsed.detail || JSON.stringify(parsed);
          } else if (error.response.data instanceof ArrayBuffer) {
            const dataString = new TextDecoder().decode(error.response.data);
            const parsed = JSON.parse(dataString);
            errorDetail = parsed.detail || JSON.stringify(parsed);
          }
        } catch (e) {
          console.error('Error extracting detail from response:', e);
          errorDetail = error.message || 'Failed to extract error details';
        }
        
        throw new Error(`API Error (${error.response.status}): ${errorDetail}`);
      } else if (error.request) {
        // Request was made but no response was received
        console.error('No response received:', error.request);
        throw new Error(`API Error: No response received. Network issue or server down.`);
      } else {
        // Something else happened while setting up the request
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        throw new Error(`API Error: ${error.message}`);
      }
    } else {
      // Not an Axios error
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error type:', Object.prototype.toString.call(error));
      if (error instanceof Error) {
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
      }
      
      throw error;
    }
  }
};

export const scrapeProductFromUrl = async (
  productUrl: string | string[],
  onProgress?: (progress: number) => void
): Promise<Product | Product[]> => {
  try {
    // Normalize input to array of URLs
    const urls = Array.isArray(productUrl) ? productUrl : [productUrl];
    
    console.log('🔍 Starting product scraping for', urls.length, 'URL(s):', urls);
    
    if (onProgress) onProgress(0.1); // Start progress
    
    // Validate each URL
    for (const url of urls) {
      try {
        new URL(url); // Will throw if invalid URL
      } catch (urlError) {
        throw new Error(`Invalid URL format for "${url}". Please enter complete URLs including https://`);
      }
    }
    
    if (onProgress) onProgress(0.2); // URL validation complete
    
    // Step 1: Initiate the scraping task
    const payload = {
      urls: urls,  // Send as an array of URLs
      timeout: 180  // Default timeout in seconds
    };
    
    console.log('⏳ Sending request to start scraping task:', `${API_BASE_URL}/scrape_on_demand`);
    const initialResponse = await apiClient.post('/scrape_on_demand', payload);
    
    if (!initialResponse.data || !initialResponse.data.task_id) {
      throw new Error('Invalid response from scraping API - no task_id received');
    }
    
    const taskId = initialResponse.data.task_id;
    console.log(`📋 Scraping task started with ID: ${taskId}`);
    
    if (onProgress) onProgress(0.3); // Task initiated
    
    // Step 2: Poll for the result
    const pollInterval = 3000; // Poll every 3 seconds
    const maxPollingTime = 180000; // Maximum 3 minutes of polling
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          // Check if we've exceeded the maximum polling time
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxPollingTime) {
            reject(new Error('Scraping task timed out. The operation took too long to complete.'));
            return;
          }
          
          console.log('🔄 Polling for task status...');
          const statusResponse = await apiClient.get(`/scrape_status/${taskId}`);
          
          if (!statusResponse.data) {
            reject(new Error('Failed to get task status - no response data'));
            return;
          }
          
          const { status, result } = statusResponse.data;
          console.log(`📊 Task status: ${status}`);
          
          // Update progress based on status and elapsed time
          if (onProgress) {
            const baseProgress = 0.3;
            const progressRange = 0.6; // From 0.3 to 0.9
            const timeProgress = Math.min(elapsedTime / maxPollingTime, 1);
            const currentProgress = baseProgress + (progressRange * timeProgress);
            onProgress(Math.min(currentProgress, 0.9));
          }
          
          if (status === 'SUCCESS') {
            // Task succeeded
            console.log('✅ Scraping task completed successfully');
            
            if (!result || !result.products || result.products.length === 0) {
              reject(new Error('No products found from the provided URLs'));
              return;
            }
            
            if (onProgress) onProgress(1.0); // Complete
            
            // Return either a single product or an array based on input type
            if (Array.isArray(productUrl)) {
              console.log('✅ Successfully scraped', result.products.length, 'products');
              resolve(result.products);
            } else {
              const product = result.products[0];
              console.log('✅ Product scraped successfully:', product.name || 'Unnamed Product');
              resolve(product);
            }
            
          } else if (status === 'FAILURE') {
            // Task failed
            console.error('❌ Scraping task failed:', result);
            const errorMessage = result?.error || 'Scraping task failed with unknown error';
            reject(new Error(`Scraping failed: ${errorMessage}`));
            
          } else if (status === 'PENDING' || status === 'STARTED') {
            // Task is still running, continue polling
            console.log(`⏳ Task status is ${status}. Polling again in ${pollInterval / 1000}s...`);
            setTimeout(checkStatus, pollInterval);
            
          } else {
            // Unknown status
            console.warn(`⚠️ Unknown task status: ${status}. Continuing to poll...`);
            setTimeout(checkStatus, pollInterval);
          }
          
        } catch (pollError) {
          console.error('❌ Error while polling for task status:', pollError);
          
          if (axios.isAxiosError(pollError)) {
            if (pollError.response?.status === 404) {
              reject(new Error('Scraping task not found. The task may have expired.'));
            } else {
              reject(new Error(`Failed to check task status: ${pollError.message}`));
            }
          } else {
            reject(new Error(`Polling error: ${pollError instanceof Error ? pollError.message : 'Unknown error'}`));
          }
        }
      };
      
      // Start the first poll
      checkStatus();
    });
    
  } catch (error) {
    console.error('❌ Error starting scraping task:', error);
    
    // If it's an Axios error, provide more specific information
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Scraping endpoint not found. Please check if the API is running.');
      } else if (error.response?.status === 422) {
        // Try to extract the detailed error message from the response
        let errorMessage = 'Invalid URL or website not supported for scraping.';
        try {
          if (error.response?.data && typeof error.response.data === 'object') {
            const responseData = error.response.data as any;
            
            if (responseData.detail) {
              if (typeof responseData.detail === 'string') {
                errorMessage = responseData.detail;
              } else if (Array.isArray(responseData.detail)) {
                // If it's a validation error array, extract the messages
                errorMessage = responseData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Could not connect to the scraping service.');
      } else {
        throw new Error(`API Error (${error.response?.status || 'unknown'}): ${error.message}`);
      }
    }
    
    throw error;
  }
};
