import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { formatAppTime } from "~/utils/locale";
import {
  formatExtraStatusLabel,
  getOrderExtrasNetSummary,
  OrderExtra,
  parseExtraImages,
  parseOrderExtrasFromOrder,
  resolvePaidByLabel,
  sortOrderExtrasAscending,
} from "~/utils/orderExtra";
import { ms, s, vs } from "~/utils/responsive";
import DashedSeparator from "./dashed_seprator";

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
        entry.datetime || entry.timestamp || "",
      );
      events.push({ label, timestamp, status });
      seenStatuses.add(status);
    }
  }

  return events;
};

const OrderDetailsSection = ({
  order,
  extras,
}: {
  order: OrderType;
  extras?: OrderExtra[];
}) => {
  const { t } = useTranslation();

  // Get timeline events from history
  const timelineEvents = getTimelineEvents(order);

  const customerUserId = String(order.user?.id || order.user_id || "");
  const providerUserId = String(
    order.provider?.id || order.provider_id || order.to_id || "",
  );
  const extrasNet = getOrderExtrasNetSummary(
    order,
    extras || [],
    customerUserId,
    providerUserId,
  );
  const extraDisplayAmount = extrasNet.displayAmount;
  const paidByLabel =
    extrasNet.balancePayer === "customer"
      ? t("me")
      : extrasNet.balancePayer === "provider"
        ? t("provider")
        : "";

  const imageBaseUrl = String(order.image_url || "");
  const orderExtras = sortOrderExtrasAscending(
    extras && extras.length > 0 ? extras : parseOrderExtrasFromOrder(order),
  );

  const showExtraBoxes = orderExtras.length > 0;
  const showExtraSummary = Boolean(extraDisplayAmount || paidByLabel);

  const resolveImageUri = (fileName?: string) => {
    if (!fileName) return null;
    if (fileName.startsWith("http")) return fileName;
    return `${imageBaseUrl}${fileName}`;
  };

  const renderExtraBox = (
    opts: {
      title: string;
      timestamp?: string;
      amount?: string;
      paidBy?: string;
      detail?: string;
      itemImage?: string;
      billImage?: string;
      statusLabel?: string;
    },
    key: string,
  ) => (
    <View key={key} style={styles.extraBox}>
      <Text style={styles.extraBoxTitle}>{opts.title}</Text>

      {opts.timestamp ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("extraAdded")}:</Text>
            <Text style={styles.grayText}>{opts.timestamp}</Text>
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.amount ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>
              {t("popup.extraAmountLabel", "Extra Amount")}:
            </Text>
            <Text style={styles.grayText}>SAR {opts.amount}</Text>
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.paidBy ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("extraPaidBy")}:</Text>
            <Text style={styles.grayText}>{opts.paidBy}</Text>
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.detail ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>
              {t("order.extraDetail", "Extra Detail")}:
            </Text>
            <Text style={[styles.grayText, styles.detailValue]}>
              {opts.detail}
            </Text>
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.itemImage ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("itemImage")}:</Text>
            <Image
              source={{ uri: opts.itemImage }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.billImage ? (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.grayText}>{t("billImage")}:</Text>
            <Image
              source={{ uri: opts.billImage }}
              style={styles.problemImage}
            />
          </View>
          <DashedSeparator />
        </>
      ) : null}

      {opts.statusLabel ? (
        <View style={styles.rowBetween}>
          <Text style={styles.grayText}>{t("extraStatus")}:</Text>
          <Text style={styles.grayText}>{opts.statusLabel}</Text>
        </View>
      ) : null}
    </View>
  );

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
            (h: any) => h.status?.toLowerCase() === "started",
          );
          if (startedHistory) {
            const confirmTimestamp = formatTimestamp(
              startedHistory.datetime || startedHistory.timestamp || "",
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

      {/* Extra Added 1, 2, ... — match backend list */}
      {showExtraBoxes ? (
        <View style={styles.extrasList}>
          {orderExtras.map((extra, index) => {
            const images = parseExtraImages(extra.images);
            const paidByKey = resolvePaidByLabel(
              extra.paid_by,
              customerUserId,
              providerUserId,
            );
            const extraPaidBy =
              paidByKey === "customer"
                ? t("me")
                : paidByKey === "provider"
                  ? t("provider")
                  : "";

            return renderExtraBox(
              {
                title: `${t("extraAdded").replace(/:$/, "")} ${index + 1}`,
                timestamp: extra.created_at || extra.timestamp,
                amount: extra.amount,
                paidBy: extraPaidBy || undefined,
                detail: extra.detail,
                itemImage: resolveImageUri(images.itemImage) || undefined,
                billImage: resolveImageUri(images.recipeImage) || undefined,
                statusLabel: formatExtraStatusLabel(
                  extra.status,
                  t as (key: string, defaultValue?: string) => string,
                ),
              },
              `extra-${extra.id || index}`,
            );
          })}
        </View>
      ) : null}

      {/* Job Time Finished, Bonus Time, Order Completed - check history for these */}
      {order.history && Array.isArray(order.history) && (
        <>
          {order.history
            .filter(
              (h: any) =>
                h.status === "job_time_finished" ||
                h.status === "bonus_time_started" ||
                h.status === "bonus_time_ended" ||
                h.status === "completed",
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
                entry.datetime || entry.timestamp || "",
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

      {/* Order-level Extra Amount / Paid By last (API totals) */}
      {showExtraSummary ? (
        <>
          <DashedSeparator />
          {extraDisplayAmount ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.grayText}>
                  {t("popup.extraAmountLabel", "Total Extra Amount ")}:
                </Text>
                <Text style={styles.blueText}>SAR {extraDisplayAmount}</Text>
              </View>
              {/* <DashedSeparator /> */}
            </>
          ) : null}
          {/* {paidByLabel ? (
            <View style={styles.rowBetween}>
              <Text style={styles.grayText}>{t("extraPaidBy")}:</Text>
              <Text style={styles.grayText}>{paidByLabel}</Text>
            </View>
          ) : null} */}
        </>
      ) : null}
    </View>
  );
};

export default OrderDetailsSection;

const styles = StyleSheet.create({
  orderDetails: {
    marginTop: vs(7),
    padding: s(14),
    backgroundColor: Colors.white,
    borderRadius: ms(12),
  },
  extrasList: {
    gap: vs(12),
    marginTop: vs(14),
  },
  extraBox: {
    backgroundColor: Colors.primary300,
    borderRadius: ms(12),
    padding: s(12),
  },
  extraBoxTitle: {
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    fontSize: ms(15),
    marginBottom: vs(8),
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: vs(4),
  },
  boldText: {
    fontFamily: FONTS.semiBold,
    color: Colors.secondary300,
    fontSize: ms(13),
  },
  blueText: {
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    fontSize: ms(13),
  },
  grayText: { color: Colors.secondary, fontSize: ms(13) },
  detailValue: { flex: 1, textAlign: "right", marginLeft: s(12) },
  completedText: { color: Colors.success || "#4CAF50" },
  problemImage: { width: s(60), height: s(60), borderRadius: ms(8) },
});
