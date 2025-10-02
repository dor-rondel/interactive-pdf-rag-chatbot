import 'server-only';

/**
 * Error message when no relevant documents are found
 */
export const NO_RESULTS_MESSAGE =
  "I couldn't find any relevant information in the uploaded document to answer your question. Please try rephrasing your question or upload a more relevant document.";

/**
 * Build a prompt for RAG queries with context and conversation history
 * @param historyText - Formatted conversation history
 * @param context - Document context from retrieved chunks
 * @param question - Current user question
 * @returns Formatted prompt string
 */
export function buildPrompt(
  historyText: string,
  context: string,
  question: string
): string {
  const trimmedHistory = historyText.trim();

  return `You are a helpful assistant that answers questions based on the provided context from uploaded documents and previous conversation.

${trimmedHistory ? `Previous conversation:\n${trimmedHistory}\n\n` : ''}Document context:
${context}

Current question: ${question}

Please provide a comprehensive answer considering both the document context and our conversation history. If the context doesn't contain enough information to fully answer the question, please say so and explain what information is available.`;
}
