import ChatSupport from "@/assets/svgs/chatSupport.svg";
import NotificationBell from "@/assets/svgs/Notification.svg";
import AntDesign from "@expo/vector-icons/AntDesign";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

type HeaderProps = {
  userName?: string;
  title?: string;
  homeScreen?: boolean;
  icon?: boolean;
  support?: boolean;
  backBtn?: boolean;
  onpress?: any;
  backAddress?: any;
  onSupportRequested?: () => void | Promise<void>;
};

export default function Header({
  userName,
  title,
  homeScreen,
  icon,
  support,
  backBtn,
  backAddress,
  onSupportRequested,
}: HeaderProps) {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleNotification = () => {
    router.push("/notification/notification");
  };
  const handleGoBack = () => {
    if (backAddress) {
      router.replace(backAddress);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    router.replace("/(tabs)/orders");
  };
  const handleSupport = async () => {
    Keyboard.dismiss();

    try {
      const orderId = await AsyncStorage.getItem("order_id");
      if (!orderId) {
        Alert.alert(t("error"), t("header.noActiveOrder"));
        return;
      }
      const formData = new FormData();
      formData.append("type", "update_data");
      formData.append("table_name", "orders");
      formData.append("id", orderId);
      formData.append("support_required", "1");
      const response = await apiCall(formData);
      if (response && response.result) {
        if (onSupportRequested) {
          await onSupportRequested();
        } else {
          router.push({
            pathname: "/order/order_place",
            params: { tab: "Chat" },
          });
        }
      } else {
        Alert.alert(t("error"), t("header.failedToSubmitSupport"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("header.errorOccurred"));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {backBtn === true && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            accessibilityRole="button"
            accessibilityLabel={t("header.back")}
          >
            <AntDesign name="left" size={s(22)} color={Colors.secondary} />
          </TouchableOpacity>
        )}
        {!homeScreen ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <View style={styles.userContainer}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.userImage}
              accessibilityLabel={t("appLogo")}
            />
            <View>
              <Text style={styles.welcomeText}>{t("welcome")}</Text>
              <Text style={styles.userName}>👋 {userName}</Text>
            </View>
          </View>
        )}
      </View>

      {icon &&
        (support ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleSupport}
            accessibilityRole="button"
            accessibilityLabel={t("header.chatSupport")}
          >
            <ChatSupport width={s(40)} height={s(40)} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotification}
            accessibilityRole="button"
            accessibilityLabel={t("notifications")}
          >
            <NotificationBell width={s(24)} height={s(24)} />
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(16),
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: s(40),
    height: s(40),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray100,
    borderRadius: ms(22),
    marginRight: s(10),
  },
  iconButton: {
    minWidth: s(44),
    minHeight: vs(44),
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: ms(22),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  userImage: {
    width: s(46),
    height: s(46),
    borderRadius: ms(23),
    marginRight: s(10),
  },
  welcomeText: {
    fontSize: ms(20),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
  },
  userName: {
    fontSize: ms(15),
    fontFamily: FONTS.medium,
    color: Colors.secondary100,
  },
  notificationButton: {
    width: s(44),
    height: s(44),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray100,
    borderRadius: s(22),
  },
});
