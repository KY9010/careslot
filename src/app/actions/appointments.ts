"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireClinician, requirePatient } from "@/lib/dal";
import { paymentsEnabled, stripe } from "@/lib/stripe";
import {
  cancelAndRefund,
  confirmFromCheckoutSession,
  createDepositCheckout,
  endFor,
  releaseStaleHolds,
} from "@/lib/appointments";
import { isBookableSlot, slotKey } from "@/lib/time";
import { type FormState, bookingSchema, notesSchema } from "@/lib/validation";

// ---------- Patient actions ----------

export async function bookAppointment(_prev: FormState, formData: FormData): Promise<FormState> {
  const patient = await requirePatient();
  const raw = {
    clinicianId: formData.get("clinicianId"),
    startsAt: formData.get("startsAt"),
    reason: formData.get("reason"),
  };
  const values = { startsAt: String(raw.startsAt ?? ""), reason: String(raw.reason ?? "") };
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const startsAt = new Date(parsed.data.startsAt);
  if (!isBookableSlot(startsAt)) {
    return { error: "That time isn't available for booking. Please choose another slot.", values };
  }
  const clinician = await prisma.clinician.findUnique({ where: { id: parsed.data.clinicianId } });
  if (!clinician) return { error: "That clinician doesn't exist.", values };

  await releaseStaleHolds();

  let appointmentId: string;
  try {
    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        clinicianId: clinician.id,
        startsAt,
        endsAt: endFor(startsAt),
        reason: parsed.data.reason,
        slotKey: slotKey(clinician.id, startsAt),
        status: paymentsEnabled ? "PENDING_PAYMENT" : "CONFIRMED",
      },
    });
    appointmentId = appt.id;
  } catch (e) {
    // The unique slotKey makes the DATABASE reject a second booking for the
    // same slot, even if two patients click "Book" at the same instant.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Sorry, someone just booked that time. Please pick another slot.", values };
    }
    throw e;
  }

  revalidatePath("/appointments");
  if (!paymentsEnabled) redirect(`/appointments/${appointmentId}?booked=1`);
  redirect(await createDepositCheckout(appointmentId));
}

export async function payDeposit(formData: FormData) {
  const patient = await requirePatient();
  const id = String(formData.get("appointmentId") ?? "");
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt || appt.patientId !== patient.id) notFound();
  if (appt.status !== "PENDING_PAYMENT" || !stripe) redirect(`/appointments/${id}`);

  // Reuse the open checkout page if there is one, so the patient can't end up
  // with two payable checkouts for the same deposit.
  if (appt.stripeSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(appt.stripeSessionId);
    if (existing.status === "open" && existing.url) redirect(existing.url);
    if (existing.status === "complete") {
      await confirmFromCheckoutSession(existing);
      redirect(`/appointments/${id}?paid=1`);
    }
  }
  redirect(await createDepositCheckout(id));
}

export async function cancelAppointment(formData: FormData) {
  const patient = await requirePatient();
  const id = String(formData.get("appointmentId") ?? "");
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt || appt.patientId !== patient.id) notFound();

  const cancellable = (appt.status === "PENDING_PAYMENT" || appt.status === "CONFIRMED") && appt.startsAt > new Date();
  if (cancellable) await cancelAndRefund(id);

  revalidatePath("/appointments");
  redirect(`/appointments/${id}?cancelled=1`);
}

// ---------- Clinician actions ----------

async function getClinicianAppointment(id: string) {
  const user = await requireClinician();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  // A clinician can only touch their own appointments.
  if (!appt || appt.clinicianId !== user.clinician.id) notFound();
  return appt;
}

export async function setVisitOutcome(formData: FormData) {
  const id = String(formData.get("appointmentId") ?? "");
  const outcome = formData.get("outcome") === "NO_SHOW" ? "NO_SHOW" : "COMPLETED";
  const appt = await getClinicianAppointment(id);

  if (appt.status === "CONFIRMED" && appt.startsAt <= new Date()) {
    await prisma.appointment.update({ where: { id }, data: { status: outcome } });
  }
  revalidatePath("/schedule");
  redirect(`/schedule/${id}`);
}

export async function saveVisitNotes(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = notesSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await getClinicianAppointment(parsed.data.appointmentId);
  await prisma.appointment.update({
    where: { id: parsed.data.appointmentId },
    data: { notes: parsed.data.notes || null },
  });
  revalidatePath(`/schedule/${parsed.data.appointmentId}`);
  return { success: "Notes saved." };
}
