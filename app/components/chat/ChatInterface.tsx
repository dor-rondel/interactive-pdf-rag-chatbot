'use client';

import { useState } from 'react';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { MessageProps } from './types';

/**
 * Main chat interface component that handles message display and user interaction.
 * Manages message state, handles API calls, and provides the chat UI layout.
 *
 * @param setChatting - Callback function to control whether chat interface is active
 */
export function ChatInterface({
  setChatting,
}: {
  setChatting: (isChatting: boolean) => void;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add bot response
      const botMessage: MessageProps = {
        id: String(Date.now() + 1),
        text: data.message,
        sender: 'bot',
        sources: data.sources,
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: MessageProps = {
        id: String(Date.now() + 1),
        text: 'Sorry, I encountered an error while processing your message. Please try again.',
        sender: 'bot',
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
        <MessageList messages={messages} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      <div className="w-full md:w-1/2 bg-gray-200 min-h-64 md:flex-1">
        {/* PDF Viewer will go here */}
      </div>
    </div>
  );
}
