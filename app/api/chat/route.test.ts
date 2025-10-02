import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the llamaindex module
vi.mock('@/app/lib/llamaindex', () => ({
  queryRAG: vi.fn(),
  queryRAGStream: vi.fn(),
}));

import { queryRAG, queryRAGStream } from '@/app/lib/llamaindex';

describe('/api/chat', () => {
  describe('POST', () => {
    it('should return non-streaming response by default', async () => {
      // Arrange
      const mockResult = {
        message: 'This is a test response',
        sources: [{ content: 'Source content...', score: 0.85 }],
      };

      vi.mocked(queryRAG).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(queryRAG).toHaveBeenCalledExactlyOnceWith('What is this about?');
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toStrictEqual(mockResult);
    });

    it('should return streaming response when Accept header includes text/stream', async () => {
      // Arrange
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Test'));
          controller.enqueue(new TextEncoder().encode(' response'));
          controller.close();
        },
      });

      const mockSources = [{ content: 'Source content...', score: 0.85 }];

      vi.mocked(queryRAGStream).mockResolvedValue({
        stream: mockStream,
        sources: mockSources,
      });

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/stream',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(queryRAGStream).toHaveBeenCalledExactlyOnceWith(
        'What is this about?'
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');

      // Test reading the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
      }

      const fullResponse = chunks.join('');

      // Check that sources are sent first
      expect(fullResponse).toContain(
        '{"type":"sources","sources":[{"content":"Source content...","score":0.85}]}'
      );
      expect(fullResponse).toContain('{"type":"message_start"}');
      expect(fullResponse).toContain(
        '{"type":"message_chunk","content":"Test"}'
      );
      expect(fullResponse).toContain(
        '{"type":"message_chunk","content":" response"}'
      );
      expect(fullResponse).toContain('{"type":"message_end"}');
    });

    it('should return 400 error for missing message', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'Message is required and must be a string',
      });
    });

    it('should return 400 error for non-string message', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 123 }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'Message is required and must be a string',
      });
    });

    it('should return 400 error for empty message', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '   ' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'Message cannot be empty',
      });
    });

    it('should return 404 error for vector store not found', async () => {
      // Arrange
      vi.mocked(queryRAG).mockRejectedValue(
        new Error('Vector store not found')
      );

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error:
          'No documents have been uploaded yet. Please upload a PDF first.',
      });
    });

    it('should return 500 error for GEMINI_API_KEY error', async () => {
      // Arrange
      vi.mocked(queryRAG).mockRejectedValue(
        new Error('GEMINI_API_KEY environment variable is required')
      );

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'Server configuration error',
      });
    });

    it('should return 500 error for generic errors', async () => {
      // Arrange
      vi.mocked(queryRAG).mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'An error occurred while processing your message',
      });
    });

    it('should handle streaming errors gracefully', async () => {
      // Arrange
      vi.mocked(queryRAGStream).mockRejectedValue(new Error('Streaming error'));

      const request = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'What is this about?' }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/stream',
        },
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData).toStrictEqual({
        error: 'An error occurred while processing your message',
      });
    });
  });
});
