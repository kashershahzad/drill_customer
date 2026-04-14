import Header from "@/components/header";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "~/contexts/AuthContext";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";
import { apiCall } from "~/utils/api";

export default function DeleteAccount() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      t("account.deleteAccountConfirmTitle"),
      t("account.deleteAccountConfirmMessage"),
      [
        {
          text: t("account.deleteAccountCancel"),
          style: "cancel",
        },
        {
          text: t("account.deleteAccountConfirm"),
          style: "destructive",
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        Alert.alert(t("error"), t("account.deleteAccountError"));
        return;
      }

      const formData = new FormData();
      formData.append("type", "delete_account");
      formData.append("user_id", userId);

      const response = await apiCall(formData);

      if (response.result) {
        await logout();
        Alert.alert(t("success"), t("account.deleteAccountSuccess"), [
          { text: "OK", onPress: () => router.replace("/welcome") },
        ]);
      } else {
        Alert.alert(t("error"), response.message || t("account.deleteAccountError"));
      }
    } catch {
      Alert.alert(t("error"), t("account.deleteAccountError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t("account.deleteAccountTitle")} homeScreen={false} />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={ms(64)} color={Colors.danger} />
        </View>

        <Text style={styles.title}>{t("account.deleteAccountTitle")}</Text>
        <Text style={styles.warning}>{t("account.deleteAccountWarning")}</Text>

        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Ionicons name="close-circle-outline" size={ms(20)} color={Colors.danger} />
            <Text style={styles.bulletText}>All bookings and order history</Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="close-circle-outline" size={ms(20)} color={Colors.danger} />
            <Text style={styles.bulletText}>Profile and personal information</Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="close-circle-outline" size={ms(20)} color={Colors.danger} />
            <Text style={styles.bulletText}>Wallet balance and payment details</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel={t("account.deleteAccount")}
        >
          {isDeleting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.deleteButtonText}>{t("account.deleteAccount")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>{t("account.deleteAccountCancel")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: s(24),
    paddingTop: vs(32),
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: vs(16),
  },
  title: {
    fontSize: ms(22),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
    marginBottom: vs(12),
    textAlign: "center",
  },
  warning: {
    fontSize: ms(14),
    fontFamily: FONTS.regular,
    color: Colors.secondary100,
    textAlign: "center",
    lineHeight: ms(22),
    marginBottom: vs(24),
  },
  bulletList: {
    width: "100%",
    backgroundColor: "#FFF5F5",
    borderRadius: ms(12),
    padding: s(16),
    gap: vs(12),
    marginBottom: vs(32),
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
  },
  bulletText: {
    fontSize: ms(14),
    fontFamily: FONTS.medium,
    color: Colors.secondary,
    flex: 1,
  },
  deleteButton: {
    width: "100%",
    backgroundColor: Colors.danger,
    borderRadius: ms(12),
    paddingVertical: vs(16),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(12),
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: ms(16),
    fontFamily: FONTS.semiBold,
    color: Colors.white,
  },
  cancelButton: {
    width: "100%",
    paddingVertical: vs(16),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: ms(15),
    fontFamily: FONTS.medium,
    color: Colors.secondary100,
  },
});
