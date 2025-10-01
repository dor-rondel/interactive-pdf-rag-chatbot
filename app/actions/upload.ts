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
    // Convert File to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate embeddings directly in server action
    await generateEmbeddings(fileBuffer);

    return {
      error: null,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return {
      error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
