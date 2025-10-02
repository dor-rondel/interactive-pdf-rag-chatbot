/** Response type for single text embedding from Gemini API */
export type EmbeddingResponse = {
  embedding: {
    values: number[];
  };
};

/** Response type for batch text embeddings from Gemini API */
export type BatchEmbeddingResponse = {
  embeddings: Array<{
    values: number[];
  }>;
};

// Chat types

/** Chat message format for conversation history */
export type ChatMessage = {
  /** Message sender role */
  role: 'user' | 'assistant';
  /** Message text content */
  content: string;
};

/** Request format for chat API endpoint */
export type ChatRequest = {
  /** User's message text */
  message: string;
};

/** Response format for chat API endpoint */
export type ChatResponse = {
  /** AI assistant's response message */
  message: string;
  /** Optional source references with content and relevance scores */
  sources?: Array<{
    /** Source content snippet */
    content: string;
    /** Relevance score between 0 and 1 */
    score: number;
  }>;
};

// Streaming types

/** Streaming message chunk from server */
export type StreamMessageChunk = {
  type: 'message_chunk';
  content: string;
};

/** Streaming sources metadata */
export type StreamSources = {
  type: 'sources';
  sources: Array<{
    content: string;
    score: number;
  }>;
};

/** Streaming message start marker */
export type StreamMessageStart = {
  type: 'message_start';
};

/** Streaming message end marker */
export type StreamMessageEnd = {
  type: 'message_end';
};

/** Streaming error message */
export type StreamError = {
  type: 'error';
  error: string;
};

/** Union type for all streaming data types */
export type StreamData =
  | StreamMessageChunk
  | StreamSources
  | StreamMessageStart
  | StreamMessageEnd
  | StreamError;

// Gemini API response types

/** Response format from Gemini chat completion API */
export type GeminiChatResponse = {
  /** Array of response candidates */
  candidates: Array<{
    /** Response content */
    content: {
      /** Array of content parts */
      parts: Array<{
        /** Generated text */
        text: string;
      }>;
    };
  }>;
};
