# Interactive PDF RAG Chatbot - AI Context

## Project Overview

A RAG chatbot that enables users to upload PDF files as knowledge bases and chat with them. The chatbot will also display the PDF file in the UI. This application is designed for a single user at a time, simplifying the architecture by using API endpoints for chat functionality.

A key feature is the ability to scroll to the source of information in the PDF, providing users with context for the chatbot's answers. For example, if the answer is generated from a chunk on page 50, the UI will automatically scroll to that page.

## Architecture & Tech Stack

### Core Stack

- **Framework**: Next.js 15 (full-stack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **RAG Pipeline**: LlamaIndex.js
- **Vector Store**: In-memory LlamaIndex vectorstore
- **PDF Rendering**: pdf.js
- **LLM**: Gemini
- **Embeddings**: Gemini

### Key Components

```
/app                    # Next.js 15 app router
  /actions              # Server Actions
    /upload.ts             # PDF upload action (includes chunking & embedding)
  /api                  # API routes
    /chat               # Chat endpoint
  /components           # React components
    /ui                 # Reusable UI components
    /chat               # Chat-specific components
    /pdf                # PDF viewer components
  /lib                  # Utilities & services
    /llamaindex         # LlamaIndex integrations
    /pdf                # pdf.js utilities
    /theme              # Styling theme & constants
/tests                  # Test files
  /e2e                  # Playwright E2E tests (*.spec.ts)
.env.local.example      # Example environment variables
```

## Environment Variables

This project uses environment variables to manage sensitive information like API keys. A `.env.local.example` file is provided to show the required variables. Copy this file to `.env.local` and fill in the values.

- `GEMINI_API_KEY`: Your API key for the Gemini models.

## Development Workflow

### Setup

```bash
npm install
```

### Core Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run test:unit` - Run Vitest unit/integration tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is formatted

## RAG Pipeline Flow

1.  **Upload**: User uploads PDF file via Server Action.
2.  **Chunk & Embed**: LlamaIndex.js splits the document and uses the Gemini API to create embeddings.
3.  **Store**: An in-memory vector store persists the vectors for the user's session.
4.  **Query**: User asks a question via an API endpoint.
5.  **Retrieve**: LlamaIndex.js finds the most relevant chunks from the vector store.
6.  **Generate**: The Gemini API generates a response based on the retrieved chunks.
7.  **Stream**: The response is streamed back to the UI, along with the source page number.

## Code Style & Patterns

### React/Next.js

- Use App Router (Next.js 15)
- Prefer Server Actions over API routes when possible
- Server Components by default, Client Components only when needed
- TypeScript strict mode
- Functional components with hooks
- Add `import 'server-only';` to server-only files (exclude page.tsx/layout.tsx)
- Use `type` instead of `interface` for TypeScript objects

### Styling

- Tailwind CSS for utility-first styling
- Design system with consistent theme tokens
- Component-based styling patterns
- Dark/light mode support
- Responsive design mobile-first

### File Organization

- Group by feature, not by type
- Co-locate tests with components using `.test.ts` suffix
- Keep Server Actions simple and focused
- Separate UI components from business logic
- All code must be formatted with Prettier (see `.prettierrc`)

### Code Formatting

- **Prettier Config**: Follow `.prettierrc` configuration strictly
- **Line Length**: 80 characters max
- **Quotes**: Single quotes for JS/TS, JSX
- **Semicolons**: Always include
- **Trailing Commas**: ES5 compatible
- **Indentation**: 2 spaces, no tabs

### Best Practices & Clean Code

- **SOC (Separation of Concerns)**: Keep business logic, UI, and data layers separate
- **DRY (Don't Repeat Yourself)**: Extract common functionality into reusable utilities
- **KISS (Keep It Simple, Stupid)**: Choose simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)**: Don't build features until they're needed
- **DYC (Document Your Code)**: Use JSDoc comments for functions and complex logic
- **Return Early**: Use early returns to reduce nesting and improve readability
- **Input Validation**: Never trust client input; always validate and sanitize
- **Static Typing**: Do not use `any` we're using ESLint in strict mode
- **No Unused Variables**: Only create variables if they're used, whether it be imports or catch blocks etc.

### Development Principles

- Keep PRs small and focused on single concerns
- Avoid over-engineering and making assumptions
- Minimize new NPM packages - use built-in solutions when possible
- Write self-documenting code with clear naming
- Validate all data at boundaries (client → server, external APIs)

### Naming

- Components: PascalCase (`ChatInterface`)
- Files: kebab-case (`chat-interface.tsx`)
- Functions: camelCase (`embedDocument`)
- Actions: camelCase (`uploadFileAction`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- CSS Classes: Tailwind utilities + semantic names
- Unit Tests: Co-located with `.test.ts` suffix (`chat-interface.test.ts`)
- E2E Tests: In `/tests/e2e/` with `.spec.ts` suffix (`upload-flow.spec.ts`)

## Styling Theme & Design System

### Color Palette

```typescript
// Primary theme colors
const theme = {
  primary: {
    50: '#f0f9ff', // Light blue backgrounds
    500: '#3b82f6', // Primary blue
    900: '#1e3a8a', // Dark blue
  },
  neutral: {
    50: '#f9fafb', // Light backgrounds
    100: '#f3f4f6', // Card backgrounds
    500: '#6b7280', // Secondary text
    900: '#111827', // Primary text
  },
  success: '#10b981', // File upload success
  warning: '#f59e0b', // Processing states
  error: '#ef4444', // Error states
};
```

### Typography

- **Headings**: Inter font family, semibold weights
- **Body**: Inter font family, normal weights
- **Code**: JetBrains Mono, monospace
- **Scale**: text-sm, text-base, text-lg, text-xl, text-2xl

### Component Patterns

- **Cards**: Subtle borders, soft shadows, rounded corners
- **Buttons**: Primary (filled), Secondary (outlined), Ghost (text)
- **Input**: Clean borders, focus rings, proper contrast
- **Chat Bubbles**: Distinct user/assistant styling
- **Loading States**: Skeleton screens, progress indicators

### Layout Principles

- **Spacing**: Consistent 4px grid (space-1, space-4, space-8)
- **Containers**: Max-width constraints, centered content
- **Responsive**: Mobile-first, clean breakpoints
- **Accessibility**: Proper contrast ratios, focus indicators

## Implementation Approach

### Think Through Steps

1. **Identify the core problem**
2. **Choose the simplest solution**
3. **Implement incrementally**
4. **Test early and often**

### Avoid Overthinking

- Start with basic implementations
- Optimize when there's a clear need
- Prefer composition over abstraction
- Use established patterns from the ecosystem

## Security Constraints

### Technical Constraints

- File uploads limited to PDF format
- Reasonable file size limits
- Graceful error handling
- Proper cleanup of temporary files

## RAG Pipeline Flow

1. **Upload**: User uploads PDF file via Server Action
2. **Chunk & Embed**: LlamaIndex.js splits document and creates embeddings
3. **Store**: In-memory vector store persists vectors for the session
4. **Query**: User asks question via Server Action
5. **Retrieve**: LlamaIndex.js finds relevant chunks
6. **Generate**: A configured LLM generates a response
7. **Stream**: Response streamed back to UI

## Testing Strategy

### Unit Tests (Vitest)

- Do not write tests that require disabling TypeScript (e.g. `// @ts-expect-error`), as TypeScript already handles type errors at compile time.
- Make test assertions as strict as possible to catch unintended changes. For example, use `toStrictEqual()` instead of `toEqual()`, `toBe(true)` instead of `toBeTruthy()`, etc. If applicable: use exact object matching instead of `expect.objectContaining()`, `toHaveBeenCalledTimes(1)` instead of `toHaveBeenCalled()`, and `toHaveBeenCalledExactlyOnceWith()` instead of `toHaveBeenCalledWith()`.
- Use `toHaveBeenCalledExactlyOnceWith()` instead of separate `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith()` assertions to combine both checks into a single assertion.
- Prefer `vi.mock()` to mock modules instead of `vi.doMock()` whenever possible.
- Change the value of environment variables on `process.env` using `vi.stubEnv()`.
- Mock global functions and variables (e.g. `fetch`, `console`, `window`, etc.) using `vi.stubGlobal()`.
- Use `vi.mocked()` for type safety when chaining mock methods or properties (e.g. `vi.mocked(fetch).mockResolvedValue(...)`).
- In `expect()` statements, always use the original function name (e.g. use `expect(fetch)` instead of `expect(vi.mocked(fetch))` or `expect(fetchMock)`), unless you need to access mock methods or properties - in this case, use `vi.mocked()`.
- Do not call `vi.unstubAllGlobals()`, `vi.clearAllMocks()`, `vi.resetAllMocks()`, or `vi.restoreAllMocks()`. The Vitest config already handles cleanup (`mockReset: true`, `unstubGlobals: true`, `unstubEnvs: true`).

### E2E Tests (Playwright)

- Located in `/tests/e2e/` with `.spec.ts` suffix

## Persona & Communication Style

**As an AI assistant for this project:**

- Be direct and actionable
- Focus on practical implementation
- Suggest the simplest working solution first
- Think incrementally - what's the next smallest step?
- Avoid over-engineering - this is a focused tool, not a platform
- Always format generated code according to `.prettierrc` configuration
- Follow clean code principles: SOC, DRY, KISS, YAGNI
- Use early returns and proper input validation
- Minimize dependencies and keep PRs focused

**Code Review Mindset:**

- Is this the simplest solution that works?
- Is this testable without TypeScript disables?
- Will this scale reasonably?
- Is the error handling appropriate?
- Is the code properly formatted with Prettier?
- Are inputs properly validated and sanitized?
- Does this follow clean code principles?

## Next Steps Thinking

Always consider:

1. What's the minimal viable implementation?
2. What could break and how do we handle it?
3. How will we test this?
4. What's the next logical feature to build?
