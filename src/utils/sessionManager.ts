import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../Config/firebaseconfig';

// Session management constants
const SESSION_ID_KEY = '@DripOut:sessionId';
const SESSION_START_TIME_KEY = '@DripOut:sessionStartTime';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Session Manager for tracking user sessions and generating session IDs
 */
class SessionManager {
  private static instance: SessionManager;
  private currentSessionId: string | null = null;
  private sessionStartTime: number | null = null;

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const userId = auth().currentUser?.uid || 'anonymous';
    return `${userId}_${timestamp}_${random}`;
  }

  /**
   * Initialize or get current session
   */
  public async getCurrentSession(): Promise<{ sessionId: string; sessionStartTime: number }> {
    try {
      // Check if we have a valid session in memory
      if (this.currentSessionId && this.sessionStartTime) {
        const sessionAge = Date.now() - this.sessionStartTime;
        if (sessionAge < SESSION_DURATION) {
          return {
            sessionId: this.currentSessionId,
            sessionStartTime: this.sessionStartTime
          };
        }
      }

      // Check AsyncStorage for existing session
      const storedSessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      const storedStartTime = await AsyncStorage.getItem(SESSION_START_TIME_KEY);

      if (storedSessionId && storedStartTime) {
        const startTime = parseInt(storedStartTime, 10);
        const sessionAge = Date.now() - startTime;

        // If session is still valid, use it
        if (sessionAge < SESSION_DURATION) {
          this.currentSessionId = storedSessionId;
          this.sessionStartTime = startTime;
          return {
            sessionId: storedSessionId,
            sessionStartTime: startTime
          };
        }
      }

      // Create new session
      const newSessionId = this.generateSessionId();
      const newStartTime = Date.now();

      // Store in memory and AsyncStorage
      this.currentSessionId = newSessionId;
      this.sessionStartTime = newStartTime;

      await Promise.all([
        AsyncStorage.setItem(SESSION_ID_KEY, newSessionId),
        AsyncStorage.setItem(SESSION_START_TIME_KEY, newStartTime.toString())
      ]);

      console.log('🆔 New session created:', newSessionId);
      return {
        sessionId: newSessionId,
        sessionStartTime: newStartTime
      };
    } catch (error) {
      console.error('Error managing session:', error);
      // Fallback to generating a temporary session ID
      const fallbackSessionId = this.generateSessionId();
      return {
        sessionId: fallbackSessionId,
        sessionStartTime: Date.now()
      };
    }
  }

  /**
   * Get current user ID
   */
  public getCurrentUserId(): string | null {
    return auth().currentUser?.uid || null;
  }

  /**
   * Get session info for API calls
   */
  public async getSessionInfo(): Promise<{ userId: string | null; sessionId: string }> {
    const session = await this.getCurrentSession();
    const userId = this.getCurrentUserId();
    
    return {
      userId,
      sessionId: session.sessionId
    };
  }

  /**
   * Clear current session (useful for logout)
   */
  public async clearSession(): Promise<void> {
    try {
      this.currentSessionId = null;
      this.sessionStartTime = null;
      
      await Promise.all([
        AsyncStorage.removeItem(SESSION_ID_KEY),
        AsyncStorage.removeItem(SESSION_START_TIME_KEY)
      ]);
      
      console.log('🆔 Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  /**
   * Check if current session is valid
   */
  public async isSessionValid(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      const sessionAge = Date.now() - session.sessionStartTime;
      return sessionAge < SESSION_DURATION;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Get session metadata for analytics
   */
  public async getSessionMetadata(): Promise<{
    sessionId: string;
    userId: string | null;
    sessionStartTime: number;
    sessionAge: number;
    isAuthenticated: boolean;
  }> {
    const session = await this.getCurrentSession();
    const userId = this.getCurrentUserId();
    const sessionAge = Date.now() - session.sessionStartTime;
    
    return {
      sessionId: session.sessionId,
      userId,
      sessionStartTime: session.sessionStartTime,
      sessionAge,
      isAuthenticated: !!userId
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Export types for API payloads
export interface SessionInfo {
  userId: string | null;
  sessionId: string;
}

export interface ApiPayloadWithSession {
  user_id?: string;
  session_id: string;
  [key: string]: any;
} 