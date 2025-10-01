import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock constants
vi.mock('@/app/lib/constants/gemini', () => ({
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
}));

// Mock llamaindex
vi.mock('llamaindex', () => ({
  Document: vi.fn(),
  VectorStoreIndex: {
    fromDocuments: vi.fn(),
    fromVectorStore: vi.fn(),
  },
  Settings: {
    embedModel: {},
    chunkSize: 512,
    chunkOverlap: 20,
  },
  BaseEmbedding: class BaseEmbedding {},
}));

vi.mock('llamaindex/vector-store', () => ({
  SimpleVectorStore: {
    fromPersistPath: vi.fn(),
  },
}));

// Mock the entire generateEmbeddings function for integration tests
// We'll test the parts we can control
import { getRetriever } from './index';
import { VectorStoreIndex } from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';

describe('llamaindex/index', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
  });

  describe('getRetriever', () => {
    it('should load vector store and create retriever successfully', async () => {
      // Arrange
      const mockVectorStore = {};
      const mockRetriever = {};
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };

      vi.mocked(SimpleVectorStore.fromPersistPath).mockResolvedValue(
        mockVectorStore as never,
      );
      vi.mocked(VectorStoreIndex.fromVectorStore).mockResolvedValue(
        mockIndex as never,
      );

      // Act
      const result = await getRetriever();

      // Assert
      expect(SimpleVectorStore.fromPersistPath).toHaveBeenCalledExactlyOnceWith(
        './data/vector_store.json',
      );
      expect(VectorStoreIndex.fromVectorStore).toHaveBeenCalledExactlyOnceWith(
        mockVectorStore,
      );
      expect(mockIndex.asRetriever).toHaveBeenCalledExactlyOnceWith();
      expect(result).toBe(mockRetriever);
    });

    it('should throw error when vector store is not found', async () => {
      // Arrange
      vi.mocked(SimpleVectorStore.fromPersistPath).mockRejectedValue(
        new Error('File not found'),
      );

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.',
      );
    });

    it('should handle corrupted vector store file', async () => {
      // Arrange
      vi.mocked(SimpleVectorStore.fromPersistPath).mockRejectedValue(
        new Error('JSON parse error'),
      );

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.',
      );
    });
  });

  describe('Environment configuration', () => {
    it('should have GEMINI_API_KEY configured', () => {
      expect(process.env.GEMINI_API_KEY).toBe('test-api-key');
    });

    it('should allow environment variable changes', () => {
      vi.stubEnv('GEMINI_API_KEY', 'different-test-key');
      expect(process.env.GEMINI_API_KEY).toBe('different-test-key');
    });
  });
});
