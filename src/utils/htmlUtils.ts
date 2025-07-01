import React from 'react';

// HTML tag removal and formatting utilities
export const stripHtmlTags = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // Remove HTML tags but preserve content
  return html.replace(/<[^>]*>/g, '');
};

// Parse HTML and format for better display
export const formatHtmlDescription = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  let formatted = html;
  
  // Convert common HTML elements to readable format
  formatted = formatted
    // Convert <br> and <br/> to line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    
    // Convert <p> tags to paragraphs with line breaks
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    
    // Convert <strong> and <b> tags to emphasis (we'll handle this with styling)
    .replace(/<(strong|b)[^>]*>/gi, '**')
    .replace(/<\/(strong|b)>/gi, '**')
    
    // Convert <em> and <i> tags to emphasis
    .replace(/<(em|i)[^>]*>/gi, '*')
    .replace(/<\/(em|i)>/gi, '*')
    
    // Convert <ul> and <ol> to structured lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    
    // Convert <li> to bullet points
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    
    // Convert <h1-h6> tags to formatted headings
    .replace(/<h[1-6][^>]*>/gi, '\n**')
    .replace(/<\/h[1-6]>/gi, '**\n')
    
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace and line breaks
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double
    .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n /g, '\n') // Remove spaces after line breaks
    .trim();
  
  return formatted;
};

// Parse HTML into structured data for better rendering
export interface ParsedDescriptionItem {
  type: 'text' | 'list' | 'heading' | 'emphasis';
  content: string;
  items?: string[]; // For list type
  level?: number; // For heading type
}

export const parseHtmlDescription = (html: string): ParsedDescriptionItem[] => {
  if (!html || typeof html !== 'string') {
    return [{ type: 'text', content: 'No description available' }];
  }
  
  const items: ParsedDescriptionItem[] = [];
  let workingHtml = html;
  
  // Extract and parse lists first
  const listRegex = /<(ul|ol)[^>]*>(.*?)<\/\1>/gis;
  let listMatch;
  
  while ((listMatch = listRegex.exec(workingHtml)) !== null) {
    const [fullMatch, listType, listContent] = listMatch;
    
    // Extract list items
    const liRegex = /<li[^>]*>(.*?)<\/li>/gis;
    const listItems: string[] = [];
    let liMatch;
    
    while ((liMatch = liRegex.exec(listContent)) !== null) {
      const itemContent = stripHtmlTags(liMatch[1]).trim();
      if (itemContent) {
        listItems.push(itemContent);
      }
    }
    
    if (listItems.length > 0) {
      items.push({
        type: 'list',
        content: listType === 'ol' ? 'ordered' : 'unordered',
        items: listItems
      });
    }
    
    // Remove the processed list from working HTML
    workingHtml = workingHtml.replace(fullMatch, '|||LIST_PLACEHOLDER|||');
  }
  
  // Extract headings
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gis;
  let headingMatch;
  
  while ((headingMatch = headingRegex.exec(workingHtml)) !== null) {
    const [fullMatch, level, content] = headingMatch;
    const headingContent = stripHtmlTags(content).trim();
    
    if (headingContent) {
      items.push({
        type: 'heading',
        content: headingContent,
        level: parseInt(level)
      });
    }
    
    // Remove the processed heading from working HTML
    workingHtml = workingHtml.replace(fullMatch, '|||HEADING_PLACEHOLDER|||');
  }
  
  // Process remaining text content
  const remainingText = stripHtmlTags(workingHtml)
    .replace(/\|\|\|LIST_PLACEHOLDER\|\|\|/g, '')
    .replace(/\|\|\|HEADING_PLACEHOLDER\|\|\|/g, '')
    .trim();
  
  if (remainingText) {
    // Check for emphasis patterns
    if (remainingText.includes('**') || remainingText.includes('*')) {
      items.push({
        type: 'emphasis',
        content: remainingText
      });
    } else {
      items.push({
        type: 'text',
        content: remainingText
      });
    }
  }
  
  // If no structured content was found, return the cleaned text
  if (items.length === 0) {
    const cleanText = formatHtmlDescription(html);
    return [{
      type: 'text',
      content: cleanText || 'No description available'
    }];
  }
  
  return items;
};

// Simple HTML entity decoder
export const decodeHtmlEntities = (text: string): string => {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };
  
  return text.replace(/&[^;]+;/g, (entity) => {
    return entities[entity] || entity;
  });
};

// Combined function for complete HTML processing
export const processProductDescription = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return 'No description available';
  }
  
  // First decode HTML entities
  let processed = decodeHtmlEntities(html);
  
  // Then format HTML structure
  processed = formatHtmlDescription(processed);
  
  return processed || 'No description available';
}; 