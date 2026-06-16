import Button from "@/components/button";
import Header from "@/components/header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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

const TAP_PAYMENT_ENABLED = true;

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
  const [order, setOrder] = useState<OrderType | null>(null);
  const lastShownStatusRef = useRef<string | null>(null);
  const proximityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const proximityPopupShownRef = useRef<boolean>(false);

  useEffect(() => {
    if (popupType) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [popupType]);

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
      if (data?.order_id) {
        if (orderId && data.order_id === orderId) {
          if (data.status === "arrived") {
            lastShownStatusRef.current = null;
          }

          // Refresh order details
          getOrderDetails(data.order_id);

          // Display toast for status change
          // If status is "arrived", force show the popup (even if shown before)
          if (data.status) {
            const forceShow = data.status === "arrived";
            showStatusNotification(data.status, data.message, forceShow);
          }
        }
      }
    };

    initFCM();
    const unsubscribe = setupNotificationListeners(handleNotificationPress);
    return () => {
      unsubscribe(); // Clean up listeners
      stopProximityCheck(); // Clean up proximity check
    };
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();

          // Get all key-value pairs
          const result = await AsyncStorage.multiGet(keys);

          // Convert to object format
          const storedOrderId = await AsyncStorage.getItem("order_id");
          const userId = await AsyncStorage.getItem("user_id");
          setOrderId(storedOrderId);
          setUserId(userId);

          if (storedOrderId) {
            const parsedOrderId = storedOrderId.startsWith('"')
              ? JSON.parse(storedOrderId)
              : storedOrderId;
            getOrderDetails(parsedOrderId);
          }
        } catch (error) {
          console.error("Initialization error:", error);
          showToast(t("order.failedToInitialize"), "error");
        }
      };
      init();

      // Cleanup on unmount
      return () => {
        stopProximityCheck();
      };
    }, []),
  );

  const getOrderDetails = async (id: string) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "orders");
    formData.append("id", id);

    try {
      const response = await apiCall(formData);
      console.log("order details", response);

      if (response && response.data && response.data.length > 0) {
        const orderData = response.data[0];

        if (order && order.status !== orderData.status) {
          handleOrderStatusChange(
            order.payment_status || "",
            orderData.status || "",
          );
        } else if (!order && orderData.status) {
          lastShownStatusRef.current = orderData.status;
        } else if (order && order.status === orderData.status) {
          if (
            lastShownStatusRef.current !== orderData.status &&
            orderData.status !== "arrived"
          ) {
            lastShownStatusRef.current = orderData.status;
          }
        }

        setOrder(orderData);

        const hasProvider = orderData.provider && orderData.provider.id;
        const hasProviderLocation =
          orderData.provider?.lat && orderData.provider?.lng;
        const hasCustomerLocation = orderData.lat && orderData.lng;
        const isActiveStatus =
          orderData.status === "accepted" || orderData.status === "on_the_way";

        if (
          hasProvider &&
          hasProviderLocation &&
          hasCustomerLocation &&
          isActiveStatus
        ) {
          startProximityCheck(orderData);
        } else {
          stopProximityCheck();
        }
      } else {
        showToast(t("order.noOrderDetailsFound"), "error");
        setOrder(null);
      }
    } catch (error) {
      console.error("Failed to fetch order details", error);
      showToast(t("order.failedToFetchDetails"), "error");
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
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

      if (distance <= 300 && !proximityPopupShownRef.current) {
        proximityPopupShownRef.current = true;
        setPopupType("arrived");
        showToast("Provider is nearby! They should arrive soon.", "success");
      }
    } catch (error) {
      console.error("❌ Error checking proximity:", error);
    }
  };

  const startProximityCheck = (orderData: OrderType) => {
    stopProximityCheck();
    proximityPopupShownRef.current = false;
    checkProximity(orderData);

    proximityCheckIntervalRef.current = setInterval(async () => {
      if (orderId) {
        try {
          const formData = new FormData();
          formData.append("type", "get_data");
          formData.append("table_name", "orders");
          formData.append("id", orderId);

          const response = await apiCall(formData);
          if (response && response.data && response.data.length > 0) {
            const latestOrderData = response.data[0];
            setOrder(latestOrderData);
            checkProximity(latestOrderData);
          }
        } catch (error) {
          console.error(
            "❌ Error refreshing order data for proximity check:",
            error,
          );
          if (order) {
            checkProximity(order);
          }
        }
      } else if (order) {
        checkProximity(order);
      }
    }, 10000);
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
          message = t("order.providerArrived");
          toastType = "success";
          if (
            forceShow ||
            (lastShownStatusRef.current !== "arrived" &&
              popupType !== "arrived")
          ) {
            lastShownStatusRef.current = "arrived";
            setPopupType("arrived");
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
            popupType !== "orderComplete"
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
            popupType !== "time-up"
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

  // ─── Pay Now: Tap payment lagao existing order ke liye ───
  const handlePay = async () => {
    if (isPayingNow || !orderId) return;
    setIsPayingNow(true);

    try {
      const parsedOrderId = orderId.startsWith('"')
        ? JSON.parse(orderId)
        : orderId;

      const paymentMethod = order?.payment_method || "";
      const amount = parseFloat(order?.amount || "0");

      const useTap =
        TAP_PAYMENT_ENABLED &&
        paymentMethod !== "later" &&
        (paymentMethod === "visa" || paymentMethod === "apple");

      if (useTap) {
        console.log("[Pay Now] Starting Tap payment for order:", parsedOrderId);
        const response = await createTapCharge(amount, "SAR", parsedOrderId);
        console.log("[Pay Now] Tap payment response:", response);
      } else {
        // Non-tap: seedha popup dikhao
        setPopupType("tipup");
      }
    } catch (error) {
      console.error("[Pay Now] Error:", error);
      showToast(t("order.paymentFailed") || "Payment failed", "error");
    } finally {
      setIsPayingNow(false);
    }
  };

  const handleCancel = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    const latitude = await AsyncStorage.getItem("latitude");
    const longitude = await AsyncStorage.getItem("longitude");
    if (orderId) {
      const formData = new FormData();
      formData.append("type", "add_data");
      formData.append("table_name", "orders");
      formData.append("user_id", userId);
      formData.append("lat", latitude || "");
      formData.append("lng", longitude || "");
      formData.append("order_id", orderId);
      formData.append("status", "cancelled");

      try {
        const response = await apiCall(formData);
        if (response && response.result === true) {
          showToast(t("order.orderCancelledSuccess"), "success");
          router.replace("/(tabs)");
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
      formData.append("user_id", userId);
      formData.append("lat", latitude || "");
      formData.append("lng", longitude || "");
      formData.append("order_id", orderId);
      formData.append("status", "completed");

      try {
        const response = await apiCall(formData);
        if (response && response.result === true) {
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
            backAddress={"/(tabs)"}
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
            backAddress={"/(tabs)"}
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
          backAddress={"/(tabs)"}
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
          {order?.status === "completed" ? null : order.payment_status ===
            "pending" ? (
            <Button
              title={isPayingNow ? `${t("paynow")}...` : t("paynow")}
              variant="primary"
              fullWidth={true}
              width="100%"
              onPress={handlePay}
              disabled={isPayingNow}
            />
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
              onPress={() => popupType !== "arrived" && setPopupType(null)}
            />
            <View style={styles.popupContainer}>
              <Popup
                type={popupType}
                setShowPopup={setPopupType}
                orderId={orderId || ""}
                onCompleted={handleOrderCompleted}
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
