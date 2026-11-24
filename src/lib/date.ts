// Local-date helpers. Dates are stored as 'YYYY-MM-DD' in the user's local time zone.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function weekdayJa(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()];
}

/** '11月24日（火）' */
export function formatDateJa(iso: string, withWeekday = true): string {
  const d = parseISODate(iso);
  const base = `${d.getMonth() + 1}月${d.getDate()}日`;
  return withWeekday ? `${base}（${WEEKDAYS[d.getDay()]}）` : base;
}

/** '11/24' */
export function formatShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Monday-start week containing `iso`, as 7 ISO dates. */
export function weekOf(iso: string): string[] {
  const d = parseISODate(iso);
  const offset = (d.getDay() + 6) % 7; // Mon=0
  const monday = addDays(iso, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function relativeDayJa(iso: string): string | null {
  const t = todayISO();
  if (iso === t) return '今日';
  if (iso === addDays(t, -1)) return '昨日';
  return null;
}
