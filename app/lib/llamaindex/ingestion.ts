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
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Parse the PDF to get full text and page count
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;
    const totalPages = pdfData.numpages;

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }

    // Split text into pages using document-specific patterns
    const pageTexts = splitIntoPages(fullText, totalPages);

    // Create page-aware documents (maintain page boundaries strictly)
    const allDocuments: Document[] = [];

    for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex++) {
      const pageNumber = pageIndex + 1;
      const pageText = pageTexts[pageIndex];

      // ALWAYS create a document for each page, even if it's short
      // This maintains accurate page numbering
      if (pageText.trim().length > 0) {
        const pageDoc = new Document({
          text: pageText.trim(),
          id_: `page-${pageNumber}`,
          metadata: {
            page: pageNumber,
            source: 'pdf-document',
          },
        });
        allDocuments.push(pageDoc);
      }
    }

    if (allDocuments.length === 0) {
      throw new Error('No valid pages found');
    }

    // Create index
    const index = await VectorStoreIndex.fromDocuments(allDocuments);
    globalIndex = index;

    // Persist data
    try {
      const dataDir = './data';
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Save page data
      const pageData = pageTexts.map((pageText, index) => ({
        page: index + 1,
        text: pageText,
      }));
      fs.writeFileSync(
        `${dataDir}/pages.json`,
        JSON.stringify(pageData, null, 2),
        'utf8'
      );
      fs.writeFileSync(`${dataDir}/document.txt`, fullText, 'utf8');

      const vectorStore = Object.values(
        index.storageContext.vectorStores
      )[0] as SimpleVectorStore;
      await vectorStore.persist(`${dataDir}/vector_store.json`);
    } catch (persistError) {
      console.error('Failed to persist PDF data:', persistError);
    }

    return index;
  } catch (error) {
    console.error('PDF processing failed:', error);
    throw new Error(
      `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Split full text into pages using generic PDF patterns
 */
function splitIntoPages(fullText: string, totalPages: number): string[] {
  // Try multiple generic page detection strategies

  // Strategy 1: Look for common page break patterns
  const genericPageMarkers = [
    /\f/g, // Form feed character (common page break)
    /\n\s*\d+\s*\n/g, // Page numbers on their own line
    /Page\s+\d+/gi, // "Page X" patterns
    /\d+\s*\/\s*\d+/g, // "X / Y" page patterns
    /\n\s*-\s*\d+\s*-\s*\n/g, // "- X -" page patterns
  ];

  // Try each strategy to find page breaks
  for (const pattern of genericPageMarkers) {
    const matches = Array.from(fullText.matchAll(pattern));

    if (matches.length > 0 && matches.length <= totalPages * 2) {
      // Only use if we find a reasonable number of matches
      const pages = splitByMarkers(fullText, matches);
      if (pages.length > 1) {
        return adjustToPageCount(pages, totalPages);
      }
    }
  }

  // Strategy 2: Look for repeated footer/header patterns
  const footerHeaderPages = detectByRepeatedElements(fullText, totalPages);
  if (footerHeaderPages.length > 1) {
    return footerHeaderPages;
  }

  // Strategy 3: Statistical approach - find natural break points
  const statisticalPages = splitByStatisticalAnalysis(fullText, totalPages);
  if (statisticalPages.length > 1) {
    return statisticalPages;
  }

  // Fallback: equal splits
  return splitIntoEqualParts(fullText, totalPages);
}

/**
 * Split text using detected markers
 */
function splitByMarkers(
  fullText: string,
  matches: RegExpMatchArray[]
): string[] {
  const pages: string[] = [];

  // First page (before first marker)
  if (matches[0].index! > 0) {
    pages.push(fullText.substring(0, matches[0].index!).trim());
  }

  // Pages between markers
  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index!;
    const endIndex =
      i < matches.length - 1 ? matches[i + 1].index! : fullText.length;

    const pageContent = fullText.substring(startIndex, endIndex).trim();
    if (pageContent.length > 0) {
      pages.push(pageContent);
    }
  }

  return pages.filter((page) => page.length > 0);
}

/**
 * Detect pages by looking for repeated elements (headers/footers)
 */
function detectByRepeatedElements(
  fullText: string,
  totalPages: number
): string[] {
  const lines = fullText.split('\n');
  const lineFrequency = new Map<string, number>();

  // Count frequency of each line (potential headers/footers)
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 100) {
      // Reasonable header/footer length
      lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
    }
  });

  // Find lines that appear multiple times (potential page separators)
  const repeatedLines = Array.from(lineFrequency.entries())
    .filter(([, count]) => count >= 2 && count <= totalPages)
    .map(([line]) => line)
    .sort((a, b) => b.length - a.length); // Prefer longer, more specific patterns

  for (const repeatedLine of repeatedLines.slice(0, 3)) {
    // Try top 3 candidates
    const indices: number[] = [];
    let searchIndex = 0;

    while (true) {
      const index = fullText.indexOf(repeatedLine, searchIndex);
      if (index === -1) break;
      indices.push(index);
      searchIndex = index + repeatedLine.length;
    }

    if (indices.length >= 2) {
      const pages = splitByMarkers(
        fullText,
        indices.map((index) => ({ index }) as RegExpMatchArray)
      );
      if (pages.length > 1) {
        return adjustToPageCount(pages, totalPages);
      }
    }
  }

  return [];
}

/**
 * Split using statistical analysis of text distribution
 */
function splitByStatisticalAnalysis(
  fullText: string,
  totalPages: number
): string[] {
  // Look for natural paragraph breaks that could be page boundaries
  const paragraphs = fullText.split(/\n\s*\n/);

  if (paragraphs.length < totalPages) {
    return [];
  }

  // Calculate average paragraph length
  const avgLength = fullText.length / totalPages;
  const pages: string[] = [];
  let currentPage = '';
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    if (currentLength > avgLength * 0.7 && pages.length < totalPages - 1) {
      // Start new page if we're at reasonable length and not on last page
      if (currentPage.trim()) {
        pages.push(currentPage.trim());
      }
      currentPage = paragraph;
      currentLength = paragraph.length;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + paragraph;
      currentLength += paragraph.length;
    }
  }

  // Add the last page
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages.length > 1 ? adjustToPageCount(pages, totalPages) : [];
}

/**
 * Fallback: split into equal parts
 */
function splitIntoEqualParts(fullText: string, totalPages: number): string[] {
  const pages: string[] = [];
  const pageSize = Math.floor(fullText.length / totalPages);

  for (let i = 0; i < totalPages; i++) {
    const start = i * pageSize;
    const end = i === totalPages - 1 ? fullText.length : (i + 1) * pageSize;
    pages.push(fullText.substring(start, end).trim());
  }

  return pages;
}

/**
 * Adjust page array to match exact page count
 */
function adjustToPageCount(pages: string[], targetCount: number): string[] {
  const result = [...pages];

  // Adjust to exact page count if needed
  while (result.length < targetCount) {
    // Split the longest page
    const lengths = result.map((p) => p.length);
    const maxIndex = lengths.indexOf(Math.max(...lengths));
    const toSplit = result[maxIndex];
    const midPoint = Math.floor(toSplit.length / 2);

    result[maxIndex] = toSplit.substring(0, midPoint);
    result.splice(maxIndex + 1, 0, toSplit.substring(midPoint));
  }

  while (result.length > targetCount) {
    // Merge the shortest page with its neighbor
    const lengths = result.map((p) => p.length);
    const minIndex = lengths.indexOf(Math.min(...lengths));

    if (minIndex < result.length - 1) {
      result[minIndex + 1] = result[minIndex] + ' ' + result[minIndex + 1];
    } else {
      result[minIndex - 1] = result[minIndex - 1] + ' ' + result[minIndex];
    }
    result.splice(minIndex, 1);
  }

  return result;
}
