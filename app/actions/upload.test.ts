import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPdfAction } from './upload';

// Mock the generateEmbeddings function
vi.mock('@/app/lib/llamaindex', () => ({
  generateEmbeddings: vi.fn(),
}));

import { generateEmbeddings } from '@/app/lib/llamaindex';

describe('actions/upload', () => {
  const createMockFile = (
    name: string,
    type: string,
    content: string = 'test content',
  ): File => {
    const file = new File([content], name, { type });
    return file;
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('uploadPdfAction', () => {
    it('should process valid PDF file successfully', async () => {
      // Arrange
      const mockFile = createMockFile('test.pdf', 'application/pdf');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      vi.mocked(generateEmbeddings).mockResolvedValue({} as never);

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).toHaveBeenCalledExactlyOnceWith(
        expect.any(Buffer),
      );
      expect(result).toStrictEqual({ error: null });
    });

    it('should reject non-PDF files', async () => {
      // Arrange
      const mockFile = createMockFile('test.txt', 'text/plain');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        error: 'Invalid file type. Please upload a PDF.',
      });
    });

    it('should handle missing file', async () => {
      // Arrange
      const formData = new FormData();
      const prevState = { error: null };

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        error: 'Invalid file type. Please upload a PDF.',
      });
    });

    it('should handle null file', async () => {
      // Arrange
      const formData = new FormData();
      formData.append('file', 'null');
      const prevState = { error: null };

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        error: 'Invalid file type. Please upload a PDF.',
      });
    });

    it('should handle generateEmbeddings errors', async () => {
      // Arrange
      const mockFile = createMockFile('test.pdf', 'application/pdf');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };
      const mockError = new Error('Embedding generation failed');

      vi.mocked(generateEmbeddings).mockRejectedValue(mockError);

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).toHaveBeenCalledWith(expect.any(Buffer));
      expect(result).toStrictEqual({
        error: 'Failed to process PDF: Embedding generation failed',
      });
      expect(console.error).toHaveBeenCalledWith(
        'Error processing PDF:',
        mockError,
      );
    });

    it('should handle unknown errors', async () => {
      // Arrange
      const mockFile = createMockFile('test.pdf', 'application/pdf');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      vi.mocked(generateEmbeddings).mockRejectedValue('string error');

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(result).toStrictEqual({
        error: 'Failed to process PDF: Unknown error',
      });
    });

    it('should convert file to buffer correctly', async () => {
      // Arrange
      const fileContent = 'test PDF content';
      const mockFile = createMockFile('test.pdf', 'application/pdf', fileContent);
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      vi.mocked(generateEmbeddings).mockResolvedValue({} as never);

      // Act
      await uploadPdfAction(prevState, formData);

      // Assert
      const buffer = vi.mocked(generateEmbeddings).mock.calls[0][0];
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe(fileContent);
    });

    it('should handle large PDF files', async () => {
      // Arrange
      const largeContent = 'a'.repeat(10000);
      const mockFile = createMockFile(
        'large.pdf',
        'application/pdf',
        largeContent,
      );
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      vi.mocked(generateEmbeddings).mockResolvedValue({} as never);

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).toHaveBeenCalledWith(expect.any(Buffer));
      expect(result).toStrictEqual({ error: null });
    });

    it('should handle files with PDF-like names but wrong MIME type', async () => {
      // Arrange
      const mockFile = createMockFile('test.pdf', 'text/plain');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).not.toHaveBeenCalled();
      expect(result).toStrictEqual({
        error: 'Invalid file type. Please upload a PDF.',
      });
    });

    it('should handle empty PDF files', async () => {
      // Arrange
      const mockFile = createMockFile('empty.pdf', 'application/pdf', '');
      const formData = new FormData();
      formData.append('file', mockFile);
      const prevState = { error: null };

      vi.mocked(generateEmbeddings).mockResolvedValue({} as never);

      // Act
      const result = await uploadPdfAction(prevState, formData);

      // Assert
      expect(generateEmbeddings).toHaveBeenCalledWith(expect.any(Buffer));
      expect(result).toStrictEqual({ error: null });
    });
  });
});