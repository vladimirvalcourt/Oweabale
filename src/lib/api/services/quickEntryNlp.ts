/**
 * Lightweight natural-language hints for Quick Entry (US English, local timezone).
 * Returns a YYYY-MM-DD string or null if nothing matched.
 */

const MONTH_NAMES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Today or any date as `YYYY-MM-DD` in the local timezone (for `<input type="date">`). */
export function formatLocalISODate(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function nextWeekday(from: Date, targetWeekday: number) {
  let d = new Date(from);
  const delta = (targetWeekday - d.getDay() + 7) % 7;
  d = addDays(d, delta === 0 ? 7 : delta);
  return d;
}

/**
 * Parse phrases like "tomorrow", "next friday", "end of month", "15th", "jan 5".
 */
export function parseQuickEntryDateHint(input: string, now = new Date()): string | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  if (/\byesterday\b/.test(s)) return formatLocalISODate(addDays(now, -1));
  if (/\btoday\b/.test(s)) return formatLocalISODate(now);
  if (/\btomorrow\b/.test(s)) return formatLocalISODate(addDays(now, 1));

  if (/\bnext week\b/.test(s)) return formatLocalISODate(addDays(now, 7));
  if (/\bnext month\b/.test(s)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return formatLocalISODate(d);
  }

  if (/\bend of (the )?month\b/.test(s)) return formatLocalISODate(endOfMonth(now));
  if (/\bstart of (the )?month\b/.test(s)) return formatLocalISODate(startOfMonth(now));

  for (const [name, wd] of Object.entries(WEEKDAY_NAMES)) {
    const re = new RegExp(`\\bnext\\s+${name}\\b`);
    if (re.test(s)) return formatLocalISODate(nextWeekday(now, wd));
  }

  const monthDay = s.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthDay) {
    const mon = MONTH_NAMES[monthDay[1]];
    const day = Number(monthDay[2]);
    if (mon !== undefined && day >= 1 && day <= 31) {
      let y = now.getFullYear();
      let candidate = new Date(y, mon, day);
      if (candidate < startOfMonth(now)) y += 1;
      candidate = new Date(y, mon, day);
      return formatLocalISODate(candidate);
    }
  }

  const dom = s.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/);
  if (dom) {
    const day = Number(dom[1]);
    if (day >= 1 && day <= 31) {
      let y = now.getFullYear();
      let m = now.getMonth();
      let candidate = new Date(y, m, day);
      if (candidate < now) {
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
        candidate = new Date(y, m, day);
      }
      return formatLocalISODate(candidate);
    }
  }

  return null;
}
