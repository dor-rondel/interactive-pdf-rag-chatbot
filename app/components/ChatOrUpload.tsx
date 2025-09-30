'use client';

import { useState } from 'react';
import { PdfUpload } from './pdf/PdfUpload';

import { ChatInterface } from './chat/ChatInterface';

export function ChatOrUpload() {
  const [isChatting, setIsChatting] = useState(false);

  const handleUploadSuccess = () => {
    setIsChatting(true);
  };

  return (
    <div className="w-full h-full p-4">
      {isChatting ? (
        <ChatInterface setChatting={setIsChatting} />
      ) : (
        <PdfUpload onUploadSuccess={handleUploadSuccess} />
      )}
    </div>
  );
}
