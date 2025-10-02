import { NextRequest, NextResponse } from 'next/server';
import { queryRAG } from '@/app/lib/llamaindex';
import { ChatRequest, ChatResponse } from '@/app/lib/llamaindex/types';

/**
 * POST handler for chat API endpoint.
 * Processes user messages through RAG pipeline and returns AI responses with sources.
 *
 * @param request - Next.js request object containing chat message
 * @returns Promise resolving to JSON response with message and sources or error
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

    // Perform RAG query
    const result = await queryRAG(body.message);

    const response: ChatResponse = {
      message: result.message,
      sources: result.sources,
    };

    return NextResponse.json(response);
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
