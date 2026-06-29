import Button from "@/components/button";
import DashedSeparator from "@/components/dashed_seprator";
import SelectedDescription from "@/components/selected_description";
import SelectedImage from "@/components/selected_image";
import SelectedLocation from "@/components/selected_location";
import SelectedService from "@/components/selected_service";
import Seprator from "@/components/seprator";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "~/components/header";
import { getInputFontSize, inputFieldStyles } from "~/components/inputfield";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { BOOKING_PAY_LATER_KEY } from "~/utils/booking";
import { formatAppDate, formatAppTime } from "~/utils/locale";
import { ms, s, vs } from "~/utils/responsive";
// import { createTapCharge } from "~/utils/tapPayment";
import { startTapPayment } from "~/utils/tapPayment";

const TAP_PAYMENT_ENABLED = true;

type BookingParams = {
  id: string;
  name: string;
  image: string;
  location: string;
  latitude?: string;
  longitude?: string;
  selectedImage?: string;
  description?: string;
  packageId?: string;
  packageName?: string;
  packageHours?: string;
  packagePrice?: string;
  paymentMethod?: string;
  paymentMethodDetails?: string;
  service_type?: "instant" | "schedule";
  schedule_date?: string;
  schedule_time?: string;
  payLater?: string;
  autoPay?: string;
};

const getParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value || "";

const getOrderIdFromResponse = (response: {
  id?: string | number;
  order_id?: string | number;
}) => {
  const id = response?.id ?? response?.order_id;
  if (id === undefined || id === null || id === "") return null;
  return String(id);
};

const isOrderCreated = (response: {
  result?: boolean | number | string;
  message?: string;
  id?: string | number;
}) => {
  if (response?.result === true || response?.result === 1) return true;
  if (response?.message === "Added Successfully" && response?.id != null) {
    return true;
  }
  return false;
};

export default function ConfirmBooking() {
  const { t } = useTranslation();
  const params = useLocalSearchParams() as BookingParams;
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoPayStarted = useRef(false);

  const paymentMethodId = getParam(params.paymentMethodDetails);
  const autoPayParam = getParam(params.autoPay) === "1";
  const payLaterParam = getParam(params.payLater) === "1";
  const isPayLater =
    payLaterParam ||
    paymentMethodId === "later" ||
    getParam(params.paymentMethod).toLowerCase() === t("later").toLowerCase();

  const isPayLaterFlow = () =>
    isPayLater || paymentMethodId === "later" || payLaterParam;

  const isTapPaymentMethod = () =>
    TAP_PAYMENT_ENABLED &&
    paymentMethodId !== "later" &&
    (paymentMethodId === "visa" ||
      paymentMethodId === "online" ||
      paymentMethodId === "apple" ||
      paymentMethodId === "google");

  // Calculate price details
  const packagePrice = Number(params.packagePrice || 200);
  const taxRate = 0.02; // 2% tax
  const tax = packagePrice * taxRate;
  const subTotal = packagePrice;
  const totalAmount = packagePrice + tax - discount;

  const handleVerifyPromoCode = async () => {
    try {
      const formData = new FormData();
      formData.append("type", "verify_promo");
      formData.append("promo_code", promoCode);

      const response = await apiCall(formData);
      if (response.status === "success") {
        setDiscount(response.discount || 10);
        setIsPromoValid(true);
        Alert.alert(t("success"), t("booking.promoCodeApplied"));
      } else {
        setDiscount(0);
        setIsPromoValid(false);
        Alert.alert(t("error"), t("booking.invalidPromoCode"));
      }
    } catch (error) {
      console.error("Promo verification error:", error);
      Alert.alert(t("error"), t("booking.failedToVerifyPromo"));
    }
  };

  const createOrder = async (
    tapChargeId?: string,
    payLater = false,
    skipNavigation = false,
  ): Promise<string | null> => {
    const userId = await AsyncStorage.getItem("user_id");

    let customerLat = params.latitude;
    let customerLng = params.longitude;

    if (!customerLat || !customerLng) {
      const storedLat = await AsyncStorage.getItem("latitude");
      const storedLng = await AsyncStorage.getItem("longitude");
      customerLat = storedLat || "";
      customerLng = storedLng || "";
    }

    if (!customerLat || !customerLng) {
      Alert.alert(t("error"), t("booking.locationRequired"));
      return null;
    }

    const isLaterOrder = isPayLaterFlow() || payLater;
    const paymentMethod = isLaterOrder ? "later" : paymentMethodId || "pending";
    const methodDetails =
      isLaterOrder && ["online", "visa", "apple", "google"].includes(paymentMethodId)
        ? paymentMethodId
        : paymentMethod;
    const formData = new FormData();
    formData.append("type", "add_data");
    formData.append("table_name", "orders");
    formData.append("user_id", userId || "");
    formData.append("cat_id", params.id);
    formData.append("address", params.location || "");
    formData.append("lat", customerLat);
    formData.append("lng", customerLng);
    formData.append("date", new Date().toISOString());
    formData.append("images", params.selectedImage || "");
    formData.append("description", params.description || "");
    formData.append("package_id", params.packageId || "");
    formData.append("payment_method", paymentMethod);
    formData.append("method_details", methodDetails);
    formData.append("promo_code", isPromoValid ? promoCode : "");
    formData.append("amount", totalAmount.toString());
    formData.append("payment_status", tapChargeId ? "paid" : "pending");

    if (tapChargeId) {
      formData.append("tap_charge_id", tapChargeId);
    }

    if (params.service_type === "schedule") {
      formData.append("service_type", params.service_type);
      formData.append("schedule_date", params.schedule_date || "");
      formData.append("schedule_time", params.schedule_time || "");
    }

    const response = await apiCall(formData);
    console.log("Order response", response);

    if (!isOrderCreated(response)) {
      Alert.alert(
        t("booking.bookingFailed"),
        response.message || t("booking.unableToProcessBooking"),
      );
      return null;
    }

    const orderId = getOrderIdFromResponse(response);
    if (!orderId) {
      console.error("Order created but id missing in response:", response);
      Alert.alert(t("error"), t("booking.orderIdNotReceived"));
      return null;
    }

    await AsyncStorage.setItem("order_id", JSON.stringify(orderId));
    if (!skipNavigation) {
      router.push("/booking/confrimedBooking");
    }
    return orderId;
  };

  const confirmPayLaterOrder = async () => {
    console.log(
      "[Booking] Pay later flow — creating order only (no Tap payment)",
    );
    setIsSubmitting(true);
    try {
      const orderId = await createOrder(undefined, true);
      if (orderId) {
        await AsyncStorage.removeItem(BOOKING_PAY_LATER_KEY);
      }
    } catch (error) {
      console.error("Pay later booking error:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("booking.failedToConfirmBooking");
      Alert.alert(t("error"), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTapPayment = async () => {
    console.log("[Tap] Step 1: creating order...");
    const orderId = await createOrder(undefined, false, true);
    if (!orderId) {
      throw new Error("Order was not created");
    }

    console.log("[Tap] Step 2: opening Tap Checkout...");

    return new Promise<void>((resolve, reject) => {
      startTapPayment({
        orderId,
        amount: totalAmount,
        onStarted: () => setIsSubmitting(false),
        onSuccess: () => {
          router.push("/booking/confrimedBooking");
          resolve();
        },
        onCancelled: () => resolve(),
        onError: (message) => reject(new Error(message)),
      });
    });
  };

  const handleConfirmBooking = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payLaterFromStorage =
        (await AsyncStorage.getItem(BOOKING_PAY_LATER_KEY)) === "1";
      const shouldPayLater = isPayLaterFlow() || payLaterFromStorage;

      if (shouldPayLater) {
        await confirmPayLaterOrder();
        return;
      }

      if (isTapPaymentMethod()) {
        await handleTapPayment();
        return;
      }

      await createOrder();
    } catch (error) {
      console.error("Booking error:", error);
      const message =
        error instanceof Error
          ? error.message
          : t("booking.failedToConfirmBooking");
      if (message.toLowerCase().includes("cancel")) return;
      Alert.alert(t("error"), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (autoPayStarted.current || !autoPayParam || isPayLaterFlow()) return;
    if (!isTapPaymentMethod()) return;

    autoPayStarted.current = true;
    void handleConfirmBooking();
  }, [autoPayParam]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <Header backBtn={true} title={t("booking.confrim")} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* <Stepper step={true} /> */}

          <SelectedService
            serviceType={params.service_type || "instant"}
            scheduleDate={params.schedule_date || ""}
            scheduleTime={params.schedule_time || ""}
            category={{
              name: params.name,
              image: params.image,
            }}
          />
          <Seprator />

          <SelectedLocation
            category={{
              id: params.id,
              name: params.name,
              image: params.image,
            }}
            selectedLocation={params.location}
            disabled={true}
          />
          <Seprator />

          <SelectedImage selectedImage={params.selectedImage} disabled={true} />
          <Seprator />

          <SelectedDescription
            description={params.description}
            disabled={true}
          />
          <Seprator />

          {/* Service Type and Schedule Info */}
          <Text style={styles.sectionTitle}>{t("booking.serviceDetails")}</Text>
          <View style={styles.serviceInfoContainer}>
            <View style={styles.serviceInfoRow}>
              <Text style={styles.packageTitle}>
                {t("booking.serviceType")}:
              </Text>
              <Text style={styles.serviceInfoValue}>
                {params.service_type === "schedule"
                  ? t("booking.scheduled")
                  : `${t("booking.instant")}`}
              </Text>
            </View>
            {params.service_type === "schedule" &&
              params.schedule_date &&
              params.schedule_time && (
                <>
                  <View style={styles.serviceInfoRow}>
                    <Text style={styles.packageTitle}>
                      {t("booking.scheduledDate")}:
                    </Text>
                    <Text style={styles.serviceInfoValue}>
                      {formatAppDate(new Date(params.schedule_date), {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.serviceInfoRow}>
                    <Text style={styles.packageTitle}>
                      {t("booking.scheduledTime")}:
                    </Text>
                    <Text style={styles.serviceInfoValue}>
                      {formatAppTime(
                        new Date(`2000-01-01T${params.schedule_time}`),
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        },
                      )}
                    </Text>
                  </View>
                </>
              )}
          </View>

          <Seprator />

          {/* Selected Package */}
          <Text style={styles.sectionTitle}>{t("booking.selectpackage")}</Text>
          <View style={styles.packageContainer}>
            <View>
              <Text style={styles.packageTitle}>{params.packageName}</Text>
              <Text style={styles.packageSubtitle}>
                {t("booking.hoursPackageLabel", { hours: params.packageHours })}
              </Text>
            </View>
            <Text style={styles.packagePrice}>SAR {packagePrice}</Text>
          </View>

          <Seprator />

          {/* Selected Payment Method */}
          <Text style={styles.sectionTitle}>{t("booking.paymentmethod")}</Text>
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentText}>{params.paymentMethod}</Text>
            <Ionicons name="checkmark-circle" size={20} color="blue" />
          </View>

          <Seprator />

          {/* Promo Code Input */}
          <Text style={styles.sectionTitle}>{t("booking.promocode")}</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={[
                styles.promoInput,
                { fontSize: getInputFontSize(promoCode) },
              ]}
              placeholder={t("booking.enterPromoCode")}
              placeholderTextColor={Colors.secondary300}
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleVerifyPromoCode}
            >
              <Text style={styles.applyButtonText}>
                {t("booking.applyPromo")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price Details */}
          <Text style={styles.sectionTitle}>{t("booking.pricedetails")}</Text>
          <View style={styles.priceContainer}>
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("price")}</Text>
              <Text style={styles.boldText}>SAR {subTotal}</Text>
            </View>
            <DashedSeparator />
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("tax")} (2%)</Text>
              <Text style={styles.boldText}>SAR {tax.toFixed(2)}</Text>
            </View>
            {isPromoValid && (
              <>
                <DashedSeparator />
                <View style={styles.rowBetween}>
                  <Text style={styles.grayText}>{t("discount")}</Text>
                  <Text style={styles.discountText}>-SAR {discount}</Text>
                </View>
              </>
            )}
            <DashedSeparator />
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("totalamount")}</Text>
              <Text style={styles.primaryText}>
                SAR {totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <Button
          title={
            isSubmitting ? `${t("booking.confrim")}...` : t("booking.confrim")
          }
          onPress={handleConfirmBooking}
          style={styles.button}
          disabled={isSubmitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  innerContainer: { flex: 1, paddingHorizontal: s(16), paddingTop: vs(8) },
  sectionTitle: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    marginBottom: vs(8),
    color: Colors.secondary,
  },
  packageContainer: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageTitle: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  packageSubtitle: { color: "gray", fontSize: ms(13) },
  packagePrice: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  paymentContainer: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentText: { fontSize: ms(15), fontFamily: FONTS.regular },
  separator: { height: 1, backgroundColor: "gray", marginVertical: vs(14) },
  promoContainer: {
    ...inputFieldStyles.fieldContainer,
    marginBottom: vs(14),
  },
  promoInput: { ...inputFieldStyles.fieldInput },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: vs(7),
    paddingHorizontal: s(14),
    borderRadius: ms(8),
  },
  applyButtonText: { color: "white", fontSize: ms(13) },
  priceContainer: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(12),
    marginBottom: vs(14),
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  grayText: { color: "gray", fontSize: ms(13) },
  boldText: {
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    fontSize: ms(13),
  },
  discountText: { fontFamily: FONTS.semiBold, color: "red", fontSize: ms(13) },
  primaryText: {
    fontFamily: FONTS.semiBold,
    color: "#007AFF",
    fontSize: ms(13),
  },
  serviceInfoContainer: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(12),
  },
  serviceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceInfoLabel: {
    fontSize: ms(13),
    fontFamily: FONTS.medium,
    color: Colors.secondary,
  },
  serviceInfoValue: {
    fontSize: ms(13),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  button: { marginBottom: vs(14), marginTop: vs(14) },
});
