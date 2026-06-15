import Arrow from "@/assets/svgs/arrowLeft.svg";
import Button from "@/components/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { useAuth } from "~/contexts/AuthContext";
import { getDeviceCoordinates } from "~/utils/location";
import {
  registerDeviceWithBackend,
  requestFCMPermission,
  setupNotificationListeners,
} from "~/utils/notification";
import { ms, s, vs } from "~/utils/responsive";

export default function AccessLocation() {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { setUser, getPendingBooking, clearPendingBooking } = useAuth();

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          return;
        }

        await registerDeviceWithBackend(userId);
        const permissionGranted = await requestFCMPermission();
        if (permissionGranted) {
          await registerDeviceWithBackend(userId);
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };

    const handleNotificationPress = (data: any) => {};

    setupNotifications();

    const unsubscribe = setupNotificationListeners(handleNotificationPress);

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          t("accessLocation.permissionDenied"),
          t("accessLocation.permissionRequired"),
        );
        setLoading(false);
        return;
      }

      const { latitude, longitude } = await getDeviceCoordinates();

      await AsyncStorage.setItem("latitude", String(latitude));
      await AsyncStorage.setItem("longitude", String(longitude));

      const userId = await AsyncStorage.getItem("user_id");
      if (userId) await setUser(userId);

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
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.error("Error fetching location:", error);

      if (error?.message === "LOCATION_SERVICES_DISABLED") {
        Alert.alert(
          t("accessLocation.error"),
          t("accessLocation.locationServicesDisabled"),
        );
        return;
      }

      Alert.alert(t("accessLocation.error"), t("accessLocation.errorMessage"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/auth/verified")}>
          <Arrow />
        </TouchableOpacity>
        <Text style={styles.headerText}>{t("accessLocation.headerTitle")}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Image & Text Content */}
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/location.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.title}>{t("accessLocation.title")}</Text>
          <Text style={styles.subtitle}>{t("accessLocation.subtitle")}</Text>
        </View>
        <Text style={styles.disclosure}>
          {t("accessLocation.dataDisclosure")}{" "}
          <Text
            style={styles.privacyLink}
            onPress={() => router.push("/auth/privacy")}
          >
            {t("accessLocation.privacyPolicy")}
          </Text>
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? t("accessLocation.loading") : t("continue")}
          onPress={handleLocation}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingVertical: vs(16),
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: vs(24),
  },
  headerText: {
    fontSize: ms(18),
    fontFamily: FONTS.bold,
    textAlign: "center",
    color: Colors.secondary,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  image: {
    width: s(200),
    height: s(200),
    marginBottom: vs(16),
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: s(24),
  },
  title: {
    fontSize: ms(28),
    fontFamily: FONTS.bold,
    marginBottom: vs(8),
    color: Colors.secondary,
  },
  subtitle: {
    fontSize: ms(15),
    textAlign: "center",
    color: Colors.secondary,
    marginBottom: vs(14),
    fontFamily: FONTS.medium,
  },
  disclosure: {
    fontSize: ms(12),
    textAlign: "center",
    color: Colors.secondary300,
    paddingHorizontal: s(16),
    fontFamily: FONTS.regular,
  },
  privacyLink: {
    color: Colors.primary,
    fontFamily: FONTS.semiBold,
    textDecorationLine: "underline",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: vs(16),
  },
});
