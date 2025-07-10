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
import { auth } from '../Config/firebaseconfig';
import { 
  createFashionAdvisorSession, 
  saveFashionAdvisorMessage, 
  getFashionAdvisorMessages,
  subscribeToFashionAdvisorMessages,
  generateSessionTitle,
  FashionAdvisorMessage as StoredMessage
} from '../services/fashionAdvisorChatService';
import UnifiedProductCard from '../components/feed/UnifiedProductCard';
import { logger } from '../utils/logger';

const { width, height } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  type: 'user' | 'advisor';
  text?: string;
  timestamp: number;
  products?: Product[];
  isLoading?: boolean;
}



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
  
  // Get initial query and session ID from route params if provided
  const initialQuery = (route.params as any)?.initialQuery || '';
  const sessionId = (route.params as any)?.sessionId;
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
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

  // Prepare conversation context for API calls
  const prepareConversationContext = (currentMessages: ChatMessage[], newUserMessage: ChatMessage, sessionId?: string) => {
    // Get recent conversation history (last 6 messages to keep payload reasonable)
    const recentMessages = currentMessages.slice(-6);
    
    // Format conversation history
    const conversationHistory = recentMessages.map(msg => ({
      type: msg.type,
      text: msg.text || '',
      timestamp: msg.timestamp,
      // Include lightweight product data for context
      products: msg.products?.map(product => {
        // Convert price to number if it's a string
        let numericPrice = 0;
        if (typeof product.price === 'number') {
          numericPrice = product.price;
        } else if (typeof product.price === 'string') {
          // Extract number from string like "$18.00" or "18.00"
          const priceMatch = product.price.replace(/[$,]/g, '').match(/[\d.]+/);
          numericPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
        }
        
        return {
          name: product.name,
          url: product.url,
          description: product.description,
          price: numericPrice, // Always send as number
          brand: product.brand
        };
      }) || []
    }));

    // Add the new user message to the history
    conversationHistory.push({
      type: newUserMessage.type,
      text: newUserMessage.text || '',
      timestamp: newUserMessage.timestamp,
      products: []
    });

    return {
      conversation_history: conversationHistory,
      session_id: sessionId || `temp_${auth().currentUser?.uid}_${Date.now()}`,
      message_count: currentMessages.length + 1,
      is_follow_up: currentMessages.length > 1 // True if this isn't the first message
    };
  };
  
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
    
    // Load existing session or create new one
    if (currentSessionId) {
      loadExistingSession(currentSessionId);
    } else {
      // Show welcome message for new session
      setMessages([{
        id: 'welcome',
        type: 'advisor',
        text: "Hi there! I'm your personal fashion advisor. 👗✨\n\nI can help you with anything fashion-related! Try asking me things like:\n• \"I need an outfit for a dinner date\"\n• \"Show me bohemian style dresses\"\n• \"What should I wear to a job interview?\"\n• \"I want comfortable workout clothes\"\n\nWhat can I help you style today?",
        timestamp: Date.now(),
      }]);
    }
    
    // Auto-send initial query if provided
    if (initialQuery.trim() && !currentSessionId) {
      setTimeout(() => {
        handleSendMessage();
      }, 1000);
    }
  }, [currentSessionId]);

  // Load existing session
  const loadExistingSession = async (sessionId: string) => {
    try {
      setIsLoadingSession(true);
      console.log(`Loading existing session: ${sessionId}`);
      
      const storedMessages = await getFashionAdvisorMessages(sessionId);
      
      // Convert stored messages to chat format
      const chatMessages: ChatMessage[] = storedMessages.map(msg => ({
        id: msg.id || `msg-${Date.now()}`,
        type: msg.type,
        text: msg.text,
        timestamp: msg.timestamp?.toDate?.()?.getTime() || Date.now(),
        products: msg.products,
        isLoading: false
      }));
      
      setMessages(chatMessages);
      console.log(`Loaded ${chatMessages.length} messages from session`);
      
    } catch (error) {
      console.error('Error loading session:', error);
      // Fallback to welcome message
      setMessages([{
        id: 'welcome',
        type: 'advisor',
        text: "Hi there! I'm your personal fashion advisor. 👗✨\n\nI can help you with anything fashion-related! Try asking me things like:\n• \"I need an outfit for a dinner date\"\n• \"Show me bohemian style dresses\"\n• \"What should I wear to a job interview?\"\n• \"I want comfortable workout clothes\"\n\nWhat can I help you style today?",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoadingSession(false);
    }
  };
  
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
    
    // Create session if this is the first message
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const title = generateSessionTitle(userMessage.text || '');
        sessionId = await createFashionAdvisorSession(title, userMessage.text || '');
        setCurrentSessionId(sessionId);
        console.log(`✅ Created new session: ${sessionId} with title: "${title}"`);
      } catch (error) {
        console.error('Error creating session:', error);
      }
    }
    
    // Save user message to database
    if (sessionId) {
      try {
        await saveFashionAdvisorMessage(sessionId, {
          userId: auth().currentUser?.uid || '',
          type: 'user',
          text: userMessage.text,
          query: userMessage.text
        });
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      // Check API health
      const isConnected = await checkApiHealth();
      
      let advisorResponse: ChatMessage;
      
      if (isConnected) {
        // Prepare conversation context for API
        const conversationContext = prepareConversationContext(messages, userMessage, sessionId || undefined);
        
        try {
          // Try API call with user profile and conversation context
          console.log('🔍 FashionAdvisorChat: Sending user profile to searchProducts:', combinedUserProfile);
          console.log('💬 FashionAdvisorChat: Sending conversation context:', conversationContext);
          console.log('🆔 FashionAdvisorChat: Sending session ID:', sessionId);
          const results = await searchProducts(userMessage.text!, [0, 1000], 6, combinedUserProfile, conversationContext, sessionId || undefined);
          
          if (results.products && results.products.length > 0) {
            // Products found - create response with products and advisor message
            advisorResponse = {
              id: `advisor-${Date.now()}`,
              type: 'advisor',
              text: results.advisorMessage, // Use the actual advisor message from API
              products: results.products,
              timestamp: Date.now(),
            };
          } else {
            // No products found - use advisor message or fallback
            advisorResponse = {
              id: `advisor-${Date.now()}`,
              type: 'advisor',
              text: results.advisorMessage || `I couldn't find specific items for "${userMessage.text}" in my current catalog, but I'd love to help you find something perfect! ✨\n\nTry describing your needs more specifically, like:\n• "I need a romantic outfit for a first date"\n• "Show me professional blazers under $150"\n• "What's trending in streetwear this season?"\n• "I want a vintage-inspired summer look"\n\nWhat occasion or style are you shopping for?`,
              timestamp: Date.now(),
            };
          }
        } catch (apiError) {
          // API error - log details and show error message
          console.error('❌ FashionAdvisorChat: API error during product search:', {
            error: apiError,
            message: apiError instanceof Error ? apiError.message : 'Unknown API error',
            userQuery: userMessage.text,
            userProfile: combinedUserProfile,
            conversationContext: conversationContext
          });
          
          advisorResponse = {
            id: `advisor-${Date.now()}`,
            type: 'advisor',
            text: `Sorry - there was an issue connecting to our server😔.`,
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
      
      // Save advisor message to database
      if (sessionId) {
        try {
          const messageData: any = {
            userId: auth().currentUser?.uid || '',
            type: 'advisor',
            text: advisorResponse.text,
            productsFound: advisorResponse.products?.length || 0
          };
          
          // Only add products if they exist and are not undefined
          if (advisorResponse.products && advisorResponse.products.length > 0) {
            messageData.products = advisorResponse.products;
          }
          
          await saveFashionAdvisorMessage(sessionId, messageData);
        } catch (error) {
          console.error('Error saving advisor message:', error);
        }
      }
      
    } catch (error) {
      // Error handling with detailed logging
      console.error('❌ FashionAdvisorChat: General error in handleSendMessage:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userQuery: userMessage.text,
        sessionId: currentSessionId,
        isConnected: await checkApiHealth().catch(() => false)
      });
      
      const errorResponse: ChatMessage = {
        id: `advisor-${Date.now()}`,
        type: 'advisor',
        text: "Sorry - there was an issue connecting to our server. 😔\n\nI'm still here to help with styling advice though! Try asking me about:\n• What colors work well together\n• How to style specific pieces\n• Fashion trends and tips\n• Outfit ideas for different occasions\n\nWhat would you like to know about fashion?",
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, errorResponse]);
      
      // Save error message to database
      if (sessionId) {
        try {
          const messageData: any = {
            userId: auth().currentUser?.uid || '',
            type: 'advisor',
            text: errorResponse.text,
            productsFound: 0
          };
          
          await saveFashionAdvisorMessage(sessionId, messageData);
        } catch (error) {
          console.error('Error saving error message:', error);
        }
      }
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

  // Handle product card press - navigate to expanded product screen
  const handleProductPress = (productId: string, currentImageIndex = 0) => {
    console.log(`🔍 [ProductPress] Looking for product with ID: ${productId}`);
    
    // Find the product data from all messages
    let rawProduct: any = null;
    let foundInMessageIndex = -1;
    
    // Search through all messages to find the product
    for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
      const message = messages[messageIndex];
      if (message.products && message.products.length > 0) {
        console.log(`🔍 [ProductPress] Checking message ${messageIndex} with ${message.products.length} products`);
        
        // Try to find by exact ID match first (most reliable)
        rawProduct = message.products.find(p => p.id === productId);
        if (rawProduct) {
          foundInMessageIndex = messageIndex;
          console.log(`✅ [ProductPress] Found product by exact ID match in message ${messageIndex}`);
          break;
        }
        
        // Try to find by exact URL match (fallback)
        rawProduct = message.products.find(p => p.url === productId);
        if (rawProduct) {
          foundInMessageIndex = messageIndex;
          console.log(`✅ [ProductPress] Found product by exact URL match in message ${messageIndex}`);
          break;
        }
      }
    }
    
    if (!rawProduct) {
      logger.error(`Product with ID ${productId} not found in chat messages`);
      console.log('🐛 [ProductPress] Available products in messages:');
      messages.forEach((message, index) => {
        if (message.products && message.products.length > 0) {
          console.log(`  Message ${index}:`, message.products.map(p => ({ 
            id: p.id, 
            url: p.url, 
            name: p.name 
          })));
        }
      });
      return;
    }
    
    console.log(`✅ [ProductPress] Found product in message ${foundInMessageIndex}:`, {
      id: rawProduct.id,
      name: rawProduct.name,
      brand: rawProduct.brand
    });
    
    console.log('🐛 Found product for navigation:', JSON.stringify(rawProduct, null, 2));
    
    // Handle price formatting
    let formattedPrice = 0;
    if (typeof rawProduct.price === 'number') {
      formattedPrice = rawProduct.price;
    } else if (typeof rawProduct.price === 'string') {
      const priceMatch = rawProduct.price.match(/[\d.]+/);
      formattedPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
    }
    
    // Debug image data
    console.log('🐛 Raw product images:', rawProduct.images);
    console.log('🐛 First image URL:', rawProduct.images?.[0]);
    
    // Format the product data for the ExpandedProductScreen
    const productToPass = {
      id: rawProduct.id || rawProduct.url || 'unknown-product',
      productName: rawProduct.name || 'Unnamed Product',
      productImage: rawProduct.images && rawProduct.images.length > 0 ? rawProduct.images[0] : '',
      additionalImages: rawProduct.images && rawProduct.images.length > 1 
        ? rawProduct.images.slice(1) 
        : [],
      price: formattedPrice,
      brand: rawProduct.brand || '',
      description: rawProduct.description || '',
      images: rawProduct.images?.map((imgUrl: string, index: number) => ({
        id: `img-${index}`,
        url: imgUrl
      })) || [],
      productUrl: rawProduct.url || '',
    };
    
    console.log('🐛 Formatted product for navigation:', JSON.stringify(productToPass, null, 2));

    logger.log(`Navigating to ExpandedProductScreen2 with product ID: ${productToPass.id}`);
    console.log('🐛 Product data being passed to navigation:', JSON.stringify(productToPass, null, 2));
    
    // Navigate to the expanded product screen with source information
    (navigation as any).navigate('ExpandedProductScreen2', { 
      productId: productToPass.id,
      product: productToPass,
      initialImageIndex: currentImageIndex,
      sourceScreen: 'FashionAdvisorChat' // Add source screen information
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
          
          {/* Products carousel */}
          {hasProducts && (
            <View style={styles.productsContainer}>
              <FlatList
                data={item.products}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  // Blur the input when user starts scrolling products
                  inputRef.current?.blur();
                }}
                renderItem={({ item: product, index }) => {
                  // Debug logging for first product
                  if (index === 0) {
                    console.log('🐛 First product data:', JSON.stringify(product, null, 2));
                  }
                  
                  // Extract and format product data
                  // Use a more stable ID generation that includes message timestamp for uniqueness
                  const messageTimestamp = item.timestamp || Date.now();
                  const productId = product.id || product.url || `chat-product-${product.name?.replace(/\s+/g, '-') || 'unknown'}-${messageTimestamp}-${index}`;
                  const productName = product.name || 'Unnamed Product';
                  const productBrand = product.brand || 'Unknown Brand';
                  
                  // Debug logging for product ID generation
                  console.log(`🎯 [ProductRender] Product ${index}:`, {
                    originalId: product.id,
                    originalUrl: product.url,
                    generatedId: productId,
                    name: productName,
                    messageIndex: messages.findIndex(m => m.products?.includes(product))
                  });
                  
                  // Handle price - could be string or number
                  let productPrice = 0;
                  if (typeof product.price === 'number') {
                    productPrice = product.price;
                  } else if (typeof product.price === 'string') {
                    // Extract number from string like "25.99" or "$25.99"
                    const priceMatch = product.price.match(/[\d.]+/);
                    productPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
                  }
                  
                  // Handle currency
                  const productCurrency = product.currency || '$';
                  
                  // Handle images - convert string array to ProductImage array
                  const productImages = product.images?.map((imageUrl: string, imgIndex: number) => ({
                    id: `${productId}-img-${imgIndex}`,
                    url: imageUrl
                  })) || [];
                  
                  // Handle product URL
                  const productUrl = product.url || '';
                  
                  return (
                    <View style={styles.productCard}>
                      <UnifiedProductCard
                        id={productId}
                        name={productName}
                        brand={productBrand}
                        price={productPrice}
                        currency={productCurrency}
                        images={productImages}
                        productUrl={productUrl}
                        onCardPress={() => {
                          console.log(`🎯 [CardPress] Product clicked:`, {
                            productId,
                            productName,
                            productBrand,
                            messageTimestamp: item.timestamp
                          });
                          handleProductPress(productId);
                        }}
                        onAddToShelf={() => {
                          logger.log('Add to shelf:', productId);
                        }}
                        onSave={() => {
                          logger.log('Save product:', productId);
                        }}
                        isDarkMode={isDarkMode}
                        cardWidth={180}
                        imageAspectRatio={1.2}
                        cardType="full"
                        cardStyle={{ margin: 0 }}
                      />
                    </View>
                  );
                }}
                keyExtractor={(product, index) => product.id || product.url || `chat-product-${index}`}
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
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('FashionAdvisorHistory' as never)}
        >
          <Icon name="time-outline" size={24} color={textColor} />
        </TouchableOpacity>
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
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => {
            // Blur the input when user starts scrolling messages
            inputRef.current?.blur();
          }}
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
  historyButton: {
    padding: 8,
    marginLeft: 8,
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
    marginRight: 12,
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