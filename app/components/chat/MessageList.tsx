'use client';

import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { MessageProps } from './types';

export function MessageList({ messages }: { messages: MessageProps[] }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((msg) => (
        <Message key={msg.id} text={msg.text} sender={msg.sender} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
