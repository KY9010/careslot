"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { homePathFor } from "@/lib/dal";
import { DEMO_CLINICIAN_EMAIL, DEMO_PATIENT_EMAIL } from "@/lib/demo";
import { createSession, deleteSession } from "@/lib/session";
import { type FormState, loginSchema, safeNextPath, signupSchema } from "@/lib/validation";

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { name: formData.get("name"), email: formData.get("email"), password: formData.get("password") };
  const parsed = signupSchema.safeParse(raw);
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists."] }, values };

  // bcrypt adds a random salt and is deliberately slow, so leaked hashes are hard to crack.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: "PATIENT" } });

  await createSession({ userId: user.id, role: user.role });
  redirect("/book");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const parsed = loginSchema.safeParse(raw);
  const values = { email: String(raw.email ?? "") };
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const passwordOk = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  // Same message for "no such user" and "wrong password", so attackers can't
  // find out which emails have accounts.
  if (!user || !passwordOk) return { error: "Incorrect email or password.", values };

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNextPath(formData.get("next")) ?? homePathFor(user.role));
}

export async function demoLogin(formData: FormData) {
  const role = formData.get("role") === "CLINICIAN" ? "CLINICIAN" : "PATIENT";
  const email = role === "CLINICIAN" ? DEMO_CLINICIAN_EMAIL : DEMO_PATIENT_EMAIL;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Demo accounts are missing. Run `npm run db:seed`.");

  await createSession({ userId: user.id, role: user.role });
  redirect(homePathFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
