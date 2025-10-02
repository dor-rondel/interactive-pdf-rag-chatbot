import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiEmbedding, createGeminiEmbedding } from './embedding';

// Mock constants
vi.mock('@/app/lib/constants/gemini', () => ({
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
}));

describe('embedding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
    });
  });

  describe('GeminiEmbedding', () => {
    describe('getTextEmbedding', () => {
      it('should generate embedding for single text successfully', async () => {
        // Arrange
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            embedding: {
              values: [0.1, 0.2, 0.3],
            },
          }),
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as never);

        const embedding = new GeminiEmbedding('test-api-key');

        // Act
        const result = await embedding.getTextEmbedding('test text');

        // Assert
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
          'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=test-api-key',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: {
                parts: [{ text: 'test text' }],
              },
            }),
          }
        );
        expect(result).toStrictEqual([0.1, 0.2, 0.3]);
      });

      it('should throw error for empty text', async () => {
        // Arrange
        const embedding = new GeminiEmbedding('test-api-key');

        // Act & Assert
        await expect(embedding.getTextEmbedding('')).rejects.toThrow(
          'Text cannot be empty'
        );
        await expect(embedding.getTextEmbedding('   ')).rejects.toThrow(
          'Text cannot be empty'
        );
      });

      it('should handle API errors', async () => {
        // Arrange
        const mockResponse = {
          ok: false,
          status: 400,
          text: vi.fn().mockResolvedValue('Bad Request'),
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as never);

        const embedding = new GeminiEmbedding('test-api-key');

        // Act & Assert
        await expect(embedding.getTextEmbedding('test text')).rejects.toThrow(
          'HTTP 400: Bad Request'
        );
      });

      it('should handle network errors', async () => {
        // Arrange
        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
        const embedding = new GeminiEmbedding('test-api-key');

        // Act & Assert
        await expect(embedding.getTextEmbedding('test text')).rejects.toThrow(
          'Network error'
        );
      });
    });

    describe('getTextEmbeddings', () => {
      it('should generate batch embeddings successfully', async () => {
        // Arrange
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            embeddings: [
              { values: [0.1, 0.2, 0.3] },
              { values: [0.4, 0.5, 0.6] },
            ],
          }),
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as never);

        const embedding = new GeminiEmbedding('test-api-key');

        // Act
        const result = await embedding.getTextEmbeddings([
          'text one',
          'text two',
        ]);

        // Assert
        expect(fetch).toHaveBeenCalledExactlyOnceWith(
          'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=test-api-key',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  model: 'models/text-embedding-004',
                  content: { parts: [{ text: 'text one' }] },
                },
                {
                  model: 'models/text-embedding-004',
                  content: { parts: [{ text: 'text two' }] },
                },
              ],
            }),
          }
        );
        expect(result).toStrictEqual([
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ]);
      });

      it('should return empty array for empty input', async () => {
        // Arrange
        const embedding = new GeminiEmbedding('test-api-key');

        // Act
        const result = await embedding.getTextEmbeddings([]);

        // Assert
        expect(result).toStrictEqual([]);
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should handle batch API errors', async () => {
        // Arrange
        const mockResponse = {
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue('Internal Server Error'),
        };
        vi.mocked(fetch).mockResolvedValue(mockResponse as never);

        const embedding = new GeminiEmbedding('test-api-key');

        // Act & Assert
        await expect(
          embedding.getTextEmbeddings(['text one', 'text two'])
        ).rejects.toThrow('HTTP 500: Internal Server Error');
      });
    });
  });

  describe('createGeminiEmbedding', () => {
    it('should create GeminiEmbedding instance with default model', () => {
      // Act
      const embedding = createGeminiEmbedding('test-api-key');

      // Assert
      expect(embedding).toBeInstanceOf(GeminiEmbedding);
    });

    it('should create GeminiEmbedding instance with custom model', () => {
      // Act
      const embedding = createGeminiEmbedding(
        'test-api-key',
        'custom-embedding-model'
      );

      // Assert
      expect(embedding).toBeInstanceOf(GeminiEmbedding);
    });
  });
});
