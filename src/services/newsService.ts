// src/newsService.ts

import axios, { AxiosResponse } from 'axios';
import {
  NEWSAPI_KEY,
  NEWSDATA_KEY,
  NYT_API_KEY,
  NYT_API_SECRET,
  GUARDIAN_API_KEY,
} from '@env';

// ---- Types ----
export type Category =
  | 'runway'
  | 'designer'
  | 'business'
  | 'sustainability'
  | 'celebrity'
  | 'magazines';

// Comment type for article discussions
export type Comment = {
  id: string;
  username: string;
  profileImageUrl?: string;
  content: string;
  timestamp: Date;
  likes: number;
};

export interface Article {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  source: string;
  category: Category;
  publishedAt: Date;
  region?: string; // Country/region of the article
  tags?: string[]; // Article tags/categories
  author?: string;
  summary?: string; // Brief summary/description of the article
  content?: string; // Full text content of the article (when available)
  readTime?: string;
  isFashionTagged?: boolean; // Whether it was identified as fashion by tags vs keywords
  comments?: Comment[]; // Comments on the article (when available)
  imageUrls?: string[]; // Additional image URLs
}

// ---- Constants ----
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours (increased from 1h - fashion news doesn't become stale quickly)

// Priority regions with their adjectives and famous fashion entities
const PRIORITY_REGIONS: Record<string, string[]> = {
  'italy': ['italy', 'italian', 'rome', 'milan', 'florence', 'naples', 'turin', 
            'gucci', 'prada', 'versace', 'armani', 'valentino', 'fendi', 'dolce', 'gabbana'],
  'france': ['france', 'french', 'paris', 'marseille', 'lyon', 'chanel', 'dior', 
             'louis vuitton', 'yves saint laurent', 'hermes', 'givenchy', 'balmain', 
             'louis', 'gaultier', 'louboutin'],
  'us': ['us', 'usa', 'united states', 'american', 'new york', 'nyc', 'los angeles', 
         'california', 'miami', 'michael kors', 'ralph lauren', 'marc jacobs', 'calvin klein', 
         'tom ford', 'donna karan', 'vera wang', 'tommy hilfiger'],
  'uk': ['uk', 'united kingdom', 'british', 'england', 'london', 'scotland', 
         'burberry', 'alexander mcqueen', 'vivienne westwood', 'stella mccartney', 
         'jimmy choo', 'mulberry', 'paul smith']
};

// Flatten the regions into a simple array for legacy code compatibility
const PRIORITY_LOCATIONS = Object.entries(PRIORITY_REGIONS)
  .flatMap(([region, terms]) => terms);

// Top fashion magazines for categorization and filtering - expanded for better coverage
const FASHION_MAGAZINES = [
  'vogue',
  'elle',
  'harper\'s bazaar',
  'vanity fair',
  'cosmopolitan',
  'instyle',
  'w magazine',
  'grazia',
  'glamour',
  'marie claire',
  'nylon',
  'v magazine',
  'gq',
  'esquire',
  'dazed',
  'fashion week',
  'fashion daily',
  'wwd',
  'the cut',
  'fashionista',
  'highsnobiety',
  'hypebeast',
  'refinery29',
];

// Fashion focused query keywords to improve relevance - expanded for better accuracy
const FASHION_KEYWORDS = [
  'fashion',
  'haute couture',
  'apparel',
  'style',
  'clothing',
  'designer',
  'catwalk',
  'runway',
  'fashion week',
  'luxury',
  'wardrobe',
  'collection',
  'model',
  'garment',
  'dress',
  'outfit',
  'accessories',
  'trends',
  'fashion house',
  'stylist',
];

// Fashion-related tags that strongly indicate the article is about fashion
const FASHION_TAGS = [
  'fashion',
  'style',
  'clothing',
  'apparel',
  'accessories',
  'runway',
  'catwalk',
  'model',
  'designer',
  'collection',
  'trend',
  'dress',
  'outfit',
  'haute couture',
  'fashion week',
  'shopping',
  'luxury',
  'wear',
  'garment',
  'textile',
];

// Patterns for each category, in priority order
const CATEGORY_RULES: { category: Category; pattern: RegExp }[] = [
  // Magazine category - check first
  {
    category: 'magazines',
    pattern: new RegExp(`\\b(${FASHION_MAGAZINES.join('|')})\\b`, 'i'),
  },
  {
    category: 'runway',
    pattern: /\b(runway|collection|spring|summer|fall|autumn|winter|SS\d{2}|FW\d{2}|Resort|Pre-Fall|fashion week)\b/i,
  },
  {
    category: 'designer',
    pattern: /\b(launch|collaboration|capsule|exclusive|drop|debut|designer|brand|label)\b/i,
  },
  {
    category: 'business',
    pattern: /\b(funding|merger|profit|IPO|CFO|market|investment|retail|trend|sales|revenue)\b/i,
  },
  {
    category: 'sustainability',
    pattern: /\b(sustainable|eco|ethical|upcycle|circular|slow fashion|green|fair trade|organic|recycled|environmental)\b/i,
  },
  {
    category: 'celebrity',
    pattern: /\b(celebrity|red carpet|street style|influencer|paparazzi|off-duty|outfit|look|wore|dressed|stylist)\b/i,
  },
];

// In-memory cache
let cache: Record<Category, Article[]> = {
  runway: [],
  designer: [],
  business: [],
  sustainability: [],
  celebrity: [],
  magazines: [],
};
let lastRefresh = 0;

// Known sources mapped to their regions
const SOURCE_TO_REGION: Record<string, string> = {
  'Vogue': 'us',
  'Vogue Italia': 'italy',
  'Vogue Paris': 'france',
  'Vogue UK': 'uk',
  'Elle': 'us',
  'Elle UK': 'uk',
  'Elle Italia': 'italy',
  'Elle France': 'france',
  'GQ': 'us',
  'GQ UK': 'uk',
  'GQ Italia': 'italy',
  'NYTimes': 'us',
  'The Guardian': 'uk',
  'The Telegraph': 'uk',
  'The Times': 'uk',
  'La Repubblica': 'italy',
  'Le Monde': 'france',
  'Le Figaro': 'france',
};

// Detect region from source name
function detectRegionFromSource(source: string): string | undefined {
  // Check for exact match first
  if (source in SOURCE_TO_REGION) {
    return SOURCE_TO_REGION[source];
  }

  // Check for partial matches
  for (const [knownSource, region] of Object.entries(SOURCE_TO_REGION)) {
    if (source.toLowerCase().includes(knownSource.toLowerCase())) {
      return region;
    }
  }

  // If no match found, check for region words in source
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('us') || lowerSource.includes('american')) {
    return 'us';
  }
  if (lowerSource.includes('uk') || lowerSource.includes('british')) {
    return 'uk';
  }
  if (lowerSource.includes('ital')) {
    return 'italy';
  }
  if (lowerSource.includes('franc') || lowerSource.includes('french')) {
    return 'france';
  }

  return undefined;
}

// ---- Helper Functions ----
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

function dedupeArticles(articles: Article[]): Article[] {
  const unique: Article[] = [];
  const seen = new Set<string>();
  for (const art of articles) {
    if (seen.has(art.url)) continue;
    let isDup = false;
    for (const u of unique) {
      const dist = levenshtein(
        art.title.toLowerCase(),
        u.title.toLowerCase()
      );
      if (dist <= art.title.length * 0.05) {
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      seen.add(art.url);
      unique.push(art);
    }
  }
  return unique;
}

function categorizeArticle(article: Article): Category | null {
  const text = `${article.title} ${article.summary || ''} ${article.source || ''}`;
  
  // Check if the article is from a fashion magazine first
  const magazinePattern = new RegExp(`\\b(${FASHION_MAGAZINES.join('|')})\\b`, 'i');
  if (magazinePattern.test(article.source)) {
    return 'magazines';
  }
  
  // Check the content against all category patterns
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  
  // If no category matched but it's clearly about fashion, use a default
  const fashionPattern = new RegExp(`\\b(${FASHION_KEYWORDS.join('|')})\\b`, 'i');
  if (fashionPattern.test(text)) {
    return 'business'; // Default category for fashion content
  }
  
  return null; // No fashion relevance detected
}

// Check if tags indicate fashion relevance
function hasFashionTags(tags: string[] | undefined): boolean {
  if (!tags || tags.length === 0) {
    return false;
  }
  
  return tags.some(tag => {
    const lowerTag = tag.toLowerCase();
    return FASHION_TAGS.some(fashionTag => lowerTag.includes(fashionTag));
  });
}

// Check if article is strictly about fashion - tag-based approach first, then keywords
function isFashionRelevant(article: Article): boolean {
  // Check tags first if available
  if (article.tags && article.tags.length > 0) {
    const hasFashion = hasFashionTags(article.tags);
    if (hasFashion) {
      article.isFashionTagged = true; // Mark as tag-identified
      return true;
    }
  }
  
  // If no tags or tags don't indicate fashion, check text content
  const fullText = `${article.title} ${article.summary || ''} ${article.source || ''}`.toLowerCase();
  
  // Check if from fashion magazine
  if (FASHION_MAGAZINES.some(mag => {
    // Ensure magazine name appears as a complete word or part of brand name
    return article.source.toLowerCase().includes(mag.toLowerCase());
  })) {
    return true;
  }
  
  // Check if contains at least 2 fashion keywords 
  const fashionKeywordMatches = FASHION_KEYWORDS.filter(keyword => {
    // Look for whole-word matches for better accuracy
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(fullText);
  });
  
  if (fashionKeywordMatches.length >= 2) {
    return true;
  }
  
  // If only one fashion keyword, check if it's in the title for higher relevance
  if (fashionKeywordMatches.length === 1 && 
      FASHION_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(article.title.toLowerCase());
      })) {
    return true;
  }
  
  // If passed prior checks, also check if any category pattern matches
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(fullText)) {
      return true;
    }
  }
  
  // If we get here, article doesn't meet any fashion criteria
  return false;
}

function filterRecentWithImage(articles: Article[]): Article[] {
  const cutoff = Date.now() - TWO_WEEKS_MS;
  
  // More detailed filtering with tracking
  let noImageCount = 0;
  let tooOldCount = 0;
  let notFashionRelevantCount = 0;
  
  const filtered = articles.filter(a => {
    // Check for fashion relevance first
    if (!isFashionRelevant(a)) {
      notFashionRelevantCount++;
      return false;
    }
    
    if (!a.imageUrl) {
      noImageCount++;
      return false;
    }
    
    if (a.publishedAt.getTime() < cutoff) {
      tooOldCount++;
      return false;
    }
    
    return true;
  });
  
  // console.log(`Filter details - ${noImageCount} had no image, ${tooOldCount} were too old, ${notFashionRelevantCount} were not fashion-related`);
  
  return filtered;
}

// Returns true if article matches any priority location keyword AND is fashion-related
function isPriorityLocation(article: Article): boolean {
  // First ensure it's fashion-related
  if (!isFashionRelevant(article)) {
    return false;
  }
  
  const text = `${article.title} ${article.summary || ''} ${article.url} ${article.source || ''}`.toLowerCase();
  
  // Check if article mentions any region or has a brand from that region
  for (const [region, terms] of Object.entries(PRIORITY_REGIONS)) {
    for (const term of terms) {
      // Use a more lenient pattern matching approach - allow for word parts
      if (text.includes(term.toLowerCase())) {
        // console.log(`Priority location match for "${article.title.substring(0, 30)}...": ${region} (matched: ${term})`);
        return true;
      }
    }
  }
  
  return false;
}

// Returns true if source is a fashion magazine
function isFashionMagazine(source: string): boolean {
  return FASHION_MAGAZINES.some(magazine => 
    source.toLowerCase().includes(magazine.toLowerCase())
  );
}

// Add this variable at the top with other variables
let isRefreshing = false;

// Flag to track if this is the first refresh since app start
let isFirstRefresh = true;

// ---- Fetchers ----
async function fetchNewsAPI(): Promise<Article[]> {
  try {
    // console.log('Fetching from NewsAPI...');
    // Use more specific fashion query terms to ensure relevance
    const fashionQuery = FASHION_KEYWORDS.slice(0, 3).join(' OR ');
    
    const resp: AxiosResponse<any> = await axios.get(
      'https://newsapi.org/v2/everything',
      {
        params: {
          q: `(${fashionQuery})`,
          language: 'en',
          pageSize: 50,
          apiKey: NEWSAPI_KEY,
        },
        timeout: 8000, // 8 second timeout
      }
    );
    
    if (!resp.data || !resp.data.articles) {
      console.error('NewsAPI returned unexpected response format:', resp.data);
      return [];
    }
    
    return resp.data.articles.map((a: any) => {
      const source = a.source?.name || '';
      const initialCategory = isFashionMagazine(source) ? 'magazines' : 'business';
      
      // Try to detect region from source
      const region = detectRegionFromSource(source);
      
      // Extract tags/categories - NewsAPI doesn't directly provide tags,
      // but we can create some from the source and category
      const tags = [];
      if (a.source?.name) tags.push(a.source.name);
      if (a.source?.category) tags.push(a.source.category);
      
      // Add keywords from the title/description (extracted from the title)
      if (a.title) {
        // Extract potential keywords from title
        const titleWords = a.title.split(/\s+/)
          .filter((word: string) => word.length > 4) // Only longer words
          .slice(0, 5); // Take up to 5 words
        tags.push(...titleWords);
      }
      
      return {
        id: a.url,
        title: a.title,
        url: a.url,
        imageUrl: a.urlToImage,
        source: source,
        region: region,
        tags: tags,
        publishedAt: new Date(a.publishedAt),
        author: a.author,
        summary: a.description,
        content: a.content, // NewsAPI sometimes provides partial content
        readTime: undefined,
        category: initialCategory,
      };
    });
  } catch (error: any) {
    console.error(
      `NewsAPI fetch error: ${error.message}`,
      `Status: ${error.response?.status || 'N/A'}`
    );
    // Return empty array instead of throwing
    return [];
  }
}

async function fetchNewsData(): Promise<Article[]> {
  try {
    // console.log('Fetching from NewsData.io...');
    // Use more specific fashion query
    const fashionQuery = encodeURIComponent(FASHION_KEYWORDS.slice(0, 3).join(' OR '));
    
    const resp: AxiosResponse<any> = await axios.get(
      `https://newsdata.io/api/1/latest?apikey=${NEWSDATA_KEY}&q=${fashionQuery}&language=en`,
      { timeout: 8000 } // 8 second timeout
    );
    
    if (!resp.data || !resp.data.results) {
      console.error('NewsData returned unexpected response format:', resp.data);
      return [];
    }
    
    return resp.data.results.map((i: any) => {
      const source = i.source_name || i.source_id || '';
      const initialCategory = isFashionMagazine(source) ? 'magazines' : 'business';
      
      // Extract country directly from API if available, otherwise try to detect from source
      const country = i.country && i.country.length > 0 ? i.country[0].toLowerCase() : undefined;
      const region = country || detectRegionFromSource(source);
      
      // Extract tags/categories from the API response
      const tags: string[] = [];
      if (i.category) {
        // Convert to array if it's not already
        const categories = Array.isArray(i.category) ? i.category : [i.category];
        tags.push(...categories);
      }
      if (i.keywords) {
        // Convert to array if it's not already
        const keywords = Array.isArray(i.keywords) ? i.keywords : [i.keywords];
        tags.push(...keywords);
      }
      
      return {
        id: i.article_id || i.link,
        title: i.title,
        url: i.link,
        imageUrl: i.image_url,
        source: source,
        region: region,
        tags: tags,
        publishedAt: new Date(i.pubDate),
        author: i.creator?.[0],
        summary: i.description,
        content: i.content, // NewsData.io sometimes provides content
        readTime: undefined,
        category: initialCategory,
      };
    });
  } catch (error: any) {
    console.error(
      `NewsData.io fetch error: ${error.message}`,
      `Status: ${error.response?.status || 'N/A'}`
    );
    // Return empty array instead of throwing
    return [];
  }
}

async function fetchNYT(): Promise<Article[]> {
  try {
    // console.log('Fetching from New York Times API...');
    // NYT already has a dedicated fashion section
    const resp: AxiosResponse<any> = await axios.get(
      `https://api.nytimes.com/svc/topstories/v2/fashion.json?api-key=${NYT_API_KEY}`,
      { timeout: 8000 } // 8 second timeout
    );
    
    if (!resp.data || !resp.data.results) {
      console.error('NYT API returned unexpected response format:', resp.data);
      return [];
    }
    
    return resp.data.results.map((i: any) => {
      const source = 'NYTimes';
      const initialCategory = 'magazines'; // NYT is considered a top publication
      
      // Extract tags - NYT provides sections, subsections, and des_facet (description facets)
      const tags: string[] = ['fashion']; // Articles are from the fashion section
      
      if (i.section) tags.push(i.section);
      if (i.subsection) tags.push(i.subsection);
      
      // Add description facets if available (often contains topics/tags)
      if (i.des_facet && Array.isArray(i.des_facet)) {
        tags.push(...i.des_facet);
      }
      
      // NYT API doesn't provide full article content directly
      // We'll use the abstract as the summary and if there's a longer text available, use it as content
      const summary = i.abstract || '';
      let content = i.abstract;
      
      // Some NYT API responses include a longer text field
      if (i.content && i.content.length > summary.length) {
        content = i.content;
      } else if (i.article_body && i.article_body.length > summary.length) {
        content = i.article_body;
      }
      
      return {
        id: i.url,
        title: i.title,
        url: i.url,
        imageUrl:
          i.multimedia?.find((m: any) => m.format === 'superJumbo')?.url ||
          i.multimedia?.[0]?.url,
        source: source,
        region: 'us', // NYTimes is US-based
        tags: tags,
        publishedAt: new Date(i.published_date),
        author: i.byline,
        summary: summary,
        content: content, // Use the longer content if available
        readTime: undefined,
        category: initialCategory,
        isFashionTagged: true, // NYT fashion section is guaranteed to be fashion
      };
    });
  } catch (error: any) {
    console.error(
      `NYT API fetch error: ${error.message}`,
      `Status: ${error.response?.status || 'N/A'}`
    );
    // Return empty array instead of throwing
    return [];
  }
}

async function fetchGuardian(): Promise<Article[]> {
  try {
    // console.log('Fetching from Guardian API...');
    // Guardian already has a fashion section
    const resp: AxiosResponse<any> = await axios.get(
      'https://content.guardianapis.com/search',
      {
        params: {
          section: 'fashion',
          'api-key': GUARDIAN_API_KEY,
          'show-fields': 'thumbnail,trailText,byline,body',
          'page-size': 50,
        },
        timeout: 8000, // 8 second timeout
      }
    );
    
    if (!resp.data || !resp.data.response || !resp.data.response.results) {
      console.error('Guardian API returned unexpected response format:', resp.data);
      return [];
    }
    
    return resp.data.response.results.map((i: any) => {
      const source = 'The Guardian';
      const initialCategory = 'magazines'; // Guardian is considered a top publication
      
      // Extract tags - Guardian has sections, pillarName and tags
      const tags: string[] = ['fashion']; // Articles are from the fashion section
      
      if (i.sectionName) tags.push(i.sectionName);
      if (i.pillarName) tags.push(i.pillarName);
      
      // Add actual tags if available
      if (i.tags && Array.isArray(i.tags)) {
        i.tags.forEach((tag: any) => {
          if (tag.webTitle) {
            tags.push(tag.webTitle);
          }
        });
      }
      
      // Extract any additional images from the body content
      const imageUrls: string[] = [];
      if (i.fields?.thumbnail) {
        imageUrls.push(i.fields.thumbnail);
      }
      
      // Extract images from body HTML if available
      if (i.fields?.body) {
        const imgRegex = /<img.*?src=["'](.*?)["'].*?>/g;
        let match;
        while ((match = imgRegex.exec(i.fields.body)) !== null) {
          if (match[1] && !match[1].startsWith('data:')) { // Exclude base64 images
            imageUrls.push(match[1]);
          }
        }
      }
      
      return {
        id: i.id,
        title: i.webTitle,
        url: i.webUrl,
        imageUrl: i.fields?.thumbnail,
        source: source,
        region: 'uk', // The Guardian is UK-based
        tags: tags,
        publishedAt: new Date(i.webPublicationDate),
        author: i.fields?.byline,
        summary: i.fields?.trailText,
        content: i.fields?.body, // Add the full body content
        readTime: undefined,
        category: initialCategory,
        isFashionTagged: true, // Guardian fashion section is guaranteed to be fashion
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined, // Add extracted image URLs
      };
    });
  } catch (error: any) {
    console.error(
      `Guardian API fetch error: ${error.message}`,
      `Status: ${error.response?.status || 'N/A'}`
    );
    // Return empty array instead of throwing
    return [];
  }
}

// ---- Core Functions ----
export async function refreshCache(forceRefresh = false): Promise<void> {
  try {
    // Prevent multiple simultaneous refreshes
    if (isRefreshing) {
      // console.log('Cache refresh already in progress, skipping');
      return;
    }
    
    // If this is not the first refresh and we're not forcing a refresh,
    // and the cache is still valid, return early to avoid unnecessary API calls
    if (!isFirstRefresh && !forceRefresh && 
        (Date.now() - lastRefresh < CACHE_TTL_MS) && 
        Object.values(cache).some(articles => articles.length > 0)) {
      // console.log('Using existing cache, skipping refresh');
      return;
    }
    
    isRefreshing = true;
    // console.log('==== STARTING NEWS REFRESH CACHE PROCESS ====');
    
    // Make parallel API requests but handle each individually
    const results = await Promise.allSettled([
      fetchNewsAPI(),
      fetchNewsData(),
      fetchNYT(),
      fetchGuardian()
    ]);

    // console.log('API fetch results status:', results.map(r => r.status));
    
    // Collect successful responses
    const articles: Article[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const apiName = ['NewsAPI', 'NewsData', 'NYT', 'Guardian'][index];
        // console.log(`Successfully fetched from ${apiName}: ${result.value.length} articles`);
        articles.push(...result.value);
      }
    });

    // Check if we have any successful responses
    if (articles.length === 0) {
      console.error('All news API requests failed. No articles available.');
      isRefreshing = false;
      
      // If we got no articles but cache has data, keep using the cache
      if (Object.values(cache).some(articles => articles.length > 0)) {
        // console.log('Using existing cache despite failed API calls');
        isFirstRefresh = false; // Don't try to refresh on startup again
        return;
      }
      
      return; // Early return instead of throwing
    }

    // console.log(`TOTAL ARTICLES BEFORE FILTERING: ${articles.length}`);
    
    // Check how many articles have fashion tags
    const taggedFashionArticles = articles.filter(article => {
      return hasFashionTags(article.tags);
    });
    
    // console.log(`Articles with fashion tags: ${taggedFashionArticles.length}`);
    
    // If we have enough tagged fashion articles, only use those
    let fashionRelevantArticles = [];
    
    if (taggedFashionArticles.length >= 30) {
      // console.log(`Using only articles with fashion tags (${taggedFashionArticles.length})`);
      fashionRelevantArticles = taggedFashionArticles;
    } else {
      // Not enough tagged articles, use keyword matching as a fallback
      // console.log(`Not enough tagged fashion articles, using keyword matching as fallback`);
      
      // Use all articles with fashion tags
      fashionRelevantArticles = [...taggedFashionArticles];
      
      // Add articles that pass the keyword check
      const keywordMatchedArticles = articles
        .filter(article => !hasFashionTags(article.tags)) // Exclude already tagged articles
        .filter(isFashionRelevant);
        
      // console.log(`Found ${keywordMatchedArticles.length} additional articles via keyword matching`);
      fashionRelevantArticles.push(...keywordMatchedArticles);
    }
    
    // FILTER RECENT WITH IMAGE
    // console.log('==== APPLYING RECENCY & IMAGE FILTERS ====');
    const twoWeeksAgo = new Date(Date.now() - TWO_WEEKS_MS);
    // console.log(`Date cutoff: ${twoWeeksAgo.toISOString()}`);
    
    const filteredOut: {reason: string, count: number}[] = [
      {reason: 'No image URL', count: 0},
      {reason: 'Too old (> 2 weeks)', count: 0},
    ];
    
    const filtered = fashionRelevantArticles.filter(article => {
      // Check image
      if (!article.imageUrl) {
        filteredOut[0].count++;
        return false;
      }
      
      // Check date
      if (article.publishedAt.getTime() < twoWeeksAgo.getTime()) {
        filteredOut[1].count++;
        return false;
      }
      
      return true;
    });
    
    // console.log(`FILTER RESULTS:`);
    filteredOut.forEach(item => {
      // console.log(`- Removed ${item.count} articles: ${item.reason}`);
    });
    // console.log(`Filtered to ${filtered.length} fashion-relevant recent articles with images`);
    
    // DEDUPE ARTICLES
    // console.log('==== APPLYING DEDUPLICATION ====');
    let dupeCount = 0;
    const seen = new Set<string>();
    const uniqueTitles: Record<string, number> = {};
    
    const deduped = dedupeArticles(filtered);
    dupeCount = filtered.length - deduped.length;
    
    // console.log(`Removed ${dupeCount} duplicate articles`);
    // console.log(`Deduped to ${deduped.length} unique articles`);

    // CATEGORIZE ARTICLES
    // console.log('==== CATEGORIZING ARTICLES ====');
    
    // Track categorization results
    const categorizationResults: Record<string, number> = {
      'uncategorized': 0
    };
    CATEGORY_RULES.forEach(rule => {
      categorizationResults[rule.category] = 0;
    });
    
    // categorize & group
    const grouped: Record<Category, Article[]> = {
      runway: [],
      designer: [],
      business: [],
      sustainability: [],
      celebrity: [],
      magazines: [], // Ensure magazines category is included
    };
    
    // First pass - identify magazine sources and pre-categorize
    deduped.forEach((a) => {
      // Check if source is a known fashion magazine first
      if (isFashionMagazine(a.source)) {
        grouped.magazines.push({ ...a, category: 'magazines' });
        categorizationResults['magazines'] = (categorizationResults['magazines'] || 0) + 1;
        return; // Skip other categorization for magazine sources
      }
      
      // Otherwise try to categorize by content
      const cat = categorizeArticle(a);
      if (cat) {
        grouped[cat].push({ ...a, category: cat });
        categorizationResults[cat] = (categorizationResults[cat] || 0) + 1;
      } else {
        // If we can't categorize but it passed the fashion relevance filter,
        // put it in business as a default category
        categorizationResults['uncategorized']++;
        grouped.business.push({ ...a, category: 'business' });
      }
    });
    
    // console.log('CATEGORIZATION RESULTS:');
    Object.entries(categorizationResults).forEach(([category, count]) => {
      if (category !== 'uncategorized' || count > 0) {
        // console.log(`- ${category}: ${count} articles`);
      }
    });

    // sort & cache with location priority
    // console.log('==== SORTING AND CACHING BY PRIORITY LOCATION ====');
    
    for (const cat of Object.keys(grouped) as Category[]) {
      // Log items with priority location for debugging
      const priorityItems = grouped[cat].filter(a => isPriorityLocation(a));
      // console.log(`Category ${cat}: ${priorityItems.length} of ${grouped[cat].length} articles match priority locations`);
      
      // Sort prioritizing:
      // 1. Tagged fashion articles first
      // 2. Then by location priority
      // 3. Then by date
      grouped[cat].sort((a, b) => {
        // First priority: fashion-tagged articles
        if ((a.isFashionTagged && !b.isFashionTagged) || 
            (a.tags?.some(t => FASHION_TAGS.some(ft => t.toLowerCase().includes(ft))) && 
             !b.tags?.some(t => FASHION_TAGS.some(ft => t.toLowerCase().includes(ft))))) {
          return -1;
        }
        if ((!a.isFashionTagged && b.isFashionTagged) || 
            (!a.tags?.some(t => FASHION_TAGS.some(ft => t.toLowerCase().includes(ft))) && 
             b.tags?.some(t => FASHION_TAGS.some(ft => t.toLowerCase().includes(ft))))) {
          return 1;
        }
        
        // Second priority: location
        const aPri = isPriorityLocation(a) ? 1 : 0;
        const bPri = isPriorityLocation(b) ? 1 : 0;
        if (aPri !== bPri) return bPri - aPri;
        
        // Last priority: date
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      });
      
      // Store in cache
      cache[cat] = grouped[cat];
      // console.log(`Cached ${grouped[cat].length} articles in category '${cat}'`);
    }

    lastRefresh = Date.now();
    isFirstRefresh = false; // Mark that we've done at least one refresh
    // console.log('==== CACHE REFRESH COMPLETE ====');
    isRefreshing = false;
  } catch (error) {
    isRefreshing = false;
    console.error('Error in refreshCache:', error);
    // Don't rethrow
  }
}

// More efficient article retrieval
export async function getArticles(
  category: Category,
  limit = 50
): Promise<Article[]> {
  try {
    if ((Date.now() - lastRefresh > CACHE_TTL_MS) || 
        lastRefresh === 0 || 
        !cache[category] || 
        cache[category].length === 0) {
      await refreshCache();
    }
    return cache[category].slice(0, limit);
  } catch (error) {
    console.error('Error getting articles:', error);
    return []; // Return empty array instead of throwing
  }
}

// New function to fetch fashion news - using direct region filtering
export async function fetchFashionNews(limit = 50, sortBy = 'latest', regions = 'us,italy'): Promise<Article[]> {
  // console.log(`==== EXECUTING FETCH FASHION NEWS ====`);
  // console.log('fetchFashionNews params:', { limit, sortBy, regions });
  
  try {
    // Check if cache is still valid and has data
    const cacheIsValid = Date.now() - lastRefresh < CACHE_TTL_MS;
    const cacheHasData = Object.values(cache).some(articles => articles.length > 0);
    
    // Only refresh the cache if it's invalid or empty
    if (!cacheIsValid || !cacheHasData) {
      try {
        await refreshCache();
      } catch (error) {
        console.error('Error refreshing news cache:', error);
        // If cache has data despite error, continue with what we have
        if (!cacheHasData) {
          throw error; // Re-throw only if we have no fallback data
        }
      }
    }
    
    // Merge all categories into a single array - prioritize magazines first
    let allArticles: Article[] = [];
    
    // Put magazines first in results if they exist
    if (cache.magazines && cache.magazines.length > 0) {
      // console.log(`Adding ${cache.magazines.length} magazine articles first`);
      allArticles = [...allArticles, ...cache.magazines];
    }
    
    // Then add all other categories
    Object.entries(cache).forEach(([category, articles]) => {
      if (category !== 'magazines') { // Skip magazines since we already added them
        // console.log(`Category ${category} has ${articles.length} articles in cache`);
        allArticles = [...allArticles, ...articles];
      }
    });
    
    if (allArticles.length === 0) {
      console.error('No articles available in cache');
      throw new Error('No articles available');
    }
    
    // console.log(`Found ${allArticles.length} total articles in cache`);
    
    // Sort by date (latest first) - can add other sort options as needed
    if (sortBy === 'latest') {
      // For 'latest' sort, we still want to respect category priority:
      // 1. Magazines category first
      // 2. Within each category, sort by date
      allArticles.sort((a, b) => {
        // If one is from magazines category and other isn't, magazines first
        if (a.category === 'magazines' && b.category !== 'magazines') {
          return -1;
        }
        if (a.category !== 'magazines' && b.category === 'magazines') {
          return 1;
        }
        
        // Within same category, sort by date
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      });
      
      // console.log('Sorted articles by category priority and date');
    }
    
    // IMPROVED REGION FILTERING: First prioritize region matches, then fill to limit
    let priorityRegionArticles: Article[] = [];
    let otherArticles: Article[] = [];
    
    if (regions && regions !== 'all') {
      const regionKeywords = regions.toLowerCase().split(',').map(r => r.trim());
      // console.log(`Filtering by regions: ${regionKeywords.join(', ')}`);
      
      // Split articles into region matches and non-matches
      allArticles.forEach(article => {
        if (!article.region) {
          // Log articles with no region info
          // console.log(`No region info for article: "${article.title.substring(0, 30)}..."`);
          otherArticles.push(article);
        } else if (regionKeywords.some(region => article.region?.toLowerCase().includes(region))) {
          // Region match
          priorityRegionArticles.push(article);
        } else {
          // No region match
          otherArticles.push(article);
        }
      });
      
      // Log some examples
      if (priorityRegionArticles.length > 0) {
        const sample = priorityRegionArticles[0];
        // console.log(`REGION MATCH EXAMPLE: "${sample.title}" - region: ${sample.region}`);
      }
      
      // console.log(`Found ${priorityRegionArticles.length} articles matching regions: ${regions}`);
      // console.log(`Found ${otherArticles.length} fashion articles from other regions`);
      
      // Combined article list: first priority regions, then other regions up to limit
      const result: Article[] = [...priorityRegionArticles];
      
      // If we need more articles to reach the limit, add from otherArticles
      if (result.length < limit && otherArticles.length > 0) {
        const neededToFill = limit - result.length;
        // console.log(`Adding ${Math.min(neededToFill, otherArticles.length)} articles from other regions to reach limit`);
        result.push(...otherArticles.slice(0, neededToFill));
      }
      
      // Add read time estimate if not already present
      const finalResult = result.map(article => {
        if (!article.readTime) {
          // Simple calculation: 1 min per 200 chars of summary
          const chars = (article.summary?.length || 0);
          const mins = Math.max(1, Math.ceil(chars / 200));
          return {
            ...article,
            readTime: `${mins} min read`
          };
        }
        return article;
      });
      
      // console.log(`Returning ${finalResult.length} articles (limit was ${limit})`);
      // console.log('==== FETCH FASHION NEWS COMPLETE ====');
      
      return finalResult.slice(0, limit);
    } else {
      // No region filtering - just use all articles
      
      // Add read time estimate if not already present
      const result = allArticles.map(article => {
        if (!article.readTime) {
          // Simple calculation: 1 min per 200 chars of summary
          const chars = (article.summary?.length || 0);
          const mins = Math.max(1, Math.ceil(chars / 200));
          return {
            ...article,
            readTime: `${mins} min read`
          };
        }
        return article;
      });
      
      // console.log(`Returning ${Math.min(result.length, limit)} articles (limit was ${limit})`);
      // console.log('==== FETCH FASHION NEWS COMPLETE ====');
      
      return result.slice(0, limit);
    }
  } catch (error) {
    console.error('Error in fetchFashionNews:', error);
    // Return whatever we have in cache as fallback
    let fallbackArticles: Article[] = [];
    Object.values(cache).forEach(articles => {
      fallbackArticles = [...fallbackArticles, ...articles];
    });
    
    return fallbackArticles.slice(0, limit);
  }
}

// New function to get single article by ID
export async function getArticleById(id: string): Promise<Article | null> {
  try {
    console.log(`Getting article by ID: ${id}`);
    
    // Ensure cache is fresh
    if (Date.now() - lastRefresh > CACHE_TTL_MS || lastRefresh === 0) {
      console.log('Cache needs refresh, refreshing...');
      await refreshCache();
      console.log('Cache refreshed');
    } else {
      console.log('Using existing cache');
    }
    
    // Search all categories for matching article
    for (const category of Object.keys(cache) as Category[]) {
      const articlesInCategory = cache[category] || [];
      console.log(`Searching in category ${category}: ${articlesInCategory.length} articles`);
      
      const found = articlesInCategory.find(article => article.id === id);
      if (found) {
        console.log(`Found article with ID ${id} in category ${category}`);
        return found;
      }
    }
    
    console.log(`Article with ID ${id} not found in any category`);
    return null; // Article not found
  } catch (error) {
    console.error(`Error in getArticleById for ID ${id}:`, error);
    return null;
  }
}
