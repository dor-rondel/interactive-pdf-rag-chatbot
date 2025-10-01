import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interactive PDF RAG Chatbot',
  description: 'A RAG chatbot for large PDF files.',
};

/**
 * Root layout component for the application.
 * Provides the basic HTML structure and global styles.
 *
 * @param children - React components to render within the layout
 */
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
