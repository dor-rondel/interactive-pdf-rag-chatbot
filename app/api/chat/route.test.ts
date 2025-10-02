import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the llamaindex module
vi.mock('@/app/lib/llamaindex', () => ({
  queryRAG: vi.fn(),
}));

import { queryRAG } from '@/app/lib/llamaindex';

describe('/api/chat', () => {
  describe('POST', () => {
    it('should return streaming response', async () => {
      // Arrange
      const mockResult = {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode('This is a test response')
            );
            controller.close();
          },
        }),
        sources: [{ content: 'Test content', score: 0.95 }],
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
      expect(response.headers.get('Content-Type')).toBe('text/stream');

      // Test that we can read the stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      if (reader) {
        const decoder = new TextDecoder();
        const chunks: string[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value));
          }
        } finally {
          reader.releaseLock();
        }

        // Should contain sources and message data
        const fullResponse = chunks.join('');
        expect(fullResponse).toContain('sources');
        expect(fullResponse).toContain('message_start');
        expect(fullResponse).toContain('message_chunk');
        expect(fullResponse).toContain('message_end');
      }
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
      vi.mocked(queryRAG).mockRejectedValue(new Error('Streaming error'));

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
