import { llmService } from './llm.service';
import { vectorService } from './vector.service';
import { historyService } from './history.service';
import { rerankChunks } from '../utils/reranker';
import { buildRagPrompt } from '../utils/promptBuilder';

export interface RagQueryOptions {
  systemInstruction?: string;
  context?: string;
  sessionId?: string;
  documentId?: string;
}

export class RagService {
  /**
   * Retrieves strictly relevant and ranked context from Pinecone for a given prompt.
   */
  private async retrieveContext(prompt: string, documentId?: string): Promise<string> {
    try {
      const queryVector = await llmService.generateEmbeddings([prompt]);
      if (queryVector.length === 0) return '';

      const filter = documentId ? { documentId } : undefined;
      // Stage 1: Recall a larger pool (topK = 10)
      const matches = await vectorService.queryVectors(queryVector[0], 10, filter);
      
      // Filter matches that are mathematically relevant
      const relevantMatches = matches.filter(m => m.score && m.score >= 0.4);
      if (relevantMatches.length === 0) return '';

      // Stage 2: Lexical Re-Ranking (boost keyword matches and take top 3)
      const finalChunks = rerankChunks(prompt, relevantMatches, 3);

      // Build context string from metadata
      const contextStr = finalChunks.map(m => `Source: ${m.metadata.filename}\n${m.metadata.text}`).join('\n\n');
      return contextStr;
    } catch (err) {
      console.error('Retrieval error:', err);
      return ''; // Fail gracefully if Pinecone is down or not set
    }
  }

  /**
   * Prepares the final array of message objects for the LLM.
   */
  private async buildFinalMessages(prompt: string, options: RagQueryOptions) {
    const { systemInstruction, context, sessionId, documentId } = options;

    const retrievedContext = await this.retrieveContext(prompt, documentId);
    const finalContext = context ? `${context}\n\n${retrievedContext}` : retrievedContext;

    const newMessages = buildRagPrompt({
      userQuestion: prompt,
      systemInstruction,
      context: finalContext,
    });

    let finalMessages = newMessages;

    if (sessionId) {
      const existing = historyService.getHistory(sessionId);
      if (existing.length === 0) {
        newMessages.forEach(msg => historyService.addMessage(sessionId, msg));
      } else {
        // Just append the new user question
        historyService.addMessage(sessionId, newMessages[newMessages.length - 1]);
      }
      finalMessages = historyService.getHistory(sessionId);
    }

    return finalMessages;
  }

  /**
   * Processes a standard (non-streaming) RAG query.
   */
  async processQuery(prompt: string, options: RagQueryOptions) {
    const finalMessages = await this.buildFinalMessages(prompt, options);
    const result = await llmService.getCompletion(finalMessages);

    if (options.sessionId && result.answer) {
      historyService.addMessage(options.sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    return result;
  }

  /**
   * Processes a streaming RAG query.
   */
  async processStreamQuery(
    prompt: string, 
    options: RagQueryOptions, 
    onChunk: (chunk: string) => void,
    onCheckDisconnect: () => boolean
  ) {
    const finalMessages = await this.buildFinalMessages(prompt, options);
    
    const result = await llmService.streamCompletion(finalMessages, (chunk) => {
      if (onCheckDisconnect()) return;
      onChunk(chunk);
    });

    if (options.sessionId && result.answer && !onCheckDisconnect()) {
      historyService.addMessage(options.sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    return result;
  }
}

export const ragService = new RagService();
