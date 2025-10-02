import { render, screen, fireEvent } from '@testing-library/react';
import { ChatOrUpload } from './ChatOrUpload';
import { describe, expect, it, vi } from 'vitest';

// Mock child components
vi.mock('./pdf/PdfUpload', () => ({
  PdfUpload: vi.fn(({ onUploadSuccess }) => (
    <div data-testid="pdf-upload">
      <button
        onClick={() => {
          const mockFile = new File(['test'], 'test.pdf', {
            type: 'application/pdf',
          });
          onUploadSuccess(mockFile);
        }}
      >
        Upload File
      </button>
    </div>
  )),
}));

vi.mock('./chat/ChatInterface', () => ({
  ChatInterface: vi.fn(({ setChatting, pdfFile }) => (
    <div data-testid="chat-interface">
      <button onClick={() => setChatting(false)}>Back to Upload</button>
      <div data-testid="pdf-file">
        {pdfFile ? `File: ${pdfFile.name}` : 'No file'}
      </div>
    </div>
  )),
}));

describe('ChatOrUpload', () => {
  it('should render PDF upload interface initially', () => {
    render(<ChatOrUpload />);

    expect(screen.getByTestId('pdf-upload')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument();
  });

  it('should switch to chat interface after successful upload', () => {
    render(<ChatOrUpload />);

    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-upload')).not.toBeInTheDocument();
    expect(screen.getByTestId('pdf-file')).toHaveTextContent('File: test.pdf');
  });

  it('should switch back to upload interface when back button is clicked', () => {
    render(<ChatOrUpload />);

    // Upload a file to switch to chat interface
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument();

    // Click back button
    const backButton = screen.getByText('Back to Upload');
    fireEvent.click(backButton);

    expect(screen.getByTestId('pdf-upload')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-interface')).not.toBeInTheDocument();
  });
});
