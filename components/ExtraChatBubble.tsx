import { Ionicons } from "@expo/vector-icons";
import { TFunction } from "i18next";
import { useMemo, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import {
  normalizeExtraStatus,
  OrderExtra,
  parseExtraImages,
  resolvePaidByLabel,
} from "~/utils/orderExtra";
import { ms, s, vs } from "~/utils/responsive";

type ExtraChatBubbleProps = {
  extra: OrderExtra;
  imageBaseUrl: string;
  customerUserId: string;
  providerUserId: string;
  onAccept?: (extraId: string) => void;
  onReject?: (extraId: string) => void;
  isUpdating?: boolean;
  t: TFunction;
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFF4E5", text: "#B76E00" },
  accepted: { bg: "#E8F5E9", text: "#2E7D32" },
  rejected: { bg: "#FFEBEE", text: "#C62828" },
};

export default function ExtraChatBubble({
  extra,
  imageBaseUrl,
  customerUserId,
  providerUserId,
  onAccept,
  onReject,
  isUpdating = false,
  t,
}: ExtraChatBubbleProps) {
  const [showDetails, setShowDetails] = useState(false);
  const status = normalizeExtraStatus(extra.status);
  const statusStyle = statusColors[status] || statusColors.pending;
  const images = useMemo(() => parseExtraImages(extra.images), [extra.images]);

  const paidByKey = resolvePaidByLabel(
    extra.paid_by,
    customerUserId,
    providerUserId,
  );

  const paidByLabel =
    paidByKey === "customer"
      ? t("order.customer", "Customer")
      : paidByKey === "provider"
        ? t("order.providerLabel", "Provider")
        : t("order.nameNotAvailable");

  const statusLabel =
    status === "accepted"
      ? t("order.extraStatusAccepted", "Accepted")
      : status === "rejected"
        ? t("order.extraStatusRejected", "Rejected")
        : t("order.extraStatusPending", "Pending");

  const resolveImageUri = (fileName?: string) => {
    if (!fileName) return null;
    if (fileName.startsWith("http")) return fileName;
    return `${imageBaseUrl}${fileName}`;
  };

  const itemUri = resolveImageUri(images.itemImage);
  const receiptUri = resolveImageUri(images.recipeImage);
  const showActions = status === "pending" && !isUpdating && Boolean(extra.id);
  const hasDetailsContent = Boolean(
    extra.detail || itemUri || receiptUri || paidByLabel || statusLabel,
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {t("popup.extraAddedTitle", "Extra Added")}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.amountLabel}>
        {t("order.extraAmount", "Amount")}: SAR {extra.amount || "0"}
      </Text>

      {hasDetailsContent ? (
        <View style={styles.detailsSection}>
          <TouchableOpacity
            style={styles.detailsHeader}
            onPress={() => setShowDetails((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsHeaderText}>
              {t("extraDetails", "Extra details")}
            </Text>
            <Ionicons
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.secondary300}
            />
          </TouchableOpacity>

          {showDetails ? (
            <View style={styles.detailsBody}>
              <View style={styles.detailRow}>
                <Text style={styles.sectionLabel}>
                  {t("extraAccepted", "Extra Accepted")}:
                </Text>
                <Text style={styles.detailValue}>{statusLabel}</Text>
              </View>

              {extra.detail ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {t("order.extraDetail", "Details")}
                  </Text>
                  <Text style={styles.detailText}>{extra.detail}</Text>
                </View>
              ) : null}

              <Text style={styles.paidByText}>
                {t("extraPaidBy", "Paid By")}: {paidByLabel}
              </Text>

              {(itemUri || receiptUri) && (
                <View style={styles.imagesRow}>
                  {itemUri ? (
                    <View style={styles.imageBlock}>
                      <Text style={styles.imageLabel}>
                        {t("order.itemImage", "Item Image")}
                      </Text>
                      <Image source={{ uri: itemUri }} style={styles.image} />
                    </View>
                  ) : null}
                  {receiptUri ? (
                    <View style={styles.imageBlock}>
                      <Text style={styles.imageLabel}>
                        {t("order.receiptImage", "Receipt Image")}
                      </Text>
                      <Image
                        source={{ uri: receiptUri }}
                        style={styles.image}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      {showActions ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => extra.id && onReject?.(extra.id)}
            disabled={isUpdating}
          >
            <Text style={styles.rejectText}>
              {t("order.rejectExtra", "Reject")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => extra.id && onAccept?.(extra.id)}
            disabled={isUpdating}
          >
            <Text style={styles.acceptText}>
              {t("order.acceptExtra", "Accept")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ms(12),
    padding: s(12),
    width: "100%",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary300,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(8),
    gap: s(8),
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(15),
    lineHeight: ms(22),
    color: Colors.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: ms(12),
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(12),
    lineHeight: ms(18),
  },
  amountLabel: {
    fontFamily: FONTS.bold,
    fontSize: ms(16),
    lineHeight: ms(24),
    color: Colors.secondary,
    marginBottom: vs(8),
  },
  detailsSection: {
    backgroundColor: Colors.primary300,
    borderRadius: ms(8),
    marginBottom: vs(8),
    overflow: "hidden",
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
  },
  detailsHeaderText: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(14),
    lineHeight: ms(20),
    color: Colors.secondary,
  },
  detailsBody: {
    paddingHorizontal: s(12),
    paddingBottom: vs(12),
    borderTopWidth: 1,
    borderTopColor: Colors.white,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: s(8),
    marginTop: vs(8),
    marginBottom: vs(8),
  },
  detailValue: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(14),
    lineHeight: ms(20),
    color: Colors.secondary,
    flexShrink: 1,
    textAlign: "right",
  },
  section: {
    marginTop: vs(8),
    marginBottom: vs(8),
  },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(13),
    lineHeight: ms(18),
    color: Colors.secondary300,
    marginBottom: vs(4),
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: ms(14),
    color: Colors.secondary,
    lineHeight: ms(22),
  },
  paidByText: {
    fontFamily: FONTS.regular,
    fontSize: ms(13),
    lineHeight: ms(19),
    color: Colors.secondary300,
    marginBottom: vs(8),
  },
  imagesRow: {
    flexDirection: "row",
    gap: s(8),
  },
  imageBlock: {
    flex: 1,
  },
  imageLabel: {
    fontFamily: FONTS.regular,
    fontSize: ms(11),
    lineHeight: ms(16),
    color: Colors.secondary300,
    marginBottom: vs(4),
  },
  image: {
    width: "100%",
    height: vs(90),
    borderRadius: ms(8),
    backgroundColor: Colors.primary300,
  },
  actionsRow: {
    flexDirection: "row",
    gap: s(8),
    marginTop: vs(4),
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(11),
    borderRadius: ms(8),
    alignItems: "center",
    justifyContent: "center",
    minHeight: vs(44),
  },
  acceptButton: {
    backgroundColor: Colors.secondary,
  },
  rejectButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#C62828",
  },
  acceptText: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(14),
    lineHeight: ms(20),
    color: Colors.white,
  },
  rejectText: {
    fontFamily: FONTS.semiBold,
    fontSize: ms(14),
    lineHeight: ms(20),
    color: "#C62828",
  },
});
