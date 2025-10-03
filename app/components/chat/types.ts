/**
 * Type definition for a chat message object.
 * Used throughout the chat interface components.
 */
export type MessageProps = {
  /** Unique identifier for the message */
  id: string;
  /** The message text content */
  text: string;
  /** Who sent the message */
  sender: 'user' | 'bot';
  /** Optional source references with content, relevance scores, and page numbers */
  sources?: Array<{
    /** Source content snippet */
    content: string;
    /** Relevance score between 0 and 1 */
    score: number;
    /** Page number where this content was found (optional for backward compatibility) */
    page?: number;
  }>;
  /** Whether the message is currently being processed */
  isLoading?: boolean;
};
