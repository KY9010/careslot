import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { confirmFromCheckoutSession } from "@/lib/appointments";
import { stripe } from "@/lib/stripe";

// Stripe calls this endpoint server-to-server when a payment completes, even
// if the patient closed their browser before the redirect. The signature check
// proves the request really came from Stripe.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event;
  try {
    const body = await request.text(); // raw body is required for signature verification
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await confirmFromCheckoutSession(event.data.object);
      break;
    case "checkout.session.expired": {
      // The patient never paid: release the slot.
      const id = event.data.object.metadata?.appointmentId;
      if (id) {
        await prisma.appointment.updateMany({
          where: { id, status: "PENDING_PAYMENT", stripeSessionId: event.data.object.id },
          data: { status: "CANCELLED", slotKey: null },
        });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
