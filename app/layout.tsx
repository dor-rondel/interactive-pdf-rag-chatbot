import type { Metadata } from 'next';
import './globals.css';

import Script from 'next/script';

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
      <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-67RM782ZNV"
          strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-67RM782ZNV');
        `}
      </Script>
    </html>
  );
}
