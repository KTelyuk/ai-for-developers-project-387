import { NavLink } from 'react-router';
import { cn } from '@/lib/utils.ts';

const LINKS = [
  { to: '/admin/event-types', label: 'Типы встреч' },
  { to: '/admin/bookings', label: 'Встречи' },
];

// Навигация внутри раздела владельца. В шапке сайта её нет: гость не видит ссылок на /admin.
export function AdminNav() {
  return (
    <nav aria-label="Раздел владельца" className="border-b">
      <ul className="flex gap-1">
        {LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  '-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
