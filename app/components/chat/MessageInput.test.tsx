import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from './MessageInput';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('MessageInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should allow typing and submitting a message', async () => {
    const onSendMessage = vi.fn();
    render(<MessageInput onSendMessage={onSendMessage} />);
    const input = screen.getByPlaceholderText('Type your message...');
    const button = screen.getByRole('button', { name: 'Send' });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /sending/i })
    ).toBeInTheDocument();

    vi.runAllTimers();

    expect(onSendMessage).toHaveBeenCalledWith('Hello');
  });
});
