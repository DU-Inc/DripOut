import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../Config/firebaseconfig';
import { UserProfile, getUserProfile } from './firestoreService';

// Define notification types
export enum NotificationType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MESSAGE = 'message',
  SYSTEM = 'system'
}

// Define notification interface
export interface Notification {
  id?: string;
  type: NotificationType;
  sender: string; // user ID of the sender
  recipient: string; // user ID of the recipient
  content: string; // notification text
  read: boolean;
  data?: any; // additional data (e.g., post ID, comment ID)
  createdAt: any; // Timestamp
}

/**
 * Create a follow notification when a user follows another user
 */
export const createFollowNotification = async (
  senderId: string,
  recipientId: string
): Promise<boolean> => {
  try {
    // Don't send a notification if user follows themselves
    if (senderId === recipientId) return false;
    
    // Get sender profile to get username
    const senderProfile = await getUserProfile(senderId);
    if (!senderProfile) return false;
    
    const senderUsername = senderProfile.userDisplayName || senderProfile.username;
    
    // Create notification
    const notificationData: Omit<Notification, 'id'> = {
      type: NotificationType.FOLLOW,
      sender: senderId,
      recipient: recipientId,
      content: `${senderUsername} started following you`,
      read: false,
      data: {
        senderUsername: senderProfile.username,
        senderAvatar: senderProfile.profilePictureURL
      },
      createdAt: serverTimestamp()
    };
    
    // Add to notifications collection
    await addDoc(collection(db, 'notifications'), notificationData);
    
    // Here you would also trigger a push notification if needed
    
    return true;
  } catch (error) {
    console.error('Error creating follow notification:', error);
    return false;
  }
};

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipient', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Notification);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Mark all notifications for a user as read
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipient', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    const promises: Promise<void>[] = [];
    querySnapshot.forEach((document) => {
      const notificationRef = doc(db, 'notifications', document.id);
      promises.push(updateDoc(notificationRef, { read: true }));
    });
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

/**
 * Get unread notifications count for a user
 */
export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipient', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}; 