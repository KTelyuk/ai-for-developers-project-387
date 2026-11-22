import { CalendarDays } from 'lucide-react';
import { Link, useLocation } from 'react-router';

// В разделе владельца логотип ведёт на его главную `/admin`, у гостя — на главную сайта:
// так владелец не выпадает в гостевой интерфейс, а гость не видит ссылок на /admin.
export function SiteHeader() {
  const { pathname } = useLocation();
  const inAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link
          to={inAdmin ? '/admin' : '/'}
          className="flex min-h-11 items-center gap-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CalendarDays className="size-5" aria-hidden="true" />
          Календарь звонков
        </Link>
      </div>
    </header>
  );
}
