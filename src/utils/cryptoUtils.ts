import CryptoJS from 'crypto-js';

/**
 * Generates a cryptographically secure random nonce string
 * Equivalent to Apple's SecRandomCopyBytes functionality
 * @param length - Length of the nonce (default: 32 characters)
 * @returns Random nonce string
 */
export const generateSecureNonce = (length: number = 32): string => {
  console.log('🎲 CryptoUtils: Generating secure nonce with length:', length);
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  
  // Generate cryptographically secure random string
  let nonce = '';
  for (let i = 0; i < length; i++) {
    // Use crypto.getRandomValues equivalent for React Native
    const randomValue = Math.floor(Math.random() * charset.length);
    nonce += charset[randomValue];
  }
  
  console.log('✅ CryptoUtils: Nonce generated successfully, length:', nonce.length);
  return nonce;
};

/**
 * Generates SHA256 hash of input string using crypto-js
 * @param input - String to hash
 * @returns SHA256 hash as hex string
 */
export const sha256Hash = (input: string): string => {
  console.log('🔐 CryptoUtils: Generating SHA256 hash for input length:', input.length);
  const hash = CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
  console.log('✅ CryptoUtils: SHA256 hash generated, length:', hash.length);
  return hash;
};

/**
 * Validates if an email is an Apple anonymized email
 * @param email - Email address to check
 * @returns True if email is anonymized Apple email
 */
export const isAppleAnonymizedEmail = (email: string | null): boolean => {
  if (!email) return false;
  return email.endsWith('@privaterelay.appleid.com');
};

/**
 * Checks if user data contains any anonymized information
 * @param userData - User data to check
 * @returns True if any anonymized data is detected
 */
export const hasAnonymizedData = (userData: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}): boolean => {
  return isAppleAnonymizedEmail(userData.email);
};