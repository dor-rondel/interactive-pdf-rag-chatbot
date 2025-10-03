import { NextRequest, NextResponse } from 'next/server';
import { generateEmbeddings } from '@/app/lib/llamaindex';

/**
 * API endpoint to handle PDF file upload and embedding generation.
 * Supports larger file sizes than Server Actions.
 *
 * @param request - Next.js request object containing the uploaded file
 * @returns JSON response with success status or error information
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF.' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate embeddings
    await generateEmbeddings(fileBuffer);

    return NextResponse.json(
      { success: true, message: 'PDF uploaded and processed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      {
        error: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
