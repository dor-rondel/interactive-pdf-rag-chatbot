import 'server-only';

import { GEMINI_MODEL } from '@/app/lib/constants/gemini';

/**
 * Call Gemini LLM with streaming response
 * @param prompt - The prompt to send to Gemini
 * @returns ReadableStream<Uint8Array> - The streaming response
 * @throws Error if API call fails
 */
export async function callGeminiLLMStream(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  if (!prompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    // Transform the SSE stream to extract just the text content
    return new ReadableStream({
      start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        function processStream() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === '[DONE]') {
                      controller.close();
                      return;
                    }

                    const data = JSON.parse(jsonStr);
                    const text =
                      data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (text) {
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch (parseError) {
                    // Skip malformed JSON lines
                    console.warn('Failed to parse SSE data:', parseError);
                  }
                }
              }

              processStream();
            })
            .catch((error) => {
              console.error('Stream reading error:', error);
              controller.error(error);
            });
        }

        processStream();
      },
    });
  } catch (error) {
    console.error('Error calling Gemini LLM stream:', error);
    throw error;
  }
}
