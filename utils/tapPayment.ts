import AsyncStorage from "@react-native-async-storage/async-storage";
import { startCheckout } from "checkout-react-native";
import type { CheckoutCallbacks } from "checkout-react-native";
import CryptoJS from "crypto-js";
import { Platform } from "react-native";
import {
  TAP_CURRENCY,
  TAP_MERCHANT_ID,
  TAP_PAYMENT_POLL_ATTEMPTS,
  TAP_PAYMENT_POLL_INTERVAL_MS,
  TAP_PRODUCTION_SECRET_KEY,
  TAP_PUBLIC_KEY,
  TAP_SANDBOX,
  TAP_SANDBOX_SECRET_KEY,
  TAP_USE_BACKEND_CHECKOUT_HASH,
  TAP_WEBHOOK_URL,
} from "~/config";
import { apiCall } from "~/utils/api";
import i18n from "~/utils/config";

/** Must match checkout `transaction.charge.post` and hash `x_post` (browser flow uses tap-webhook.php). */
const TAP_CHECKOUT_POST_URL = TAP_WEBHOOK_URL;
/** Tap SDK redirect for 3DS — use Tap-hosted URL (not app deep link). */
const TAP_CHECKOUT_REDIRECT_URL =
  "https://demo.staging.tap.company/v2/sdk/checkout";

type TapChargeCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  phone: string;
};

export type TapPreferredPayment = "google" | "apple" | "card";

export type StartTapPaymentParams = {
  orderId: string | number;
  amount: number;
  tipAmount?: number;
  /** Opens the Tap sheet focused on the wallet/card the user chose at booking. */
  preferredPayment?: TapPreferredPayment;
  onStarted?: () => void;
  onSuccess?: (chargeId: string) => void;
  onCancelled?: () => void;
  onError?: (message: string) => void;
};

const TAP_CARD_METHODS = [
  "VISA",
  "MASTERCARD",
  "MADA",
  "AMERICAN_EXPRESS",
] as const;

/** Map booking / order method_details to Tap checkout preference. */
export function toTapPreferredPayment(
  method?: string | null,
): TapPreferredPayment | undefined {
  const normalized = (method || "").toLowerCase().trim();
  if (normalized === "google") return "google";
  if (normalized === "apple") return "apple";
  if (normalized === "visa") return "card";
  return undefined;
}

function resolveCheckoutPaymentPreferences(
  preferredPayment?: TapPreferredPayment,
) {
  if (preferredPayment === "google" && Platform.OS === "android") {
    return {
      paymentType: "DEVICE",
      supportedPaymentMethods: ["GOOGLE_PAY", ...TAP_CARD_METHODS],
      isApplePayAvailableOnClient: false,
      isGooglePayAvailableOnClient: true,
    };
  }

  if (preferredPayment === "apple" && Platform.OS === "ios") {
    return {
      paymentType: "DEVICE",
      supportedPaymentMethods: ["APPLE_PAY", ...TAP_CARD_METHODS],
      isApplePayAvailableOnClient: true,
      isGooglePayAvailableOnClient: false,
    };
  }

  if (preferredPayment === "card") {
    return {
      paymentType: "CARD",
      supportedPaymentMethods: [...TAP_CARD_METHODS],
      isApplePayAvailableOnClient: false,
      isGooglePayAvailableOnClient: false,
    };
  }

  return {
    paymentType: "ALL",
    supportedPaymentMethods: "ALL" as const,
    isApplePayAvailableOnClient: Platform.OS === "ios",
    isGooglePayAvailableOnClient: Platform.OS === "android",
  };
}

const parsePhone = (phone?: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("966")) {
    return { country_code: "966", phone: digits.slice(3) || "500000000" };
  }
  if (digits.startsWith("971")) {
    return { country_code: "971", phone: digits.slice(3) || "500000000" };
  }
  if (digits.startsWith("05")) {
    return { country_code: "966", phone: digits.slice(1) };
  }
  return { country_code: "966", phone: digits || "500000000" };
};

const parseName = (name?: string) => {
  const parts = (name || "Customer").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "Customer",
    last_name: parts.slice(1).join(" ") || "User",
  };
};

export async function getTapChargeCustomer(): Promise<TapChargeCustomer> {
  const userId = await AsyncStorage.getItem("user_id");
  const storedName = await AsyncStorage.getItem("user_name");

  if (userId) {
    try {
      const formData = new FormData();
      formData.append("type", "profile");
      formData.append("user_id", userId);
      const response = await apiCall(formData);
      const profile = response.profile || response.user;
      if (profile) {
        const name = parseName(profile.name || storedName || "");
        const phone = parsePhone(profile.phone);
        return {
          ...name,
          email: profile.email || "test@test.com",
          ...phone,
        };
      }
    } catch (error) {
      console.warn("[Tap] profile fetch failed:", error);
    }
  }

  const name = parseName(storedName || "");
  return {
    ...name,
    email: "test@test.com",
    country_code: "966",
    phone: "500000000",
  };
}

function getTapSecretKey(): string {
  return TAP_SANDBOX ? TAP_SANDBOX_SECRET_KEY : TAP_PRODUCTION_SECRET_KEY;
}

function getTapPublicKey(): string {
  return TAP_PUBLIC_KEY;
}

/** DB order id — strips JSON quotes from AsyncStorage. */
function normalizeRawOrderId(orderId: string | number): string {
  let id = String(orderId).trim();
  if (!id) return "";

  if (id.startsWith('"')) {
    try {
      id = String(JSON.parse(id));
    } catch {
      id = id.replace(/^"|"$/g, "");
    }
  }

  return id.trim();
}

/** Tap Checkout expects prefixed references in charge.reference (not in order.id). */
function toTapOrderReference(rawOrderId: string): string {
  const id = normalizeRawOrderId(rawOrderId);
  if (!id) return "";
  if (/^(order_|ord_)/i.test(id)) return id;
  return `order_${id}`;
}

function toTapTransactionReference(rawOrderId: string): string {
  const id = normalizeRawOrderId(rawOrderId);
  if (!id) return "";
  if (/^(trans_|txn_)/i.test(id)) return id;
  return `trans_${id}`;
}

/** Tap Checkout `order.id` must be empty or a Tap-issued id — not a bare DB numeric id. */
function buildTapCheckoutReferences(rawOrderId: string) {
  return {
    tapOrderRef: toTapOrderReference(rawOrderId),
    tapTxnRef: toTapTransactionReference(rawOrderId),
  };
}

function formatTapCheckoutError(error: string): string {
  try {
    const parsed = JSON.parse(error) as { message?: string; code?: string };
    if (parsed.message) {
      return parsed.code ? `${parsed.message} (${parsed.code})` : parsed.message;
    }
  } catch {
    // plain string error from SDK
  }
  return error || "Payment failed";
}

export function generateTapHashString({
  publicKey,
  secretKey,
  amount,
  currency,
  postUrl = TAP_CHECKOUT_POST_URL,
  transactionReference = "",
}: {
  publicKey: string;
  secretKey: string;
  amount: number;
  currency: string;
  postUrl?: string;
  transactionReference?: string;
}) {
  const formattedAmount = amount.toFixed(2);
  const toBeHashed =
    `x_publickey${publicKey}` +
    `x_amount${formattedAmount}` +
    `x_currency${currency}` +
    `x_transaction${transactionReference}` +
    `x_post${postUrl}`;

  return CryptoJS.HmacSHA256(toBeHashed, secretKey).toString(CryptoJS.enc.Hex);
}

async function fetchCheckoutHashFromBackend(
  rawOrderId: string,
  amount: number,
  transactionReference: string,
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("type", "create_tap_checkout_hash");
    formData.append("order_id", rawOrderId);
    formData.append("amount", amount.toFixed(2));
    formData.append("currency", TAP_CURRENCY);
    formData.append("post_url", TAP_CHECKOUT_POST_URL);
    formData.append("transaction_reference", transactionReference);

    const response = await apiCall(formData);
    const hash =
      response?.hashString ||
      response?.hash ||
      response?.hash_string ||
      response?.data?.hashString;

    return typeof hash === "string" && hash.length > 0 ? hash : null;
  } catch (error) {
    console.warn("[Tap checkout] backend hash unavailable:", error);
    return null;
  }
}

async function resolveCheckoutHash(
  rawOrderId: string,
  amount: number,
  transactionReference: string,
): Promise<string> {
  if (TAP_USE_BACKEND_CHECKOUT_HASH) {
    const backendHash = await fetchCheckoutHashFromBackend(
      rawOrderId,
      amount,
      transactionReference,
    );
    if (backendHash) {
      console.log("[Tap checkout] using backend hash");
      return backendHash;
    }
  }

  console.log("[Tap checkout] generating client hash", {
    transactionReference: transactionReference || "(empty)",
    amount: amount.toFixed(2),
    currency: TAP_CURRENCY,
  });
  return generateTapHashString({
    publicKey: getTapPublicKey(),
    secretKey: getTapSecretKey(),
    amount,
    currency: TAP_CURRENCY,
    postUrl: TAP_CHECKOUT_POST_URL,
    transactionReference,
  });
}

async function pollOrderPaymentStatus(orderId: string): Promise<boolean> {
  for (let attempt = 0; attempt < TAP_PAYMENT_POLL_ATTEMPTS; attempt++) {
    try {
      const formData = new FormData();
      formData.append("type", "get_data");
      formData.append("table_name", "orders");
      formData.append("id", orderId);
      const response = await apiCall(formData);
      const order = response?.data?.[0];
      if (order?.payment_status === "paid") {
        console.log("[Tap] order paid on backend (poll attempt", attempt + 1, ")");
        return true;
      }
    } catch (e) {
      console.warn("[Tap] poll order status failed:", e);
    }

    if (attempt < TAP_PAYMENT_POLL_ATTEMPTS - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, TAP_PAYMENT_POLL_INTERVAL_MS),
      );
    }
  }
  return false;
}

function extractChargeIdFromCheckoutData(data: string): string | null {
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const charge = parsed.charge as Record<string, unknown> | undefined;
    const result = parsed.result as Record<string, unknown> | undefined;
    const candidates = [
      parsed.chargeId,
      parsed.charge_id,
      parsed.id,
      charge?.id,
      result?.chargeId,
      result?.charge_id,
      (result?.charge as Record<string, unknown> | undefined)?.id,
    ];
    const found = candidates.find(
      (v) => typeof v === "string" && String(v).startsWith("chg_"),
    );
    return (found as string) || null;
  } catch {
    return null;
  }
}

async function finalizeSuccessfulPayment(
  orderId: string,
  chargeId: string,
  finish: (action: () => void) => void,
  params: StartTapPaymentParams,
) {
  console.log("[Tap] payment captured, waiting for webhook sync…", {
    orderId,
    chargeId,
    webhook: TAP_WEBHOOK_URL,
  });

  const synced = await pollOrderPaymentStatus(orderId);

  if (synced) {
    finish(() => params.onSuccess?.(chargeId));
    return;
  }

  console.error("[Tap] webhook did not confirm order paid", {
    orderId,
    chargeId,
  });
  finish(() =>
    params.onError?.(
      "Payment was received but your order could not be confirmed yet. Please refresh in a moment or contact support.",
    ),
  );
}

function buildTapCheckoutConfig(
  rawOrderId: string,
  totalAmount: number,
  customer: TapChargeCustomer,
  hashString: string,
  preferredPayment?: TapPreferredPayment,
) {
  const amountStr = totalAmount.toFixed(2);
  const language = i18n.language?.startsWith("ar") ? "ar" : "en";
  const publicKey = getTapPublicKey();
  const { tapOrderRef } = buildTapCheckoutReferences(rawOrderId);
  const paymentPreferences =
    resolveCheckoutPaymentPreferences(preferredPayment);

  const gateway: Record<string, string> = { publicKey };
  if (TAP_MERCHANT_ID) {
    gateway.merchantId = TAP_MERCHANT_ID;
  }

  return {
    hashString,
    language,
    themeMode: "light",
    supportedPaymentMethods: paymentPreferences.supportedPaymentMethods,
    paymentType: paymentPreferences.paymentType,
    selectedCurrency: TAP_CURRENCY,
    supportedCurrencies: "ALL",
    supportedPaymentTypes: [],
    supportedRegions: [],
    supportedSchemes: [],
    supportedCountries: [],
    gateway,
    customer: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: {
        countryCode: customer.country_code,
        number: customer.phone,
      },
    },
    transaction: {
      mode: "charge",
      charge: {
        metadata: {
          udf1: rawOrderId,
          order_id: rawOrderId,
          merchant_order_ref: tapOrderRef,
          app: "drill_customer",
        },
        saveCard: false,
        redirect: {
          url: TAP_CHECKOUT_REDIRECT_URL,
        },
        post: TAP_CHECKOUT_POST_URL,
        threeDSecure: true,
      },
    },
    amount: amountStr,
    order: {
      id: "",
      currency: TAP_CURRENCY,
      amount: amountStr,
      items: [
        {
          amount: amountStr,
          currency: TAP_CURRENCY,
          name: `Order #${rawOrderId}`,
          quantity: 1,
          description: "Drill Customer payment",
        },
      ],
    },
    cardOptions: {
      showBrands: true,
      showLoadingState: false,
      collectHolderName: true,
      preLoadCardName: "",
      cardNameEditable: true,
      cardFundingSource: "all",
      saveCardOption: "none",
      forceLtr: false,
      alternativeCardInputs: { cardScanner: true, cardNFC: true },
    },
    isApplePayAvailableOnClient: paymentPreferences.isApplePayAvailableOnClient,
    isGooglePayAvailableOnClient: paymentPreferences.isGooglePayAvailableOnClient,
  };
}

async function startTapCheckout(
  rawOrderId: string,
  totalAmount: number,
  params: StartTapPaymentParams,
) {
  let settled = false;
  let successStarted = false;
  const finish = (action: () => void) => {
    if (settled) return;
    settled = true;
    clearTimeout(paymentTimeout);
    action();
  };

  const paymentTimeout = setTimeout(() => {
    finish(() => params.onError?.("Payment timed out. Please try again."));
  }, 120000);

  if (totalAmount <= 0) {
    params.onError?.("Payment amount must be greater than zero");
    return;
  }

  const { tapOrderRef } = buildTapCheckoutReferences(rawOrderId);
  const customer = await getTapChargeCustomer();
  const hashString = await resolveCheckoutHash(rawOrderId, totalAmount, "");
  const configurations = buildTapCheckoutConfig(
    rawOrderId,
    totalAmount,
    customer,
    hashString,
    params.preferredPayment,
  );

  console.log("[Tap checkout] start", {
    rawOrderId,
    tapOrderRef,
    orderIdForSdk: "(empty)",
    hashTransactionRef: "(empty)",
    postUrl: TAP_CHECKOUT_POST_URL,
    amount: totalAmount.toFixed(2),
    currency: TAP_CURRENCY,
    preferredPayment: params.preferredPayment ?? "(default)",
    paymentType: configurations.paymentType,
    supportedPaymentMethods: configurations.supportedPaymentMethods,
    publicKeyPrefix: getTapPublicKey().slice(0, 12),
  });

  const callbacks: CheckoutCallbacks = {
    onReady: () => {
      console.log("[Tap checkout] ready");
      params.onStarted?.();
    },
    onSuccess: (data: string) => {
      successStarted = true;
      console.log("[Tap checkout] success raw:", data);
      const chargeId =
        extractChargeIdFromCheckoutData(data) ?? "wallet_checkout_success";
      void finalizeSuccessfulPayment(rawOrderId, chargeId, finish, params);
    },
    onError: (error: string) => {
      console.log("[Tap checkout] error:", error);
      const message = formatTapCheckoutError(error);
      const normalized = message.toLowerCase();
      if (normalized.includes("cancel")) {
        finish(() => params.onCancelled?.());
        return;
      }
      finish(() => params.onError?.(message));
    },
    onClose: () => {
      console.log("[Tap checkout] closed");
      if (successStarted) return;
      finish(() => params.onCancelled?.());
    },
  };

  startCheckout(configurations, callbacks);
}

/** Opens Tap Checkout in-app payment sheet. */
export function startTapPayment(params: StartTapPaymentParams): void {
  const orderId = normalizeRawOrderId(params.orderId);
  const tip = params.tipAmount ?? 0;
  const totalAmount = params.amount + tip;

  if (!orderId) {
    params.onError?.("order_id is required");
    return;
  }

  if (totalAmount <= 0) {
    params.onError?.("Payment amount must be greater than zero");
    return;
  }

  startTapCheckout(orderId, totalAmount, params).catch((e) => {
    params.onError?.(e instanceof Error ? e.message : "Checkout failed");
  });
}
