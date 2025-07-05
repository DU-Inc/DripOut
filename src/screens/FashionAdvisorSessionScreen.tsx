import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  getFashionAdvisorMessages,
  FashionAdvisorMessage 
} from '../services/fashionAdvisorChatService';
import { Product } from '../services/recommendationService';

const FashionAdvisorSessionScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get session data from route params
  const sessionId = (route.params as any)?.sessionId;
  const sessionTitle = (route.params as any)?.sessionTitle || 'Chat Session';
  
  // State
  const [messages, setMessages] = useState<FashionAdvisorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Colors
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const cardBgColor = isDarkMode ? '#1A1A24' : '#F8F9FA';
  
  // Load messages on mount
  useEffect(() => {
    if (sessionId) {
      loadMessages();
    }
  }, [sessionId]);
  
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const sessionMessages = await getFashionAdvisorMessages(sessionId);
      setMessages(sessionMessages);
      console.log(`Loaded ${sessionMessages.length} messages for session ${sessionId}`);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const openProductUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot open product page');
    });
  };
  
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const renderMessage = ({ item }: { item: FashionAdvisorMessage }) => {
    const isUser = item.type === 'user';
    const hasProducts = item.products && item.products.length > 0;
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.advisorMessageContainer
      ]}>
        {/* Avatar for advisor */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: mainColor + '20' }]}>
            <Icon name="sparkles" size={16} color={mainColor} />
          </View>
        )}
        
        <View style={styles.messageContent}>
          {/* Text bubble */}
          {item.text && (
            <View style={[
              styles.messageBubble,
              isUser 
                ? [styles.userBubble, { backgroundColor: mainColor }]
                : [styles.advisorBubble, { backgroundColor: cardBgColor, borderColor }]
            ]}>
              <Text style={[
                styles.messageText,
                isUser ? styles.userMessageText : [styles.advisorMessageText, { color: textColor }]
              ]}>
                {item.text}
              </Text>
              <Text style={[styles.messageTime, { color: subTextColor }]}>
                {formatTime(item.timestamp)}
              </Text>
            </View>
          )}
          
          {/* Products carousel */}
          {hasProducts && (
            <View style={styles.productsContainer}>
              <FlatList
                data={item.products}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: product }) => (
                  <TouchableOpacity
                    style={[styles.productCard, { backgroundColor: cardBgColor, borderColor }]}
                    onPress={() => openProductUrl(product.url)}
                    activeOpacity={0.8}
                  >
                    {product.images && product.images.length > 0 ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.productImage, styles.placeholderImage]}>
                        <Icon name="image-outline" size={24} color={subTextColor} />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: textColor }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      {product.price && (
                        <Text style={[styles.productPrice, { color: mainColor }]}>
                          ${typeof product.price === 'number' ? product.price.toFixed(0) : (typeof product.price === 'string' ? product.price : '0')}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(product) => product.id || Math.random().toString()}
                contentContainerStyle={styles.productsCarousel}
              />
            </View>
          )}
        </View>
        
        {/* Avatar placeholder for user (for alignment) */}
        {isUser && <View style={styles.avatarPlaceholder} />}
      </View>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chatbubbles-outline" size={60} color={subTextColor} />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        No Messages Found
      </Text>
      <Text style={[styles.emptyText, { color: subTextColor }]}>
        This session doesn't have any messages yet.
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {sessionTitle}
          </Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>
            Session ID: {sessionId?.substring(0, 8)}...
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '80%',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  advisorMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 36,
    marginLeft: 12,
  },
  messageContent: {
    flex: 1,
    maxWidth: '80%',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  advisorBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  advisorMessageText: {
    fontWeight: '400',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  productsContainer: {
    marginTop: 8,
  },
  productsCarousel: {
    paddingRight: 16,
  },
  productCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
  },
  placeholderImage: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
});

export default FashionAdvisorSessionScreen; 