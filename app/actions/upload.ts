'use server';

import { generateEmbeddings } from '@/app/lib/llamaindex';

export async function uploadPdfAction(
  prevState: { error: string | null },
  formData: FormData
) {
  const file = formData.get('file') as File;

  if (!file || file.type !== 'application/pdf') {
    return {
      error: 'Invalid file type. Please upload a PDF.',
    };
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate embeddings using Gemini - runs only on server despite being importable
    await generateEmbeddings(fileBuffer);

    return {
      error: null,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      error: 'Failed to process PDF. Please try again.',
    };
  }
}
