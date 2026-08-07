export const BASE_URL = "https://7tracking.com/saudiservices/api.php";

/** Tap Payments public key (Checkout SDK + client-side tokenization). */
export const TAP_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_TAP_PUBLIC_KEY ?? "pk_live_y3UaSZNkJ5yl3oinhrSVYp9dAWO8m";

/** Tap merchant ID from dashboard. Optional for single-merchant accounts. */
export const TAP_MERCHANT_ID =
  process.env.EXPO_PUBLIC_TAP_MERCHANT_ID ?? "68013152";

export const TAP_SANDBOX = true; // false in production
export const TAP_CURRENCY = "SAR";

/** Same webhook the browser `create_tap_charge` flow uses — Tap POSTs here when payment completes. */
export const TAP_WEBHOOK_URL =
  "https://7tracking.com/saudiservices/tap-webhook.php";

export const PAYMENT_REDIRECT_URL = "drillcustomer://orders";

/**
 * Secret keys — never commit real values.
 * Set in `.env` (see `.env.example`). Prefer backend hash in production.
 */
export const TAP_SANDBOX_SECRET_KEY =
  process.env.EXPO_PUBLIC_TAP_SANDBOX_SECRET_KEY ?? "";
export const TAP_PRODUCTION_SECRET_KEY =
  process.env.EXPO_PUBLIC_TAP_PRODUCTION_SECRET_KEY ?? "";

/** Use PHP `create_tap_checkout_hash` when implemented; off avoids bad hashes during dev. */
export const TAP_USE_BACKEND_CHECKOUT_HASH = false;

/** After checkout, poll order status while Tap webhook updates the DB (browser-style sync). */
export const TAP_PAYMENT_POLL_ATTEMPTS = 10;
export const TAP_PAYMENT_POLL_INTERVAL_MS = 1500;

/**
 * Privacy Policy URL – use the same URL in App Store Connect > App Information > Privacy Policy URL.
 * If set, the app shows a "View online" link on the Privacy Policy screen.
 */
export const PRIVACY_POLICY_URL: string | null = null;
