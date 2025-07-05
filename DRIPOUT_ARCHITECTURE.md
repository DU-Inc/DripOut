# DripOut Mobile App - High-Level Architecture Documentation

## 🎯 System Overview

DripOut is a React Native fashion discovery and recommendation platform that combines social features with AI-powered product recommendations. The app uses Firebase for backend services and a custom Python API for advanced product recommendations.

```mermaid
graph TB
    subgraph "DripOut Mobile App"
        A[App.tsx] --> B[ThemeProvider]
        A --> C[ShelfProvider]
        A --> D[AppNavigator]
        A --> E[AppStateManager]
        
        B --> F[Dark/Light Mode]
        C --> G[Global Product State]
        D --> H[Navigation Flow]
        E --> I[Global App State]
    end
    
    subgraph "External Services"
        J[Firebase Auth] --> K[User Authentication]
        L[Firestore] --> M[User Data & Preferences]
        N[Firebase Storage] --> O[Media Files]
        P[Custom Python API] --> Q[Product Recommendations]
        R[Fashion News API] --> S[Content Feed]
    end
    
    subgraph "Local Storage"
        T[AsyncStorage] --> U[Product Cache]
        T --> V[User Preferences]
        T --> W[Auth Tokens]
    end
    
    A -.-> J
    A -.-> L
    A -.-> N
    A -.-> P
    A -.-> R
    A -.-> T
    
    style A fill:#e1f5fe
    style J fill:#f3e5f5
    style P fill:#e8f5e8
    style T fill:#fff3e0
```

## 📱 Client-Side Architecture

### App Entry Point & Initialization Flow

The application starts with a splash screen that handles initialization in parallel:
- Theme provider setup for dark/light mode support
- Global state management through context providers
- App state manager initialization for coordination
- Data preloading for improved user experience
- API connectivity testing

### Navigation Architecture

The app uses a complex nested navigation structure:

```mermaid
graph TD
    A[AppNavigator] --> B{Splash State}
    A --> C{Auth State}
    A --> D{Main App State}
    A --> E{Onboarding State}
    
    B --> F[AnimatedSplashScreen]
    
    C --> G[WelcomeScreen]
    C --> H[SignInScreen]
    C --> I[SignUpScreen]
    C --> J[ForgotPasswordScreen]
    
    D --> K[MainTabNavigator]
    K --> L[Home Tab]
    K --> M[Social Tab]
    K --> N[Closet Tab]
    K --> O[3D Tab]
    K --> P[Profile Tab]
    
    L --> Q[FeedNavigator]
    Q --> R[OverviewScreen]
    Q --> S[ExpandedProductScreen]
    Q --> T[ExpandedNewsScreen]
    Q --> U[ExpandedOutfitScreen]
    
    E --> V[OnboardingScreen]
    E --> W[OnboardingBrandsScreen]
    E --> X[OnboardingSizingScreen]
    E --> Y[OnboardingReview]
    
    subgraph "Modal Screens"
        Z[SettingsScreen]
        AA[SearchScreen]
        BB[MessagingScreen]
        CC[UserDetailScreen]
    end
    
    D -.-> Z
    D -.-> AA
    D -.-> BB
    D -.-> CC
    
    style A fill:#e3f2fd
    style K fill:#f1f8e9
    style Q fill:#fff3e0
    style E fill:#fce4ec
```

**Main Navigation States:**
- Splash State: Initial loading and initialization
- Authentication Flow: Welcome → Sign In/Sign Up → Onboarding
- Main Application: Tab-based navigation with shared element transitions

**Tab Structure:**
- Home Tab: Primary feed with product discovery
- Social Tab: User interactions and social features
- Closet Tab: Saved items and favorites
- 3D Tab: Virtual try-on and 3D visualization
- Profile Tab: User settings and preferences

**Modal Screens:**
- Settings and preferences
- Search functionality
- Messaging and notifications
- Product detail expansions

## 🔄 Core Data Flow & State Management

### State Management Architecture

The app employs a multi-layered state management approach:

**Context Providers:**
- Shelf Context: Global product shelf management
- Theme Provider: Dark/light mode coordination
- Onboarding Context: User onboarding flow state
- App State Manager: Global application state coordination

**Data Flow Pattern:**
UI Components ↔ Context/Hooks ↔ Services ↔ AsyncStorage ↔ External APIs

```mermaid
flowchart LR
    subgraph "UI Layer"
        A[Product Cards]
        B[Feed Sections]
        C[Navigation]
    end
    
    subgraph "State Layer"
        D[ShelfContext]
        E[ThemeProvider]
        F[AppStateManager]
    end
    
    subgraph "Service Layer"
        G[ProductCache]
        H[AuthService]
        I[FirestoreService]
    end
    
    subgraph "Storage Layer"
        J[AsyncStorage]
        K[Local Cache]
    end
    
    subgraph "External APIs"
        L[Firebase]
        M[Custom API]
        N[News API]
    end
    
    A --> D
    B --> E
    C --> F
    
    D --> G
    E --> H
    F --> I
    
    G --> J
    H --> K
    I --> L
    
    J --> M
    K --> N
    
    style A fill:#e8f5e8
    style D fill:#e3f2fd
    style G fill:#fff3e0
    style J fill:#fce4ec
    style L fill:#f3e5f5
```

### Key State Management Patterns

**Reactive State Updates:**
- Real-time synchronization between local and remote state
- Optimistic updates for better user experience
- Conflict resolution for concurrent modifications

**State Persistence:**
- AsyncStorage for local data persistence
- Firestore for remote state synchronization
- Cache invalidation strategies for data freshness

## 🧠 Key Algorithms & Data Processing

### Product Recommendation Algorithm

The recommendation system uses a sophisticated multi-step approach:

```mermaid
flowchart TD
    A[User Query] --> B[User Profile Building]
    B --> C[Demographic Data]
    B --> D[Style Preferences]
    B --> E[Budget Constraints]
    B --> F[Interaction History]
    
    C --> G[Profile-Based Filtering]
    D --> H[Collaborative Filtering]
    E --> I[Content-Based Filtering]
    F --> J[Real-time Personalization]
    
    G --> K[Product Catalog]
    H --> K
    I --> K
    J --> K
    
    K --> L[Result Optimization]
    L --> M[Diversity Algorithm]
    L --> N[Freshness Scoring]
    L --> O[Relevance Ranking]
    L --> P[Seasonal Adjustments]
    
    M --> Q[Final Recommendations]
    N --> Q
    O --> Q
    P --> Q
    
    Q --> R[Cache Results]
    R --> S[Distribute to UI]
    
    style A fill:#e8f5e8
    style B fill:#e3f2fd
    style K fill:#fff3e0
    style Q fill:#fce4ec
```

**User Profiling:**
- Demographic data collection (age, gender, body type)
- Style preferences and brand affinities
- Budget constraints and price sensitivity
- Historical interaction patterns

**Recommendation Generation:**
- Profile-based filtering of product catalog
- Collaborative filtering using similar user patterns
- Content-based filtering using product attributes
- Real-time personalization based on current session

**Result Optimization:**
- Diversity algorithms to prevent recommendation echo chambers
- Freshness scoring for new products
- Relevance ranking based on user preferences
- Seasonal and trend-based adjustments

### Multi-Section Product Distribution Algorithm

The app intelligently distributes products across different feed sections:

```mermaid
flowchart LR
    A[Product Pool] --> B{Total Products >= 60?}
    
    B -->|Yes| C[Ideal Distribution]
    B -->|No| D[Adaptive Distribution]
    
    C --> E[Trending: 20 products]
    C --> F[New Drops: 20 products]
    C --> G[Editor's Picks: 20 products]
    
    D --> H[Calculate per section]
    H --> I[Trending: Priority + remainder]
    H --> J[New Drops: Standard allocation]
    H --> K[Editor's Picks: Remaining products]
    
    E --> L[Cache Trending]
    F --> M[Cache New Drops]
    G --> N[Cache Editor's Picks]
    
    I --> L
    J --> M
    K --> N
    
    L --> O[UI Distribution]
    M --> O
    N --> O
    
    style A fill:#e8f5e8
    style B fill:#fff3e0
    style C fill:#e3f2fd
    style D fill:#fce4ec
    style O fill:#f1f8e9
```

**Distribution Strategy:**
- Trending section: High-engagement, popular items
- New Drops: Recently added products with freshness scoring
- Editor's Picks: Curated selections based on quality and style

**Adaptive Distribution:**
- Dynamic allocation based on available product count
- Priority weighting for trending items
- Fallback strategies for low inventory scenarios
- User-specific section preferences

### Progressive Loading Algorithm

The app implements sophisticated progressive content loading:

```mermaid
flowchart TD
    A[User Scroll] --> B{Check Loading State}
    
    B -->|Not Loading| C[Start Progressive Load]
    B -->|Loading| D[Skip - Already Loading]
    
    C --> E{Displayed Trending < Total?}
    E -->|Yes| F[Load More Trending]
    E -->|No| G{Displayed News < Total?}
    
    G -->|Yes| H[Load More News]
    G -->|No| I{Displayed New Drops < Total?}
    
    I -->|Yes| J[Load More New Drops]
    I -->|No| K{Displayed Editor's Picks < Total?}
    
    K -->|Yes| L[Load More Editor's Picks]
    K -->|No| M[All Content Loaded]
    
    F --> N[Update UI State]
    H --> N
    J --> N
    L --> N
    
    N --> O[Set Loading False]
    O --> P[Continue Monitoring]
    
    style A fill:#e8f5e8
    style C fill:#e3f2fd
    style F fill:#fff3e0
    style H fill:#fce4ec
    style J fill:#f1f8e9
    style L fill:#f3e5f5
```

**Loading Sequence:**
- Initial load: Critical content for immediate engagement
- Progressive reveal: Additional content based on user interaction
- Background loading: Prefetching for smooth scrolling
- Lazy loading: On-demand content for performance

**Performance Optimization:**
- Viewport-based loading decisions
- Memory management for large product catalogs
- Network-aware loading strategies
- Offline content availability

## 🔌 API Integration Architecture

### Firebase Integration

```mermaid
graph TB
    subgraph "Firebase Services"
        A[Firebase Auth] --> B[Email/Password]
        A --> C[Google Sign-In]
        A --> D[Apple Sign-In]
        A --> E[Biometric Auth]
        
        F[Firestore] --> G[User Profiles]
        F --> H[Product Favorites]
        F --> I[Social Interactions]
        F --> J[Analytics Data]
        
        K[Firebase Storage] --> L[Profile Images]
        K --> M[Product Images]
        K --> N[User Content]
        K --> O[Media Files]
    end
    
    subgraph "App Integration"
        P[Auth Service] --> A
        Q[Firestore Service] --> F
        R[Storage Service] --> K
    end
    
    subgraph "Data Flow"
        S[User Actions] --> P
        T[Data Operations] --> Q
        U[File Uploads] --> R
    end
    
    style A fill:#f3e5f5
    style F fill:#e8f5e8
    style K fill:#fff3e0
    style P fill:#e3f2fd
    style Q fill:#fce4ec
    style R fill:#f1f8e9
```

**Authentication Services:**
- Email and password authentication
- Google Sign-In integration
- Apple Sign-In for iOS users
- Biometric authentication with fallback mechanisms

**Database Services:**
- User profile management and preferences
- Product favorites and wishlist functionality
- Social interactions and user-generated content
- Analytics and usage tracking

**Storage Services:**
- Profile image management
- Product image caching and optimization
- User-generated content storage
- Media file handling and compression

### Custom Recommendation API

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant C as Custom API
    participant F as Firebase
    participant S as Session Manager
    
    U->>A: Search/Recommendation Request
    A->>S: Get Session Info
    S-->>A: {userId, sessionId}
    A->>F: Get User Profile
    F-->>A: User Data
    
    A->>C: POST /recommendations
    Note over A,C: Payload: {user_query, user_profile, max_products, direct_search, user_id, session_id}
    C-->>A: Task ID
    
    loop Polling (every 3s)
        A->>C: GET /recommendations_status/{taskId}
        C-->>A: Status (PENDING/SUCCESS/FAILURE)
    end
    
    alt Success
        C-->>A: Product Recommendations
        A->>A: Cache Results
        A-->>U: Display Products
    else Failure
        A->>A: Use Cached Data
        A-->>U: Fallback Content
    end
    
    Note over A: Background refresh for cache updates
```

**API Endpoints:**
- Product recommendations with user profiling
- Random product discovery with personalization
- Search functionality with advanced filtering
- Health monitoring and status checking

**Request Processing:**
- Asynchronous task processing for complex recommendations
- Polling mechanisms for long-running operations
- Error handling and retry logic
- Rate limiting and request optimization

**Response Optimization:**
- Structured product data with metadata
- Image URL optimization and CDN integration
- Caching headers for improved performance
- Compression for reduced bandwidth usage

### Session Management System

```mermaid
graph TB
    subgraph "Session Manager"
        A[SessionManager Singleton] --> B[Generate Session ID]
        A --> C[Track Session Duration]
        A --> D[Manage User Context]
        A --> E[Clear Session on Logout]
        
        B --> F[Format: userId_timestamp_random]
        C --> G[24-hour Session Duration]
        D --> H[User ID + Session ID]
        E --> I[AsyncStorage Cleanup]
    end
    
    subgraph "API Integration"
        J[All API Calls] --> K[Include user_id]
        J --> L[Include session_id]
        K --> M[User Tracking]
        L --> N[Session Analytics]
    end
    
    subgraph "Session Lifecycle"
        O[App Launch] --> P[Create/Retrieve Session]
        P --> Q[API Calls with Session]
        Q --> R[Session Validation]
        R --> S[Session Expiry Check]
        S --> T[New Session if Expired]
    end
    
    A --> J
    O --> A
    S --> A
    
    style A fill:#e8f5e8
    style J fill:#e3f2fd
    style O fill:#fff3e0
```

**Session Features:**
- Unique session ID generation with user context
- 24-hour session duration with automatic renewal
- Persistent session storage across app restarts
- Automatic session cleanup on user logout
- Session metadata for analytics and debugging

**API Payload Enhancement:**
- All API calls now include `user_id` and `session_id`
- Enables user behavior tracking and analytics
- Supports session-based personalization
- Facilitates debugging and support requests

### API Call Flow Patterns

**Recommendation Flow:**
- User query processing and validation
- Profile building and enhancement
- API request with comprehensive user context
- Asynchronous processing with status polling
- Result caching and distribution

**Error Handling:**
- Graceful degradation for API failures
- Fallback to cached data when available
- User-friendly error messaging
- Automatic retry mechanisms with exponential backoff

## 🗄️ Caching Strategy

### Multi-Layer Cache Architecture

```mermaid
graph TB
    subgraph "Cache Layers"
        A[AsyncStorage] --> B[Product Cache]
        A --> C[Search Cache]
        A --> D[User Preferences]
        A --> E[Auth Tokens]
        
        F[React State] --> G[Session Data]
        F --> H[Navigation State]
        F --> I[UI State]
        F --> J[Temporary Data]
        
        K[Firestore] --> L[User Profiles]
        K --> M[Favorites]
        K --> N[Interactions]
        
        O[Cloud Storage] --> P[Media Assets]
        O --> Q[CDN Content]
    end
    
    subgraph "Cache TTL"
        R[Trending: 30min]
        S[New Drops: 1hr]
        T[Editor's Picks: 2hr]
        U[Search: 10min]
    end
    
    B --> R
    C --> U
    K --> S
    K --> T
    
    subgraph "Cache Operations"
        V[Cache Check]
        W[Cache Update]
        X[Cache Invalidation]
        Y[Cache Cleanup]
    end
    
    V --> A
    W --> A
    X --> A
    Y --> A
    
    style A fill:#e8f5e8
    style F fill:#e3f2fd
    style K fill:#fff3e0
    style O fill:#fce4ec
```

**Local Storage Layer:**
- AsyncStorage for device-local data persistence
- Product cache with time-based expiration
- Search result caching for improved performance
- User preference and setting storage

**In-Memory Cache:**
- React state for current session data
- Navigation state preservation
- UI state management
- Temporary data storage

**Remote Cache:**
- Firestore for user data synchronization
- Cloud storage for media assets
- CDN integration for static content
- Distributed caching for global performance

### Cache Invalidation Strategy

**Time-Based Expiration:**
- Trending products: 30-minute cache lifetime
- New drops: 1-hour cache lifetime
- Editor's picks: 2-hour cache lifetime
- Search results: 10-minute cache lifetime

**Event-Based Invalidation:**
- User preference changes
- New product additions
- Price updates and availability changes
- Seasonal content updates

**Smart Cache Management:**
- LRU (Least Recently Used) eviction policies
- Size-based cache limits
- Priority-based retention strategies
- Automatic cleanup for expired content

## 🔐 Authentication Flow

### Authentication State Machine

```mermaid
stateDiagram-v2
    [*] --> Splash
    Splash --> Unauthenticated
    Splash --> Authenticated
    
    Unauthenticated --> Welcome
    Welcome --> SignIn
    Welcome --> SignUp
    
    SignIn --> Authenticating
    SignUp --> Authenticating
    
    Authenticating --> AuthenticatedWithOnboarding
    Authenticating --> Authenticated
    Authenticating --> Unauthenticated : Auth Failed
    
    AuthenticatedWithOnboarding --> OnboardingFlow
    OnboardingFlow --> Authenticated : Onboarding Complete
    OnboardingFlow --> AuthenticatedWithOnboarding : Incomplete
    
    Authenticated --> MainApp
    Authenticated --> Unauthenticated : Sign Out
    
    MainApp --> Authenticated : Session Expired
    MainApp --> Unauthenticated : Sign Out
    
    note right of Authenticating
        - Email/Password
        - Google Sign-In
        - Apple Sign-In
        - Biometric Auth
    end note
    
    note right of OnboardingFlow
        - Style Preferences
        - Brand Selection
        - Sizing Information
        - Profile Review
    end note
```

**State Transitions:**
- Unauthenticated: Welcome and sign-up flows
- Authenticating: Multi-step verification process
- Authenticated with onboarding: Profile completion flow
- Fully authenticated: Main application access

**Security Features:**
- Token-based authentication with refresh mechanisms
- Biometric authentication with secure credential storage
- Multi-factor authentication support
- Session management and timeout handling

### Biometric Authentication Algorithm

**Implementation Strategy:**
- Device capability detection and fallback planning
- Secure credential storage using device keychain
- Biometric prompt customization
- Error handling and user guidance

**Security Considerations:**
- Encrypted credential storage
- Biometric failure handling
- Fallback to traditional authentication
- Session security and timeout management

## 🎨 UI/UX Architecture

### Component Hierarchy

**Common Components:**
- Reusable UI elements for consistency
- Animated components for enhanced user experience
- Form components with validation
- Modal and overlay components

**Feature-Specific Components:**
- Product cards with unified design system
- Feed components for content display
- Navigation components for app structure
- Authentication components for user flows

**Animation System:**
- Shared element transitions for smooth navigation
- Spring-based animations for natural feel
- Performance-optimized animation rendering
- Accessibility considerations for motion sensitivity

### Design System

**Visual Consistency:**
- Unified color palette and typography
- Consistent spacing and layout patterns
- Responsive design for different screen sizes
- Dark/light mode support

**Interaction Patterns:**
- Gesture-based navigation
- Haptic feedback integration
- Accessibility features and screen reader support
- Performance monitoring and optimization

## 🚀 Performance Optimizations

### Startup Optimization

**Parallel Initialization:**
- Concurrent loading of critical resources
- Non-blocking data preloading
- Progressive enhancement of features
- Minimum splash screen duration for branding

**Resource Management:**
- Image optimization and lazy loading
- Font loading optimization
- Bundle size reduction and code splitting
- Memory management for large datasets

### Runtime Performance

**Rendering Optimization:**
- Virtualized lists for large datasets
- Memoization of expensive computations
- Efficient re-rendering strategies
- Background processing for non-critical tasks

**Network Optimization:**
- Request batching and deduplication
- Intelligent caching strategies
- Offline-first architecture
- Progressive enhancement

## 🔧 Error Handling & Resilience

### Graceful Degradation

**Failure Scenarios:**
- Network connectivity issues
- API service unavailability
- Device storage limitations
- Authentication failures

**Fallback Strategies:**
- Cached data utilization
- Offline mode functionality
- Mock data for demonstration
- User guidance and error messaging

### Monitoring and Analytics

**Performance Monitoring:**
- App startup time tracking
- Screen load time measurement
- API response time monitoring
- User interaction analytics

**Error Tracking:**
- Crash reporting and analysis
- User experience monitoring
- Performance bottleneck identification
- Proactive issue detection

## 📊 Data Flow Summary

### Primary Data Flows

```mermaid
flowchart TD
    subgraph "Product Discovery Flow"
        A1[User Scroll] --> B1[Check Cache]
        B1 --> C1{Cache Valid?}
        C1 -->|Yes| D1[Load from Cache]
        C1 -->|No| E1[API Request]
        E1 --> F1[Process Response]
        F1 --> G1[Update Cache]
        G1 --> H1[Update State]
        D1 --> H1
        H1 --> I1[Render UI]
    end
    
    subgraph "Authentication Flow"
        A2[User Input] --> B2[Validate Input]
        B2 --> C2[Firebase Auth]
        C2 --> D2[Create Profile]
        D2 --> E2[Sync State]
        E2 --> F2[Update Navigation]
    end
    
    subgraph "Recommendation Flow"
        A3[User Query] --> B3[Build Profile]
        B3 --> C3[Custom API Call]
        C3 --> D3[Async Processing]
        D3 --> E3[Cache Results]
        E3 --> F3[Distribute Content]
    end
    
    subgraph "Caching Flow"
        A4[API Response] --> B4[Validate Data]
        B4 --> C4[Store in Cache]
        C4 --> D4[Set TTL]
        D4 --> E4[Monitor Invalidation]
        E4 --> F4[Update Cache]
    end
    
    style A1 fill:#e8f5e8
    style A2 fill:#e3f2fd
    style A3 fill:#fff3e0
    style A4 fill:#fce4ec
```

**Product Discovery Flow:**
User interaction → Progressive loading → Cache validation → API request → Response processing → State update → UI rendering

**Authentication Flow:**
User input → Validation → Firebase authentication → Profile creation → State synchronization → Navigation update

**Recommendation Flow:**
User query → Profile building → Custom API request → Asynchronous processing → Result caching → Content distribution

**Caching Flow:**
API response → Data validation → Cache storage → TTL management → Invalidation triggers → Cache updates

### Data Synchronization

**Real-time Updates:**
- Firestore listeners for live data changes
- Optimistic updates for immediate feedback
- Conflict resolution for concurrent modifications
- Offline synchronization when connectivity returns

**State Consistency:**
- Single source of truth for data
- Event-driven state updates
- Transactional data modifications
- Rollback mechanisms for failed operations

## 🏗️ Architecture Benefits

### Scalability
- Modular component architecture for easy feature addition
- Service layer abstraction for backend flexibility
- Caching strategies for performance at scale
- State management patterns for complex data flows

### Maintainability
- Clear separation of concerns
- Consistent coding patterns
- Comprehensive error handling
- Extensive logging and monitoring

### User Experience
- Fast startup and loading times
- Smooth animations and transitions
- Offline functionality
- Progressive enhancement

### Developer Experience
- TypeScript for type safety
- Comprehensive documentation
- Modular architecture for team collaboration
- Testing infrastructure support

This architecture demonstrates a well-structured React Native application optimized for startup speed and user experience while maintaining scalability and maintainability for future growth. 