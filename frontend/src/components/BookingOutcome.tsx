import { Link } from 'react-router';
import { Button } from '@/components/ui/button.tsx';

// Итог страницы, когда записи показать нельзя: заголовок и ссылки дальше.
export function Outcome({
  title,
  text,
  rebook,
}: {
  title: string;
  text: string;
  rebook?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <div className="flex flex-wrap gap-2">
        {rebook ? (
          <Button asChild size="lg" className="h-11 px-6">
            <Link to="/book">Записаться снова</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="lg" className="h-11 px-6">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}

export function NotFoundOutcome() {
  return (
    <Outcome
      title="Запись не найдена"
      text="Возможно, её уже отменили или ссылка устарела."
      rebook
    />
  );
}

export function UnavailableOutcome() {
  return (
    <Outcome
      title="Запись недоступна"
      text="Ссылка неверна. Откройте ссылку, которую получили при записи."
    />
  );
}
