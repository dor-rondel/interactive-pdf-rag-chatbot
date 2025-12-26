import 'server-only';

import { GEMINI_EMBEDDING_MODEL } from '@/app/lib/constants/gemini';
import { startObservation } from '@langfuse/tracing';
import { BaseEmbedding } from 'llamaindex';
import { BatchEmbeddingResponse, EmbeddingResponse } from './types';

/**
 * Custom Gemini embedding implementation for LlamaIndex
 */
export class GeminiEmbedding extends BaseEmbedding {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private langfuseEnabled: boolean;

  constructor(apiKey: string, model: string = GEMINI_EMBEDDING_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.langfuseEnabled = Boolean(
      process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
    );
  }

  /**
   * Generate embedding for a single text string
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) {
      throw new Error('Text cannot be empty');
    }

    const startTime = Date.now();
    const observation = this.langfuseEnabled
      ? startObservation(
          'gemini.embedContent',
          {
            model: this.model,
            input: {
              textLength: text.length,
            },
            metadata: {
              endpoint: 'embedContent',
            },
          },
          { asType: 'embedding' }
        )
      : null;

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
        observation?.update({
          level: 'ERROR',
          statusMessage: `HTTP ${response.status}`,
          output: {
            error: errorText.slice(0, 2000),
          },
          metadata: {
            durationMs: Date.now() - startTime,
            status: response.status,
          },
        });
        observation?.end();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: EmbeddingResponse = await response.json();
      const values = data.embedding.values || [];
      observation?.update({
        output: {
          dimensions: values.length,
        },
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });
      observation?.end();
      return values;
    } catch (error) {
      console.error('Error getting embedding:', error);
      observation?.update({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });
      observation?.end();
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

    const startTime = Date.now();
    const observation = this.langfuseEnabled
      ? startObservation(
          'gemini.batchEmbedContents',
          {
            model: this.model,
            input: {
              batchSize: texts.length,
              totalChars: texts.reduce((sum, t) => sum + t.length, 0),
            },
            metadata: {
              endpoint: 'batchEmbedContents',
            },
          },
          { asType: 'embedding' }
        )
      : null;

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
        observation?.update({
          level: 'ERROR',
          statusMessage: `HTTP ${response.status}`,
          output: {
            error: errorText.slice(0, 2000),
          },
          metadata: {
            durationMs: Date.now() - startTime,
            status: response.status,
          },
        });
        observation?.end();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data: BatchEmbeddingResponse = await response.json();
      const embeddings = data.embeddings.map(
        (embedding) => embedding.values || []
      );
      observation?.update({
        output: {
          count: embeddings.length,
          dimensions: embeddings[0]?.length ?? 0,
        },
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });
      observation?.end();
      return embeddings;
    } catch (error) {
      console.error('Error getting batch embeddings:', error);
      observation?.update({
        level: 'ERROR',
        statusMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });
      observation?.end();
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
