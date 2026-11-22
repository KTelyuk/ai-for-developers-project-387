import { Link } from 'react-router';
import { Button } from '@/components/ui/button.tsx';

// Неизвестный адрес. Ссылка только на главную: гостю раздел владельца не показывается.
export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight">Страница не найдена</h1>
      <p className="text-muted-foreground">Проверьте адрес или начните с главной страницы.</p>
      <Button asChild size="lg" className="h-11 px-6 text-base">
        <Link to="/">На главную</Link>
      </Button>
    </div>
  );
}
