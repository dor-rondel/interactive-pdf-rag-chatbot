import { ChatOrUpload } from './components/ChatOrUpload';
import Header from './components/Header';

/**
 * Home page component for the Interactive PDF RAG Chatbot application.
 * Renders the main layout with header and chat/upload interface.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4 lg:p-8 text-center bg-gray-100">
      <Header />
      <div className="flex flex-1 w-full text-left">
        <ChatOrUpload />
      </div>
    </main>
  );
}
