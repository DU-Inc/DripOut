// src/utils/productIdGenerator.ts
// Centralized product ID generation to prevent collisions across screens

let globalProductIdCounter = 0;

/**
 * Generate truly unique product ID with context awareness
 * This prevents ID collisions between different screens/contexts
 */
export const generateUniqueProductId = (
  originalId: string | undefined, 
  prefix: string | undefined,
  context?: string
): string => {
  // For OverviewScreen context, ALWAYS generate unique IDs to prevent component recycling
  // This ensures that when products are refreshed, they get new IDs even if the API
  // returns the same originalId values
  if (context === 'overview') {
    const timestamp = Date.now();
    const counter = ++globalProductIdCounter;
    const random = Math.random().toString(36).substring(2, 8);
    const safePrefix = prefix || 'product';
    
    // Include originalId as part of the unique ID for debugging purposes
    const originalIdPart = originalId ? `-${originalId}` : '';
    
    return `${context}-${safePrefix}${originalIdPart}-${timestamp}-${counter}-${random}`;
  }
  
  // For other contexts, use original ID if available (existing behavior)
  if (originalId && originalId.trim() !== '') {
    return originalId;
  }
  
  // Generate truly unique ID with timestamp, counter, and random component
  const timestamp = Date.now();
  const counter = ++globalProductIdCounter;
  const random = Math.random().toString(36).substring(2, 8);
  const contextPrefix = context ? `${context}-` : '';
  const safePrefix = prefix || 'product';
  
  return `${contextPrefix}${safePrefix}-${timestamp}-${counter}-${random}`;
};

/**
 * Reset the global counter (useful for testing or app restarts)
 */
export const resetProductIdCounter = (): void => {
  globalProductIdCounter = 0;
};

/**
 * Get current counter value (useful for debugging)
 */
export const getCurrentProductIdCounter = (): number => {
  return globalProductIdCounter;
};