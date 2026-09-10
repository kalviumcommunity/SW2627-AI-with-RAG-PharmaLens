import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 3001,
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10),
};
