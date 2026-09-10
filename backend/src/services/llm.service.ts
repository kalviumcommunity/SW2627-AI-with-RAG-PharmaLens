import OpenAI from 'openai';
import { env } from '../config/env';

export class LLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.openAiApiKey,
    });
  }

  async getCompletion(prompt: string): Promise<string | null> {
    if (!env.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    try {
      const response = await this.openai.chat.completions.create(
        {
          model: env.llmModel,
          messages: [{ role: 'user', content: prompt }],
        },
        { timeout: env.llmTimeoutMs }
      );

      return response.choices[0]?.message?.content || null;
    } catch (error: any) {
      console.error('LLM Completion Error:', error.message);
      throw new Error(`LLM Error: ${error.message}`);
    }
  }
}

export const llmService = new LLMService();
