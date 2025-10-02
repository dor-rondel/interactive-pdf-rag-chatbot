import 'server-only';

import { createMemory, Memory } from 'llamaindex';

// Global memory instance for conversation history
let globalMemory: Memory | null = null;

/**
 * Reset the global memory state (for testing purposes)
 */
export function resetGlobalMemory() {
  globalMemory = null;
}

/**
 * Get the current global memory instance
 */
export function getGlobalMemory(): Memory | null {
  return globalMemory;
}

/**
 * Set the global memory instance
 */
export function setGlobalMemory(memory: Memory | null) {
  globalMemory = memory;
}

/**
 * Get or create the global memory instance
 * @returns Memory instance for conversation history
 */
export function getMemory(): Memory {
  if (!globalMemory) {
    globalMemory = createMemory({
      tokenLimit: 4000, // Reasonable limit for conversation history
      shortTermTokenLimitRatio: 0.7, // 70% for recent messages, 30% for context
    });
  }
  return globalMemory;
}
