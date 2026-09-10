import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 3001,
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10),
  llmMaxPromptTokens: parseInt(process.env.LLM_MAX_PROMPT_TOKENS || '4000', 10),
  llmMaxHistoryTokens: parseInt(process.env.LLM_MAX_HISTORY_TOKENS || '2000', 10),
  llmInputCostPer1k: parseFloat(process.env.LLM_INPUT_COST_PER_1K || '0.0015'),
  llmOutputCostPer1k: parseFloat(process.env.LLM_OUTPUT_COST_PER_1K || '0.0020'),
};
