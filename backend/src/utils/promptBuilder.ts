import { ChatCompletionMessageParam } from 'openai/resources';

export interface PromptInput {
  systemInstruction?: string;
  context?: string;
  userQuestion: string;
}

/**
 * Builds a structured array of messages for the OpenAI API.
 * This ensures strict separation of system instructions, retrieved context, and the user's question.
 */
export const buildRagPrompt = ({
  systemInstruction,
  context,
  userQuestion,
}: PromptInput): ChatCompletionMessageParam[] => {
  const messages: ChatCompletionMessageParam[] = [];

  // Default system instruction if none provided
  const baseInstruction =
    systemInstruction ||
    'You are a helpful pharmaceutical research assistant. Answer the user’s question based ONLY on the provided context. If the context does not contain the answer, say "I couldn\'t find sufficient evidence in the available documents to answer this question."';

  messages.push({
    role: 'system',
    content: baseInstruction,
  });

  if (context) {
    messages.push({
      role: 'system',
      content: `### PROVIDED CONTEXT ###\n${context}\n\nDo not use any outside knowledge. Answer based strictly on the above context.`,
    });
  }

  messages.push({
    role: 'user',
    content: userQuestion,
  });

  return messages;
};
