import { cn } from '@/app/lib/utils';

type MessageProps = {
  text: string;
  sender: 'user' | 'bot';
};

export function Message({ text, sender }: MessageProps) {
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
        {text}
      </div>
    </div>
  );
}
