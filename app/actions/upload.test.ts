import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPdfAction } from './upload';
import { generateEmbeddings } from '@/app/lib/llamaindex';

vi.mock('@/app/lib/llamaindex', () => ({
  generateEmbeddings: vi.fn(),
}));

describe('uploadPdfAction', () => {
  const initialState = { error: null };

  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
  });

  it('should return an error if no file is provided', async () => {
    const formData = new FormData();
    const result = await uploadPdfAction(initialState, formData);
    expect(result.error).toBe('Invalid file type. Please upload a PDF.');
  });

  it('should return an error if the file is not a PDF', async () => {
    const formData = new FormData();
    const blob = new Blob(['content'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    const result = await uploadPdfAction(initialState, formData);
    expect(result.error).toBe('Invalid file type. Please upload a PDF.');
  });

  it('should return success if the file is a PDF and processing succeeds', async () => {
    vi.mocked(generateEmbeddings).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof generateEmbeddings>>
    );

    const formData = new FormData();
    const blob = new Blob(['content'], { type: 'application/pdf' });
    formData.append('file', blob, 'test.pdf');
    const result = await uploadPdfAction(initialState, formData);

    expect(generateEmbeddings).toHaveBeenCalledExactlyOnceWith(
      expect.any(Buffer)
    );
    expect(result.error).toBeNull();
  });

  it('should return an error if processing fails', async () => {
    vi.mocked(generateEmbeddings).mockRejectedValueOnce(
      new Error('Processing failed')
    );

    const formData = new FormData();
    const blob = new Blob(['content'], { type: 'application/pdf' });
    formData.append('file', blob, 'test.pdf');
    const result = await uploadPdfAction(initialState, formData);

    expect(result.error).toBe('Failed to process PDF. Please try again.');
  });
});
