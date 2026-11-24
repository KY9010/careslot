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

/** Public URL of this app, used for Stripe's redirect links. */
export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // On Vercel these are set automatically, so no manual setup is needed.
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
