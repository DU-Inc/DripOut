import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { parseHtmlDescription, ParsedDescriptionItem, processProductDescription } from '../../utils/htmlUtils';
import { useTheme } from '../../styles/themeprovider';

interface FormattedDescriptionProps {
  html: string;
  style?: any;
  maxLines?: number;
  useSimpleFormatting?: boolean; // Use simple text formatting instead of structured parsing
}

const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  html,
  style,
  maxLines,
  useSimpleFormatting = false
}) => {
  const { theme } = useTheme();
  
  // If simple formatting is requested, just clean the HTML and return as text
  if (useSimpleFormatting) {
    const cleanText = processProductDescription(html);
    
    return (
      <Text
        style={[
          styles.descriptionText,
          { color: theme.text.secondary },
          style
        ]}
        numberOfLines={maxLines}
      >
        {cleanText}
      </Text>
    );
  }
  
  // Parse HTML into structured items
  const parsedItems = parseHtmlDescription(html);
  
  const renderItem = (item: ParsedDescriptionItem, index: number) => {
    switch (item.type) {
      case 'heading':
        return (
          <Text
            key={`heading-${index}`}
            style={[
              styles.headingText,
              { 
                color: theme.text.primary,
                fontSize: item.level === 1 ? 18 : item.level === 2 ? 16 : 14,
                fontWeight: item.level <= 2 ? '700' : '600'
              }
            ]}
          >
            {item.content}
          </Text>
        );
      
      case 'list':
        return (
          <View key={`list-${index}`} style={styles.listContainer}>
            {item.items?.map((listItem, listIndex) => (
              <View key={`list-item-${index}-${listIndex}`} style={styles.listItem}>
                <Text style={[styles.bulletPoint, { color: theme.text.secondary }]}>
                  {item.content === 'ordered' ? `${listIndex + 1}.` : '•'}
                </Text>
                <Text style={[styles.listItemText, { color: theme.text.secondary }]}>
                  {listItem}
                </Text>
              </View>
            ))}
          </View>
        );
      
      case 'emphasis':
        // Handle text with emphasis markers
        const parts = item.content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return (
          <Text key={`emphasis-${index}`} style={[styles.descriptionText, { color: theme.text.secondary }]}>
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                return (
                  <Text key={`bold-${partIndex}`} style={styles.boldText}>
                    {part.slice(2, -2)}
                  </Text>
                );
              } else if (part.startsWith('*') && part.endsWith('*')) {
                // Italic text
                return (
                  <Text key={`italic-${partIndex}`} style={styles.italicText}>
                    {part.slice(1, -1)}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        );
      
      case 'text':
      default:
        return (
          <Text
            key={`text-${index}`}
            style={[styles.descriptionText, { color: theme.text.secondary }]}
          >
            {item.content}
          </Text>
        );
    }
  };
  
  return (
    <View style={[styles.container, style]}>
      {parsedItems.map(renderItem)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  headingText: {
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  listContainer: {
    marginVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    width: 20,
    textAlign: 'left',
  },
  listItemText: {
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
    paddingLeft: 4,
  },
  boldText: {
    fontWeight: '700',
  },
  italicText: {
    fontStyle: 'italic',
  },
});

export default FormattedDescription; 