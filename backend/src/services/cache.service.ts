import { SourceMetadata } from './rag.service';

export interface CacheEntry {
  answer: string;
  sources: SourceMetadata[];
  timestamp: number;
}

export class CacheService {
  // Simple in-memory cache map
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Generates a unique cache key based on the prompt and contextual metadata.
   */
  private generateKey(prompt: string, documentId?: string, sessionId?: string): string {
    // If a session ID exists, the conversation state is mutating, so caching is trickier.
    // For safety and simplicity, we can choose to only cache stateless queries (no sessionId),
    // or include the sessionId in the key (so repeated questions in the same session are cached).
    // Including sessionId is safe.
    return JSON.stringify({
      prompt: prompt.trim().toLowerCase(),
      documentId: documentId || null,
      sessionId: sessionId || null,
    });
  }

  /**
   * Retrieves a cached response if it exists.
   */
  get(prompt: string, documentId?: string, sessionId?: string): CacheEntry | null {
    const key = this.generateKey(prompt, documentId, sessionId);
    return this.cache.get(key) || null;
  }

  /**
   * Stores a response in the cache.
   */
  set(prompt: string, answer: string, sources: SourceMetadata[], documentId?: string, sessionId?: string): void {
    const key = this.generateKey(prompt, documentId, sessionId);
    this.cache.set(key, {
      answer,
      sources,
      timestamp: Date.now(),
    });
    
    // Optional: Implement cache eviction if map gets too large
    if (this.cache.size > 1000) {
      // Very naive eviction: clear cache completely
      this.cache.clear();
    }
  }

  /**
   * Clears the cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
