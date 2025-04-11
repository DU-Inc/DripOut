import { db, auth } from '../Config/firebaseconfig';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';

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
  unreadCount?: number;
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

/**
 * Send a message to a user
 * @param receiverId - The ID of the recipient
 * @param text - The message text
 * @returns Promise with the message ID
 */
export const sendMessage = async (receiverId: string, text: string): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to send messages');
    }

    const senderId = currentUser.uid;
    const senderName = currentUser.displayName || 'Anonymous';
    const senderAvatar = currentUser.photoURL;

    // Create or update the conversation document
    const conversationId = getConversationId(senderId, receiverId);
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    const timestamp = serverTimestamp();
    
    // Check if conversation already exists
    if (conversationSnap.exists()) {
      // Update existing conversation
      await updateDoc(conversationRef, {
        lastMessage: text,
        lastMessageTime: timestamp,
        lastMessageSenderId: senderId,
        updatedAt: timestamp,
        // Increment unread count for receiver
        [`unreadCount.${receiverId}`]: (conversationSnap.data().unreadCount?.[receiverId] || 0) + 1
      });
    } else {
      // Create new conversation
      await setDoc(conversationRef, {
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
    const messagesRef = collection(db, 'messages');
    const messageDoc = await addDoc(messagesRef, {
      senderId,
      receiverId,
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
export const getMessages = async (otherUserId: string, messageLimit = 20): Promise<Message[]> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to view messages');
    }

    const userId = currentUser.uid;
    const messagesRef = collection(db, 'messages');
    
    // Query for messages sent by either user to the other
    const messagesQuery = query(
      messagesRef,
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );

    const querySnapshot = await getDocs(messagesQuery);
    
    // Mark messages as read if they were sent to the current user
    querySnapshot.docs.forEach(async (docSnapshot) => {
      const message = docSnapshot.data() as Message;
      if (message.receiverId === userId && !message.read) {
        await updateDoc(doc(messagesRef, docSnapshot.id), { read: true });
      }
    });

    // Format messages and reverse to show oldest first
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data() as Message
      }))
      .reverse();
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
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to view conversations');
    }

    const userId = currentUser.uid;
    const conversationsRef = collection(db, 'conversations');
    
    // Query for conversations that include the current user
    const conversationsQuery = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const querySnapshot = await getDocs(conversationsQuery);
    
    // Process conversations to include user details
    const conversations: ConversationWithDetails[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const conversation = docSnapshot.data() as Conversation;
      const otherUserId = conversation.participants.find(id => id !== userId);
      
      if (otherUserId) {
        // Get other user's profile details
        const userDocRef = doc(db, 'users', otherUserId);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data() || {};
        
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
    
    return conversations;
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
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to mark messages as read');
    }

    const userId = currentUser.uid;
    
    // Update the conversation document to reset unread count
    const conversationId = getConversationId(userId, otherUserId);
    const conversationRef = doc(db, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0
    });
    
    // Mark all unread messages as read
    const messagesRef = collection(db, 'messages');
    const unreadMessagesQuery = query(
      messagesRef,
      where('senderId', '==', otherUserId),
      where('receiverId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadMessagesQuery);
    
    const batch = db.batch();
    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    console.log(`Marked ${querySnapshot.size} messages as read from ${otherUserId}`);
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
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
  const currentUser = auth().currentUser;
  if (!currentUser) {
    console.error('You must be logged in to subscribe to messages');
    return () => {};
  }

  const userId = currentUser.uid;
  const messagesRef = collection(db, 'messages');
  
  // Query for messages between these two users
  const messagesQuery = query(
    messagesRef,
    where('participants', 'array-contains', userId),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  
  // Set up the listener
  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data() as Message
      }))
      .reverse();
    
    callback(messages);
    
    // Mark new messages as read
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const message = change.doc.data() as Message;
        if (message.receiverId === userId && !message.read) {
          await updateDoc(doc(messagesRef, change.doc.id), { read: true });
        }
      }
    });
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
  const currentUser = auth().currentUser;
  if (!currentUser) {
    console.error('You must be logged in to subscribe to conversations');
    return () => {};
  }

  const userId = currentUser.uid;
  const conversationsRef = collection(db, 'conversations');
  
  // Query for conversations that include the current user
  const conversationsQuery = query(
    conversationsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  
  // Set up the listener
  const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
    try {
      // Process conversations to include user details
      const conversations: ConversationWithDetails[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const conversation = docSnapshot.data() as Conversation;
        const otherUserId = conversation.participants.find(id => id !== userId);
        
        if (otherUserId) {
          // Get other user's profile details
          const userDocRef = doc(db, 'users', otherUserId);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.data() || {};
          
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
      
      callback(conversations);
    } catch (error) {
      console.error('Error processing conversations update:', error);
    }
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
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to delete messages');
    }

    const userId = currentUser.uid;
    
    // Verify the user is the sender
    const messageRef = doc(db, 'messages', messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (!messageSnap.exists()) {
      throw new Error('Message not found');
    }
    
    const message = messageSnap.data() as Message;
    
    if (message.senderId !== userId) {
      throw new Error('You can only delete messages you sent');
    }
    
    // Delete the message
    await deleteDoc(messageRef);
    console.log(`Deleted message: ${messageId}`);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};