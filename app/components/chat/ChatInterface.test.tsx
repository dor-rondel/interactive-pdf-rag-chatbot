import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';
import { describe, expect, it, vi } from 'vitest';

describe('ChatInterface', () => {
  it('should render the message list and input and handle back button click', () => {
    const setChatting = vi.fn();
    render(<ChatInterface setChatting={setChatting} />);

    expect(screen.getAllByText('Hello! I am a bot.').length).toBeGreaterThan(0);
    expect(
      screen.getByPlaceholderText('Type your message...')
    ).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back to upload/i });
    fireEvent.click(backButton);
    expect(setChatting).toHaveBeenCalledWith(false);
  });
});
