import { OrderType } from "~/types/dataTypes";
import { apiCall } from "~/utils/api";

export type OrderExtra = {
  id?: string;
  order_id?: string;
  detail?: string;
  amount?: string;
  images?: string;
  paid_by?: string;
  created_at?: string;
  timestamp?: string;
  status?: string;
  extra_accepted?: string;
};

const normalizeExtraField = (value?: string | number | null) =>
  value == null ? "" : String(value).trim();

export const normalizeOrderExtra = (
  row: Record<string, unknown>,
): OrderExtra => ({
  id: normalizeExtraField(row.id as string | number),
  order_id: normalizeExtraField(row.order_id as string | number),
  detail: normalizeExtraField(row.detail as string),
  amount: normalizeExtraField(row.amount as string | number),
  images: normalizeExtraField(row.images as string),
  paid_by: normalizeExtraField(row.paid_by as string | number),
  created_at: normalizeExtraField(row.created_at as string),
  timestamp: normalizeExtraField(row.timestamp as string),
  status: normalizeExtraField(row.extra_status as string),
  extra_accepted: normalizeExtraField(row.extra_accepted as string),
});

export const hasOrderExtraContent = (extra: OrderExtra | null | undefined) =>
  Boolean(normalizeExtraField(extra?.detail));

export const isPendingOrderExtra = (extra: OrderExtra | null | undefined) => {
  if (!hasOrderExtraContent(extra)) return false;
  const status = normalizeExtraField(extra?.status).toLowerCase();
  return status !== "accepted" && status !== "rejected";
};

export const isAcceptedOrderExtra = (extra: OrderExtra | null | undefined) => {
  if (!hasOrderExtraContent(extra)) return false;
  const status = normalizeExtraField(extra?.status).toLowerCase();
  const acceptedFlag = normalizeExtraField(extra?.extra_accepted).toLowerCase();
  if (status === "rejected" || acceptedFlag === "rejected") return false;
  if (status === "accepted") return true;
  if (acceptedFlag === "accepted" || acceptedFlag === "1") return true;
  return false;
};

export const resolvePaidByLabel = (
  paidById: string | undefined,
  customerUserId: string,
  providerUserId: string,
): "customer" | "provider" | "unknown" => {
  const paidBy = normalizeExtraField(paidById);
  if (!paidBy) return "unknown";

  const customer = normalizeExtraField(customerUserId);
  const provider = normalizeExtraField(providerUserId);

  // Legacy flags
  if (paidBy === "1") return "customer";
  if (paidBy === "0") return "provider";

  if (customer && paidBy === customer) return "customer";
  if (provider && paidBy === provider) return "provider";

  // paid_by is set to someone other than the customer → provider is covering it
  if (customer && paidBy !== customer) return "provider";

  return "unknown";
};

/**
 * Extra amount effect on customer payable total:
 * - paid by customer → ADD
 * - paid by provider → SUBTRACT (customer does not pay this)
 */
export const getAcceptedOrderExtrasAdjustment = (
  extras: OrderExtra[],
  customerUserId?: string,
  providerUserId?: string,
): number =>
  extras.filter(isAcceptedOrderExtra).reduce((sum, extra) => {
    const amount = parseFloat(extra.amount || "0");
    if (!Number.isFinite(amount) || amount === 0) return sum;

    const paidBy = resolvePaidByLabel(
      extra.paid_by,
      customerUserId || "",
      providerUserId || "",
    );

    if (paidBy === "customer") return sum + amount;
    if (paidBy === "provider") return sum - amount;
    return sum;
  }, 0);

export const getAcceptedOrderExtrasTotal = (
  extras: OrderExtra[],
  customerUserId?: string,
  providerUserId?: string,
): number =>
  getAcceptedOrderExtrasAdjustment(extras, customerUserId, providerUserId);

export const getOrderPayableTotal = (
  baseAmount: number | string | undefined,
  extras: OrderExtra[],
  customerUserId?: string,
  providerUserId?: string,
): number => {
  const base = parseFloat(String(baseAmount ?? "0"));
  const safeBase = Number.isFinite(base) ? base : 0;
  const adjustment = getAcceptedOrderExtrasAdjustment(
    extras,
    customerUserId,
    providerUserId,
  );
  return Math.max(0, safeBase + adjustment);
};

/** Prefer API order-level fields: extra_balance_payer + totals */
export const resolveOrderBalancePayer = (
  order: OrderType,
): "customer" | "provider" | "unknown" => {
  const payer = normalizeExtraField(order.extra_balance_payer).toLowerCase();
  if (payer === "provider") return "provider";
  if (payer === "customer" || payer === "user" || payer === "me") {
    return "customer";
  }
  return "unknown";
};

export const getOrderExtraDisplayAmount = (order: OrderType): string => {
  const payer = resolveOrderBalancePayer(order);
  if (payer === "provider") {
    return (
      normalizeExtraField(order.extra_paid_by_provider_total) ||
      normalizeExtraField(order.extra_amount)
    );
  }
  if (payer === "customer") {
    return (
      normalizeExtraField(order.extra_paid_by_customer_total) ||
      normalizeExtraField(order.extra_amount)
    );
  }
  return (
    normalizeExtraField(order.extra_paid_by_provider_total) ||
    normalizeExtraField(order.extra_paid_by_customer_total) ||
    normalizeExtraField(order.extra_amount)
  );
};

export const getOrderPayableTotalFromOrder = (
  order: OrderType,
  extras: OrderExtra[] = [],
  customerUserId?: string,
  providerUserId?: string,
): number => {
  const base = parseFloat(String(order.amount ?? "0"));
  const safeBase = Number.isFinite(base) ? base : 0;
  const payer = resolveOrderBalancePayer(order);

  if (payer === "provider") {
    const providerTotal = parseFloat(
      String(order.extra_paid_by_provider_total ?? "0"),
    );
    const amount = Number.isFinite(providerTotal) ? providerTotal : 0;
    return Math.max(0, safeBase - amount);
  }

  if (payer === "customer") {
    const customerTotal = parseFloat(
      String(
        order.extra_paid_by_customer_total ?? order.extra_amount ?? "0",
      ),
    );
    const amount = Number.isFinite(customerTotal) ? customerTotal : 0;
    return Math.max(0, safeBase + amount);
  }

  return getOrderPayableTotal(
    order.amount,
    extras,
    customerUserId,
    providerUserId,
  );
};

export const getOrderExtraStorageKey = (
  orderId: string,
  extra: OrderExtra,
  prefix = "extra_popup_seen_",
) => {
  const fingerprint = [
    extra.id ?? "",
    extra.amount ?? "",
    extra.detail ?? "",
    extra.created_at ?? extra.timestamp ?? "",
  ].join("|");
  return `${prefix}${orderId}_${fingerprint}`;
};

export const getLatestOrderExtra = (
  extras: OrderExtra[],
): OrderExtra | null => {
  if (!extras.length) return null;

  const sorted = [...extras].sort((a, b) => {
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    if (idA !== idB) return idB - idA;
    return (
      new Date(b.created_at || b.timestamp || 0).getTime() -
      new Date(a.created_at || a.timestamp || 0).getTime()
    );
  });

  return sorted[0] ?? null;
};

export const getLatestPendingOrderExtra = (
  extras: OrderExtra[],
): OrderExtra | null => getLatestOrderExtra(extras.filter(isPendingOrderExtra));

const isTruthyApiResult = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true";

export const isOrderExtraActionSuccessful = (response: unknown): boolean => {
  if (response == null) return false;

  if (typeof response !== "object" || Array.isArray(response)) {
    return false;
  }

  const payload = response as Record<string, unknown>;
  if (isTruthyApiResult(payload.result)) return true;
  if (
    payload.result === false ||
    payload.result === 0 ||
    payload.result === "0" ||
    payload.result === "false"
  ) {
    return false;
  }

  return false;
};

export const getOrderExtraActionErrorMessage = (
  response: unknown,
): string | null => {
  if (isOrderExtraActionSuccessful(response)) return null;
  if (response && typeof response === "object" && "message" in response) {
    const message = String(
      (response as Record<string, unknown>).message ?? "",
    ).trim();
    if (message) return message;
  }
  return null;
};

export async function respondToOrderExtra(
  orderId: string,
  status: "accepted" | "rejected",
  extraId?: string,
) {
  if (!extraId) {
    throw new Error("order_extra_id_required");
  }

  // Backend updates via update_data + extra_status (accept_order_extra does not persist).
  const formData = new FormData();
  formData.append("type", "update_data");
  formData.append("table_name", "order_extra");
  formData.append("id", String(extraId));
  formData.append("extra_status", status);

  console.log("[OrderExtra] accept/reject request:", {
    type: "update_data",
    table_name: "order_extra",
    id: String(extraId),
    extra_status: status,
    order_id: String(orderId),
  });

  return apiCall(formData);
}

export async function fetchOrderExtras(orderId: string): Promise<OrderExtra[]> {
  const formData = new FormData();
  formData.append("type", "get_data");
  formData.append("table_name", "order_extra");
  formData.append("order_id", String(orderId));

  const response = await apiCall(formData);
  // console.log("order extras", response);

  if (!response?.data || !Array.isArray(response.data)) {
    return [];
  }

  return response.data.map((row: Record<string, unknown>) =>
    normalizeOrderExtra(row),
  );
}

export const mergeOrderWithExtra = (
  order: OrderType,
  extra: OrderExtra | null,
): OrderType => {
  if (!extra || !hasOrderExtraContent(extra)) {
    return order;
  }

  const existing = parseOrderExtrasFromOrder(order).filter(
    (item) => item.id !== extra.id,
  );

  return {
    ...order,
    extra_detail: extra.detail,
    extra_amount: extra.amount,
    paid_by: extra.paid_by || order.paid_by,
    final_images: extra.images || order.final_images,
    extra_status: extra.status || order.extra_status,
    order_extra: [...existing, extra],
  };
};

export const mergeOrderWithExtras = (
  order: OrderType,
  extras: OrderExtra[],
): OrderType => {
  // Empty means "not loaded yet" from callers — keep order's existing extras.
  if (!extras.length) {
    return order;
  }

  const latest = getLatestOrderExtra(extras)!;
  return {
    ...order,
    extra_detail: latest.detail || order.extra_detail,
    extra_amount: latest.amount || order.extra_amount,
    paid_by: latest.paid_by || order.paid_by,
    final_images: latest.images || order.final_images,
    extra_status: latest.status || order.extra_status,
    order_extra: extras,
  };
};

/** Oldest → newest so Extra Added 1, 2 match creation order */
export const sortOrderExtrasAscending = (extras: OrderExtra[]): OrderExtra[] =>
  [...extras].sort((a, b) => {
    const idA = Number(a.id) || 0;
    const idB = Number(b.id) || 0;
    if (idA !== idB) return idA - idB;
    return (
      new Date(a.created_at || a.timestamp || 0).getTime() -
      new Date(b.created_at || b.timestamp || 0).getTime()
    );
  });

export type ExtraImages = {
  itemImage?: string;
  recipeImage?: string;
};

export const parseExtraImages = (images?: string): ExtraImages => {
  if (!images) return {};
  try {
    const parsed = JSON.parse(images);
    if (parsed && typeof parsed === "object") {
      return {
        itemImage: parsed.itemImage ? String(parsed.itemImage) : undefined,
        recipeImage: parsed.recipeImage
          ? String(parsed.recipeImage)
          : undefined,
      };
    }
  } catch {
    return {};
  }
  return {};
};

export const parseExtraTimestamp = (createdAt?: string): number => {
  if (!createdAt) return Date.now();
  const normalized = createdAt.includes("T")
    ? createdAt
    : createdAt.replace(" ", "T");
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const normalizeExtraStatus = (status?: string): string =>
  String(status || "pending").toLowerCase();

export const resolveOrderExtraStatus = (order: OrderType): string => {
  const extras = parseOrderExtrasFromOrder(order);
  const latestExtra = getLatestOrderExtra(extras);
  if (latestExtra?.status) {
    return normalizeExtraField(latestExtra.status);
  }

  return normalizeExtraField(
    (order as Record<string, unknown>).extra_status as string,
  );
};

export const formatExtraStatusLabel = (
  status: string | undefined,
  t: (key: string, defaultValue?: string) => string,
): string => {
  const normalized = normalizeExtraField(status).toLowerCase();
  if (!normalized) return t("order.extraStatusNone", "No status");
  if (normalized === "accepted") {
    return t("order.extraStatusAccepted", "Accepted");
  }
  if (normalized === "rejected") {
    return t("order.extraStatusRejected", "Rejected");
  }
  if (normalized === "pending") {
    return t("order.extraStatusPending", "Pending");
  }

  return normalizeExtraField(status);
};

export const parseOrderExtrasFromOrder = (order: OrderType): OrderExtra[] => {
  const raw = order.order_extra;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((item) => item && typeof item === "object")
      .map((item) => normalizeOrderExtra(item as Record<string, unknown>))
      .filter(hasOrderExtraContent);
  }

  if (typeof raw === "object") {
    const extra = normalizeOrderExtra(raw as Record<string, unknown>);
    return hasOrderExtraContent(extra) ? [extra] : [];
  }

  return [];
};

export type ExtraChatMessage = {
  id: string;
  text: string;
  sender: "user" | "provider";
  timestamp: number;
  msgType: "extra";
  extraData: OrderExtra;
  senderName: string;
};

export const extraToChatMessage = (extra: OrderExtra): ExtraChatMessage => ({
  id: `extra-${extra.id}`,
  text: extra.detail || "",
  sender: "provider",
  timestamp: parseExtraTimestamp(extra.created_at || extra.timestamp),
  msgType: "extra",
  extraData: extra,
  senderName: "",
});

export const syncOrderExtrasForChat = async (
  orderId: string,
  orderData?: OrderType | null,
): Promise<OrderExtra[]> => {
  const embedded = orderData ? parseOrderExtrasFromOrder(orderData) : [];
  if (embedded.length > 0) {
    return embedded;
  }

  try {
    const extras = await fetchOrderExtras(orderId);
    return extras.filter(hasOrderExtraContent);
  } catch {
    return [];
  }
};
