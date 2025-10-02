'use client';

import { useState } from 'react';

/**
 * Input component for typing and sending chat messages.
 * Provides a text input with send button and loading state management.
 *
 * @param onSendMessage - Callback function to handle message submission
 * @param isLoading - Whether the chat is currently processing a message
 */
export function MessageInput({
  onSendMessage,
  isLoading,
}: {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}) {
  const [input, setInput] = useState('');

  /**
   * Handles form submission and message sending
   * @param e - The form submission event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    onSendMessage(input);
    setInput('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center p-4 flex-shrink-0"
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="ml-4 px-4 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:bg-primary-300"
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
