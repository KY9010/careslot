import { NextResponse, type NextRequest } from "next/server";
import { confirmFromCheckoutSession } from "@/lib/appointments";
import { appUrl, stripe } from "@/lib/stripe";

// Stripe sends the patient here after a successful payment. We never trust the
// redirect alone: we ask Stripe directly whether the session was really paid.
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!stripe || !sessionId) return NextResponse.redirect(`${appUrl()}/appointments`);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const appointmentId = await confirmFromCheckoutSession(session);
    const target = appointmentId ? `/appointments/${appointmentId}?paid=1` : "/appointments";
    return NextResponse.redirect(`${appUrl()}${target}`);
  } catch {
    return NextResponse.redirect(`${appUrl()}/appointments`);
  }
}
