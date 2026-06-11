import Call from "@/assets/svgs/Calling.svg";
import Message from "@/assets/svgs/Chat.svg";
import Track from "@/assets/svgs/routing.svg";
import { useRoute } from "@react-navigation/native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { ms, s, vs } from "~/utils/responsive";
import Button from "./button";
import DashedSeparator from "./dashed_seprator";

interface ProviderCardProps {
  order: OrderType;
}

export default function ProviderCard({ order }: ProviderCardProps) {
  const { t } = useTranslation();
  const imageURL = "https://7tracking.com/saudiservices/images/";
  console.log("order==", order);

  // Get the current route name to check if we're on the track screen
  const route = useRoute();
  const isOnTrackScreen = route.name === "order/track";
  if (!order) {
    return (
      <View style={styles.providerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{t("loadingProviderDetails")}</Text>
        </View>
      </View>
    );
  }
  const provider = order.provider || ({} as OrderType["provider"]);
  const handleCall = () => {
    if (provider?.phone) {
      const phoneNumber = `tel:${provider.phone}`;
      Linking.openURL(phoneNumber);
    } else {
      console.warn("No phone number available for customer.");
    }
  };
  const handleChat = () => {
    router.push({
      pathname: "/order/order_place",
      params: { orderId: order.id, tab: "Chat" },
    });
  };
  console.log(isOnTrackScreen);
  const handleTrack = () => {
    if (
      isOnTrackScreen ||
      order?.status === "completed" ||
      order?.status === "started"
    ) {
      console.log("Track button clicked, but navigation is disabled.");
      return;
    }

    router.push({
      pathname: "/order/track",
      params: { orderId: order.id },
    });
  };

  return (
    <View style={styles.providerContainer}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Image
          source={
            provider?.image
              ? { uri: `${imageURL}${provider.image}` }
              : require("@/assets/images/user.png")
          }
          style={styles.providerImage}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>
            {provider?.name || t("unknown")}
          </Text>
          <Text style={styles.grayText}>{`⭐ ${provider?.rating || 0} (${
            provider?.reviewscount || 0
          })`}</Text>
          <Text style={styles.grayText}>{` ${t("provider")}`}</Text>
        </View>
      </View>
      <DashedSeparator />
      <View style={styles.buttonRow}>
        <Button
          Icon={<Call />}
          fullWidth={false}
          width={"30%"}
          style={{ height: vs(36) }}
          textSize={ms(14)}
          title={t("call")}
          variant="secondary"
          onPress={handleCall}
        />
        <Button
          Icon={<Message />}
          fullWidth={false}
          width={"30%"}
          style={{ height: vs(36) }}
          textSize={ms(14)}
          title={t("chat")}
          variant="primary"
          onPress={handleChat}
        />
        {/* Only show Track button if NOT on track screen */}

        <Button
          Icon={<Track />}
          fullWidth={false}
          width={"30%"}
          style={{ height: vs(36) }}
          textSize={ms(14)}
          title={t("track")}
          variant="secondary"
          onPress={handleTrack}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  providerContainer: { padding: s(14), backgroundColor: Colors.gray400, borderRadius: ms(12), marginTop: vs(8) },
  providerImage: { width: s(46), height: s(46), borderRadius: ms(23) },
  providerInfo: { marginLeft: s(14) },
  buttonRow: { flexDirection: "row", justifyContent: "space-between" },
  providerName: { fontFamily: FONTS.bold, color: Colors.secondary, fontSize: ms(17), marginBottom: vs(4) },
  grayText: { color: Colors.secondary, fontSize: ms(13) },
  loadingContainer: { minHeight: vs(100), justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: vs(10), color: Colors.secondary, fontSize: ms(13), fontFamily: FONTS.regular },
});
