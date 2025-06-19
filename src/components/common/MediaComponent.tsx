import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/Ionicons';

interface MediaComponentProps {
  uri: string;
  style?: ViewStyle | ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoad?: () => void;
  onError?: (error: any) => void;
  placeholder?: React.ReactNode;
  showControls?: boolean;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
}

const MediaComponent: React.FC<MediaComponentProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  onLoad,
  onError,
  placeholder,
  showControls = false,
  muted = true,
  loop = true,
  autoPlay = true,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'unknown'>('unknown');

  // Detect media type from URL
  const detectMediaType = useCallback((url: string): 'image' | 'video' => {
    const lowercaseUrl = url.toLowerCase();
    
    // Video formats
    if (lowercaseUrl.includes('.mp4') || 
        lowercaseUrl.includes('.m3u8') || 
        lowercaseUrl.includes('.webm') || 
        lowercaseUrl.includes('.mov') || 
        lowercaseUrl.includes('/video/') ||
        lowercaseUrl.includes('video')) {
      return 'video';
    }
    
    // GIF files - treat as video for better performance
    if (lowercaseUrl.includes('.gif')) {
      return 'video';
    }
    
    // Default to image
    return 'image';
  }, []);

  React.useEffect(() => {
    if (uri) {
      setMediaType(detectMediaType(uri));
      setIsLoading(true);
      setHasError(false);
    }
  }, [uri, detectMediaType]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    console.log(`[MediaComponent] Media load error for ${uri}:`, error);
    onError?.(error);
  }, [onError, uri]);

  const handleVideoLoad = useCallback(() => {
    handleLoad();
  }, [handleLoad]);

  const handleVideoError = useCallback((error: any) => {
    console.log(`[MediaComponent] Video error, falling back to image for ${uri}:`, error);
    // Try fallback to image if video fails
    setMediaType('image');
  }, [uri]);

  const handleImageError = useCallback((error: any) => {
    handleError(error);
  }, [handleError]);

  if (!uri) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Icon name="image-outline" size={32} color="#999" />
        <Text style={styles.errorText}>No media URL</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        {placeholder || (
          <>
            <Icon name="alert-circle-outline" size={32} color="#999" />
            <Text style={styles.errorText}>Failed to load media</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {mediaType === 'video' ? (
        <Video
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius: style?.borderRadius || 0 }]}
          resizeMode={resizeMode}
          repeat={loop}
          muted={muted}
          paused={!autoPlay}
          controls={showControls}
          onLoad={handleVideoLoad}
          onError={handleVideoError}
          onLoadStart={() => setIsLoading(true)}
          poster={undefined} // No poster image
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
        />
      ) : (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { borderRadius: style?.borderRadius || 0 }]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleImageError}
          onLoadStart={() => setIsLoading(true)}
        />
      )}
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default MediaComponent; 