import Button from "@/components/button";
import Header from "@/components/header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RNModal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import Popup from "~/components/popup";
import { useToast } from "~/components/ToastProvider";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { apiCall } from "~/utils/api";
import { calculateDistance } from "~/utils/distance";
import { setupNotificationListeners } from "~/utils/notification";
import {
  fetchOrderExtras,
  getAcceptedOrderExtrasAdjustment,
  getOrderPayableTotalFromOrder,
  getLatestOrderExtra,
  getLatestPendingOrderExtra,
  getOrderExtraActionErrorMessage,
  getOrderExtraStorageKey,
  hasOrderExtraContent,
  isOrderExtraActionSuccessful,
  isPendingOrderExtra,
  mergeOrderWithExtras,
  OrderExtra,
  respondToOrderExtra,
} from "~/utils/orderExtra";
import { ms, s, vs } from "~/utils/responsive";
// import { createTapCharge } from "~/utils/tapPayment";
import { startTapPayment, toTapPreferredPayment } from "~/utils/tapPayment";
import ChatScreen from "./chat_screen";
import OrderDetails from "./order_details";

type PopupType =
  | "timeup"
  | "tipup"
  | "orderComplete"
  | "review"
  | "accepted"
  | "arrived"
  | "on-way"
  | "completed"
  | "time-up"
  | "extraAdded";

// Define notification data type
interface NotificationData {
  order_id?: string;
  status?: string;
  message?: string;
}

const EXTRA_POPUP_SEEN_PREFIX = "extra_popup_seen_";

const BLOCKING_POPUP_TYPES = new Set<PopupType>([
  "arrived",
  "time-up",
  "timeup",
  "review",
  "orderComplete",
  "tipup",
]);

const OrderPlace: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    tab ? String(tab) : "Details",
  );
  const [chatSupportSignal, setChatSupportSignal] = useState(0);
  const [popupType, setPopupType] = useState<PopupType | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [detailsScreen, setDetailsScreen] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayingNow, setIsPayingNow] = useState(false);
  const [manualCompletionFlow, setManualCompletionFlow] = useState(false);
  const [order, setOrder] = useState<OrderType | null>(null);
  const [orderExtra, setOrderExtra] = useState<OrderExtra | null>(null);
  const [allOrderExtras, setAllOrderExtras] = useState<OrderExtra[]>([]);
  const [pendingOrderExtra, setPendingOrderExtra] = useState<OrderExtra | null>(
    null,
  );
  const lastShownStatusRef = useRef<string | null>(null);
  const proximityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderRef = useRef<OrderType | null>(null);
  const orderExtraRef = useRef<OrderExtra | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const popupTypeRef = useRef<PopupType | null>(null);
  const proximityPopupShownRef = useRef<boolean>(false);
  const pendingExtraStorageKeyRef = useRef<string | null>(null);
  const pendingOrderExtraRef = useRef<OrderExtra | null>(null);
  const queuedPendingExtraRef = useRef<{
    extra: OrderExtra;
    orderId: string;
  } | null>(null);
  const acceptedExtraTotalRef = useRef(0);
  const orderExtrasRef = useRef<OrderExtra[]>([]);
  const rejectedExtraKeysRef = useRef<Set<string>>(new Set());
  const isExtraActionRef = useRef(false);
  const completionPopupShownRef = useRef<boolean>(false);

  const POLL_INTERVAL_MS = 5000;
  const TERMINAL_ORDER_STATUSES = ["completed", "cancelled", "complete"];

  const normalizeStatus = (status?: string | null) =>
    status?.toLowerCase().trim() || "";

  const isOrderCompleted = (orderData: OrderType | null | undefined) => {
    if (!orderData) return false;

    const status = normalizeStatus(orderData.status);
    if (status === "completed" || status === "complete") return true;
    if (orderData.order_completed) return true;

    if (Array.isArray(orderData.history)) {
      return orderData.history.some(
        (entry: { status?: string }) =>
          normalizeStatus(entry.status) === "completed",
      );
    }

    return false;
  };

  const hasCustomerReview = (orderData: OrderType) => {
    const nestedReview =
      orderData.customer_review ??
      (typeof orderData.review === "object" && orderData.review !== null
        ? orderData.review
        : null);

    if (nestedReview && typeof nestedReview === "object") {
      return Number((nestedReview as { rating?: string }).rating ?? 0) > 0;
    }

    return (
      Number(orderData.rating ?? 0) > 0 ||
      (typeof orderData.review === "string" && orderData.review.trim().length > 0)
    );
  };

  const showOrderCompletePopup = (orderData?: OrderType | null) => {
    if (orderData && hasCustomerReview(orderData)) return;
    if (completionPopupShownRef.current) return;
    if (
      popupTypeRef.current === "orderComplete" ||
      popupTypeRef.current === "review"
    ) {
      return;
    }

    completionPopupShownRef.current = true;
    lastShownStatusRef.current = "completed";
    setPopupType("orderComplete");
  };

  useEffect(() => {
    if (tab) {
      setActiveTab(String(tab));
    }
  }, [tab]);

  const handleSupportRequested = useCallback(async () => {
    setActiveTab("Chat");
    setChatSupportSignal((prev) => prev + 1);
  }, []);

  const isPastArrivedPhase = (status: string) =>
    ["started", "in_progress", "completed", "time_up"].includes(status);

  const parseStoredOrderId = (id: string | null): string | null => {
    if (!id) return null;
    try {
      return String(JSON.parse(id));
    } catch {
      return id.replace(/^"|"$/g, "");
    }
  };

  const normalizeOrderId = (id: string | number | null | undefined): string => {
    if (id == null) return "";
    return parseStoredOrderId(String(id)) ?? String(id);
  };

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    orderExtraRef.current = orderExtra;
  }, [orderExtra]);

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  useEffect(() => {
    popupTypeRef.current = popupType;
  }, [popupType]);

  useEffect(() => {
    if (popupType) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [popupType]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        try {
          const storedOrderId = await AsyncStorage.getItem("order_id");
          const userId = await AsyncStorage.getItem("user_id");
          const parsedOrderId = parseStoredOrderId(storedOrderId);

          if (!isActive) return;

          setOrderId(storedOrderId);
          setUserId(userId);

          if (parsedOrderId) {
            await fetchOrderDetails(parsedOrderId, true);
            startOrderPolling(parsedOrderId);
          }
        } catch (error) {
          console.error("Initialization error:", error);
          showToast(t("order.failedToInitialize"), "error");
        }
      };

      init();

      return () => {
        isActive = false;
        stopProximityCheck();
        stopOrderPolling();
      };
    }, []),
  );

  const applyOrderUpdate = (orderData: OrderType): boolean => {
    const previousOrder = orderRef.current;
    const previousStatus = normalizeStatus(previousOrder?.status);
    const nextStatus = normalizeStatus(orderData.status);
    let deferExtraPopup = false;
    const wasCompleted = isOrderCompleted(previousOrder);
    const isCompleted = isOrderCompleted(orderData);

    if (previousOrder && previousStatus !== nextStatus) {
      handleOrderStatusChange(
        previousOrder.status || "",
        orderData.status || "",
      );
      if (["arrived", "completed", "time_up"].includes(nextStatus)) {
        deferExtraPopup = true;
      }
    } else if (!previousOrder && orderData.status) {
      if (nextStatus === "arrived") {
        showStatusNotification("arrived", undefined, true);
        deferExtraPopup = true;
      } else {
        lastShownStatusRef.current = isPastArrivedPhase(nextStatus)
          ? "arrived"
          : (orderData.status ?? null);
      }
    }

    if (!wasCompleted && isCompleted && previousOrder) {
      showOrderCompletePopup(orderData);
    } else if (!previousOrder && isCompleted && !hasCustomerReview(orderData)) {
      showOrderCompletePopup(orderData);
    }

    setOrder(orderData);
    orderRef.current = orderData;

    const hasProvider = orderData.provider && orderData.provider.id;
    const hasProviderLocation =
      orderData.provider?.lat && orderData.provider?.lng;
    const hasCustomerLocation = orderData.lat && orderData.lng;
    const isActiveStatus =
      nextStatus === "accepted" || nextStatus === "on_the_way";

    if (
      hasProvider &&
      hasProviderLocation &&
      hasCustomerLocation &&
      isActiveStatus
    ) {
      ensureProximityCheck(orderData);
    } else {
      stopProximityCheck();
    }

    if (isCompleted) {
      stopOrderPolling();
    }

    return deferExtraPopup;
  };

  const maybeShowExtraPopup = async (
    extra: OrderExtra | null,
    orderIdParam: string,
  ) => {
    if (!isPendingOrderExtra(extra) || !extra) return;

    const storageKey = getOrderExtraStorageKey(
      orderIdParam,
      extra,
      EXTRA_POPUP_SEEN_PREFIX,
    );

    try {
      if (rejectedExtraKeysRef.current.has(storageKey)) return;

      const seen = await AsyncStorage.getItem(storageKey);
      if (seen === "1") return;

      const currentPopup = popupTypeRef.current;
      if (currentPopup && BLOCKING_POPUP_TYPES.has(currentPopup)) {
        // Show after the current blocking popup closes (arrived/tip/etc).
        queuedPendingExtraRef.current = { extra, orderId: orderIdParam };
        return;
      }

      if (currentPopup === "extraAdded") {
        // Already showing an extra popup — keep the latest pending queued.
        queuedPendingExtraRef.current = { extra, orderId: orderIdParam };
        return;
      }

      queuedPendingExtraRef.current = null;
      pendingExtraStorageKeyRef.current = storageKey;
      pendingOrderExtraRef.current = extra;
      setPendingOrderExtra(extra);
      setPopupType("extraAdded");
    } catch (error) {
      console.warn("[OrderPlace] extra popup check failed:", error);
    }
  };

  const flushQueuedExtraPopup = () => {
    const queued = queuedPendingExtraRef.current;
    if (!queued) return;
    if (popupTypeRef.current) return;
    void maybeShowExtraPopup(queued.extra, queued.orderId);
  };

  useEffect(() => {
    if (popupType !== null) return;

    // After arrived/tip/review closes, show any pending extra on this screen.
    const timer = setTimeout(() => {
      flushQueuedExtraPopup();
    }, 350);

    return () => clearTimeout(timer);
  }, [popupType]);

  const fetchOrderDetails = async (id: string, showLoading = false) => {
    const parsedId = parseStoredOrderId(id) ?? id;

    if (showLoading) {
      setIsLoading(true);
    }

    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "orders");
    formData.append("customer_review", userId || "");
    formData.append("id", parsedId);

    try {
      const [response, extras] = await Promise.all([
        apiCall(formData),
        fetchOrderExtras(parsedId).catch((error) => {
          console.warn("[OrderPlace] failed to fetch order extras:", error);
          return [] as OrderExtra[];
        }),
      ]);

      const latestExtra = getLatestOrderExtra(extras);
      const latestPendingExtra = getLatestPendingOrderExtra(extras);
      const extrasWithContent = extras.filter(
        (extra) =>
          hasOrderExtraContent(extra) ||
          Boolean(extra.amount) ||
          Boolean(extra.id),
      );
      orderExtrasRef.current = extrasWithContent;
      setAllOrderExtras(extrasWithContent);
      setOrderExtra(latestExtra);
      orderExtraRef.current = latestPendingExtra ?? latestExtra;

      // console.log("customer rating response", response);
      // console.log("[OrderPlace] order_extra response", extras);

      if (response && response.data && response.data.length > 0) {
        const orderData = response.data[0] as OrderType;
        const customerId = String(
          orderData.user?.id || orderData.user_id || userId || "",
        );
        const providerId = String(
          orderData.provider?.id ||
            orderData.provider_id ||
            orderData.to_id ||
            "",
        );
        acceptedExtraTotalRef.current = getAcceptedOrderExtrasAdjustment(
          extras,
          customerId,
          providerId,
        );
        const deferExtraPopup = applyOrderUpdate(orderData);
        if (deferExtraPopup && latestPendingExtra) {
          // Don't drop the extra while arrived/complete popup is showing.
          queuedPendingExtraRef.current = {
            extra: latestPendingExtra,
            orderId: parsedId,
          };
        } else {
          void maybeShowExtraPopup(latestPendingExtra, parsedId);
        }
        return orderData;
      }

      setOrderExtra(null);
      orderExtraRef.current = null;
      orderExtrasRef.current = [];
      setAllOrderExtras([]);
      acceptedExtraTotalRef.current = 0;

      if (showLoading) {
        showToast(t("order.noOrderDetailsFound"), "error");
        setOrder(null);
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch order details", error);
      if (showLoading) {
        showToast(t("order.failedToFetchDetails"), "error");
        setOrder(null);
      }
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const getOrderDetails = async (id: string) => {
    const orderData = await fetchOrderDetails(id, true);
    if (
      orderData?.status &&
      !TERMINAL_ORDER_STATUSES.includes(normalizeStatus(orderData.status)) &&
      !isOrderCompleted(orderData)
    ) {
      startOrderPolling(id);
    }
  };

  const refreshOrderDetails = async (id: string) => {
    await fetchOrderDetails(id, false);
  };

  const stopOrderPolling = () => {
    if (orderPollIntervalRef.current) {
      clearInterval(orderPollIntervalRef.current);
      orderPollIntervalRef.current = null;
    }
  };

  const startOrderPolling = (id: string) => {
    stopOrderPolling();

    const parsedId = parseStoredOrderId(id) ?? id;

    orderPollIntervalRef.current = setInterval(() => {
      refreshOrderDetails(parsedId);
    }, POLL_INTERVAL_MS);
  };

  const checkProximity = async (orderData: OrderType) => {
    try {
      let customerLat: number | null = null;
      let customerLng: number | null = null;

      if (orderData.lat && orderData.lng) {
        customerLat = parseFloat(orderData.lat);
        customerLng = parseFloat(orderData.lng);
      } else if (orderData.user?.lat && orderData.user?.lng) {
        customerLat = parseFloat(orderData.user.lat);
        customerLng = parseFloat(orderData.user.lng);
      }

      let providerLat: number | null = null;
      let providerLng: number | null = null;

      if (orderData.provider?.lat && orderData.provider?.lng) {
        providerLat = parseFloat(orderData.provider.lat);
        providerLng = parseFloat(orderData.provider.lng);
      }

      if (!customerLat || !customerLng) return;
      if (!providerLat || !providerLng) return;

      if (
        isNaN(customerLat) ||
        isNaN(customerLng) ||
        isNaN(providerLat) ||
        isNaN(providerLng)
      ) {
        console.error("❌ Proximity Check - Invalid coordinates:", {
          customerLat,
          customerLng,
          providerLat,
          providerLng,
        });
        return;
      }

      const distance = calculateDistance(
        customerLat,
        customerLng,
        providerLat,
        providerLng,
      );

      if (
        distance <= 300 &&
        normalizeStatus(orderData.status) === "arrived" &&
        !proximityPopupShownRef.current
      ) {
        proximityPopupShownRef.current = true;
        showStatusNotification("arrived", undefined, true);
      }
    } catch (error) {
      console.error("❌ Error checking proximity:", error);
    }
  };

  const startProximityCheck = (orderData: OrderType) => {
    proximityPopupShownRef.current = false;
    checkProximity(orderData);

    proximityCheckIntervalRef.current = setInterval(() => {
      if (orderRef.current) {
        checkProximity(orderRef.current);
      }
    }, POLL_INTERVAL_MS);
  };

  const ensureProximityCheck = (orderData: OrderType) => {
    if (proximityCheckIntervalRef.current) {
      checkProximity(orderData);
      return;
    }

    startProximityCheck(orderData);
  };

  const stopProximityCheck = () => {
    if (proximityCheckIntervalRef.current) {
      clearInterval(proximityCheckIntervalRef.current);
      proximityCheckIntervalRef.current = null;
    }
  };

  const handleOrderStatusChange = (_oldStatus: string, newStatus: string) => {
    showStatusNotification(newStatus);
  };

  const showStatusNotification = (
    status: string,
    _customMessage?: string,
    forceShow: boolean = false,
  ) => {
    const normalized = normalizeStatus(status);

    if (normalized === "arrived") {
      if (
        forceShow ||
        (lastShownStatusRef.current !== "arrived" &&
          popupTypeRef.current !== "arrived")
      ) {
        lastShownStatusRef.current = "arrived";
        setPopupType("arrived");
      }
      return;
    }

    if (normalized === "time_up") {
      if (
        lastShownStatusRef.current !== "time_up" &&
        popupTypeRef.current !== "time-up"
      ) {
        lastShownStatusRef.current = "time_up";
        setPopupType("time-up");
      }
      return;
    }

    // Status updates rely on polling/UI — no top toast banners.
    lastShownStatusRef.current = normalized || lastShownStatusRef.current;
  };

  useEffect(() => {
    const handleNotificationPress = async (data: NotificationData) => {
      if (!data?.order_id) return;

      const incomingOrderId = normalizeOrderId(data.order_id);
      const currentOrderId = normalizeOrderId(orderIdRef.current);

      if (currentOrderId && incomingOrderId !== currentOrderId) return;

      await refreshOrderDetails(incomingOrderId);

      const liveStatus = normalizeStatus(orderRef.current?.status);
      const notifiedStatus = normalizeStatus(data.status);

      if (notifiedStatus === "arrived" || liveStatus === "arrived") {
        showStatusNotification("arrived", undefined, true);
        return;
      }

      if (!data.status || notifiedStatus !== liveStatus) return;

      showStatusNotification(data.status, data.message, false);
    };

    const unsubscribe = setupNotificationListeners(
      handleNotificationPress,
      (payload) => {
        const notifiedStatus = normalizeStatus(payload.data?.status);
        if (notifiedStatus === "arrived") {
          void handleNotificationPress({
            order_id: payload.data?.order_id,
            status: payload.data?.status,
            message: payload.data?.message,
          });
          return;
        }

        // Refresh order silently — no top toast for push alerts.
        const orderIdFromPayload = payload.data?.order_id;
        if (orderIdFromPayload) {
          void handleNotificationPress({
            order_id: orderIdFromPayload,
            status: payload.data?.status,
            message: payload.data?.message,
          });
        }
      },
    );
    return () => {
      unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState !== "active") return;

      const currentOrderId = parseStoredOrderId(orderIdRef.current);
      if (currentOrderId) {
        refreshOrderDetails(currentOrderId);
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const isCashPayment = useCallback(() => {
    return (order?.payment_method || "").toLowerCase().trim() === "cash";
  }, [order?.payment_method]);

  const processTapPayment = useCallback(
    async (tipAmountStr: string) => {
      if (isPayingNow || !orderId || !order) return;

      if (isCashPayment()) {
        // console.log("[Pay Now] Cash order — skipping Tap payment");
        return;
      }

      setIsPayingNow(true);

      try {
        const parsedOrderId = orderId.startsWith('"')
          ? JSON.parse(orderId)
          : orderId;
        const customerId = String(
          order.user?.id || order.user_id || userId || "",
        );
        const providerId = String(
          order.provider?.id || order.provider_id || order.to_id || "",
        );
        const amount = getOrderPayableTotalFromOrder(
          order,
          orderExtrasRef.current,
          customerId,
          providerId,
        );
        const tipAmount = parseFloat(tipAmountStr || "0");

        // console.log(
        //   "[Pay Now] Starting Tap payment for order:",
        //   parsedOrderId,
        //   {
        //     amount,
        //     tipAmount,
        //     total: amount + tipAmount,
        //   },
        // );
        // const response = await createTapCharge(
        //   amount,
        //   "SAR",
        //   parsedOrderId,
        //   tipAmount,
        // );
        await new Promise<void>((resolve, reject) => {
          const preferredPayment = toTapPreferredPayment(
            order?.method_details || order?.payment_method,
          );
          startTapPayment({
            orderId: parsedOrderId,
            amount,
            tipAmount,
            preferredPayment,
            onStarted: () => setIsPayingNow(false),
            onSuccess: async () => {
              showToast(t("order.paymentSuccess"), "success");
              await refreshOrderDetails(String(parsedOrderId));
              resolve();
            },
            onCancelled: () => resolve(),
            onError: (message) => reject(new Error(message)),
          });
        });
        // console.log("[Pay Now] Tap payment response:", response);
      } catch (error) {
        console.error("[Pay Now] Error:", error);
        showToast(t("order.paymentFailed"), "error");
      } finally {
        setIsPayingNow(false);
      }
    },
    [
      isPayingNow,
      isCashPayment,
      order?.amount,
      order?.method_details,
      order?.payment_method,
      order?.user?.id,
      order?.user_id,
      order?.provider?.id,
      order?.provider_id,
      order?.to_id,
      orderId,
      userId,
      showToast,
      t,
      refreshOrderDetails,
    ],
  );

  const handlePay = () => {
    if (isPayingNow || !orderId) return;
    if (isCashPayment()) {
      showToast(t("order.cashPaymentAtService"), "info");
      return;
    }
    setPopupType("tipup");
  };

  const handleCompleteOrder = () => {
    if (!orderId || order?.status === "completed") return;
    setManualCompletionFlow(true);
    setPopupType("time-up");
  };

  const handleCompleteToReview = () => {
    setPopupType("review");
  };

  const handleExtraPopupDismiss = async () => {
    const storageKey = pendingExtraStorageKeyRef.current;
    if (storageKey) {
      rejectedExtraKeysRef.current.add(storageKey);
    }
    await markExtraPopupSeen();
    setPendingOrderExtra(null);
    pendingOrderExtraRef.current = null;
    setPopupType(null);
  };

  const closePopup = () => {
    if (popupType === "extraAdded") {
      void handleExtraPopupDismiss();
      return;
    }
    setPopupType(null);
    setManualCompletionFlow(false);
  };

  const markExtraPopupSeen = async () => {
    const storageKey = pendingExtraStorageKeyRef.current;
    if (storageKey) {
      try {
        await AsyncStorage.setItem(storageKey, "1");
      } catch (error) {
        console.warn(
          "[OrderPlace] failed to persist extra popup state:",
          error,
        );
      }
      pendingExtraStorageKeyRef.current = null;
    }
  };

  const handleExtraAccepted = async () => {
    if (isExtraActionRef.current) return;

    const parsedOrderId =
      parseStoredOrderId(orderId) ?? normalizeOrderId(orderId);
    if (!parsedOrderId) {
      showToast(t("order.failedToAcceptExtra"), "error");
      return;
    }

    const extraId =
      pendingOrderExtraRef.current?.id ?? orderExtraRef.current?.id;
    if (!extraId) {
      showToast(t("order.failedToAcceptExtra"), "error");
      return;
    }

    isExtraActionRef.current = true;
    try {
      const response = await respondToOrderExtra(
        parsedOrderId,
        "accepted",
        extraId,
      );
      if (isOrderExtraActionSuccessful(response)) {
        await markExtraPopupSeen();
        setPendingOrderExtra(null);
        pendingOrderExtraRef.current = null;
        setPopupType(null);
        await refreshOrderDetails(parsedOrderId);
      } else {
        showToast(
          getOrderExtraActionErrorMessage(response) ||
            t("order.failedToAcceptExtra"),
          "error",
        );
      }
    } catch (error) {
      console.error("[OrderPlace] accept extra failed:", error);
      showToast(t("order.failedToAcceptExtra"), "error");
    } finally {
      isExtraActionRef.current = false;
    }
  };

  const handleExtraRejected = async () => {
    if (isExtraActionRef.current) return;

    const parsedOrderId =
      parseStoredOrderId(orderId) ?? normalizeOrderId(orderId);
    if (!parsedOrderId) {
      showToast(t("order.failedToRejectExtra"), "error");
      return;
    }

    const extraId =
      pendingOrderExtraRef.current?.id ?? orderExtraRef.current?.id;
    if (!extraId) {
      showToast(t("order.failedToRejectExtra"), "error");
      return;
    }

    isExtraActionRef.current = true;
    try {
      const response = await respondToOrderExtra(
        parsedOrderId,
        "rejected",
        extraId,
      );
      if (isOrderExtraActionSuccessful(response)) {
        const storageKey = pendingExtraStorageKeyRef.current;
        if (storageKey) {
          rejectedExtraKeysRef.current.add(storageKey);
        }
        pendingExtraStorageKeyRef.current = null;
        setPendingOrderExtra(null);
        pendingOrderExtraRef.current = null;
        setPopupType(null);
        await refreshOrderDetails(parsedOrderId);
      } else {
        showToast(
          getOrderExtraActionErrorMessage(response) ||
            t("order.failedToRejectExtra"),
          "error",
        );
      }
    } catch (error) {
      console.error("[OrderPlace] reject extra failed:", error);
      showToast(t("order.failedToRejectExtra"), "error");
    } finally {
      isExtraActionRef.current = false;
    }
  };

  const handleArrivedConfirmed = async () => {
    if (!orderId) return;

    const parsedOrderId = parseStoredOrderId(orderId) ?? orderId;
    lastShownStatusRef.current = "started";

    setOrder((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, status: "started" };
      orderRef.current = updated;
      return updated;
    });

    setPopupType(null);
    await refreshOrderDetails(parsedOrderId);
    // Extra popup (if queued) will flush when popupType becomes null.
  };

  const handleCancel = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    const latitude = await AsyncStorage.getItem("latitude");
    const longitude = await AsyncStorage.getItem("longitude");
    if (orderId) {
      const parsedOrderId = orderId.startsWith('"')
        ? JSON.parse(orderId)
        : orderId;

      const formData = new FormData();
      formData.append("type", "add_data");
      formData.append("table_name", "order_history");
      formData.append("user_id", userId || "");
      formData.append("lat", latitude || "");
      formData.append("lng", longitude || "");
      formData.append("order_id", parsedOrderId);
      formData.append("status", "cancelled");

      try {
        const response = await apiCall(formData);
        if (response && response.result === true) {
          await AsyncStorage.removeItem("order_id");
          showToast(t("order.orderCancelledSuccess"), "success");
          router.replace("/(tabs)/orders");
        } else {
          showToast(t("order.failedToCancel"), "error");
        }
      } catch (error) {
        console.error("Error cancelling order:", error);
        showToast(t("order.errorCancelling"), "error");
      }
    }
  };

  const handleActiveChat = () => {
    setActiveTab("Chat");
    setDetailsScreen(false);
  };

  const handleDetailsScreen = () => {
    setActiveTab("Details");
    setDetailsScreen(true);

    const parsedId =
      parseStoredOrderId(orderId) ?? normalizeOrderId(orderId);
    const pending =
      pendingOrderExtraRef.current ||
      (isPendingOrderExtra(orderExtraRef.current)
        ? orderExtraRef.current
        : null) ||
      queuedPendingExtraRef.current?.extra ||
      null;

    if (parsedId && pending) {
      void maybeShowExtraPopup(pending, parsedId);
    }
  };

  const handleOrderCompleted = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    const latitude = await AsyncStorage.getItem("latitude");
    const longitude = await AsyncStorage.getItem("longitude");
    if (orderId) {
      const formData = new FormData();
      formData.append("type", "add_data");
      formData.append("table_name", "order_history");
      formData.append("user_id", userId || "");
      formData.append("lat", latitude || "");
      formData.append("lng", longitude || "");
      formData.append("order_id", orderId);
      formData.append("status", "completed");

      try {
        const response = await apiCall(formData);
        if (response && response.result === true) {
          setManualCompletionFlow(false);
          setPopupType(null);
          router.replace("/(tabs)");
        } else {
          showToast(t("order.failedToComplete"), "error");
        }
      } catch (error) {
        console.error("Error completing order:", error);
        showToast(t("order.errorCompleting"), "error");
      }
    }
  };

  const handleReviewSubmitted = async () => {
    if (order?.status?.toLowerCase() === "completed") {
      setPopupType(null);
      if (orderId) {
        const parsedOrderId = parseStoredOrderId(orderId) ?? orderId;
        await refreshOrderDetails(parsedOrderId);
      }
      return;
    }

    await handleOrderCompleted();
  };

  const handleAddRating = () => {
    setPopupType("review");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Header
            backBtn={true}
            title={t("order.loading")}
            icon={true}
            support={true}
            backAddress={"/(tabs)/orders"}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size={"large"} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Header
            backBtn={true}
            title={t("order.orderDetails")}
            icon={true}
            support={true}
            backAddress={"/(tabs)/orders"}
          />
          <View style={styles.loadingContainer}>
            <Text>{t("order.noOrderDetails")}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Header
          backBtn={true}
          title={`${t("order.request")} #${order.order_no}`}
          icon={true}
          support={true}
          backAddress={"/(tabs)/orders"}
          onSupportRequested={handleSupportRequested}
        />
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={
              activeTab === "Details" ? styles.activeTab : styles.inactiveTab
            }
            onPress={handleDetailsScreen}
          >
            <Text
              style={
                activeTab === "Details"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              {t("booking.details")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={activeTab === "Chat" ? styles.activeTab : styles.inactiveTab}
            onPress={handleActiveChat}
          >
            <Text
              style={
                activeTab === "Chat"
                  ? styles.activeTabText
                  : styles.inactiveTabText
              }
            >
              {t("booking.chat")}
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === "Details" ? (
          <OrderDetails
            order={mergeOrderWithExtras(order, allOrderExtras) as OrderType}
            extras={allOrderExtras}
            onAddRating={
              order.status?.toLowerCase() === "completed" &&
              Number(order.customer_review?.rating ?? order.rating ?? 0) <= 0
                ? handleAddRating
                : undefined
            }
          />
        ) : (
          <ChatScreen supportRefreshSignal={chatSupportSignal} />
        )}
      </View>

      {activeTab === "Details" && (
        <View style={styles.footerButtons}>
          {order.payment_status === "pending" ? (
            order.status === "pending" ||
            order.status === "accepted" ||
            order.status === "arrived" ? (
              <>
                <Button
                  title={t("cancel")}
                  variant="secondary"
                  fullWidth={false}
                  width="32%"
                  onPress={handleCancel}
                />
                <Button
                  title={isPayingNow ? `${t("paynow")}...` : t("paynow")}
                  variant="primary"
                  fullWidth={false}
                  width="65%"
                  onPress={handlePay}
                  disabled={isPayingNow}
                />
              </>
            ) : (
              <Button
                title={isPayingNow ? `${t("paynow")}...` : t("paynow")}
                variant="primary"
                fullWidth={true}
                width="100%"
                onPress={handlePay}
                disabled={isPayingNow}
              />
            )
          ) : order?.status === "completed" ? null : order.payment_status ===
            "paid" ? (
            order.status === "accepted" || order.status === "arrived" ? (
              <Button
                title={t("order.completeOrder")}
                variant="primary"
                fullWidth={true}
                width="100%"
                onPress={handleCompleteOrder}
              />
            ) : (
              <Button
                title={t("cancel")}
                variant="secondary"
                fullWidth={true}
                width="100%"
                onPress={handleCancel}
              />
            )
          ) : order.status === "pending" ||
            order.status === "on_the_way" ||
            order.status === "arrived" ? (
            <Button
              title={t("cancel")}
              variant="secondary"
              fullWidth={true}
              width="100%"
              onPress={handleCancel}
            />
          ) : (
            <>
              <Button
                title={t("cancel")}
                variant="secondary"
                fullWidth={false}
                width="32%"
                onPress={handleCancel}
              />
              <Button
                title={isPayingNow ? `${t("paynow")}...` : t("paynow")}
                variant="primary"
                fullWidth={false}
                width="65%"
                onPress={handlePay}
                disabled={isPayingNow}
              />
            </>
          )}
        </View>
      )}

      {/* Popup with Background Overlay */}
      {showPopup && popupType && (
        <RNModal
          isVisible={showPopup}
          onBackdropPress={() => {
            if (popupType !== "arrived") {
              Keyboard.dismiss();
              closePopup();
            }
          }}
          onBackButtonPress={closePopup}
          style={styles.bottomModal}
          backdropOpacity={0.5}
          useNativeDriver
          useNativeDriverForBackdrop
          hideModalContentWhileAnimating
          statusBarTranslucent
          propagateSwipe
        >
          <Popup
            type={popupType}
            setShowPopup={setPopupType}
            orderId={orderId || ""}
            extraAmount={pendingOrderExtra?.amount ?? orderExtra?.amount}
            extraDetail={pendingOrderExtra?.detail ?? orderExtra?.detail}
            onCompleted={handleReviewSubmitted}
            onCompleteToReview={
              manualCompletionFlow ? handleCompleteToReview : undefined
            }
            onTipForPayment={
              popupType === "tipup" ? processTapPayment : undefined
            }
            onOrderUpdated={
              popupType === "arrived" ? handleArrivedConfirmed : undefined
            }
            onExtraAccepted={handleExtraAccepted}
            onExtraRejected={handleExtraRejected}
          />
        </RNModal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, paddingHorizontal: s(16), paddingTop: vs(8) },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primary300,
    borderRadius: ms(25),
    marginBottom: vs(10),
  },
  activeTab: {
    padding: s(14),
    backgroundColor: Colors.secondary,
    borderRadius: ms(25),
    width: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  activeTabText: {
    color: Colors.white,
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
  },
  inactiveTabText: {
    color: Colors.secondary300,
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
  },
  inactiveTab: {
    padding: s(14),
    borderRadius: ms(25),
    width: "50%",
    justifyContent: "center",
    alignItems: "center",
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: vs(8),
    paddingHorizontal: s(16),
    gap: s(4),
  },
  bottomModal: {
    justifyContent: "flex-end",
    margin: 0,
    padding: 0,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default OrderPlace;
