import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SocialStackParamList } from '../types/NavigationTypes';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from '../styles/themeprovider';

interface MessageItem {
  id: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

const MESSAGES: MessageItem[] = [
  {
    id: '1',
    username: 'Sarah Wilson',
    avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    lastMessage: 'Love your new style! Where did you get that jacket?',
    timestamp: '2m ago',
    unread: true,
  },
  {
    id: '2',
    username: 'Mike Chen',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    lastMessage: 'The sneakers you recommended are amazing!',
    timestamp: '1h ago',
    unread: false,
  },
  {
    id: '3',
    username: 'Emma Davis',
    avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    lastMessage: 'Would you be interested in a collab?',
    timestamp: '3h ago',
    unread: true,
  },
  {
    id: '4',
    username: 'James Thompson',
    avatar: 'https://randomuser.me/api/portraits/men/4.jpg',
    lastMessage: 'Thanks for the style tips!',
    timestamp: '1d ago',
    unread: false,
  },
];

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<SocialStackParamList>>();
  const { isDarkMode } = useTheme();

  // Colors based on theme
  const bgColor = isDarkMode ? '#0A0A0F' : '#F7F7F7';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const mainColor = isDarkMode ? '#7C6BFF' : '#5245CC';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';

  const handleOpenChat = (username: string, avatar: string) => {
    navigation.navigate('Chat', { username, avatar });
  };

  const renderMessage = ({ item }: { item: MessageItem }) => (
    <TouchableOpacity
      style={[styles.messageItem, { backgroundColor: cardBgColor }]}
      onPress={() => handleOpenChat(item.username, item.avatar)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.username, { color: textColor }]}>{item.username}</Text>
          <Text style={[styles.timestamp, { color: subTextColor }]}>{item.timestamp}</Text>
        </View>
        <Text 
          style={[styles.lastMessage, { color: item.unread ? textColor : subTextColor }]}
          numberOfLines={2}
        >
          {item.lastMessage}
        </Text>
        {item.unread && <View style={[styles.unreadDot, { backgroundColor: mainColor }]} />}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={[styles.headerTitle, { color: textColor }]}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <FeatherIcon name="edit-2" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        data={MESSAGES}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Icon name="chatbubbles-outline" size={60} color={subTextColor} />
            <Text style={[styles.emptyMessagesText, { color: subTextColor }]}>
              No messages yet
            </Text>
          </View>
        }
      />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  newMessageButton: {
    padding: 8,
    marginRight: -8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyMessagesText: {
    fontSize: 16,
    marginTop: 12,
  },
});

export default MessagesScreen; 