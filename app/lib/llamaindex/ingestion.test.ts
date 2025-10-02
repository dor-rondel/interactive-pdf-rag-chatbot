import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock llamaindex
vi.mock('llamaindex', () => ({
  VectorStoreIndex: {
    fromDocuments: vi.fn(),
  },
  Document: vi.fn(),
}));

// Get the global mock that was set up in vitest.setup.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPdfParseFunction = (globalThis as any).__mockPdfParse;

import {
  generateEmbeddings,
  resetGlobalIndex,
  getGlobalIndex,
  setGlobalIndex,
} from './ingestion';
import { VectorStoreIndex, Document } from 'llamaindex';

describe('ingestion', () => {
  beforeEach(() => {
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
    });

    // Reset module state before each test
    resetGlobalIndex();
  });

  describe('globalIndex management', () => {
    it('should reset global index to null', () => {
      // Arrange
      const mockIndex = {} as VectorStoreIndex;
      setGlobalIndex(mockIndex);

      // Act
      resetGlobalIndex();

      // Assert
      expect(getGlobalIndex()).toBe(null);
    });

    it('should get and set global index', () => {
      // Arrange
      const mockIndex = {} as VectorStoreIndex;

      // Act
      setGlobalIndex(mockIndex);

      // Assert
      expect(getGlobalIndex()).toBe(mockIndex);
    });
  });

  describe('generateEmbeddings', () => {
    it('should process PDF and create embeddings successfully', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');
      const mockVectorStore = {
        persist: vi.fn().mockResolvedValue(undefined),
      };
      const mockIndex = {
        storageContext: {
          vectorStores: { test: mockVectorStore },
        },
      };

      mockPdfParseFunction.mockResolvedValue({
        text: 'Extracted PDF text content',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });
      vi.mocked(Document).mockReturnValue({} as never);
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = await generateEmbeddings(testBuffer);

      // Assert
      expect(mockPdfParseFunction).toHaveBeenCalledExactlyOnceWith(testBuffer);
      expect(Document).toHaveBeenCalledExactlyOnceWith({
        text: 'Extracted PDF text content',
        id_: 'pdf-document',
      });
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledExactlyOnceWith([
        {},
      ]);
      expect(fs.mkdirSync).toHaveBeenCalledExactlyOnceWith('./data', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalledExactlyOnceWith(
        './data/document.txt',
        'Extracted PDF text content',
        'utf8'
      );
      expect(mockVectorStore.persist).toHaveBeenCalledExactlyOnceWith(
        './data/vector_store.json'
      );
      expect(result).toBe(mockIndex);
      expect(getGlobalIndex()).toBe(mockIndex);
    });

    it('should throw error for empty buffer', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0);

      // Act & Assert
      await expect(generateEmbeddings(emptyBuffer)).rejects.toThrow(
        'Invalid file buffer provided'
      );
    });

    it('should throw error for invalid buffer', async () => {
      // Act & Assert
      await expect(generateEmbeddings(null as never)).rejects.toThrow(
        'Invalid file buffer provided'
      );
    });

    it('should throw error when PDF has no text content', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');

      mockPdfParseFunction.mockResolvedValue({
        text: '',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // Act & Assert
      await expect(generateEmbeddings(testBuffer)).rejects.toThrow(
        'No text content found in PDF. The PDF might be image-based, corrupted, or protected.'
      );
    });

    it('should handle PDF parsing errors', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');

      mockPdfParseFunction.mockRejectedValue(new Error('PDF parsing failed'));

      // Act & Assert
      await expect(generateEmbeddings(testBuffer)).rejects.toThrow(
        'Failed to parse PDF: PDF parsing failed'
      );
    });

    it('should continue without persistence when persist fails', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');
      const mockVectorStore = {
        persist: vi.fn().mockRejectedValue(new Error('Persist failed')),
      };
      const mockIndex = {
        storageContext: {
          vectorStores: { test: mockVectorStore },
        },
      };

      mockPdfParseFunction.mockResolvedValue({
        text: 'Extracted PDF text content',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });
      vi.mocked(Document).mockReturnValue({} as never);
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = await generateEmbeddings(testBuffer);

      // Assert
      expect(result).toBe(mockIndex);
      expect(getGlobalIndex()).toBe(mockIndex);
      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to persist index:',
        expect.any(Error)
      );
    });

    it('should handle when data directory already exists', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');
      const mockVectorStore = {
        persist: vi.fn().mockResolvedValue(undefined),
      };
      const mockIndex = {
        storageContext: {
          vectorStores: { test: mockVectorStore },
        },
      };

      mockPdfParseFunction.mockResolvedValue({
        text: 'Extracted PDF text content',
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });
      vi.mocked(Document).mockReturnValue({} as never);
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      const result = await generateEmbeddings(testBuffer);

      // Assert
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(result).toBe(mockIndex);
    });
  });
});
