export interface LLMResponse {
  answer: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
}

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Sends a prompt to the LLM backend for processing.
 * 
 * @param prompt The user's question or statement
 * @param sessionId Optional session ID for tracking conversation history
 * @returns The LLM response including token usage
 */
export const sendPrompt = async (prompt: string, sessionId?: string): Promise<LLMResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/llm/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
