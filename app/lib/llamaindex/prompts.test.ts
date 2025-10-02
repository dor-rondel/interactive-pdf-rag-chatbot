import { describe, it, expect } from 'vitest';
import { buildPrompt, NO_RESULTS_MESSAGE } from './prompts';

describe('prompts', () => {
  describe('NO_RESULTS_MESSAGE', () => {
    it('should export the correct error message', () => {
      expect(NO_RESULTS_MESSAGE).toBe(
        "I couldn't find any relevant information in the uploaded document to answer your question. Please try rephrasing your question or upload a more relevant document."
      );
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt with history, context, and question', () => {
      // Arrange
      const historyText = 'user: Hello\nassistant: Hi there!';
      const context =
        '[1] Document content about AI\n[2] More content about machine learning';
      const question = 'What is artificial intelligence?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toBe(
        `You are a helpful assistant that answers questions based on the provided context from uploaded documents and previous conversation.

Previous conversation:
user: Hello
assistant: Hi there!

Document context:
[1] Document content about AI
[2] More content about machine learning

Current question: What is artificial intelligence?

Please provide a comprehensive answer considering both the document context and our conversation history. If the context doesn't contain enough information to fully answer the question, please say so and explain what information is available.`
      );
    });

    it('should build prompt without history when historyText is empty', () => {
      // Arrange
      const historyText = '';
      const context = '[1] Document content about AI';
      const question = 'What is artificial intelligence?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toBe(
        `You are a helpful assistant that answers questions based on the provided context from uploaded documents and previous conversation.

Document context:
[1] Document content about AI

Current question: What is artificial intelligence?

Please provide a comprehensive answer considering both the document context and our conversation history. If the context doesn't contain enough information to fully answer the question, please say so and explain what information is available.`
      );
    });

    it('should build prompt without history when historyText is whitespace', () => {
      // Arrange
      const historyText = '   ';
      const context = '[1] Document content';
      const question = 'Test question?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).not.toContain('Previous conversation:');
      expect(result).toContain('Document context:\n[1] Document content');
      expect(result).toContain('Current question: Test question?');
    });

    it('should handle empty context', () => {
      // Arrange
      const historyText = 'user: Hello';
      const context = '';
      const question = 'What can you tell me?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toContain('Previous conversation:\nuser: Hello');
      expect(result).toContain('Document context:\n');
      expect(result).toContain('Current question: What can you tell me?');
    });

    it('should handle empty question', () => {
      // Arrange
      const historyText = 'user: Hello';
      const context = '[1] Some content';
      const question = '';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toContain('Previous conversation:\nuser: Hello');
      expect(result).toContain('Document context:\n[1] Some content');
      expect(result).toContain('Current question: ');
    });

    it('should preserve newlines and formatting in inputs', () => {
      // Arrange
      const historyText =
        'user: First message\nassistant: Response\nuser: Follow up';
      const context =
        '[1] First paragraph\n\n[2] Second paragraph with\nmultiple lines';
      const question = 'Multi-line\nquestion?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toContain(
        'Previous conversation:\nuser: First message\nassistant: Response\nuser: Follow up'
      );
      expect(result).toContain(
        'Document context:\n[1] First paragraph\n\n[2] Second paragraph with\nmultiple lines'
      );
      expect(result).toContain('Current question: Multi-line\nquestion?');
    });

    it('should handle special characters in inputs', () => {
      // Arrange
      const historyText = 'user: What about "quotes" and & symbols?';
      const context = '[1] Content with $pecial ch@rs & symbols!';
      const question = 'How does this handle special chars: <>?';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toContain(
        'Previous conversation:\nuser: What about "quotes" and & symbols?'
      );
      expect(result).toContain(
        'Document context:\n[1] Content with $pecial ch@rs & symbols!'
      );
      expect(result).toContain(
        'Current question: How does this handle special chars: <>?'
      );
    });

    it('should maintain consistent structure regardless of input', () => {
      // Arrange
      const historyText = 'test';
      const context = 'test';
      const question = 'test';

      // Act
      const result = buildPrompt(historyText, context, question);

      // Assert
      expect(result).toMatch(/^You are a helpful assistant/);
      expect(result).toContain('Previous conversation:');
      expect(result).toContain('Document context:');
      expect(result).toContain('Current question:');
      expect(result).toContain('Please provide a comprehensive answer');
    });
  });
});
