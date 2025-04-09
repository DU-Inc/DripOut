import axios from 'axios';

// API configuration
const API_BASE_URL = 'http://192.168.1.231:8082'; // For local development
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
    
    // Log the payload right before sending
    console.log('📤 Sending payload:', payload);
    
    console.log('⏳ Sending API request to:', `${API_BASE_URL}/recommendations`);
    const response = await apiClient.post<RecommendationsApiResponse>('/recommendations', payload);
    
    console.log('✅ Search successful, received', (response.data.products?.length || 0), 'results');
    
    // Return the 'products' array from the response
    return response.data.products || []; // Return empty array if products field is missing
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Search failed with error:',
        error.code || 'unknown code',
        'Message:', error.message);
      console.error('📡 Request config:',
        error.config?.url,
        'Method:', error.config?.method);
      console.error('🔄 Response data:', error.response?.data || 'No response data');
      console.error('📊 Response status:', error.response?.status, error.response?.statusText);
    } else {
      console.error('❌ Search failed with non-Axios error:', error);
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
