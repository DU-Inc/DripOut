import { db } from '../Config/firebaseconfig';
import { auth } from '../Config/firebaseconfig';
import firestore from '@react-native-firebase/firestore';

/**
 * Interface for Message document
 */
export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: any;
  read: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  participants?: string[]; // Array of participant IDs
}

/**
 * Interface for Conversation document (to track conversations between users)
 */
export interface Conversation {
  id?: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  lastMessageSenderId?: string;
  unreadCount?: {[userId: string]: number};
  updatedAt: any;
}

/**
 * Interface for Conversation with user details
 */
export interface ConversationWithDetails extends Conversation {
  otherUserName: string;
  otherUserAvatar: string | null;
  otherUserId: string;
  lastMessageTime: string;
}

// Helper function to safely get current user
const getCurrentUser = () => {
  try {
    return auth().currentUser;
  } catch (error) {
    console.error('Error accessing auth().currentUser:', error);
    return null;
  }
};

/**
 * Send a message to a user
 * @param receiverId - The ID of the recipient
 * @param text - The message text
 * @returns Promise with the message ID
 */
export const sendMessage = async (receiverId: string, text: string, retries: number = 2): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to send messages');
    }

    const senderId = currentUser.uid;
    const senderName = currentUser.displayName || 'Anonymous';
    const senderAvatar = currentUser.photoURL;

    console.log(`📤 [MessageService] Sending message from ${senderId.substring(0, 8)}... to ${receiverId.substring(0, 8)}...`);
    console.log(`📤 [MessageService] Message text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    // Enhanced receiver validation with detailed error reporting
    let receiverExists = false;
    let receiverData = null;
    try {
      console.log(`🔍 [MessageService] Verifying receiver user: ${receiverId}`);
      const receiverDoc = await db.collection('users').doc(receiverId).get();
      
      if (!receiverDoc.exists()) {
        console.error(`❌ [MessageService] CRITICAL: Receiver user ${receiverId} does not exist in users collection`);
        throw new Error(`User ${receiverId} not found. They may have deleted their account.`);
      } else {
        receiverExists = true;
        receiverData = receiverDoc.data();
        console.log(`✅ [MessageService] Receiver user verified: ${receiverData?.username || receiverData?.displayName || receiverId}`);
      }
    } catch (firestoreError: any) {
      console.error(`❌ [MessageService] Firestore error during receiver verification:`, {
        error: firestoreError,
        code: firestoreError?.code,
        message: firestoreError?.message,
        receiverId
      });
      
      if (firestoreError?.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to verify user. Please check your account permissions.');
      } else if (firestoreError?.code === 'not-found') {
        throw new Error(`User not found. They may have deleted their account.`);
      } else {
        throw new Error(`Failed to verify user: ${firestoreError?.message || 'Unknown error'}`);
      }
    }

    // Create or update the conversation document
    const conversationId = getConversationId(senderId, receiverId);
    console.log(`💬 [MessageService] Generated conversation ID: ${conversationId}`);
    
    if (conversationId.length < 10 || !conversationId.includes('_')) {
      console.error(`❌ [MessageService] Invalid conversation ID generated: ${conversationId}`);
      throw new Error('Failed to generate valid conversation ID');
    }
    
    const conversationRef = db.collection('conversations').doc(conversationId);
    
    let conversationSnap;
    try {
      console.log(`🔍 [MessageService] Checking if conversation exists: ${conversationId}`);
      conversationSnap = await conversationRef.get();
      console.log(`📄 [MessageService] Conversation exists: ${conversationSnap.exists()}`);
    } catch (conversationError: any) {
      console.error(`❌ [MessageService] Error checking conversation existence:`, {
        error: conversationError,
        code: conversationError?.code,
        message: conversationError?.message,
        conversationId
      });
      
      if (conversationError?.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to access conversation. Please check your account permissions.');
      } else if (conversationError?.code === 'not-found') {
        // This is actually expected for new conversations
        console.log(`📄 [MessageService] Conversation doesn't exist yet, will create new one`);
        conversationSnap = { exists: () => false };
      } else {
        throw new Error(`Failed to check conversation: ${conversationError?.message || 'Unknown error'}`);
      }
    }
    
    const timestamp = firestore.FieldValue.serverTimestamp();
    
    // Check if conversation already exists
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const currentUnreadCount = conversationData?.unreadCount?.[receiverId] || 0;
      
      try {
        console.log(`🔄 [MessageService] Updating existing conversation: ${conversationId}`);
        // Update existing conversation
        await conversationRef.update({
          lastMessage: text,
          lastMessageTime: timestamp,
          lastMessageSenderId: senderId,
          updatedAt: timestamp,
          // Increment unread count for receiver
          [`unreadCount.${receiverId}`]: currentUnreadCount + 1
        });
        console.log(`✅ [MessageService] Successfully updated existing conversation`);
      } catch (updateError: any) {
        console.error(`❌ [MessageService] Error updating existing conversation:`, {
          error: updateError,
          code: updateError?.code,
          message: updateError?.message,
          conversationId
        });
        throw new Error(`Failed to update conversation: ${updateError?.message || 'Unknown error'}`);
      }
    } else {
      try {
        console.log(`🆕 [MessageService] Creating new conversation: ${conversationId}`);
        // Create new conversation
        await conversationRef.set({
          participants: [senderId, receiverId],
          lastMessage: text,
          lastMessageTime: timestamp,
          lastMessageSenderId: senderId,
          updatedAt: timestamp,
          // Initialize unread counters
          unreadCount: {
            [receiverId]: 1, // Receiver has 1 unread
            [senderId]: 0    // Sender has 0 unread
          }
        });
        console.log(`✅ [MessageService] Successfully created new conversation`);
      } catch (createError: any) {
        console.error(`❌ [MessageService] Error creating new conversation:`, {
          error: createError,
          code: createError?.code,
          message: createError?.message,
          conversationId,
          senderId: senderId.substring(0, 8),
          receiverId: receiverId.substring(0, 8)
        });
        
        if (createError?.code === 'permission-denied') {
          throw new Error('Permission denied: Unable to create conversation. Please check your account permissions.');
        } else if (createError?.code === 'not-found') {
          throw new Error('Firestore collection not found. Please contact support.');
        } else {
          throw new Error(`Failed to create conversation: ${createError?.message || 'Unknown error'}`);
        }
      }
    }

    // Add the message document
    let messageDoc;
    try {
      console.log(`📝 [MessageService] Adding message to messages collection`);
      messageDoc = await db.collection('messages').add({
        senderId,
        receiverId,
        participants: [senderId, receiverId].sort(), // Ensure consistent ordering for efficient querying
        text,
        createdAt: timestamp,
        read: false,
        senderName,
        senderAvatar
      });
      console.log(`✅ [MessageService] Message added successfully: ${messageDoc.id}`);
    } catch (messageError: any) {
      console.error(`❌ [MessageService] Error adding message to collection:`, {
        error: messageError,
        code: messageError?.code,
        message: messageError?.message,
        senderId: senderId.substring(0, 8),
        receiverId: receiverId.substring(0, 8)
      });
      
      if (messageError?.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to send message. Please check your account permissions.');
      } else if (messageError?.code === 'not-found') {
        throw new Error('Messages collection not found. Please contact support.');
      } else {
        throw new Error(`Failed to send message: ${messageError?.message || 'Unknown error'}`);
      }
    }

    console.log(`✅ [MessageService] Message sent successfully to ${receiverId.substring(0, 8)}...: ${messageDoc.id}`);
    return messageDoc.id;
  } catch (error: any) {
    console.error(`❌ [MessageService] FINAL ERROR - Message sending failed (attempt ${3 - retries}/3):`, {
      error,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      retriesLeft: retries
    });
    
    // Retry logic for transient errors
    if (retries > 0 && shouldRetryError(error)) {
      console.log(`🔄 [MessageService] Retrying message send in 1 second... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendMessage(receiverId, text, retries - 1);
    }
    
    // Re-throw with more specific error message
    if (error?.message && typeof error.message === 'string') {
      throw error; // Keep our custom error messages
    } else {
      throw new Error(`Failed to send message: ${error?.code || 'Unknown error'}`);
    }
  }
};

/**
 * Determines if an error should trigger a retry
 */
const shouldRetryError = (error: any): boolean => {
  if (!error?.code) return false;
  
  // Retry on network/timeout issues but not on permission/validation errors
  const retryableCodes = [
    'unavailable',           // Firestore temporarily unavailable
    'deadline-exceeded',     // Request timeout
    'aborted',              // Request aborted
    'internal',             // Internal server error
    'unknown',              // Unknown error that might be transient
    'resource-exhausted'    // Rate limiting (might resolve quickly)
  ];
  
  return retryableCodes.includes(error.code);
};

/**
 * Get messages between two users
 * @param otherUserId - The ID of the other user in the conversation
 * @param limit - Optional limit on number of messages to return
 * @returns Promise with array of messages
 */
export const getMessages = async (otherUserId: string, messageLimit = 100): Promise<Message[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to view messages');
    }

    const userId = currentUser.uid;
    const participants = [userId, otherUserId].sort(); // Ensure consistent ordering
    
    console.log(`💬 Loading messages between ${userId.substring(0, 8)}... and ${otherUserId.substring(0, 8)}...`);
    
    // Use efficient query with participants array
    const querySnapshot = await db
      .collection('messages')
      .where('participants', '==', participants)
      .orderBy('createdAt', 'asc')
      .limit(messageLimit)
      .get();
    
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Message
    }));
    
    console.log(`✅ Found ${messages.length} messages`);

    // Mark messages as read if they were sent to the current user
    const markAsReadPromises = messages
      .filter(message => message.receiverId === userId && !message.read && message.id)
      .map(message => 
        db.collection('messages').doc(message.id!).update({ read: true })
          .catch(error => console.error(`Failed to mark message ${message.id} as read:`, error))
      );
    
    if (markAsReadPromises.length > 0) {
      await Promise.all(markAsReadPromises);
    }

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Get all conversations for the current user
 * @returns Promise with array of conversations with user details
 */
export const getConversations = async (): Promise<ConversationWithDetails[]> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to view conversations');
    }

    const userId = currentUser.uid;
    
    // Query for conversations that include the current user
    const querySnapshot = await db
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .get();
    
    // Process conversations to include user details
    const conversations: ConversationWithDetails[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const conversation = docSnapshot.data() as Conversation;
      const otherUserId = conversation.participants.find(id => id !== userId);
      
      // Skip self-conversations or conversations with undefined otherUserId
      if (otherUserId && otherUserId !== userId) {
        // Get other user's profile details
        const userDoc = await db.collection('users').doc(otherUserId).get();
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Format timestamp
        let timeAgo = 'Just now';
        if (conversation.lastMessageTime) {
          const lastMessageDate = conversation.lastMessageTime.toDate();
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
        
        conversations.push({
          ...conversation,
          id: docSnapshot.id,
          otherUserName: userData?.displayName || userData?.username || 'Unknown User',
          otherUserAvatar: userData?.photoURL || null,
          otherUserId,
          lastMessageTime: timeAgo
        });
      }
    }
    
    // Sort conversations by updatedAt timestamp (most recent first)
    return conversations.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || new Date(0);
      const bTime = b.updatedAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

/**
 * Generate a consistent conversation ID for two users
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns Consistent conversation ID
 */
export const getConversationId = (userId1: string, userId2: string): string => {
  // Sort the IDs to ensure consistency regardless of who initiates the conversation
  return [userId1, userId2].sort().join('_');
};

/**
 * Mark all messages from a user as read
 * @param otherUserId - The ID of the other user in the conversation
 * @returns Promise indicating success
 */
export const markConversationAsRead = async (otherUserId: string): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to mark messages as read');
    }

    const userId = currentUser.uid;
    
    // Update the conversation document to reset unread count
    const conversationId = getConversationId(userId, otherUserId);
    const conversationRef = db.collection('conversations').doc(conversationId);
    
    // Check if conversation exists before trying to update
    const conversationSnap = await conversationRef.get();
    if (conversationSnap.exists()) {
      try {
        await conversationRef.update({
          [`unreadCount.${userId}`]: 0
        });
        console.log(`Reset unread count for conversation ${conversationId}`);
      } catch (error) {
        console.error('Failed to update conversation unread count:', error);
        // Continue even if this fails
      }
    } else {
      console.log(`Conversation ${conversationId} does not exist yet, skipping unread count reset`);
    }
    
    // Mark all unread messages as read
    const querySnapshot = await db
      .collection('messages')
      .where('senderId', '==', otherUserId)
      .where('receiverId', '==', userId)
      .where('read', '==', false)
      .get();
    console.log(`Found ${querySnapshot.size} unread messages to mark as read`);
    
    // Update each message individually instead of using batch
    const updatePromises = querySnapshot.docs.map(docSnapshot => {
      return db.collection('messages').doc(docSnapshot.id).update({ read: true })
        .catch(error => {
          console.error(`Failed to mark message ${docSnapshot.id} as read:`, error);
          return Promise.resolve(); // Continue with other updates even if one fails
        });
    });
    
    await Promise.all(updatePromises);
    console.log(`Marked ${querySnapshot.size} messages as read from ${otherUserId}`);
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    // Don't throw error to prevent disrupting the UI
  }
};

/**
 * Subscribe to real-time updates for messages in a conversation
 * @param otherUserId - The ID of the other user in the conversation
 * @param callback - Function to call with updated messages array
 * @returns Unsubscribe function
 */
export const subscribeToMessages = (
  otherUserId: string, 
  callback: (messages: Message[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('You must be logged in to subscribe to messages');
    return () => {};
  }

  const userId = currentUser.uid;
  const participants = [userId, otherUserId].sort(); // Ensure consistent ordering
  
  console.log(`🔔 Setting up real-time subscription for ${userId.substring(0, 8)}... and ${otherUserId.substring(0, 8)}...`);
  
  // Use efficient query with participants array
  const messagesQuery = db
    .collection('messages')
    .where('participants', '==', participants)
    .orderBy('createdAt', 'asc')
    .limit(100);

  // Set up the listener
  const unsubscribe = messagesQuery.onSnapshot((snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Message
    }));
    
    callback(messages);
    
    // Mark new messages as read
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const message = change.doc.data() as Message;
        if (message.receiverId === userId && !message.read) {
          try {
            await db.collection('messages').doc(change.doc.id).update({ read: true });
          } catch (error) {
            console.error(`Failed to mark message ${change.doc.id} as read:`, error);
          }
        }
      }
    });
  }, (error) => {
    console.error('Error in message snapshot listener:', error);
  });
  
  return unsubscribe;
};

/**
 * Subscribe to real-time updates for user's conversations
 * @param callback - Function to call with updated conversations array
 * @returns Unsubscribe function
 */
export const subscribeToConversations = (
  callback: (conversations: ConversationWithDetails[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.error('You must be logged in to subscribe to conversations');
    return () => {};
  }

  const userId = currentUser.uid;
  
  // Query for conversations that include the current user
  const conversationsQuery = db
    .collection('conversations')
    .where('participants', 'array-contains', userId);
  
  // Set up the listener
  const unsubscribe = conversationsQuery.onSnapshot(async (snapshot) => {
    try {
      // Process conversations to include user details
      const conversations: ConversationWithDetails[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const conversation = docSnapshot.data() as Conversation;
        const otherUserId = conversation.participants.find(id => id !== userId);
        
        // Skip self-conversations or conversations with undefined otherUserId
        if (otherUserId && otherUserId !== userId) {
          // Get other user's profile details
          try {
            const userDoc = await db.collection('users').doc(otherUserId).get();
            const userData = userDoc.exists() ? userDoc.data() : {};
            
            // Format timestamp
            let timeAgo = 'Just now';
            if (conversation.lastMessageTime) {
              const lastMessageDate = conversation.lastMessageTime.toDate();
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
            
            conversations.push({
              ...conversation,
              id: docSnapshot.id,
              otherUserName: userData?.displayName || userData?.username || 'Unknown User',
              otherUserAvatar: userData?.photoURL || null,
              otherUserId,
              lastMessageTime: timeAgo
            });
          } catch (error) {
            console.error(`Error getting user data for ${otherUserId}:`, error);
            // Add conversation with minimal info if we can't get user details
            conversations.push({
              ...conversation,
              id: docSnapshot.id,
              otherUserName: 'Unknown User',
              otherUserAvatar: null,
              otherUserId,
              lastMessageTime: 'Unknown'
            });
          }
        }
      }
      
      // Sort conversations by updatedAt timestamp (most recent first)
      const sortedConversations = conversations.sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.() || new Date(0);
        const bTime = b.updatedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      callback(sortedConversations);
    } catch (error) {
      console.error('Error processing conversations update:', error);
    }
  }, (error) => {
    console.error('Error in conversations snapshot listener:', error);
  });
  
  return unsubscribe;
};

/**
 * Delete a message
 * @param messageId - The ID of the message to delete
 * @returns Promise indicating success
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to delete messages');
    }

    const userId = currentUser.uid;
    
    // Verify the user is the sender
    const messageRef = db.collection('messages').doc(messageId);
    const messageSnap = await messageRef.get();
    
    if (!messageSnap.exists()) {
      throw new Error('Message not found');
    }
    
    const message = messageSnap.data() as Message;
    
    if (message.senderId !== userId) {
      throw new Error('You can only delete messages you sent');
    }
    
    // Delete the message
    await messageRef.delete();
    console.log(`Deleted message: ${messageId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};