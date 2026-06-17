import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
import { formatAppDate, formatAppTime } from "~/utils/locale";
import { Colors } from "../constants/Colors";
import DashedSeprator from "./dashed_seprator";

import { OrderType } from "~/types/dataTypes";

export type Order = OrderType;

type ServiceDetailsCardProps = {
  order: Order;
  orderScreen?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export default function ServiceDetailsCard({
  order,
  onPress,
  disabled,
}: ServiceDetailsCardProps) {
  const { t } = useTranslation();
  // Function to format schedule date and time
  const formatScheduleDateTime = (dateString: string, timeString: string) => {
    try {
      const [year, month, day] = dateString.split("-").map(Number);
      const [hours, minutes] = timeString.split(":").map(Number);

      const scheduleDate = new Date(year, month - 1, day, hours, minutes);

      const formattedDate = formatAppDate(scheduleDate, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const formattedTime = formatAppTime(scheduleDate, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return t("dateAtTime", { date: formattedDate, time: formattedTime });
    } catch (error) {
      console.error("Error formatting schedule date/time:", error);
      return t("invalidDateTime");
    }
  };

  // Function to get different status styles based on status
  const getStatusStyle = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return { backgroundColor: Colors.primary100, color: Colors.primary };
      case "pending":
        return { backgroundColor: "#FFF3CD", color: "#856404" };
      case "arrived":
        return { backgroundColor: "#FFF3CD", color: "#856404" };
      case "completed":
        return { backgroundColor: Colors.success100, color: Colors.success };
      case "cancelled":
        return { backgroundColor: "#F8D7DA", color: "#721C24" };
      default:
        return { backgroundColor: Colors.primary100, color: Colors.secondary };
    }
  };

  const isCancelled = order.status?.toLowerCase() === "cancelled";
  const isDisabled = isCancelled || disabled;


  // Get the status style for the current order
  const statusStyle = getStatusStyle(order.status);
  console.log("order?.paymentStatus", order?.payment_status);
  return (
    <TouchableOpacity onPress={isDisabled ? undefined : onPress} disabled={isDisabled} activeOpacity={isDisabled ? 1 : 0.7} style={[styles.card, isDisabled && styles.cardDisabled]}>
      {/* Order Top Section */}
      <View style={styles.orderTopSection}>
        <Image
          source={{
            uri: `${order.imageUrl || order.image_url}${
              order?.category?.image
            }`,
          }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.orderInfo}>
          <View style={styles.orderHeader}>
            <Text style={styles.title}>
              {order?.category?.name || t("serviceOrder")}
            </Text>
            <View
              style={[
                styles.statusContainer,
                { backgroundColor: statusStyle.backgroundColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {order.status}
              </Text>
            </View>
          </View>
          <Text style={styles.orderId}>
            {t("orderId")}:{" "}
            <Text style={styles.orderIdValue}>
              {order.orderId || order.order_no}
            </Text>
          </Text>
          <Text style={styles.amount}>
            SAR {order.amount || "0.00"}{" "}
            {order.discount && parseInt(order.discount) > 0 && (
              <Text style={styles.discount}>({order.discount}% off)</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Order Details Section */}
      <View style={styles.detailsContainer}>
        {/* Service Type and Schedule Information */}
        {order.service_type === "schedule" &&
        order.schedule_date &&
        order.schedule_time ? (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("booking.serviceType")}</Text>
              <Text style={[styles.value, { color: Colors.primary }]}>
                {t("booking.scheduled")}
              </Text>
            </View>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("booking.scheduledDate")}</Text>
              <Text style={styles.value}>
                {formatScheduleDateTime(
                  order.schedule_date,
                  order.schedule_time
                )}
              </Text>
            </View>
            <DashedSeprator />
          </>
        ) : (
          <>
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("booking.serviceType")}</Text>
              <Text style={[styles.value, { color: Colors.primary }]}>
                {t("booking.instant")}
              </Text>
            </View>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("dateAndTime")}</Text>
              <Text style={styles.value}>
                {order.date || order.timestamp || t("notAvailable")}
              </Text>
            </View>
            <DashedSeprator />
          </>
        )}

        <View style={styles.detailsRow}>
          <Text style={styles.label}>{t("provider")}</Text>
          <Text style={styles.value}>
            {typeof order?.provider === "object"
              ? order?.provider?.name
              : order?.provider || t("notAssigned")}
          </Text>
        </View>
        {/* <DashedSeprator />
        <View style={styles.detailsRow}>
          <Text style={styles.label}>{t("order.orderDetails")}</Text>
          <Text style={[styles.value, { color: statusStyle.color }]}>
            {order.status}
          </Text>
        </View> */}
        <DashedSeprator />

        <View style={styles.detailsRow}>
          <Text style={styles.label}>{t("paymentStatus")}</Text>
          <Text style={styles.paymentStatus} numberOfLines={1}>
            {order?.paymentStatus || order?.payment_status}
          </Text>
        </View>
        {order.status === "completed" && (
          <>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("popup.rateExperience")}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.starIcon}>★</Text>
                <Text style={styles.value}>{order.rating || "0"}</Text>
              </View>
            </View>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("popup.addTip")}</Text>
              <Text style={styles.tip}>
                {t("wallet.sar")} {order.tip || "0.00"}
              </Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(16),
    marginTop: vs(14),
    shadowColor: Colors.gray100,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.01,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  orderTopSection: { flexDirection: "row", alignItems: "center", gap: s(14) },
  image: { height: s(60), width: s(60), borderRadius: ms(8), backgroundColor: Colors.white, padding: s(10) },
  orderInfo: { flex: 1, gap: vs(6) },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: ms(15), fontFamily: FONTS.bold, color: Colors.secondary, flex: 1, textTransform: "capitalize" },
  statusContainer: { borderRadius: ms(8), paddingHorizontal: s(8), paddingVertical: vs(4) },
  statusText: { fontSize: ms(13), fontFamily: FONTS.semiBold, textTransform: "capitalize" },
  orderId: { fontSize: ms(13), fontFamily: FONTS.regular, color: Colors.secondary300 },
  orderIdValue: { fontFamily: FONTS.semiBold },
  amount: { fontSize: ms(13), color: Colors.secondary, fontFamily: FONTS.semiBold },
  discount: { color: Colors.success },
  detailsContainer: { backgroundColor: Colors.white, paddingHorizontal: s(16), paddingVertical: s(14), borderRadius: ms(20), marginTop: vs(10) },
  detailsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: vs(2) },
  label: { color: Colors.secondary300, fontSize: ms(13), fontFamily: FONTS.regular, flexShrink: 0 },
  value: { color: Colors.secondary, fontSize: ms(13), fontFamily: FONTS.bold, textTransform: "capitalize" },
  paymentStatus: { color: Colors.success, fontSize: ms(13), fontFamily: FONTS.bold, flexShrink: 1, textAlign: "right", marginLeft: s(8) },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: s(4) },
  starIcon: { color: "#FFD700", fontSize: ms(15), fontFamily: FONTS.semiBold },
  tip: { color: Colors.success, fontSize: ms(13), fontFamily: FONTS.semiBold },
});
