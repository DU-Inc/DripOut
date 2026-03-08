import { db, auth } from '../Config/firebaseconfig';
import firestore from '@react-native-firebase/firestore';
import { Product } from './recommendationService';

/**
 * Interface for Fashion Advisor Chat Message
 * Reuses existing patterns from messageService.ts
 */
export interface FashionAdvisorMessage {
  id?: string;
  sessionId: string;
  userId: string;
  type: 'user' | 'advisor';
  text?: string;
  timestamp: any; // Firestore timestamp
  products?: Product[];
  query?: string; // For user messages
  productsFound?: number; // For advisor messages
}

/**
 * Interface for Fashion Advisor Chat Session
 * Similar to Conversation interface from messageService.ts
 */
export interface FashionAdvisorSession {
  id?: string;
  userId: string;
  title: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  messageCount: number;
  lastQuery: string;
  isActive: boolean;
}

/**
 * Interface for Session with additional display info
 * Similar to ConversationWithDetails from messageService.ts
 */
export interface FashionAdvisorSessionWithDetails extends FashionAdvisorSession {
  lastMessageTime: string; // Formatted time ago
  preview: string; // Preview of first query or last message
}

/**
 * Get current authenticated user
 * Reuses pattern from messageService.ts
 */
const getCurrentUser = () => {
  return auth().currentUser;
};

/**
 * Create a new fashion advisor chat session
 * @param title - Auto-generated title from first query
 * @param firstQuery - The initial user query
 * @returns Promise with the session ID
 */
export const createFashionAdvisorSession = async (
  title: string, 
  firstQuery: string
): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to create a chat session');
    }

    const userId = currentUser.uid;
    const timestamp = firestore.FieldValue.serverTimestamp();
    
    // Create session document
    const sessionDoc = await db.collection('fashion_advisor_sessions').add({
      userId,
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
      messageCount: 0,
      lastQuery: firstQuery,
      isActive: true
    });

    console.log(`Fashion advisor session created: ${sessionDoc.id}`);
    return sessionDoc.id;
  } catch (error) {
    console.error('Error creating fashion advisor session:', error);
    throw error;
  }
};

/**
 * Save a message to a fashion advisor chat session
 * @param sessionId - The session ID
 * @param message - The message to save
 * @returns Promise with the message ID
 */
export const saveFashionAdvisorMessage = async (
  sessionId: string, 
  message: Omit<FashionAdvisorMessage, 'id' | 'sessionId' | 'timestamp'>
): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to save messages');
    }

    const timestamp = firestore.FieldValue.serverTimestamp();
    
    // Add message to session
    const messageDoc = await db.collection('fashion_advisor_messages').add({
      ...message,
      sessionId,
      timestamp
    });

    // Update session metadata
    const sessionRef = db.collection('fashion_advisor_sessions').doc(sessionId);
    await sessionRef.update({
      messageCount: firestore.FieldValue.increment(1),
      updatedAt: timestamp,
      lastQuery: message.type === 'user' ? message.query || message.text || '' : undefined
    });

    console.log(`Fashion advisor message saved: ${messageDoc.id}`);
    return messageDoc.id;
  } catch (error) {
    console.error('Error saving fashion advisor message:', error);
    throw error;
  }
};

/**
 * Get all messages for a fashion advisor chat session
 * @param sessionId - The session ID
 * @param limit - Optional limit on number of messages to return
 * @returns Promise with array of messages
 */
export const getFashionAdvisorMessages = async (
  sessionId: string, 
  messageLimit = 100
): Promise<FashionAdvisorMessage[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to view messages');
    }

    console.log(`💬 Loading fashion advisor messages for session: ${sessionId}`);
    
    const querySnapshot = await db
      .collection('fashion_advisor_messages')
      .where('sessionId', '==', sessionId)
      .orderBy('timestamp', 'asc')
      .limit(messageLimit)
      .get();
    
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FashionAdvisorMessage
    }));
    
    console.log(`✅ Found ${messages.length} fashion advisor messages`);
    return messages;
  } catch (error) {
    console.error('Error getting fashion advisor messages:', error);
    throw error;
  }
};

/**
 * Get all fashion advisor chat sessions for the current user
 * @returns Promise with array of sessions with details
 */
export const getFashionAdvisorSessions = async (): Promise<FashionAdvisorSessionWithDetails[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to view chat sessions');
    }

    const userId = currentUser.uid;
    
    console.log(`📋 Loading fashion advisor sessions for user: ${userId}`);
    
    // Query for sessions that belong to the current user
    const querySnapshot = await db
      .collection('fashion_advisor_sessions')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const sessions: FashionAdvisorSessionWithDetails[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const session = docSnapshot.data() as FashionAdvisorSession;
      
      // Format timestamp
      let timeAgo = 'Just now';
      if (session.updatedAt) {
        const lastMessageDate = session.updatedAt.toDate();
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60));
        
        if (diffMinutes < 1) {
          timeAgo = 'Just now';
        } else if (diffMinutes < 60) {
          timeAgo = `${diffMinutes}m`;
        } else if (diffMinutes < 24 * 60) {
          timeAgo = `${Math.floor(diffMinutes / 60)}h`;
        } else {
          timeAgo = `${Math.floor(diffMinutes / (60 * 24))}d`;
        }
      }
      
      sessions.push({
        ...session,
        id: docSnapshot.id,
        lastMessageTime: timeAgo,
        preview: session.lastQuery || 'No messages yet'
      });
    }
    
    console.log(`✅ Found ${sessions.length} fashion advisor sessions`);
    return sessions;
  } catch (error) {
    console.error('Error getting fashion advisor sessions:', error);
    throw error;
  }
};

/**
 * Delete a fashion advisor chat session and all its messages
 * @param sessionId - The session ID to delete
 * @returns Promise indicating success
 */
export const deleteFashionAdvisorSession = async (sessionId: string): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to delete sessions');
    }

    const userId = currentUser.uid;
    
    // Verify the session belongs to the current user
    const sessionRef = db.collection('fashion_advisor_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    
    if (!sessionSnap.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionSnap.data() as FashionAdvisorSession;
    if (session.userId !== userId) {
      throw new Error('You can only delete your own sessions');
    }
    
    // Use a batch to delete session and all messages atomically
    const batch = db.batch();
    
    // Delete the session
    batch.delete(sessionRef);
    
    // Delete all messages in the session
    const messagesSnapshot = await db
      .collection('fashion_advisor_messages')
      .where('sessionId', '==', sessionId)
      .get();
    
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted fashion advisor session ${sessionId} with ${messagesSnapshot.size} messages`);
  } catch (error) {
    console.error('Error deleting fashion advisor session:', error);
    throw error;
  }
};

/**
 * Update session title
 * @param sessionId - The session ID
 * @param newTitle - The new title
 * @returns Promise indicating success
 */
export const updateFashionAdvisorSessionTitle = async (
  sessionId: string, 
  newTitle: string
): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to update sessions');
    }

    const userId = currentUser.uid;
    
    // Verify the session belongs to the current user
    const sessionRef = db.collection('fashion_advisor_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    
    if (!sessionSnap.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionSnap.data() as FashionAdvisorSession;
    if (session.userId !== userId) {
      throw new Error('You can only update your own sessions');
    }
    
    await sessionRef.update({
      title: newTitle,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Updated fashion advisor session title: ${sessionId}`);
  } catch (error) {
    console.error('Error updating fashion advisor session title:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for fashion advisor messages in a session
 * @param sessionId - The session ID
 * @param callback - Function to call with updated messages array
 * @returns Unsubscribe function
 */
export const subscribeToFashionAdvisorMessages = (
  sessionId: string, 
  callback: (messages: FashionAdvisorMessage[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('You must be logged in to subscribe to messages');
    return () => {};
  }

  console.log(`🔔 Setting up real-time subscription for fashion advisor session: ${sessionId}`);
  
  const messagesQuery = db
    .collection('fashion_advisor_messages')
    .where('sessionId', '==', sessionId)
    .orderBy('timestamp', 'asc')
    .limit(100);

  // Set up the listener
  const unsubscribe = messagesQuery.onSnapshot((snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as FashionAdvisorMessage
    }));
    
    callback(messages);
  }, (error) => {
    console.error('Error in fashion advisor message snapshot listener:', error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for user's fashion advisor sessions
 * @param callback - Function to call with updated sessions array
 * @returns Unsubscribe function
 */
export const subscribeToFashionAdvisorSessions = (
  callback: (sessions: FashionAdvisorSessionWithDetails[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('You must be logged in to subscribe to sessions');
    return () => {};
  }

  const userId = currentUser.uid;
  
  console.log(`🔔 Setting up real-time subscription for fashion advisor sessions: ${userId}`);
  
  // Query for sessions that belong to the current user
  const sessionsQuery = db
    .collection('fashion_advisor_sessions')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc');
  
  // Set up the listener
  const unsubscribe = sessionsQuery.onSnapshot(async (snapshot) => {
    try {
      const sessions: FashionAdvisorSessionWithDetails[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const session = docSnapshot.data() as FashionAdvisorSession;
        
        // Format timestamp
        let timeAgo = 'Just now';
        if (session.updatedAt) {
          const lastMessageDate = session.updatedAt.toDate();
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - lastMessageDate.getTime()) / (1000 * 60));
          
          if (diffMinutes < 1) {
            timeAgo = 'Just now';
          } else if (diffMinutes < 60) {
            timeAgo = `${diffMinutes}m`;
          } else if (diffMinutes < 24 * 60) {
            timeAgo = `${Math.floor(diffMinutes / 60)}h`;
          } else {
            timeAgo = `${Math.floor(diffMinutes / (60 * 24))}d`;
          }
        }
        
        sessions.push({
          ...session,
          id: docSnapshot.id,
          lastMessageTime: timeAgo,
          preview: session.lastQuery || 'No messages yet'
        });
      }
      
      callback(sessions);
    } catch (error) {
      console.error('Error processing fashion advisor sessions update:', error);
    }
  }, (error) => {
    console.error('Error in fashion advisor sessions snapshot listener:', error);
  });
  
  return unsubscribe;
};

/**
 * Generate a title for a chat session based on the first query
 * @param query - The first user query
 * @returns A generated title
 */
export const generateSessionTitle = (query: string): string => {
  if (!query || query.trim().length === 0) {
    return 'Fashion Advice';
  }
  
  // Clean and truncate the query
  const cleanQuery = query.trim().toLowerCase();
  
  // Extract key words for title generation
  const words = cleanQuery.split(' ').slice(0, 4); // Take first 4 words
  const title = words.join(' ').replace(/[^\w\s]/g, ''); // Remove special characters
  
  // Capitalize first letter of each word
  const capitalizedTitle = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return capitalizedTitle || 'Fashion Advice';
}; 