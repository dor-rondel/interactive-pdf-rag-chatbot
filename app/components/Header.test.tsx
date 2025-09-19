import { render, screen } from '@testing-library/react';
import Header from './Header';
import { expect, test } from 'vitest';

test('Header component renders correctly', () => {
  render(<Header />);
  const headingElement = screen.getByText(/Interactive PDF RAG Chatbot/i);
  expect(headingElement).toBeInTheDocument();
});
