export const BASE_URL = "https://7tracking.com/saudiservices/api.php";

/** Tap Payments public key (Checkout SDK + client-side tokenization). */
export const TAP_PUBLIC_KEY = "pk_test_YEw8H7SPKIUx3BDhOMC6lfqp";

/** Tap merchant ID from dashboard. Optional for single-merchant accounts. */
export const TAP_MERCHANT_ID = "";

export const TAP_SANDBOX = true; // false in production
export const TAP_CURRENCY = "SAR";

/** Same webhook the browser `create_tap_charge` flow uses — Tap POSTs here when payment completes. */
export const TAP_WEBHOOK_URL =
  "https://7tracking.com/saudiservices/tap-webhook.php";

export const PAYMENT_REDIRECT_URL = "drillcustomer://orders";

/** Sandbox / production secret — used for checkout hash (prefer backend in production). */
export const TAP_SANDBOX_SECRET_KEY = "sk_test_cqx0vA679EKZuw8XGlO5NTJr";
export const TAP_PRODUCTION_SECRET_KEY = "sk_live_YOUR_KEY";

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
