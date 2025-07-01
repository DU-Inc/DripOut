import React, { useRef, useState, useEffect, useCallback, ReactElement } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StyleSheet,
  StatusBar,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Share,
  ImageBackground,
  ScrollView,
  Easing,
  Alert,
  LogBox,
} from 'react-native';

// Suppress specific defaultProps warnings from react-native-render-html components
LogBox.ignoreLogs([
  'Support for defaultProps will be removed from function components in a future major release',
  'Support for defaultProps will be removed from memo components in a future major release',
]);

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FeedStackParamList } from '../../navigations/feedNavigator/FeedNavigator';
import { colors } from '../../styles/theme/colors';
import { SharedElement } from 'react-navigation-shared-element';
import ContentAction from '../../components/common/CardButtons/contentAction';
import { Article } from '../../components/feed/NewsCard';
import { getArticleById, getArticles, fetchFashionNews } from '../../services/newsService';
import axios from 'axios';
import RenderHtml from 'react-native-render-html';
import { decode } from 'html-entities';
import { useTheme } from '../../styles/themeprovider';
import { OPENAI_API_KEY } from '@env';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Constants ------------------
const MAX_HEADER = 300;
const MIN_HEADER = Platform.OS === 'ios' ? 90 : 70;
const TAB_BAR_HEIGHT = 50;
// Base tabs without comments
const BASE_TABS = ['Story', 'More Info'] as const;
// Tabs including comments
const TABS_WITH_COMMENTS = ['Story', 'Comments', 'More Info'] as const;

const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

// --- Types ----------------------
type Comment = {
  id: string;
  username: string;
  profileImageUrl?: string;
  content: string;
  timestamp: Date;
  likes: number;
};

type RelatedArticle = {
  id: string;
  headline: string;
  imageUrl?: string;
  sourceName: string;
  url?: string;
};

// Extended Article type that includes all the additional data we need for an expanded view
interface ExpandedArticle extends Article {
  readTime: string;
  content?: string;
  comments?: Comment[];
  relatedArticles?: RelatedArticle[];
  category?: string;
  hasComments: boolean;
  imageUrls?: string[];
}

type ExpandedNewsScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'ExpandedNewsScreen'>;
type ExpandedNewsScreenRouteProp = RouteProp<FeedStackParamList, 'ExpandedNewsScreen'>;

interface ExpandedNewsScreenProps {
  // No props needed as we get data from route
}

// Calculate read time based on word count (average reading speed: 200 words per minute)
const calculateReadTime = (content: string): string => {
  if (!content) return 'about 1 min';
  
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `about ${minutes} min`;
};

// --- API Functions --- 
// Directly fetch article by ID from the cache
const fetchArticle = async (id: string): Promise<ExpandedArticle> => {
  try {
    console.log(`Fetching article with ID: ${id}`);
    
    // Use the newsService's getArticleById function to fetch from cache
    const article = await getArticleById(id);
    
    if (article) {
      // Use the full article.content first, fall back to summary if content doesn't exist
      const fullContent = article.content || article.summary || '';
      
      // Get comments if available
      const commentsArray = article.comments || [];
      const hasComments = Array.isArray(commentsArray) && commentsArray.length > 0;
      
      // Calculate read time based on content length
      const readTime = article.readTime || calculateReadTime(fullContent);
      
      return {
        id: article.id,
        sourceName: article.source,
        headline: article.title,
        imageUrl: article.imageUrl,
        imageUrls: [article.imageUrl].filter(Boolean), // Create array from main image
        publishedAt: article.publishedAt,
        author: article.author || '',
        readTime: readTime,
        content: fullContent, // Using FULL content, not just summary
        category: article.category,
        comments: hasComments ? commentsArray : [],
        relatedArticles: [],
        hasComments: hasComments,
      };
    }
    
    console.error('Article not found in cache');
    throw new Error('Article not found');
  } catch (error) {
    console.error('Error fetching article:', error);
    throw error;
  }
};

// Function to fetch related articles from the same category
const fetchRelatedArticles = async (currentArticleId: string, category?: string): Promise<RelatedArticle[]> => {
  try {
    if (!category) {
      console.log('No category provided for related articles');
      return [];
    }
    
    console.log(`Fetching articles in category: ${category}`);
    
    // Use the newsService to get articles from the same category
    const articles = await getArticles(category as any, 11); // Get up to 11 articles (including current)
    
    // Filter out the current article
    const relatedArticles = articles
      .filter(article => article.id !== currentArticleId)
      .slice(0, 10) // Limit to 10 articles
      .map(article => ({
        id: article.id,
        headline: article.title,
        imageUrl: article.imageUrl,
        sourceName: article.source,
        url: article.url,
      }));
    
    console.log(`Found ${relatedArticles.length} related articles`);
    return relatedArticles;
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
};

// Function to fetch general articles when no related articles are available
const fetchMoreArticles = async (currentArticleId: string): Promise<RelatedArticle[]> => {
  try {
    console.log('Fetching general articles');
    
    // Use the newsService's fetchFashionNews function to get general articles
    const articles = await fetchFashionNews(11); // Get up to 11 articles
    
    // Filter out the current article
    const moreArticles = articles
      .filter(article => article.id !== currentArticleId)
      .slice(0, 10) // Limit to 10 articles
      .map(article => ({
        id: article.id,
        headline: article.title,
        imageUrl: article.imageUrl,
        sourceName: article.source,
        url: article.url,
      }));
    
    console.log(`Found ${moreArticles.length} general articles`);
    return moreArticles;
  } catch (error) {
    console.error('Error fetching more articles:', error);
    return [];
  }
};

// Simple function to return a gradient compatible color
const getGradientColorsForArticle = (article: ExpandedArticle): string[] => {
  // Map article sources to specific colors for a more consistent UI
  const sourceColorMap: Record<string, string> = {
    'Vogue': 'rgba(0,0,0,0.8)',
    'Harper\'s Bazaar': 'rgba(20,20,40,0.8)',
    'Elle': 'rgba(40,10,30,0.8)',
    'GQ': 'rgba(30,30,50,0.8)',
    'Fashion Business Journal': 'rgba(10,30,50,0.8)',
    'InStyle': 'rgba(50,20,30,0.8)',
    'Vanity Fair': 'rgba(30,10,40,0.8)',
    'Marie Claire': 'rgba(40,20,10,0.8)',
    'The Fashion Spot': 'rgba(20,40,50,0.8)',
    'WWD': 'rgba(50,30,20,0.8)',
  };
  
  // Get color based on source or use a default
  const baseColor = sourceColorMap[article.sourceName] || 'rgba(0,0,0,0.8)';
  
  return ['transparent', baseColor];
};

// --- Main Screen ----------------
const ExpandedNewsScreen: React.FC<ExpandedNewsScreenProps> = () => {
  const navigation = useNavigation<ExpandedNewsScreenNavigationProp>();
  const route = useRoute<ExpandedNewsScreenRouteProp>();
  
  // Get article from route
  const { articleId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [article, setArticle] = useState<ExpandedArticle | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  
  // Determine which tabs to use based on whether comments are available
  const [tabs, setTabs] = useState<readonly string[]>(BASE_TABS);
  
  // 1) scrollY drives everything
  const scrollY = useRef(new Animated.Value(0)).current;

  // 2) For tab presses we need section offsets
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<number[]>([0, 0, 0]); // Always have 3 possible sections
  const [activeTab, setActiveTab] = useState(0);

  // 3) Dynamic gradient colors
  const [gradientColors, setGradientColors] = useState<string[]>(['transparent', 'rgba(0,0,0,0.8)']);
  const { isDarkMode } = useTheme();
  
  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(30)).current;
  const navButtonsOpacity = useRef(new Animated.Value(0)).current;
  const navButtonsTranslateY = useRef(new Animated.Value(-20)).current;
  const tabBarOpacity = useRef(new Animated.Value(0)).current;
  const tabBarTranslateY = useRef(new Animated.Value(TAB_BAR_HEIGHT)).current;
  const summaryTranslateY = useRef(new Animated.Value(20)).current;
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  
  // Keep track of active animations for cleanup
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Stop all active animations to prevent memory leaks
      activeAnimations.current.forEach(animation => {
        if (animation) {
          animation.stop();
        }
      });
      activeAnimations.current = [];
      
      // Clear any pending timeouts
      // This ensures setTimeout callbacks don't execute after unmount
      const cleanup = () => {
        // No-op function to make sure references are properly destroyed
      };
      cleanup();
    };
  }, []);

  // Theme colors
  const { theme } = useTheme();

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId) {
        console.error('No article ID provided');
        setIsLoading(false);
        Alert.alert('Error', 'No article information provided.');
        navigation.goBack();
        return;
      }
      
      console.log(`Attempting to load article with ID: ${articleId}`);
      setIsLoading(true);
      
      try {
        // Fetch article data
        const articleData = await fetchArticle(articleId);
        
        // Fetch related articles
        let relatedArticlesData: RelatedArticle[] = [];
        
        if (articleData.category) {
          // Try to fetch articles from the same category first
          relatedArticlesData = await fetchRelatedArticles(articleId, articleData.category);
        }
        
        // If no related articles found, fetch general articles
        if (relatedArticlesData.length === 0) {
          console.log('No related articles found, fetching general articles');
          relatedArticlesData = await fetchMoreArticles(articleId);
        }
        
        // Update the article with related articles
        articleData.relatedArticles = relatedArticlesData;
        
        // Set the tabs based on whether comments are available
        if (articleData.hasComments && articleData.comments && articleData.comments.length > 0) {
          setTabs(TABS_WITH_COMMENTS);
        } else {
          setTabs(BASE_TABS);
        }
        
        setArticle(articleData);
        
        // Set gradient colors based on article source
        setGradientColors(getGradientColorsForArticle(articleData));
        
        setIsLoading(false);
      } catch (error) {
        console.error(`Error loading article with ID ${articleId}:`, error);
        setIsLoading(false);
        Alert.alert(
          'Error', 
          'Unable to load the article at this time. Please try again later.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };
    
    loadArticle();
  }, [articleId, navigation]);
  
  // Run entrance animations when article loads
  useEffect(() => {
    if (article && !isLoading) {
      // Start all animations together
      const animationsSequence = Animated.stagger(100, [
        // 1. Nav buttons slide-in and fade-in
        Animated.parallel([
          Animated.timing(navButtonsOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(navButtonsTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        
        // 2. Tab bar slide-in and fade-in
        Animated.parallel([
          Animated.timing(tabBarOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(tabBarTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        
        // 3. Content reveal slide-up and fade-in
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
      ]);
      
      // Track and start the animation sequence
      activeAnimations.current.push(animationsSequence);
      animationsSequence.start(({ finished }) => {
        if (finished) {
          const index = activeAnimations.current.indexOf(animationsSequence);
          if (index > -1) {
            activeAnimations.current.splice(index, 1);
          }
        }
      });
    }
  }, [article, isLoading, contentOpacity, contentTranslateY, navButtonsOpacity, navButtonsTranslateY, tabBarOpacity, tabBarTranslateY, activeAnimations]);

  // Format time ago from publishedAt date
  const formatTimeAgo = (date: Date): string => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    
    if (diff < 60) {
      return `${diff}m ago`;
    } else if (diff < 1440) {
      return `${Math.floor(diff / 60)}h ago`;
    } else {
      return `${Math.floor(diff / 1440)}d ago`;
    }
  };

  // --- Helpers -------------------
  const onSectionLayout = (index: number) => (e: any) => {
    sectionOffsets.current[index] = e.nativeEvent.layout.y;
  };

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    if (scrollRef.current && sectionOffsets.current[index] !== undefined) {
      // Account for header height
      const offsetY = sectionOffsets.current[index] - (MIN_HEADER + TAB_BAR_HEIGHT + 10);
      // Use scrollTo directly on the ref
      scrollRef.current.scrollTo({ y: offsetY, animated: true });
    }
  };

  const handleBack = () => {
    // Run exit animations
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(navButtonsOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabBarOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then go back
      navigation.goBack();
    });
  };

  const handleMenu = () => {
    // Show menu options
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = useCallback(async () => {
    if (!article) return;
    
    try {
      await Share.share({
        message: `Check out this article: ${article.headline}`,
        url: `https://yourapp.com/news/${article.id}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  }, [article]);

  const handleRelatedArticlePress = (id: string) => {
    if (id) {
      // Navigate to the ExpandedNewsScreen for the selected article
      navigation.push('ExpandedNewsScreen', { articleId: id });
    }
  };

  // Content action sub-actions
  const contentActions = [
    {
      id: 'share',
      icon: <Icon name="share-variant" size={24} color="#FFFFFF" />,
      label: 'Share',
      backgroundColor: 'transparent',
      onClick: handleShare,
    },
    {
      id: 'bookmark',
      icon: <Icon name={isBookmarked ? "bookmark" : "bookmark-outline"} size={24} color="#FFFFFF" />,
      label: 'Bookmark',
      backgroundColor: 'transparent',
      onClick: handleBookmark,
    },
    {
      id: 'like',
      icon: <Icon name={isLiked ? "thumb-up" : "thumb-up-outline"} size={24} color="#FFFFFF" />,
      label: 'Like',
      backgroundColor: 'transparent',
      onClick: handleLike,
    },
  ];

  // Function to summarize the article content
  const summarizeArticle = async () => {
    if (!article || !article.content) return;
    
    // First check if we already have a summary
    if (summary) {
      // If we already have a summary, just toggle its visibility
      setShowSummary(!showSummary);
      
      if (!showSummary) {
        // Animate the summary reveal
        animateSummaryReveal();
      } else {
        // Animate the summary hide
        animateSummaryHide();
      }
      return;
    }
    
    // Set loading state
    setIsSummarizing(true);
    
    try {
      // Use LLM API to generate summary
      const llmSummary = await generateLLMSummary(article.content);
      
      // Update state with the summary
      setSummary(llmSummary);
      setShowSummary(true);
      
      // Animate the summary reveal
      animateSummaryReveal();
    } catch (error) {
      console.error('Error summarizing article:', error);
      Alert.alert(
        'Summarization Failed',
        'Could not generate a summary at this time. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSummarizing(false);
    }
  };
  
  // Function to call the OpenAI API to generate a summary
  // NOTE: In a production environment, you should NEVER hardcode API keys in your code.
  // Instead, use a secure environment variable management system or a secure backend service
  // to handle API calls with sensitive authentication details.
  const generateLLMSummary = async (content: string): Promise<string> => {
    try {
      // Remove HTML tags and normalize whitespace for cleaner text
      const cleanedContent = content
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Limit content length to avoid excessive token usage
      const maxContentLength = 12000; // Adjust based on the model's token limit
      const truncatedContent = cleanedContent.length > maxContentLength 
        ? cleanedContent.substring(0, maxContentLength) + '...'
        : cleanedContent;
      
      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional journalist skilled in creating concise, insightful summaries. Summarize the article in a structured, informative way that captures the key points, main arguments, and important details. Your summary should be 3-4 paragraphs long and written in a professional tone.'
            },
            {
              role: 'user',
              content: `Summarize the following article:\n\n${truncatedContent}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );
      
      // Extract the summary from the response
      const summaryText = response.data.choices[0]?.message?.content;
      
      if (!summaryText) {
        throw new Error('No summary was generated');
      }
      
      return summaryText;
    } catch (error) {
      console.error('Error calling LLM API:', error);
      
      // Fallback to the algorithmic summary as a backup
      try {
        return generateSimpleSummary(content);
      } catch (fallbackError) {
        // If even the fallback fails, return a generic message
        return "The article discusses key developments in the fashion industry, highlighting important trends, business insights, and design innovations. Due to technical limitations, a detailed summary couldn't be generated at this time.";
      }
    }
  };

  // Keep the original function as fallback
  const generateSimpleSummary = (content: string): string => {
    if (!content) return "No content to summarize.";
    
    try {
      // Step 1: Preprocess the content
      const cleanedContent = content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      // Step 2: Split into paragraphs and sentences
      const paragraphs = cleanedContent.split(/\n\n+/);
      
      // Extract all sentences from the entire article
      const allSentences: {text: string; score: number; position: number}[] = [];
      paragraphs.forEach((paragraph, paragraphIndex) => {
        const sentences = paragraph
          .split(/(?<=[.!?])\s+/)
          .filter(s => s.trim().length > 20) // Only meaningful sentences
          .map(s => s.trim());
        
        sentences.forEach((sentence, sentenceIndex) => {
          // Calculate initial score based on position (higher for intro and conclusion)
          let positionScore = 0;
          
          // First paragraph sentences get higher scores
          if (paragraphIndex === 0) {
            positionScore += 3 - Math.min(sentenceIndex, 2);
          }
          // Last paragraph sentences also get higher scores
          else if (paragraphIndex === paragraphs.length - 1) {
            positionScore += 2 - Math.min(sentenceIndex, 1);
          }
          // Topic sentences (first in paragraph) get a bonus
          else if (sentenceIndex === 0) {
            positionScore += 1;
          }
          
          allSentences.push({
            text: sentence,
            score: positionScore,
            position: paragraphIndex * 100 + sentenceIndex // For preserving original order
          });
        });
      });
      
      // Step 3: Identify keywords and important terms
      // Create a frequency map of all words in the article (except stopwords)
      const stopwords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'what',
        'of', 'to', 'in', 'for', 'on', 'by', 'with', 'at', 'from', 'when', 'where',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'that', 'this', 'these', 'those', 'it', 'its', 'their'
      ]);
      
      const wordFrequency: Record<string, number> = {};
      
      cleanedContent.toLowerCase().split(/\W+/).forEach(word => {
        if (word.length > 3 && !stopwords.has(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
      
      // Step 4: Score sentences based on keyword frequency
      allSentences.forEach(sentenceObj => {
        const words = sentenceObj.text.toLowerCase().split(/\W+/);
        
        // Calculate keyword score
        let keywordScore = 0;
        words.forEach(word => {
          if (wordFrequency[word]) {
            keywordScore += wordFrequency[word];
          }
        });
        
        // Normalize by sentence length to avoid favoring long sentences
        keywordScore = keywordScore / Math.sqrt(words.length);
        
        // Add keyword score to position score
        sentenceObj.score += keywordScore;
      });
      
      // Step 5: Look for key phrases that indicate importance
      const importantPhrases = [
        'key', 'significant', 'important', 'critical', 'essential', 'crucial',
        'highlight', 'feature', 'focus', 'emphasize', 'reveal', 'discover',
        'revolutionize', 'transform', 'impact', 'influence', 'conclusion',
        'result', 'therefore', 'thus', 'ultimately', 'finally'
      ];
      
      allSentences.forEach(sentenceObj => {
        const lowerText = sentenceObj.text.toLowerCase();
        importantPhrases.forEach(phrase => {
          if (lowerText.includes(phrase)) {
            sentenceObj.score += 2; // Boost score for sentences with important phrases
          }
        });
      });
      
      // Step 6: Select top sentences for summary (ensuring coverage across the article)
      // Sort by score
      allSentences.sort((a, b) => b.score - a.score);
      
      // Take the top ~35% of sentences with highest scores
      const topCount = Math.max(3, Math.ceil(allSentences.length * 0.35));
      let selectedSentences = allSentences.slice(0, topCount);
      
      // Re-sort by original position to maintain narrative flow
      selectedSentences.sort((a, b) => a.position - b.position);
      
      // Step 7: Construct a coherent summary
      let summary = "";
      
      // Introduction
      if (selectedSentences.length > 0) {
        const introSentence = selectedSentences[0].text;
        summary = `This article covers ${introSentence.toLowerCase().replace(/^[^a-z]+/i, '')}. `;
      }
      
      // Main body - organize into key points
      if (selectedSentences.length > 1) {
        summary += "Key insights include: ";
        
        for (let i = 1; i < selectedSentences.length - 1; i++) {
          let sentenceText = selectedSentences[i].text.trim();
          
          // Clean up sentence beginnings
          sentenceText = sentenceText
            .replace(/^(Additionally|Furthermore|Moreover|Besides|Also|In addition|Next|Then),?\s+/i, '')
            .replace(/^(And|But|Or|Yet|So|However|Nevertheless|Therefore|Thus|Hence),?\s+/i, '');
          
          // Convert to lowercase if it's a continuation
          if (i > 1) {
            sentenceText = sentenceText.charAt(0).toLowerCase() + sentenceText.slice(1);
          }
          
          summary += sentenceText;
          
          if (i < selectedSentences.length - 2) {
            summary += "; ";
          } else {
            summary += ". ";
          }
        }
      }
      
      // Conclusion
      if (selectedSentences.length > 2) {
        const conclusionSentence = selectedSentences[selectedSentences.length - 1].text;
        
        // Add appropriate transition to conclusion
        if (conclusionSentence.match(/^(In conclusion|To summarize|Overall|Finally|In summary|Ultimately)/i)) {
          summary += conclusionSentence;
        } else {
          summary += "In conclusion, " + conclusionSentence.charAt(0).toLowerCase() + conclusionSentence.slice(1);
        }
      }
      
      return summary;
    } catch (error) {
      console.error('Error in advanced summary generation:', error);
      // Fallback summary with fashion industry focus
      return "This article explores the evolving landscape of fashion, examining industry trends, innovative design approaches, and the interplay between commercial interests and creative expression in the contemporary fashion ecosystem.";
    }
  };

  // Function to animate summary reveal in a streaming-like fashion
  const animateSummaryReveal = () => {
    // Reset animation values
    summaryOpacity.setValue(0);
    summaryTranslateY.setValue(20);
    
    // Create animation sequence
    const animation = Animated.parallel([
      Animated.timing(summaryOpacity, {
        toValue: 1,
        duration: 600, // Slower fade in for a more natural feel
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic), // Add easing for more natural animation
      }),
      Animated.timing(summaryTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)), // Add spring-like effect
      }),
    ]);
    
    // Track and start animation
    activeAnimations.current.push(animation);
    animation.start(({ finished }) => {
      if (finished) {
        const index = activeAnimations.current.indexOf(animation);
        if (index > -1) {
          activeAnimations.current.splice(index, 1);
        }
      }
    });
  };
  
  // Function to animate summary hiding
  const animateSummaryHide = () => {
    const animation = Animated.parallel([
      Animated.timing(summaryOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(summaryTranslateY, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    
    // Track and start animation
    activeAnimations.current.push(animation);
    animation.start(({ finished }) => {
      if (finished) {
        const index = activeAnimations.current.indexOf(animation);
        if (index > -1) {
          activeAnimations.current.splice(index, 1);
        }
      }
    });
  };

  // First, let's create a helper function to safely handle HTML content
  const renderHtmlContent = (htmlContent: string | undefined, theme: any, showSummary: boolean = false): ReactElement => {
    if (!htmlContent) {
      return <Text style={[styles.bodyText, { color: theme.text.secondary }]}>No content available</Text>;
    }

    // Try to extract images from the HTML content
    const extractedImages: string[] = [];
    const imgRegex = /<img.*?src=["'](.*?)["'].*?>/g;
    let match;
    
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      if (match[1] && !match[1].startsWith('data:')) { // Exclude base64 images
        extractedImages.push(match[1]);
      }
    }

    // Clean up any problematic HTML
    const cleanHtml = htmlContent
      .replace(/\\n/g, '')
      .replace(/\\t/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");

    return (
      <View>
        <RenderHtml
          source={{ html: decode(cleanHtml) }}
          contentWidth={SCREEN_WIDTH - 40}
          tagsStyles={{
            p: { 
              fontSize: 16, 
              lineHeight: 26, 
              color: theme.text.secondary,
              marginBottom: 20,
              opacity: showSummary ? 0.7 : 1
            },
            img: {
              width: '100%',
              height: 200,
              marginVertical: 10,
              borderRadius: 8
            },
            a: {
              color: theme.primary,
              textDecorationLine: 'none'
            },
            body: {
              color: theme.text.secondary,
            },
            span: {
              color: theme.text.secondary,
            },
            div: {
              marginBottom: 15,
              color: theme.text.secondary,
            },
            h1: {
              color: theme.text.primary,
              fontSize: 22,
              fontWeight: 'bold',
              marginVertical: 12,
            },
            h2: {
              color: theme.text.primary,
              fontSize: 20,
              fontWeight: 'bold',
              marginVertical: 10,
            },
            h3: {
              color: theme.text.primary,
              fontSize: 18,
              fontWeight: 'bold',
              marginVertical: 8,
            },
            ul: {
              color: theme.text.secondary,
              marginLeft: 20,
            },
            ol: {
              color: theme.text.secondary,
              marginLeft: 20,
            },
            li: {
              color: theme.text.secondary,
              marginBottom: 8,
            },
            blockquote: {
              borderLeftWidth: 4,
              borderLeftColor: theme.primary,
              paddingLeft: 12,
              marginLeft: 12,
              opacity: 0.9,
            }
          }}
          enableExperimentalBRCollapsing={true}
          enableExperimentalMarginCollapsing={true}
        />
        
        {/* Display any extracted images separately for better control */}
        {extractedImages.length > 0 && (
          <View style={styles.extractedImagesContainer}>
            {extractedImages.map((imageUrl, index) => (
              <Image
                key={`extracted-img-${index}`}
                source={{ uri: imageUrl }}
                style={styles.extractedImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render loading state
  if (isLoading || !article) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {/* 1) Parallax + Shrinking Header */}
      <AnimatedHeader
        scrollY={scrollY}
        article={article}
        navButtonsOpacity={navButtonsOpacity}
        navButtonsTranslateY={navButtonsTranslateY}
        onBack={handleBack}
        onMenu={handleMenu}
        gradientColors={gradientColors}
        contentActions={contentActions}
        theme={theme}
      />

      {/* 2) Sticky Tab Bar - higher zIndex ensures it stays on top */}
      <Animated.View style={{
        opacity: tabBarOpacity,
        transform: [{ translateY: tabBarTranslateY }],
        zIndex: 100, // Higher zIndex to ensure it's above content
      }}>
        <StickyTabBar
          scrollY={scrollY}
          activeTab={activeTab}
          onTabPress={handleTabPress}
          theme={theme}
          tabs={tabs}
        />
      </Animated.View>

      {/* 3) Scrollable Content */}
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: MAX_HEADER + TAB_BAR_HEIGHT }
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }]
        }}
      >
        {/* Story Section */}
        <View onLayout={onSectionLayout(0)} style={[styles.section, { backgroundColor: theme.background }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>Story</Text>
            <TouchableOpacity 
              style={styles.summarizeButton}
              onPress={summarizeArticle}
              disabled={isSummarizing || !article?.content}
            >
              {isSummarizing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Icon name="text-box-search-outline" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
          
          {article?.author && (
            <View style={styles.authorContainer}>
              <View style={[styles.authorImagePlaceholder, { backgroundColor: 'rgba(130, 36, 50, 0.9)' }]}>
                <Text style={styles.authorInitial}>{article.author.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.authorInfo}>
                <Text style={[styles.authorName, { color: theme.text.primary }]}>{article.author}</Text>
                <Text style={[styles.authorRole, { color: theme.text.tertiary }]}>
                  Contributing Writer • {formatTimeAgo(article.publishedAt)}
                </Text>
              </View>
            </View>
          )}
          
          {/* Main Article Content Container */}
          <View style={styles.articleContentContainer}>
            {/* Animated Summary Section - Moved to the top */}
            {showSummary && (
              <Animated.View 
                style={[
                  styles.summaryContainer,
                  {
                    backgroundColor: theme.surface,
                    opacity: summaryOpacity,
                    transform: [{ translateY: summaryTranslateY }],
                    borderColor: theme.border,
                  }
                ]}
              >
                <View style={styles.summaryHeader}>
                  <Text style={[styles.summaryTitle, { color: theme.text.primary }]}>Summary</Text>
                  <TouchableOpacity onPress={() => setShowSummary(false)}>
                    <Icon name="close" size={20} color={theme.text.secondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.summaryText, { color: theme.text.secondary }]}>
                  {summary}
                </Text>
              </Animated.View>
            )}
            
            {/* Full Article Content */}
            {article?.content && (
              <View style={styles.fullArticleContent}>
                {renderHtmlContent(article.content, theme, showSummary)}
              </View>
            )}
            
            {/* Blur Overlay when Summary is Shown - Raised Higher */}
            {showSummary && (
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
                style={styles.blurOverlay}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.5 }} // Raised to cover half the content
              />
            )}
          </View>
          
          {/* Display additional images if available */}
          {article?.imageUrls && article.imageUrls.length > 1 && (
            <View style={styles.additionalImagesContainer}>
              {article.imageUrls.slice(1).map((imageUrl, index) => (
                <Image 
                  key={`img-${index}`}
                  source={{ uri: imageUrl }}
                  style={styles.additionalImage}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>

        {/* Comments Section - Only rendered if comments exist */}
        {article.hasComments && article.comments && article.comments.length > 0 && (
          <View onLayout={onSectionLayout(1)} style={[styles.section, { backgroundColor: theme.background }]}>
            <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>Comments</Text>
            {article.comments.map(comment => (
              <View key={comment.id} style={[styles.commentContainer, { borderBottomColor: theme.border }]}>
                <View style={styles.commentHeader}>
                  {comment.profileImageUrl ? (
                    <Image source={{ uri: comment.profileImageUrl }} style={styles.commentAvatar} />
                  ) : (
                    <View style={[styles.commentAvatarPlaceholder, { backgroundColor: theme.glassmorphism.background }]}>
                      <Text style={[styles.commentAvatarInitial, { color: theme.text.primary }]}>{comment.username.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.commentMeta}>
                    <Text style={[styles.commentUsername, { color: theme.text.primary }]}>{comment.username}</Text>
                    <Text style={[styles.commentTime, { color: theme.text.tertiary }]}>{formatTimeAgo(comment.timestamp)}</Text>
                  </View>
                </View>
                <Text style={[styles.commentText, { color: theme.text.secondary }]}>
                  {comment.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* More Info Section */}
        <View 
          onLayout={onSectionLayout(article.hasComments ? 2 : 1)} 
          style={[styles.section, styles.lastSection, { backgroundColor: theme.background }]}
        >
          <Text style={[styles.sectionHeading, { color: theme.text.primary }]}>
            {article.relatedArticles && article.relatedArticles.length > 0 
              ? (article.category ? 'Related Articles' : 'More Articles') 
              : 'More Info'}
          </Text>
          
          {article.relatedArticles && article.relatedArticles.length > 0 ? (
            article.relatedArticles.map(relatedArticle => (
              <TouchableOpacity 
                key={relatedArticle.id} 
                style={[styles.relatedArticleCard, { backgroundColor: theme.surface }]}
                onPress={() => handleRelatedArticlePress(relatedArticle.id)}
              >
                <View style={styles.relatedArticleContent}>
                  <Text style={[styles.relatedArticleSource, { color: theme.text.tertiary }]}>
                    {relatedArticle.sourceName}
                  </Text>
                  <Text 
                    style={[styles.relatedArticleHeadline, { color: theme.text.primary }]}
                    numberOfLines={2}
                  >
                    {relatedArticle.headline}
                  </Text>
                </View>
                {relatedArticle.imageUrl && (
                  <Image 
                    source={{ uri: relatedArticle.imageUrl }} 
                    style={styles.relatedArticleImage}
                  />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.emptyStateText, { color: theme.text.tertiary }]}>No related articles available</Text>
          )}
          
          <View style={[styles.sourceInfoContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sourceInfoHeader, { color: theme.text.secondary }]}>About {article.sourceName}</Text>
            <View style={styles.sourceInfoContent}>
              {article.sourceLogoUrl ? (
                <Image source={{ uri: article.sourceLogoUrl }} style={styles.sourceLogo} />
              ) : (
                <View style={[styles.sourceLogoPlaceholder, { backgroundColor: theme.glassmorphism.background }]}>
                  <Text style={[styles.sourceLogoText, { color: theme.text.primary }]}>{article.sourceName.charAt(0)}</Text>
                </View>
              )}
              <Text style={[styles.sourceDescription, { color: theme.text.tertiary }]}>
                {article.sourceName} is a leading publication covering fashion, business, and innovation. Stay up-to-date with the latest trends and analysis from industry experts.
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

// --- AnimatedHeader Component ----
interface HeaderProps {
  scrollY: Animated.Value;
  article: ExpandedArticle;
  navButtonsOpacity: Animated.Value;
  navButtonsTranslateY: Animated.Value;
  onBack: () => void;
  onMenu: () => void;
  gradientColors: string[];
  contentActions: any[];
  theme: any;
}

const AnimatedHeader: React.FC<HeaderProps> = ({
  scrollY, 
  article,
  navButtonsOpacity,
  navButtonsTranslateY,
  onBack, 
  onMenu, 
  gradientColors,
  contentActions,
  theme
}) => {
  // Calculate the min/max values once to avoid inconsistencies
  const headerMaxHeight = 300; // MAX_HEADER
  const headerMinHeight = Platform.OS === 'ios' ? 90 : 70; // MIN_HEADER
  const scrollDistance = headerMaxHeight - headerMinHeight;
  
  // Header animation interpolations with safe, constant values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [headerMaxHeight, headerMinHeight],
    extrapolate: 'clamp'
  });
  
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [0, -50],
    extrapolate: 'clamp'
  });
  
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.5, scrollDistance],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });
  
  const titleScale = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [1, 0.8],
    extrapolate: 'clamp'
  });
  
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [0, -40],
    extrapolate: 'clamp'
  });
  
  const titleOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.7, scrollDistance],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });
  
  // Ensure fixed values in ascending order for NavBar title opacity
  const fixedNavBarTitleOpacity = scrollY.interpolate({
    inputRange: [0, 200, 250],  // Strictly increasing values
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });

  // Helper function for time formatting
  const formatTimeAgo = (date: Date): string => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    
    if (diff < 60) {
      return `${diff}m ago`;
    } else if (diff < 1440) {
      return `${Math.floor(diff / 60)}h ago`;
    } else {
      return `${Math.floor(diff / 1440)}d ago`;
    }
  };

  // Format time ago
  const timeAgo = formatTimeAgo(article.publishedAt);

  return (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      {/* Parallax Image */}
      <Animated.View 
        style={[
          styles.headerImageContainer, 
          { 
            opacity: imageOpacity,
            transform: [{ translateY: imageTranslateY }] 
          }
        ]}
      >
        <SharedElement id={`article.${article.id}.image`} style={[StyleSheet.absoluteFill, { borderBottomLeftRadius: 25, borderBottomRightRadius: 25 }]}>
          <Image source={{ uri: article.imageUrl }} style={styles.headerImage} />
        </SharedElement>
      </Animated.View>

      {/* Gradient overlay for better text readability */}
      <Animated.View style={[styles.gradientOverlay, { opacity: gradientOpacity }]}>
        <LinearGradient
          colors={gradientColors}
          style={[StyleSheet.absoluteFillObject, { borderBottomLeftRadius: 25, borderBottomRightRadius: 25 }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Navigation Bar - Always visible */}
      <View 
        style={[
          styles.navBar
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.navButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Animated.Text 
          style={[styles.navBarTitle, { opacity: fixedNavBarTitleOpacity, color: '#FFFFFF' }]}
          numberOfLines={1}
        >
          {article.headline}
        </Animated.Text>
        
        {/* Empty View to maintain flex layout */}
        <View style={{ width: 42 }} />
      </View>

      {/* Title & Meta */}
      <Animated.View 
        style={[
          styles.titleContainer, 
          { 
            opacity: titleOpacity,
            transform: [
              { scale: titleScale },
              { translateY: titleTranslateY }
            ] 
          }
        ]}
      >
        <View style={styles.sourceRow}>
          {article.sourceLogoUrl ? (
            <Image source={{ uri: article.sourceLogoUrl }} style={styles.sourceLogo} />
          ) : null}
          <Text style={[styles.source, { color: '#FFFFFF' }]}>{article.sourceName}</Text>
        </View>
        
        <SharedElement id={`article.${article.id}.title`}>
          <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={3}>{article.headline}</Text>
        </SharedElement>
        
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: '#FFFFFF' }]}>{timeAgo} • {article.readTime}</Text>
          
          <View style={styles.actionButtons}>
            <ContentAction
              actions={contentActions}
              expansionMode="vertical"
              size={32}
              backgroundColor="rgba(0,0,0,0.3)"
              iconColor="#FFFFFF"
              spacing={6}
              isActive={true}
              isDarkMode={true}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// --- StickyTabBar Component ------
interface TabProps {
  scrollY: Animated.Value;
  activeTab: number;
  onTabPress: (idx: number) => void;
  theme: any;
  tabs: readonly string[];
}

const StickyTabBar: React.FC<TabProps> = ({ scrollY, activeTab, onTabPress, theme, tabs }) => {
  // Use fixed values to avoid calculation issues
  const scrollThreshold = 180; // Safe value based on MAX_HEADER - MIN_HEADER - 50
  
  // Initially hidden, becomes visible when scrolling
  const opacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.3, scrollThreshold * 0.7],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });
  
  const backgroundColor = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [theme.background, theme.background], // Always use theme background with opacity
    extrapolate: 'clamp'
  });

  const translateY = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [0, 0],
    extrapolate: 'clamp'
  });

  const indicatorTranslateX = useRef(new Animated.Value(0)).current;
  
  // Animate the indicator when active tab changes
  useEffect(() => {
    Animated.spring(indicatorTranslateX, {
      toValue: activeTab,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [activeTab, indicatorTranslateX]);

  // Map the indicator position to screen coordinates
  const tabWidth = (SCREEN_WIDTH - 40) / tabs.length;
  const indicatorPosition = indicatorTranslateX.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth),
  });

  return (
    <>
      {/* Full-height background that extends to the top */}
      <Animated.View 
        style={[
          tabStyles.backgroundContainer, 
          { 
            backgroundColor: theme.background,
            opacity, // Apply opacity based on scroll
            height: MIN_HEADER,
          }
        ]}
      />
      
      {/* Actual tab bar with content */}
      <Animated.View 
        style={[
          tabStyles.container, 
          { 
            top: MIN_HEADER - TAB_BAR_HEIGHT, // Position it at the bottom of the extended area
            backgroundColor: theme.background,
            opacity, // Apply opacity based on scroll
            transform: [{ translateY }],
            zIndex: 200, // Ensure this is higher than other components
            shadowColor: theme.text.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 5,
            borderBottomColor: theme.border,
          }
        ]}
      >
        {tabs.map((label, idx) => (
          <TouchableOpacity 
            key={label} 
            style={tabStyles.tab} 
            onPress={() => onTabPress(idx)}
          >
            <Text 
              style={[
                tabStyles.label, 
                { color: activeTab === idx ? theme.text.primary : theme.text.tertiary },
                activeTab === idx && tabStyles.activeLabel
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
        
        <Animated.View
          style={[
            tabStyles.indicator,
            { 
              backgroundColor: theme.primary,
              transform: [{ translateX: indicatorPosition }],
              width: tabWidth, // Dynamic width based on number of tabs
            }
          ]}
        />
      </Animated.View>
    </>
  );
};

// --- Main Component Styles -----------------------
// Use static colors for StyleSheet definitions since theme is not available in this scope
// These will be overridden by inline styles where needed
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // Header styles
  header: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 10, 
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerImageContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  gradientOverlay: { 
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  navBar: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 50, 
    left: 0,
    right: 0,
    height: 56,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    paddingHorizontal: 16,
    zIndex: 10, // Increase z-index further to be above everything
  },
  navButton: { 
    padding: 12, 
    borderRadius: 40, // Much more rounded (fully circular)
    backgroundColor: 'rgba(0,0,0,0.8)', // More opaque background for shadow efficiency
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 5, // Add elevation for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  navText: { 
    color: '#FFFFFF', 
    fontSize: 24 
  },
  navBarTitle: {
    color: '#FFFFFF', // Always white
    fontSize: 16,
    fontWeight: '600',
    maxWidth: SCREEN_WIDTH - 120,
    marginHorizontal: 10,
  },
  titleContainer: { 
    position: 'absolute', 
    left: 16, 
    right: 16, 
    bottom: 24,
    paddingBottom: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  source: { 
    color: '#FFFFFF', // Always white
    fontSize: 14, 
    fontWeight: '600' 
  },
  title: { 
    color: '#FFFFFF', // Always white
    fontSize: 24, 
    fontWeight: '700',
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  meta: { 
    color: '#FFFFFF', 
    fontSize: 14, 
  },
  actionButtons: {
    flexDirection: 'row',
  },
  
  // Content section styles
  section: { 
    paddingHorizontal: 20, 
    paddingVertical: 24,
  },
  lastSection: {
    paddingBottom: 70, // Extra padding at the bottom
  },
  sectionHeading: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 16 
  },
  
  // Story section
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23, // Fully circular
    backgroundColor: 'rgba(58, 49, 50, 0.9)', // Use a reddish color similar to theme.primary
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  authorInitial: {
    color: '#FFFFFF', // Always white for contrast
    fontSize: 20,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  authorRole: {
    fontSize: 14,
  },
  bodyText: { 
    fontSize: 16, 
    lineHeight: 26,
    marginBottom: 20,
  },
  
  emptyStateText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  
  // More Info section
  relatedArticlesHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  relatedArticleCard: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  relatedArticleContent: {
    flex: 1,
    padding: 12,
  },
  relatedArticleSource: {
    fontSize: 12,
    marginBottom: 4,
  },
  relatedArticleHeadline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  relatedArticleImage: {
    width: 80,
    height: 80,
  },
  sourceInfoContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sourceInfoHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sourceInfoContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  sourceLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceLogoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sourceDescription: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summarizeButton: {
    padding: 8,
    borderRadius: 20,
  },
  articleContentContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    opacity: 0.9,
    zIndex: 5, // Below the summary but above the text
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 12,
    position: 'relative',
    zIndex: 10, // Above the blur overlay
    marginTop: 0,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  additionalImagesContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  additionalImage: {
    width: SCREEN_WIDTH / 3,
    height: 200,
    resizeMode: 'cover',
  },
  fullArticleContent: {
    position: 'relative',
    marginTop: 16,
  },
  commentContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  commentMeta: {
    flexDirection: 'column',
  },
  commentUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 14,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 26,
  },
  // Add the new styles for extracted images
  extractedImagesContainer: {
    marginVertical: 15,
  },
  extractedImage: {
    width: '100%',
    height: 200,
    marginBottom: 15,
    borderRadius: 8,
  },
});

// --- Tab Bar Styles -----------------------
const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    zIndex: 200,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20, // Add horizontal padding
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    zIndex: 199, // Just below the tab container
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  label: { 
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeLabel: { 
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#3498db',
  },
});

export default ExpandedNewsScreen; 