import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';
import { describe, expect, it, vi } from 'vitest';

// Mock the PdfViewer component to avoid PDF.js issues in tests
vi.mock('../pdf/PdfViewer', () => ({
  PdfViewer: vi.fn(({ file, className }) => (
    <div data-testid="pdf-viewer" className={className}>
      {file ? `PDF: ${file.name || 'URL'}` : 'No PDF'}
    </div>
  )),
}));

describe('ChatInterface', () => {
  const mockFile = new File(['test content'], 'test.pdf', {
    type: 'application/pdf',
  });

  it('should render the message list and input and handle back button click', () => {
    const setChatting = vi.fn();
    render(<ChatInterface setChatting={setChatting} pdfFile={mockFile} />);

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

  it('should render PDF viewer with the provided file', () => {
    const setChatting = vi.fn();
    render(<ChatInterface setChatting={setChatting} pdfFile={mockFile} />);

    const pdfViewer = screen.getByTestId('pdf-viewer');
    expect(pdfViewer).toBeInTheDocument();
    expect(pdfViewer).toHaveTextContent('PDF: test.pdf');
  });

  it('should render PDF viewer with no PDF when file is null', () => {
    const setChatting = vi.fn();
    render(<ChatInterface setChatting={setChatting} pdfFile={null} />);

    const pdfViewer = screen.getByTestId('pdf-viewer');
    expect(pdfViewer).toBeInTheDocument();
    expect(pdfViewer).toHaveTextContent('No PDF');
  });
});
