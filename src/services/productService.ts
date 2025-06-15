// src/services/productService.ts

import axios from 'axios';

// Define interfaces for product data
export interface ProductImage {
  id: string;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  currency: string;
  images: ProductImage[];
  productUrl: string;
  // Add url field that comes from server
  url?: string;
}

// Define interface for API response
interface RandomProductsResponse {
  products: Product[];
  total_products: number;
  search_terms: string[];
  timestamp: string;
}

import { Platform } from 'react-native';

// Available API endpoints - uncomment the one you need
const API_ENDPOINTS = {
  // For iOS simulator
  IOS_SIMULATOR: 'http://localhost:8000',
  // For Android emulator
  ANDROID_EMULATOR: 'http://10.0.2.2:8000',
  // For localhost with different port
  LOCAL_ALT_PORT: 'http://localhost:3000',
  // For physical device on same network (replace with your computer's IP)
  LOCAL_NETWORK: 'http://192.168.1.100:8000',
  // If you have a public API endpoint
  PRODUCTION: 'https://api.dripout.app/api',
  // For testing - ngrok creates a tunnel to your localhost (replace with your ngrok URL)
  NGROK: 'https://abcd1234.ngrok.io',
};

// Local development API URL
const LOCAL_DEV_URL = 'http://192.168.1.251:8082';

// Set the API endpoint directly to your local development URL
let API_BASE_URL = LOCAL_DEV_URL;

// For debugging - log the current API URL
console.log(`Using API base URL: ${API_BASE_URL}`);

// Function to test API connectivity
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Testing API connectivity...');
    console.log(`Testing connection to: ${API_BASE_URL}/random_products`);
    const response = await axios.get(`${API_BASE_URL}/random_products`, {
      params: { limit: 1 },
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`🚦 API status: ONLINE`);
    console.log(`Status code: ${response.status}`);
    return true;
  } catch (error: any) {
    console.log(`🚦 API status: OFFLINE or unreachable`);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`Status code: ${error.response.status}`);
        console.log(`Error data: ${JSON.stringify(error.response.data)}`);
        return error.response.status >= 200 && error.response.status < 300;
      } else if (error.request) {
        // The request was made but no response was received
        console.log('No response received from API');
        console.log(`Request details: ${JSON.stringify(error.request)}`);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log(`Error message: ${error.message}`);
      }
    } else {
      console.log(`Unknown error: ${error}`);
    }
    return false;
  }
};

// Function to test if an image URL is accessible
const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    // Skip known problematic domains immediately
    const problematicDomains = [
      'lackofcolor.com',
      'dummyimage.com',
      'via.placeholder.com',
      'placeholder.com'
    ];
    
    if (problematicDomains.some(domain => url.includes(domain))) {
      return false;
    }
    
    const response = await fetch(url, {
      method: 'HEAD'
    });
    return response.ok && (response.headers.get('content-type')?.startsWith('image/') || false);
  } catch (error) {
    return false;
  }
};

// Validation function removed - using simpler filtering approach

// Function to fetch random products from the API
export const fetchRandomProducts = async (limit: number = 40): Promise<Product[]> => {
  try {
    console.log(`[API FLOW] Starting API request to ${API_BASE_URL}/random_products with limit=${limit}`);
    
    // Add timeout and headers for better debugging
    // The API URL is already http://192.168.1.231:8082, so we're directly appending the endpoint
    const response = await axios.get<RandomProductsResponse>(`${API_BASE_URL}/random_products`, {
      params: {
        limit
      },
      timeout: 15000, // 15 seconds timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    console.log(`[API FLOW] API Response successful! Received ${response.data.products.length} products`);
    
    // Log detailed info about the API response
    if (response.data.products.length > 0) {
      const sampleProduct = response.data.products[0];
      console.log(`[API FLOW] First product from API (${sampleProduct.id}):`);
      console.log(`[API FLOW] === COMPLETE API RESPONSE DEBUG ===`);
      console.log(`[API FLOW] Sample product JSON:`, JSON.stringify(sampleProduct, null, 2));
      console.log(`[API FLOW] Sample product keys:`, Object.keys(sampleProduct));
      const debugProduct = sampleProduct as any; // Cast to any for debugging
      console.log(`[API FLOW] productUrl field:`, debugProduct.productUrl);
      console.log(`[API FLOW] url field:`, debugProduct.url);
      console.log(`[API FLOW] link field:`, debugProduct.link);
      console.log(`[API FLOW] website field:`, debugProduct.website);
      console.log(`[API FLOW] source field:`, debugProduct.source);
      console.log(`[API FLOW] === END API RESPONSE DEBUG ===`);
      console.log(`  Raw response data: ${JSON.stringify(sampleProduct)}`);
      console.log(`  Has images array? ${sampleProduct.images !== undefined}`);
      
      if (sampleProduct.images) {
        console.log(`  Number of images: ${sampleProduct.images.length}`);
        sampleProduct.images.forEach((img, idx) => {
          console.log(`  Image ${idx + 1}:`);
          console.log(`    ID: ${img.id}`);
          console.log(`    URL: ${img.url}`);
          console.log(`    URL type: ${typeof img.url}`);
          console.log(`    Is URL valid? ${Boolean(img.url)}`);
        });
      }
    }
    
    // Filter and validate products - no fallbacks, only valid products
    console.log(`[API FLOW] Starting to filter and validate ${response.data.products.length} products`);
    
    // First pass: filter products with basic validation
    const basicFilteredProducts = response.data.products.filter((product, productIndex) => {
      // Ensure product has an identifier
      const pid = product.id ?? `product-${productIndex}`;
      product.id = pid;
      
      // Map server's 'url' field to 'productUrl' field that the client expects
      const rawProduct = product as any;
      if (rawProduct.url && !rawProduct.productUrl) {
        rawProduct.productUrl = rawProduct.url;
        console.log(`[API FLOW] Mapped url to productUrl for product ${pid}: ${rawProduct.url}`);
      }
      
      // Must have images array
      if (!Array.isArray(product.images) || product.images.length === 0) {
        console.log(`[API FLOW] Filtering out product ${pid} - no images array`);
        return false;
      }
      
      // Normalize images
      product.images = product.images.map((img, idx) => {
        if (typeof img === 'string') {
          return { id: `${pid}-${idx}`, url: img };
        }
        return img;
      });
      
      // Must have valid first image URL
      const firstImage = product.images[0];
      if (!firstImage.url || typeof firstImage.url !== 'string') {
        console.log(`[API FLOW] Filtering out product ${pid} - invalid first image URL`);
        return false;
      }
      
      // Skip known problematic domains and URLs
      const problematicDomains = [
        'lackofcolor.com',
        'dummyimage.com',
        'via.placeholder.com',
        'placeholder.com',
      ];
      
      if (problematicDomains.some(domain => firstImage.url.includes(domain))) {
        console.log(`[API FLOW] Filtering out product ${pid} - problematic domain in URL`);
        return false;
      }
      
      // Fix URL format if needed
      if (!firstImage.url.match(/^https?:\/\//)) {
        firstImage.url = firstImage.url.startsWith('/')
          ? `${API_BASE_URL}${firstImage.url}`
          : `${API_BASE_URL}/${firstImage.url}`;
      }
      
      // Convert HTTP to HTTPS for better reliability
      if (firstImage.url.startsWith('http://')) {
        firstImage.url = firstImage.url.replace('http://', 'https://');
      }
      
      return true;
    });
    
    console.log(`[API FLOW] After basic filtering: ${basicFilteredProducts.length}/${response.data.products.length} products remain`);
    
    // If we need more products due to filtering, fetch additional ones
    let finalProducts = basicFilteredProducts;
    if (basicFilteredProducts.length < limit && basicFilteredProducts.length > 0) {
      try {
        console.log(`[API FLOW] Need more products (${basicFilteredProducts.length}/${limit}), fetching additional batch`);
        const additionalResponse = await axios.get<RandomProductsResponse>(`${API_BASE_URL}/random_products`, {
          params: { limit: limit * 2 }, // Fetch more to account for filtering
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        // Apply same filtering to additional products
        const additionalFiltered = additionalResponse.data.products.filter(product => {
          // Skip if we already have this product
          if (finalProducts.find(p => p.id === product.id)) {
            return false;
          }
          
          // Map server's 'url' field to 'productUrl' field that the client expects
          const rawProduct = product as any;
          if (rawProduct.url && !rawProduct.productUrl) {
            rawProduct.productUrl = rawProduct.url;
          }
          
          // Apply same validation as above
          if (!Array.isArray(product.images) || product.images.length === 0) {
            return false;
          }
          
          const firstImage = product.images[0];
          if (!firstImage.url || typeof firstImage.url !== 'string') {
            return false;
          }
          
          const problematicDomains = [
            'lackofcolor.com', 
            'dummyimage.com', 
            'via.placeholder.com', 
            'placeholder.com',
            'cdn-images.farfetch-contents.com'
          ];
          if (problematicDomains.some(domain => firstImage.url.includes(domain))) {
            return false;
          }
          
          return true;
        });
        
        finalProducts = [...finalProducts, ...additionalFiltered].slice(0, limit);
        console.log(`[API FLOW] After additional fetch: ${finalProducts.length} total products`);
      } catch (error) {
        console.log(`[API FLOW] Failed to fetch additional products, continuing with ${finalProducts.length} products`);
      }
    }
    
    console.log(`[API FLOW] Returning ${finalProducts.length} validated products (no fallbacks)`);
    
    return finalProducts;
  } catch (error: any) {
    // More detailed error logging
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:');
      console.error(`Request URL: ${error.config?.url}`);
      console.error(`Request Method: ${error.config?.method}`);
      console.error(`Request Headers:`, error.config?.headers);
      console.error(`Response Status:`, error.response?.status);
      console.error(`Response Data:`, error.response?.data);
      
      if (error.code === 'ECONNABORTED') {
        console.error('Request timed out. API server might be slow or unreachable.');
      } else if (!error.response) {
        console.error('No response received. Network issue or CORS problem.');
        
        // For development, suggest checking specific issues with your API
        console.error(
          'Possible solutions:\n' +
          `1. Ensure API is running on ${API_BASE_URL}\n` +
          '2. Check that your device is on the same network as 192.168.1.231\n' +
          '3. Verify that port 8082 is open and accessible\n' +
          '4. Check CORS settings on API server to allow requests from mobile apps\n' +
          `5. Test your API directly in a browser or with curl: curl ${API_BASE_URL}/random_products\n` +
          '6. Try restarting your API server\n' +
          '7. Ensure your API is correctly implementing the random_products endpoint'
        );
        
        // For debugging network issues
        const debugUrl = `${API_BASE_URL}/random_products?limit=${limit}`;
        console.error(`Try accessing this URL directly on your development machine to check if the API is reachable: ${debugUrl}`);
      }
    } else {
      console.error('Non-Axios error:', error);
    }
    
    // Return an empty array if the API call fails
    return [];
  }
};