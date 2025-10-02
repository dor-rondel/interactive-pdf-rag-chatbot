import 'server-only';

import { Document, VectorStoreIndex } from 'llamaindex';
import { getGlobalIndex, setGlobalIndex } from './ingestion';
import * as fs from 'fs';

/**
 * Get a retriever instance for the loaded vector store
 * @returns Promise<BaseRetriever> - Retriever instance for querying
 * @throws Error if no vector store is available
 */
export async function getRetriever() {
  // If globalIndex is already loaded, use it
  const globalIndex = getGlobalIndex();
  if (globalIndex) {
    return globalIndex.asRetriever();
  }

  // Try to reload from persisted data
  try {
    const dataDir = './data';
    const textPath = `${dataDir}/document.txt`;
    const vectorStorePath = `${dataDir}/vector_store.json`;

    // Check if required files exist
    if (!fs.existsSync(textPath) || !fs.existsSync(vectorStorePath)) {
      throw new Error('Vector store not found. Please upload a PDF first.');
    }

    // Read the original text
    const text = fs.readFileSync(textPath, 'utf8');

    if (!text.trim()) {
      throw new Error('Persisted document text is empty or invalid.');
    }

    // Recreate the document and index
    const doc = new Document({ text, id_: 'pdf-document' });
    const index = await VectorStoreIndex.fromDocuments([doc]);

    // Cache the loaded index globally
    setGlobalIndex(index);

    console.log('✅ Index recreated from persisted data');
    return index.asRetriever();
  } catch (error) {
    console.error('Error loading retriever:', error);
    // Re-throw the original error if it's already a meaningful error
    if (
      error instanceof Error &&
      (error.message.includes('Vector store not found') ||
        error.message.includes('Persisted document text is empty'))
    ) {
      throw error;
    }
    // For unexpected errors, throw a generic message
    throw new Error('Vector store not found. Please upload a PDF first.');
  }
}
