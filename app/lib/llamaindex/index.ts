import 'server-only';

import {
  GEMINI_EMBEDDING_MODEL,
  GEMINI_MODEL,
} from '@/app/lib/constants/gemini';
import {
  Document,
  Settings,
  VectorStoreIndex,
  BaseEmbedding,
  MetadataMode,
  NodeWithScore,
} from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';
import {
  BatchEmbeddingResponse,
  EmbeddingResponse,
  GeminiChatResponse,
} from './types';
import * as fs from 'fs';

/**
 * Custom Gemini embedding implementation for LlamaIndex
 */
class GeminiEmbedding extends BaseEmbedding {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = GEMINI_EMBEDDING_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Generate embedding for a single text string
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    try {
      const url = `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: {
            parts: [{ text }],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: EmbeddingResponse = await response.json();
      return data.embedding.values || [];
    } catch (error) {
      console.error('Error getting embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  // Override the property as expected by LlamaIndex's Batch BaseEmbedding interface
  getTextEmbeddings = async (texts: string[]): Promise<number[][]> => {
    if (!texts.length) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
      const requests = texts.map((text) => ({
        model: `models/${this.model}`,
        content: {
          parts: [{ text }],
        },
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: BatchEmbeddingResponse = await response.json();
      return data.embeddings.map((embedding) => embedding.values || []);
    } catch (error) {
      console.error('Error getting batch embeddings:', error);
      throw error;
    }
  };
}

// Configure Settings with Gemini embedding
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

Settings.embedModel = new GeminiEmbedding(apiKey, GEMINI_EMBEDDING_MODEL);
Settings.chunkSize = 512;
Settings.chunkOverlap = 20;

// Global index variable for retrieval
let globalIndex: VectorStoreIndex | null = null;

/**
 * Reset the global index state (for testing purposes)
 */
export function resetGlobalIndex() {
  globalIndex = null;
}

/**
 * Process a PDF file and generate embeddings for RAG
 * @param file - PDF file buffer to process
 * @returns Promise<VectorStoreIndex> - The created vector store index
 * @throws Error if PDF parsing fails or text extraction returns empty content
 */
export async function generateEmbeddings(file: Buffer) {
  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw new Error('Invalid file buffer provided');
  }

  try {
    // Use require for pdf-parse in Node.js runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    // Ensure we're passing a proper Buffer
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Parse the PDF buffer
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      throw new Error(
        'No text content found in PDF. The PDF might be image-based, corrupted, or protected.'
      );
    }

    const doc = new Document({ text, id_: 'pdf-document' });

    // Create index with the document - this automatically creates embeddings
    const index = await VectorStoreIndex.fromDocuments([doc]);

    // Store the index globally for retrieval and persist basic data
    globalIndex = index;

    // Simple persistence - just save the text for later recreation
    try {
      const dataDir = './data';

      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Save the original text for later reconstruction
      fs.writeFileSync(`${dataDir}/document.txt`, text, 'utf8');

      // Get and persist the vector store
      const vectorStore = Object.values(
        index.storageContext.vectorStores
      )[0] as SimpleVectorStore;
      await vectorStore.persist(`${dataDir}/vector_store.json`);

      console.log('✅ PDF processed and index persisted successfully');
    } catch (persistError) {
      console.error('❌ Failed to persist index:', persistError);
      // Continue without persistence - index is still in memory
    }

    return index;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error);
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a retriever instance for the loaded vector store
 * @returns Promise<BaseRetriever> - Retriever instance for querying
 * @throws Error if no vector store is available
 */
export async function getRetriever() {
  // If globalIndex is already loaded, use it
  if (globalIndex) {
    return globalIndex.asRetriever();
  }

  // Try to reload from persisted data
  try {
    const dataDir = './data';
    const textPath = `${dataDir}/document.txt`;
    const vectorStorePath = `${dataDir}/vector_store.json`;

    // Check if required files exist
    if (!fs.existsSync(textPath) || !fs.existsSync(vectorStorePath)) {
      throw new Error('Vector store not found. Please upload a PDF first.');
    }

    // Read the original text
    const text = fs.readFileSync(textPath, 'utf8');

    if (!text.trim()) {
      throw new Error('Persisted document text is empty or invalid.');
    }

    // Recreate the document and index
    const doc = new Document({ text, id_: 'pdf-document' });
    const index = await VectorStoreIndex.fromDocuments([doc]);

    // Cache the loaded index globally
    globalIndex = index;

    console.log('✅ Index recreated from persisted data');
    return index.asRetriever();
  } catch (error) {
    console.error('Error loading retriever:', error);
    // Re-throw the original error if it's already a meaningful error
    if (
      error instanceof Error &&
      (error.message.includes('Vector store not found') ||
        error.message.includes('Persisted document text is empty'))
    ) {
      throw error;
    }
    // For unexpected errors, throw a generic message
    throw new Error('Vector store not found. Please upload a PDF first.');
  }
}

/**
 * Call Gemini LLM with a prompt
 * @param prompt - The prompt to send to Gemini
 * @returns Promise<string> - The generated response
 * @throws Error if API call fails
 */
async function callGeminiLLM(prompt: string): Promise<string> {
  if (!prompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data: GeminiChatResponse = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  } catch (error) {
    console.error('Error calling Gemini LLM:', error);
    throw error;
  }
}

/**
 * Perform RAG query against the loaded vector store
 * @param question - The user's question
 * @returns Promise<{message: string, sources: Array<{content: string, score: number}>}> - Response with sources
 * @throws Error if retrieval or generation fails
 */
export async function queryRAG(question: string) {
  if (!question.trim()) {
    throw new Error('Question cannot be empty');
  }

  try {
    // Get retriever for context
    const retriever = await getRetriever();

    // Retrieve relevant context
    const retrievalResult = await retriever.retrieve(question);

    if (!retrievalResult.length) {
      return {
        message:
          "I couldn't find any relevant information in the uploaded document to answer your question. Please try rephrasing your question or upload a more relevant document.",
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

    // Create a comprehensive prompt for the LLM
    const prompt = `You are a helpful assistant that answers questions based on the provided context from uploaded documents.

Context:
${context}

Question: ${question}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to fully answer the question, please say so and explain what information is available.`;

    // Get response from Gemini
    const response = await callGeminiLLM(prompt);

    if (!response.trim()) {
      throw new Error('Received empty response from LLM');
    }

    // Return response with sources
    return {
      message: response,
      sources: retrievalResult.map((result: NodeWithScore) => ({
        content:
          result.node.getContent(MetadataMode.NONE).substring(0, 200) + '...',
        score: result.score || 0,
      })),
    };
  } catch (error) {
    console.error('Error in RAG query:', error);
    throw error;
  }
}
