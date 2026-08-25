// Utility functions for converting 24-hour / railway time to standard 12-hour AM/PM format

/**
 * Converts a time string (e.g. "14:30", "09:00", "00:15", "14:30:00") or time range (e.g. "09:00 - 11:30")
 * to standard 12-hour AM/PM format (e.g. "2:30 PM", "9:00 AM", "12:15 AM", "9:00 AM - 11:30 AM").
 */
export function formatTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return "";
  
  const trimmed = timeStr.trim();
  if (!trimmed) return "";

  // If already contains AM or PM, return cleaned string
  if (/\b(am|pm)\b/i.test(trimmed)) {
    return trimmed;
  }

  // If it's a range like "09:00 - 11:30" or "09:00-11:30"
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map(p => p.trim());
    if (parts.length === 2) {
      const start = formatSingleTimeTo12Hour(parts[0]);
      const end = formatSingleTimeTo12Hour(parts[1]);
      if (start && end) {
        return `${start} - ${end}`;
      }
    }
  }

  return formatSingleTimeTo12Hour(trimmed);
}

/**
 * Converts a single time string like "14:30" or "9:00" to "2:30 PM" or "9:00 AM".
 */
export function formatSingleTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (!trimmed) return "";

  if (/\b(am|pm)\b/i.test(trimmed)) {
    return trimmed;
  }

  // Match HH:MM or HH:MM:SS
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return trimmed;
  }

  const hours = parseInt(match[1], 10);
  const minutes = match[2];
  if (isNaN(hours) || hours < 0 || hours > 24) {
    return trimmed;
  }

  const period = hours >= 12 && hours < 24 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Derives the end time in 12-hour format. If no explicit end time is passed,
 * calculates startTime + 1 hour as default window.
 */
export function getEndTimeString12Hour(startTime: string, endTime?: string): string {
  if (endTime) {
    return formatTo12Hour(endTime);
  }
  if (!startTime) return "";

  try {
    const cleanStart = startTime.includes("-") ? startTime.split("-")[0].trim() : startTime.trim();
    const match = cleanStart.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isNaN(hours) || isNaN(minutes)) return "";

    const endHours = (hours + 1) % 24;
    const endHoursStr = endHours.toString().padStart(2, "0");
    const endMinutesStr = minutes.toString().padStart(2, "0");
    
    return formatSingleTimeTo12Hour(`${endHoursStr}:${endMinutesStr}`);
  } catch {
    return "";
  }
}

/**
 * Returns a full formatted time range (e.g. "9:00 AM - 10:00 AM") given start and optional end time.
 */
export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime) return "";
  const start12 = formatTo12Hour(startTime);
  const end12 = endTime ? formatTo12Hour(endTime) : getEndTimeString12Hour(startTime);
  if (start12 && end12) {
    return `${start12} - ${end12}`;
  }
  return start12 || "";
}

/**
 * Formats a Date / timestamp to standard 12-hour AM/PM string (e.g., "10:45 AM" or "10:45:30 AM")
 */
export function formatTimestamp12Hour(
  timestamp: string | number | Date,
  options?: { includeSeconds?: boolean; includeDate?: boolean }
): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";

    const timeStr = d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: options?.includeSeconds ? "2-digit" : undefined,
      hour12: true
    });

    if (options?.includeDate) {
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric"
      });
      return `${dateStr}, ${timeStr}`;
    }

    return timeStr;
  } catch {
    return "";
  }
}

/**
 * Returns YYYY-MM-DD in local timezone (avoiding UTC offset day jumps)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to a local noon Date object to avoid DST midnight boundary edge cases
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date();
}

/**
 * Formats YYYY-MM-DD into readable date strings like "Today, Aug 23" or "Sun, Aug 23, 2026"
 */
export function formatDisplayDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString("en-US", options || { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Returns friendly relative indicator ("Today", "Tomorrow", "Yesterday", or "In X days", "X days ago")
 */
export function getRelativeDateLabel(dateStr: string): { label: string; isToday: boolean; isTomorrow: boolean; isYesterday: boolean } {
  const todayStr = getLocalDateString(new Date());
  if (dateStr === todayStr) {
    return { label: "Today", isToday: true, isTomorrow: false, isYesterday: false };
  }

  const d = parseLocalDate(dateStr);
  const today = parseLocalDate(todayStr);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { label: "Tomorrow", isToday: false, isTomorrow: true, isYesterday: false };
  }
  if (diffDays === -1) {
    return { label: "Yesterday", isToday: false, isTomorrow: false, isYesterday: true };
  }
  if (diffDays > 1) {
    return { label: `In ${diffDays}d`, isToday: false, isTomorrow: false, isYesterday: false };
  }
  return { label: `${Math.abs(diffDays)}d ago`, isToday: false, isTomorrow: false, isYesterday: false };
}
