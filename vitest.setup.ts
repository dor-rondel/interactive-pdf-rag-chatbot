import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.GEMINI_API_KEY = 'test-api-key';

vi.mock('server-only', () => ({}));

// Mock PDFJS worker for tests
vi.stubGlobal('PDFJS', {
  workerSrc: 'mocked-worker.js',
});

// Mock require globally to intercept pdf-parse
const mockPdfParse = vi.fn();

// Store the mock globally for access in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__mockPdfParse = mockPdfParse;

// Mock via Node's module system more effectively
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('module');
const originalLoad = Module._load;

Module._load = function (
  request: string,
  _parent: NodeJS.Module,
  ...args: unknown[]
) {
  if (request === 'pdf-parse') {
    return mockPdfParse;
  }
  return originalLoad.apply(this, [request, _parent, ...args]);
};

if (typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Mock scrollIntoView for JSDOM environment
HTMLElement.prototype.scrollIntoView = vi.fn();
