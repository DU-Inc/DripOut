import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';

type ChatScreenRouteProp = RouteProp<SocialStackParamList, 'Chat'>;

// Mock message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
}

const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<SocialStackParamList>>();
  const { isDarkMode } = useTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Colors based on theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const bubbleColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const otherBubbleColor = isDarkMode ? '#2A2A38' : '#F0F0F0';

  // Load initial messages
  useEffect(() => {
    // In a real app, fetch messages from an API
    const mockMessages: Message[] = [
      {
        id: '1',
        text: 'Hey! I saw your latest style post 🔥',
        sender: 'other',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: '2',
        text: 'Thanks! I\'ve been experimenting with new combinations lately',
        sender: 'user',
        timestamp: new Date(Date.now() - 3500000)
      },
      {
        id: '3',
        text: 'The color palette you chose was perfect',
        sender: 'other',
        timestamp: new Date(Date.now() - 3400000)
      }
    ];
    setMessages(mockMessages);
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate reply (in a real app, this would be handled by real-time messaging)
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for your message! I\'ll get back to you soon.',
        sender: 'other',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, replyMessage]);
    }, 1000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.sender === 'user';
    const showTimestamp = index === 0 || 
      messages[index - 1].sender !== item.sender ||
      (item.timestamp.getTime() - messages[index - 1].timestamp.getTime()) > 300000;

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.otherMessage
      ]}>
        {!isUser && showTimestamp && (
          <Image 
            source={{ uri: route.params.avatar }} 
            style={styles.messageAvatar} 
          />
        )}
        <View style={{ flex: 1 }}>
          {showTimestamp && (
            <Text style={[styles.timestamp, { color: subTextColor }]}>
              {formatTime(item.timestamp)}
            </Text>
          )}
          <View style={[
            styles.messageBubble,
            isUser ? 
              { backgroundColor: bubbleColor } : 
              { backgroundColor: otherBubbleColor }
          ]}>
            <Text style={[
              styles.messageText,
              { color: isUser ? '#FFFFFF' : textColor }
            ]}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={28} color={textColor} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => navigation.navigate('ViewUserProfile', { username: route.params.username })}
        >
          <Image 
            source={{ uri: route.params.avatar }} 
            style={styles.avatar}
          />
          <Text style={[styles.username, { color: textColor }]}>
            {route.params.username}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="ellipsis-horizontal" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { borderTopColor: borderColor }]}>
          <TouchableOpacity style={styles.attachButton}>
            <Icon name="add-circle-outline" size={24} color={mainColor} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { 
                backgroundColor: isDarkMode ? '#2A2A38' : '#F5F5F5',
                color: textColor,
                borderColor: borderColor
              }
            ]}
            placeholder="Type a message..."
            placeholderTextColor={subTextColor}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              { backgroundColor: message.trim() ? mainColor : subTextColor }
            ]}
            onPress={sendMessage}
            disabled={!message.trim()}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  attachButton: {
    paddingRight: 12,
    paddingBottom: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default ChatScreen; 