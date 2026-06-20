import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OrderDetailsSection from "~/components/order_details";
import ProviderCard from "~/components/provider_card";
import ServiceDetailsCard from "~/components/service_details_card";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { ms, s, vs } from "~/utils/responsive";

interface OrderDetailsProps {
  order: OrderType;
  onAddRating?: () => void;
}

export default function OrderDetails({ order, onAddRating }: OrderDetailsProps) {
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const { t } = useTranslation();

  const hasProvider = !!order.provider;

  return (
    <ScrollView
      style={styles.contentContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ServiceDetailsCard order={order} onAddRating={onAddRating} />
      <View style={styles.orderDetailsContainer}>
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => setShowOrderDetails(!showOrderDetails)}
        >
          <Text style={styles.sectionTitle}>{t("booking.orderdetails")}</Text>
          <Text style={styles.grayText}>
            {showOrderDetails ? (
              <Ionicons
                name="chevron-up"
                size={20}
                color={Colors.secondary300}
              />
            ) : (
              <Ionicons
                name="chevron-down"
                size={20}
                color={Colors.secondary300}
              />
            )}
          </Text>
        </TouchableOpacity>
        {showOrderDetails && <OrderDetailsSection order={order} />}
      </View>
      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
        {t("booking.aboutserviceprovider")}
      </Text>

      {hasProvider ? (
        <ProviderCard order={order} />
      ) : (
        <View style={styles.noProviderContainer}>
          <Text style={styles.noProviderText}>{t("booking.noprovider")}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: { flex: 1 },
  scrollContent: { paddingBottom: vs(24) },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderDetailsContainer: {
    backgroundColor: Colors.primary300,
    marginTop: vs(20),
    borderRadius: ms(12),
    paddingHorizontal: s(16),
    paddingVertical: s(16),
    marginBottom: vs(20),
  },
  sectionTitle: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  orderDetails: {
    marginTop: vs(8),
    padding: s(14),
    backgroundColor: Colors.white,
    borderRadius: ms(12),
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: vs(4),
  },
  boldText: { fontFamily: FONTS.semiBold, color: Colors.secondary300 },
  blueText: { fontFamily: FONTS.semiBold, color: Colors.secondary },
  grayText: { color: Colors.secondary },
  problemImage: { width: s(62), height: s(62), borderRadius: ms(8) },
  noImage: {
    backgroundColor: Colors.primary300,
    justifyContent: "center",
    alignItems: "center",
  },
  noProviderContainer: {
    padding: s(14),
    backgroundColor: Colors.primary300,
    borderRadius: ms(12),
    marginBottom: vs(20),
    alignItems: "center",
    justifyContent: "center",
    minHeight: vs(90),
  },
  noProviderText: {
    color: Colors.secondary,
    textAlign: "center",
    fontFamily: FONTS.semiBold,
    fontSize: ms(14),
  },
});
