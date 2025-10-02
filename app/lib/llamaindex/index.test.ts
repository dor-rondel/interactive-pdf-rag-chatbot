import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Mock constants
vi.mock('@/app/lib/constants/gemini', () => ({
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
  GEMINI_MODEL: 'gemini-2.5-flash-latest',
}));

// Mock llamaindex
vi.mock('llamaindex', () => ({
  VectorStoreIndex: {
    fromDocuments: vi.fn(),
  },
  Document: vi.fn(),
  GeminiEmbedding: vi.fn(),
  Gemini: vi.fn(),
  createMemory: vi.fn(),
  Memory: vi.fn(),
  BaseEmbedding: vi.fn(),
  Settings: {
    llm: undefined,
    embedModel: undefined,
  },
  MetadataMode: {
    ALL: 'all',
    EMBED: 'embed',
    LLM: 'llm',
    NONE: 'none',
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Get the global mock that was set up in vitest.setup.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPdfParseFunction = (globalThis as any).__mockPdfParse;

import {
  generateEmbeddings,
  getRetriever,
  queryRAG,
  resetGlobalIndex,
  resetGlobalMemory,
} from './index';
import { VectorStoreIndex, Document, createMemory } from 'llamaindex';

describe('llamaindex/index', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
    });

    // Reset module state before each test
    resetGlobalIndex();
    resetGlobalMemory();
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
    });

    it('should throw error for empty buffer', async () => {
      // Arrange
      const emptyBuffer = Buffer.alloc(0);

      // Act & Assert
      await expect(generateEmbeddings(emptyBuffer)).rejects.toThrow(
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
  });

  describe('getRetriever', () => {
    it('should recreate index from persisted data successfully', async () => {
      // Arrange
      const mockRetriever = {};
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
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
      expect(fs.existsSync).toHaveBeenNthCalledWith(1, './data/document.txt');
      expect(fs.existsSync).toHaveBeenNthCalledWith(
        2,
        './data/vector_store.json'
      );
      expect(fs.readFileSync).toHaveBeenCalledExactlyOnceWith(
        './data/document.txt',
        'utf8'
      );
      expect(Document).toHaveBeenCalledExactlyOnceWith({
        text: 'Persisted document text content',
        id_: 'pdf-document',
      });
      expect(mockIndex.asRetriever).toHaveBeenCalledExactlyOnceWith();
      expect(result).toBe(mockRetriever);
    });

    it('should throw error when required files do not exist', async () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Vector store not found. Please upload a PDF first.'
      );
    });

    it('should throw error when persisted text is empty', async () => {
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('');

      // Act & Assert
      await expect(getRetriever()).rejects.toThrow(
        'Persisted document text is empty or invalid.'
      );
    });
  });

  describe('queryRAG', () => {
    it('should perform streaming RAG query successfully', async () => {
      // Arrange
      const question = 'What is this document about?';
      const mockMemory = {
        add: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getLLM: vi
          .fn()
          .mockResolvedValue([{ role: 'user', content: question }]),
      };
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue([
          {
            node: {
              getContent: vi.fn().mockReturnValue('Document content chunk'),
            },
            score: 0.85,
          },
        ]),
      };

      // Mock SSE response
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"This"}]}}]}\n'
            )
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":" document"}]}}]}\n'
            )
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":" is about testing."}]}}]}\n'
            )
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const mockFetchResponse = {
        ok: true,
        body: mockStreamResponse,
      };

      // Mock the fs calls to simulate files existing
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Test document content');
      vi.mocked(Document).mockReturnValue({} as never);
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act
      const result = await queryRAG(question);

      // Assert
      expect(mockMemory.add).toHaveBeenCalledWith({
        role: 'user',
        content: question,
      });
      expect(mockRetriever.retrieve).toHaveBeenCalledExactlyOnceWith(question);
      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:streamGenerateContent?alt=sse&key=test-api-key',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result.sources).toStrictEqual([
        {
          content: 'Document content chunk...',
          score: 0.85,
        },
      ]);
      expect(result.stream).toBeInstanceOf(ReadableStream);

      // Test reading from the stream
      const reader = result.stream.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }

      expect(fullText).toBe('This document is about testing.');
    });

    it('should throw error for empty question', async () => {
      // Act & Assert
      await expect(queryRAG('')).rejects.toThrow('Question cannot be empty');
      await expect(queryRAG('   ')).rejects.toThrow('Question cannot be empty');
    });

    it('should handle case when no relevant documents are found', async () => {
      // Arrange
      const question = 'What is this document about?';
      const mockMemory = {
        add: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getLLM: vi
          .fn()
          .mockResolvedValue([{ role: 'user', content: question }]),
      };
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue([]),
      };

      // Mock the fs calls to simulate files existing
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Test document content');
      vi.mocked(Document).mockReturnValue({} as never);
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      // Act
      const result = await queryRAG(question);

      // Assert
      expect(mockRetriever.retrieve).toHaveBeenCalledExactlyOnceWith(question);
      expect(result.sources).toStrictEqual([]);
      expect(result.stream).toBeInstanceOf(ReadableStream);

      // Test reading from the error stream
      const reader = result.stream.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }

      expect(fullText).toBe(
        "I couldn't find any relevant information in the uploaded document to answer your question. Please try rephrasing your question or upload a more relevant document."
      );
    });

    it('should handle streaming API errors gracefully', async () => {
      // Arrange
      const question = 'What is this document about?';
      const mockMemory = {
        add: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getLLM: vi
          .fn()
          .mockResolvedValue([{ role: 'user', content: question }]),
      };
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue([
          {
            node: {
              getContent: vi.fn().mockReturnValue('Document content chunk'),
            },
            score: 0.85,
          },
        ]),
      };

      const mockFetchResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      };

      // Mock the fs calls to simulate files existing
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Test document content');
      vi.mocked(Document).mockReturnValue({} as never);
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act & Assert
      await expect(queryRAG(question)).rejects.toThrow(
        'HTTP 500: Internal Server Error'
      );
    });

    it('should handle missing response body', async () => {
      // Arrange
      const question = 'What is this document about?';
      const mockMemory = {
        add: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getLLM: vi
          .fn()
          .mockResolvedValue([{ role: 'user', content: question }]),
      };
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue([
          {
            node: {
              getContent: vi.fn().mockReturnValue('Document content chunk'),
            },
            score: 0.85,
          },
        ]),
      };

      const mockFetchResponse = {
        ok: true,
        body: null,
      };

      // Mock the fs calls to simulate files existing
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Test document content');
      vi.mocked(Document).mockReturnValue({} as never);
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act & Assert
      await expect(queryRAG(question)).rejects.toThrow(
        'No response body received'
      );
    });

    it('should use provided memory instead of global memory', async () => {
      // Arrange
      const question = 'What is this document about?';
      const customMemory = {
        add: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        getLLM: vi
          .fn()
          .mockResolvedValue([{ role: 'user', content: question }]),
      };
      const mockRetriever = {
        retrieve: vi.fn().mockResolvedValue([
          {
            node: {
              getContent: vi.fn().mockReturnValue('Document content chunk'),
            },
            score: 0.85,
          },
        ]),
      };

      // Mock SSE response
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Response"}]}}]}\n'
            )
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
          controller.close();
        },
      });

      const mockFetchResponse = {
        ok: true,
        body: mockStreamResponse,
      };

      // Mock the fs calls to simulate files existing
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('Test document content');
      vi.mocked(Document).mockReturnValue({} as never);
      const mockIndex = {
        asRetriever: vi.fn().mockReturnValue(mockRetriever),
      };
      vi.mocked(VectorStoreIndex.fromDocuments).mockResolvedValue(
        mockIndex as never
      );

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act
      await queryRAG(question, customMemory as never);

      // Assert
      expect(customMemory.add).toHaveBeenCalledWith({
        role: 'user',
        content: question,
      });
      expect(vi.mocked(createMemory)).not.toHaveBeenCalled();
    });
  });

  describe('Environment configuration', () => {
    it('should require GEMINI_API_KEY to be set', () => {
      expect(process.env.GEMINI_API_KEY).toBe('test-api-key');
    });

    it('should allow environment variable changes', () => {
      vi.stubEnv('GEMINI_API_KEY', 'different-test-key');
      expect(process.env.GEMINI_API_KEY).toBe('different-test-key');
    });
  });
});
