import Header from './components/Header';
import { PdfUpload } from './components/pdf/PdfUpload';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-100">
      <Header />
      <div className="flex flex-1 items-center justify-center">
        <PdfUpload />
      </div>
    </main>
  );
}
