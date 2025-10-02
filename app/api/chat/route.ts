import { NextRequest, NextResponse } from 'next/server';
import {
  queryRAGWithMemory,
  queryRAGStreamWithMemory,
} from '@/app/lib/llamaindex';
import { ChatRequest, ChatResponse } from '@/app/lib/llamaindex/types';

/**
 * POST handler for chat API endpoint.
 * Processes user messages through RAG pipeline and returns AI responses with sources.
 * Supports both streaming and non-streaming responses based on Accept header.
 *
 * @param request - Next.js request object containing chat message
 * @returns Promise resolving to streaming response or JSON response with message and sources or error
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Check if client wants streaming response
    const acceptHeader = request.headers.get('accept');
    const wantsStream = acceptHeader?.includes('text/stream');

    if (wantsStream) {
      // Perform streaming RAG query with memory
      const { stream, sources } = await queryRAGStreamWithMemory(body.message);

      // Create a combined stream that sends sources first, then the message
      const combinedStream = new ReadableStream({
        start(controller) {
          // Send sources metadata first
          const sourcesData =
            JSON.stringify({
              type: 'sources',
              sources,
            }) + '\n';
          controller.enqueue(new TextEncoder().encode(sourcesData));

          // Send start of message marker
          const messageStart =
            JSON.stringify({
              type: 'message_start',
            }) + '\n';
          controller.enqueue(new TextEncoder().encode(messageStart));

          // Pipe the message stream
          const reader = stream.getReader();

          function processStream() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  // Send end marker
                  const messageEnd =
                    JSON.stringify({
                      type: 'message_end',
                    }) + '\n';
                  controller.enqueue(new TextEncoder().encode(messageEnd));
                  controller.close();
                  return;
                }

                // Send message chunk
                const chunkData =
                  JSON.stringify({
                    type: 'message_chunk',
                    content: new TextDecoder().decode(value),
                  }) + '\n';
                controller.enqueue(new TextEncoder().encode(chunkData));

                processStream();
              })
              .catch((error) => {
                console.error('Stream processing error:', error);
                const errorData =
                  JSON.stringify({
                    type: 'error',
                    error: 'Stream processing failed',
                  }) + '\n';
                controller.enqueue(new TextEncoder().encode(errorData));
                controller.close();
              });
          }

          processStream();
        },
      });

      return new Response(combinedStream, {
        headers: {
          'Content-Type': 'text/stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Fallback to non-streaming response with memory
      const result = await queryRAGWithMemory(body.message);

      const response: ChatResponse = {
        message: result.message,
        sources: result.sources,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Vector store not found')) {
        return NextResponse.json(
          {
            error:
              'No documents have been uploaded yet. Please upload a PDF first.',
          },
          { status: 404 }
        );
      }

      if (error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    );
  }
}
