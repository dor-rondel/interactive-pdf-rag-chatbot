import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.GEMINI_API_KEY = 'test-api-key';

vi.mock('server-only', () => ({}));

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
