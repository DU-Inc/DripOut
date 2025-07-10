/**
 * Interaction Batch Service
 * Batches user interactions (likes, saves, follows) to reduce API calls and improve performance
 */

import { InteractionManager } from 'react-native';

// Types for different interaction operations
type InteractionType = 'like' | 'save' | 'follow' | 'unfollow';

interface BatchOperation {
  id: string;
  type: InteractionType;
  targetId: string;
  userId: string;
  timestamp: number;
  retryCount?: number;
}

interface BatchConfig {
  maxBatchSize: number;
  batchWindowMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

class InteractionBatchService {
  private pendingOperations = new Map<string, BatchOperation>();
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  private config: BatchConfig = {
    maxBatchSize: 10,        // Max operations per batch
    batchWindowMs: 2000,     // Wait 2 seconds to collect operations
    maxRetries: 3,           // Retry failed operations up to 3 times
    retryDelayMs: 1000       // Wait 1 second between retries
  };

  /**
   * Add an interaction operation to the batch queue
   */
  addOperation(
    type: InteractionType,
    targetId: string,
    userId: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const operationId = `${type}_${targetId}_${userId}`;
      
      // Check if operation is already pending
      if (this.pendingOperations.has(operationId)) {
        console.log(`🔄 Operation already pending: ${operationId}`);
        resolve(true);
        return;
      }

      // Add to pending operations
      const operation: BatchOperation = {
        id: operationId,
        type,
        targetId,
        userId,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.pendingOperations.set(operationId, operation);
      console.log(`➕ Added operation to batch: ${operationId}`);

      // Schedule batch processing
      this.scheduleBatchProcessing();

      // For now, resolve immediately (optimistic UI)
      resolve(true);
    });
  }

  /**
   * Schedule batch processing with debouncing
   */
  private scheduleBatchProcessing(): void {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // If we have too many operations, process immediately
    if (this.pendingOperations.size >= this.config.maxBatchSize) {
      console.log(`🚀 Processing batch immediately (${this.pendingOperations.size} operations)`);
      InteractionManager.runAfterInteractions(() => {
        this.processBatch();
      });
      return;
    }

    // Otherwise, wait for the batch window
    this.batchTimer = setTimeout(() => {
      if (this.pendingOperations.size > 0) {
        console.log(`⏰ Batch window expired, processing ${this.pendingOperations.size} operations`);
        InteractionManager.runAfterInteractions(() => {
          this.processBatch();
        });
      }
    }, this.config.batchWindowMs);
  }

  /**
   * Process the current batch of operations
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.pendingOperations.size === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing batch of ${this.pendingOperations.size} operations`);

    // Get current operations and clear the queue
    const operations = Array.from(this.pendingOperations.values());
    this.pendingOperations.clear();

    // Group operations by type for efficient API calls
    const groupedOperations = this.groupOperationsByType(operations);

    // Process each group
    for (const [type, ops] of Object.entries(groupedOperations)) {
      try {
        await this.processOperationGroup(type as InteractionType, ops);
      } catch (error) {
        console.error(`❌ Failed to process ${type} operations:`, error);
        
        // Re-queue failed operations for retry
        for (const op of ops) {
          if ((op.retryCount || 0) < this.config.maxRetries) {
            op.retryCount = (op.retryCount || 0) + 1;
            this.pendingOperations.set(op.id, op);
            console.log(`🔄 Re-queued operation for retry: ${op.id} (attempt ${op.retryCount})`);
          } else {
            console.error(`💀 Max retries exceeded for operation: ${op.id}`);
          }
        }
      }
    }

    this.isProcessing = false;

    // If there are still pending operations (retries), schedule another batch
    if (this.pendingOperations.size > 0) {
      console.log(`🔄 Scheduling retry batch for ${this.pendingOperations.size} operations`);
      setTimeout(() => {
        this.scheduleBatchProcessing();
      }, this.config.retryDelayMs);
    }
  }

  /**
   * Group operations by type for efficient processing
   */
  private groupOperationsByType(operations: BatchOperation[]): Record<string, BatchOperation[]> {
    const grouped: Record<string, BatchOperation[]> = {};

    for (const op of operations) {
      if (!grouped[op.type]) {
        grouped[op.type] = [];
      }
      grouped[op.type].push(op);
    }

    return grouped;
  }

  /**
   * Process a group of operations of the same type
   */
  private async processOperationGroup(
    type: InteractionType,
    operations: BatchOperation[]
  ): Promise<void> {
    console.log(`📦 Processing ${operations.length} ${type} operations`);

    switch (type) {
      case 'like':
        await this.batchLikeOperations(operations);
        break;
      case 'save':
        await this.batchSaveOperations(operations);
        break;
      case 'follow':
        await this.batchFollowOperations(operations);
        break;
      case 'unfollow':
        await this.batchUnfollowOperations(operations);
        break;
      default:
        console.warn(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Batch like operations
   */
  private async batchLikeOperations(operations: BatchOperation[]): Promise<void> {
    try {
      // Import like service dynamically to avoid circular dependencies
      const { batchLikePosts } = await import('./postService');
      
      const postIds = operations.map(op => op.targetId);
      const userId = operations[0].userId; // Assume all operations from same user
      
      console.log(`👍 Batching ${postIds.length} like operations for user ${userId}`);
      await batchLikePosts(userId, postIds);
      
      console.log(`✅ Successfully processed ${postIds.length} like operations`);
    } catch (error) {
      console.error('Failed to batch like operations:', error);
      throw error;
    }
  }

  /**
   * Batch save operations
   */
  private async batchSaveOperations(operations: BatchOperation[]): Promise<void> {
    try {
      // Import shelf service dynamically
      const { batchSaveProducts } = await import('./shelfService');
      
      const productIds = operations.map(op => op.targetId);
      const userId = operations[0].userId;
      
      console.log(`💾 Batching ${productIds.length} save operations for user ${userId}`);
      await batchSaveProducts(userId, productIds);
      
      console.log(`✅ Successfully processed ${productIds.length} save operations`);
    } catch (error) {
      console.error('Failed to batch save operations:', error);
      throw error;
    }
  }

  /**
   * Batch follow operations
   */
  private async batchFollowOperations(operations: BatchOperation[]): Promise<void> {
    try {
      // Import follow service dynamically
      const { batchFollowUsers } = await import('./followService');
      
      const targetUserIds = operations.map(op => op.targetId);
      const userId = operations[0].userId;
      
      console.log(`👥 Batching ${targetUserIds.length} follow operations for user ${userId}`);
      await batchFollowUsers(userId, targetUserIds);
      
      console.log(`✅ Successfully processed ${targetUserIds.length} follow operations`);
    } catch (error) {
      console.error('Failed to batch follow operations:', error);
      throw error;
    }
  }

  /**
   * Batch unfollow operations
   */
  private async batchUnfollowOperations(operations: BatchOperation[]): Promise<void> {
    try {
      // Import follow service dynamically
      const { batchUnfollowUsers } = await import('./followService');
      
      const targetUserIds = operations.map(op => op.targetId);
      const userId = operations[0].userId;
      
      console.log(`👥 Batching ${targetUserIds.length} unfollow operations for user ${userId}`);
      await batchUnfollowUsers(userId, targetUserIds);
      
      console.log(`✅ Successfully processed ${targetUserIds.length} unfollow operations`);
    } catch (error) {
      console.error('Failed to batch unfollow operations:', error);
      throw error;
    }
  }

  /**
   * Force process all pending operations immediately
   */
  async flushPendingOperations(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    console.log(`🚀 Force flushing ${this.pendingOperations.size} pending operations`);
    await this.processBatch();
  }

  /**
   * Get current batch statistics
   */
  getStats(): {
    pendingOperations: number;
    isProcessing: boolean;
    config: BatchConfig;
  } {
    return {
      pendingOperations: this.pendingOperations.size,
      isProcessing: this.isProcessing,
      config: { ...this.config }
    };
  }

  /**
   * Update batch configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 Updated batch config:', this.config);
  }

  /**
   * Clear all pending operations
   */
  clearPendingOperations(): void {
    this.pendingOperations.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    console.log('🧹 Cleared all pending operations');
  }
}

// Global instance
export const interactionBatchService = new InteractionBatchService();

// Convenience functions
export const batchLike = (targetId: string, userId: string) => 
  interactionBatchService.addOperation('like', targetId, userId);

export const batchSave = (targetId: string, userId: string) => 
  interactionBatchService.addOperation('save', targetId, userId);

export const batchFollow = (targetId: string, userId: string) => 
  interactionBatchService.addOperation('follow', targetId, userId);

export const batchUnfollow = (targetId: string, userId: string) => 
  interactionBatchService.addOperation('unfollow', targetId, userId);

export const flushInteractions = () => 
  interactionBatchService.flushPendingOperations();

export const getBatchStats = () => 
  interactionBatchService.getStats();