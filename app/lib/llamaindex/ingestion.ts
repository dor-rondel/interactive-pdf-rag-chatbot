import 'server-only';

import { Document, VectorStoreIndex } from 'llamaindex';
import { SimpleVectorStore } from 'llamaindex/vector-store';
import * as fs from 'fs';

// Global index variable for retrieval
let globalIndex: VectorStoreIndex | null = null;

/**
 * Reset the global index state (for testing purposes)
 */
export function resetGlobalIndex() {
  globalIndex = null;
}

/**
 * Get the current global index
 */
export function getGlobalIndex(): VectorStoreIndex | null {
  return globalIndex;
}

/**
 * Set the global index
 */
export function setGlobalIndex(index: VectorStoreIndex | null) {
  globalIndex = index;
}

/**
 * Process a PDF file and generate embeddings for RAG
 * @param file - PDF file buffer to process
 * @returns Promise<VectorStoreIndex> - The created vector store index
 * @throws Error if PDF parsing fails or text extraction returns empty content
 */
export async function generateEmbeddings(file: Buffer) {
  if (!Buffer.isBuffer(file) || file.length === 0) {
    throw new Error('Invalid file buffer provided');
  }

  try {
    // Use require for pdf-parse in Node.js runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    // Ensure we're passing a proper Buffer
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Parse the PDF buffer
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      throw new Error(
        'No text content found in PDF. The PDF might be image-based, corrupted, or protected.'
      );
    }

    const doc = new Document({ text, id_: 'pdf-document' });

    // Create index with the document - this automatically creates embeddings
    const index = await VectorStoreIndex.fromDocuments([doc]);

    // Store the index globally for retrieval and persist basic data
    globalIndex = index;

    // Simple persistence - just save the text for later recreation
    try {
      const dataDir = './data';

      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Save the original text for later reconstruction
      fs.writeFileSync(`${dataDir}/document.txt`, text, 'utf8');

      // Get and persist the vector store
      const vectorStore = Object.values(
        index.storageContext.vectorStores
      )[0] as SimpleVectorStore;
      await vectorStore.persist(`${dataDir}/vector_store.json`);

      console.log('✅ PDF processed and index persisted successfully');
    } catch (persistError) {
      console.error('❌ Failed to persist index:', persistError);
      // Continue without persistence - index is still in memory
    }

    return index;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error);
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
