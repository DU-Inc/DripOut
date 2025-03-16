import axios from 'axios';

// API configuration
const API_BASE_URL = 'http://your-api-host:8000'; // Replace with actual API URL in production
const API_KEY = 'your_api_key'; // Replace with actual API key in production

// Initialize API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  timeout: 10000
});

/**
 * Search for product recommendations based on query and price range
 */
export async function searchProducts(query: string, priceRange: [number, number] = [0, 1000], limit: number = 10) {
  try {
    const response = await apiClient.post('/search', {
      query,
      price_range: priceRange,
      limit
    });
    return response.data.results;
  } catch (error) {
    console.error('Search failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Product type definition
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  url: string;
  site: string;
}
