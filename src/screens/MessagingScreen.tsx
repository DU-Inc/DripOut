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
import { searchUsers, UserProfile } from '../services/firestoreService';
import { useTheme } from '../styles/themeprovider';
import { auth } from '../Config/firebaseconfig';
import { db } from '../Config/firebaseconfig';

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
  const [currentView, setCurrentView] = useState<'inbox' | 'conversation' | 'userSearch'>(
    otherUserId ? 'conversation' : 'inbox'
  );
  
  // User search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
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
      
      // Mark conversation as read (only if it's an existing conversation)
      if (selectedConversation?.id) {
        markConversationAsRead(targetUserId)
          .then(() => console.log(`Marked conversation with ${targetUserId} as read`))
          .catch(error => {
            // Just log the error but continue with loading messages
            console.error('Error marking conversation as read:', error);
          });
      }
      
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

  // Effect to handle user search with debouncing
  useEffect(() => {
    if (currentView === 'userSearch') {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      // Debounce search for 300ms
      const timeout = setTimeout(async () => {
        try {
          const results = await searchUsers(searchQuery.trim(), 20);
          // Filter out current user from results
          const currentUser = auth().currentUser;
          const filteredResults = currentUser 
            ? results.filter(user => user.userID !== currentUser.uid)
            : results;
          setSearchResults(filteredResults);
        } catch (error) {
          console.error('Error searching users:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      setSearchTimeout(timeout);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery, currentView]);

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

  // Function to select a user from search results
  const handleSelectUser = (user: UserProfile) => {
    setCurrentView('conversation');
    setSelectedConversation({
      id: undefined,
      participants: [auth().currentUser?.uid || '', user.userID],
      otherUserId: user.userID,
      otherUserName: user.userDisplayName || user.username || user.fullName || 'User',
      otherUserAvatar: user.profilePictureURL || null,
      lastMessageTime: 'Now',
      updatedAt: new Date()
    });
    // Clear search state
    setSearchQuery('');
    setSearchResults([]);
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

  // Function to handle new message button
  const handleNewMessage = () => {
    setCurrentView('userSearch');
    setSearchQuery('');
    setSearchResults([]);
  };

  // Debug function to test user existence
  const debugCheckUser = async (userId: string) => {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      console.log(`Debug: User ${userId} exists: ${userDoc.exists}`);
      if (userDoc.exists) {
        console.log(`Debug: User data:`, userDoc.data());
      }
    } catch (error) {
      console.error(`Debug: Error checking user ${userId}:`, error);
    }
  };

  // Render conversation header
  const renderConversationHeader = () => {
    const name = otherUserName || selectedConversation?.otherUserName || 'Chat';
    const avatar = selectedConversation?.otherUserAvatar;
    
    return (
      <View style={[styles.conversationHeader, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (currentView === 'inbox') {
              handleGoBack();
            } else if (selectedConversation && !selectedConversation.id) {
              // If this is a new conversation from user search, go back to inbox
              setCurrentView('inbox');
              setSelectedConversation(null);
            } else {
              handleBackToInbox();
            }
          }}
        >
          <Icon
            name="chevron-back"
            size={28}
            color={theme.text.primary}
          />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userTextInfo}>
            <Text style={[styles.userName, { color: theme.text.primary }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.userStatus, { color: theme.text.secondary }]}>
              Active now
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.infoButton}>
          <Icon
            name="information-circle-outline"
            size={24}
            color={theme.text.primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render message bubble
  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    // Correctly check if the current user sent this message
    const currentUser = auth().currentUser;
    const isSentByMe = currentUser ? item.senderId === currentUser.uid : false;
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
          <Text style={[styles.messageSender, { color: theme.text.secondary }]}>
            {senderName}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isSentByMe
              ? [styles.sentBubble, { backgroundColor: theme.primary }]
              : [styles.receivedBubble, { backgroundColor: theme.surface }],
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
              { color: isSentByMe ? theme.text.onPrimary : theme.text.primary },
            ]}
          >
            {item.text}
          </Text>
          {isLastInGroup && (
            <Text 
              style={[
                styles.messageTime, 
                { color: isSentByMe ? 'rgba(255,255,255,0.7)' : theme.text.tertiary }
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
    const currentUser = auth().currentUser;
    const currentUserId = currentUser?.uid;
    
    // Check if the current user has unread messages AND the last message was sent by someone else
    const currentUserUnreadCount = currentUserId ? (item.unreadCount?.[currentUserId] || 0) : 0;
    const lastMessageSentByCurrentUser = item.lastMessageSenderId === currentUserId;
    const hasUnread = currentUserUnreadCount > 0 && !lastMessageSentByCurrentUser;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: theme.background, borderBottomColor: theme.border }
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
            <View style={[styles.conversationAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>
                {item.otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeaderInfo}>
            <Text 
              style={[
                styles.conversationName, 
                { color: theme.text.primary },
                hasUnread && styles.boldText
              ]} 
              numberOfLines={1}
            >
              {item.otherUserName}
            </Text>
            <Text 
              style={[
                styles.conversationTime, 
                { color: hasUnread ? theme.primary : theme.text.secondary }
              ]}
            >
              {item.lastMessageTime}
            </Text>
          </View>
          
          <View style={styles.conversationPreview}>
            <Text
              style={[
                styles.conversationLastMessage,
                { color: hasUnread ? theme.text.primary : theme.text.secondary },
                hasUnread && styles.boldText,
              ]}
              numberOfLines={1}
            >
              {lastMessageSentByCurrentUser ? 'You: ' : ''}
              {item.lastMessage || 'No messages yet'}
            </Text>
            
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                <Text style={[styles.unreadCount, { color: theme.text.onPrimary }]}>
                  {currentUserUnreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render user search result item
  const renderUserSearchResult = ({ item }: { item: UserProfile }) => {
    const displayName = item.userDisplayName || item.fullName || item.username || 'User';
    const avatar = item.profilePictureURL;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { backgroundColor: theme.background, borderBottomColor: theme.border }
        ]}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={styles.conversationAvatar}
            />
          ) : (
            <View style={[styles.conversationAvatar, styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeaderInfo}>
            <Text 
              style={[styles.conversationName, { color: theme.text.primary }]} 
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={[styles.conversationTime, { color: theme.text.secondary }]}>
              @{item.username}
            </Text>
          </View>
          
          <View style={styles.conversationPreview}>
            <Text
              style={[styles.conversationLastMessage, { color: theme.text.secondary }]}
              numberOfLines={1}
            >
              {item.bio || 'No bio available'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render input area for composing messages
  const renderInputArea = () => {
    return (
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme.background,
              color: theme.text.primary,
              borderColor: theme.border
            }
          ]}
          placeholder="Message..."
          placeholderTextColor={theme.text.secondary}
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
                : theme.surface
            }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || isSendingMessage}
        >
          {isSendingMessage ? (
            <ActivityIndicator size="small" color={theme.text.onPrimary} />
          ) : (
            <Icon
              name="paper-plane"
              size={20}
              color={messageText.trim() ? theme.text.onPrimary : theme.text.secondary}
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
        <View style={[styles.inboxHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.inboxHeaderLeft}>
            <TouchableOpacity onPress={handleGoBack}>
              <Icon name="chevron-back" size={28} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.inboxTitle, { color: theme.text.primary }]}>Messages</Text>
          <View style={styles.inboxHeaderRight}>
            <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
              <Icon name="create-outline" size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isLoadingConversations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="chatbubble-outline" size={50} color={theme.text.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubText, { color: theme.text.secondary }]}>
              When you message people, you'll see your conversations here.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
              <View style={[styles.searchBar, { backgroundColor: theme.background }]}>
                <Icon name="search" size={18} color={theme.text.secondary} style={styles.searchIcon} />
                <TextInput 
                  placeholder="Search" 
                  placeholderTextColor={theme.text.secondary}
                  style={[styles.searchInput, { color: theme.text.primary }]}
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

  // Render user search view
  const renderUserSearch = () => {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.inboxHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.inboxHeaderLeft}>
            <TouchableOpacity onPress={() => setCurrentView('inbox')}>
              <Icon name="chevron-back" size={28} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.inboxTitle, { color: theme.text.primary }]}>New Message</Text>
          <View style={styles.inboxHeaderRight}>
            <View style={{ width: 40 }} />
          </View>
        </View>
        
        <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.background }]}>
            <Icon name="search" size={18} color={theme.text.secondary} style={styles.searchIcon} />
            <TextInput 
              placeholder="Search for users..." 
              placeholderTextColor={theme.text.secondary}
              style={[styles.searchInput, { color: theme.text.primary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={theme.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary, marginTop: 12 }]}>
              Searching...
            </Text>
          </View>
        ) : searchQuery.trim() === '' ? (
          <View style={styles.emptyContainer}>
            <Icon name="search-outline" size={50} color={theme.text.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              Search for users to start a conversation
            </Text>
            <Text style={[styles.emptySubText, { color: theme.text.secondary }]}>
              You can search by username, display name, or email
            </Text>
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: theme.primary, marginTop: 20 }]}
              onPress={() => {
                const currentUser = auth().currentUser;
                if (currentUser) {
                  debugCheckUser(currentUser.uid);
                }
              }}
            >
              <Text style={[styles.debugButtonText, { color: theme.text.onPrimary }]}>
                Debug: Check Current User
              </Text>
            </TouchableOpacity>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="person-outline" size={50} color={theme.text.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No users found
            </Text>
            <Text style={[styles.emptySubText, { color: theme.text.secondary }]}>
              Try searching with a different term
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.userID}
            renderItem={renderUserSearchResult}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.conversationsList}
          />
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
            <Icon name="chatbubble-outline" size={50} color={theme.text.secondary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {selectedConversation?.id ? 'No messages yet. Say hello!' : 'Start a conversation!'}
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
      {currentView === 'inbox' ? renderInbox() : currentView === 'userSearch' ? renderUserSearch() : renderConversation()}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
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
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
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
  conversationHeaderInfo: {
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  debugButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessagingScreen;