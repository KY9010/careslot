import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decrypt } from "@/lib/session";

// Data Access Layer: the ONE place that decides who the current user is.
// Every protected page and server action calls these helpers, so
// authorization never depends on the browser.

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      clinician: { select: { id: true, specialty: true } },
    },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePatient() {
  const user = await requireUser();
  if (user.role !== "PATIENT") redirect("/schedule");
  return user;
}

export async function requireClinician() {
  const user = await requireUser();
  if (user.role !== "CLINICIAN" || !user.clinician) redirect("/appointments");
  return { ...user, clinician: user.clinician };
}

export function homePathFor(role: "PATIENT" | "CLINICIAN") {
  return role === "CLINICIAN" ? "/schedule" : "/appointments";
}
