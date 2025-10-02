import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGeminiLLMStream } from './streaming';

// Mock constants
vi.mock('@/app/lib/constants/gemini', () => ({
  GEMINI_MODEL: 'gemini-2.5-flash-latest',
}));

describe('streaming', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('console', {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    });
  });

  describe('callGeminiLLMStream', () => {
    it('should return streaming response successfully', async () => {
      // Arrange
      const prompt = 'Test prompt';

      // Mock SSE response
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n'
            )
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n'
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

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act
      const result = await callGeminiLLMStream(prompt);

      // Assert
      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:streamGenerateContent?alt=sse&key=test-api-key',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        }
      );
      expect(result).toBeInstanceOf(ReadableStream);

      // Test reading from the stream
      const reader = result.getReader();
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

      expect(fullText).toBe('Hello world');
    });

    it('should throw error for empty prompt', async () => {
      // Act & Assert
      await expect(callGeminiLLMStream('')).rejects.toThrow(
        'Prompt cannot be empty'
      );
      await expect(callGeminiLLMStream('   ')).rejects.toThrow(
        'Prompt cannot be empty'
      );
    });

    it('should throw error when GEMINI_API_KEY is not set', async () => {
      // Arrange
      vi.stubEnv('GEMINI_API_KEY', '');

      // Act & Assert
      await expect(callGeminiLLMStream('test prompt')).rejects.toThrow(
        'GEMINI_API_KEY environment variable is required'
      );
    });

    it('should handle API errors', async () => {
      // Arrange
      const mockFetchResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act & Assert
      await expect(callGeminiLLMStream('test prompt')).rejects.toThrow(
        'HTTP 400: Bad Request'
      );
    });

    it('should handle missing response body', async () => {
      // Arrange
      const mockFetchResponse = {
        ok: true,
        body: null,
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act & Assert
      await expect(callGeminiLLMStream('test prompt')).rejects.toThrow(
        'No response body received'
      );
    });

    it('should handle malformed JSON in SSE stream', async () => {
      // Arrange
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('data: {invalid json}\n')
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"candidates":[{"content":{"parts":[{"text":"Valid"}]}}]}\n'
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

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act
      const result = await callGeminiLLMStream('test prompt');

      // Assert
      const reader = result.getReader();
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

      expect(fullText).toBe('Valid');
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to parse SSE data:',
        expect.any(Error)
      );
    });

    it('should handle stream reading errors', async () => {
      // Arrange
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream error'));
        },
      });

      const mockFetchResponse = {
        ok: true,
        body: mockStreamResponse,
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse as never);

      // Act
      const result = await callGeminiLLMStream('test prompt');
      const reader = result.getReader();

      // Assert
      await expect(reader.read()).rejects.toThrow('Stream error');
    });

    it('should handle network errors', async () => {
      // Arrange
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(callGeminiLLMStream('test prompt')).rejects.toThrow(
        'Network error'
      );
    });
  });
});
