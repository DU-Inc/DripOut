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
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../styles/themeprovider';
import { useNavigation } from '@react-navigation/native';
import { 
  getFashionAdvisorSessions, 
  deleteFashionAdvisorSession,
  FashionAdvisorSession,
  FashionAdvisorSessionWithDetails 
} from '../services/fashionAdvisorChatService';
import { auth } from '../Config/firebaseconfig';

const FashionAdvisorHistoryScreen: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  // State
  const [sessions, setSessions] = useState<FashionAdvisorSessionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Colors
  const mainColor = isDarkMode ? '#FF4870' : '#EF3D47';
  const bgColor = isDarkMode ? '#0A0A0F' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#202020';
  const subTextColor = isDarkMode ? '#B8B8CC' : '#757575';
  const borderColor = isDarkMode ? '#2A2A38' : '#EEEEEE';
  const cardBgColor = isDarkMode ? '#1A1A24' : '#F8F9FA';
  
  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);
  
  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const userId = auth().currentUser?.uid;
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      
      const userSessions = await getFashionAdvisorSessions();
      setSessions(userSessions);
      console.log(`Loaded ${userSessions.length} sessions`);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
    setIsRefreshing(false);
  };
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      setIsDeleting(sessionId);
      await deleteFashionAdvisorSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      console.log(`Deleted session: ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(null);
    }
  };
  
  const handleSessionPress = (session: FashionAdvisorSessionWithDetails) => {
    // Continue the conversation instead of just viewing it
    navigation.navigate('FashionAdvisorChat' as never, {
      sessionId: session.id
    } as never);
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const renderSessionItem = ({ item }: { item: FashionAdvisorSessionWithDetails }) => (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: cardBgColor, borderColor }]}
      onPress={() => handleSessionPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionTitle, { color: textColor }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.sessionDate, { color: subTextColor }]}>
            {item.lastMessageTime}
          </Text>
        </View>
        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item.id || '')}
            disabled={isDeleting === item.id}
          >
            {isDeleting === item.id ? (
              <ActivityIndicator size="small" color={mainColor} />
            ) : (
              <Icon name="trash-outline" size={20} color={subTextColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.sessionPreview, { color: subTextColor }]} numberOfLines={2}>
        {item.preview || 'No messages yet'}
      </Text>
    </TouchableOpacity>
  );
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chatbubbles-outline" size={60} color={subTextColor} />
      <Text style={[styles.emptyTitle, { color: textColor }]}>
        No Chat History Yet
      </Text>
      <Text style={[styles.emptyText, { color: subTextColor }]}>
        Start a conversation with your fashion advisor to see your chat history here.
      </Text>
      <TouchableOpacity
        style={[styles.startChatButton, { backgroundColor: mainColor }]}
        onPress={() => navigation.navigate('FashionAdvisorChat' as never)}
      >
        <Text style={styles.startChatButtonText}>Start New Chat</Text>
      </TouchableOpacity>
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
          <Text style={[styles.headerTitle, { color: textColor }]}>Chat History</Text>
          <Text style={[styles.headerSubtitle, { color: subTextColor }]}>Your fashion advisor conversations</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={mainColor} />
            <Text style={[styles.loadingText, { color: subTextColor }]}>Loading chat history...</Text>
          </View>
        ) : sessions.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id || Math.random().toString()}
            contentContainerStyle={styles.sessionsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={mainColor}
                colors={[mainColor]}
              />
            }
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
  sessionsList: {
    padding: 16,
  },
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  sessionPreview: {
    fontSize: 14,
    lineHeight: 20,
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
    marginBottom: 24,
  },
  startChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FashionAdvisorHistoryScreen; 