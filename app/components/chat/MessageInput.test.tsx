import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from './MessageInput';
import { describe, expect, it, vi } from 'vitest';

describe('MessageInput', () => {
  it('should allow typing and submitting a message', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} isLoading={false} />);
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button', { name: 'Send' });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(onSendMessage).toHaveBeenCalledExactlyOnceWith('Hello');
    expect(input).toHaveValue('');
  });

  it('should show loading state', () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} isLoading={true} />);

    const button = screen.getByRole('button', { name: /sending/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
