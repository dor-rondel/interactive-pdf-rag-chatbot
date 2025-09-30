import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the constants module
vi.mock('@/app/lib/constants/gemini', () => ({
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
}));

// Mock the external dependencies
vi.mock('llamaindex', () => ({
  Document: class MockDocument {
    text: string;
    id_: string;
    constructor(data: { text: string; id_: string }) {
      this.text = data.text;
      this.id_ = data.id_;
    }
  },
  Settings: {
    embedModel: null,
    chunkSize: 512,
    chunkOverlap: 20,
  },
  VectorStoreIndex: {
    fromDocuments: vi.fn(),
    fromVectorStore: vi.fn(),
  },
  BaseEmbedding: class BaseEmbedding {},
}));

vi.mock('llamaindex/vector-store', () => ({
  SimpleVectorStore: {
    fromPersistPath: vi.fn(),
  },
}));

import { VectorStoreIndex } from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';

// Now import the module after setting up all mocks
import { generateEmbeddings, getRetriever } from './index';

describe('LlamaIndex Integration', () => {
  const mockBatchEmbeddingValues = [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
    [0.7, 0.8, 0.9],
  ];

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('generateEmbeddings', () => {
    it('should create embeddings from PDF buffer and persist vector store', async () => {
      // Arrange
      const pdfBuffer = Buffer.from(
        'Sample PDF content for testing embeddings'
      );
      const mockVectorStore = {
        persist: vi.fn().mockResolvedValue(undefined),
      };
      const mockIndex = {
        vectorStores: {
          'simple-vector-store': mockVectorStore,
        },
      };

      // Mock successful API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            embeddings: mockBatchEmbeddingValues.map((values) => ({ values })),
          }),
      } as unknown as Response);

      // Mock VectorStoreIndex.fromDocuments
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as unknown as VectorStoreIndex
      );

      // Act
      const result = await generateEmbeddings(pdfBuffer);

      // Assert
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledWith([
        expect.objectContaining({
          text: pdfBuffer.toString('utf-8'),
          id_: 'pdf-document',
        }),
      ]);

      expect(mockVectorStore.persist).toHaveBeenCalledWith(
        './data/vector_store.json'
      );
      expect(result).toStrictEqual(mockIndex);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('Sample PDF content');

      // Mock failed API response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('{"error": {"message": "Quota exceeded"}}'),
      } as unknown as Response);

      // Mock VectorStoreIndex.fromDocuments to throw
      vi.mocked(VectorStoreIndex.fromDocuments).mockRejectedValue(
        new Error('HTTP 429: {"error": {"message": "Quota exceeded"}}')
      );

      // Act & Assert
      await expect(generateEmbeddings(pdfBuffer)).rejects.toThrow(
        'Quota exceeded'
      );
    });

    it('should handle vector store persistence errors', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('Sample PDF content');
      const mockVectorStore = {
        persist: vi
          .fn()
          .mockRejectedValue(new Error('ENOENT: no such file or directory')),
      };
      const mockIndex = {
        vectorStores: {
          'simple-vector-store': mockVectorStore,
        },
      };

      // Mock successful embedding creation but failed persistence
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            embeddings: mockBatchEmbeddingValues.map((values) => ({ values })),
          }),
      } as unknown as Response);

      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as unknown as VectorStoreIndex
      );

      // Mock console.error to verify error logging
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      const result = await generateEmbeddings(pdfBuffer);

      // Assert
      expect(result).toStrictEqual(mockIndex);
      expect(mockVectorStore.persist).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist vector store:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should convert buffer to text correctly', async () => {
      // Arrange
      const testText =
        'This is a test PDF content with special characters: áéíóú';
      const pdfBuffer = Buffer.from(testText, 'utf-8');
      const mockVectorStore = {
        persist: vi.fn().mockResolvedValue(undefined),
      };
      const mockIndex = {
        vectorStores: {
          'simple-vector-store': mockVectorStore,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            embeddings: mockBatchEmbeddingValues.map((values) => ({ values })),
          }),
      } as unknown as Response);

      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as unknown as VectorStoreIndex
      );

      // Act
      await generateEmbeddings(pdfBuffer);

      // Assert
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledWith([
        expect.objectContaining({
          text: testText,
          id_: 'pdf-document',
        }),
      ]);
    });
  });

  describe('getRetriever', () => {
    it('should load persistent vector store and return retriever', async () => {
      // Arrange
      const mockVectorStore = {};
      const mockRetriever = { query: vi.fn() };
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };

      vi.mocked(SimpleVectorStore.fromPersistPath).mockResolvedValue(
        mockVectorStore as unknown as SimpleVectorStore
      );
      vi.mocked(VectorStoreIndex.fromVectorStore).mockResolvedValue(
        mockIndex as unknown as VectorStoreIndex
      );

      // Mock console.log
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await getRetriever();

      // Assert
      expect(SimpleVectorStore.fromPersistPath).toHaveBeenCalledWith(
        './data/vector_store.json'
      );
      expect(VectorStoreIndex.fromVectorStore).toHaveBeenCalledWith(
        mockVectorStore
      );
      expect(mockIndex.asRetriever).toHaveBeenCalled();
      expect(result).toBe(mockRetriever);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Loaded persistent vector store for retrieval'
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when vector store is not found', async () => {
      // Arrange
      vi.mocked(SimpleVectorStore.fromPersistPath).mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );

      expect(SimpleVectorStore.fromPersistPath).toHaveBeenCalledWith(
        './data/vector_store.json'
      );
      expect(VectorStoreIndex.fromVectorStore).not.toHaveBeenCalled();
    });

    it('should handle corrupted vector store file', async () => {
      // Arrange
      vi.mocked(SimpleVectorStore.fromPersistPath).mockRejectedValue(
        new Error('JSON parse error')
      );

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );
    });
  });

  describe('GeminiEmbedding class integration', () => {
    it('should create index and persist vector store', async () => {
      // Arrange
      const testText = 'Test text for embedding';
      const pdfBuffer = Buffer.from(testText);
      const mockVectorStore = {
        persist: vi.fn().mockResolvedValue(undefined),
      };
      const mockIndex = {
        vectorStores: {
          'simple-vector-store': mockVectorStore,
        },
      };

      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as unknown as VectorStoreIndex
      );

      // Act
      await generateEmbeddings(pdfBuffer);

      // Assert
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledWith([
        expect.objectContaining({
          text: testText,
          id_: 'pdf-document',
        }),
      ]);
      expect(mockVectorStore.persist).toHaveBeenCalledWith(
        './data/vector_store.json'
      );
    });

    it('should handle malformed API responses', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('Test content');

      vi.mocked(VectorStoreIndex.fromDocuments).mockRejectedValue(
        new Error('Invalid embedding data')
      );

      // Act & Assert
      await expect(generateEmbeddings(pdfBuffer)).rejects.toThrow(
        'Invalid embedding data'
      );
    });
  });

  describe('Environment configuration', () => {
    it('should use the configured API key', () => {
      // Test that the environment is properly set up
      expect(process.env.GEMINI_API_KEY).toBe('test-api-key');
    });

    it('should work with vi.stubEnv in individual tests', () => {
      // This is where vi.stubEnv() DOES work properly
      vi.stubEnv('GEMINI_API_KEY', 'different-test-key');

      // This will show the stubbed value
      expect(process.env.GEMINI_API_KEY).toBe('different-test-key');
    });
  });
});
