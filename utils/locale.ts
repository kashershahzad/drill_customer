import i18n from "./config";

export function getCurrentLanguageKey(): "en" | "ar" {
  return i18n.language?.startsWith("ar") ? "ar" : "en";
}

const ORDER_STATUS_KEYS: Record<string, string> = {
  pending: "orderStatuses.pending",
  accepted: "orderStatuses.accepted",
  on_the_way: "orderStatuses.onTheWay",
  ontheway: "orderStatuses.onTheWay",
  arrived: "orderStatuses.arrived",
  started: "orderStatuses.started",
  in_progress: "orderStatuses.inProgress",
  inprogress: "orderStatuses.inProgress",
  completed: "orderStatuses.completed",
  complete: "orderStatuses.completed",
  cancelled: "orderStatuses.cancelled",
  canceled: "orderStatuses.cancelled",
  time_up: "orderStatuses.timeUp",
  timeup: "orderStatuses.timeUp",
};

const PAYMENT_STATUS_KEYS: Record<string, string> = {
  pending: "paymentStatuses.pending",
  paid: "paymentStatuses.paid",
  unpaid: "paymentStatuses.unpaid",
  failed: "paymentStatuses.failed",
  refunded: "paymentStatuses.refunded",
};

function normalizeStatusKey(status?: string | null): string {
  return (status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

export function getLocalizedOrderStatus(
  status?: string | null,
  fallback = "",
): string {
  const normalized = normalizeStatusKey(status);
  const key = ORDER_STATUS_KEYS[normalized];
  if (key) return i18n.t(key);
  return status?.trim() || fallback;
}

export function getLocalizedPaymentStatus(
  status?: string | null,
  fallback = "",
): string {
  const normalized = normalizeStatusKey(status);
  const key = PAYMENT_STATUS_KEYS[normalized];
  if (key) return i18n.t(key);
  return status?.trim() || fallback;
}

export function getLocalizedText(
  translation: string | Record<string, string> | null | undefined,
  fallback = "",
): string {
  if (!translation) return fallback;

  let parsed: Record<string, string> | null = null;

  if (typeof translation === "string") {
    const trimmed = translation.trim();
    if (!trimmed) return fallback;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return fallback;
    }
  } else {
    parsed = translation;
  }

  const lang = getCurrentLanguageKey();
  const localized = parsed?.[lang]?.trim();
  if (localized) return localized;

  const english = parsed?.en?.trim();
  if (english) return english;

  return fallback;
}

export function getLocalizedList(
  translation: string | Record<string, string[]> | null | undefined,
  fallback: string[] = [],
): string[] {
  if (!translation) return fallback;

  let parsed: unknown = null;

  if (typeof translation === "string") {
    const trimmed = translation.trim();
    if (!trimmed) return fallback;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return fallback;
    }
  } else {
    parsed = translation;
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item, index) =>
      typeof item === "string"
        ? item
        : getLocalizedText(
            item as Record<string, string>,
            fallback[index] ?? "",
          ),
    );
  }

  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, string[]>;
    const lang = getCurrentLanguageKey();
    const localized = record[lang];
    if (Array.isArray(localized) && localized.length > 0) return localized;

    const english = record.en;
    if (Array.isArray(english) && english.length > 0) return english;
  }

  return fallback;
}

export function getAppLocale(): string {
  return i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
}

export function formatAppDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(getAppLocale(), options);
}

export function formatAppTime(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleTimeString(getAppLocale(), options);
}
