import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { getRetriever } from './retrieval';
import { VectorStoreIndex, Document } from 'llamaindex';
import { getGlobalIndex, setGlobalIndex } from './ingestion';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock llamaindex
vi.mock('llamaindex', () => ({
  VectorStoreIndex: {
    fromDocuments: vi.fn(),
  },
  Document: vi.fn(),
}));

// Mock ingestion module
vi.mock('./ingestion', () => ({
  getGlobalIndex: vi.fn(),
  setGlobalIndex: vi.fn(),
}));

describe('retrieval', () => {
  beforeEach(() => {
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
    });
  });

  describe('getRetriever', () => {
    it('should return retriever from global index when available', async () => {
      // Arrange
      const mockRetriever = { test: 'retriever' };
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(getGlobalIndex).mockReturnValue(mockIndex as never);

      // Act
      const result = await getRetriever();

      // Assert
      expect(getGlobalIndex).toHaveBeenCalledExactlyOnceWith();
      expect(mockIndex.asRetriever).toHaveBeenCalledExactlyOnceWith();
      expect(result).toBe(mockRetriever);
    });

    it('should recreate index from persisted data when global index not available', async () => {
      // Arrange
      const mockRetriever = { test: 'retriever' };
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };

      vi.mocked(getGlobalIndex).mockReturnValue(null);
      // Mock vector store exists but pages.json doesn't exist (to test legacy fallback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        if (path === './data/vector_store.json') return true;
        if (path === './data/pages.json') return false;
        if (path === './data/document.txt') return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        'Persisted document text content'
      );
      vi.mocked(Document).mockReturnValue({} as never);
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );

      // Act
      const result = await getRetriever();

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith('./data/vector_store.json');
      expect(fs.existsSync).toHaveBeenCalledWith('./data/pages.json');
      expect(fs.existsSync).toHaveBeenCalledWith('./data/document.txt');
      expect(fs.readFileSync).toHaveBeenCalledExactlyOnceWith(
        './data/document.txt',
        'utf8'
      );
      expect(Document).toHaveBeenCalledExactlyOnceWith({
        text: 'Persisted document text content',
        id_: 'pdf-document',
      });
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledExactlyOnceWith([
        {},
      ]);
      expect(setGlobalIndex).toHaveBeenCalledExactlyOnceWith(mockIndex);
      expect(mockIndex.asRetriever).toHaveBeenCalledExactlyOnceWith();
      expect(result).toBe(mockRetriever);
      // Note: Console logging was removed from production code
    });

    it('should throw error when document.txt does not exist', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === './data/document.txt') return false;
        return true;
      });

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );
    });

    it('should throw error when vector_store.json does not exist', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === './data/vector_store.json') return false;
        return true;
      });

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );
    });

    it('should throw error when persisted text is empty', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      // Mock for legacy fallback path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        if (path === './data/vector_store.json') return true;
        if (path === './data/pages.json') return false;
        if (path === './data/document.txt') return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue('');

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Persisted document text is empty or invalid.'
      );
    });

    it('should throw error when persisted text is whitespace only', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      // Mock for legacy fallback path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        if (path === './data/vector_store.json') return true;
        if (path === './data/pages.json') return false;
        if (path === './data/document.txt') return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue('   \n\t   ');

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Persisted document text is empty or invalid.'
      );
    });

    it('should handle unexpected errors during index recreation', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Valid text content');
      vi.mocked(Document).mockReturnValue({} as never);
      vi.mocked(VectorStoreIndex.fromDocuments).mockRejectedValue(
        new Error('Unexpected index creation error')
      );

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error loading retriever:',
        expect.any(Error)
      );
    });

    it('should preserve meaningful errors during recreation', async () => {
      // Arrange
      vi.mocked(getGlobalIndex).mockReturnValue(null);
      // Mock for legacy fallback path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        if (path === './data/vector_store.json') return true;
        if (path === './data/pages.json') return false;
        if (path === './data/document.txt') return true;
        return false;
      });
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Persisted document text is empty or invalid.');
      });

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Persisted document text is empty or invalid.'
      );
    });
  });
});
