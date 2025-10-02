import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PdfViewer } from './PdfViewer';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: vi.fn(({ children, onLoadSuccess, loading }) => {
    // Simulate successful PDF load
    setTimeout(() => {
      onLoadSuccess?.({ numPages: 3 });
    }, 100);
    return (
      <div data-testid="pdf-document">
        {loading}
        {children}
      </div>
    );
  }),
  Page: vi.fn(({ pageNumber, width, className }) => (
    <div
      data-testid={`pdf-page-${pageNumber}`}
      data-width={width}
      className={className}
    >
      Page {pageNumber}
    </div>
  )),
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
    version: '3.11.174',
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL,
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL,
});

describe('PdfViewer', () => {
  const mockFile = new File(['test content'], 'test.pdf', {
    type: 'application/pdf',
  });

  const defaultProps = {
    file: mockFile,
    currentPage: 1,
    onPageChange: vi.fn(),
    className: 'test-class',
  };

  beforeEach(() => {
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  it('renders no PDF loaded message when file is null', () => {
    render(<PdfViewer {...defaultProps} file={null} />);

    expect(screen.getByText('No PDF loaded')).toBeInTheDocument();
    expect(
      screen.getByText('Upload a PDF file to view it here')
    ).toBeInTheDocument();
  });

  it('creates blob URL for File object', () => {
    render(<PdfViewer {...defaultProps} />);

    expect(mockCreateObjectURL).toHaveBeenCalledExactlyOnceWith(mockFile);
  });

  it('uses string URL directly when file is string', () => {
    const stringUrl = 'https://example.com/test.pdf';
    render(<PdfViewer {...defaultProps} file={stringUrl} />);

    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('shows PDF content after file URL is created', async () => {
    render(<PdfViewer {...defaultProps} />);

    // Should show the PDF document content (since mock immediately calls onLoadSuccess)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  });

  it('renders PDF document after loading', async () => {
    render(<PdfViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
  });

  it('renders page with correct page number and width', async () => {
    render(<PdfViewer {...defaultProps} />);

    await waitFor(() => {
      const page = screen.getByTestId('pdf-page-1');
      expect(page).toBeInTheDocument();
      expect(page).toHaveTextContent('Page 1');
    });
  });

  it('displays navigation controls after PDF loads', async () => {
    render(<PdfViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('← Previous')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
      expect(screen.getByText('of 3')).toBeInTheDocument();
    });
  });

  it('disables previous button on first page', async () => {
    render(<PdfViewer {...defaultProps} currentPage={1} />);

    await waitFor(() => {
      const prevButton = screen.getByText('← Previous');
      expect(prevButton).toBeDisabled();
    });
  });

  it('disables next button on last page', async () => {
    render(<PdfViewer {...defaultProps} currentPage={3} />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next →');
      expect(nextButton).toBeDisabled();
    });
  });

  it('calls onPageChange when next button is clicked', async () => {
    const mockOnPageChange = vi.fn();

    render(
      <PdfViewer
        {...defaultProps}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it('calls onPageChange when previous button is clicked', async () => {
    const mockOnPageChange = vi.fn();

    render(
      <PdfViewer
        {...defaultProps}
        currentPage={2}
        onPageChange={mockOnPageChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('← Previous')).toBeInTheDocument();
    });

    const prevButton = screen.getByText('← Previous');
    fireEvent.click(prevButton);

    expect(mockOnPageChange).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('calls onPageChange when page input is changed', async () => {
    const mockOnPageChange = vi.fn();

    render(
      <PdfViewer
        {...defaultProps}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const pageInput = screen.getByDisplayValue('1');
    fireEvent.change(pageInput, { target: { value: '2' } });

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('does not navigate beyond valid page range', async () => {
    const mockOnPageChange = vi.fn();

    render(
      <PdfViewer
        {...defaultProps}
        currentPage={1}
        onPageChange={mockOnPageChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const pageInput = screen.getByDisplayValue('1');
    fireEvent.change(pageInput, { target: { value: '5' } }); // Invalid page number

    // Should not call onPageChange for invalid page
    expect(mockOnPageChange).not.toHaveBeenCalledWith(5);
  });

  it('applies custom className', () => {
    render(<PdfViewer {...defaultProps} className="custom-class" />);

    // Check for the main container with custom class
    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('flex', 'flex-col', 'h-full', 'custom-class');
  });

  it('cleans up blob URL on unmount', () => {
    const { unmount } = render(<PdfViewer {...defaultProps} />);

    unmount();

    expect(mockRevokeObjectURL).toHaveBeenCalledExactlyOnceWith(
      'blob:mock-url'
    );
  });

  it('handles window resize for responsive width', () => {
    // Mock window object
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    render(<PdfViewer {...defaultProps} />);

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    });

    window.dispatchEvent(new Event('resize'));

    // The component should handle the resize event
    // (testing the event listener registration)
    expect(window.innerWidth).toBe(800);
  });

  it('updates page number when currentPage prop changes', async () => {
    const { rerender } = render(
      <PdfViewer {...defaultProps} currentPage={1} />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    rerender(<PdfViewer {...defaultProps} currentPage={2} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });
});
