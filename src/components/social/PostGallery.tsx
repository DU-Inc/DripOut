import React from 'react';
import { View, Image, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface PostGalleryProps {
  gallery: string[];
  currentImageIndex: number;
  panX: Animated.Value;
  panResponder: any;
  isDarkMode: boolean;
  styles: any;
  onCycleImage: (direction: 'next' | 'prev') => void;
}

const PostGallery: React.FC<PostGalleryProps> = ({
  gallery,
  currentImageIndex,
  panX,
  panResponder,
  isDarkMode,
  styles,
  onCycleImage,
}) => {
  return (
    <Animated.View 
      style={[
        styles.galleryContainer,
        {
          transform: [
            { 
              translateX: panX ? panX.interpolate({
                inputRange: [-400, 0, 400], // Adjusted for screen width
                outputRange: [-120, 0, 120], // Adjusted for screen width * 0.3
                extrapolate: 'clamp'
              }) : 0
            }
          ]
        }
      ]}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      <Image 
        source={{ uri: gallery[currentImageIndex] }} 
        style={styles.galleryImage}
      />
      
      {/* Subtle overlay for depth */}
      <View style={styles.galleryOverlay} />
      
      {/* Inner shadow/border for refinement */}
      <View style={[
        styles.galleryInnerShadow,
        isDarkMode && { borderColor: 'rgba(124, 107, 255, 0.15)' }
      ]} />
      
      {/* Image navigation dots */}
      {gallery.length > 1 && (
        <View style={styles.galleryDots}>
          {gallery.map((_, i: number) => (
            <View 
              key={`dot-${i}`} 
              style={[
                styles.galleryDot, 
                i === currentImageIndex && {
                  backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                  width: 8,
                }
              ]} 
            />
          ))}
        </View>
      )}
      
      {/* Left/Right navigation buttons for gallery */}
      {gallery.length > 1 && (
        <>
          {/* Swipe indicators */}
          <Animated.View 
            style={[
              styles.swipeIndicator, 
              styles.swipeIndicatorLeft,
              {
                opacity: panX.interpolate({
                  inputRange: [0, 50, 100],
                  outputRange: [0, 0.5, 0.8],
                  extrapolate: 'clamp'
                })
              }
            ]}
          >
            <Icon name="chevron-back" size={32} color="rgba(255,255,255,0.9)" />
            <Icon name="chevron-back" size={32} color="rgba(255,255,255,0.9)" style={{marginLeft: -15}} />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.swipeIndicator, 
              styles.swipeIndicatorRight,
              {
                opacity: panX.interpolate({
                  inputRange: [-100, -50, 0],
                  outputRange: [0.8, 0.5, 0],
                  extrapolate: 'clamp'
                })
              }
            ]}
          >
            <Icon name="chevron-forward" size={32} color="rgba(255,255,255,0.9)" style={{marginRight: -15}} />
            <Icon name="chevron-forward" size={32} color="rgba(255,255,255,0.9)" />
          </Animated.View>
        
          {/* Regular navigation buttons */}
          <TouchableOpacity 
            style={[styles.galleryNavButton, styles.galleryNavLeft]}
            onPress={() => onCycleImage('prev')}
          >
            <Icon name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.galleryNavButton, styles.galleryNavRight]}
            onPress={() => onCycleImage('next')}
          >
            <Icon name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
};

export default PostGallery;