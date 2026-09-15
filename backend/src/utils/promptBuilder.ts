import { HistoryMessage } from '../services/history.service';

export interface PromptInput {
  systemInstruction?: string;
  context?: string;
  userQuestion: string;
}

/**
 * Builds a structured array of messages for the OpenAI API.
 * Uses strict XML delimiters and prompt engineering best practices to prevent hallucinations.
 */
export const buildRagPrompt = ({
  systemInstruction,
  context,
  userQuestion,
}: PromptInput): HistoryMessage[] => {
  const messages: HistoryMessage[] = [];

  // 1. Establish the core persona and rules
  const baseInstruction = systemInstruction || 
    'You are a highly intelligent, professional pharmaceutical research assistant. Your primary goal is to answer the user’s question based STRICTLY and ONLY on the provided context.';

  // 2. Build the unified System Prompt with XML-delimited context
  let fullSystemPrompt = `${baseInstruction}\n\n`;
  fullSystemPrompt += `### BEHAVIORAL RULES ###\n`;
  fullSystemPrompt += `- Do NOT use outside knowledge. If the answer is not contained within the <context> tags below, you must reply: "I couldn't find sufficient evidence in the available documents to answer this question."\n`;
  fullSystemPrompt += `- You MUST cite your sources. When you use information from the context, append a citation in the format [Source: filename] at the end of the sentence.\n`;
  fullSystemPrompt += `- Be concise, professional, and structure your answer clearly.\n\n`;

  if (context) {
    fullSystemPrompt += `### KNOWLEDGE BASE ###\n`;
    fullSystemPrompt += `<context>\n${context}\n</context>\n`;
  } else {
    fullSystemPrompt += `### KNOWLEDGE BASE ###\n`;
    fullSystemPrompt += `<context>\nNo documents were retrieved for this query.\n</context>\n`;
  }

  // Push the monolithic, highly-structured system instruction
  messages.push({
    role: 'system',
    content: fullSystemPrompt,
  });

  // Push the user's raw query
  messages.push({
    role: 'user',
    content: userQuestion,
  });

  return messages;
};
