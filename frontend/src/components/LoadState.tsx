import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';

// Состояния запроса на любом экране: загрузка объявляется как статус,
// ошибка сети — как предупреждение с кнопкой, которая повторяет запрос.
export function Loading({ children, className }: { children: string; className?: string }) {
  return (
    <p role="status" className={cn('text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function LoadError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center gap-3', className)}>
      <p className="text-destructive">{message}</p>
      <Button type="button" variant="outline" className="h-11 px-4" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}
