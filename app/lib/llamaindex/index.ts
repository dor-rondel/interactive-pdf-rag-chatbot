import 'server-only';

import { GEMINI_EMBEDDING_MODEL } from '@/app/lib/constants/gemini';
import { Settings, MetadataMode, NodeWithScore, Memory } from 'llamaindex';
import { createGeminiEmbedding } from './embedding';
import { generateEmbeddings, resetGlobalIndex } from './ingestion';
import { callGeminiLLMStream } from './streaming';
import { getMemory, resetGlobalMemory } from './memory';
import { getRetriever } from './retrieval';
import { buildPrompt, NO_RESULTS_MESSAGE } from './prompts';

// Configure Settings with Gemini embedding
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

Settings.embedModel = createGeminiEmbedding(apiKey, GEMINI_EMBEDDING_MODEL);
// Disable automatic chunking since we handle chunking manually with page awareness
Settings.chunkSize = 2048; // Large chunk size to prevent re-chunking our documents
Settings.chunkOverlap = 0; // No overlap since we handle this manually

// Re-export functions to maintain API compatibility
export {
  generateEmbeddings,
  getRetriever,
  resetGlobalIndex,
  resetGlobalMemory,
  getMemory,
};

/**
 * Perform streaming RAG query with conversation memory
 * Always returns streaming response with conversation context and page numbers
 * @param question - The user's question
 * @param memory - Optional Memory instance (uses global if not provided)
 * @returns Promise<{stream: ReadableStream<Uint8Array>, sources: Array<{content: string, score: number, page?: number}>}> - Streaming response with sources
 * @throws Error if retrieval or generation fails
 */
export async function queryRAG(
  question: string,
  memory?: Memory
): Promise<{
  stream: ReadableStream<Uint8Array>;
  sources: Array<{ content: string; score: number; page?: number }>;
}> {
  if (!question.trim()) {
    throw new Error('Question cannot be empty');
  }

  try {
    // Use provided memory or get global memory
    const conversationMemory = memory || getMemory();

    // Add user question to memory
    await conversationMemory.add({ role: 'user', content: question });

    // Get retriever for context
    const retriever = await getRetriever();

    // Retrieve relevant context
    const retrievalResult = await retriever.retrieve(question);

    if (!retrievalResult.length) {
      // For no results, create a simple stream with the error message
      const errorMessage = NO_RESULTS_MESSAGE;

      // Add error response to memory
      await conversationMemory.add({
        role: 'assistant',
        content: errorMessage,
      });

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(errorMessage));
          controller.close();
        },
      });

      return {
        stream,
        sources: [],
      };
    }

    // Prepare context from retrieved documents
    const context = retrievalResult
      .map(
        (result: NodeWithScore, index: number) =>
          `[${index + 1}] ${result.node.getContent(MetadataMode.NONE)}`
      )
      .join('\n\n');

    // Get conversation history (memory will handle token limits automatically)
    const chatHistory = await conversationMemory.getLLM();

    // Build conversation history string (exclude the current question we just added)
    const historyText = chatHistory
      .slice(0, -1) // Remove the current question
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Create a comprehensive prompt with both context and conversation history
    const prompt = buildPrompt(historyText, context, question);

    // Get streaming response from Gemini
    const originalStream = await callGeminiLLMStream(prompt);

    // Create a new stream that collects the response for memory
    let accumulatedResponse = '';
    const streamWithMemory = new ReadableStream({
      start(controller) {
        const reader = originalStream.getReader();
        const decoder = new TextDecoder();

        function processStream() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                // Add complete response to memory
                conversationMemory.add({
                  role: 'assistant',
                  content: accumulatedResponse,
                });
                controller.close();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });
              accumulatedResponse += chunk;
              controller.enqueue(value); // Pass through the original chunk

              processStream();
            })
            .catch((error) => {
              console.error('Stream processing error:', error);
              controller.error(error);
            });
        }

        processStream();
      },
    });

    // Return streaming response with sources including page numbers
    return {
      stream: streamWithMemory,
      sources: retrievalResult.map((result: NodeWithScore) => {
        const node = result.node;
        const metadata = node.metadata;

        // Extract page number from metadata if available
        const page = metadata?.page ? Number(metadata.page) : undefined;

        return {
          content: node.getContent(MetadataMode.NONE).substring(0, 200) + '...',
          score: result.score || 0,
          page,
        };
      }),
    };
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw error;
  }
}
