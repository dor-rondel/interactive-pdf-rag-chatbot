import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfUpload } from './PdfUpload';
import { describe, expect, it, vi } from 'vitest';
import { uploadPdfAction } from '@/app/actions/upload';

vi.mock('@/app/actions/upload', () => ({
  uploadPdfAction: vi.fn(),
}));

describe('PdfUpload', () => {
  const onUploadSuccess = vi.fn();

  it('should render the component', () => {
    render(<PdfUpload onUploadSuccess={onUploadSuccess} />);

    expect(
      screen.getByRole('heading', { name: /upload your pdf/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/select a pdf file/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('should only accept PDF files', () => {
    render(<PdfUpload onUploadSuccess={onUploadSuccess} />);
    const fileInput = screen.getByLabelText(/select a pdf file/i);
    expect(fileInput).toHaveAttribute('accept', '.pdf');
  });

  it('should show loading state when form is submitted', async () => {
    vi.mocked(uploadPdfAction).mockImplementation(
      () => new Promise(() => {}) // Prevent the action from resolving
    );

    render(<PdfUpload onUploadSuccess={onUploadSuccess} />);

    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/select a pdf file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    const button = screen.getByRole('button', { name: /upload/i });
    fireEvent.click(button);

    expect(
      await screen.findByRole('button', { name: /uploading/i })
    ).toBeInTheDocument();
  });

  it('should call uploadPdfAction when form is submitted with file', async () => {
    const mockAction = vi.mocked(uploadPdfAction);
    mockAction.mockResolvedValue({ error: null });

    render(<PdfUpload onUploadSuccess={onUploadSuccess} />);

    // Check if the button is disabled initially
    const button = screen.getByRole('button', { name: /upload/i });
    expect(button).toBeDisabled();

    // Select a file first
    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/select a pdf file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check if the button is enabled after selecting a file
    expect(button).toBeEnabled();

    fireEvent.click(button);

    // Wait a bit to allow form submission to be processed
    await waitFor(
      () => {
        expect(mockAction).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });
});
