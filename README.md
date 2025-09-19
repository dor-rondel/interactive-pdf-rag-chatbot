# Interactive PDF RAG Chatbot

## Overview

A RAG chatbot that enables users to upload PDF files as knowledge bases and chat with them. The chatbot will also display the PDF file in the UI. This application is designed for a single user at a time.

## Features

- Upload PDF files.
- View PDF files in the UI.
- Chat with the PDF content.
- RAG pipeline for question answering.
- **Scroll to the source of information in the PDF to see the context of the answer.**

## Tech Stack

- **Framework**: Next.js 15 (full-stack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit/integration)
- **RAG Pipeline**: LlamaIndex.js
- **Vector Store**: In-memory LlamaIndex vectorstore
- **PDF Rendering**: pdf.js
- **LLM**: Gemini
- **Embeddings**: Gemini

## Getting Started

### Prerequisites

- Node.js >= 18.x
- pnpm
- A Gemini API key.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/interactive-pdf-rag-chatbot.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd interactive-pdf-rag-chatbot
    ```
3.  Install the dependencies:
    ```bash
    pnpm install
    ```
4.  Create a `.env.local` file by copying the `.env.local.example` file:
    ```bash
    cp .env.local.example .env.local
    ```
5.  Add your Gemini API key to the `.env.local` file:
    ```
    GEMINI_API_KEY=your-api-key
    ```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `pnpm dev`: Starts the development server.
- `pnpm build`: Creates a production build.
- `pnpm start`: Starts a production server.
- `pnpm test`: Runs unit tests with Vitest.
- `pnpm lint`: Lints the code.
- `pnpm format`: Formats the code with Prettier.
- `pnpm format:check`: Checks if the code is formatted.
