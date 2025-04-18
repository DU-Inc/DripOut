import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import {
  Notification,
  NotificationType,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import auth from '@react-native-firebase/auth';

type SocialNavigationProp = StackNavigationProp<SocialStackParamList>;

const NotificationItem: React.FC<{
  notification: Notification;
  onPress: () => void;
  isDarkMode: boolean;
}> = ({ notification, onPress, isDarkMode }) => {
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const highlightBgColor = isDarkMode ? 'rgba(124, 107, 255, 0.1)' : 'rgba(82, 69, 204, 0.05)';

  // Format the time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) {
      return 'Just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.FOLLOW:
        return 'person-add';
      case NotificationType.LIKE:
        return 'heart';
      case NotificationType.COMMENT:
        return 'chatbubble';
      case NotificationType.MESSAGE:
        return 'mail';
      case NotificationType.SYSTEM:
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  // Format notification timestamp
  const timestamp = notification.createdAt instanceof Date 
    ? formatTime(notification.createdAt) 
    : 'Recently';

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read ? cardBgColor : highlightBgColor,
          borderColor: borderColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {notification.data?.senderAvatar ? (
        <Image 
          source={{ uri: notification.data.senderAvatar }} 
          style={styles.avatar} 
        />
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: mainColor }]}>
          <Icon 
            name={getNotificationIcon(notification.type)} 
            size={16} 
            color="#FFFFFF" 
          />
        </View>
      )}

      <View style={styles.notificationContent}>
        <Text style={[styles.notificationText, { color: textColor }]}>
          {notification.content}
        </Text>
        <Text style={[styles.timestamp, { color: subTextColor }]}>
          {timestamp}
        </Text>
      </View>

      {!notification.read && (
        <View style={[styles.unreadIndicator, { backgroundColor: mainColor }]} />
      )}
    </TouchableOpacity>
  );
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<SocialNavigationProp>();
  const { isDarkMode } = useTheme();
  const currentUser = auth().currentUser;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Colors based on theme
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const notificationsData = await getUserNotifications(currentUser.uid);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };
  
  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read && notification.id) {
      try {
        await markNotificationAsRead(notification.id);
        
        // Update local state
        setNotifications(prev =>
          prev.map(item =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case NotificationType.FOLLOW:
        if (notification.data?.senderUsername) {
          navigation.navigate('ViewUserProfile', { username: notification.data.senderUsername });
        }
        break;
      case NotificationType.LIKE:
      case NotificationType.COMMENT:
        // Navigate to the post (would need post ID in notification.data)
        break;
      case NotificationType.MESSAGE:
        if (notification.sender && notification.data?.senderUsername && notification.data?.senderAvatar) {
          navigation.navigate('Chat', {
            username: notification.data.senderUsername,
            avatar: notification.data.senderAvatar,
            userId: notification.sender
          });
        }
        break;
      default:
        break;
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    try {
      await markAllNotificationsAsRead(currentUser.uid);
      
      // Update local state
      setNotifications(prev =>
        prev.map(item => ({ ...item, read: true }))
      );
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={mainColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Notifications
        </Text>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <Text style={[styles.markAllText, { color: mainColor }]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Notifications List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={[styles.loadingText, { color: subTextColor }]}>
            Loading notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id || String(item.createdAt)}
          renderItem={({ item }) => (
            <NotificationItem 
              notification={item}
              onPress={() => handleNotificationPress(item)}
              isDarkMode={isDarkMode}
            />
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-outline" size={60} color={subTextColor} />
              <Text style={[styles.emptyText, { color: subTextColor }]}>
                No notifications yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 16,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});

export default NotificationsScreen; 