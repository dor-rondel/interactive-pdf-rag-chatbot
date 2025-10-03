'use client';

import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { MessageProps } from './types';

/**
 * Container component that displays a scrollable list of chat messages.
 * Automatically scrolls to the bottom when new messages are added.
 *
 * @param messages - Array of message objects to display
 * @param onPageClick - Optional callback when a page reference is clicked
 */
export function MessageList({
  messages,
  onPageClick,
}: {
  messages: MessageProps[];
  onPageClick?: (pageNumber: number) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls the message list to the bottom to show the latest message
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((msg) => (
        <Message
          key={msg.id}
          text={msg.text}
          sender={msg.sender}
          sources={msg.sources}
          onPageClick={onPageClick}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
