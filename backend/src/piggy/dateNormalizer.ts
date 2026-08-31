/**
 * dateNormalizer.ts
 *
 * Centralized, deterministic date & time parser.
 * Handles impossible date validation (Feb 31 guard), STT typo variations,
 * past-time rollover policy, relative days, and timezone awareness.
 */

export interface NormalizedDateTime {
  valid: boolean;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  error?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
};

/**
 * Checks if a year, month (1-12), and day combination is a valid calendar date.
 * Rejects impossible dates like February 31 or April 31.
 */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const daysInMonth = [
    31,
    (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, // Feb
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];

  return day <= daysInMonth[month - 1];
}

/**
 * Parses STT / text time string into HH:mm (24-hour format).
 */
export function parseNormalizedTime(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim().replace(/p\.m\./g, "pm").replace(/a\.m\./g, "am");

  // Word numbers: "seven pm" -> "7 pm"
  let cleaned = lower;
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "g"), String(num));
  }

  // 1. Look for AM/PM time anywhere in text (e.g. "today 10 pm", "10 pm today", "at 7:30 pm")
  const ampmMatch = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(cleaned);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const min = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === "pm";

    if (hour >= 1 && hour <= 12 && min >= 0 && min <= 59) {
      if (isPm && hour !== 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
  }

  // 2. Look for 24-hour format anywhere (e.g. 19:00, 07:30)
  const format24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(cleaned);
  if (format24) {
    const hour = parseInt(format24[1], 10);
    const min = parseInt(format24[2], 10);
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  // 3. Bare hour after "at" (e.g. "at 7")
  const atMatch = /\bat\s+(\d{1,2})\b/i.exec(cleaned);
  if (atMatch) {
    const hour = parseInt(atMatch[1], 10);
    if (hour >= 1 && hour <= 12) {
      const pmHour = hour < 12 ? hour + 12 : hour;
      return `${String(pmHour).padStart(2, "0")}:00`;
    }
  }

  // 4. Exact bare number (e.g. "7" or "10")
  const bareExact = /^(\d{1,2})$/.exec(cleaned.trim());
  if (bareExact) {
    const hour = parseInt(bareExact[1], 10);
    if (hour >= 1 && hour <= 23) {
      const pmHour = hour <= 12 ? (hour === 12 ? 12 : hour + 12) : hour;
      return `${String(pmHour).padStart(2, "0")}:00`;
    }
  }

  // 5. Time words
  if (/tonight|night/i.test(cleaned)) return "21:00";
  if (/evening/i.test(cleaned)) return "18:00";
  if (/afternoon/i.test(cleaned)) return "14:00";
  if (/morning/i.test(cleaned)) return "09:00";
  if (/noon/i.test(cleaned)) return "12:00";
  if (/midnight/i.test(cleaned)) return "00:00";

  return null;
}

/**
 * Helper to format a Date as YYYY-MM-DD in local calendar date,
 * avoiding UTC offset shifts caused by toISOString().
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses and resolves date strings into YYYY-MM-DD.
 * Rejects impossible calendar dates (e.g. Feb 31).
 */
export function parseNormalizedDate(
  text: string,
  referenceDate: Date = new Date(),
): { valid: boolean; date?: string; error?: string } {
  if (!text) return { valid: false, error: "No date string provided" };
  const lower = text.toLowerCase().trim();

  // Check impossible date strings like "february 31" or "2026-02-31" or "31/02/2026"
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lower);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);

    if (!isValidCalendarDate(y, m, d)) {
      return { valid: false, error: `Impossible calendar date: ${lower}` };
    }
    return { valid: true, date: lower };
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(lower);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);

    if (!isValidCalendarDate(y, m, d)) {
      return { valid: false, error: `Impossible calendar date: ${lower}` };
    }
    return {
      valid: true,
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    };
  }

  // Relative days (today, tomorrow, tonight, etc.)
  const today = new Date(referenceDate);

  if (/\b(today|tonight|this evening|this morning)\b/i.test(lower)) {
    return { valid: true, date: formatLocalDate(today) };
  }

  if (/\b(tomorrow|tmrw|tosay)\b/i.test(lower)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return { valid: true, date: formatLocalDate(tomorrow) };
  }

  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const shortMonthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // "February 31" or "Feb 31"
  const monthDayMatch = /([a-z]+)\s+(\d{1,2})/i.exec(lower);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1].toLowerCase();
    const dayVal = parseInt(monthDayMatch[2], 10);
    let monthIdx = monthNames.indexOf(monthStr);
    if (monthIdx === -1) monthIdx = shortMonthNames.indexOf(monthStr);

    if (monthIdx !== -1) {
      const year = referenceDate.getFullYear();
      if (!isValidCalendarDate(year, monthIdx + 1, dayVal)) {
        return { valid: false, error: `Impossible date: ${monthDayMatch[1]} ${dayVal} does not exist.` };
      }
      return {
        valid: true,
        date: `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(dayVal).padStart(2, "0")}`,
      };
    }
  }

  // Day of week (e.g. "friday", "next monday")
  const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < daysOfWeek.length; i++) {
    if (lower.includes(daysOfWeek[i])) {
      const targetDay = i;
      const currentDay = today.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence of this day

      const resultDate = new Date(today);
      resultDate.setDate(today.getDate() + diff);
      return { valid: true, date: formatLocalDate(resultDate) };
    }
  }

  return { valid: false, error: `Could not parse date "${text}"` };
}

/**
 * Resolves date and time together.
 * Relative date words ("today", "tomorrow") resolve against referenceDate without rolling forward.
 * Past-time rollover applies ONLY when no date input is specified.
 */
export function resolveDateAndTime(
  dateInput?: string,
  timeInput?: string,
  referenceDate: Date = new Date(),
): NormalizedDateTime {
  let resolvedDate = dateInput ? parseNormalizedDate(dateInput, referenceDate) : { valid: true, date: formatLocalDate(referenceDate) };
  const resolvedTime = timeInput ? parseNormalizedTime(timeInput) : undefined;

  if (!resolvedDate.valid) {
    return { valid: false, error: resolvedDate.error };
  }

  let dateStr = resolvedDate.date ?? formatLocalDate(referenceDate);

  // Past time rollover applies ONLY if date was NOT explicitly specified
  if (!dateInput && resolvedTime && dateStr === formatLocalDate(referenceDate)) {
    const [h, m] = resolvedTime.split(":").map(Number);
    const targetMoment = new Date(referenceDate);
    targetMoment.setHours(h, m, 0, 0);

    // If requested time is in the past by > 15 minutes, interpret as tomorrow
    if (targetMoment.getTime() < referenceDate.getTime() - 15 * 60 * 1000) {
      const tomorrow = new Date(referenceDate);
      tomorrow.setDate(referenceDate.getDate() + 1);
      dateStr = formatLocalDate(tomorrow);
      console.log(`[PIGGY][DATE-NORMALIZER] Past time ${resolvedTime} requested with no date. Rolling over date to ${dateStr}`);
    }
  }

  return {
    valid: true,
    date: dateStr,
    time: resolvedTime ?? undefined,
  };
}
