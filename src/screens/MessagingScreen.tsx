import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RootStackParamList } from '../types/NavigationTypes';
import {
  subscribeToMessages,
  sendMessage,
  markConversationAsRead,
  getMessages,
  subscribeToConversations,
  Message,
  ConversationWithDetails
} from '../services/messageService';
import { useTheme } from '../styles/themeprovider';
import { auth } from '../Config/firebaseconfig';

type MessagingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MessagingScreen'
>;

type MessagingScreenRouteProp = RouteProp<
  RootStackParamList,
  'MessagingScreen'
>;

// Helper function to format message time
const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

const MessagingScreen: React.FC = () => {
  const navigation = useNavigation<MessagingScreenNavigationProp>();
  const route = useRoute<MessagingScreenRouteProp>();
  const { conversationId, otherUserId, otherUserName } = route.params || {};
  const { theme, isDarkMode } = useTheme();
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Conversations state (for inbox view)
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  
  // View state
  const [currentView, setCurrentView] = useState<'inbox' | 'conversation'>(
    otherUserId ? 'conversation' : 'inbox'
  );
  
  // Ref for FlatList to auto-scroll to bottom
  const flatListRef = useRef<FlatList>(null);

  // Effect to load conversations when in inbox view
  useEffect(() => {
    if (currentView === 'inbox') {
      setIsLoadingConversations(true);
      
      const unsubscribe = subscribeToConversations((updatedConversations) => {
        setConversations(updatedConversations);
        setIsLoadingConversations(false);
      });
      
      return () => unsubscribe();
    }
  }, [currentView]);

  // Effect to load and subscribe to messages when a conversation is selected
  useEffect(() => {
    if (currentView === 'conversation' && (otherUserId || selectedConversation?.otherUserId)) {
      const targetUserId = otherUserId || selectedConversation?.otherUserId;
      
      if (!targetUserId) {
        console.error('No target user ID found for conversation');
        return;
      }
      
      console.log(`Loading conversation with user ID: ${targetUserId}`);
      setIsLoadingMessages(true);
      
      // Mark conversation as read
      markConversationAsRead(targetUserId)
        .then(() => console.log(`Marked conversation with ${targetUserId} as read`))
        .catch(error => {
          // Just log the error but continue with loading messages
          console.error('Error marking conversation as read:', error);
        });
      
      // First get initial messages
      getMessages(targetUserId)
        .then(initialMessages => {
          console.log(`Loaded ${initialMessages.length} initial messages with ${targetUserId}`);
          setMessages(initialMessages);
          setIsLoadingMessages(false);
          // Scroll to bottom after messages load
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 200);
        })
        .catch(error => {
          console.error('Error loading initial messages:', error);
          setIsLoadingMessages(false);
        });
      
      // Then subscribe to real-time updates
      console.log(`Setting up real-time message subscription with ${targetUserId}`);
      const unsubscribe = subscribeToMessages(targetUserId, (updatedMessages) => {
        console.log(`Received ${updatedMessages.length} messages in real-time update`);
        setMessages(updatedMessages);
        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
      
      return () => {
        console.log(`Unsubscribing from messages with ${targetUserId}`);
        unsubscribe();
      };
    }
  }, [currentView, otherUserId, selectedConversation]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    const targetUserId = otherUserId || selectedConversation?.otherUserId;
    if (!targetUserId) {
      console.error('Cannot send message: No target user ID');
      return;
    }
    
    console.log(`Sending message to user ${targetUserId}: "${messageText.trim().substring(0, 20)}${messageText.length > 20 ? '...' : ''}"`);
    setIsSendingMessage(true);
    
    try {
      const messageId = await sendMessage(targetUserId, messageText.trim());
      console.log(`Message sent successfully with ID: ${messageId}`);
      setMessageText('');
      
      // Force scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Function to select a conversation from the inbox
  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    setCurrentView('conversation');
  };

  // Function to go back to inbox from conversation view
  const handleBackToInbox = () => {
    setCurrentView('inbox');
    setSelectedConversation(null);
  };

  // Function to go back to the previous screen
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Render conversation header
  const renderConversationHeader = () => {
    const name = otherUserName || selectedConversation?.otherUserName || 'Chat';
    const avatar = selectedConversation?.otherUserAvatar;
    
    return (
      <View style={[styles.conversationHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={currentView === 'inbox' ? handleGoBack : handleBackToInbox}
        >
          <Icon
            name="chevron-back"
            size={28}
            color={theme.text}
          />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userTextInfo}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.userStatus, { color: theme.textSecondary }]}>
              Active now
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.infoButton}>
          <Icon
            name="information-circle-outline"
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    // Simply check if senderId matches receiverId (messages from the other user have different IDs)
    const isSentByMe = item.senderId !== (otherUserId || selectedConversation?.otherUserId);
    const senderName = isSentByMe ? 'You' : item.senderName || selectedConversation?.otherUserName || otherUserName || 'User';
    
    // Check if this message is from the same sender as the previous message
    const isFirstInGroup = index === 0 || messages[index - 1].senderId !== item.senderId;
    // Check if this message is from the same sender as the next message
    const isLastInGroup = index === messages.length - 1 || messages[index + 1].senderId !== item.senderId;
    
    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isSentByMe ? styles.sentMessage : styles.receivedMessage,
          !isLastInGroup && { marginBottom: 2 },
        ]}
      >
        {!isSentByMe && isFirstInGroup && (
          <Text style={[styles.messageSender, { color: theme.textSecondary }]}>
            {senderName}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isSentByMe
              ? [styles.sentBubble, { backgroundColor: theme.primary }]
              : [styles.receivedBubble, { backgroundColor: isDarkMode ? '#2C2C2E' : '#E9E9EB' }],
            // Adjust bubble corners based on position in group
            !isFirstInGroup && isSentByMe && { borderTopRightRadius: 4 },
            !isFirstInGroup && !isSentByMe && { borderTopLeftRadius: 4 },
            !isLastInGroup && isSentByMe && { borderBottomRightRadius: 4 },
            !isLastInGroup && !isSentByMe && { borderBottomLeftRadius: 4 },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isSentByMe ? '#FFFFFF' : theme.text },
            ]}
          >
            {item.text}
          </Text>
          {isLastInGroup && (
            <Text 
              style={[
                styles.messageTime, 
                { color: isSentByMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
              ]}
            >
              {item.createdAt && item.createdAt.toDate 
                ? formatMessageTime(item.createdAt.toDate()) 
                : ''}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Render conversation item for inbox
  const renderConversationItem = ({ item }: { item: ConversationWithDetails }) => {
    // Check if there are unread messages
    const hasUnread = item.unreadCount && item.unreadCount[item.otherUserId] > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: theme.background }
        ]}
        onPress={() => handleSelectConversation(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.otherUserAvatar ? (
            <Image
              source={{ uri: item.otherUserAvatar }}
              style={styles.conversationAvatar}
            />
          ) : (
            <View style={[styles.conversationAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {item.otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Online indicator - this would typically be based on a real user status */}
          <View style={[styles.onlineIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[
                styles.conversationName, 
                { color: theme.text },
                hasUnread && styles.boldText
              ]} 
              numberOfLines={1}
            >
              {item.otherUserName}
            </Text>
            <Text 
              style={[
                styles.conversationTime, 
                { color: hasUnread ? theme.primary : theme.textSecondary }
              ]}
            >
              {item.lastMessageTime}
            </Text>
          </View>
          
          <View style={styles.conversationPreview}>
            <Text
              style={[
                styles.conversationLastMessage,
                { color: hasUnread ? theme.text : theme.textSecondary },
                hasUnread && styles.boldText,
              ]}
              numberOfLines={1}
            >
              {item.lastMessageSenderId === auth().currentUser?.uid ? 'You: ' : ''}
              {item.lastMessage || 'No messages yet'}
            </Text>
            
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount[item.otherUserId]}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render input area for composing messages
  const renderInputArea = () => {
    return (
      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7',
              color: theme.text
            }
          ]}
          placeholder="Message..."
          placeholderTextColor={theme.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: messageText.trim()
                ? theme.primary
                : isDarkMode ? '#1C1C1E' : '#E9E9EB'
            }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSendingMessage}
        >
          {isSendingMessage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon
              name="paper-plane"
              size={20}
              color={messageText.trim() ? '#FFFFFF' : theme.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render inbox view
  const renderInbox = () => {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.inboxHeader, { backgroundColor: theme.card }]}>
          <View style={styles.inboxHeaderLeft}>
            <TouchableOpacity onPress={handleGoBack}>
              <Icon name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.inboxTitle, { color: theme.text }]}>Messages</Text>
          <View style={styles.inboxHeaderRight}>
            <TouchableOpacity style={styles.newMessageButton}>
              <Icon name="create-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isLoadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="chatbubble-outline" size={50} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              When you message people, you'll see your conversations here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <View style={[styles.searchBar, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F0F0F0' }]}>
                <Icon name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput 
                  placeholder="Search" 
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.searchInput, { color: theme.text }]}
                />
              </View>
            </View>
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id || item.otherUserId}
              renderItem={renderConversationItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.conversationsList}
            />
          </>
        )}
      </View>
    );
  };

  // Render conversation view
  const renderConversation = () => {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderConversationHeader()}
        
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="chatbubble-outline" size={50} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id || `${item.senderId}-${item.createdAt}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}
        
        {renderInputArea()}
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {currentView === 'inbox' ? renderInbox() : renderConversation()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inboxHeaderLeft: {
    width: 40,
  },
  inboxHeaderRight: {
    width: 40,
  },
  inboxTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  newMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  boldText: {
    fontWeight: '600',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextInfo: {
    flexDirection: 'column',
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageBubbleContainer: {
    marginBottom: 8,
    flexDirection: 'column',
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '500',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  sentBubble: {
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationsList: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 4,
  },
  conversationAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: 'white',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  conversationPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationLastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MessagingScreen;