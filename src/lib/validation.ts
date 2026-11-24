// Input rules shared by the server actions. Every form is validated on the
// server here, even when the browser also checks it.
import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or fewer.")
    .regex(/[A-Za-z]/, "Password must contain a letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const bookingSchema = z.object({
  clinicianId: z.string().min(1, "Choose a clinician."),
  startsAt: z.iso.datetime({ message: "Choose a time slot." }),
  reason: z
    .string()
    .trim()
    .min(3, "Tell the clinician briefly why you're booking.")
    .max(300, "Keep the reason under 300 characters."),
});

export const notesSchema = z.object({
  appointmentId: z.string().min(1),
  notes: z.string().trim().max(2000, "Notes must be under 2,000 characters."),
});

/** Only allow redirects to paths inside this app (blocks "open redirect" attacks). */
export function safeNextPath(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
      success?: string;
    }
  | undefined;
