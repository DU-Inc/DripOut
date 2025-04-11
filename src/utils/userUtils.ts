/**
 * Utility functions for user-related operations
 */

/**
 * Check if a userId is likely to be a real user (not a mock or demo user)
 * @param userId - The userId to check
 * @returns boolean indicating if this appears to be a real user ID
 */
export const isRealUserId = (userId: string | null | undefined): boolean => {
  if (!userId) return false;
  
  // If userId is not a string, it's not real
  if (typeof userId !== 'string') return false;
  
  // Check for common fake user indicators
  const fakeUserPatterns = ['unknown', 'mock', 'demo', 'test', 'sample', 'dummy'];
  return !fakeUserPatterns.some(pattern => userId.toLowerCase().includes(pattern));
};