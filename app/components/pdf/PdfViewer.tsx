'use client';

import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker only on client side
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

type PdfViewerProps = {
  file: File | string | null;
  currentPage?: number;
  onPageChange?: (pageNumber: number) => void;
  className?: string;
};

/**
 * PDF viewer component with pagination controls and navigation.
 * Supports automatic scrolling to specific pages for RAG source highlighting.
 */
export function PdfViewer({
  file,
  currentPage = 1,
  onPageChange,
  className = '',
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(currentPage);
  const [error, setError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(600);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Convert File to URL for react-pdf
  useEffect(() => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (file) {
      setFileUrl(file);
    }
  }, [file]);

  // Set page width based on container size
  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== 'undefined') {
        setPageWidth(Math.min(600, window.innerWidth * 0.4));
      }
    };

    updateWidth();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  /**
   * Handles successful PDF document load
   */
  const onDocumentLoadSuccess = useCallback(
    ({ numPages: totalPages }: { numPages: number }) => {
      setNumPages(totalPages);
      setError(null);
    },
    []
  );

  /**
   * Handles PDF document load error
   */
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError(`Failed to load PDF document: ${error.message}`);
  }, []);

  /**
   * Navigate to previous page
   */
  const goToPreviousPage = useCallback(() => {
    if (pageNumber > 1) {
      const newPage = pageNumber - 1;
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  }, [pageNumber, onPageChange]);

  /**
   * Navigate to next page
   */
  const goToNextPage = useCallback(() => {
    if (pageNumber < numPages) {
      const newPage = pageNumber + 1;
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  }, [pageNumber, numPages, onPageChange]);

  /**
   * Jump to specific page
   */
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setPageNumber(page);
        onPageChange?.(page);
      }
    },
    [numPages, onPageChange]
  );

  // Update internal page state when prop changes
  if (
    currentPage !== pageNumber &&
    currentPage >= 1 &&
    currentPage <= numPages
  ) {
    setPageNumber(currentPage);
  }

  if (!file) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-neutral-500">
          <p className="text-lg mb-2">No PDF loaded</p>
          <p className="text-sm">Upload a PDF file to view it here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* PDF Document Display */}
      <div className="flex-1 overflow-auto bg-neutral-50 flex justify-center items-start p-4">
        {!fileUrl && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
              <p className="text-neutral-600">Preparing PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-error">
              <p className="text-lg mb-2">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {fileUrl && !error && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mr-2"></div>
                <span>Loading PDF document...</span>
              </div>
            }
            error={
              <div className="text-center p-4 text-error">
                <p>Failed to load PDF document</p>
              </div>
            }
            className="max-w-full"
          >
            <Page
              pageNumber={pageNumber}
              className="shadow-lg"
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </div>

      {/* Navigation Controls */}
      {numPages > 0 && (
        <div className="flex items-center justify-between p-4 bg-white border-t border-neutral-200">
          {/* Previous Button */}
          <button
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="px-3 py-1 text-sm font-medium text-primary-600 disabled:text-neutral-400 hover:text-primary-700 disabled:hover:text-neutral-400 focus:outline-none"
          >
            ← Previous
          </button>

          {/* Page Info and Input */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Page</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (!isNaN(page)) {
                  goToPage(page);
                }
              }}
              className="w-16 px-2 py-1 text-sm text-center border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-sm text-neutral-600">of {numPages}</span>
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 text-sm font-medium text-primary-600 disabled:text-neutral-400 hover:text-primary-700 disabled:hover:text-neutral-400 focus:outline-none"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
