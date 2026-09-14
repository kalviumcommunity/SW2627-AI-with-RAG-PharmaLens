import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 3001,
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10),
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeIndex: process.env.PINECONE_INDEX || 'pharmalens',
  llmMaxPromptTokens: parseInt(process.env.LLM_MAX_PROMPT_TOKENS || '100000', 10),
  llmMaxHistoryTokens: parseInt(process.env.LLM_MAX_HISTORY_TOKENS || '2000', 10),
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
  llmTopP: parseFloat(process.env.LLM_TOP_P || '0.9'),
  llmMaxOutputTokens: parseInt(process.env.LLM_MAX_OUTPUT_TOKENS || '1000', 10),
  llmInputCostPer1k: parseFloat(process.env.LLM_INPUT_COST_PER_1K || '0.0015'),
  llmOutputCostPer1k: parseFloat(process.env.LLM_OUTPUT_COST_PER_1K || '0.0020'),
};
