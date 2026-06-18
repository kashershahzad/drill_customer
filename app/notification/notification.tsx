import Header from "@/components/header";
import NotificationCard from "@/components/notification_card";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

type ApiNotification = {
  id?: string;
  title?: string;
  message?: string;
  msg?: string;
  description?: string;
  body?: string;
  timestamp?: string;
  created_at?: string;
  date?: string;
  datetime?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  dateTime: string;
};

export default function NotificationScreen() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapNotification = (item: ApiNotification): NotificationItem => ({
    id: item.id || `${item.title}-${item.timestamp}-${item.created_at}`,
    title: item.title || t("notifications"),
    message:
      item.message || item.msg || item.description || item.body || "",
    dateTime:
      item.timestamp || item.created_at || item.date || item.datetime || "",
  });

  const fetchNotifications = async () => {
    const userId = await AsyncStorage.getItem("user_id");
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "notifications");
    formData.append("user_id", userId);

    // console.log("notifications formData", formData);
    try {
      const response = await apiCall(formData);
      // console.log("notifications response", response);
      if (response?.data?.length > 0) {
        setNotifications(response.data.map(mapNotification));
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotifications([]);
      Alert.alert(t("error"), t("add.somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Header backBtn={true} title={t("notifications")} />
        <View style={styles.notificationList}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-outline"
                size={s(64)}
                color={Colors.gray300}
              />
              <Text style={styles.emptyTitle}>
                {t("notification.noNotifications")}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t("notification.noNotificationsMessage")}
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                icon={
                  <Ionicons
                    name="notifications"
                    size={s(20)}
                    color={Colors.primary}
                  />
                }
                title={notification.title}
                message={notification.message}
                dateTime={notification.dateTime}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scrollContainer: { flexGrow: 1, paddingHorizontal: s(20), paddingTop: vs(16) },
  notificationList: { marginTop: vs(10) },
  loadingContainer: {
    paddingVertical: vs(40),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(40),
    paddingHorizontal: s(20),
  },
  emptyTitle: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    marginTop: vs(14),
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    color: Colors.secondary300,
    marginTop: vs(8),
    textAlign: "center",
  },
});
