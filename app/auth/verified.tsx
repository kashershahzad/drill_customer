import Button from "@/components/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { useAuth } from "~/contexts/AuthContext";
import {
  initializePushNotifications,
  setupNotificationListeners,
} from "~/utils/notification";
import { ms, s, vs } from "~/utils/responsive";

/**
 * After verification, go straight to the app.
 * Location is requested later only when booking (not as a login gate).
 */
export default function Verified() {
  const { t } = useTranslation();
  const { setUser, getPendingBooking, clearPendingBooking } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBrowse = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (userId) {
        await setUser(userId);
        try {
          await initializePushNotifications(userId);
          setupNotificationListeners(() => {});
        } catch (error) {
          console.error("Error setting up notifications:", error);
        }
      }

      const pending = await getPendingBooking();
      if (pending) {
        await clearPendingBooking();
        if (pending.entry === "serviceType") {
          router.replace({
            pathname: "/booking/serviceType",
            params: {
              id: pending.id,
              name: pending.name,
              image: pending.image,
            },
          });
        } else {
          router.replace({
            pathname: "/booking",
            params: {
              id: pending.id,
              name: pending.name,
              image: pending.image,
            },
          });
        }
        return;
      }

      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/svgs/verified.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.title}>{t("verified.title")}</Text>
          <Text style={styles.subtitle}>{t("verified.subtitle")}</Text>
        </View>
      </View>

      <Button
        title={
          loading ? t("accessLocation.loading") : t("verified.browseHome")
        }
        onPress={handleBrowse}
        disabled={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: s(16),
    paddingVertical: vs(16),
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: vs(40),
  },
  image: {
    width: s(260),
    height: vs(200),
    marginBottom: vs(16),
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: s(32),
  },
  title: {
    fontSize: ms(30),
    fontFamily: FONTS.bold,
    marginBottom: vs(8),
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: ms(15),
    textAlign: "center",
    color: Colors.secondary,
    marginBottom: vs(24),
    fontFamily: FONTS.medium,
  },
});
