import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';

interface PostContentProps {
  caption: string;
  tags: string[];
  isExpanded: boolean;
  isDarkMode: boolean;
  subTextColor: string;
  mainColor: string;
  styles: any;
  onToggleExpand: () => void;
}

const PostContent: React.FC<PostContentProps> = ({
  caption,
  tags,
  isExpanded,
  isDarkMode,
  subTextColor,
  mainColor,
  styles,
  onToggleExpand,
}) => {
  return (
    <>
      {/* Caption Section */}
      <View style={styles.captionContainer}>
        <Text style={[
          styles.captionText, 
          isDarkMode && styles.darkCaptionText,
          { color: subTextColor }
        ]}>
          {isExpanded ? caption : (
            caption.length > 120 ? 
              caption.substring(0, 120) + '... ' : 
              caption + ' '
          )}
          {!isExpanded && caption.length > 120 && (
            <Text 
              style={[styles.readMoreText, { color: mainColor }]}
              onPress={onToggleExpand}
            >
              Read More
            </Text>
          )}
        </Text>
      </View>

      {/* Tags Section - Now with enhanced aesthetic styling */}
      <View style={styles.tagsContainer}>
        <FlatList
          data={tags}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `tag-${index}`}
          renderItem={({item: tag, index}) => (
            <TouchableOpacity 
              key={`tag-${index}`}
              style={[
                styles.aestheticPill, // Using the beautiful aesthetic pill styling
                isDarkMode && styles.darkAestheticPill,
                { 
                  backgroundColor: isDarkMode ? 'rgba(124, 107, 255, 0.12)' : 'rgba(82, 69, 204, 0.08)',
                  borderColor: isDarkMode ? 'rgba(124, 107, 255, 0.25)' : 'rgba(82, 69, 204, 0.15)',
                  marginRight: 8, // Space between tags
                }
              ]}
            >
              <Text style={[styles.aestheticText, { color: mainColor }]}>
                {tag}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );
};

export default PostContent;