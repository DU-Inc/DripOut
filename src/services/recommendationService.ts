import axios from 'axios';

// API configuration
// const API_BASE_URL = 'http://192.168.1.231:8082'; // For local development
const API_BASE_URL = "10.41.97.93";
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
 * Search for product recommendations based on query and user profile
 */
export async function searchProducts(
  query: string, 
  priceRange: [number, number] = [0, 1000], 
  limit: number = 10,
  userProfile?: any // Accept user profile data if available
) {
  console.log('🔎 Starting product search for query:', query);
  try {
    // Convert price range to budget category
    let budget = priceRange[1] <= 50 ? 'under-50' : 
                 priceRange[1] <= 100 ? '50-100' : 
                 priceRange[1] <= 200 ? '100-200' : 'over-200';
    console.log('💰 Using budget category:', budget, 'for price range:', priceRange);
    
    // Initialize user profile with budget
    const userProfileData: any = {
      budget
    };
    
    // If user has a profile, integrate relevant fields
    if (userProfile) {
      console.log('👤 User profile data available, integrating preferences');
    
      // Map size if available
      if (userProfile.topsSize) {
        userProfileData.size = userProfile.topsSize;
        console.log('👕 Using size preference:', userProfile.topsSize);
      }
      
      // Map style preferences if available
      if (userProfile.preferredStyles && userProfile.preferredStyles.length > 0) {
        userProfileData.style_preferences = userProfile.preferredStyles;
        console.log('🎨 Style preferences:', userProfile.preferredStyles);
      }
      
      // Map and normalize preferred stores if available
      if (userProfile.preferredBrands && userProfile.preferredBrands.length > 0) {
        userProfileData.preferred_stores = userProfile.preferredBrands.map(normalizeStoreDomain);
        console.log('🏬 Preferred brands/stores:', userProfileData.preferred_stores);
      }
      
      // Map gender if available
      if (userProfile.userGender) {
        // Simple normalization for gender
        const gender = userProfile.userGender.toLowerCase();
        if (gender.includes('male') || gender.includes('man') || gender.includes('men')) {
          userProfileData.gender = 'men';
        } else if (gender.includes('female') || gender.includes('woman') || gender.includes('women')) {
          userProfileData.gender = 'women';
        } else {
          userProfileData.gender = 'unisex';
        }
        console.log('⚧️ Gender preference:', userProfileData.gender);
      }
      
      // Map age if available
      if (typeof userProfile.userAge === 'number') {
        userProfileData.age = userProfile.userAge;
        console.log('🎂 Age:', userProfile.userAge);
      }
    } else {
      console.log('ℹ️ No user profile available, using default preferences');
    }
    
    // Build the request payload according to the schema
    const payload = {
      query,
      user_profile: userProfileData,
      direct_search: false, // Use enhanced search by default
      limit
    };
    console.log('📦 Request payload prepared:', JSON.stringify(payload));
    
    console.log('⏳ Sending API request to:', `${API_BASE_URL}/recommendations`);
    const response = await apiClient.post('/recommendations', payload);
    
    console.log('✅ Search successful, received', (response.data.response?.length || 0), 'results');
    // Return the results array from the response
    return response.data.response;
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

/**
 * Product type definition
 */
export interface Product {
  id: string;
  name: string;
  price?: number;
  images: string[];
  sizes?: string[];
  description?: string;
  url: string;
  site?: string;
  colors?: string[];
  materials?: string[];
  care_instructions?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  raw_data?: Record<string, any>;
}
