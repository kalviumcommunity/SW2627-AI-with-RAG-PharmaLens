import { llmService } from './llm.service';
import { vectorService } from './vector.service';
import { historyService, HistoryMessage } from './history.service';
import { cacheService } from './cache.service';
import { usageService } from './usage.service';
import { rerankChunks } from '../utils/reranker';
import { buildRagPrompt } from '../utils/promptBuilder';

export interface RagQueryOptions {
  systemInstruction?: string;
  context?: string;
  sessionId?: string;
  documentId?: string;
}

export interface SourceMetadata {
  documentId: string;
  filename: string;
  text: string;
  score: number;
}

const STANDARD_REFUSAL = "I couldn't find sufficient evidence in the available documents to answer this question.";

export class RagService {
  /**
   * Retrieves strictly relevant and ranked context from Pinecone for a given prompt.
   * Returns both the concatenated context string and the raw source metadata.
   */
  private async retrieveContext(prompt: string, documentId?: string): Promise<{ contextStr: string; sources: SourceMetadata[] }> {
    try {
      const queryVector = await llmService.generateEmbeddings([prompt]);
      if (queryVector.length === 0) return { contextStr: '', sources: [] };

      const filter = documentId ? { documentId } : undefined;
      // Stage 1: Recall a larger pool (topK = 10)
      const matches = await vectorService.queryVectors(queryVector[0], 10, filter);
      
      // Filter matches that are mathematically relevant
      const relevantMatches = matches.filter(m => m.score && m.score >= 0.4);
      if (relevantMatches.length === 0) return { contextStr: '', sources: [] };

      // Stage 2: Lexical Re-Ranking (boost keyword matches and take top 3)
      const finalChunks = rerankChunks(prompt, relevantMatches, 3);

      const sources: SourceMetadata[] = finalChunks.map(m => ({
        documentId: m.metadata.documentId,
        filename: m.metadata.filename,
        text: m.metadata.text,
        score: m.score || 0
      }));

      // Build context string from metadata
      const contextStr = finalChunks.map(m => `Source: ${m.metadata.filename}\n${m.metadata.text}`).join('\n\n');
      
      return { contextStr, sources };
    } catch (err) {
      console.error('Retrieval error:', err);
      return { contextStr: '', sources: [] }; // Fail gracefully if Pinecone is down or not set
    }
  }

  /**
   * Rephrases the user's prompt into a standalone query using conversation history.
   * This is critical for Conversational RAG so the Vector DB gets context-rich searches.
   */
  private async rephrasePrompt(originalPrompt: string, sessionId?: string): Promise<string> {
    if (!sessionId) return originalPrompt;
    
    const history = historyService.getHistory(sessionId);
    // Filter out the monolithic system RAG prompt and only keep the dialogue
    const dialogue = history.filter(m => m.role !== 'system');
    
    // If no previous dialogue, the original prompt is already standalone
    if (dialogue.length === 0) return originalPrompt;

    const reformulationMessages: HistoryMessage[] = [
      { 
        role: 'system', 
        content: 'Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question. If it is already standalone, return it exactly as is. DO NOT ANSWER THE QUESTION, ONLY REPHRASE IT.' 
      },
      ...dialogue,
      { role: 'user', content: originalPrompt }
    ];

    try {
      // Use the standard LLM call to rewrite the prompt
      const result = await llmService.getCompletion(reformulationMessages);
      return result.answer || originalPrompt;
    } catch (err) {
      console.error('Error rephrasing prompt:', err);
      return originalPrompt; // Fallback to original prompt if LLM fails
    }
  }

  /**
   * Prepares the final array of message objects for the LLM.
   */
  private async buildFinalMessages(originalPrompt: string, standalonePrompt: string, options: RagQueryOptions) {
    const { systemInstruction, context, sessionId, documentId } = options;

    const { contextStr: retrievedContext, sources } = await this.retrieveContext(standalonePrompt, documentId);
    const finalContext = context ? `${context}\n\n${retrievedContext}` : retrievedContext;

    const hasContext = sources.length > 0 || !!context;

    const newMessages = buildRagPrompt({
      userQuestion: originalPrompt, // Use the original prompt for the user-facing UI
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

    return { finalMessages, sources, hasContext };
  }

  private isRefusalResponse(answer: string | null): boolean {
    if (!answer) return false;
    return answer.includes("couldn't find sufficient evidence") || answer.includes("could not find sufficient evidence");
  }

  async processQuery(prompt: string, options: RagQueryOptions) {
    // 0. Check Cache First
    const cached = cacheService.get(prompt, options.documentId, options.sessionId);
    if (cached) {
      if (options.sessionId) {
        historyService.addMessage(options.sessionId, { role: 'assistant', content: cached.answer });
      }
      return {
        answer: cached.answer,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        sources: cached.sources,
        isRefusal: this.isRefusalResponse(cached.answer),
        cached: true
      };
    }

    // 1. Rephrase the query if conversation history exists
    const standalonePrompt = await this.rephrasePrompt(prompt, options.sessionId);

    // 2. Build messages and context using the standalone prompt for search
    const { finalMessages, sources, hasContext } = await this.buildFinalMessages(prompt, standalonePrompt, options);
    
    // Short-Circuit Hallucination Guardrail
    if (!hasContext) {
      if (options.sessionId) {
        historyService.addMessage(options.sessionId, { role: 'assistant', content: STANDARD_REFUSAL });
      }
      return {
        answer: STANDARD_REFUSAL,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        sources: [],
        isRefusal: true
      };
    }

    const result = await llmService.getCompletion(finalMessages);
    const isRefusal = this.isRefusalResponse(result.answer);

    if (options.sessionId && result.answer) {
      historyService.addMessage(options.sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    // Save to Cache
    if (result.answer && !isRefusal) {
      cacheService.set(prompt, result.answer, sources, options.documentId, options.sessionId);
    }

    // Log Usage
    if (result.usage) {
      await usageService.logUsage({
        prompt: standalonePrompt,
        sessionId: options.sessionId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCostUsd: result.usage.estimatedCostUsd
      });
    }

    return {
      ...result,
      sources,
      isRefusal
    };
  }

  async processStreamQuery(
    prompt: string, 
    options: RagQueryOptions, 
    onChunk: (chunk: string) => void,
    onCheckDisconnect: () => boolean
  ) {
    // 0. Check Cache First
    const cached = cacheService.get(prompt, options.documentId, options.sessionId);
    if (cached) {
      onChunk(cached.answer);
      if (options.sessionId && !onCheckDisconnect()) {
        historyService.addMessage(options.sessionId, { role: 'assistant', content: cached.answer });
      }
      return {
        answer: cached.answer,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        sources: cached.sources,
        isRefusal: this.isRefusalResponse(cached.answer),
        cached: true
      };
    }

    // 1. Rephrase the query if conversation history exists
    const standalonePrompt = await this.rephrasePrompt(prompt, options.sessionId);

    // 2. Build messages and context using the standalone prompt for search
    const { finalMessages, sources, hasContext } = await this.buildFinalMessages(prompt, standalonePrompt, options);
    
    // Short-Circuit Hallucination Guardrail
    if (!hasContext) {
      onChunk(STANDARD_REFUSAL);
      if (options.sessionId && !onCheckDisconnect()) {
        historyService.addMessage(options.sessionId, { role: 'assistant', content: STANDARD_REFUSAL });
      }
      return {
        answer: STANDARD_REFUSAL,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        sources: [],
        isRefusal: true
      };
    }

    const result = await llmService.streamCompletion(finalMessages, (chunk) => {
      if (onCheckDisconnect()) return;
      onChunk(chunk);
    });

    const isRefusal = this.isRefusalResponse(result.answer);

    if (options.sessionId && result.answer && !onCheckDisconnect()) {
      historyService.addMessage(options.sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    // Save to Cache
    if (result.answer && !isRefusal && !onCheckDisconnect()) {
      cacheService.set(prompt, result.answer, sources, options.documentId, options.sessionId);
    }

    // Log Usage
    if (result.usage && !onCheckDisconnect()) {
      await usageService.logUsage({
        prompt: standalonePrompt,
        sessionId: options.sessionId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCostUsd: result.usage.estimatedCostUsd
      });
    }

    return {
      ...result,
      sources,
      isRefusal
    };
  }
}

export const ragService = new RagService();
