import { db } from '../../Config/firebaseconfig';
import { auth } from '../../Config/firebaseconfig';
import { isAppleAnonymizedEmail } from '../../utils/cryptoUtils';

export interface ConsentRecord {
  userId: string;
  consentType: 'email' | 'phone' | 'social' | 'profile';
  consentGiven: boolean;
  consentDate: Date;
  linkedData?: any;
  additionalInfo?: string;
}

/**
 * Checks if current user has anonymized Apple ID
 */
export const isCurrentUserAnonymized = async (): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return false;

  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    
    // Check both the stored flag and email pattern
    return userData?.isAnonymizedUser === true || 
           isAppleAnonymizedEmail(userData?.email) ||
           isAppleAnonymizedEmail(currentUser.email);
  } catch (error) {
    console.error('Error checking anonymized status:', error);
    return false;
  }
};

/**
 * Records user consent for linking data to anonymized Apple ID
 */
export const recordConsent = async (
  consentType: ConsentRecord['consentType'],
  consentGiven: boolean,
  linkedData?: any,
  additionalInfo?: string
): Promise<void> => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }

  const consentRecord: ConsentRecord = {
    userId: currentUser.uid,
    consentType,
    consentGiven,
    consentDate: new Date(),
    linkedData,
    additionalInfo
  };

  try {
    // Store consent record in Firestore
    await db.collection('appleConsentRecords').add(consentRecord);
    
    // Update user document with consent summary
    const userRef = db.collection('users').doc(currentUser.uid);
    const consentSummary = {
      [`appleConsent_${consentType}`]: consentGiven,
      [`appleConsentDate_${consentType}`]: new Date()
    };
    
    await userRef.update(consentSummary);
    
    console.log(`Consent recorded for ${consentType}:`, consentGiven);
  } catch (error) {
    console.error('Error recording consent:', error);
    throw error;
  }
};

/**
 * Checks if user has given consent for a specific type of data linking
 */
export const hasConsentForType = async (
  consentType: ConsentRecord['consentType']
): Promise<boolean> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return false;

  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    
    return userData?.[`appleConsent_${consentType}`] === true;
  } catch (error) {
    console.error('Error checking consent:', error);
    return false;
  }
};

/**
 * Gets all consent records for current user
 */
export const getUserConsentHistory = async (): Promise<ConsentRecord[]> => {
  const currentUser = auth().currentUser;
  if (!currentUser) return [];

  try {
    const consentSnapshot = await db
      .collection('appleConsentRecords')
      .where('userId', '==', currentUser.uid)
      .orderBy('consentDate', 'desc')
      .get();

    return consentSnapshot.docs.map(doc => doc.data() as ConsentRecord);
  } catch (error) {
    console.error('Error fetching consent history:', error);
    return [];
  }
};

/**
 * Links email to anonymized Apple ID with consent
 */
export const linkEmailWithConsent = async (
  email: string,
  consentGiven: boolean
): Promise<void> => {
  if (!consentGiven) {
    throw new Error('User consent required to link email to anonymized Apple ID');
  }

  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }

  try {
    // Record consent
    await recordConsent('email', true, { email }, 'Email linking to anonymized Apple ID');
    
    // Update user document with linked email
    await db.collection('users').doc(currentUser.uid).update({
      linkedEmail: email,
      linkedEmailDate: new Date(),
      emailLinkingConsent: true
    });

    console.log('Email linked to anonymized Apple ID with consent');
  } catch (error) {
    console.error('Error linking email with consent:', error);
    throw error;
  }
};

/**
 * Links phone number to anonymized Apple ID with consent
 */
export const linkPhoneWithConsent = async (
  phoneNumber: string,
  consentGiven: boolean
): Promise<void> => {
  if (!consentGiven) {
    throw new Error('User consent required to link phone to anonymized Apple ID');
  }

  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }

  try {
    // Record consent
    await recordConsent('phone', true, { phoneNumber }, 'Phone linking to anonymized Apple ID');
    
    // Update user document with linked phone
    await db.collection('users').doc(currentUser.uid).update({
      linkedPhone: phoneNumber,
      linkedPhoneDate: new Date(),
      phoneLinkingConsent: true
    });

    console.log('Phone linked to anonymized Apple ID with consent');
  } catch (error) {
    console.error('Error linking phone with consent:', error);
    throw error;
  }
};

/**
 * Links social account to anonymized Apple ID with consent
 */
export const linkSocialAccountWithConsent = async (
  provider: string,
  socialData: any,
  consentGiven: boolean
): Promise<void> => {
  if (!consentGiven) {
    throw new Error('User consent required to link social account to anonymized Apple ID');
  }

  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }

  try {
    // Record consent
    await recordConsent('social', true, { provider, socialData }, `${provider} account linking to anonymized Apple ID`);
    
    // Update user document with linked social account
    await db.collection('users').doc(currentUser.uid).update({
      [`linked${provider}Account`]: socialData,
      [`linked${provider}Date`]: new Date(),
      [`${provider}LinkingConsent`]: true
    });

    console.log(`${provider} account linked to anonymized Apple ID with consent`);
  } catch (error) {
    console.error('Error linking social account with consent:', error);
    throw error;
  }
};