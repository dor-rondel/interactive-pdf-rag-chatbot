import 'server-only';

import { GEMINI_MODEL } from '@/app/lib/constants/gemini';
import {
  startObservation,
  type LangfuseGenerationAttributes,
} from '@langfuse/tracing';

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

  const langfuseEnabled = Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
  );
  const generation = langfuseEnabled
    ? startObservation(
        'gemini.streamGenerateContent',
        {
          model: GEMINI_MODEL,
          input: {
            promptLength: prompt.length,
          },
          metadata: {
            endpoint: 'streamGenerateContent',
          },
        },
        { asType: 'generation' }
      )
    : null;

  const requestStartTime = Date.now();
  let generationEnded = false;
  const endGeneration = (attributes?: LangfuseGenerationAttributes) => {
    if (!generation || generationEnded) {
      return;
    }
    generationEnded = true;
    if (attributes) {
      generation.update(attributes);
    }
    generation.end();
  };

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
      endGeneration({
        level: 'ERROR',
        statusMessage: `HTTP ${response.status}`,
        output: {
          error: errorText.slice(0, 2000),
        },
        metadata: {
          durationMs: Date.now() - requestStartTime,
          status: response.status,
        },
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      endGeneration({
        level: 'ERROR',
        statusMessage: 'No response body received',
        metadata: {
          durationMs: Date.now() - requestStartTime,
        },
      });
      throw new Error('No response body received');
    }

    // Transform the SSE stream to extract just the text content
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let aggregatedText = '';

    return new ReadableStream({
      start(controller) {
        reader = response.body!.getReader();
        const decoder = new TextDecoder();

        function processStream() {
          reader!
            .read()
            .then(({ done, value }) => {
              if (done) {
                endGeneration({
                  output: {
                    textLength: aggregatedText.length,
                    textPreview: aggregatedText.slice(0, 2000),
                  },
                  metadata: {
                    durationMs: Date.now() - requestStartTime,
                  },
                });
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
                      aggregatedText += text;
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
              endGeneration({
                level: 'ERROR',
                statusMessage:
                  error instanceof Error ? error.message : 'Stream error',
                metadata: {
                  durationMs: Date.now() - requestStartTime,
                },
              });
              controller.error(error);
            });
        }

        processStream();
      },
      cancel(reason) {
        if (reader) {
          reader.cancel(reason).catch(() => {
            // ignore
          });
        }

        endGeneration({
          level: 'WARNING',
          statusMessage: 'Client cancelled stream',
          metadata: {
            durationMs: Date.now() - requestStartTime,
          },
        });
      },
    });
  } catch (error) {
    console.error('Error calling Gemini LLM stream:', error);
    endGeneration({
      level: 'ERROR',
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        durationMs: Date.now() - requestStartTime,
      },
    });
    throw error;
  }
}
