import { Link } from 'react-router';
import { Button } from '@/components/ui/button.tsx';
import { WINDOW_DAYS } from '@/lib/schedule.ts';

const steps = [
  {
    title: 'Выберите тип встречи',
    description: 'Например, короткое знакомство или подробная консультация.',
  },
  {
    title: 'Выберите день и время',
    description: `Свободные слоты на ближайшие ${WINDOW_DAYS} дней, по будням.`,
  },
  {
    title: 'Оставьте имя и email',
    description: 'И получите ссылку на запись — по ней её можно отменить.',
  },
];

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:py-20">
      <section className="flex flex-col items-start gap-6">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          Запишитесь на звонок в удобное время
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Выберите свободный слот в календаре и забронируйте его за минуту — без регистрации и
          переписки.
        </p>
        <Button asChild size="lg" className="h-11 px-6 text-base">
          <Link to="/book">Записаться</Link>
        </Button>
      </section>

      <section aria-labelledby="how-it-works" className="flex flex-col gap-6">
        <h2 id="how-it-works" className="text-2xl font-semibold">
          Как это работает
        </h2>
        <ol aria-labelledby="how-it-works" className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-xl border p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
