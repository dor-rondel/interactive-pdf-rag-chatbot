import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the generateEmbeddings function
vi.mock('@/app/lib/llamaindex', () => ({
  generateEmbeddings: vi.fn(),
}));

import { generateEmbeddings } from '@/app/lib/llamaindex';

describe('/api/upload', () => {
  it('should return 400 if no file is provided', async () => {
    const formData = new FormData();
    const request = {
      formData: () => Promise.resolve(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('should return 400 if file is not a PDF', async () => {
    const formData = new FormData();
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    formData.append('file', file);

    const request = {
      formData: () => Promise.resolve(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid file type. Please upload a PDF.');
  });

  it('should process PDF successfully', async () => {
    vi.mocked(generateEmbeddings).mockResolvedValue({} as never);

    const formData = new FormData();
    const file = new File(['pdf content'], 'test.pdf', {
      type: 'application/pdf',
    });
    formData.append('file', file);

    const request = {
      formData: () => Promise.resolve(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('PDF uploaded and processed successfully');
    expect(generateEmbeddings).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('should handle errors from generateEmbeddings', async () => {
    vi.mocked(generateEmbeddings).mockRejectedValue(
      new Error('Processing failed')
    );

    const formData = new FormData();
    const file = new File(['pdf content'], 'test.pdf', {
      type: 'application/pdf',
    });
    formData.append('file', file);

    const request = {
      formData: () => Promise.resolve(formData),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process PDF: Processing failed');
  });
});
