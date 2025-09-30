import { render, screen } from '@testing-library/react';
import { Message } from './Message';
import { describe, expect, it } from 'vitest';

describe('Message', () => {
  it('should render a user message correctly', () => {
    render(<Message text="Hello" sender="user" />);
    const message = screen.getByText('Hello');
    expect(message).toBeInTheDocument();
    expect(message.parentElement).toHaveClass('justify-end');
    expect(message).toHaveClass('bg-primary-500');
  });

  it('should render a bot message correctly', () => {
    render(<Message text="Hi there" sender="bot" />);
    const message = screen.getByText('Hi there');
    expect(message).toBeInTheDocument();
    expect(message.parentElement).toHaveClass('justify-start');
    expect(message).toHaveClass('bg-neutral-200');
  });
});
