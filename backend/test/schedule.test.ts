import { describe, expect, it } from 'vitest';
import { isIntervalFree, overlaps, type Interval } from '../src/overlap.ts';
import {
  daySlots,
  isInWindow,
  rangeDates,
  todayInOwnerZone,
  windowDates,
} from '../src/schedule.ts';

// Понедельник, 16 ноября 2026, 08:00 по Алматы — до начала рабочего дня.
const MONDAY_EARLY = new Date('2026-11-16T08:00:00+05:00');

function times(
  date: string,
  durationMinutes: number,
  { now = MONDAY_EARLY, bookings = [] }: { now?: Date; bookings?: Interval[] } = {},
) {
  return daySlots({ date, durationMinutes, bookings, now }).map((slot) =>
    slot.startAt.slice(11, 16),
  );
}

describe('расписание: слоты дня', () => {
  it('слот — начало и конец ISO 8601 со смещением +05:00', () => {
    const slots = daySlots({
      date: '2026-11-16',
      durationMinutes: 15,
      bookings: [],
      now: MONDAY_EARLY,
    });

    expect(slots[0]).toEqual({
      startAt: '2026-11-16T09:00:00+05:00',
      endAt: '2026-11-16T09:15:00+05:00',
    });
    expect(slots.at(-1)).toEqual({
      startAt: '2026-11-16T17:45:00+05:00',
      endAt: '2026-11-16T18:00:00+05:00',
    });
  });

  // Последний старт до обеда, первый после обеда, последний старт дня и число слотов.
  it.each([
    [15, '12:45', '14:00', '17:45', 32],
    [30, '12:30', '14:00', '17:30', 30],
    [45, '12:15', '14:00', '17:15', 28],
    [60, '12:00', '14:00', '17:00', 26],
  ])(
    '%i минут: до обеда не позже %s, после — с %s, последний старт %s',
    (duration, lastBeforeLunch, firstAfterLunch, lastOfDay, count) => {
      const result = times('2026-11-16', duration);

      expect(result[0]).toBe('09:00');
      expect(result.filter((time) => time < '13:00').at(-1)).toBe(lastBeforeLunch);
      expect(result.find((time) => time >= '13:00')).toBe(firstAfterLunch);
      expect(result.at(-1)).toBe(lastOfDay);
      expect(result).toHaveLength(count);
    },
  );

  it('старты идут с шагом 15 минут', () => {
    expect(times('2026-11-16', 60).slice(0, 4)).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });

  it.each([
    ['суббота', '2026-11-21'],
    ['воскресенье', '2026-11-22'],
  ])('%s — выходной, слотов нет', (_name, date) => {
    expect(times(date, 15)).toEqual([]);
  });

  it('первый и последний день окна открыты, следующий за окном и вчерашний — нет', () => {
    expect(times('2026-11-16', 15)).toHaveLength(32);
    // 29 ноября — воскресенье: последний будний день окна — пятница 27-го.
    expect(times('2026-11-27', 15)).toHaveLength(32);
    const tuesdayNow = new Date('2026-11-17T08:00:00+05:00');
    expect(times('2026-11-30', 15, { now: tuesdayNow })).toHaveLength(32);
    expect(times('2026-12-01', 15, { now: tuesdayNow })).toEqual([]);
    expect(times('2026-11-16', 15, { now: tuesdayNow })).toEqual([]);
  });

  it('«сейчас» внутри рабочего дня: наступившие старты недоступны, включая текущий', () => {
    const now = new Date('2026-11-16T10:00:00+05:00');

    expect(times('2026-11-16', 30, { now })[0]).toBe('10:15');
    expect(times('2026-11-16', 30, { now: new Date('2026-11-16T10:07:00+05:00') })[0]).toBe(
      '10:15',
    );
  });

  it('после конца рабочего дня сегодня слотов нет, завтра — все', () => {
    const now = new Date('2026-11-16T17:45:00+05:00');

    expect(times('2026-11-16', 15, { now })).toEqual([]);
    expect(times('2026-11-17', 15, { now })).toHaveLength(32);
  });

  it('сегодня считается по Алматы: 20:00 UTC — уже следующий день', () => {
    // 2026-11-16T20:00Z = 17 ноября 01:00 по Алматы.
    const now = new Date('2026-11-16T20:00:00Z');

    expect(todayInOwnerZone(now)).toBe('2026-11-17');
    expect(times('2026-11-16', 15, { now })).toEqual([]);
    expect(times('2026-11-17', 15, { now })[0]).toBe('09:00');
  });

  it('слоты, пересекающиеся с записями любого типа, недоступны; впритык — можно', () => {
    const bookings = [
      { startAt: '2026-11-16T10:00:00+05:00', endAt: '2026-11-16T11:00:00+05:00' },
      // Та же запись в UTC: сравниваются моменты, а не строки.
      { startAt: '2026-11-16T10:00:00Z', endAt: '2026-11-16T10:15:00Z' },
    ];

    const result = times('2026-11-16', 30, { bookings });

    expect(result).toContain('09:30');
    expect(result).not.toContain('09:45');
    expect(result).not.toContain('10:30');
    expect(result).toContain('11:00');
    expect(result).not.toContain('15:00');
    expect(result).toContain('15:15');
  });
});

describe('расписание: окно записи', () => {
  it('14 календарных дней начиная с сегодняшнего по Алматы', () => {
    const dates = windowDates(MONDAY_EARLY);

    expect(dates).toHaveLength(14);
    expect(dates[0]).toBe('2026-11-16');
    expect(dates[13]).toBe('2026-11-29');
  });

  it('окно переходит через границу месяца и года', () => {
    expect(windowDates(new Date('2026-12-25T12:00:00+05:00')).slice(6, 8)).toEqual([
      '2026-12-31',
      '2027-01-01',
    ]);
  });

  it.each([
    ['сегодня', '2026-11-16', true],
    ['последний день', '2026-11-29', true],
    ['вчера', '2026-11-15', false],
    ['за окном', '2026-11-30', false],
    ['несуществующая дата', '2026-11-31', false],
    ['не дата', 'tomorrow', false],
  ])('%s (%s) в окне: %s', (_name, date, expected) => {
    expect(isInWindow(date, MONDAY_EARLY)).toBe(expected);
  });
});

describe('расписание: диапазон дней', () => {
  it('дни от начала до конца включительно, через границу месяца', () => {
    expect(rangeDates('2026-11-29', '2026-12-02')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });

  it('один день', () => {
    expect(rangeDates('2026-11-16', '2026-11-16')).toEqual(['2026-11-16']);
  });

  it.each([
    ['длиннее окна', '2026-11-16', '2026-11-30'],
    ['конец раньше начала', '2026-11-17', '2026-11-16'],
    ['несуществующее начало', '2026-02-30', '2026-03-02'],
    ['несуществующий конец', '2026-11-16', '2026-11-31'],
    ['не дата', 'tomorrow', '2026-11-16'],
  ])('%s — нет диапазона', (_name, from, to) => {
    expect(rangeDates(from, to)).toBeUndefined();
  });
});

describe('пересечения', () => {
  const booking = { startAt: '2026-11-16T10:00:00+05:00', endAt: '2026-11-16T11:00:00+05:00' };

  it.each([
    ['точное совпадение', '10:00', '11:00', true],
    ['частичное наложение в начале', '09:30', '10:30', true],
    ['частичное наложение в конце', '10:45', '11:15', true],
    ['вложенный интервал', '10:15', '10:30', true],
    ['охватывающий интервал', '09:00', '12:00', true],
    ['впритык до', '09:00', '10:00', false],
    ['впритык после', '11:00', '11:30', false],
  ])('%s: %s–%s пересекается — %s', (_name, start, end, expected) => {
    const interval = {
      startAt: `2026-11-16T${start}:00+05:00`,
      endAt: `2026-11-16T${end}:00+05:00`,
    };

    expect(overlaps(interval, booking)).toBe(expected);
    expect(isIntervalFree(interval, [booking])).toBe(!expected);
  });

  it('без записей любой интервал свободен', () => {
    expect(isIntervalFree(booking, [])).toBe(true);
  });
});
