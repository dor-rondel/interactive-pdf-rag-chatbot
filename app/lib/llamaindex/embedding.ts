import 'server-only';

import { GEMINI_EMBEDDING_MODEL } from '@/app/lib/constants/gemini';
import { BaseEmbedding } from 'llamaindex';
import { BatchEmbeddingResponse, EmbeddingResponse } from './types';

/**
 * Custom Gemini embedding implementation for LlamaIndex
 */
export class GeminiEmbedding extends BaseEmbedding {
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

/**
 * Create and configure a Gemini embedding instance
 */
export function createGeminiEmbedding(
  apiKey: string,
  model: string = GEMINI_EMBEDDING_MODEL
): GeminiEmbedding {
  return new GeminiEmbedding(apiKey, model);
}
