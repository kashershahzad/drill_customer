import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { apiCall } from "~/utils/api";

const APP_SCHEME = "drillcustomer";
// Expo Router groups like (tabs) are omitted from deep-link paths → app/(tabs)/orders.tsx = /orders
export const PAYMENT_REDIRECT_URL = `${APP_SCHEME}://orders`;
export const PAYMENT_SUCCESS_ROUTE = "/(tabs)/orders" as const;

type TapChargeCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  phone: string;
};

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

const getTapChargeCustomer = async (): Promise<TapChargeCustomer> => {
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
};

const getPaymentUrl = (response: Record<string, unknown>) => {
  const candidates = [
    response?.url,
    response?.payment_url,
    response?.redirect_url,
    (response?.data as Record<string, unknown> | undefined)?.url,
    (response?.result as Record<string, unknown> | undefined)?.url,
  ];

  return candidates.find(
    (value) => typeof value === "string" && value.startsWith("http"),
  ) as string | undefined;
};

export const openTapPaymentUrl = async (url: string) => {
  const result = await WebBrowser.openAuthSessionAsync(
    url,
    PAYMENT_REDIRECT_URL,
  );

  console.log("[Tap] Browser session result:", result);

  if (result.type === "success") {
    router.replace(PAYMENT_SUCCESS_ROUTE);
  }

  return result;
};

export const createTapCharge = async (
  amount: number,
  currency: string,
  orderId: string | number,
  tipAmount = 0,
) => {
  const orderIdValue = String(orderId).trim();
  if (!orderIdValue) {
    throw new Error("order_id is required for create_tap_charge");
  }

  const tip = Number.isFinite(tipAmount) ? Math.max(0, tipAmount) : 0;
  const totalAmount = amount + tip;
  const customer = await getTapChargeCustomer();

  const formData = new FormData();
  formData.append("type", "create_tap_charge");
  formData.append("order_id", orderIdValue);
  formData.append("amount", totalAmount.toFixed(2));
  formData.append("currency", "SAR");
  formData.append("first_name", customer.first_name);
  formData.append("last_name", customer.last_name);
  formData.append("email", customer.email);
  formData.append("country_code", customer.country_code);
  formData.append("phone", customer.phone);
  formData.append("key_type", "test");
  formData.append("redirect_url", PAYMENT_REDIRECT_URL);

  console.log("[Tap] create_tap_charge request:", {
    order_id: orderIdValue,
    amount: totalAmount.toFixed(2),
    base_amount: amount.toFixed(2),
    tip_amount: tip.toFixed(2),
    currency,
    redirect_url: PAYMENT_REDIRECT_URL,
  });

  const response = await apiCall(formData);
  console.log(
    "[Tap] create_tap_charge response:",
    JSON.stringify(response, null, 2),
  );

  const paymentUrl = getPaymentUrl(response);
  if (!paymentUrl) {
    throw new Error(
      (response as { message?: string })?.message || "Payment URL not received",
    );
  }

  console.log("[Tap] opening payment URL:", paymentUrl);
  await openTapPaymentUrl(paymentUrl);

  return { ...response, paymentUrl };
};
