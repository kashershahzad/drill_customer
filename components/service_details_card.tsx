import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { formatAppDate, formatAppTime } from "~/utils/locale";
import { ms, s, vs } from "~/utils/responsive";
import { Colors } from "../constants/Colors";
import DashedSeprator from "./dashed_seprator";

import { OrderType } from "~/types/dataTypes";

export type Order = OrderType;

type OrderReviewData = {
  id?: string;
  user_id?: string;
  order_id?: string;
  rating?: string;
  review?: string;
  review_by?: string;
  status?: string;
  timestamp?: string;
};

const getCustomerReview = (order: Order): OrderReviewData | null => {
  const nestedReview =
    order.customer_review ??
    (typeof order.review === "object" && order.review !== null
      ? order.review
      : null);

  if (nestedReview && typeof nestedReview === "object") {
    return nestedReview as OrderReviewData;
  }

  const flatReview =
    typeof order.review === "string" ? order.review.trim() : "";
  const flatRating = order.rating;

  if (Number(flatRating) > 0 || flatReview) {
    return {
      rating: flatRating,
      review: flatReview || undefined,
      timestamp: order.timestamp,
    };
  }

  return null;
};

type ServiceDetailsCardProps = {
  order: Order;
  orderScreen?: boolean;
  onPress?: () => void;
  onAddRating?: () => void;
  disabled?: boolean;
};

export default function ServiceDetailsCard({
  order,
  onPress,
  onAddRating,
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
  const isCompleted = order.status?.toLowerCase() === "completed";
  const customerReview = getCustomerReview(order);
  const ratingValue = customerReview?.rating ?? order.rating ?? "0";
  const reviewText = customerReview?.review?.trim() ?? "";
  const hasRating = Number(ratingValue) > 0;
  const showRatingSection = isCompleted;
  const showTip =
    isCompleted && (order.tip_status === "1" || order.tip_status === 1);
  const tipAmount = order.tip_amount ?? order.tip ?? "0";

  // Get the status style for the current order
  const statusStyle = getStatusStyle(order.status);
  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={isDisabled ? 1 : 0.7}
      style={[styles.card, isDisabled && styles.cardDisabled]}
    >
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
                  order.schedule_time,
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
        {showRatingSection && (
          <>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>
                {hasRating ? t("popup.rating") : t("popup.rateExperience")}
              </Text>
              {hasRating ? (
                <View style={styles.ratingContainer}>
                  <Text style={styles.starIcon}>★</Text>
                  <Text style={styles.value}>{ratingValue}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={onAddRating}
                  disabled={!onAddRating}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.addRatingText,
                      !onAddRating && styles.addRatingTextDisabled,
                    ]}
                  >
                    {t("popup.addRating")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        {showTip && (
          <>
            <DashedSeprator />
            <View style={styles.detailsRow}>
              <Text style={styles.label}>{t("popup.addTip")}</Text>
              <Text style={styles.tip}>
                {t("wallet.sar")} {tipAmount}
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
    marginBottom: vs(8),
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
  image: {
    height: s(60),
    width: s(60),
    borderRadius: ms(8),
    backgroundColor: Colors.white,
    padding: s(10),
  },
  orderInfo: { flex: 1, gap: vs(6) },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: ms(15),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
    flex: 1,
    textTransform: "capitalize",
  },
  statusContainer: {
    borderRadius: ms(8),
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
  },
  statusText: {
    fontSize: ms(13),
    fontFamily: FONTS.semiBold,
    textTransform: "capitalize",
  },
  orderId: {
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    color: Colors.secondary300,
  },
  orderIdValue: { fontFamily: FONTS.semiBold },
  amount: {
    fontSize: ms(13),
    color: Colors.secondary,
    fontFamily: FONTS.semiBold,
  },
  discount: { color: Colors.success },
  detailsContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    borderRadius: ms(20),
    marginTop: vs(10),
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: vs(2),
  },
  label: {
    color: Colors.secondary300,
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    flexShrink: 0,
  },
  value: {
    color: Colors.secondary,
    fontSize: ms(13),
    fontFamily: FONTS.bold,
    textTransform: "capitalize",
  },
  paymentStatus: {
    color: Colors.success,
    fontSize: ms(13),
    fontFamily: FONTS.bold,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: s(8),
  },
  ratingContainer: { flexDirection: "row", alignItems: "center", gap: s(4) },
  starIcon: { color: "#FFD700", fontSize: ms(15), fontFamily: FONTS.semiBold },
  addRatingText: {
    color: Colors.primary,
    fontSize: ms(13),
    fontFamily: FONTS.semiBold,
  },
  addRatingTextDisabled: {
    color: Colors.secondary300,
  },
  reviewRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: vs(4),
    marginTop: vs(2),
  },
  reviewText: {
    color: Colors.secondary,
    fontSize: ms(13),
    fontFamily: FONTS.medium,
    lineHeight: ms(18),
  },
  tip: { color: Colors.success, fontSize: ms(13), fontFamily: FONTS.semiBold },
});
