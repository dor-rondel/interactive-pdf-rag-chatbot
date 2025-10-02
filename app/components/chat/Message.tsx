import { cn } from '@/app/lib/utils';

type MessageProps = {
  text: string;
  sender: 'user' | 'bot';
  sources?: Array<{
    content: string;
    score: number;
  }>;
};

/**
 * Individual message component that displays a chat message with styling based on sender.
 * Supports displaying source references for bot messages with relevance scores.
 *
 * @param text - The message text content
 * @param sender - Who sent the message ('user' or 'bot')
 * @param sources - Optional array of source references with content and relevance scores
 */
export function Message({ text, sender, sources }: MessageProps) {
  const isUser = sender === 'user';

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
          'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-50':
            !isUser,
        })}
      >
        <div>{text}</div>
        {sources && sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-neutral-300 dark:border-neutral-600">
            <div className="text-xs opacity-70 mb-1">Sources:</div>
            {sources.map((source, index) => (
              <div
                key={index}
                className="text-xs opacity-80 mb-1 p-2 bg-black/10 dark:bg-white/10 rounded"
              >
                <div className="truncate">{source.content}</div>
                <div className="text-right mt-1">
                  Score: {(source.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
