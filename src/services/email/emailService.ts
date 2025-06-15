import functions from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for rate limiting
const MAX_VERIFICATION_ATTEMPTS = 5;
const COOLDOWN_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CODE_REQUEST_COOLDOWN_MS = 60 * 1000; // 60 seconds between code requests

// Request verification code from Firebase Cloud Function
export const requestVerificationCode = async (email: string): Promise<boolean> => {
  try {
    // Check if we're in a cooldown period for this email
    const cooldownKey = `verification_cooldown_${email}`;
    const cooldownEnd = await AsyncStorage.getItem(cooldownKey);
    
    if (cooldownEnd) {
      const endTime = parseInt(cooldownEnd);
      if (Date.now() < endTime) {
        const minutesLeft = Math.ceil((endTime - Date.now()) / 60000);
        throw new Error(`Too many attempts. Please try again in ${minutesLeft} minutes.`);
      } else {
        // Cooldown expired, remove it
        await AsyncStorage.removeItem(cooldownKey);
      }
    }
    
    // Check attempt count for this email
    const attemptsKey = `verification_attempts_${email}`;
    const attemptsStr = await AsyncStorage.getItem(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr) : 0;
    
    // If attempts exceed limit, set cooldown
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      const cooldownEnd = Date.now() + COOLDOWN_DURATION_MS;
      await AsyncStorage.setItem(cooldownKey, cooldownEnd.toString());
      await AsyncStorage.removeItem(attemptsKey); // Reset attempts counter
      throw new Error("Maximum verification attempts reached. Please try again later.");
    }
    
    // Get a callable reference to the sendVerificationEmailFn
    const sendVerificationEmailFn = functions().httpsCallable('sendVerificationEmailFn');
    
    // Call the cloud function with the email
    const result = await sendVerificationEmailFn({ email });
    
    // Log the result
    console.log('Verification code sent successfully:', result.data);
    
    // Update attempts counter
    await AsyncStorage.setItem(attemptsKey, (attempts + 1).toString());
    
    // Set the last sent timestamp
    await AsyncStorage.setItem(`verification_last_sent_${email}`, Date.now().toString());
    
    return true;
  } catch (error: any) {
    console.error('Error requesting verification code:', error);
    
    // Log more detailed error information
    if (error?.code) console.error('Error code:', error.code);
    if (error?.details) console.error('Error details:', error.details);
    if (error?.message) console.error('Error message:', error.message);
    
    // Format user-friendly error messages based on error type
    if (error?.code === 'already-exists' || 
        (error?.message && error.message.includes('already in use'))) {
      throw new Error("This email is already registered. Please sign in instead.");
    } else if (error?.code === 'resource-exhausted' || 
              (error?.message && error.message.includes('attempts'))) {
      throw new Error("Too many verification attempts. Please try again later.");
    } else if (error?.code === 'unavailable' || 
              (error?.message && error.message.includes('network'))) {
      throw new Error("We're experiencing network issues. Please try again in a few minutes.");
    } else if (error?.message && error.message.includes('cooldown')) {
      // Pass through cooldown errors
      throw error;
    } else {
      // Generic error for anything else
      throw new Error("Verification failed. Please try again in a few moments.");
    }
  }
};

// Verify a code
export const verifyCode = async (email: string, submittedCode: string): Promise<boolean> => {
  try {
    // Get a callable reference to the verifyEmailFn
    const verifyEmailFn = functions().httpsCallable('verifyEmailFn');
    
    // Call the cloud function with the email and verification code
    const result = await verifyEmailFn({ 
      email, 
      code: submittedCode 
    });
    
    // Check the verification result
    const data = result.data as any;
    
    // If verification was successful, clear rate limiting data
    if (data?.verified === true) {
      await AsyncStorage.removeItem(`verification_attempts_${email}`);
      await AsyncStorage.removeItem(`verification_cooldown_${email}`);
      await AsyncStorage.removeItem(`verification_last_sent_${email}`);
      await AsyncStorage.removeItem(`verification_failed_attempts_${email}`);
    }
    
    return data?.verified === true;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    
    // Log more detailed error information
    if (error?.code) console.error('Error code:', error.code);
    if (error?.details) console.error('Error details:', error.details);
    if (error?.message) console.error('Error message:', error.message);
    
    // Track failed verification attempts
    const failedAttemptsKey = `verification_failed_attempts_${email}`;
    const attemptsStr = await AsyncStorage.getItem(failedAttemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr) : 0;
    
    // Increment and store failed attempts
    const newAttempts = attempts + 1;
    await AsyncStorage.setItem(failedAttemptsKey, newAttempts.toString());
    
    // If too many failed attempts, set a cooldown
    if (newAttempts >= 3) {
      const cooldownKey = `verification_cooldown_${email}`;
      const cooldownEnd = Date.now() + COOLDOWN_DURATION_MS;
      await AsyncStorage.setItem(cooldownKey, cooldownEnd.toString());
      await AsyncStorage.removeItem(failedAttemptsKey); // Reset failed attempts
      throw new Error("Too many failed attempts. Please try again in 15 minutes.");
    }
    
    // Format user-friendly error messages based on error type
    if (error?.code === 'invalid-argument' || 
        (error?.message && error.message.includes('Invalid verification code'))) {
      throw new Error(`Incorrect code. ${3 - newAttempts} attempts remaining.`);
    } else if (error?.code === 'deadline-exceeded' || 
              (error?.message && error.message.includes('expired'))) {
      throw new Error("Code expired. Please request a new one.");
    } else if (error?.code === 'resource-exhausted' || 
              (error?.message && error.message.includes('Maximum verification attempts'))) {
      throw new Error("Too many verification attempts. Please try again later.");
    } else if (error?.code === 'not-found' || 
              (error?.message && error.message.includes('No verification code found'))) {
      throw new Error("Verification code not found. Please request a new code.");
    } else if (error?.code === 'unavailable' || 
              (error?.message && error.message.includes('network'))) {
      throw new Error("Network issue. Please check your connection and try again.");
    } else {
      // Generic error for anything else
      throw new Error("Verification failed. Please try again.");
    }
  }
};

// Function to request and send verification code
export const sendAndStoreVerificationCode = async (email: string): Promise<boolean> => {
  try {
    // Check if we need to enforce a minimum interval between code requests
    const lastSentKey = `verification_last_sent_${email}`;
    const lastSentStr = await AsyncStorage.getItem(lastSentKey);
    
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr);
      const timeSinceLastSent = Date.now() - lastSent;
      
      // Enforce a 60-second minimum interval between code requests
      if (timeSinceLastSent < CODE_REQUEST_COOLDOWN_MS) {
        const secondsToWait = Math.ceil((CODE_REQUEST_COOLDOWN_MS - timeSinceLastSent) / 1000);
        throw new Error(`Please wait ${secondsToWait} seconds before requesting another code.`);
      }
    }
    
    // Use the cloud function to handle everything
    return await requestVerificationCode(email);
  } catch (error) {
    console.error('Error in sendAndStoreVerificationCode:', error);
    throw error;
  }
}; 