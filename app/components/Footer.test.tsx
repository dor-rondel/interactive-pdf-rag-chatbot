import { render, screen } from '@testing-library/react';
import Footer from './Footer';
import { expect, test } from 'vitest';

test('Footer renders a dofollow link to PorTori', () => {
  render(<Footer />);
  const link = screen.getByRole('link', { name: 'PorTori' });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', 'https://portori.cc');
  expect(link).not.toHaveAttribute('rel');
});
