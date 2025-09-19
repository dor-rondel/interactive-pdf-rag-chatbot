import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interactive PDF RAG Chatbot',
  description: 'A RAG chatbot for large PDF files.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
