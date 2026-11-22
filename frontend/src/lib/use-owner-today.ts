import { useEffect, useState } from 'react';
import { ownerToday } from '@/lib/schedule.ts';

// Как часто сверять дату: окно записи сдвигается не позже чем через минуту после полуночи.
const CHECK_INTERVAL_MS = 30_000;

// Сегодняшняя дата по Алматы, которая меняется, пока страница открыта.
export function useOwnerToday(): string {
  const [today, setToday] = useState(() => ownerToday(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setToday(ownerToday(new Date())), CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return today;
}
