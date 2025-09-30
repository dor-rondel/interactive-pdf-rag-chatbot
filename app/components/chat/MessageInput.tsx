'use client';

import { useState } from 'react';

export function MessageInput({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    // Simulate sending message
    setTimeout(() => {
      onSendMessage(message);
      setMessage('');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center p-4 flex-shrink-0"
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="ml-4 px-4 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600 disabled:bg-primary-300"
        disabled={isLoading || !message.trim()}
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
