import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';
import { describe, expect, it, vi } from 'vitest';

describe('ChatInterface', () => {
  it('should render the message list and input and handle back button click', () => {
    const setChatting = vi.fn();
    render(<ChatInterface setChatting={setChatting} />);

    // Check that the input field is present
    expect(
      screen.getByPlaceholderText('Type your message...')
    ).toBeInTheDocument();

    // Check that the back button is present and functional
    const backButton = screen.getByRole('button', { name: /back to upload/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(setChatting).toHaveBeenCalledExactlyOnceWith(false);
  });
});
