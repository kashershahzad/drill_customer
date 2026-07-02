import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppState, Platform } from "react-native";
import { useToast } from "~/components/ToastProvider";
import { useAuth } from "~/contexts/AuthContext";
import { apiCall } from "~/utils/api";
import {
  ForegroundNotificationPayload,
  initializePushNotifications,
  NotificationData,
  setupNotificationListeners,
} from "~/utils/notification";

const POLL_INTERVAL_MS = 5000;
const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

const parseStoredOrderId = (id: string | null): string | null => {
  if (!id) return null;
  try {
    return String(JSON.parse(id));
  } catch {
    return id.replace(/^"|"$/g, "");
  }
};

const normalizeStatus = (status?: string | null) =>
  status?.toLowerCase().trim() || "";

export default function OrderNotificationHandler() {
  const { isLoggedIn, userId } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const lastStatusRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      lastStatusRef.current = null;
      return;
    }

    let isActive = true;

    const getStatusMessage = (status: string) => {
      switch (normalizeStatus(status)) {
        case "accepted":
          return { message: t("order.orderAccepted"), type: "success" as const };
        case "on_the_way":
          return { message: t("order.providerOnWay"), type: "info" as const };
        case "arrived":
          return { message: t("order.providerArrived"), type: "success" as const };
        case "started":
          return { message: t("order.serviceStarted"), type: "info" as const };
        case "in_progress":
          return {
            message: t("order.serviceInProgress"),
            type: "info" as const,
          };
        case "completed":
          return {
            message: t("order.serviceCompleted"),
            type: "success" as const,
          };
        case "cancelled":
          return { message: t("order.orderCancelled"), type: "warning" as const };
        default:
          return {
            message: `${t("order.orderStatusUpdated")} ${status}`,
            type: "info" as const,
          };
      }
    };

    const notifyStatusChange = (status: string) => {
      const normalized = normalizeStatus(status);
      if (!normalized || TERMINAL_STATUSES.has(normalized)) {
        lastStatusRef.current = normalized;
        return;
      }

      if (lastStatusRef.current === normalized) return;

      const previous = lastStatusRef.current;
      lastStatusRef.current = normalized;

      if (!previous) return;

      const { message, type } = getStatusMessage(status);
      showToast(message, type, Platform.OS === "ios" ? 3500 : 2000);
    };

    const showForegroundAlert = (payload: ForegroundNotificationPayload) => {
      const message =
        payload.body ||
        payload.data?.message ||
        payload.title ||
        payload.data?.title;

      if (!message) return;

      showToast(message, "info", Platform.OS === "ios" ? 3500 : 2000);
    };

    const handleNotificationData = async (data: NotificationData) => {
      if (data.message) {
        showToast(
          data.message,
          "info",
          Platform.OS === "ios" ? 3500 : 2000,
        );
      }

      const orderId = parseStoredOrderId(data.order_id || null);
      if (!orderId) return;

      await AsyncStorage.setItem("order_id", orderId);

      if (data.status) {
        notifyStatusChange(data.status);
      }
    };

    const pollActiveOrder = async () => {
      try {
        const storedOrderId = parseStoredOrderId(
          await AsyncStorage.getItem("order_id"),
        );
        if (!storedOrderId) return;

        const formData = new FormData();
        formData.append("type", "get_data");
        formData.append("table_name", "orders");
        formData.append("id", storedOrderId);

        const response = await apiCall(formData);
        const order = response?.data?.[0];
        if (!order?.status) return;

        notifyStatusChange(order.status);
      } catch (error) {
        console.warn("[OrderNotificationHandler] poll failed:", error);
      }
    };

    const startPolling = () => {
      if (pollIntervalRef.current) return;
      void pollActiveOrder();
      pollIntervalRef.current = setInterval(() => {
        void pollActiveOrder();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (!pollIntervalRef.current) return;
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    };

    const init = async () => {
      await initializePushNotifications(userId);
      if (!isActive) return;

      startPolling();
    };

    void init();

    const unsubscribe = setupNotificationListeners(
      (data) => {
        void handleNotificationData(data);
      },
      showForegroundAlert,
    );

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void pollActiveOrder();
      }
    });

    return () => {
      isActive = false;
      stopPolling();
      unsubscribe();
      appStateSub.remove();
    };
  }, [isLoggedIn, userId, showToast, t]);

  return null;
}
