// Scheduling rules and time-zone helpers.
// The clinic works in Toronto time, but servers (e.g. Vercel) run in UTC, so
// every slot is calculated in the clinic's zone and stored as a UTC instant.

export const CLINIC_TZ = "America/Toronto";
export const SLOT_MINUTES = 30;
export const OPEN_HOUR = 9; // first slot starts 9:00
export const CLOSE_HOUR = 17; // last slot ends 17:00
export const BOOKING_WINDOW_DAYS = 14; // how far ahead patients can book
export const MIN_LEAD_MINUTES = 60; // can't book a slot starting within the hour
export const HOLD_MINUTES = 35; // unpaid bookings release their slot after this

/** Offset (in ms) between UTC and `timeZone` at the given instant. Toronto is negative. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const instantToSecond = date.getTime() - date.getUTCMilliseconds();
  return wallClockAsUtc - instantToSecond;
}

/** "2026-11-25" + "09:30" in the clinic's zone -> the matching UTC Date. Handles DST. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone = CLINIC_TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const firstOffset = tzOffsetMs(new Date(guess), timeZone);
  let result = guess - firstOffset;
  const secondOffset = tzOffsetMs(new Date(result), timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return new Date(result);
}

/** The calendar date ("YYYY-MM-DD") of an instant, as seen in the clinic. */
export function clinicDateString(date: Date, timeZone = CLINIC_TZ): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

/** Weekdays (clinic dates) inside the booking window, starting today. */
export function upcomingClinicDays(now = new Date(), windowDays = BOOKING_WINDOW_DAYS): string[] {
  const today = clinicDateString(now);
  const days: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const day = addDays(today, i);
    if (!isWeekend(day)) days.push(day);
  }
  return days;
}

/** All slot start times (UTC) for one clinic day: 9:00, 9:30 ... 16:30. */
export function slotStartsForDay(dateStr: string): Date[] {
  const slots: Date[] = [];
  for (let minutes = OPEN_HOUR * 60; minutes + SLOT_MINUTES <= CLOSE_HOUR * 60; minutes += SLOT_MINUTES) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    slots.push(zonedTimeToUtc(dateStr, `${hh}:${mm}`));
  }
  return slots;
}

/** True if `startsAt` is a real slot inside the booking window and far enough ahead. */
export function isBookableSlot(startsAt: Date, now = new Date()): boolean {
  if (Number.isNaN(startsAt.getTime())) return false;
  if (startsAt.getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) return false;
  const day = clinicDateString(startsAt);
  if (!upcomingClinicDays(now).includes(day)) return false;
  return slotStartsForDay(day).some((slot) => slot.getTime() === startsAt.getTime());
}

/** Unique key for "this clinician at this time". Backs the database double-booking guard. */
export function slotKey(clinicianId: string, startsAt: Date): string {
  return `${clinicianId}_${startsAt.toISOString()}`;
}

export function formatClinicDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatClinicTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: CLINIC_TZ, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatClinicDateTime(date: Date): string {
  return `${formatClinicDay(date)}, ${formatClinicTime(date)}`;
}

/** "2026-11-25" -> "Wed, Nov 25" without time-zone surprises. */
export function formatDayLabel(dateStr: string): string {
  return formatClinicDay(zonedTimeToUtc(dateStr, "12:00"));
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}
