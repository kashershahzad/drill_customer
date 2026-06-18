import Button from "@/components/button";
import Header from "@/components/header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Popup from "~/components/popup";
import { useToast } from "~/components/ToastProvider";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { apiCall } from "~/utils/api";
import { calculateDistance } from "~/utils/distance";
import {
  getFCMToken,
  requestFCMPermission,
  setupNotificationListeners,
} from "~/utils/notification";
import { ms, s, vs } from "~/utils/responsive";
import { createTapCharge } from "~/utils/tapPayment";
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
  | "time-up";

// Define notification data type
interface NotificationData {
  order_id?: string;
  status?: string;
  message?: string;
}

const OrderPlace: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    tab ? String(tab) : "Details",
  );
  const [popupType, setPopupType] = useState<PopupType | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [detailsScreen, setDetailsScreen] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayingNow, setIsPayingNow] = useState(false);
  const [manualCompletionFlow, setManualCompletionFlow] = useState(false);
  const [order, setOrder] = useState<OrderType | null>(null);
  const lastShownStatusRef = useRef<string | null>(null);
  const proximityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderRef = useRef<OrderType | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const popupTypeRef = useRef<PopupType | null>(null);
  const proximityPopupShownRef = useRef<boolean>(false);

  const POLL_INTERVAL_MS = 5000;
  const TERMINAL_ORDER_STATUSES = ["completed", "cancelled"];

  const normalizeStatus = (status?: string | null) =>
    status?.toLowerCase().trim() || "";

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

  const applyOrderUpdate = (orderData: OrderType) => {
    const previousOrder = orderRef.current;
    const previousStatus = normalizeStatus(previousOrder?.status);
    const nextStatus = normalizeStatus(orderData.status);

    if (previousOrder && previousStatus !== nextStatus) {
      handleOrderStatusChange(
        previousOrder.status || "",
        orderData.status || "",
      );
    } else if (!previousOrder && orderData.status) {
      if (nextStatus === "arrived") {
        showStatusNotification("arrived", undefined, true);
      } else {
        lastShownStatusRef.current = isPastArrivedPhase(nextStatus)
          ? "arrived"
          : (orderData.status ?? null);
      }
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

    if (nextStatus && TERMINAL_ORDER_STATUSES.includes(nextStatus)) {
      stopOrderPolling();
    }
  };

  const fetchOrderDetails = async (id: string, showLoading = false) => {
    const parsedId = parseStoredOrderId(id) ?? id;

    if (showLoading) {
      setIsLoading(true);
    }

    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "orders");
    formData.append("id", parsedId);

    try {
      const response = await apiCall(formData);

      if (response && response.data && response.data.length > 0) {
        applyOrderUpdate(response.data[0]);
        return response.data[0];
      }

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
      !TERMINAL_ORDER_STATUSES.includes(orderData.status)
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
    customMessage?: string,
    forceShow: boolean = false,
  ) => {
    let message = customMessage;
    let toastType = "info";

    if (!message) {
      switch (status.toLowerCase()) {
        case "accepted":
          message = t("order.orderAccepted");
          toastType = "success";
          break;
        case "on_the_way":
          message = t("order.providerOnWay");
          toastType = "info";
          break;
        case "arrived":
          if (normalizeStatus(status) !== "arrived") return;

          message = t("order.providerArrived");
          toastType = "success";
          if (
            forceShow ||
            (lastShownStatusRef.current !== "arrived" &&
              popupTypeRef.current !== "arrived")
          ) {
            lastShownStatusRef.current = "arrived";
            setPopupType("arrived");
            showToast(message, toastType as any);
          }
          return;
        case "started":
          message = t("order.serviceStarted");
          toastType = "info";
          break;
        case "in_progress":
          message = t("order.serviceInProgress");
          toastType = "info";
          break;
        case "completed":
          message = t("order.serviceCompleted");
          toastType = "success";
          if (
            lastShownStatusRef.current !== "completed" &&
            popupTypeRef.current !== "orderComplete"
          ) {
            lastShownStatusRef.current = "completed";
            setPopupType("orderComplete");
          }
          return;
        case "cancelled":
          message = t("order.orderCancelled");
          toastType = "warning";
          break;
        case "time_up":
          if (
            lastShownStatusRef.current !== "time_up" &&
            popupTypeRef.current !== "time-up"
          ) {
            lastShownStatusRef.current = "time_up";
            setPopupType("time-up");
          }
          return;
        default:
          message = `${t("order.orderStatusUpdated")} ${status}`;
          toastType = "info";
      }
    }

    showToast(message, toastType as any);
  };

  useEffect(() => {
    const initFCM = async () => {
      try {
        await requestFCMPermission();
        await getFCMToken();
      } catch (error) {
        console.error("Error initializing FCM:", error);
      }
    };

    const handleNotificationPress = async (data: NotificationData) => {
      if (!data?.order_id) return;

      const incomingOrderId = normalizeOrderId(data.order_id);
      const currentOrderId = normalizeOrderId(orderIdRef.current);

      if (currentOrderId && incomingOrderId !== currentOrderId) return;

      await refreshOrderDetails(incomingOrderId);

      const liveStatus = normalizeStatus(orderRef.current?.status);
      if (!data.status || normalizeStatus(data.status) !== liveStatus) return;

      showStatusNotification(
        data.status,
        data.message,
        liveStatus === "arrived",
      );
    };

    initFCM();
    const unsubscribe = setupNotificationListeners(handleNotificationPress);
    return () => {
      unsubscribe();
    };
  }, [showToast, t]);

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

  const processTapPayment = useCallback(
    async (tipAmountStr: string) => {
      if (isPayingNow || !orderId) return;
      setIsPayingNow(true);

      try {
        const parsedOrderId = orderId.startsWith('"')
          ? JSON.parse(orderId)
          : orderId;
        const amount = parseFloat(order?.amount || "0");
        const tipAmount = parseFloat(tipAmountStr || "0") || 0;

        console.log(
          "[Pay Now] Starting Tap payment for order:",
          parsedOrderId,
          {
            amount,
            tipAmount,
            total: amount + tipAmount,
          },
        );
        const response = await createTapCharge(
          amount,
          "SAR",
          parsedOrderId,
          tipAmount,
        );
        console.log("[Pay Now] Tap payment response:", response);
      } catch (error) {
        console.error("[Pay Now] Error:", error);
        showToast(t("order.paymentFailed"), "error");
      } finally {
        setIsPayingNow(false);
      }
    },
    [isPayingNow, order?.amount, orderId, showToast, t],
  );

  const handlePay = () => {
    if (isPayingNow || !orderId) return;
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

  const closePopup = () => {
    setPopupType(null);
    setManualCompletionFlow(false);
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

    await refreshOrderDetails(parsedOrderId);
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
          <OrderDetails order={order} />
        ) : (
          <ChatScreen />
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
        <Modal transparent visible={showPopup} animationType="slide">
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.overlayBackground}
              onPress={() => {
                if (popupType !== "arrived") {
                  closePopup();
                }
              }}
            />
            <View style={styles.popupContainer}>
              <Popup
                type={popupType}
                setShowPopup={setPopupType}
                orderId={orderId || ""}
                onCompleted={handleOrderCompleted}
                onCompleteToReview={
                  manualCompletionFlow ? handleCompleteToReview : undefined
                }
                onTipForPayment={
                  popupType === "tipup" ? processTapPayment : undefined
                }
                onOrderUpdated={
                  popupType === "arrived" ? handleArrivedConfirmed : undefined
                }
              />
            </View>
          </View>
        </Modal>
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
  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  popupContainer: {
    backgroundColor: Colors.white,
    width: "100%",
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default OrderPlace;
