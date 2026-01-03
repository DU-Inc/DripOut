import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../Config/apiConfig';
import { getAuthToken } from '../utils/authToken';

/**
 * User statistics interface matching the API response
 */
export interface UserStats {
  firebase_uid: string;
  email?: string;
  tier: string;
  usage_today: {
    recommendations: number;
    scrapes: number;
    searches: number;
    try_ons: number;
  };
  limits: {
    recommendations: number;  // 15
    scrapes: number;          // 3
    searches: number;         // 100
    try_ons: number;          // 20
  };
  remaining: {
    recommendations: number;
    scrapes: number;
    searches: number;
    try_ons: number;
  };
}

/**
 * Rate limit error interface
 */
export interface RateLimitError {
  error: string;
  message: string;
  action: string;
  current_count: number;
  limit: number;
  reset_time: string;
}

/**
 * Get user statistics including usage and remaining limits
 * @returns Promise with user stats
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('User not authenticated. Please sign in to view your stats.');
    }
    
    const response = await axios.get<UserStats>(`${API_BASE_URL}/user/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Handle 401 Unauthorized
      if (axiosError.response?.status === 401) {
        // Try refreshing token once
        try {
          const newToken = await getAuthToken(true);
          if (newToken) {
            const response = await axios.get<UserStats>(`${API_BASE_URL}/user/stats`, {
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            });
            return response.data;
          }
        } catch (refreshError) {
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      // Handle other errors
      if (axiosError.response?.data) {
        const errorData = axiosError.response.data as any;
        throw new Error(errorData.detail || errorData.message || 'Failed to fetch user stats');
      }
      
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    throw error;
  }
};

/**
 * Format remaining limits for display
 */
export const formatRemainingLimits = (stats: UserStats): string => {
  const { remaining, limits } = stats;
  return `Recommendations: ${remaining.recommendations}/${limits.recommendations} | ` +
         `Scrapes: ${remaining.scrapes}/${limits.scrapes} | ` +
         `Searches: ${remaining.searches}/${limits.searches} | ` +
         `Try-ons: ${remaining.try_ons}/${limits.try_ons}`;
};

/**
 * Check if user has reached a specific limit
 */
export const hasReachedLimit = (stats: UserStats, action: 'recommendations' | 'scrapes' | 'searches' | 'try_ons'): boolean => {
  return stats.remaining[action] <= 0;
};

