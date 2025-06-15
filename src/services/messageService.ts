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
export const sendMessage = async (receiverId: string, text: string): Promise<string> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('You must be logged in to send messages');
    }

    const senderId = currentUser.uid;
    const senderName = currentUser.displayName || 'Anonymous';
    const senderAvatar = currentUser.photoURL;

    // Create or update the conversation document
    const conversationId = getConversationId(senderId, receiverId);
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationSnap = await conversationRef.get();
    
    const timestamp = firestore.FieldValue.serverTimestamp();
    
    // Check if conversation already exists
    if (conversationSnap.exists) {
      // Update existing conversation
      await conversationRef.update({
        lastMessage: text,
        lastMessageTime: timestamp,
        lastMessageSenderId: senderId,
        updatedAt: timestamp,
        // Increment unread count for receiver
        [`unreadCount.${receiverId}`]: (conversationSnap.data().unreadCount?.[receiverId] || 0) + 1
      });
    } else {
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
    }

    // Add the message document
    const messageDoc = await db.collection('messages').add({
      senderId,
      receiverId,
      participants: [senderId, receiverId], // Add participants array for querying
      text,
      createdAt: timestamp,
      read: false,
      senderName,
      senderAvatar
    });

    console.log(`Message sent to ${receiverId}: ${messageDoc.id}`);
    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
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
    
    // Simple query with just a time filter to avoid index requirements
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const querySnapshot = await db
      .collection('messages')
      .where('createdAt', '>', firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(200) // Get more messages to filter from
      .get();
    
    // Filter messages to only include those between these two users
    const allMessages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Message
    }));
    
    // Filter and sort messages
    const filteredMessages = allMessages
      .filter(message => 
        (message.senderId === userId && message.receiverId === otherUserId) || 
        (message.senderId === otherUserId && message.receiverId === userId)
      )
      .sort((a, b) => {
        // Sort by createdAt timestamp
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime.getTime() - bTime.getTime();
      });
    
    // Mark messages as read if they were sent to the current user
    filteredMessages.forEach(async (message) => {
      if (message.receiverId === userId && !message.read && message.id) {
        await db.collection('messages').doc(message.id).update({ read: true });
      }
    });

    // Return messages (already sorted by createdAt ascending)
    return filteredMessages;
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
        const userData = userDoc.exists ? userDoc.data() : {};
        
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
          otherUserName: userData.displayName || userData.username || 'Unknown User',
          otherUserAvatar: userData.photoURL || null,
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
    
    try {
      await conversationRef.update({
        [`unreadCount.${userId}`]: 0
      });
      console.log(`Reset unread count for conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to update conversation unread count:', error);
      // Continue even if this fails
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
  
  // Simple query with just a time filter to avoid index issues
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Use a simple query that doesn't require complex indexes
  const messagesQuery = db
    .collection('messages')
    .where('createdAt', '>', firestore.Timestamp.fromDate(thirtyDaysAgo))
    .limit(200); // Limit to recent messages
  
  // Filter function to include only messages between these two users
  const filterMessagesBetweenUsers = (messages: Message[]) => {
    return messages.filter(message => 
      (message.senderId === userId && message.receiverId === otherUserId) || 
      (message.senderId === otherUserId && message.receiverId === userId)
    );
  };
  
  // Set up the listener
  const unsubscribe = messagesQuery.onSnapshot((snapshot) => {
    const allMessages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data() as Message
      }));
    
    // Apply the filter to get only messages between these two users
    const filteredMessages = filterMessagesBetweenUsers(allMessages)
      .sort((a, b) => {
        // Sort by createdAt timestamp in ascending order (oldest first)
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime.getTime() - bTime.getTime();
      });
    
    callback(filteredMessages);
    
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
            const userData = userDoc.exists ? userDoc.data() : {};
            
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
              otherUserName: userData.displayName || userData.username || 'Unknown User',
              otherUserAvatar: userData.photoURL || null,
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
    
    if (!messageSnap.exists) {
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