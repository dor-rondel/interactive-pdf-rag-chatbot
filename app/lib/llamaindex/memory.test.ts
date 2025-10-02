import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock llamaindex
vi.mock('llamaindex', () => ({
  createMemory: vi.fn(),
  Memory: vi.fn(),
}));

import {
  getMemory,
  resetGlobalMemory,
  getGlobalMemory,
  setGlobalMemory,
} from './memory';
import { createMemory } from 'llamaindex';

describe('memory', () => {
  beforeEach(() => {
    // Reset module state before each test
    resetGlobalMemory();
  });

  describe('globalMemory management', () => {
    it('should reset global memory to null', () => {
      // Arrange
      const mockMemory = { test: 'memory' };
      setGlobalMemory(mockMemory as never);

      // Act
      resetGlobalMemory();

      // Assert
      expect(getGlobalMemory()).toBe(null);
    });

    it('should get and set global memory', () => {
      // Arrange
      const mockMemory = { test: 'memory' };

      // Act
      setGlobalMemory(mockMemory as never);

      // Assert
      expect(getGlobalMemory()).toBe(mockMemory);
    });
  });

  describe('getMemory', () => {
    it('should create new memory instance when none exists', () => {
      // Arrange
      const mockMemory = { test: 'memory' };
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      // Act
      const result = getMemory();

      // Assert
      expect(createMemory).toHaveBeenCalledExactlyOnceWith({
        tokenLimit: 4000,
        shortTermTokenLimitRatio: 0.7,
      });
      expect(result).toBe(mockMemory);
      expect(getGlobalMemory()).toBe(mockMemory);
    });

    it('should return existing memory instance', () => {
      // Arrange
      const mockMemory = { test: 'memory' };
      setGlobalMemory(mockMemory as never);

      // Act
      const result = getMemory();

      // Assert
      expect(createMemory).not.toHaveBeenCalled();
      expect(result).toBe(mockMemory);
    });

    it('should create memory with correct configuration', () => {
      // Arrange
      const mockMemory = { test: 'memory' };
      vi.mocked(createMemory).mockReturnValue(mockMemory as never);

      // Act
      getMemory();

      // Assert
      expect(createMemory).toHaveBeenCalledExactlyOnceWith({
        tokenLimit: 4000,
        shortTermTokenLimitRatio: 0.7,
      });
    });
  });
});
