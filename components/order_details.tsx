import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
import { OrderType } from "~/types/dataTypes";
import DashedSeparator from "./dashed_seprator";
import { formatAppTime } from "~/utils/locale";

// Helper function to format timestamp (time only, no date)
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return "";
  try {
    // If timestamp is already formatted (e.g., "Jan 13, 2026 10:05 AM"), extract time
    if (timestamp.includes(",") && timestamp.includes(":")) {
      // Extract time portion from formatted string (e.g., "10:05 AM")
      const timeMatch = timestamp.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|ص|م))/i);
      if (timeMatch) {
        return timeMatch[1];
      }
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    return formatAppTime(date, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    return timestamp;
  }
};

// Helper function to get timeline events from history
const getTimelineEvents = (order: OrderType) => {
  const events: Array<{ label: string; timestamp: string; status: string }> =
    [];

  if (!order.history || !Array.isArray(order.history)) {
    return events;
  }

  // Track which statuses we've already added (to avoid duplicates)
  const seenStatuses = new Set<string>();

  // Sort history by datetime to process in chronological order
  const sortedHistory = [...order.history].sort((a, b) => {
    const dateA = new Date(a.datetime || a.timestamp || "").getTime();
    const dateB = new Date(b.datetime || b.timestamp || "").getTime();
    return dateA - dateB;
  });

  for (const entry of sortedHistory) {
    const status = entry.status?.toLowerCase();
    if (!status || seenStatuses.has(status)) continue;

    let label = "";
    switch (status) {
      case "accepted":
        label = "orderAccepted";
        break;
      case "arrived":
        // Check if this is the first "arrived" entry (arrived at location)
        if (!seenStatuses.has("arrived")) {
          label = "arrivedAtLocation";
        }
        break;
      case "started":
        label = "workStarted";
        break;
      case "completed":
        label = "orderCompleted";
        break;
      default:
        continue;
    }

    if (label) {
      const timestamp = formatTimestamp(
        entry.datetime || entry.timestamp || ""
      );
      events.push({ label, timestamp, status });
      seenStatuses.add(status);
    }
  }

  return events;
};

const OrderDetailsSection = ({ order }: OrderType) => {
  console.log("order", order);
  const { t } = useTranslation();

  // Parse final_images JSON
  let finalImages: { itemImage?: string; recipeImage?: string } = {};
  if (order.final_images) {
    try {
      finalImages =
        typeof order.final_images === "string"
          ? JSON.parse(order.final_images)
          : order.final_images;
    } catch (error) {
      console.error("Error parsing final_images:", error);
    }
  }

  // Get timeline events from history
  const timelineEvents = getTimelineEvents(order);
  return (
    <View style={styles.orderDetails}>
      <View style={styles.rowBetween}>
        <Text style={styles.boldText}>{t("package")}</Text>
        <Text style={styles.blueText}>
          {order.package?.name || t("expressService")}
        </Text>
      </View>

      <DashedSeparator />

      <View style={styles.rowBetween}>
        <Text style={styles.boldText}>{t("problemImage")}</Text>
        {order.images ? (
          <Image
            source={{ uri: `${order.image_url}${order.images}` }}
            style={styles.problemImage}
          />
        ) : null}
      </View>

      <Text style={[styles.boldText, { marginBottom: 4 }]}>
        {t("detailAboutProblem")}
      </Text>
      <Text style={styles.grayText}>
        {order.description || t("noDescription")}
      </Text>

      <DashedSeparator />

      {/* Order Placed - always show if created_at exists */}
      {order.created_at && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("orderPlaced")}:</Text>
            <Text style={styles.grayText}>{order.created_at}</Text>
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Timeline Events from History */}
      {timelineEvents.map((event, index) => (
        <React.Fragment key={`${event.status}-${index}`}>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t(event.label)}:</Text>
            <Text style={styles.grayText}>{event.timestamp}</Text>
          </View>
          <DashedSeparator />
        </React.Fragment>
      ))}

      {/* Arrival Confirm - show when customer confirms (status changes to "started" after "arrived") */}
      {(() => {
        const startedEvent = timelineEvents.find((e) => e.status === "started");
        const arrivedEvent = timelineEvents.find((e) => e.status === "arrived");
        if (startedEvent && arrivedEvent && order.history) {
          // Find the "started" entry in history to get exact timestamp
          const startedHistory = order.history.find(
            (h: any) => h.status?.toLowerCase() === "started"
          );
          if (startedHistory) {
            const confirmTimestamp = formatTimestamp(
              startedHistory.datetime || startedHistory.timestamp || ""
            );
            return (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.grayText}>{t("arrivalConfirm")}:</Text>
                  <Text style={styles.grayText}>{confirmTimestamp}</Text>
                </View>
                <DashedSeparator />
              </>
            );
          }
        }
        return null;
      })()}

      {/* Extra Added - show if extra_detail exists */}
      {order.extra_detail && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("extraAdded")}:</Text>
            <Text style={styles.grayText}>
              {order.extra_amount ? `SAR ${order.extra_amount}` : ""}
            </Text>
          </View>
          {order.extra_detail && (
            <Text style={[styles.grayText, { marginTop: 4, fontSize: 12 }]}>
              {order.extra_detail}
            </Text>
          )}
          <DashedSeparator />
        </>
      )}

      {/* Item Image from final_images */}
      {finalImages.itemImage && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("itemImage")}:</Text>
            <Image
              source={{ uri: `${order.image_url}${finalImages.itemImage}` }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Bill/Recipe Image from final_images */}
      {finalImages.recipeImage && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("billImage")}:</Text>
            <Image
              source={{ uri: `${order.image_url}${finalImages.recipeImage}` }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Fallback: Show item_image and bill_image if they exist directly on order */}
      {!finalImages.itemImage && order.item_image && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("itemImage")}:</Text>
            <Image
              source={{ uri: `${order.image_url}${order.item_image}` }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      )}

      {!finalImages.recipeImage && order.bill_image && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("billImage")}:</Text>
            <Image
              source={{ uri: `${order.image_url}${order.bill_image}` }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Extra Paid By */}
      {order.paid_by && order.paid_by !== "0" && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("extraPaidBy")}:</Text>
            <Text style={styles.grayText}>
              {order.paid_by === order.user_id ? t("me") : t("provider")}
            </Text>
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Extra Accepted - show if extra was added and paid */}
      {order.extra_detail && order.paid_by && order.paid_by !== "0" && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("extraAccepted")}:</Text>
            <Text style={styles.grayText}>
              {timelineEvents.find((e) => e.status === "started")?.timestamp ||
                order.timestamp ||
                ""}
            </Text>
          </View>
          <DashedSeparator />
        </>
      )}

      {/* Job Time Finished, Bonus Time, Order Completed - check history for these */}
      {order.history && Array.isArray(order.history) && (
        <>
          {order.history
            .filter(
              (h: any) =>
                h.status === "job_time_finished" ||
                h.status === "bonus_time_started" ||
                h.status === "bonus_time_ended" ||
                h.status === "completed"
            )
            .map((entry: any, index: number) => {
              let label = "";
              let statusKey = entry.status?.toLowerCase();

              switch (statusKey) {
                case "job_time_finished":
                  label = "jobTimeFinished";
                  break;
                case "bonus_time_started":
                  label = "bonusTimeStarted";
                  break;
                case "bonus_time_ended":
                  label = "bonusTimeEnded";
                  break;
                case "completed":
                  label = "orderCompleted";
                  break;
                default:
                  return null;
              }

              if (!label) return null;

              const timestamp = formatTimestamp(
                entry.datetime || entry.timestamp || ""
              );
              const isCompleted = statusKey === "completed";

              return (
                <React.Fragment key={`${statusKey}-${index}`}>
                  <View style={styles.rowBetween}>
                    <Text
                      style={[
                        styles.grayText,
                        isCompleted && styles.completedText,
                      ]}
                    >
                      {t(label)}:
                    </Text>
                    <Text
                      style={[
                        styles.grayText,
                        isCompleted && styles.completedText,
                      ]}
                    >
                      {timestamp}
                    </Text>
                  </View>
                  <DashedSeparator />
                </React.Fragment>
              );
            })}
        </>
      )}

      {/* Fallback: Show direct fields if history doesn't have them */}
      {(!order.history ||
        !Array.isArray(order.history) ||
        !order.history.some((h: any) => h.status === "job_time_finished")) &&
        order.job_time_finished && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("jobTimeFinished")}:</Text>
              <Text style={styles.grayText}>{order.job_time_finished}</Text>
            </View>
            <DashedSeparator />
          </>
        )}

      {(!order.history ||
        !Array.isArray(order.history) ||
        !order.history.some((h: any) => h.status === "bonus_time_started")) &&
        order.bonus_time_started && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("bonusTimeStarted")}:</Text>
              <Text style={styles.grayText}>{order.bonus_time_started}</Text>
            </View>
            <DashedSeparator />
          </>
        )}

      {(!order.history ||
        !Array.isArray(order.history) ||
        !order.history.some((h: any) => h.status === "bonus_time_ended")) &&
        order.bonus_time_ended && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("bonusTimeEnded")}:</Text>
              <Text style={styles.grayText}>{order.bonus_time_ended}</Text>
            </View>
            <DashedSeparator />
          </>
        )}

      {(!order.history ||
        !Array.isArray(order.history) ||
        !order.history.some((h: any) => h.status === "completed")) &&
        order.order_completed && (
          <>
            <View style={styles.rowBetween}>
              <Text style={[styles.grayText, styles.completedText]}>
                {t("orderCompleted")}:
              </Text>
              <Text style={[styles.grayText, styles.completedText]}>
                {order.order_completed}
              </Text>
            </View>
            <DashedSeparator />
          </>
        )}

      {order.payment_method && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("paymentMethod")}:</Text>
            <Text style={styles.grayText}>{order.payment_method}</Text>
          </View>
          <DashedSeparator />
        </>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.grayText}>{t("paymentStatus")}:</Text>
        <Text style={styles.grayText}>
          {order.payment_status || t("pending")}
        </Text>
      </View>
    </View>
  );
};

export default OrderDetailsSection;

const styles = StyleSheet.create({
  orderDetails: { marginTop: vs(7), padding: s(14), backgroundColor: Colors.white, borderRadius: ms(12) },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: vs(4) },
  boldText: { fontFamily: FONTS.semiBold, color: Colors.secondary300, fontSize: ms(13) },
  blueText: { fontFamily: FONTS.semiBold, color: Colors.secondary, fontSize: ms(13) },
  grayText: { color: Colors.secondary, fontSize: ms(13) },
  completedText: { color: Colors.success || "#4CAF50" },
  problemImage: { width: s(60), height: s(60), borderRadius: ms(8) },
});
