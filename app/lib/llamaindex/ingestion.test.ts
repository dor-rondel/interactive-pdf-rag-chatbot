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
    it('should process PDF with page awareness and create embeddings successfully', async () => {
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

      const testText = 'Page 1 content\f\nPage 2 content';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 2,
        numrender: 2,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDocuments: any[] = [];
      vi.mocked(Document).mockImplementation(
        (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: any
        ) => mockDocuments.push(config) && config
      );
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const result = await generateEmbeddings(testBuffer);

      // Assert
      expect(mockPdfParseFunction).toHaveBeenCalledExactlyOnceWith(testBuffer);
      expect(Document).toHaveBeenCalledTimes(2);
      expect(Document).toHaveBeenNthCalledWith(1, {
        text: 'Page 1 content',
        id_: 'page-1',
        metadata: {
          page: 1,
          source: 'pdf-document',
        },
      });
      expect(Document).toHaveBeenNthCalledWith(2, {
        text: 'Page 2 content',
        id_: 'page-2',
        metadata: {
          page: 2,
          source: 'pdf-document',
        },
      });
      expect(VectorStoreIndex.fromDocuments).toHaveBeenCalledExactlyOnceWith(
        mockDocuments
      );
      expect(fs.mkdirSync).toHaveBeenCalledExactlyOnceWith('./data', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        './data/pages.json',
        expect.stringContaining('"page": 1'),
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        './data/document.txt',
        testText,
        'utf8'
      );
      expect(mockVectorStore.persist).toHaveBeenCalledExactlyOnceWith(
        './data/vector_store.json'
      );
      expect(result).toBe(mockIndex);
      expect(getGlobalIndex()).toBe(mockIndex);
    });

    it('should split pages using generic page markers correctly', async () => {
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

      const testText =
        'Introduction content\f\nMiddle content\f\nFinal content';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDocuments: any[] = [];
      vi.mocked(Document).mockImplementation(
        (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: any
        ) => mockDocuments.push(config) && config
      );
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      await generateEmbeddings(testBuffer);

      // Assert
      expect(Document).toHaveBeenCalledTimes(3);
      expect(mockDocuments[0]).toStrictEqual({
        text: 'Introduction content',
        id_: 'page-1',
        metadata: {
          page: 1,
          source: 'pdf-document',
        },
      });
      expect(mockDocuments[1]).toStrictEqual({
        text: 'Middle content',
        id_: 'page-2',
        metadata: {
          page: 2,
          source: 'pdf-document',
        },
      });
      expect(mockDocuments[2]).toStrictEqual({
        text: 'Final content',
        id_: 'page-3',
        metadata: {
          page: 3,
          source: 'pdf-document',
        },
      });
    });

    it('should use equal-size fallback when no page markers found', async () => {
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

      const testText = 'This is a simple document without any page markers';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 2,
        numrender: 2,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDocuments: any[] = [];
      vi.mocked(Document).mockImplementation(
        (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: any
        ) => mockDocuments.push(config) && config
      );
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      await generateEmbeddings(testBuffer);

      // Assert
      expect(Document).toHaveBeenCalledTimes(2);
      expect(mockDocuments).toHaveLength(2);
      expect(mockDocuments[0].metadata.page).toBe(1);
      expect(mockDocuments[1].metadata.page).toBe(2);
    });

    it('should handle simple text without special debugging', async () => {
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

      const testText =
        'Page 1 content\f\nThis content mentions general professional requirements.';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 2,
        numrender: 2,
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
      await generateEmbeddings(testBuffer);

      // Assert - No special debug messages expected with generic approach
      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Found medical text')
      );
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
        'No text content found in PDF'
      );
    });

    it('should throw error when PDF has only whitespace content', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');

      mockPdfParseFunction.mockResolvedValue({
        text: '   \n\t   ', // Only whitespace
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // Act & Assert
      await expect(generateEmbeddings(testBuffer)).rejects.toThrow(
        'No text content found in PDF'
      );
    });

    it('should handle PDF parsing errors', async () => {
      // Arrange
      const testBuffer = Buffer.from('test pdf content');

      mockPdfParseFunction.mockRejectedValue(new Error('PDF parsing failed'));

      // Act & Assert
      await expect(generateEmbeddings(testBuffer)).rejects.toThrow(
        'Failed to process PDF: PDF parsing failed'
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
        text: 'Simple PDF text content',
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
        'Failed to persist PDF data:',
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
        text: 'Simple PDF text content',
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

    it('should handle form feed page breaks correctly', async () => {
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

      const testText = 'Page 1 content\f\nPage 2 content\f\nPage 3 content';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDocuments: any[] = [];
      vi.mocked(Document).mockImplementation(
        (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: any
        ) => mockDocuments.push(config) && config
      );
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      await generateEmbeddings(testBuffer);

      // Assert
      expect(Document).toHaveBeenCalledTimes(3);
      expect(mockDocuments[0]).toStrictEqual({
        text: 'Page 1 content',
        id_: 'page-1',
        metadata: {
          page: 1,
          source: 'pdf-document',
        },
      });
    });

    it('should adjust page count when detection produces different number of pages', async () => {
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

      // Text with only one page break but expecting 3 pages
      const testText =
        'Page 1 content\f\nLong page 2 content that should be split into multiple parts when needed';
      mockPdfParseFunction.mockResolvedValue({
        text: testText,
        numpages: 3,
        numrender: 3,
        info: {},
        metadata: {},
        version: '1.0',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDocuments: any[] = [];
      vi.mocked(Document).mockImplementation(
        (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: any
        ) => mockDocuments.push(config) && config
      );
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      await generateEmbeddings(testBuffer);

      // Assert
      expect(Document).toHaveBeenCalledTimes(3);
      expect(mockDocuments).toHaveLength(3);
    });
  });
});
