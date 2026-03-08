// Simple test file for session manager functionality
// This can be run manually to verify session management is working

import { sessionManager } from './sessionManager';

export const testSessionManager = async () => {
  console.log('🧪 Testing Session Manager...');
  
  try {
    // Test 1: Get session info
    console.log('Test 1: Getting session info...');
    const sessionInfo = await sessionManager.getSessionInfo();
    console.log('Session Info:', sessionInfo);
    
    // Test 2: Get session metadata
    console.log('Test 2: Getting session metadata...');
    const metadata = await sessionManager.getSessionMetadata();
    console.log('Session Metadata:', metadata);
    
    // Test 3: Check session validity
    console.log('Test 3: Checking session validity...');
    const isValid = await sessionManager.isSessionValid();
    console.log('Session Valid:', isValid);
    
    // Test 4: Get current user ID
    console.log('Test 4: Getting current user ID...');
    const userId = sessionManager.getCurrentUserId();
    console.log('Current User ID:', userId);
    
    console.log('✅ All session manager tests completed successfully!');
    
    return {
      sessionInfo,
      metadata,
      isValid,
      userId
    };
    
  } catch (error) {
    console.error('❌ Session manager test failed:', error);
    throw error;
  }
};

// Export for manual testing
export default testSessionManager; 