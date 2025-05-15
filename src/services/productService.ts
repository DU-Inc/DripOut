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
const LOCAL_DEV_URL = 'http://192.168.1.231:8082';

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
    
    // Validate and fix image URLs
    console.log(`[API FLOW] Starting to process and validate ${response.data.products.length} products`);
    
    const validatedProducts = response.data.products.map((product, productIndex) => {
      // Ensure product has an identifier and a normalized images array
      const pid = product.id ?? `product-${productIndex}`;
      if (product.id !== pid) {
        console.log(`[API FLOW] WARNING: Product at index ${productIndex} missing id, using '${pid}'`);
      }
      product.id = pid;
      if (!Array.isArray(product.images)) {
        console.log(`[API FLOW] WARNING: Product ${pid} has no images array or it's not an array; defaulting to empty`);
        product.images = [];
      }
      // Normalize raw images (string URLs or objects) into {id,url}
      product.images = product.images.map((img, idx) => {
        if (typeof img === 'string') {
          return { id: `${pid}-${idx}`, url: img };
        }
        return img;
      });
      console.log(`[API FLOW] Processing product ${productIndex + 1}/${response.data.products.length} (id=${pid})`);
      
      // Process the images to ensure valid URLs
      const processedImages = product.images.map((image, imageIndex) => {
        console.log(`[API FLOW] Processing image ${imageIndex + 1}/${product.images.length} for product ${product.id}`);
        
        // Check if URL is valid and fix it if necessary
        let validUrl = image.url;
        let urlSource = 'original';
        
        console.log(`[API FLOW] Original image URL: "${validUrl}"`);
        
        // Normalize URL: ensure fully qualified via API_BASE_URL if missing protocol
        // Defer fallback for empty or invalid later
        if (!validUrl || validUrl === 'undefined' || validUrl === 'null') {
          // keep for dummy fallback
        } else if (!validUrl.match(/^https?:\/\//)) {
          const oldUrl = validUrl;
          // Prefix with API base URL (handles both leading slash and bare paths)
          validUrl = validUrl.startsWith('/')
            ? `${API_BASE_URL}${validUrl}`
            : `${API_BASE_URL}/${validUrl}`;
          urlSource = 'prefixed-with-base-url';
          console.log(`[API FLOW] Prefixed API base URL: "${oldUrl}" → "${validUrl}"`);
        }
        
        // If URL missing or still not a valid HTTP(S) URL, provide a fallback
        if (!validUrl || !validUrl.match(/^https?:\/\/.+/)) {
          const oldUrl = validUrl;
          // Use a more reliable placeholder service
          const colors = ['3498db', '2ecc71', 'e74c3c', 'f39c12', '9b59b6'];
          const randIndex = Math.floor(Math.random() * colors.length);
          const color = colors[randIndex];
          validUrl = `https://dummyimage.com/400x600/${color}/ffffff&text=${encodeURIComponent(product.name || 'Product')}`;
          urlSource = 'dummy-fallback';
          console.log(`[API FLOW] Used dummy fallback: "${oldUrl}" → "${validUrl}"`);
        }
        
        console.log(`[API FLOW] Final image URL (${urlSource}): "${validUrl}"`);
        
        return {
          ...image,
          url: validUrl
        };
      });
      
      // If no images were found, add a dummy image
      if (processedImages.length === 0) {
        console.log(`[API FLOW] No images found for product ${product.id}, adding dummy image`);
        const colors = ['3498db', '2ecc71', 'e74c3c', 'f39c12', '9b59b6'];
        const randIndex = Math.floor(Math.random() * colors.length);
        const color = colors[randIndex];
        const dummyUrl = `https://dummyimage.com/400x600/${color}/ffffff&text=${encodeURIComponent(product.name || 'Product')}`;
        
        processedImages.push({
          id: `dummy-${product.id}`,
          url: dummyUrl
        });
        
        console.log(`[API FLOW] Added dummy image: "${dummyUrl}"`);
      }
      
      console.log(`[API FLOW] Finished processing ${processedImages.length} images for product ${product.id}`);
      
      return {
        ...product,
        images: processedImages
      };
    });
    
    console.log(`[API FLOW] Returning ${validatedProducts.length} validated products to the app`);
    
    // Log a sample of what we're returning
    if (validatedProducts.length > 0) {
      const sample = validatedProducts[0];
      console.log(`[API FLOW] Sample validated product (${sample.id}):`);
      console.log(`  name: ${sample.name}`);
      console.log(`  brand: ${sample.brand}`);
      console.log(`  price: ${sample.price}`);
      console.log(`  images: ${JSON.stringify(sample.images)}`);
    }
    
    return validatedProducts;
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