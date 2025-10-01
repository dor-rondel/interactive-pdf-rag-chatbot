'use server';

import { generateEmbeddings } from '@/app/lib/llamaindex';

/**
 * Server action to handle PDF file upload and embedding generation.
 *
 * @param prevState - Previous state containing error information
 * @param formData - Form data containing the uploaded file
 * @returns Promise resolving to state with error information
 */
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
