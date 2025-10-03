'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { MessageProps } from './types';

// Dynamically import PdfViewer with no SSR to avoid server-side PDF.js issues
const PdfViewer = dynamic(
  () => import('../pdf/PdfViewer').then((mod) => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-neutral-600">Loading PDF viewer...</p>
        </div>
      </div>
    ),
  }
);

/**
 * Main chat interface component that handles message display and user interaction.
 * Manages message state, handles API calls, and provides the chat UI layout.
 *
 * @param setChatting - Callback function to control whether chat interface is active
 * @param pdfFile - The uploaded PDF file to display in the viewer
 */
export function ChatInterface({
  setChatting,
  pdfFile,
}: {
  setChatting: (isChatting: boolean) => void;
  pdfFile: File | null;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Handles sending a message through the chat API and updating the UI
   * @param text - The user's message text
   */
  const handleSendMessage = async (text: string) => {
    // Add user message immediately
    const userMessage: MessageProps = {
      id: String(Date.now()),
      text,
      sender: 'user',
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    // Create placeholder bot message for streaming
    const botMessageId = String(Date.now() + 1);
    const botMessage: MessageProps = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      sources: [],
    };

    setMessages((prevMessages) => [...prevMessages, botMessage]);

    try {
      // Call the chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/stream',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sources: Array<{ content: string; score: number; page?: number }> =
        [];
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);

                switch (data.type) {
                  case 'sources':
                    sources = data.sources || [];
                    break;

                  case 'message_start':
                    // Reset accumulated text for new message
                    accumulatedText = '';
                    break;

                  case 'message_chunk':
                    // Accumulate text and update UI
                    accumulatedText += data.content || '';
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === botMessageId
                          ? { ...msg, text: accumulatedText, sources }
                          : msg
                      )
                    );
                    break;

                  case 'message_end':
                    // Finalize the message
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === botMessageId
                          ? { ...msg, text: accumulatedText, sources }
                          : msg
                      )
                    );
                    break;

                  case 'error':
                    throw new Error(data.error || 'Stream processing error');

                  default:
                    console.warn('Unknown stream data type:', data.type);
                }
              } catch (parseError) {
                console.warn('Failed to parse stream line:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Replace the placeholder bot message with error message
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === botMessageId
            ? {
                ...msg,
                text: 'Sorry, I encountered an error while processing your message. Please try again.',
                sources: [],
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles clicking on a page reference to navigate to that page in the PDF viewer
   * @param pageNumber - The page number to navigate to
   */
  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 border border-neutral-200 rounded-lg shadow-lg max-h-[calc(100vh-128px)]">
      <div className="flex flex-col w-full md:w-1/2 p-2 flex-1 max-h-full min-h-0">
        <button
          onClick={() => setChatting(false)}
          className="mb-2 px-4 py-2 text-sm font-medium text-primary-500 hover:text-primary-600 focus:outline-none flex-shrink-0"
        >
          &lt; Back to Upload
        </button>
        <MessageList messages={messages} onPageClick={handlePageClick} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      <div className="w-full md:w-1/2 bg-gray-200 min-h-64 md:flex-1">
        <PdfViewer
          file={pdfFile}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          className="h-full"
        />
      </div>
    </div>
  );
}
