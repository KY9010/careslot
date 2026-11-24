import "server-only";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { appUrl, stripe } from "@/lib/stripe";
import { HOLD_MINUTES, SLOT_MINUTES, formatClinicDateTime } from "@/lib/time";

const ACTIVE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "NO_SHOW"] as const;

/** Unpaid bookings older than HOLD_MINUTES give their slot back. */
export async function releaseStaleHolds() {
  const cutoff = new Date(Date.now() - HOLD_MINUTES * 60_000);
  await prisma.appointment.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    data: { status: "CANCELLED", slotKey: null },
  });
}

/** Start times (ms) already taken for a clinician between two instants. */
export async function getTakenSlotTimes(clinicianId: string, from: Date, to: Date) {
  const taken = await prisma.appointment.findMany({
    where: {
      clinicianId,
      startsAt: { gte: from, lt: to },
      status: { in: [...ACTIVE_STATUSES] },
      slotKey: { not: null },
    },
    select: { startsAt: true },
  });
  return new Set(taken.map((a) => a.startsAt.getTime()));
}

export function endFor(startsAt: Date) {
  return new Date(startsAt.getTime() + SLOT_MINUTES * 60_000);
}

/** Creates a Stripe Checkout page for an appointment's deposit and returns its URL. */
export async function createDepositCheckout(appointmentId: string): Promise<string> {
  if (!stripe) throw new Error("Payments are not configured.");
  const appt = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { clinician: { include: { user: true } }, patient: true },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: appt.patient.email,
    client_reference_id: appt.id,
    metadata: { appointmentId: appt.id },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: appt.depositCents,
          product_data: {
            name: `Booking deposit: ${appt.clinician.user.name}`,
            description: formatClinicDateTime(appt.startsAt) + " (Toronto time)",
          },
        },
      },
    ],
    // Stripe's minimum lifetime is 30 minutes; our slot hold lasts a bit longer.
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${appUrl()}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/appointments/${appt.id}?payment=cancelled`,
  });

  await prisma.appointment.update({ where: { id: appt.id }, data: { stripeSessionId: session.id } });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/**
 * Marks an appointment as paid. Called from BOTH the success redirect and the
 * Stripe webhook, so it must be idempotent: running it twice changes nothing.
 */
export async function confirmFromCheckoutSession(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId || session.payment_status !== "paid") return null;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  await prisma.appointment.updateMany({
    where: { id: appointmentId, status: "PENDING_PAYMENT", stripeSessionId: session.id },
    data: { status: "CONFIRMED", paidAt: new Date(), stripePaymentIntentId: paymentIntentId },
  });
  return appointmentId;
}

/** Cancels an appointment, refunding the deposit if one was paid. */
export async function cancelAndRefund(appointmentId: string) {
  const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  let refundedAt: Date | null = null;

  if (stripe && appt.status === "CONFIRMED" && appt.stripePaymentIntentId && !appt.refundedAt) {
    await stripe.refunds.create(
      { payment_intent: appt.stripePaymentIntentId },
      { idempotencyKey: `refund_${appt.id}` },
    );
    refundedAt = new Date();
  }

  if (stripe && appt.status === "PENDING_PAYMENT" && appt.stripeSessionId) {
    // Close the unpaid checkout page so it can't be paid after cancelling.
    const session = await stripe.checkout.sessions.retrieve(appt.stripeSessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(appt.stripeSessionId);
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CANCELLED", slotKey: null, ...(refundedAt ? { refundedAt } : {}) },
  });
}
