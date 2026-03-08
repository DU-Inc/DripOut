import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Easing,
  Alert,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../styles/themeprovider';
import { colors } from '../../styles/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const POPUP_WIDTH = SCREEN_WIDTH * 0.95; // Increased width for better usability
const POPUP_HEIGHT = SCREEN_HEIGHT * 0.75; // Increased height for better usability

interface ExpandedPartialProductFeedProps {
  isVisible: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
  brandName?: string;
  productUrl: string;
  imageUrl?: string;
  sourcePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const ExpandedPartialProductFeed: React.FC<ExpandedPartialProductFeedProps> = ({
  isVisible,
  onClose,
  productId,
  productName = '',
  brandName = '',
  productUrl,
  imageUrl,
  sourcePosition = { x: SCREEN_WIDTH / 2 - 100, y: SCREEN_HEIGHT / 2 - 100, width: 200, height: 200 },
}) => {
  // Log dimensions for debugging
  useEffect(() => {
    if (isVisible) {
      console.log("ExpandedPartialProductFeed dimensions: ", { 
        POPUP_WIDTH, 
        POPUP_HEIGHT,
        screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } 
      });
    }
  }, [isVisible]);
  
  // WebView reference to control reload
  const webViewRef = useRef<WebView>(null);
  
  // Animation values for a smooth transition
  const animProgress = useRef(new Animated.Value(0)).current;
  
  // Calculate center position (where popup should end up)
  const centerX = 0;
  const centerY = 0;
  
  // Starting position (from card)
  const startX = sourcePosition.x + sourcePosition.width / 2 - SCREEN_WIDTH * 0.46;
  const startY = sourcePosition.y + sourcePosition.height / 2 - SCREEN_HEIGHT * 0.36;
  
  // Calculate scale needed from card size to popup size
  const startScale = Math.min(sourcePosition.width / (SCREEN_WIDTH * 0.92), 
                             sourcePosition.height / (SCREEN_HEIGHT * 0.72));
  
  // Interpolate all animation values from a single animProgress value
  const translateX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, centerX],
  });
  
  const translateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, centerY],
  });
  
  const scale = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startScale, 1],
  });
  
  const opacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });
  
  const rotate = animProgress.interpolate({
    inputRange: [0, 0.5, 0.7, 1],
    outputRange: ['-5deg', '3deg', '-1deg', '0deg'],
    extrapolate: 'clamp',
  });
  
  const backgroundOpacity = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });
  
  // Page loading state
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Animation controller ref to handle stopping animations
  const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  
  // Get theme colors
  const { isDarkMode, theme } = useTheme();
  const themeColors = isDarkMode ? colors.dark : colors.light;
  
  // Choose the display title (brand name has priority if available)
  const displayTitle = brandName || productName || 'Product Details';

  // Track the current URL to detect changes
  const [currentUrl, setCurrentUrl] = useState(productUrl);

  // Handle animations when visibility changes
  useEffect(() => {
    // Stop any ongoing animations
    if (activeAnimation.current) {
      activeAnimation.current.stop();
    }
    
    if (isVisible) {
      // Reset loading and error states when opening
      setIsLoading(true);
      setHasError(false);
      
      // Create smooth opening animation
      const openAnim = Animated.spring(animProgress, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      });
      
      // Store and start animation
      activeAnimation.current = openAnim;
      openAnim.start(() => {
        activeAnimation.current = null;
      });
    } else {
      // Create smooth closing animation
      const closeAnim = Animated.timing(animProgress, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      
      // Store and start animation
      activeAnimation.current = closeAnim;
      closeAnim.start(() => {
        activeAnimation.current = null;
      });
    }
  }, [isVisible, animProgress]);

  // Effect to handle productUrl changes
  useEffect(() => {
    // If the URL has changed
    if (productUrl !== currentUrl) {
      console.log(`[ExpandedPartialProductFeed] URL changed from ${currentUrl} to ${productUrl}`);
      setCurrentUrl(productUrl);
      
      // If WebView is already loaded, force reload
      if (isVisible && webViewRef.current) {
        webViewRef.current.reload();
        setIsLoading(true);
      }
    }
  }, [productUrl, currentUrl, isVisible]);

  // Handle WebView reload
  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Handle WebView load start
  const handleLoadStart = () => {
    setIsLoading(true);
  };

  // Handle WebView load end
  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // Handle WebView load error
  const handleLoadError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Close when clicking outside
  const handleBackdropPress = () => {
    onClose();
  };

  // Stop propagation for popup content
  const handleContentPress = (e: any) => {
    e.stopPropagation();
  };

  // Background color for modal overlay
  const backgroundColor = isDarkMode ? '#000' : '#000';

  // Enhanced WebView browser UI injection with full browser appearance
  const BROWSER_TOOLBAR_SCRIPT = `
    (function() {
      // Create browser chrome container
      var browserChrome = document.createElement('div');
      browserChrome.style.position = 'fixed';
      browserChrome.style.top = '0';
      browserChrome.style.left = '0';
      browserChrome.style.right = '0';
      browserChrome.style.height = '72px'; // Taller for more browser feel
      browserChrome.style.backgroundColor = '${isDarkMode ? '#1a1a1a' : '#f0f0f0'}';
      browserChrome.style.zIndex = '999999';
      browserChrome.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
      browserChrome.style.display = 'flex';
      browserChrome.style.flexDirection = 'column';
      
      // Create tabs bar
      var tabsBar = document.createElement('div');
      tabsBar.style.height = '28px';
      tabsBar.style.backgroundColor = '${isDarkMode ? '#252525' : '#e4e4e4'}';
      tabsBar.style.borderBottomWidth = '1px';
      tabsBar.style.borderBottomStyle = 'solid';
      tabsBar.style.borderBottomColor = '${isDarkMode ? '#333' : '#ccc'}';
      tabsBar.style.display = 'flex';
      tabsBar.style.alignItems = 'center';
      tabsBar.style.padding = '0 10px';
      
      // Create active tab
      var activeTab = document.createElement('div');
      activeTab.style.height = '28px';
      activeTab.style.backgroundColor = '${isDarkMode ? '#303030' : '#fff'}';
      activeTab.style.borderRadius = '8px 8px 0 0';
      activeTab.style.padding = '0 12px';
      activeTab.style.display = 'flex';
      activeTab.style.alignItems = 'center';
      activeTab.style.fontSize = '12px';
      activeTab.style.color = '${isDarkMode ? '#eee' : '#333'}';
      activeTab.style.borderWidth = '1px';
      activeTab.style.borderStyle = 'solid';
      activeTab.style.borderColor = '${isDarkMode ? '#333' : '#ccc'}';
      activeTab.style.borderBottomWidth = '0';
      activeTab.style.maxWidth = '200px';
      activeTab.style.whiteSpace = 'nowrap';
      activeTab.style.overflow = 'hidden';
      activeTab.style.textOverflow = 'ellipsis';
      
      // Create tab icon (simplified favicon)
      var tabIcon = document.createElement('div');
      tabIcon.style.width = '16px';
      tabIcon.style.height = '16px';
      tabIcon.style.borderRadius = '50%';
      tabIcon.style.backgroundColor = '#4285f4';
      tabIcon.style.marginRight = '6px';
      tabIcon.style.flexShrink = '0';
      
      activeTab.appendChild(tabIcon);
      activeTab.appendChild(document.createTextNode(document.title || 'New Tab'));
      tabsBar.appendChild(activeTab);
      
      // Address bar container
      var addressBarContainer = document.createElement('div');
      addressBarContainer.style.height = '44px';
      addressBarContainer.style.display = 'flex';
      addressBarContainer.style.alignItems = 'center';
      addressBarContainer.style.padding = '0 10px';
      
      // Navigation buttons container
      var navButtonsContainer = document.createElement('div');
      navButtonsContainer.style.display = 'flex';
      navButtonsContainer.style.marginRight = '10px';
      
      // Back button
      var backButton = document.createElement('div');
      backButton.innerHTML = '◀';
      backButton.style.width = '34px';
      backButton.style.height = '34px';
      backButton.style.display = 'flex';
      backButton.style.alignItems = 'center';
      backButton.style.justifyContent = 'center';
      backButton.style.borderRadius = '50%';
      backButton.style.color = '${isDarkMode ? '#bbb' : '#555'}';
      backButton.style.fontWeight = 'bold';
      backButton.style.cursor = 'pointer';
      backButton.style.fontSize = '12px';
      backButton.onclick = function() { window.history.back(); };
      
      // Forward button
      var forwardButton = document.createElement('div');
      forwardButton.innerHTML = '▶';
      forwardButton.style.width = '34px';
      forwardButton.style.height = '34px';
      forwardButton.style.display = 'flex';
      forwardButton.style.alignItems = 'center';
      forwardButton.style.justifyContent = 'center';
      forwardButton.style.borderRadius = '50%';
      forwardButton.style.color = '${isDarkMode ? '#bbb' : '#555'}';
      forwardButton.style.fontWeight = 'bold';
      forwardButton.style.cursor = 'pointer';
      forwardButton.style.fontSize = '12px';
      forwardButton.onclick = function() { window.history.forward(); };
      
      // Reload button
      var reloadButton = document.createElement('div');
      reloadButton.innerHTML = '↻';
      reloadButton.style.width = '34px';
      reloadButton.style.height = '34px';
      reloadButton.style.display = 'flex';
      reloadButton.style.alignItems = 'center';
      reloadButton.style.justifyContent = 'center';
      reloadButton.style.borderRadius = '50%';
      reloadButton.style.color = '${isDarkMode ? '#bbb' : '#555'}';
      reloadButton.style.cursor = 'pointer';
      reloadButton.onclick = function() { window.location.reload(); };
      
      navButtonsContainer.appendChild(backButton);
      navButtonsContainer.appendChild(forwardButton);
      navButtonsContainer.appendChild(reloadButton);
      
      // URL input field
      var urlField = document.createElement('div');
      urlField.style.flex = '1';
      urlField.style.height = '32px';
      urlField.style.backgroundColor = '${isDarkMode ? '#303030' : '#fff'}';
      urlField.style.borderRadius = '16px';
      urlField.style.display = 'flex';
      urlField.style.alignItems = 'center';
      urlField.style.paddingLeft = '12px';
      urlField.style.paddingRight = '12px';
      urlField.style.color = '${isDarkMode ? '#eee' : '#333'}';
      urlField.style.fontSize = '14px';
      urlField.style.whiteSpace = 'nowrap';
      urlField.style.overflow = 'hidden';
      urlField.style.textOverflow = 'ellipsis';
      urlField.style.borderWidth = '1px';
      urlField.style.borderStyle = 'solid';
      urlField.style.borderColor = '${isDarkMode ? '#444' : '#ddd'}';
      
      // Add URL lock/secure icon
      var secureIcon = document.createElement('div');
      secureIcon.style.marginRight = '6px';
      secureIcon.style.fontSize = '14px';
      secureIcon.innerHTML = '🔒';
      
      // URL text (with protocol prefix highlighted differently)
      var urlTextSpan = document.createElement('span');
      urlTextSpan.style.flex = '1';
      urlTextSpan.style.overflow = 'hidden';
      urlTextSpan.style.textOverflow = 'ellipsis';
      
      var url = window.location.href;
      var protocolEnd = url.indexOf('://') + 3;
      if (protocolEnd > 3) {
        var protocol = url.substring(0, protocolEnd);
        var rest = url.substring(protocolEnd);
        
        var protocolSpan = document.createElement('span');
        protocolSpan.style.color = '${isDarkMode ? '#777' : '#999'}';
        protocolSpan.textContent = protocol;
        
        urlTextSpan.appendChild(protocolSpan);
        urlTextSpan.appendChild(document.createTextNode(rest));
      } else {
        urlTextSpan.textContent = url;
      }
      
      urlField.appendChild(secureIcon);
      urlField.appendChild(urlTextSpan);
      
      // Add menu button (3 dots)
      var menuButton = document.createElement('div');
      menuButton.style.width = '34px';
      menuButton.style.height = '34px';
      menuButton.style.display = 'flex';
      menuButton.style.alignItems = 'center';
      menuButton.style.justifyContent = 'center';
      menuButton.style.borderRadius = '50%';
      menuButton.style.marginLeft = '8px';
      menuButton.style.cursor = 'pointer';
      menuButton.innerHTML = '⋮';
      menuButton.style.fontSize = '16px';
      menuButton.style.color = '${isDarkMode ? '#bbb' : '#555'}';
      
      addressBarContainer.appendChild(navButtonsContainer);
      addressBarContainer.appendChild(urlField);
      addressBarContainer.appendChild(menuButton);
      
      // Add components to chrome
      browserChrome.appendChild(tabsBar);
      browserChrome.appendChild(addressBarContainer);
      
      // Insert browser chrome and adjust page body
      document.body.style.marginTop = '72px';
      document.body.insertBefore(browserChrome, document.body.firstChild);
      
      // Update URL display when navigation occurs
      var updateUrlDisplay = function() {
        var url = window.location.href;
        var protocolEnd = url.indexOf('://') + 3;
        
        // Clear the URL text span
        while (urlTextSpan.firstChild) {
          urlTextSpan.removeChild(urlTextSpan.firstChild);
        }
        
        if (protocolEnd > 3) {
          var protocol = url.substring(0, protocolEnd);
          var rest = url.substring(protocolEnd);
          
          var protocolSpan = document.createElement('span');
          protocolSpan.style.color = '${isDarkMode ? '#777' : '#999'}';
          protocolSpan.textContent = protocol;
          
          urlTextSpan.appendChild(protocolSpan);
          urlTextSpan.appendChild(document.createTextNode(rest));
        } else {
          urlTextSpan.textContent = url;
        }
        
        // Update the tab title
        while (activeTab.childNodes.length > 1) {
          activeTab.removeChild(activeTab.lastChild);
        }
        activeTab.appendChild(document.createTextNode(document.title || 'New Tab'));
      };
      
      // Listen for navigation events
      window.addEventListener('popstate', updateUrlDisplay);
      
      // Monitor URL and title changes
      var lastUrl = window.location.href;
      var lastTitle = document.title;
      setInterval(function() {
        // Check for URL changes
        if (lastUrl !== window.location.href) {
          lastUrl = window.location.href;
          updateUrlDisplay();
        }
        
        // Check for title changes
        if (lastTitle !== document.title) {
          lastTitle = document.title;
          // Update tab title
          while (activeTab.childNodes.length > 1) {
            activeTab.removeChild(activeTab.lastChild);
          }
          activeTab.appendChild(document.createTextNode(document.title || 'New Tab'));
        }
      }, 300);
    })();
  `;

  // Update the WebView with better mobile optimization
  // Add viewport meta tag injection to the BROWSER_TOOLBAR_SCRIPT
  const MOBILE_OPTIMIZATION_SCRIPT = `
    (function() {
      // Inject viewport meta tag for better mobile rendering
      var meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
      
      // Force mobile view on sites that detect user agent differently
      var mobileMeta = document.createElement('meta');
      mobileMeta.name = 'handheldfriendly';
      mobileMeta.content = 'true';
      document.getElementsByTagName('head')[0].appendChild(mobileMeta);
      
      // Add mobile class to body
      document.body.classList.add('mobile-view');
      
      // Check for and update any responsive elements
      var links = document.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (href && href.indexOf('?') !== -1 && href.indexOf('mobile=') === -1) {
          links[i].setAttribute('href', href + '&mobile=1');
        } else if (href && href.indexOf('?') === -1) {
          links[i].setAttribute('href', href + '?mobile=1');
        }
      }
      
      // Monitor for any dynamic content changes
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length) {
            var mobileMetaExists = document.querySelector('meta[name="viewport"]');
            if (!mobileMetaExists) {
              var meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
              document.getElementsByTagName('head')[0].appendChild(meta);
            }
          }
        });
      });
      
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    })();
  `;

  // First, add a function to handle opening URL in external browser (similar to PartialDataCard)
  const handleOpenInBrowser = () => {
    if (productUrl) {
      Alert.alert(
        "Open in browser",
        `Would you like to open this link in your external browser?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          { 
            text: "Open", 
            onPress: () => {
              // Add mobile parameters to the URL if they don't exist
              let urlToOpen = productUrl;
              
              try {
                // Check if URL has query parameters
                if (urlToOpen.includes('?')) {
                  // URL already has parameters, append mobile parameters
                  if (!urlToOpen.includes('mobile=')) {
                    urlToOpen += '&mobile=1';
                  }
                  if (!urlToOpen.includes('view=')) {
                    urlToOpen += '&view=mobile';
                  }
                } else {
                  // URL has no parameters, add them
                  urlToOpen += '?mobile=1&view=mobile';
                }
              } catch (error) {
                console.log(`[ExpandedPartialProductFeed] Error modifying URL: ${error}`);
                urlToOpen = productUrl;
              }
              
              // Open in external browser
              Linking.openURL(urlToOpen).catch(err => {
                console.error(`Error opening URL: ${err}`);
                Alert.alert("Error", "Could not open the link in browser");
              });
            } 
          }
        ]
      );
    }
  };

  // Add a function to handle stopping the WebView load
  const handleStopLoading = () => {
    if (webViewRef.current) {
      console.log("[ExpandedPartialProductFeed] Stopping WebView load");
      webViewRef.current.stopLoading();
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.modalOverlay}>
          {/* Semi-transparent background */}
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              { 
                backgroundColor: backgroundColor,
                opacity: backgroundOpacity
              }
            ]}
          />
          
          {/* Popup container with smooth animation */}
          <TouchableWithoutFeedback onPress={handleContentPress}>
            <Animated.View 
              style={[
                styles.popupContainer,
                {
                  backgroundColor: themeColors.background,
                  opacity: opacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                    { rotate }
                  ],
                  ...themeColors.elevation.medium,
                }
              ]}
            >
              {/* Header with controls */}
              <View 
                style={[
                  styles.header, 
                  { 
                    backgroundColor: isDarkMode 
                      ? 'rgba(24, 24, 24, 0.7)' 
                      : 'rgba(245, 245, 245, 0.7)',
                    zIndex: 20, // Make sure header is above everything
                  }
                ]}
              >
                <View style={styles.titleContainer}>
                  {/* Wrap both icon and title in TouchableOpacity */}
                  <TouchableOpacity
                    onPress={handleOpenInBrowser}
                    style={styles.titleWithIconContainer}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    activeOpacity={0.7}
                  >
                    {/* External Link Icon */}
                    <Icon 
                      name="arrow-top-right" 
                      size={18} 
                      color={themeColors.text.primary} 
                    />
                    
                    {/* Title */}
                    <Text 
                      style={[styles.title, { color: themeColors.text.primary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayTitle}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.headerButtons}>
                  {/* Dynamic reload/loading button */}
                  <View style={styles.headerButton}>
                    {isLoading ? (
                      <TouchableOpacity
                        onPress={handleStopLoading}
                        activeOpacity={0.7}
                        style={styles.cancelLoadingButton}
                      >
                        <ActivityIndicator 
                          size="small" 
                          color={themeColors.primary} 
                        />
                        <View style={styles.cancelIndicator}>
                          <Icon 
                            name="close" 
                            size={12} 
                            color={themeColors.text.primary} 
                          />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        onPress={handleReload}
                        activeOpacity={0.7}
                        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Icon 
                          name="reload" 
                          size={22} 
                          color={themeColors.text.primary} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.headerButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Icon 
                      name="close" 
                      size={22} 
                      color={themeColors.text.primary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* WebView container */}
              <View style={styles.webViewContainer}>
                <WebView
                  ref={webViewRef}
                  key={`webview-${productUrl}`}
                  source={{ uri: productUrl }}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  onLoadStart={handleLoadStart}
                  onLoadEnd={handleLoadEnd}
                  onError={handleLoadError}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                  )}
                  renderError={() => (
                    <View style={styles.errorContainer}>
                      <Icon 
                        name="alert-circle-outline" 
                        size={40} 
                        color={themeColors.error} 
                      />
                      <Text style={[styles.errorText, { color: themeColors.text.primary }]}>
                        Failed to load page
                      </Text>
                      <TouchableOpacity 
                        style={[
                          styles.retryButton, 
                          { backgroundColor: themeColors.primary }
                        ]}
                        onPress={handleReload}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  // Browser UI injection with enhanced browser chrome
                  injectedJavaScript={BROWSER_TOOLBAR_SCRIPT + MOBILE_OPTIMIZATION_SCRIPT}
                  // Additional WebView props for a better browser experience
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsFullscreenVideo={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  pullToRefreshEnabled={true}
                  incognito={true}
                  cacheEnabled={false}
                  thirdPartyCookiesEnabled={false}
                  allowsBackForwardNavigationGestures={true}
                  sharedCookiesEnabled={false}
                  forceDarkOn={isDarkMode}
                  applicationNameForUserAgent="DripOutt Mobile App"
                  textZoom={100} // Ensure text size is appropriate
                  javaScriptCanOpenWindowsAutomatically={false}
                  scalesPageToFit={true}
                  userAgent={
                    Platform.OS === 'ios'
                      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 DripOutApp/1.0'
                      : 'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.0 DripOutApp/1.0'
                  }
                />
                
                {/* Loading overlay - only shown when WebView is loading */}
                {isLoading && (
                  <View 
                    style={[
                      styles.loadingOverlay, 
                      { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }
                    ]}
                  >
                    <ActivityIndicator size="large" color={themeColors.primary} />
                  </View>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  titleWithIconContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  externalLinkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelLoadingButton: {
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center',
    position: 'relative'
  },
  cancelIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});

export default ExpandedPartialProductFeed; 