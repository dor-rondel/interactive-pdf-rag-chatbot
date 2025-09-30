import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';
import { describe, expect, it } from 'vitest';
import { MessageProps } from './types';

describe('MessageList', () => {
  const messages = [
    { id: '1', text: 'Hello', sender: 'bot' },
    { id: '2', text: 'Hi', sender: 'user' },
  ] as MessageProps[];

  it('should render a list of messages', () => {
    render(<MessageList messages={messages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
