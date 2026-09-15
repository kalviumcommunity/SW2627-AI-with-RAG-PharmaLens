import { estimateTokenCount } from '../utils/tokenizer';
import { env } from '../config/env';

export interface HistoryMessage {
  role: 'user' | 'model' | 'system' | 'assistant';
  content: string;
}

/**
 * In-memory history store for conversation contexts.
 * In a production environment, this should be replaced with a database (e.g. MongoDB/Redis).
 */
export class HistoryService {
  private store: Map<string, HistoryMessage[]> = new Map();

  /**
   * Retrieves the current history for a session.
   */
  getHistory(sessionId: string): HistoryMessage[] {
    return this.store.get(sessionId) || [];
  }

  /**
   * Adds a new message to the session's history and trims the history
   * if it exceeds the maximum token limit for context windows.
   */
  addMessage(sessionId: string, message: HistoryMessage): void {
    const history = this.getHistory(sessionId);
    history.push(message);

    const trimmedHistory = this.trimHistory(history);
    this.store.set(sessionId, trimmedHistory);
  }

  /**
   * Clears the history for a given session.
   */
  clearHistory(sessionId: string): void {
    this.store.delete(sessionId);
  }

  /**
   * Trims the history by removing the oldest messages (excluding the system prompt)
   * until the total token count is within the LLM_MAX_HISTORY_TOKENS limit.
   */
  private trimHistory(history: HistoryMessage[]): HistoryMessage[] {
    let currentHistory = [...history];

    // Find the system prompt if it exists (usually the first message)
    const systemPrompt = currentHistory.find(msg => msg.role === 'system');
    
    // We only trim user/assistant messages to preserve the core instructions
    const conversation = currentHistory.filter(msg => msg.role !== 'system');

    while (conversation.length > 0) {
      // Reconstruct the array to measure tokens
      const messagesToMeasure = systemPrompt ? [systemPrompt, ...conversation] : conversation;
      // Since estimateTokenCount accepts strings, we map the content
      const tokenCount = estimateTokenCount(messagesToMeasure.map(m => m.content).join('\n'));

      if (tokenCount <= env.llmMaxHistoryTokens) {
        return messagesToMeasure;
      }

      // Remove the oldest message from the conversation (shift from start)
      conversation.shift();
    }

    // If everything was removed and it still exceeds (e.g., massive system prompt),
    // we just return the system prompt.
    return systemPrompt ? [systemPrompt] : [];
  }
}

export const historyService = new HistoryService();
