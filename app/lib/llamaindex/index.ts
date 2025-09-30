import 'server-only';

import { GEMINI_EMBEDDING_MODEL } from '@/app/lib/constants/gemini';
import {
  Document,
  Settings,
  VectorStoreIndex,
  BaseEmbedding,
} from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';
import { BatchEmbeddingResponse, EmbeddingResponse } from './types';

class GeminiEmbedding extends BaseEmbedding {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = GEMINI_EMBEDDING_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async getTextEmbedding(text: string): Promise<number[]> {
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

  // Override the property as expected by LlamaIndex's Batch BaseEmbedding interface
  getTextEmbeddings = async (texts: string[]): Promise<number[][]> => {
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

// Global store variable for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let store: SimpleVectorStore | null = null;

export async function generateEmbeddings(file: Buffer) {
  // Convert Buffer to text for PDF processing
  const text = file.toString('utf-8');
  const doc = new Document({ text, id_: 'pdf-document' });

  // Create index with the document - this automatically creates embeddings
  const index = await VectorStoreIndex.fromDocuments([doc]);

  // Get the vector store from the index and persist it
  const vectorStore = Object.values(index.vectorStores)[0] as SimpleVectorStore;

  // Persist the vector store
  try {
    await vectorStore.persist('./data/vector_store.json');
    console.log('Vector store persisted to ./data/vector_store.json');
    // Update our store reference for future use
    store = vectorStore;
  } catch (error) {
    console.error('Failed to persist vector store:', error);
  }

  return index;
}

export async function getRetriever() {
  // Load the persistent store
  const persistPath = './data/vector_store.json';
  let retrievalStore: SimpleVectorStore;

  try {
    retrievalStore = await SimpleVectorStore.fromPersistPath(persistPath);
    console.log('Loaded persistent vector store for retrieval');
  } catch {
    throw new Error('Vector store not found. Please upload a PDF first.');
  }

  const index = await VectorStoreIndex.fromVectorStore(retrievalStore);
  return index.asRetriever();
}
