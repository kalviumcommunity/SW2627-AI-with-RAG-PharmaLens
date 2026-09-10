import OpenAI from 'openai';
import { env } from '../config/env';
import { ChatCompletionMessageParam } from 'openai/resources';
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
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.openAiApiKey,
    });
  }

  async getCompletion(messages: ChatCompletionMessageParam[]): Promise<LLMResponse> {
    if (!env.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const estimatedInputTokens = estimateTokenCount(messages);
    if (estimatedInputTokens > env.llmMaxPromptTokens) {
      throw new Error(`Prompt exceeds maximum token limit (${estimatedInputTokens} > ${env.llmMaxPromptTokens}).`);
    }

    try {
      const response = await this.openai.chat.completions.create(
        {
          model: env.llmModel,
          messages,
        },
        { timeout: env.llmTimeoutMs }
      );

      const answer = response.choices[0]?.message?.content || null;
      
      const inputTokens = response.usage?.prompt_tokens || estimatedInputTokens;
      const outputTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || (inputTokens + outputTokens);
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
    messages: ChatCompletionMessageParam[],
    onChunk: (text: string) => void
  ): Promise<LLMResponse> {
    const stream = await this.openai.chat.completions.create(
      {
        model: env.llmModel,
        messages,
        stream: true,
      },
      { timeout: env.llmTimeoutMs }
    );

    let fullAnswer = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullAnswer += content;
        onChunk(content);
      }
    }

    const inputString = messages.map(m => String(m.content)).join('\n');
    const inputTokens = estimateTokenCount(inputString);
    const outputTokens = estimateTokenCount(fullAnswer);
    const totalTokens = inputTokens + outputTokens;

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
}

export const llmService = new LLMService();
