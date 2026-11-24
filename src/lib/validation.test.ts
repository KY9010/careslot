import { describe, expect, it } from "vitest";
import { bookingSchema, safeNextPath, signupSchema } from "./validation";

describe("signupSchema", () => {
  it("normalises email and accepts a valid signup", () => {
    const result = signupSchema.safeParse({ name: " Kamal ", email: " Kamal@Example.COM ", password: "secret123" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "Kamal", email: "kamal@example.com", password: "secret123" });
  });

  it("rejects weak passwords", () => {
    expect(signupSchema.safeParse({ name: "Kamal", email: "k@example.com", password: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Kamal", email: "k@example.com", password: "onlyletters" }).success).toBe(
      false,
    );
  });

  it("rejects invalid emails", () => {
    expect(signupSchema.safeParse({ name: "Kamal", email: "not-an-email", password: "secret123" }).success).toBe(false);
  });
});

describe("bookingSchema", () => {
  it("requires a slot and a reason", () => {
    const result = bookingSchema.safeParse({ clinicianId: "c1", startsAt: "", reason: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid booking", () => {
    const result = bookingSchema.safeParse({
      clinicianId: "c1",
      startsAt: "2026-11-25T15:00:00.000Z",
      reason: "Check-up",
    });
    expect(result.success).toBe(true);
  });
});

describe("safeNextPath", () => {
  it("allows internal paths", () => {
    expect(safeNextPath("/appointments")).toBe("/appointments");
  });

  it("blocks open redirects to other sites", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
