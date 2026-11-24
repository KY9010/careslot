import { describe, expect, it } from "vitest";
import {
  clinicDateString,
  isBookableSlot,
  isWeekend,
  slotKey,
  slotStartsForDay,
  upcomingClinicDays,
  zonedTimeToUtc,
} from "./time";

describe("zonedTimeToUtc", () => {
  it("converts Toronto winter time (UTC-5)", () => {
    expect(zonedTimeToUtc("2026-01-15", "09:00").toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("converts Toronto summer time (UTC-4)", () => {
    expect(zonedTimeToUtc("2026-07-15", "09:00").toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });

  it("handles the day after daylight saving starts (Mar 8, 2026)", () => {
    expect(zonedTimeToUtc("2026-03-09", "09:00").toISOString()).toBe("2026-03-09T13:00:00.000Z");
  });

  it("handles the day after daylight saving ends (Nov 1, 2026)", () => {
    expect(zonedTimeToUtc("2026-11-02", "09:00").toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });
});

describe("clinicDateString", () => {
  it("uses the clinic's calendar date, not UTC's", () => {
    // 02:00 UTC on Nov 25 is still 9 p.m. on Nov 24 in Toronto.
    expect(clinicDateString(new Date("2026-11-25T02:00:00Z"))).toBe("2026-11-24");
  });
});

describe("slots", () => {
  it("creates 16 half-hour slots from 9:00 to 16:30", () => {
    const slots = slotStartsForDay("2026-11-25");
    expect(slots).toHaveLength(16);
    expect(slots[0].toISOString()).toBe("2026-11-25T14:00:00.000Z");
    expect(slots[15].toISOString()).toBe("2026-11-25T21:30:00.000Z");
  });

  it("skips weekends in the booking window", () => {
    const days = upcomingClinicDays(new Date("2026-11-27T15:00:00Z")); // a Friday
    expect(days[0]).toBe("2026-11-27");
    expect(days[1]).toBe("2026-11-30"); // Monday, weekend skipped
    expect(days.some(isWeekend)).toBe(false);
  });

  it("builds a stable slot key", () => {
    expect(slotKey("c1", new Date("2026-11-25T14:00:00Z"))).toBe("c1_2026-11-25T14:00:00.000Z");
  });
});

describe("isBookableSlot", () => {
  const now = new Date("2026-11-24T16:00:00Z"); // Tue 11:00 a.m. in Toronto

  it("accepts a real future slot", () => {
    expect(isBookableSlot(new Date("2026-11-25T15:00:00Z"), now)).toBe(true);
  });

  it("rejects a slot starting within the next hour", () => {
    expect(isBookableSlot(new Date("2026-11-24T16:30:00Z"), now)).toBe(false);
  });

  it("rejects times that aren't on the half hour", () => {
    expect(isBookableSlot(new Date("2026-11-25T15:10:00Z"), now)).toBe(false);
  });

  it("rejects slots outside clinic hours", () => {
    expect(isBookableSlot(new Date("2026-11-25T23:00:00Z"), now)).toBe(false); // 6 p.m.
  });

  it("rejects weekends and dates past the booking window", () => {
    expect(isBookableSlot(new Date("2026-11-28T15:00:00Z"), now)).toBe(false); // Saturday
    expect(isBookableSlot(new Date("2026-12-31T15:00:00Z"), now)).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isBookableSlot(new Date("not a date"), now)).toBe(false);
  });
});
