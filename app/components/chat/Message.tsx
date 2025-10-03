import { cn } from '@/app/lib/utils';

type MessageProps = {
  text: string;
  sender: 'user' | 'bot';
  sources?: Array<{
    content: string;
    score: number;
    page?: number;
  }>;
  onPageClick?: (pageNumber: number) => void;
};

/**
 * Individual message component that displays a chat message with styling based on sender.
 * Supports displaying source references for bot messages with relevance scores and page numbers.
 * Page numbers are clickable to navigate to the corresponding PDF page.
 *
 * @param text - The message text content
 * @param sender - Who sent the message ('user' or 'bot')
 * @param sources - Optional array of source references with content, relevance scores, and page numbers
 * @param onPageClick - Optional callback when a page reference is clicked
 */
export function Message({ text, sender, sources, onPageClick }: MessageProps) {
  const isUser = sender === 'user';

  const handlePageClick = (pageNumber: number) => {
    if (onPageClick) {
      onPageClick(pageNumber);
    }
  };

  return (
    <div
      className={cn('flex', {
        'justify-end': isUser,
        'justify-start': !isUser,
      })}
    >
      <div
        className={cn('px-4 py-2 rounded-lg max-w-[80%]', {
          'bg-primary-500 text-white': isUser,
          'bg-neutral-200 text-neutral-900': !isUser,
        })}
      >
        <div>{text}</div>
        {sources && sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-300">
            <div className="text-xs opacity-70 mb-1">Sources:</div>
            {sources.map((source, index) => (
              <div
                key={index}
                className="text-xs opacity-80 mb-1 p-2 bg-black/10 rounded"
              >
                <div className="truncate mb-1">{source.content}</div>
                <div className="flex justify-between items-center">
                  <div className="text-right">
                    Score: {(source.score * 100).toFixed(1)}%
                  </div>
                  {source.page && (
                    <button
                      onClick={() => handlePageClick(source.page!)}
                      className="text-xs px-2 py-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                      title={`Go to page ${source.page}`}
                    >
                      Page {source.page}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
