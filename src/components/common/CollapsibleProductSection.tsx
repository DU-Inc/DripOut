import React, { ReactNode, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../styles/themeprovider';

interface CollapsibleProductSectionProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  collapsedSummary?: string;
  onToggle?: (isExpanded: boolean) => void;
  style?: any;
  removeContentPadding?: boolean;
}

const CollapsibleProductSection: React.FC<CollapsibleProductSectionProps> = ({
  title,
  children,
  defaultCollapsed = true,
  collapsedSummary,
  onToggle,
  style,
  removeContentPadding = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const { theme } = useTheme();

  // Handle layout ready state for MasonryList rendering
  const handleContentLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    // Only consider layout ready if we have meaningful dimensions
    if (width > 0 && height > 0) {
      setIsLayoutReady(true);
    }
  };

  // Reset layout ready state when expanded state changes
  useEffect(() => {
    if (isExpanded) {
      setIsLayoutReady(false);
    }
  }, [isExpanded]);

  // Force a layout update when component starts expanded to fix MasonryList rendering
  useEffect(() => {
    if (isExpanded && Platform.OS === 'ios') {
      // Small delay to ensure proper layout calculation for child components
      const timeoutId = setTimeout(() => {
        LayoutAnimation.configureNext({
          duration: 100,
          update: {
            type: LayoutAnimation.Types.linear,
            property: LayoutAnimation.Properties.opacity,
          },
        });
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, []);

  const toggleSection = () => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext({
        duration: 300,
        create: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.scaleXY,
        },
      });
    }
    
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    onToggle?.(newExpandedState);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.header, { backgroundColor: theme.surface }]}
        onPress={toggleSection}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            {title}
          </Text>
          {!isExpanded && collapsedSummary && (
            <Text style={[styles.summary, { color: theme.text.secondary }]} numberOfLines={1}>
              {collapsedSummary}
            </Text>
          )}
        </View>
        <Icon
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={theme.text.primary}
          style={styles.chevron}
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View 
          style={[
            removeContentPadding ? styles.contentNoPadding : styles.content, 
            { backgroundColor: theme.background }
          ]}
          onLayout={handleContentLayout}
        >
          {/* Only render children when layout is ready to fix MasonryList rendering */}
          {isLayoutReady ? children : (
            <View style={styles.layoutPlaceholder}>
              {/* Empty placeholder while waiting for layout */}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  summary: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentNoPadding: {
    paddingBottom: 20,
  },
  layoutPlaceholder: {
    minHeight: 1, // Minimal height to trigger layout
  },
});

export default CollapsibleProductSection;