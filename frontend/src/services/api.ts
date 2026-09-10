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
    }).catch(() => {
      throw new Error('NetworkError: The server is currently unreachable. Please ensure the backend is running.');
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `HTTP error! status: ${response.status}`;
      
      if (errorMsg.includes('exceeds maximum token limit')) {
        throw new Error('TokenLimitError: Your prompt is too long. Please shorten it and try again.');
      }
      if (errorMsg.includes('timeout')) {
        throw new Error('TimeoutError: The LLM took too long to respond. Please try again.');
      }
      
      throw new Error(`API Error: ${errorMsg}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/**
 * Streams a prompt to the LLM backend.
 * 
 * @param prompt The user's question or statement
 * @param sessionId Optional session ID for tracking conversation history
 * @param onChunk Callback for each streamed chunk of text
 * @returns The LLM response including token usage
 */
export const streamPrompt = async (
  prompt: string, 
  sessionId?: string,
  onChunk?: (chunk: string) => void
): Promise<LLMResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/llm/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sessionId,
      }),
    }).catch(() => {
      throw new Error('NetworkError: The server is currently unreachable. Please ensure the backend is running.');
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `HTTP error! status: ${response.status}`;
      
      if (errorMsg.includes('exceeds maximum token limit')) {
        throw new Error('TokenLimitError: Your prompt is too long. Please shorten it and try again.');
      }
      if (errorMsg.includes('timeout')) {
        throw new Error('TimeoutError: The LLM took too long to respond. Please try again.');
      }
      
      throw new Error(`API Error: ${errorMsg}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let usageData: LLMResponse['usage'] | null = null;
    let fullAnswer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.error) {
              throw new Error(`API Error: ${data.error}`);
            }
            if (data.chunk) {
              fullAnswer += data.chunk;
              if (onChunk) onChunk(data.chunk);
            }
            if (data.done && data.usage) {
              usageData = data.usage;
            }
          } catch (e) {
            // Ignore parse errors on incomplete chunks if any
          }
        }
      }
    }

    return {
      answer: fullAnswer,
      usage: usageData || { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    };
  } catch (error) {
    console.error('Streaming API Error:', error);
    throw error;
  }
};

/**
 * Uploads a document to the backend for processing.
 * 
 * @param file The File object from the file input
 * @returns Response data containing file metadata
 */
export const uploadDocument = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload API Error:', error);
    throw error;
  }
};
