'use client';

import { useState } from 'react';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { dummyMessages } from './dummy-data';
import { MessageProps } from './types';

export function ChatInterface({
  setChatting,
}: {
  setChatting: (isChatting: boolean) => void;
}) {
  const [messages, setMessages] = useState(dummyMessages as MessageProps[]);

  const handleSendMessage = (text: string) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: String(prevMessages.length + 1), text, sender: 'user' },
    ]);
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
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
      <div className="w-full md:w-1/2 bg-gray-200 min-h-64 md:flex-1">
        {/* PDF Viewer will go here */}
      </div>
    </div>
  );
}
