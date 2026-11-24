import "server-only";
import Stripe from "stripe";

// Payments run in Stripe TEST mode: no real money moves.
// If no key is configured (e.g. a fresh local setup) bookings are confirmed
// without a deposit so the rest of the app still works.
const key = process.env.STRIPE_SECRET_KEY;

if (key && key.startsWith("sk_live_")) {
  throw new Error("CareSlot is a demo: use a Stripe TEST key (sk_test_...), never a live key.");
}

export const stripe = key ? new Stripe(key) : null;
export const paymentsEnabled = stripe !== null;

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
