import { encoding_for_model, TiktokenModel } from 'tiktoken';
import { env } from '../config/env';
import { ChatCompletionMessageParam } from 'openai/resources';

/**
 * Estimates the number of tokens in a string or an array of Chat messages.
 */
export const estimateTokenCount = (input: string | ChatCompletionMessageParam[]): number => {
  // tiktoken supports specific models like 'gpt-3.5-turbo', 'gpt-4', etc.
  // Fallback to 'gpt-3.5-turbo' if the model is unknown
  const modelName = env.llmModel as TiktokenModel;
  
  let encoder;
  try {
    encoder = encoding_for_model(modelName);
  } catch (e) {
    encoder = encoding_for_model('gpt-3.5-turbo');
  }

  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else {
    // Very basic estimation for messages array (OpenAI has slight overhead per message, but this is a rough estimate to prevent overflow)
    text = input.map(msg => msg.content).join('\n');
  }

  const tokens = encoder.encode(text);
  const count = tokens.length;
  
  encoder.free(); // Free memory
  
  return count;
};

/**
 * Calculates the estimated cost of an LLM request based on input and output tokens.
 */
export const calculateCost = (inputTokens: number, outputTokens: number): number => {
  const inputCost = (inputTokens / 1000) * env.llmInputCostPer1k;
  const outputCost = (outputTokens / 1000) * env.llmOutputCostPer1k;
  return inputCost + outputCost;
};
