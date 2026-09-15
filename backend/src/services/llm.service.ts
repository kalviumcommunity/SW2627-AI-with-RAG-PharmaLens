import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { HistoryMessage } from './history.service';
import { estimateTokenCount, calculateCost } from '../utils/tokenizer';

export interface LLMResponse {
  answer: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

export class LLMService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: env.geminiApiKey,
    });
  }

  /**
   * Helper to format generic HistoryMessage to Gemini format.
   */
  private formatMessages(messages: HistoryMessage[]) {
    // Gemini handles system instructions separately, not as standard messages
    const systemPrompt = messages.find(m => m.role === 'system')?.content;
    const conversation = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
    return { systemPrompt, conversation };
  }

  async getCompletion(messages: HistoryMessage[]): Promise<LLMResponse> {
    if (!env.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const inputString = messages.map(m => m.content).join('\n');
    const estimatedInputTokens = estimateTokenCount(inputString);
    
    if (estimatedInputTokens > env.llmMaxPromptTokens) {
      throw new Error(`Prompt exceeds maximum token limit (${estimatedInputTokens} > ${env.llmMaxPromptTokens}).`);
    }

    const { systemPrompt, conversation } = this.formatMessages(messages);

    try {
      const response = await this.ai.models.generateContent({
        model: env.llmModel,
        contents: conversation,
        config: {
          systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
          temperature: env.llmTemperature,
          topP: env.llmTopP,
          maxOutputTokens: env.llmMaxOutputTokens,
        }
      });

      const answer = response.text || null;
      
      const inputTokens = response.usageMetadata?.promptTokenCount || estimatedInputTokens;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = response.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);
      const estimatedCostUsd = calculateCost(inputTokens, outputTokens);

      return {
        answer,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd,
        }
      };
    } catch (error: any) {
      console.error('LLM Completion Error:', error.message);
      throw new Error(`LLM Error: ${error.message}`);
    }
  }

  public async streamCompletion(
    messages: HistoryMessage[],
    onChunk: (text: string) => void
  ): Promise<LLMResponse> {
    const inputString = messages.map(m => m.content).join('\n');
    const estimatedInputTokens = estimateTokenCount(inputString);
    
    const { systemPrompt, conversation } = this.formatMessages(messages);

    const stream = await this.ai.models.generateContentStream({
      model: env.llmModel,
      contents: conversation,
      config: {
        systemInstruction: systemPrompt ? { role: 'system', parts: [{ text: systemPrompt }] } : undefined,
        temperature: env.llmTemperature,
        topP: env.llmTopP,
        maxOutputTokens: env.llmMaxOutputTokens,
      }
    });

    let fullAnswer = '';
    let finalUsage: any = null;

    for await (const chunk of stream) {
      const content = chunk.text || '';
      if (content) {
        fullAnswer += content;
        onChunk(content);
      }
      if (chunk.usageMetadata) {
        finalUsage = chunk.usageMetadata;
      }
    }

    const inputTokens = finalUsage?.promptTokenCount || estimatedInputTokens;
    const outputTokens = finalUsage?.candidatesTokenCount || estimateTokenCount(fullAnswer);
    const totalTokens = finalUsage?.totalTokenCount || (inputTokens + outputTokens);

    return {
      answer: fullAnswer,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd: calculateCost(inputTokens, outputTokens),
      },
    };
  }

  public calculateCosts(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * env.llmInputCostPer1k;
    const outputCost = (outputTokens / 1000) * env.llmOutputCostPer1k;
    return inputCost + outputCost;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates vector embeddings for a list of text chunks.
   * Processes chunks in batches to avoid API payload and rate limits.
   * 
   * @param texts An array of text chunks
   * @returns An array of number arrays (vectors)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!env.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    try {
      const allEmbeddings: number[][] = [];
      const batchSize = 100;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.ai.models.embedContent({
          model: env.embeddingModel,
          contents: batch,
        });

        // The response might be an array or a single object depending on input
        const embeddingsResponse = response.embeddings || [];
        const batchEmbeddings = embeddingsResponse.map((item: any) => item.values);
        allEmbeddings.push(...batchEmbeddings);

        // Add a small delay between batches if there are more batches to process
        if (i + batchSize < texts.length) {
          await this.sleep(200);
        }
      }

      return allEmbeddings;
    } catch (error: any) {
      console.error('LLM Embedding Error:', error.message);
      throw new Error(`Embedding Error: ${error.message}`);
    }
  }
}

export const llmService = new LLMService();
