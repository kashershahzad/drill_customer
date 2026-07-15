import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useAuth } from "~/contexts/AuthContext";
import { apiCall } from "~/utils/api";
import {
  initializePushNotifications,
  NotificationData,
  setupNotificationListeners,
} from "~/utils/notification";

const POLL_INTERVAL_MS = 5000;

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
  const lastStatusRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      lastStatusRef.current = null;
      return;
    }

    let isActive = true;

    const trackStatus = (status: string) => {
      const normalized = normalizeStatus(status);
      if (!normalized) return;
      lastStatusRef.current = normalized;
    };

    const handleNotificationData = async (data: NotificationData) => {
      const orderId = parseStoredOrderId(data.order_id || null);
      if (!orderId) return;

      await AsyncStorage.setItem("order_id", orderId);

      if (data.status) {
        trackStatus(data.status);
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

        trackStatus(order.status);
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

    const unsubscribe = setupNotificationListeners((data) => {
      void handleNotificationData(data);
    });

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
  }, [isLoggedIn, userId]);

  return null;
}
