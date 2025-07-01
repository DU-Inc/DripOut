import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { useTheme } from '../styles/themeprovider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { testApiConnectivity } from '../services/productService';

const ApiInfoScreen: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { isDarkMode } = useTheme();
  const [apiStatus, setApiStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');
  
  React.useEffect(() => {
    const checkApi = async () => {
      const isConnected = await testApiConnectivity();
      setApiStatus(isConnected ? 'online' : 'offline');
    };
    
    checkApi();
  }, []);
  
  const handleRetryConnection = async () => {
    setApiStatus('checking');
    const isConnected = await testApiConnectivity();
    setApiStatus(isConnected ? 'online' : 'offline');
  };
  
  // Theme colors
  const bgColor = isDarkMode ? '#121212' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const secondaryTextColor = isDarkMode ? '#AAAAAA' : '#666666';
  const cardBgColor = isDarkMode ? '#1E1E1E' : '#F5F5F5';
  const borderColor = isDarkMode ? '#333333' : '#DDDDDD';
  const accentColor = isDarkMode ? '#FF4870' : '#EF3D47';
  
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>API Connection</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
          <Icon name="close" size={24} color={textColor} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.statusCard, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.statusTitle, { color: textColor }]}>API Connection Status</Text>
          
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator, 
              { 
                backgroundColor: 
                  apiStatus === 'online' ? '#4CAF50' : 
                  apiStatus === 'offline' ? '#F44336' : 
                  '#FFC107' 
              }
            ]} />
            <Text style={[styles.statusText, { color: textColor }]}>
              {apiStatus === 'checking' ? 'Checking connection...' : 
               apiStatus === 'online' ? 'Connected' : 
               'Not connected'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={handleRetryConnection}
          >
            <Text style={styles.retryButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>Why am I seeing this?</Text>
          <Text style={[styles.infoText, { color: secondaryTextColor }]}>
            The app is having trouble connecting to the API server that provides product data.
            This could be due to:
          </Text>
          
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                The API server is not running or is unreachable
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                Your device is using a different network than the API server
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                The app is configured with the wrong API URL
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                There's a network issue or firewall blocking the connection
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>How to fix it</Text>
          
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                Ensure the API server is running on your development machine
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                {Platform.OS === 'ios' ? 
                  "iOS Simulator: Make sure you're using localhost:8000 as the API URL" :
                  "Android Emulator: Make sure you're using 10.0.2.2:8000 as the API URL"}
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                For physical devices, ensure the device and API server are on the same network
              </Text>
            </View>
            
            <View style={styles.bulletItem}>
              <Icon name="circle-small" size={24} color={accentColor} />
              <Text style={[styles.bulletText, { color: secondaryTextColor }]}>
                Update the API URL in the code to match your development environment
              </Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: cardBgColor }]}>
          <Text style={[styles.infoTitle, { color: textColor }]}>For Developers</Text>
          <Text style={[styles.infoText, { color: secondaryTextColor }]}>
            Check the src/Config/apiConfig.ts file and update the API URLs to match your environment:
          </Text>
          
          <View style={[styles.codeBlock, { backgroundColor: isDarkMode ? '#000000' : '#F0F0F0' }]}>
            <Text style={[styles.codeText, { color: isDarkMode ? '#E0E0E0' : '#333333' }]}>
              // In src/Config/apiConfig.ts{'\n'}
              const API_URLS = {'{'}
              {'\n'}  IOS_DEVICE: 'http://YOUR_IP:8000',{'\n'}
              {'\n'}  ANDROID_DEVICE: 'http://YOUR_IP:8000',{'\n'}
              {'\n'}  // ... other configurations{'\n'}
              {'}'};
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  codeBlock: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ApiInfoScreen;