'use client';

import { useState } from 'react';
import { PdfUpload } from './pdf/PdfUpload';

import { ChatInterface } from './chat/ChatInterface';

/**
 * Main application component that manages the state between PDF upload and chat interface.
 * Shows PDF upload interface initially, then switches to chat after successful upload.
 */
export function ChatOrUpload() {
  const [isChatting, setIsChatting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  /**
   * Handles successful PDF upload by switching to chat mode and storing the file
   */
  const handleUploadSuccess = (file: File) => {
    setUploadedFile(file);
    setIsChatting(true);
  };

  return (
    <div className="w-full h-full p-4">
      {isChatting ? (
        <ChatInterface setChatting={setIsChatting} pdfFile={uploadedFile} />
      ) : (
        <PdfUpload onUploadSuccess={handleUploadSuccess} />
      )}
    </div>
  );
}
