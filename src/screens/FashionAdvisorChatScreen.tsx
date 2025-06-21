import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import { searchProducts, Product, checkApiHealth } from '../services/recommendationService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useOptimizedProfile } from '../hooks/useOptimizedProfile';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  type: 'user' | 'advisor';
  text?: string;
  timestamp: number;
  products?: Product[];
  isLoading?: boolean;
}

// Mock Products for fallback
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Striped Cotton T-Shirt',
    price: 39.99,
    images: ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format'],
    url: 'https://example.com/product1',
  },
  {
    id: '2',
    name: 'Slim-Fit Jeans',
    price: 59.99,
    images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=600&auto=format'],
    url: 'https://example.com/product2',
  },
];

const FashionAdvisorChatScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get user profile data
  const { profile: userProfile, preferences: userPreferences } = useOptimizedProfile();
  
  // Combine profile and preferences for the recommendation service
  const combinedUserProfile = useMemo(() => {
    if (!userProfile && !userPreferences) return null;
    
    return {
      ...userProfile,
      ...userPreferences,
    };
  }, [userProfile, userPreferences]);
  
  // Get initial query from route params if provided
  const initialQuery = (route.params as any)?.initialQuery || '';
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'advisor',
      text: "Hi there! I'm your personal fashion advisor. 👗✨\n\nI can help you with anything fashion-related! Try asking me things like:\n• \"I need an outfit for a dinner date\"\n• \"Show me bohemian style dresses\"\n• \"What should I wear to a job interview?\"\n• \"I want comfortable workout clothes\"\n\nWhat can I help you style today?",
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Colors
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const cardBgColor = isDarkMode ? '#16171F' : '#FFFFFF';
  const userBubbleColor = mainColor;
  const advisorBubbleColor = isDarkMode ? '#222232' : '#F2F2F7';
  const inputBgColor = isDarkMode ? '#16171F' : '#F8F8F8';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  
  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      })
    ]).start();
    
    // Auto-send initial query if provided
    if (initialQuery.trim()) {
      setTimeout(() => {
        handleSendMessage();
      }, 1000);
    }
  }, []);
  
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: inputText.trim(),
      timestamp: Date.now(),
    };
    
    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Check API health
      const isConnected = await checkApiHealth();
      
      let advisorResponse: ChatMessage;
      
      if (isConnected) {
        try {
          // Try API call with user profile
          console.log('🔍 FashionAdvisorChat: Sending user profile to searchProducts:', combinedUserProfile);
          const results = await searchProducts(userMessage.text!, [0, 1000], 6, combinedUserProfile);
          
          if (results && results.length > 0) {
            // Products found - create response with products
            advisorResponse = {
              id: `advisor-${Date.now()}`,
              type: 'advisor',
              text: `Great choice! I found some amazing options for "${userMessage.text}". Here are my top recommendations:`,
              products: results,
              timestamp: Date.now(),
            };
          } else {
            // No products found - text only response with natural language examples
            advisorResponse = {
              id: `advisor-${Date.now()}`,
              type: 'advisor',
              text: `I couldn't find specific items for "${userMessage.text}" in my current catalog, but I'd love to help you find something perfect! ✨\n\nTry describing your needs more specifically, like:\n• "I need a romantic outfit for a first date"\n• "Show me professional blazers under $150"\n• "What's trending in streetwear this season?"\n• "I want a vintage-inspired summer look"\n\nWhat occasion or style are you shopping for?`,
              timestamp: Date.now(),
            };
          }
        } catch (apiError) {
          // API error - fallback to mock data
          advisorResponse = {
            id: `advisor-${Date.now()}`,
            type: 'advisor',
            text: `Here are some popular items that might interest you:`,
            products: MOCK_PRODUCTS,
            timestamp: Date.now(),
          };
        }
      } else {
        // API not available - text only response with natural conversation
        advisorResponse = {
          id: `advisor-${Date.now()}`,
          type: 'advisor',
          text: `I'm having trouble connecting to my fashion database right now, but I'm still here to help! 💫\n\nBased on "${userMessage.text}", I'd suggest looking for versatile pieces that can be mixed and matched. Tell me more about what you're looking for:\n\n• What's the occasion?\n• What's your style preference?\n• Any specific colors or fits you love?\n• What's your budget range?\n\nI can give you personalized styling advice even without the catalog!`,
          timestamp: Date.now(),
        };
      }
      
      // Add advisor response
      setMessages(prev => [...prev, advisorResponse]);
      
    } catch (error) {
      // Error handling with natural language encouragement
      const errorResponse: ChatMessage = {
        id: `advisor-${Date.now()}`,
        type: 'advisor',
        text: "Oops! Something went wrong on my end, but I'm still here to help! 😊\n\nLet's try again - feel free to describe what you're looking for in your own words. For example:\n• \"I need something trendy for brunch with friends\"\n• \"Help me find the perfect wedding guest outfit\"\n• \"What should I wear for a casual Friday at work?\"\n\nWhat's on your style wishlist?",
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };
  
  const openProductUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot open product page');
    });
  };
  
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.type === 'user';
    const hasProducts = item.products && item.products.length > 0;
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.advisorMessageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Avatar for advisor */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: mainColor + '20' }]}>
            <Icon name="sparkles" size={16} color={mainColor} />
          </View>
        )}
        
        <View style={styles.messageContent}>
          {/* Text bubble */}
          {item.text && (
            <View
              style={[
                styles.messageBubble,
                isUser 
                  ? [styles.userBubble, { backgroundColor: userBubbleColor }]
                  : [styles.advisorBubble, { backgroundColor: advisorBubbleColor }]
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isUser 
                    ? styles.userMessageText
                    : [styles.advisorMessageText, { color: textColor }]
                ]}
              >
                {item.text}
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
      </Animated.View>
    );
  };
  
  const renderLoadingIndicator = () => {
    if (!isLoading) return null;
    
    return (
      <View style={[styles.messageContainer, styles.advisorMessageContainer]}>
        <View style={[styles.avatar, { backgroundColor: mainColor + '20' }]}>
          <Icon name="sparkles" size={16} color={mainColor} />
        </View>
        <View style={styles.messageContent}>
          <View style={[styles.messageBubble, styles.advisorBubble, { backgroundColor: advisorBubbleColor }]}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { backgroundColor: subTextColor }]} />
              <View style={[styles.typingDot, { backgroundColor: subTextColor }]} />
              <View style={[styles.typingDot, { backgroundColor: subTextColor }]} />
            </View>
          </View>
        </View>
        <View style={styles.avatarPlaceholder} />
      </View>
    );
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
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: mainColor + '20' }]}>
            <Icon name="sparkles" size={20} color={mainColor} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Fashion Advisor</Text>
            <Text style={[styles.headerSubtitle, { color: subTextColor }]}>Your personal stylist</Text>
          </View>
        </View>
        <View style={styles.headerRight} />
      </View>
      
      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderLoadingIndicator}
        />
        
        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: bgColor, borderTopColor: borderColor }]}>
          <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor }]}>
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: textColor }]}
              placeholder="Describe your style needs or ask for advice..."
              placeholderTextColor={subTextColor}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? mainColor : subTextColor + '30',
                }
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Icon
                name="send"
                size={18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  headerRight: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
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
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    opacity: 0.6,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default FashionAdvisorChatScreen; 