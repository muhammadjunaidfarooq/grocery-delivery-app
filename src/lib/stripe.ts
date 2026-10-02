import Stripe from "stripe";

let stripe: Stripe | null = null;

/**
 * Creates the Stripe client the first time it is needed (not when the file is
 * imported), so the app still builds and runs when Stripe is not configured.
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

/** Public URL of this app, used for Stripe success/cancel redirects. */
export function appBaseUrl(): string {
  const url =
    process.env.NEXT_BASE_URL ||
    process.env.NEXT_BASE_ULR || // old misspelled name, still supported
    process.env.AUTH_URL ||
    // Set automatically by Vercel (domain only, no protocol)
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"); // local development
  return url.replace(/\/+$/, "");
}
